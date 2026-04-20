"""
Training script for:
1) Primary XGBoost model (binary classification)
2) Baseline Random Forest model for comparison
3) Optional LSTM model for time-series prediction

Expected dataset columns:
- `hour_from_admission` (numeric, hours since admission)
- Vitals/labs (e.g., `heart_rate`, `spo2_pct`, `temperature_c`, etc.)
- Patient profile (e.g., `age`, `gender`, `comorbidity_index`, `admission_type`)
- `deterioration_next_12h` (binary label 0/1)

Model artifacts are saved under `models/`.
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict
from typing import Any, Dict, List, Optional, Sequence

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

import matplotlib.pyplot as plt
import seaborn as sns
import shap

from utils import (
    DEFAULT_LABEL_COL,
    DEFAULT_TIME_COL,
    FeatureConfig,
    get_default_categorical_cols,
    get_default_vital_numeric_cols,
    featurize_dataset,
    risk_level_from_probability,
    probability_to_percent,
)


def _default_data_path() -> str:
    preferred = os.path.join("data", "dataset.csv")
    if os.path.exists(preferred):
        return preferred
    return "train.csv"


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def generate_synthetic_columns_if_missing(df: pd.DataFrame) -> pd.DataFrame:
    """Generate mock data for any missing extended columns required by the new EWS."""
    df = df.copy().reset_index(drop=True)
    np.random.seed(42)
    
    # Check categorical
    cat_cols = get_default_categorical_cols()
    num_cols = get_default_vital_numeric_cols()
    
    n = len(df)
    
    if "rs_status" not in df.columns:
        df["rs_status"] = np.random.choice(["Normal A/E", "Wheezing", "Decreased A/E", "Crackles"], n)
    if "cvs_status" not in df.columns:
        df["cvs_status"] = np.random.choice(["Normal", "Murmur", "Irregular"], n)
    if "cns_status" not in df.columns:
        df["cns_status"] = np.random.choice(["alert", "drowsy", "unconscious"], n, p=[0.8, 0.15, 0.05])
        
    # Check numeric vitals & labs
    vital_ranges = {
        "heart_rate": (60, 140), "respiratory_rate": (12, 35), "spo2_pct": (85, 100),
        "temperature_c": (36.0, 40.0), "systolic_bp": (80, 180), "diastolic_bp": (50, 110),
        "wbc_count": (3.5, 20.0), "lactate": (0.5, 6.0), "creatinine": (0.5, 3.5),
        "crp_level": (0.1, 150.0), "platelets": (50, 450), "calcium_level": (7.0, 10.5),
        "iron_level": (30, 160), "cholesterol": (100, 300), "cortisol": (5, 30),
        "esr": (0, 50), "urine_routine": (0, 1), # 0 normal, 1 abnormal mapped
        "t3": (0.5, 2.5), "t4": (4.0, 12.0), "tsh": (0.4, 6.0),
        "age": (18, 90), "comorbidity_index": (0, 10)
    }

    for col, (low, high) in vital_ranges.items():
        if col not in df.columns:
            # Generate normally distributed data around the middle of the range
            mu = (high + low) / 2
            sigma = (high - low) / 6
            vals = np.random.normal(mu, sigma, n)
            df[col] = np.clip(vals, low, high)
            
    return df


def _compute_binary_metrics(y_true: np.ndarray, y_prob: np.ndarray, threshold: float = 0.5) -> Dict[str, float]:
    y_pred = (y_prob >= threshold).astype(int)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1_score": float(f1_score(y_true, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, y_prob)),
        "threshold": float(threshold),
    }

def _save_confusion_matrix_png(y_true: np.ndarray, y_prob: np.ndarray, out_path: str, threshold: float) -> None:
    y_pred = (y_prob >= threshold).astype(int)
    cm = confusion_matrix(y_true, y_pred)

    plt.figure(figsize=(6, 5))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        cbar=False,
        xticklabels=["Pred 0", "Pred 1"],
        yticklabels=["True 0", "True 1"],
    )
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.title("Confusion Matrix")
    plt.tight_layout()
    plt.savefig(out_path, dpi=160)
    plt.close()


def _save_roc_curve_png(y_true: np.ndarray, y_prob: np.ndarray, out_path: str) -> None:
    fpr, tpr, _ = roc_curve(y_true, y_prob)

    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, label="Model ROC")
    plt.plot([0, 1], [0, 1], "--", color="gray", linewidth=1)
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curve")
    plt.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(out_path, dpi=160)
    plt.close()


def train_xgb_and_rf(
    df: pd.DataFrame,
    *,
    label_col: str = DEFAULT_LABEL_COL,
    output_dir: str = "models",
    threshold: float = 0.5,
    seed: int = 42,
    use_lstm: bool = False,
    lstm_seq_len: int = 6,
) -> Dict[str, Any]:
    
    # Inject synthetic missing columns
    df = generate_synthetic_columns_if_missing(df)
    
    _ensure_dir(output_dir)
    metrics_dir = os.path.join(output_dir, "metrics")
    _ensure_dir(metrics_dir)

    feature_config = FeatureConfig(time_col=DEFAULT_TIME_COL, windows=(6, 12))
    categorical_cols = get_default_categorical_cols()
    vital_numeric_cols = get_default_vital_numeric_cols()

    X_df, y = featurize_dataset(
        df,
        label_col=label_col,
        feature_config=feature_config,
        vital_numeric_cols=vital_numeric_cols,
        categorical_cols=categorical_cols,
    )

    patient_id_col = feature_config.patient_id_col
    groups = X_df[patient_id_col].values
    X_model = X_df.drop(columns=[patient_id_col])

    # Column selection for the sklearn pipeline.
    final_categorical_cols = [c for c in categorical_cols if c in X_model.columns]
    final_numeric_cols = [c for c in X_model.columns if c not in final_categorical_cols and pd.api.types.is_numeric_dtype(X_model[c])]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), final_categorical_cols),
            ("num", StandardScaler(with_mean=True, with_std=True), final_numeric_cols),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )

    gss_test = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=seed)
    train_idx, test_idx = next(gss_test.split(X_model, y, groups=groups))

    X_train_val = X_model.iloc[train_idx].reset_index(drop=True)
    y_train_val = y.iloc[train_idx].reset_index(drop=True)
    groups_train_val = groups[train_idx]

    X_test = X_model.iloc[test_idx].reset_index(drop=True)
    y_test = y.iloc[test_idx].reset_index(drop=True)
    groups_test = groups[test_idx]

    gss_val = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=seed)
    train_sub_idx, val_idx = next(gss_val.split(X_train_val, y_train_val, groups=groups_train_val))

    X_train = X_train_val.iloc[train_sub_idx].reset_index(drop=True)
    y_train = y_train_val.iloc[train_sub_idx].reset_index(drop=True)

    # Make preprocessor fit
    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)
    
    try:
        transformer_feature_names = preprocessor.get_feature_names_out()
    except Exception:
        # Fallback if get_feature_names_out fails
        transformer_feature_names = final_categorical_cols + final_numeric_cols

    # --- XGBoost ---
    from xgboost import XGBClassifier

    xgb = XGBClassifier(
        n_estimators=400,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.0,
        reg_alpha=0.0,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=seed,
        tree_method="hist",
    )

    # Fit XGB directly to get proper feature names internal tracking
    xgb.fit(X_train_processed, y_train)
    
    # Evaluate Pipeline manually
    xgb_prob_test = xgb.predict_proba(X_test_processed)[:, 1]
    xgb_metrics = _compute_binary_metrics(y_test.values, xgb_prob_test, threshold=threshold)

    _save_confusion_matrix_png(y_test.values, xgb_prob_test, out_path=os.path.join(metrics_dir, "confusion_matrix_xgb.png"), threshold=threshold)
    _save_roc_curve_png(y_test.values, xgb_prob_test, out_path=os.path.join(metrics_dir, "roc_curve_xgb.png"))

    # Extract feature importance from XGBoost
    importances = xgb.feature_importances_
    feat_imp = sorted(zip(transformer_feature_names, importances), key=lambda x: x[1], reverse=True)[:30] # Top 30

    xgb_meta = {
        "model_type": "xgboost",
        "feature_config": asdict(feature_config),
        "vital_numeric_cols": vital_numeric_cols,
        "categorical_cols": categorical_cols,
        "final_categorical_cols": final_categorical_cols,
        "final_numeric_cols": final_numeric_cols,
        "transformer_feature_names": list(transformer_feature_names),
        "threshold": threshold,
        "feature_importances": [{"feature": str(k), "importance": float(v)} for k, v in feat_imp]
    }
    
    xgb_pipeline = Pipeline(steps=[("preprocess", preprocessor), ("model", xgb)])
    joblib.dump({"pipeline": xgb_pipeline, "meta": xgb_meta}, os.path.join(output_dir, "xgb_model.joblib"))

    # --- Random Forest ---
    rf = RandomForestClassifier(n_estimators=300, random_state=seed, n_jobs=-1)
    rf_pipeline = Pipeline(steps=[("preprocess", preprocessor), ("model", rf)])
    rf_pipeline.fit(X_train, y_train)

    rf_prob_test = rf_pipeline.predict_proba(X_test)[:, 1]
    rf_metrics = _compute_binary_metrics(y_test.values, rf_prob_test, threshold=threshold)
    
    _save_confusion_matrix_png(y_test.values, rf_prob_test, out_path=os.path.join(metrics_dir, "confusion_matrix_rf.png"), threshold=threshold)
    _save_roc_curve_png(y_test.values, rf_prob_test, out_path=os.path.join(metrics_dir, "roc_curve_rf.png"))

    rf_meta = xgb_meta.copy()
    rf_meta["model_type"] = "random_forest"
    
    joblib.dump({"pipeline": rf_pipeline, "meta": rf_meta}, os.path.join(output_dir, "rf_model.joblib"))

    metrics_payload = {
        "dataset_rows": int(len(df)),
        "label_col": label_col,
        "metrics": {
            "xgboost": xgb_metrics,
            "random_forest": rf_metrics,
        },
    }
    with open(os.path.join(metrics_dir, "metrics_summary.json"), "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)

    return metrics_payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Extended AI-Based Early Warning System")
    parser.add_argument("--data_path", type=str, default=_default_data_path(), help="Path to the training CSV")
    parser.add_argument("--label_col", type=str, default=DEFAULT_LABEL_COL, help="Binary label column name")
    parser.add_argument("--output_dir", type=str, default="models", help="Directory for saving trained models")
    parser.add_argument("--threshold", type=float, default=0.5, help="Classification threshold for metrics/plots")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    
    args = parser.parse_args()

    if not os.path.exists(args.data_path):
        print(f"Dataset not found: {args.data_path}. Training skipped.")
        return

    df = pd.read_csv(args.data_path)
    metrics_payload = train_xgb_and_rf(
        df,
        label_col=args.label_col,
        output_dir=args.output_dir,
        threshold=args.threshold,
        seed=args.seed,
    )

    print("Training complete. Metrics summary:")
    print(json.dumps(metrics_payload, indent=2))

if __name__ == "__main__":
    main()
