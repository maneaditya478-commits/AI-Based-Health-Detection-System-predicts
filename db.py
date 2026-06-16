"""
MongoDB-based database layer for the Hospital-Grade EWS Platform.
Replaces the previous JSON-file-based storage with persistent MongoDB collections.

Collections:
  - users           : Doctor/Patient user accounts
  - patients        : Patient profiles + latest risk
  - vitals_history : Timestamped vitals records per patient
  - predictions    : Prediction results per patient
"""

from __future__ import annotations
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pymongo import MongoClient
from bson import ObjectId

import logging

# --- MongoDB Configuration ---
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
DATABASE_NAME = "medai_hub"

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("db")

# Initialize Client
try:
    logger.info(f"Connecting to MongoDB at {MONGO_URI}...")
    try:
        import certifi
        ca = certifi.where()
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000, tlsCAFile=ca)
    except ImportError:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client[DATABASE_NAME]
    # Check connection
    client.admin.command('ping')
    logger.info("MongoDB Connection Successful.")
except Exception as e:
    logger.error(f"MongoDB Connection Failed: {e}")
    # Fallback/Dummy db can be used here if needed, but for this project we require Mongo
    db = client[DATABASE_NAME] # Still try to use it if client exists

# ---------- Helper: Serialization ----------

def _stringify_id(doc: Dict | None) -> Dict | None:
    """Helper to convert MongoDB ObjectId to string for JSON serialization."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

def _stringify_ids(docs: List[Dict]) -> List[Dict]:
    """Helper to convert a list of documents' ObjectIds to strings."""
    return [_stringify_id(doc) for doc in docs]

# ---------- Generic CRUD (MongoDB Implementation) ----------

def find_all(collection_name: str) -> List[Dict]:
    """Retrieve all documents from a collection."""
    # Convert ObjectIds to strings so FastAPI can serialize them
    return _stringify_ids(list(db[collection_name].find({})))


def find_one(collection_name: str, query: Dict) -> Optional[Dict]:
    """Find a single document matching the query."""
    return _stringify_id(db[collection_name].find_one(query))


def find_many(collection_name: str, query: Dict) -> List[Dict]:
    """Find all documents matching the query."""
    return _stringify_ids(list(db[collection_name].find(query)))


def insert_one(collection_name: str, doc: Dict) -> Dict:
    """Insert a new document."""
    if "_id" not in doc:
        doc["_id"] = str(uuid.uuid4())[:8]
    if "created_at" not in doc:
        doc["created_at"] = datetime.now().isoformat()
    
    db[collection_name].insert_one(doc)
    return _stringify_id(doc)


def update_one(collection_name: str, query: Dict, update: Dict) -> Optional[Dict]:
    """Update an existing document."""
    update["updated_at"] = datetime.now().isoformat()
    res = db[collection_name].update_one(query, {"$set": update})
    if res.matched_count > 0:
        return find_one(collection_name, query)
    return None


def upsert_one(collection_name: str, query: Dict, doc: Dict) -> Dict:
    """Insert or update a document."""
    doc["updated_at"] = datetime.now().isoformat()
    db[collection_name].update_one(query, {"$set": doc}, upsert=True)
    return find_one(collection_name, query)


def delete_one(collection_name: str, query: Dict) -> bool:
    """Delete a document."""
    res = db[collection_name].delete_one(query)
    return res.deleted_count > 0


def count(collection_name: str, query: Dict = None) -> int:
    """Count documents matching the query."""
    if query:
        return db[collection_name].count_documents(query)
    return db[collection_name].count_documents({})


# ---------- Convenience: Patients ----------

def get_all_patients() -> List[Dict]:
    return find_all("patients")


def get_patient(patient_id: str) -> Optional[Dict]:
    return find_one("patients", {"patient_id": patient_id})


def save_patient(patient: Dict) -> Dict:
    return upsert_one("patients", {"patient_id": patient["patient_id"]}, patient)


# ---------- Convenience: Vitals History ----------

def save_vitals(patient_id: str, vitals: Dict):
    record = {
        "patient_id": patient_id,
        "timestamp": datetime.now().isoformat(),
        **vitals
    }
    return insert_one("vitals_history", record)


def get_vitals_history(patient_id: str) -> List[Dict]:
    return find_many("vitals_history", {"patient_id": patient_id})


# ---------- Convenience: Predictions ----------

def save_prediction(patient_id: str, prediction: Dict):
    record = {
        "patient_id": patient_id,
        "timestamp": datetime.now().isoformat(),
        **prediction
    }
    return insert_one("predictions", record)


def get_predictions(patient_id: str) -> List[Dict]:
    return find_many("predictions", {"patient_id": patient_id})


# ---------- Convenience: Users ----------

def get_user_by_username(username: str) -> Optional[Dict]:
    return find_one("users", {"username": username})


def create_user(username: str, hashed_password: str, role: str, full_name: str = "") -> Dict:
    return insert_one("users", {
        "username": username,
        "hashed_password": hashed_password,
        "role": role,
        "full_name": full_name
    })


# ---------- Demo Data Seeding ----------

