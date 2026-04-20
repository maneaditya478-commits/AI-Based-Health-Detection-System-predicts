"""
FastAPI backend for the Hospital-Grade AI Early Warning System.

Endpoints:
  Auth:
    - POST /auth/signup      -> Register new user
    - POST /auth/login       -> Login, returns JWT token
    - GET  /auth/me          -> Get current user

  Patients (Doctor only):
    - GET    /patients        -> List all patients
    - GET    /patients/{id}   -> Get single patient
    - POST   /patients        -> Create/update patient
    - GET    /patients/{id}/history -> Get vitals history

  Prediction:
    - POST /predict           -> Risk prediction + SHAP + Disease risks
    - POST /disease-risk      -> Disease-specific risk scores
  
  Alerts:
    - GET  /alerts            -> Alert history
"""

from __future__ import annotations

import json
import os
import logging
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from utils import FeatureConfig, featurize_history, probability_to_percent, risk_level_from_probability
from auth import (
    hash_password, verify_password, create_token, decode_token,
    get_current_user, require_doctor
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")


MODEL_DIR = os.path.join("models")
XGB_PATH = os.path.join(MODEL_DIR, "xgb_model.joblib")


def _load_model_artifact(path: str) -> Optional[Dict[str, Any]]:
    if not os.path.exists(path):
        return None
    return joblib.load(path)


_xgb_artifact = _load_model_artifact(XGB_PATH)


def _get_xgb() -> Dict[str, Any]:
    if _xgb_artifact is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model not found at `{XGB_PATH}`. Run `python train.py` first.",
        )
    return _xgb_artifact


