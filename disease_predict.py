"""
Disease Prediction Module — Rule-based clinical scoring algorithms.

Implements:
  1. Sepsis Risk (qSOFA-inspired)
  2. Stroke Risk (based on clinical risk factors)
  3. Heart Disease Risk (Framingham-inspired)
  
Each returns a 0-100 risk score, risk level, and contributing factors.
"""

from __future__ import annotations
from typing import Any, Dict, List


def compute_sepsis_risk(vitals: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sepsis Risk Assessment using qSOFA-inspired scoring.
    
    Criteria:
      - Respiratory Rate ≥ 22  (1 point)
      - Altered mentation / CNS not alert (1 point)
      - Systolic BP ≤ 100  (1 point)
      - Heart Rate > 100  (1 point)
      - Temperature > 38.3°C or < 36°C  (1 point)
      - WBC > 12 or < 4  (1 point)
      - Lactate > 2  (2 points — critical marker)
    """
    score = 0
    max_score = 9
    factors = []
    
    rr = vitals.get("respiratory_rate", 16)
    if rr >= 22:
        score += 1
        factors.append({"factor": "Respiratory Rate", "value": rr, "detail": f"{rr} rpm (≥22)", "severity": "high"})
    
    cns = vitals.get("cns_status", "alert")
    if cns != "alert":
        score += 1
        factors.append({"factor": "Mental Status", "value": cns, "detail": f"Altered: {cns}", "severity": "high"})
    
    sbp = vitals.get("systolic_bp", 120)
    if sbp <= 100:
        score += 1
        factors.append({"factor": "Systolic BP", "value": sbp, "detail": f"{sbp} mmHg (≤100)", "severity": "medium" if sbp > 90 else "high"})
    
    hr = vitals.get("heart_rate", 75)
    if hr > 100:
        score += 1
        factors.append({"factor": "Heart Rate", "value": hr, "detail": f"{hr} bpm (>100)", "severity": "medium" if hr < 120 else "high"})
    
    # Temperature (convert from F if needed)
    temp_f = vitals.get("temperature_f", 98.6)
    temp_c = (temp_f - 32) * 5 / 9 if temp_f > 50 else vitals.get("temperature_c", 37.0)
    if temp_c > 38.3 or temp_c < 36.0:
        score += 1
        factors.append({"factor": "Temperature", "value": round(temp_c, 1), "detail": f"{round(temp_c, 1)}°C (abnormal)", "severity": "high" if temp_c > 39 else "medium"})
    
    wbc = vitals.get("wbc_count", 7.5)
    if wbc > 12 or wbc < 4:
        score += 1
        detail = f"{wbc} k/µL ({'elevated' if wbc > 12 else 'low'})"
        factors.append({"factor": "WBC Count", "value": wbc, "detail": detail, "severity": "medium"})
    
    lactate = vitals.get("lactate", 1.0)
    if lactate > 2:
        score += 2
        factors.append({"factor": "Lactate", "value": lactate, "detail": f"{lactate} mmol/L (>2 — tissue hypoxia)", "severity": "critical" if lactate > 4 else "high"})
    
    crp = vitals.get("crp_level", 3.0)
    if crp > 50:
        score += 1
        factors.append({"factor": "CRP Level", "value": crp, "detail": f"{crp} mg/L (severe inflammation)", "severity": "high"})
    
    risk_pct = min(100, (score / max_score) * 100)
    risk_level = "Low" if risk_pct < 30 else ("Medium" if risk_pct < 60 else "High")
    
    return {
        "disease": "Sepsis",
        "risk_score": round(risk_pct, 1),
        "risk_level": risk_level,
        "score_detail": f"{score}/{max_score} qSOFA+ criteria met",
        "factors": factors,
        "recommendation": _sepsis_recommendation(risk_level)
    }


def compute_stroke_risk(vitals: Dict[str, Any], profile: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Stroke Risk Assessment based on clinical risk factors.
    
    Scoring:
      - Age > 55 (+1), > 65 (+2), > 75 (+3)
      - Systolic BP > 140 (+2), > 180 (+3)
      - Comorbidity index > 3 (+1), > 5 (+2)
      - Irregular CVS / AFib (+2)
      - Cholesterol > 240 (+1)
      - Altered CNS (+2)
      - SpO2 < 92 (+1)
    """
    profile = profile or {}
    score = 0
    max_score = 15
    factors = []
    
    age = profile.get("age", vitals.get("age", 50))
    if age > 75:
        score += 3
        factors.append({"factor": "Age", "value": age, "detail": f"{age} years (>75 — very high risk)", "severity": "high"})
    elif age > 65:
        score += 2
        factors.append({"factor": "Age", "value": age, "detail": f"{age} years (>65)", "severity": "medium"})
    elif age > 55:
        score += 1
        factors.append({"factor": "Age", "value": age, "detail": f"{age} years (>55)", "severity": "low"})
    
    sbp = vitals.get("systolic_bp", 120)
    if sbp > 180:
        score += 3
        factors.append({"factor": "Systolic BP", "value": sbp, "detail": f"{sbp} mmHg (hypertensive crisis)", "severity": "critical"})
    elif sbp > 140:
        score += 2
        factors.append({"factor": "Systolic BP", "value": sbp, "detail": f"{sbp} mmHg (hypertension)", "severity": "high"})
    
    comorbidity = profile.get("comorbidity_index", 2.0)
    if comorbidity > 5:
        score += 2
        factors.append({"factor": "Comorbidity", "value": comorbidity, "detail": f"Index {comorbidity} (>5)", "severity": "high"})
    elif comorbidity > 3:
        score += 1
        factors.append({"factor": "Comorbidity", "value": comorbidity, "detail": f"Index {comorbidity} (>3)", "severity": "medium"})
    
    cvs = vitals.get("cvs_status", "Normal")
    if cvs in ["Irregular", "Murmur"]:
        score += 2
        factors.append({"factor": "Cardiovascular", "value": cvs, "detail": f"{cvs} — arrhythmia risk", "severity": "high"})
    
    cholesterol = vitals.get("cholesterol", 150)
    if cholesterol > 240:
        score += 1
        factors.append({"factor": "Cholesterol", "value": cholesterol, "detail": f"{cholesterol} mg/dL (>240)", "severity": "medium"})
    
    cns = vitals.get("cns_status", "alert")
    if cns != "alert":
        score += 2
        factors.append({"factor": "CNS Status", "value": cns, "detail": f"Altered: {cns} — possible neurological event", "severity": "critical"})
    
    spo2 = vitals.get("spo2_pct", 98)
    if spo2 < 92:
        score += 1
        factors.append({"factor": "SpO2", "value": spo2, "detail": f"{spo2}% (<92 — hypoxia)", "severity": "high"})
    
    risk_pct = min(100, (score / max_score) * 100)
    risk_level = "Low" if risk_pct < 30 else ("Medium" if risk_pct < 60 else "High")
    
    return {
        "disease": "Stroke",
        "risk_score": round(risk_pct, 1),
        "risk_level": risk_level,
        "score_detail": f"{score}/{max_score} stroke risk factors",
        "factors": factors,
        "recommendation": _stroke_recommendation(risk_level)
    }


def compute_heart_disease_risk(vitals: Dict[str, Any], profile: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Heart Disease Risk Assessment (Framingham-inspired).
    
    Scoring:
      - Age > 45(M)/55(F) (+1), > 65 (+2)
      - Cholesterol > 200 (+1), > 240 (+2)
      - Systolic BP > 130 (+1), > 160 (+2)
      - Heart Rate > 100 (+1), < 50 (+1)
      - Comorbidity index > 3 (+1)
      - Cortisol > 25 (+1)
      - CRP > 10 (+1)
      - Gender Male (+1)
    """
    profile = profile or {}
    score = 0
    max_score = 12
    factors = []
    
    age = profile.get("age", vitals.get("age", 50))
    gender = profile.get("gender", "M")
    age_threshold = 45 if gender == "M" else 55
    
    if age > 65:
        score += 2
        factors.append({"factor": "Age", "value": age, "detail": f"{age} years (>65)", "severity": "high"})
    elif age > age_threshold:
        score += 1
        factors.append({"factor": "Age", "value": age, "detail": f"{age} years (>{age_threshold})", "severity": "medium"})
    
    if gender == "M":
        score += 1
        factors.append({"factor": "Gender", "value": "Male", "detail": "Male — higher baseline risk", "severity": "low"})
    
    cholesterol = vitals.get("cholesterol", 150)
    if cholesterol > 240:
        score += 2
        factors.append({"factor": "Cholesterol", "value": cholesterol, "detail": f"{cholesterol} mg/dL (very high)", "severity": "high"})
    elif cholesterol > 200:
        score += 1
        factors.append({"factor": "Cholesterol", "value": cholesterol, "detail": f"{cholesterol} mg/dL (borderline)", "severity": "medium"})
    
    sbp = vitals.get("systolic_bp", 120)
    if sbp > 160:
        score += 2
        factors.append({"factor": "Systolic BP", "value": sbp, "detail": f"{sbp} mmHg (stage 2 hypertension)", "severity": "high"})
    elif sbp > 130:
        score += 1
        factors.append({"factor": "Systolic BP", "value": sbp, "detail": f"{sbp} mmHg (elevated)", "severity": "medium"})
    
    hr = vitals.get("heart_rate", 75)
    if hr > 100:
        score += 1
        factors.append({"factor": "Heart Rate", "value": hr, "detail": f"{hr} bpm (tachycardia)", "severity": "medium"})
    elif hr < 50:
        score += 1
        factors.append({"factor": "Heart Rate", "value": hr, "detail": f"{hr} bpm (bradycardia)", "severity": "medium"})
    
    comorbidity = profile.get("comorbidity_index", 2.0)
    if comorbidity > 3:
        score += 1
        factors.append({"factor": "Comorbidity", "value": comorbidity, "detail": f"Index {comorbidity}", "severity": "medium"})
    
    cortisol = vitals.get("cortisol", 15)
    if cortisol > 25:
        score += 1
        factors.append({"factor": "Cortisol", "value": cortisol, "detail": f"{cortisol} µg/dL (stress marker)", "severity": "medium"})
    
    crp = vitals.get("crp_level", 3.0)
    if crp > 10:
        score += 1
        factors.append({"factor": "CRP Level", "value": crp, "detail": f"{crp} mg/L (inflammation)", "severity": "medium"})
    
    risk_pct = min(100, (score / max_score) * 100)
    risk_level = "Low" if risk_pct < 30 else ("Medium" if risk_pct < 60 else "High")
    
    return {
        "disease": "Heart Disease",
        "risk_score": round(risk_pct, 1),
        "risk_level": risk_level,
        "score_detail": f"{score}/{max_score} Framingham-inspired criteria",
        "factors": factors,
        "recommendation": _heart_recommendation(risk_level)
    }


def compute_all_disease_risks(vitals: Dict, profile: Dict = None) -> Dict[str, Any]:
    """Compute all disease risks at once."""
    return {
        "sepsis": compute_sepsis_risk(vitals),
        "stroke": compute_stroke_risk(vitals, profile),
        "heart_disease": compute_heart_disease_risk(vitals, profile)
    }


def compute_multi_organ_risk(age: float, bp: float, sugar: float, symptoms: str) -> Dict[str, str]:
    """
    Computes qualitative risk levels (Normal, Moderate Risk, High Risk) for 5 core organs.
    Designed for the multilingual Patient Interface, merging numeric thresholds with NLP keyword analysis.
    """
    # --- Input Validation ---
    if age < 0 or age > 120 or bp < 0 or bp > 300 or sugar < 0 or sugar > 1000:
        return {
            "heart": "Invalid Input",
            "brain": "Invalid Input",
            "lungs": "Invalid Input",
            "liver": "Invalid Input",
            "kidney": "Invalid Input"
        }

    symptoms_lower = symptoms.lower()
    
    # 1. Heart Risk (Systolic BP + Age)
    heart_risk = "Normal"
    if bp > 160:
        heart_risk = "High Risk"
    elif bp > 140 or (bp > 130 and age > 60):
        heart_risk = "Moderate Risk"

    # 2. Brain Risk (Critical Hypertension + Age)
    brain_risk = "Normal"
    if bp > 180 and age > 65:
        brain_risk = "High Risk"
    elif bp > 160 or age > 75:
        brain_risk = "Moderate Risk"

    # 3. Lungs Risk (NLP Keyword Match: EN/HI/MR)
    lung_keywords_high = ["shortness of breath", "chest pain", "breathing difficulty", "सांस", "दम", "छातीत", "श्वास"]
    lung_keywords_mod = ["cough", "wheezing", "खोकला", "खांसी", "कफ"]
    lungs_risk = "Normal"
    if any(k in symptoms_lower for k in lung_keywords_high):
        lungs_risk = "High Risk"
    elif any(k in symptoms_lower for k in lung_keywords_mod):
        lungs_risk = "Moderate Risk"

    # 4. Liver Risk (NLP Keyword Match)
    liver_keywords_high = ["jaundice", "yellow skin", "vomiting blood", "पीलिया", "कावीळ", "उल्टी"]
    liver_keywords_mod = ["nausea", "abdominal pain", "पेट दर्द", "पोटात दुखी", "मळमळ"]
    liver_risk = "Normal"
    if any(k in symptoms_lower for k in liver_keywords_high):
        liver_risk = "High Risk"
    elif any(k in symptoms_lower for k in liver_keywords_mod):
        liver_risk = "Moderate Risk"

    # 5. Kidney Risk (Diabetic threshold + Edema/Urine Keywords)
    kidney_keywords = ["urination", "urine", "swelling", "सूजन", "पेशाब", "लघवी", "सूज"]
    kidney_risk = "Normal"
    if sugar > 250:
        kidney_risk = "High Risk"
    elif sugar > 180 or any(k in symptoms_lower for k in kidney_keywords):
        kidney_risk = "Moderate Risk"

    return {
        "heart": heart_risk,
        "brain": brain_risk,
        "lungs": lungs_risk,
        "liver": liver_risk,
        "kidney": kidney_risk
    }


# --- Recommendations ---

def _sepsis_recommendation(level: str) -> str:
    if level == "High":
        return "URGENT: Initiate sepsis bundle — Blood cultures, broad-spectrum antibiotics, IV fluids (30ml/kg crystalloid). Consider vasopressors if MAP <65."
    elif level == "Medium":
        return "Monitor closely. Repeat lactate in 2-4 hours. Consider serial qSOFA assessments. Prepare for potential escalation."
    return "Low sepsis risk. Continue routine monitoring. Re-assess if clinical picture changes."


def _stroke_recommendation(level: str) -> str:
    if level == "High":
        return "URGENT: Perform NIHSS assessment. Consider CT/MRI brain. If acute symptoms, activate stroke code. BP management critical."
    elif level == "Medium":
        return "Monitor neurological status closely. Control blood pressure. Assess for TIA symptoms. Consider anticoagulation review."
    return "Low stroke risk. Continue preventive measures. Monitor BP and cholesterol."


def _heart_recommendation(level: str) -> str:
    if level == "High":
        return "URGENT: Obtain 12-lead ECG and cardiac biomarkers (Troponin). Consider cardiology consult. Monitor for chest pain, dyspnea."
    elif level == "Medium":
        return "Monitor cardiac rhythm. Review lipid panel and BP medications. Consider lifestyle modification plan."
    return "Low cardiac risk. Continue preventive care. Encourage regular exercise and heart-healthy diet."