DEMO_PATIENTS = [
    {
        "patient_id": "PT-1001", "name": "Rahul Sharma", "age": 45, "gender": "M",
        "weight_kg": 78.0, "comorbidity_index": 3.2, "admission_type": "Emergency",
        "phone_number": "+91 98765 11001", "ward": "ICU-A", "bed": "A-01",
        "risk_probability": 78.5, "risk_level": "High",
        "heart_rate": 128, "spo2_pct": 89, "systolic_bp": 85, "temperature_f": 102.4,
        "respiratory_rate": 28, "lactate": 4.2, "status": "critical"
    },
    {
        "patient_id": "PT-1002", "name": "Priya Patel", "age": 62, "gender": "F",
        "weight_kg": 65.0, "comorbidity_index": 5.1, "admission_type": "Emergency",
        "phone_number": "+91 98765 11002", "ward": "ICU-A", "bed": "A-02",
        "risk_probability": 65.3, "risk_level": "Medium",
        "heart_rate": 105, "spo2_pct": 93, "systolic_bp": 100, "temperature_f": 100.8,
        "respiratory_rate": 24, "lactate": 2.8, "status": "warning"
    },
    {
        "patient_id": "PT-1003", "name": "Amit Kumar", "age": 38, "gender": "M",
        "weight_kg": 82.0, "comorbidity_index": 1.5, "admission_type": "Elective",
        "phone_number": "+91 98765 11003", "ward": "ICU-B", "bed": "B-01",
        "risk_probability": 12.1, "risk_level": "Low",
        "heart_rate": 72, "spo2_pct": 98, "systolic_bp": 118, "temperature_f": 98.4,
        "respiratory_rate": 16, "lactate": 0.8, "status": "stable"
    },
    {
        "patient_id": "PT-1004", "name": "Sneha Reddy", "age": 55, "gender": "F",
        "weight_kg": 68.0, "comorbidity_index": 4.0, "admission_type": "Emergency",
        "phone_number": "+91 98765 11004", "ward": "ICU-A", "bed": "A-03",
        "risk_probability": 82.7, "risk_level": "High",
        "heart_rate": 135, "spo2_pct": 87, "systolic_bp": 82, "temperature_f": 103.1,
        "respiratory_rate": 32, "lactate": 5.1, "status": "critical"
    },
    {
        "patient_id": "PT-1005", "name": "Vikram Singh", "age": 70, "gender": "M",
        "weight_kg": 90.0, "comorbidity_index": 6.5, "admission_type": "Emergency",
        "phone_number": "+91 98765 11005", "ward": "ICU-B", "bed": "B-02",
        "risk_probability": 55.8, "risk_level": "Medium",
        "heart_rate": 98, "spo2_pct": 94, "systolic_bp": 108, "temperature_f": 100.2,
        "respiratory_rate": 22, "lactate": 2.1, "status": "warning"
    },
    {
        "patient_id": "PT-1006", "name": "Ananya Desai", "age": 29, "gender": "F",
        "weight_kg": 55.0, "comorbidity_index": 0.5, "admission_type": "Elective",
        "phone_number": "+91 98765 11006", "ward": "General", "bed": "G-01",
        "risk_probability": 5.2, "risk_level": "Low",
        "heart_rate": 68, "spo2_pct": 99, "systolic_bp": 115, "temperature_f": 98.6,
        "respiratory_rate": 14, "lactate": 0.6, "status": "stable"
    },
    {
        "patient_id": "PT-1007", "name": "Mohammed Iqbal", "age": 58, "gender": "M",
        "weight_kg": 75.0, "comorbidity_index": 4.8, "admission_type": "Emergency",
        "phone_number": "+91 98765 11007", "ward": "ICU-A", "bed": "A-04",
        "risk_probability": 71.4, "risk_level": "High",
        "heart_rate": 118, "spo2_pct": 91, "systolic_bp": 92, "temperature_f": 101.5,
        "respiratory_rate": 26, "lactate": 3.5, "status": "critical"
    },
    {
        "patient_id": "PT-1008", "name": "Kavita Joshi", "age": 42, "gender": "F",
        "weight_kg": 62.0, "comorbidity_index": 2.0, "admission_type": "Elective",
        "phone_number": "+91 98765 11008", "ward": "General", "bed": "G-02",
        "risk_probability": 18.9, "risk_level": "Low",
        "heart_rate": 76, "spo2_pct": 97, "systolic_bp": 122, "temperature_f": 98.8,
        "respiratory_rate": 18, "lactate": 0.9, "status": "stable"
    }
]


def seed_demo_data():
    """Ensure MongoDB is seeded with full demo clinical data."""
    try:
        # Check if database connection is alive
        client.admin.command('ping')
        
        current_patients = get_all_patients()
        current_patient_ids = {p.get("patient_id") for p in current_patients}
        
        for p in DEMO_PATIENTS:
            if p["patient_id"] not in current_patient_ids:
                save_patient(p)
                logger.info(f"[MongoDB] Seeded missing patient: {p['name']} ({p['patient_id']})")

        # Check for foundational demo users (Doctor & Patient)
        from auth import hash_password
        if not get_user_by_username("doctor"):
            create_user("doctor", hash_password("doctor123"), "doctor", "Dr. Anil Mehta")
            logger.info("[MongoDB] Seeded missing Doctor login.")

        if not get_user_by_username("patient"):
            create_user("patient", hash_password("patient123"), "patient", "Rahul Sharma")
            logger.info("[MongoDB] Seeded missing Patient login.")

    except Exception as e:
        logger.error(f"[MongoDB] Connection/Seed Error: {e}")


# Auto-seed on import (this runs when api.py imports db)
seed_demo_data()