app = FastAPI(title="AI-Based Hospital-Grade Early Warning System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

auth_router = APIRouter(prefix="/auth", tags=["Auth"])
patient_router = APIRouter(prefix="/patients", tags=["Patients"])
core_router = APIRouter(tags=["Core"])


# ─── Pydantic Models ────────────────────────────────────────────

class Measurement(BaseModel):
    hour_from_admission: float = Field(..., description="Hours since admission")
    heart_rate: Optional[float] = None
    respiratory_rate: Optional[float] = None
    spo2_pct: Optional[float] = None
    temperature_c: Optional[float] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    wbc_count: Optional[float] = None
    lactate: Optional[float] = None
    creatinine: Optional[float] = None
    crp_level: Optional[float] = None
    platelets: Optional[float] = None
    calcium_level: Optional[float] = None
    iron_level: Optional[float] = None
    cholesterol: Optional[float] = None
    cortisol: Optional[float] = None
    esr: Optional[float] = None
    urine_routine: Optional[float] = None
    t3: Optional[float] = None
    t4: Optional[float] = None
    tsh: Optional[float] = None
    oxygen_device: Optional[str] = "unknown"
    rs_status: Optional[str] = "Normal A/E"
    cvs_status: Optional[str] = "Normal"
    cns_status: Optional[str] = "alert"

    class Config:
        extra = "allow"


class PatientProfile(BaseModel):
    name: Optional[str] = "John Doe"
    patient_id: Optional[str] = "PT-001"
    age: float = 60
    gender: str = "M"
    phone_number: Optional[str] = None
    comorbidity_index: float = 2.0
    admission_type: str = "emergency"
    weight: Optional[float] = None

    class Config:
        extra = "allow"


class PredictRequest(BaseModel):
    profile: PatientProfile
    history: List[Measurement] = Field(..., min_length=1)
    threshold: float = Field(0.5, description="Binary threshold on predicted probability")


class ExplainabilityFactor(BaseModel):
    feature: str
    importance: float


class MultiOrganRequest(BaseModel):
    age: float
    blood_pressure: float
    sugar_level: float
    symptoms: str
    patient_name: str = "Unknown"
    phone_number: str = ""


class PredictResponse(BaseModel):
    model_type: str
    risk_probability: float
    binary_prediction: int
    risk_level: str
    risk_probability_over_time: List[float]
    top_factors: List[ExplainabilityFactor]
    shap_explanation: Optional[Dict] = None
    disease_risks: Optional[Dict] = None


class TrainRequest(BaseModel):
    data_path: Optional[str] = None
    label_col: str = "deterioration_next_12h"
    output_dir: str = "models"
    threshold: float = 0.5
    seed: int = 42


class AuthRequest(BaseModel):
    username: str
    password: str
    role: str = "patient"
    full_name: str = ""


class LoginRequest(BaseModel):
    username: str
    password: str


class DiseaseRiskRequest(BaseModel):
    vitals: Dict[str, Any]
    profile: Optional[Dict[str, Any]] = None


class PatientCreateRequest(BaseModel):
    patient_id: str
    name: str
    age: float = 60
    gender: str = "M"
    weight_kg: float = 70.0
    comorbidity_index: float = 2.0
    admission_type: str = "Elective"
    phone_number: Optional[str] = None
    ward: str = "General"
    bed: str = "G-01"

    class Config:
        extra = "allow"


# ─── Root & Health ───────────────────────────────────────────────

@core_router.get("/")
def read_root() -> Dict[str, Any]:
    return {"message": "AI-Based Hospital-Grade Early Warning System — Backend Running"}


@core_router.get("/health")
def health() -> Dict[str, Any]:
    """Check connectivity to all systems."""
    import db
    mongo_ok = False
    try:
        from pymongo import MongoClient
        db.client.admin.command('ping')
        mongo_ok = True
    except:
        pass
        
    return {
        "status": "ok" if mongo_ok else "degraded",
        "mongodb": "connected" if mongo_ok else "disconnected",
        "model_loaded": _xgb_artifact is not None
    }


# ─── Auth Endpoints ──────────────────────────────────────────────

@auth_router.post("/signup")
def signup(req: AuthRequest):
    import db
    existing = db.get_user_by_username(req.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed = hash_password(req.password)
    user = db.create_user(req.username, hashed, req.role, req.full_name)
    
    token = create_token({
        "username": req.username,
        "role": req.role,
        "full_name": req.full_name or req.username
    })
    
    return {
        "token": token,
        "user": {
            "username": req.username,
            "role": req.role,
            "full_name": req.full_name or req.username
        }
    }


@auth_router.post("/login")
def login(req: LoginRequest):
    import db
    logger.info(f"Login attempt for: {req.username}")
    user = db.get_user_by_username(req.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token({
        "username": user["username"],
        "role": user["role"],
        "full_name": user.get("full_name", user["username"])
    })
    
    return {
        "token": token,
        "user": {
            "username": user["username"],
            "role": user["role"],
            "full_name": user.get("full_name", user["username"])
        }
    }


@auth_router.get("/me")
async def get_me(user=Depends(get_current_user)):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "username": user.get("username"),
        "role": user.get("role"),
        "full_name": user.get("full_name")
    }


# ─── Patient Endpoints ──────────────────────────────────────────

@patient_router.get("")
def list_patients():
    import db
    patients = db.get_all_patients()
    # Sort by risk: critical first
    patients.sort(key=lambda p: p.get("risk_probability", 0), reverse=True)
    return patients


@patient_router.get("/{patient_id}")
def get_patient(patient_id: str):
    import db
    patient = db.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@patient_router.post("")
def create_or_update_patient(req: PatientCreateRequest):
    import db
    patient_data = req.model_dump()
    patient_data["risk_probability"] = 0.0
    patient_data["risk_level"] = "Low"
    patient_data["status"] = "stable"
    return db.save_patient(patient_data)


@patient_router.get("/{patient_id}/history")
def get_patient_history(patient_id: str):
    import db
    history = db.get_vitals_history(patient_id)
    predictions = db.get_predictions(patient_id)
    return {
        "patient_id": patient_id,
        "vitals_history": history[-50:],  # Last 50 entries
        "predictions": predictions[-50:]
    }


# ─── Prediction Endpoint (Enhanced) ─────────────────────────────

@core_router.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    artifact = _get_xgb()
    pipeline = artifact["pipeline"]
    meta = artifact["meta"]
    feature_config = FeatureConfig(**meta["feature_config"])
    vital_numeric_cols = meta.get("vital_numeric_cols", None)

    history_dicts = [m.model_dump() for m in req.history]
    profile_dict = req.profile.model_dump() if req.profile else {}

    df_features = featurize_history(
        history_dicts,
        profile_dict,
        feature_config=feature_config,
        vital_numeric_cols=vital_numeric_cols,
    )

    proba_0_to_1 = pipeline.predict_proba(df_features)[:, 1]
    proba_percent = [probability_to_percent(p) for p in proba_0_to_1]

    last_prob_0_to_1 = float(proba_0_to_1[-1])
    final_prob_percent = float(proba_percent[-1])
    binary = int(last_prob_0_to_1 >= req.threshold)
    risk_level = risk_level_from_probability(last_prob_0_to_1)

    # Feature importances from meta
    raw_factors = meta.get("feature_importances", [])
    top_factors = [ExplainabilityFactor(**f) for f in raw_factors[:5]]

    # --- SHAP Explanation ---
    shap_explanation = None
    try:
        from shap_utils import compute_shap_explanation
        shap_explanation = compute_shap_explanation(df_features)
    except Exception as e:
        logger.error(f"[SHAP] Error: {e}")

    # --- Disease Risk ---
    disease_risks = None
    try:
        from disease_predict import compute_all_disease_risks
        latest_vitals = history_dicts[-1]
        disease_risks = compute_all_disease_risks(latest_vitals, profile_dict)
    except Exception as e:
        logger.error(f"[Disease Risk] Error: {e}")

    # --- Alert Integration ---
    try:
        from alert import alert_manager
        latest_measurement = req.history[-1].model_dump()
        alert_msg = alert_manager.check_abnormal(
            vitals=latest_measurement,
            patient_name=profile_dict.get("name", "Unknown"),
            risk_prob=final_prob_percent
        )
        if alert_msg:
            patient_phone = profile_dict.get("phone_number")
            if patient_phone:
                alert_manager.send_alert(alert_msg, patient_phone, method="sms")
            alert_manager.log_alert(profile_dict.get("name"), patient_phone, alert_msg)
    except Exception as e:
        logger.error(f"[Alert] Error: {e}")

    # --- Save to DB ---
    try:
        import db
        patient_id = profile_dict.get("patient_id", "PT-001")
        db.save_prediction(patient_id, {
            "risk_probability": final_prob_percent,
            "risk_level": risk_level,
            "binary_prediction": binary
        })
        db.save_vitals(patient_id, history_dicts[-1])
        # Update patient risk in DB
        db.update_one("patients", {"patient_id": patient_id}, {
            "risk_probability": final_prob_percent,
            "risk_level": risk_level,
            "status": "critical" if final_prob_percent > 70 else ("warning" if final_prob_percent > 35 else "stable")
        })
    except Exception as e:
        logger.error(f"[DB] Save error: {e}")

    return PredictResponse(
        model_type="XGBoost + SHAP + Clinical Logic",
        risk_probability=final_prob_percent,
        binary_prediction=binary,
        risk_level=risk_level,
        risk_probability_over_time=proba_percent,
        top_factors=top_factors,
        shap_explanation=shap_explanation,
        disease_risks=disease_risks
    )


# ─── Disease Risk Endpoint ───────────────────────────────────────

@core_router.post("/disease-risk")
def disease_risk(req: DiseaseRiskRequest):
    from disease_predict import compute_all_disease_risks
    return compute_all_disease_risks(req.vitals, req.profile)


# ─── Multi-Organ Risk Endpoint ───────────────────────────────────

@core_router.post("/multi-organ-risk")
def multi_organ_risk(req: MultiOrganRequest):
    try:
        from disease_predict import compute_multi_organ_risk
        risks = compute_multi_organ_risk(
            age=req.age,
            bp=req.blood_pressure,
            sugar=req.sugar_level,
            symptoms=req.symptoms
        )
        
        # --- Check for High Risk and trigger SMS Alert ---
        high_risk_organs = [organ for organ, status in risks.items() if status == "High Risk"]
        if high_risk_organs:
            from alert import alert_manager
            alert_msg = f"🚨 URGENT HEALTH ALERT: Patient {req.patient_name}\n"
            alert_msg += f"High Risk detected in the following organs: {', '.join(high_risk_organs).title()}.\n"
            alert_msg += f"Reported Vitals - BP: {req.blood_pressure}, Sugar: {req.sugar_level}\n"
            alert_msg += "Please seek immediate medical attention."
            
            # Log and Send Alert if phone number exists
            if req.phone_number:
                alert_manager.send_alert(alert_msg, req.phone_number, method="sms")
            alert_manager.log_alert(req.patient_name, req.phone_number or "N/A", alert_msg)
            
        return risks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Alerts Endpoint ─────────────────────────────────────────────

@core_router.get("/alerts")
def get_alerts():
    try:
        if os.path.exists("alert_history.json"):
            with open("alert_history.json", "r") as f:
                return json.load(f)
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Training Endpoint ───────────────────────────────────────────

@core_router.post("/train")
def train(req: TrainRequest) -> Dict[str, Any]:
    try:
        from train import train_xgb_and_rf
        import pandas as pd

        data_path = req.data_path
        if data_path is None:
            data_path = os.path.join("data", "dataset.csv")

        if not os.path.exists(data_path):
            if os.path.exists("train.csv"):
                data_path = "train.csv"
            else:
                raise FileNotFoundError(f"Dataset not found at `{data_path}`")

        df = pd.read_csv(data_path)
        payload = train_xgb_and_rf(
            df,
            label_col=req.label_col,
            output_dir=req.output_dir,
            threshold=req.threshold,
            seed=req.seed,
        )

        global _xgb_artifact
        _xgb_artifact = _load_model_artifact(XGB_PATH)

        return payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Startup Event ───────────────────────────────────────────────

@app.on_event("startup")
def on_startup():
    """Seed demo data on startup."""
    try:
        import db
        logger.info("[Startup] Seeding MongoDB demo data...")
        db.seed_demo_data()
    except Exception as e:
        logger.error(f"[Startup] DB seed error: {e}")

# IMPORTANT: Register routers
app.include_router(core_router)
app.include_router(auth_router)
app.include_router(patient_router)

# Log registered routes
for route in app.routes:
    logger.info(f"Route: {getattr(route, 'path', 'N/A')} [{getattr(route, 'methods', 'GET')}]")
