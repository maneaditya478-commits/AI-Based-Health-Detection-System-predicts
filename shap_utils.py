"""
SHAP Explainability module for the XGBoost model.

Computes per-prediction SHAP values using TreeExplainer and returns:
  - Top contributing features with direction (↑/↓)
  - SHAP values for bar chart visualization
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

# Only import shap when needed (it's heavy)
_shap_explainer = None
_model_artifact = None


def _get_explainer():
    """Lazy-load the SHAP explainer."""
    global _shap_explainer, _model_artifact
    
    if _shap_explainer is not None:
        return _shap_explainer, _model_artifact
    
    try:
        import shap
        import joblib
        
        model_path = os.path.join("models", "xgb_model.joblib")
        if not os.path.exists(model_path):
            return None, None
        
        artifact = joblib.load(model_path)
        pipeline = artifact["pipeline"]
        xgb_model = pipeline.named_steps["model"]
        
        _shap_explainer = shap.TreeExplainer(xgb_model)
        _model_artifact = artifact
        
        return _shap_explainer, _model_artifact
    except Exception as e:
        print(f"[SHAP] Failed to initialize explainer: {e}")
        return None, None


def compute_shap_explanation(feature_df: pd.DataFrame) -> Optional[Dict[str, Any]]:
    """
    Compute SHAP values for the last row of the feature dataframe.
    
    Returns:
        {
            "shap_values": [{"feature": "heart_rate", "value": 0.32, "direction": "↑"}, ...],
            "base_value": 0.12,
            "prediction_value": 0.78,
            "top_risk_factors": ["Heart Rate ↑", "SpO2 ↓", ...],
            "top_protective_factors": ["Normal Temperature ↓", ...]
        }
    """
    explainer, artifact = _get_explainer()
    
    if explainer is None or artifact is None:
        return _fallback_explanation(feature_df)
    
    try:
        pipeline = artifact["pipeline"]
        preprocessor = pipeline.named_steps["preprocess"]
        meta = artifact["meta"]
        
        # Transform features through the pipeline's preprocessor
        X_transformed = preprocessor.transform(feature_df)
        
        # Get SHAP values for the last row (latest measurement)
        last_row = X_transformed[-1:]
        if hasattr(last_row, 'toarray'):
            last_row = last_row.toarray()
        
        shap_values = explainer.shap_values(last_row)
        
        # Handle binary classification (shap_values might be a list)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]  # Class 1 (positive/deterioration)
        
        shap_vals = shap_values[0] if shap_values.ndim > 1 else shap_values
        base_value = float(explainer.expected_value)
        if isinstance(base_value, np.ndarray):
            base_value = float(base_value[1]) if len(base_value) > 1 else float(base_value[0])
        
        # Get feature names from the preprocessor
        try:
            feature_names = list(preprocessor.get_feature_names_out())
        except Exception:
            feature_names = meta.get("transformer_feature_names", [f"feature_{i}" for i in range(len(shap_vals))])
        
        # Build feature-SHAP pairs
        feature_shap_pairs = []
        for i, (fname, sval) in enumerate(zip(feature_names, shap_vals)):
            # Clean up feature names
            clean_name = fname.replace("num__", "").replace("cat__", "")
            feature_shap_pairs.append({
                "feature": clean_name,
                "value": float(sval),
                "abs_value": float(abs(sval)),
                "direction": "↑" if sval > 0 else "↓"
            })
        
        # Sort by absolute value
        feature_shap_pairs.sort(key=lambda x: x["abs_value"], reverse=True)
        
        # Top risk factors (positive SHAP = increases risk)
        top_risk = [
            f"{_human_readable_name(f['feature'])} {f['direction']}"
            for f in feature_shap_pairs[:10]
            if f["value"] > 0
        ][:5]
        
        # Top protective factors (negative SHAP = decreases risk)
        top_protective = [
            f"{_human_readable_name(f['feature'])} {f['direction']}"
            for f in feature_shap_pairs[:10]
            if f["value"] < 0
        ][:5]
        
        return {
            "shap_values": feature_shap_pairs[:15],  # Top 15 features
            "base_value": base_value,
            "top_risk_factors": top_risk,
            "top_protective_factors": top_protective,
            "explanation_method": "SHAP TreeExplainer"
        }
        
    except Exception as e:
        print(f"[SHAP] Computation error: {e}")
        return _fallback_explanation(feature_df)


def _fallback_explanation(feature_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Rule-based fallback when SHAP isn't available.
    Uses the latest row values to determine feature contributions.
    """
    last_row = feature_df.iloc[-1]
    
    factors = []
    
    # Check each vital and generate importance based on how far from normal
    checks = [
        ("heart_rate", 60, 100, "Heart Rate"),
        ("spo2_pct", 95, 100, "SpO2"),
        ("systolic_bp", 90, 120, "Systolic BP"),
        ("respiratory_rate", 12, 20, "Respiratory Rate"),
        ("lactate", 0.5, 1.0, "Lactate"),
        ("crp_level", 0, 10, "CRP Level"),
        ("wbc_count", 4.5, 11.0, "WBC Count"),
        ("creatinine", 0.7, 1.3, "Creatinine"),
        ("platelets", 150, 450, "Platelets"),
        ("tsh", 0.4, 4.0, "TSH"),
    ]
    
    for col, norm_low, norm_high, label in checks:
        if col in last_row.index:
            val = float(last_row[col])
            if val < norm_low:
                deviation = (norm_low - val) / (norm_high - norm_low)
                factors.append({
                    "feature": col,
                    "value": -abs(deviation),
                    "abs_value": abs(deviation),
                    "direction": "↓"
                })
            elif val > norm_high:
                deviation = (val - norm_high) / (norm_high - norm_low)
                factors.append({
                    "feature": col,
                    "value": abs(deviation),
                    "abs_value": abs(deviation),
                    "direction": "↑"
                })
            else:
                factors.append({
                    "feature": col,
                    "value": 0.0,
                    "abs_value": 0.0,
                    "direction": "→"
                })
    
    factors.sort(key=lambda x: x["abs_value"], reverse=True)
    
    top_risk = [
        f"{_human_readable_name(f['feature'])} {f['direction']}"
        for f in factors if f["value"] > 0.1
    ][:5]
    
    top_protective = [
        f"{_human_readable_name(f['feature'])} {f['direction']}"
        for f in factors if f["value"] < -0.1
    ][:5]
    
    return {
        "shap_values": factors[:15],
        "base_value": 0.5,
        "top_risk_factors": top_risk if top_risk else ["All vitals within normal range"],
        "top_protective_factors": top_protective if top_protective else ["No protective deviations detected"],
        "explanation_method": "Rule-based (SHAP unavailable)"
    }


