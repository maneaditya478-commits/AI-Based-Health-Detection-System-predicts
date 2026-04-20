# Twilio Alert System Setup

Follow these steps to enable SMS and WhatsApp notifications for the Early Warning System.

## 1. Create a Twilio Account
- Go to [Twilio.com](https://www.twilio.com/) and sign up for a free trial or paid account.
- Note your **Account SID** and **Auth Token** from the Twilio Console.

## 2. Get a Phone Number
- Buy a Twilio phone number with SMS capabilities.
- For WhatsApp, enable the **Twilio Sandbox for WhatsApp** in the console.

## 3. Configure Environment Variables
Set the following environment variables on your system to link the app to Twilio:

```bash
# Windows (PowerShell)
$env:TWILIO_ACCOUNT_SID = "your_account_sid"
$env:TWILIO_AUTH_TOKEN = "your_auth_token"
$env:TWILIO_PHONE_NUMBER = "+1234567890"

# Linux/Mac
export TWILIO_ACCOUNT_SID="your_account_sid"
export TWILIO_AUTH_TOKEN="your_auth_token"
export TWILIO_PHONE_NUMBER="+1234567890"
```

*Note: Alternatively, you can edit the placeholders at the top of `alert.py` (not recommended for production).*

## 4. Alert Conditions
The system will automatically send alerts for:
- **Heart Rate**: > 120 or < 50 bpm
- **SpO2**: < 92%
- **Temperature**: > 38.5°C
- **Blood Pressure**: Systolic < 90 mmHg
- **Labs**: Lactate > 2.5, CRP > 50, Platelets < 100
- **AI Prediction**: Risk Probability > 70%

## 5. Cooldown
To prevent notification fatigue, alerts are restricted to once every **10 minutes** per phone number.
