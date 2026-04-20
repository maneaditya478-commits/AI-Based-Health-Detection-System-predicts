"""
Utilities for preprocessing, feature engineering, and risk mapping.

This project uses an hour-based timeline column `hour_from_admission`.
If the input CSV has no explicit `patient_id`, we infer patient boundaries by
detecting resets of `hour_from_admission` back to 0.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd


DEFAULT_TIME_COL = "hour_from_admission"
DEFAULT_PATIENT_ID_COL = "patient_id"
DEFAULT_LABEL_COL = "deterioration_next_12h"


def get_default_categorical_cols() -> List[str]:
    return [
        "oxygen_device", 
        "gender", 
        "admission_type",
        "rs_status",    # Respiratory System (A/E, BS)
        "cvs_status",   # Cardiovascular System (CAS)
        "cns_status"    # CNS status: alert/drowsy/unconscious
    ]


def get_default_vital_numeric_cols() -> List[str]:
    # Extended columns required for AI-Based Early Warning System
    return [
        # Vital Signs
        "heart_rate",
        "respiratory_rate",
        "spo2_pct",
        "temperature_c",
        "systolic_bp",
        "diastolic_bp",
        
        # Laboratory & Clinical Markers
        "wbc_count",
        "lactate",
        "creatinine",
        "crp_level",
        "platelets",
        "calcium_level",
        "iron_level",
        "cholesterol",
        "cortisol",
        "esr",
        "urine_routine",
        
        # Thyroid Profile
        "t3",
        "t4",
        "tsh"
    ]


@dataclass(frozen=True)
class FeatureConfig:
    """Configuration for time-series feature engineering."""

    time_col: str = DEFAULT_TIME_COL
    patient_id_col: str = DEFAULT_PATIENT_ID_COL
    windows: Tuple[int, int] = (6, 12)  # Changed to 6 and 12 hours based on instructions

    # Rolling features: mean/min/max/variance are computed for each window.
    add_rolling_mean: bool = True
    add_rolling_min: bool = True
    add_rolling_max: bool = True
    add_rolling_var: bool = True

    # Trend features: delta between current value and value w steps ago.
    add_trend_delta: bool = True
    add_trend_sign: bool = True


def infer_patient_id_from_hour(
    df: pd.DataFrame,
    time_col: str = DEFAULT_TIME_COL,
    patient_id_col: str = DEFAULT_PATIENT_ID_COL,
) -> pd.DataFrame:
    """
    Infer patient_id by detecting resets of `time_col` to 0.
    """
    if patient_id_col in df.columns:
        return df
    if time_col not in df.columns:
        raise ValueError(f"Missing required time column: {time_col}")

    hours = df[time_col].values
    prev = np.roll(hours, 1).astype(float)
    prev[0] = np.nan
    new_boundary = (hours == 0) & (pd.Series(prev).fillna(-9999).values > 0)
    patient_ids = np.cumsum(new_boundary).astype(int)
    df = df.copy()
    df[patient_id_col] = patient_ids
    return df


def _sort_within_patient(df: pd.DataFrame, patient_id_col: str, time_col: str) -> pd.DataFrame:
    return df.sort_values([patient_id_col, time_col], ascending=[True, True]).reset_index(drop=True)


def preprocess_missing_values(
    df: pd.DataFrame,
    patient_id_col: str = DEFAULT_PATIENT_ID_COL,
    time_col: str = DEFAULT_TIME_COL,
    categorical_cols: Optional[Sequence[str]] = None,
    numeric_cols: Optional[Sequence[str]] = None,
) -> pd.DataFrame:
    """
    Handle missing values using forward fill and interpolation (per patient).
    """
    df = df.copy()
    if patient_id_col not in df.columns:
        raise ValueError(f"Missing required patient id column: {patient_id_col}")
    if time_col not in df.columns:
        raise ValueError(f"Missing required time column: {time_col}")

    categorical_cols = list(categorical_cols) if categorical_cols is not None else []
    numeric_cols = list(numeric_cols) if numeric_cols is not None else []

    df = _sort_within_patient(df, patient_id_col, time_col)

    # Fill categorical values forward then default.
    for c in categorical_cols:
        if c in df.columns:
            df[c] = df.groupby(patient_id_col)[c].ffill()
            df[c] = df[c].fillna("unknown")

    # Fill numeric values forward then interpolate.
    for c in numeric_cols:
        if c not in df.columns:
            continue
        df[c] = df.groupby(patient_id_col)[c].ffill()
        # Interpolate within each patient timeline.
        df[c] = df.groupby(patient_id_col)[c].transform(
            lambda s: s.interpolate(method="linear", limit_direction="both")
        )
        median_val = df[c].median()
        df[c] = df[c].fillna(median_val if pd.notna(median_val) else 0.0)

    return df


def add_time_series_features(
    df: pd.DataFrame,
    feature_config: FeatureConfig = FeatureConfig(),
    vital_numeric_cols: Optional[Sequence[str]] = None,
    drop_original_vitals_from_rolling_namespace: bool = False,
) -> pd.DataFrame:
    """
    Add rolling averages, min/max/mean/variance, and trends over the last `windows`.
    """
    df = df.copy()
    patient_id_col = feature_config.patient_id_col
    time_col = feature_config.time_col

    if patient_id_col not in df.columns:
        raise ValueError(f"Missing patient id column: {patient_id_col}")
    if time_col not in df.columns:
        raise ValueError(f"Missing time column: {time_col}")

    vital_numeric_cols = list(vital_numeric_cols) if vital_numeric_cols is not None else get_default_vital_numeric_cols()
    df = _sort_within_patient(df, patient_id_col, time_col)

    for col in vital_numeric_cols:
        if col not in df.columns:
            continue

        for w in feature_config.windows:
            grp = df.groupby(patient_id_col)[col]

            if feature_config.add_rolling_mean:
                df[f"{col}_roll_mean_{w}"] = grp.rolling(window=w, min_periods=1).mean().reset_index(level=0, drop=True)
            if feature_config.add_rolling_min:
                df[f"{col}_roll_min_{w}"] = grp.rolling(window=w, min_periods=1).min().reset_index(level=0, drop=True)
            if feature_config.add_rolling_max:
                df[f"{col}_roll_max_{w}"] = grp.rolling(window=w, min_periods=1).max().reset_index(level=0, drop=True)
            if feature_config.add_rolling_var:
                df[f"{col}_roll_var_{w}"] = grp.rolling(window=w, min_periods=1).var().reset_index(level=0, drop=True)

            if feature_config.add_trend_delta:
                df[f"{col}_delta_{w}"] = grp.diff(w)
            if feature_config.add_trend_sign:
                delta = df[f"{col}_delta_{w}"] if f"{col}_delta_{w}" in df.columns else grp.diff(w)
                df[f"{col}_delta_sign_{w}"] = np.sign(delta).fillna(0).astype(int)

    if drop_original_vitals_from_rolling_namespace:
        df = df.drop(columns=[c for c in vital_numeric_cols if c in df.columns])

    # Fill NaNs
    engineered_numeric_cols = [c for c in df.columns if any(key in c for key in ["_roll_", "_delta_", "_delta_sign_"])]
    df[engineered_numeric_cols] = df.groupby(patient_id_col)[engineered_numeric_cols].ffill()
    medians = df[engineered_numeric_cols].median()
    for c in engineered_numeric_cols:
        fill_val = medians.get(c, 0.0)
        df[c] = df[c].fillna(fill_val if pd.notna(fill_val) else 0.0)
    return df


def featurize_dataset(
    df: pd.DataFrame,
    *,
    label_col: str,
    feature_config: FeatureConfig = FeatureConfig(),
    vital_numeric_cols: Optional[Sequence[str]] = None,
    categorical_cols: Optional[Sequence[str]] = None,
) -> Tuple[pd.DataFrame, pd.Series]:
    """Featurize a full dataset containing multiple patients."""
    categorical_cols = list(categorical_cols) if categorical_cols is not None else get_default_categorical_cols()
    vital_numeric_cols = list(vital_numeric_cols) if vital_numeric_cols is not None else get_default_vital_numeric_cols()

    if label_col not in df.columns:
        raise ValueError(f"Missing label column: {label_col}")

    df = infer_patient_id_from_hour(df, time_col=feature_config.time_col, patient_id_col=feature_config.patient_id_col)

    numeric_cols = [c for c in df.columns if c not in categorical_cols and c not in {feature_config.patient_id_col, label_col} and pd.api.types.is_numeric_dtype(df[c])]
    numeric_cols = [c for c in numeric_cols if c != feature_config.time_col] + [feature_config.time_col]
    df = preprocess_missing_values(
        df,
        patient_id_col=feature_config.patient_id_col,
        time_col=feature_config.time_col,
        categorical_cols=[c for c in categorical_cols if c in df.columns],
        numeric_cols=numeric_cols,
    )

    df = add_time_series_features(
        df,
        feature_config=feature_config,
        vital_numeric_cols=vital_numeric_cols,
    )

    y = df[label_col].astype(int)
    X = df.drop(columns=[label_col])
    return X, y


def featurize_history(
    history: List[Dict],
    patient_profile: Dict,
    *,
    feature_config: FeatureConfig = FeatureConfig(),
    vital_numeric_cols: Optional[Sequence[str]] = None,
    categorical_cols: Optional[Sequence[str]] = None,
) -> pd.DataFrame:
    """Build a single patient's feature dataframe from a time-ordered `history` list."""
    categorical_cols = list(categorical_cols) if categorical_cols is not None else get_default_categorical_cols()
    vital_numeric_cols = list(vital_numeric_cols) if vital_numeric_cols is not None else get_default_vital_numeric_cols()

    if not history:
        raise ValueError("history must be a non-empty list")
    if feature_config.time_col not in history[0]:
        raise ValueError(f"Each history item must include `{feature_config.time_col}`")

    df = pd.DataFrame(history).copy()

    for k, v in patient_profile.items():
        df[k] = v

    for c in vital_numeric_cols:
        if c not in df.columns:
            df[c] = np.nan

    for c in categorical_cols:
        if c not in df.columns:
            df[c] = "unknown"

    df[feature_config.patient_id_col] = 0

    df = preprocess_missing_values(
        df,
        patient_id_col=feature_config.patient_id_col,
        time_col=feature_config.time_col,
        categorical_cols=[c for c in categorical_cols if c in df.columns],
        numeric_cols=[
            c for c in df.columns if c not in categorical_cols and (pd.api.types.is_numeric_dtype(df[c]) or c in vital_numeric_cols)
        ],
    )

    df = add_time_series_features(
        df,
        feature_config=feature_config,
        vital_numeric_cols=vital_numeric_cols,
    )

    return df


def risk_level_from_probability(prob_0_to_1: float, *, low: float = 0.35, high: float = 0.70) -> str:
    """Map risk probability to discrete risk level."""
    if prob_0_to_1 < low:
        return "Low"
    if prob_0_to_1 < high:
        return "Medium"
    return "High"


def probability_to_percent(prob_0_to_1: float) -> float:
    return float(np.clip(prob_0_to_1, 0.0, 1.0) * 100.0)


def save_json(data: Dict, path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