# Human-readable feature name mapping
_FEATURE_NAMES = {
    "heart_rate": "Heart Rate",
    "respiratory_rate": "Respiratory Rate",
    "spo2_pct": "SpO2",
    "temperature_c": "Temperature",
    "systolic_bp": "Systolic BP",
    "diastolic_bp": "Diastolic BP",
    "wbc_count": "WBC Count",
    "lactate": "Lactate",
    "creatinine": "Creatinine",
    "crp_level": "CRP Level",
    "platelets": "Platelets",
    "calcium_level": "Calcium",
    "iron_level": "Iron",
    "cholesterol": "Cholesterol",
    "cortisol": "Cortisol",
    "esr": "ESR",
    "t3": "Free T3",
    "t4": "Free T4",
    "tsh": "TSH",
    "comorbidity_index": "Comorbidity",
    "age": "Age",
    "hour_from_admission": "Time in Hospital",
}


def _human_readable_name(feature_name: str) -> str:
    """Convert feature_name to human-readable label."""
    # Strip rolling/delta suffixes
    base = feature_name.split("_roll_")[0].split("_delta_")[0]
    suffix = ""
    if "_roll_mean_" in feature_name:
        suffix = " (avg)"
    elif "_roll_var_" in feature_name:
        suffix = " (var)"
    elif "_delta_" in feature_name and "_sign_" not in feature_name:
        suffix = " (trend)"
    
    return _FEATURE_NAMES.get(base, base.replace("_", " ").title()) + suffix
