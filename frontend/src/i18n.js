import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Statically bundled translations for simplicity without requiring async network fetching
const resources = {
  en: {
    translation: {
      "multi_organ_system": "Multi-Organ Health Detection",
      "multi_organ_desc": "Fill in your vitals and symptoms to receive an AI-powered holistic health evaluation across multiple organs.",
      "age": "Age",
      "blood_pressure": "Blood Pressure (Systolic)",
      "sugar_level": "Blood Sugar Level (mg/dL)",
      "symptoms": "Symptoms",
      "symptoms_placeholder": "Describe what you are feeling...",
      "upload_xray": "Upload X-Ray / CT Scan (Optional)",
      "evaluate_health": "Evaluate Health",
      "heart_status": "Heart Status",
      "brain_status": "Brain Status",
      "lungs_status": "Lungs Status",
      "liver_status": "Liver Status",
      "kidney_status": "Kidney Status",
      "high_risk": "High Risk",
      "moderate_risk": "Moderate Risk",
      "normal": "Normal",
      "speak_result": "Speak Result",
      "stop_speaking": "Stop",
      "listening": "Listening...",
      "tap_to_speak": "🎤 Tap to Speak",
      "results_summary": "Here are your organ health results based on your symptoms and parameters.",
      "alert_high_risk": "WARNING: High Risk detected. Please consult a doctor immediately."
    }
  },
  hi: {
    translation: {
      "multi_organ_system": "बहु-अंग स्वास्थ्य जांच (Multi-Organ Check)",
      "multi_organ_desc": "आर्टिफिशियल इंटेलिजेंस द्वारा अपने सभी महत्वपूर्ण अंगों की जांच के लिए अपने लक्षण भरें।",
      "age": "उम्र",
      "blood_pressure": "रक्तचाप (Blood Pressure)",
      "sugar_level": "शर्करा स्तर (Blood Sugar)",
      "symptoms": "लक्षण",
      "symptoms_placeholder": "आप कैसा महसूस कर रहे हैं, वर्णन करें...",
      "upload_xray": "एक्स-रे / सीटी स्कैन अपलोड करें",
      "evaluate_health": "स्वास्थ्य का मूल्यांकन करें",
      "heart_status": "हृदय स्थिति",
      "brain_status": "मस्तिष्क स्थिति",
      "lungs_status": "फेफड़ों की स्थिति",
      "liver_status": "लिवर स्थिति",
      "kidney_status": "किडनी स्थिति",
      "high_risk": "उच्च जोखिम (High Risk)",
      "moderate_risk": "मध्यम जोखिम",
      "normal": "सामान्य",
      "speak_result": "परिणाम सुनें",
      "stop_speaking": "रुकें",
      "listening": "सुन रहा हूँ...",
      "tap_to_speak": "🎤 बोलने के लिए माइक दबाएं",
      "results_summary": "आपके दिए गए लक्षणों के आधार पर आपका स्वास्थ्य परिणाम यहां दिया गया है:",
      "alert_high_risk": "चेतावनी: उच्च जोखिम पाया गया है। कृपया तुरंत डॉक्टर से संपर्क करें।"
    }
  },
  mr: {
    translation: {
      "multi_organ_system": "बहू-अवयव आरोग्य तपासणी (Multi-Organ Check)",
      "multi_organ_desc": "एआय (AI) द्वारे सर्व महत्वाच्या अवयवांच्या तपासणीसाठी आपली लक्षणे भरा.",
      "age": "वय",
      "blood_pressure": "रक्तदाब (Blood Pressure)",
      "sugar_level": "साखरेची पातळी (Blood Sugar)",
      "symptoms": "लक्षणे",
      "symptoms_placeholder": "आपल्याला काय वाटत आहे ते सांगा...",
      "upload_xray": "एक्स-रे / सीटी स्कॅन अपलोड करा",
      "evaluate_health": "आरोग्याचे मूल्यांकन करा",
      "heart_status": "हृदयाची स्थिती",
      "brain_status": "मेंदूची स्थिती",
      "lungs_status": "फफुसांची स्थिती",
      "liver_status": "यकृताची स्थिती",
      "kidney_status": "मूत्रपिंडाची स्थिती",
      "high_risk": "उच्च धोका (High Risk)",
      "moderate_risk": "मध्यम धोका",
      "normal": "सामान्य",
      "speak_result": "निकाल ऐका",
      "stop_speaking": "थांबा",
      "listening": "ऐकत आहे...",
      "tap_to_speak": "🎤 बोलण्यासाठी माईक दाबा",
      "results_summary": "दिलेल्या लक्षणांच्या आधारे तुमचे आरोग्य निकाल खालीलप्रमाणे आहेत:",
      "alert_high_risk": "इशारा: उच्च धोका आढळला आहे. कृपया त्वरित डॉक्टरांशी संपर्क साधा."
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default to English
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
