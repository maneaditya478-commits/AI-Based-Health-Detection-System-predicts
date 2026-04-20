import os
import time
import json
from datetime import datetime, timedelta
from twilio.rest import Client

# --- Twilio Configuration (Set these in environment variables) ---
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")
TWILIO_WHATSAPP_NUMBER = os.environ.get("TWILIO_WHATSAPP_NUMBER", "")

# --- Alert Logic & History ---
ALERT_LOG_FILE = "alert_history.json"
COOLDOWN_MINUTES = 10

class AlertManager:
    def __init__(self):
        self.last_alert_time = {} # Maps phone_number to timestamp
        self._ensure_log_exists()

    def _ensure_log_exists(self):
        if not os.path.exists(ALERT_LOG_FILE):
            with open(ALERT_LOG_FILE, "w") as f:
                json.dump([], f)

    def log_alert(self, patient_name, phone_number, message):
        alert_entry = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "patient_name": patient_name,
            "phone_number": phone_number,
            "message": message
        }
        try:
            with open(ALERT_LOG_FILE, "r") as f:
                history = json.load(f)
            history.append(alert_entry)
            with open(ALERT_LOG_FILE, "w") as f:
                json.dump(history[-50:], f, indent=2) # Keep last 50 alerts
        except Exception as e:
            print(f"Logging error: {e}")

    def check_abnormal(self, vitals, patient_name, risk_prob):
        """
        Check for abnormal conditions and return a formatted message if found.
        vitals: dict containing latest measurements
        """
        abnormalities = []
        
        # Vital Signs
        hr = vitals.get("heart_rate", 75)
        spo2 = vitals.get("spo2_pct", 98)
        temp = vitals.get("temperature_c", 37.0)
        sbp = vitals.get("systolic_bp", 120)
        
        if hr > 120: abnormalities.append(f"Heart Rate is high ({hr} bpm)")
        elif hr < 50: abnormalities.append(f"Heart Rate is low ({hr} bpm)")
        
        if spo2 < 92: abnormalities.append(f"SpO2 is low ({spo2}%)")
        if temp > 38.5: abnormalities.append(f"Temperature is high ({temp}°C)")
        if sbp < 90: abnormalities.append(f"Systolic BP is low ({sbp} mmHg)")
        
        # Lab Values
        lactate = vitals.get("lactate", 1.0)
        crp = vitals.get("crp_level", 3.0)
        platelets = vitals.get("platelets", 250)
        
        if lactate > 2.5: abnormalities.append(f"Lactate is high ({lactate}) - SEPSIS RISK")
        if crp > 50: abnormalities.append(f"CRP is high ({crp}) - INFLAMMATION")
        if platelets < 100: abnormalities.append(f"Platelets are low ({platelets}) - BLEEDING RISK")
        
        # Thyroid
        tsh = vitals.get("tsh", 2.0)
        if tsh < 0.3 or tsh > 5.0: abnormalities.append(f"TSH is abnormal ({tsh})")
        
        # Model Risk
        risk_level = "NORMAL"
        if risk_prob > 70:
            risk_level = "HIGH"
            abnormalities.append(f"AI Risk Probability is HIGH ({risk_prob}%)")
        elif risk_prob > 35:
            risk_level = "MEDIUM"

        if not abnormalities:
            return None

        # Build message
        msg_header = "🚨 ALERT: Abnormal Health Detected"
        msg_body = f"Patient: {patient_name}\n" + "\n".join(abnormalities)
        msg_footer = f"\nRisk Level: {risk_level}\n\n🚨 ACTION REQUIRED: Contact your doctor or visit the nearest hospital emergency department immediately."
        
        return f"{msg_header}\n{msg_body}{msg_footer}"

    def send_alert(self, message, phone_number, method="sms"):
        """
        Send alert via Twilio SMS or WhatsApp.
        """
        # Check cooldown
        now = datetime.now()
        if phone_number in self.last_alert_time:
            elapsed = (now - self.last_alert_time[phone_number]).total_seconds() / 60
            if elapsed < COOLDOWN_MINUTES:
                print(f"Skipping alert for {phone_number} (Cooldown active: {elapsed:.1f}m left)")
                return False

        try:
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            
            if method == "sms":
                client.messages.create(
                    body=message,
                    from_=TWILIO_PHONE_NUMBER,
                    to=phone_number
                )
            elif method == "whatsapp":
                client.messages.create(
                    body=message,
                    from_=TWILIO_WHATSAPP_NUMBER,
                    to=f"whatsapp:{phone_number}"
                )
            
            self.last_alert_time[phone_number] = now
            print(f"Successfully sent {method} alert to {phone_number}")
            return True
        except Exception as e:
            print(f"Twilio Error: {e}")
            return False

# Singleton instance
alert_manager = AlertManager()
