import random

class MedicalChatbot:
    def __init__(self):
        # Knowledge Base
        self.knowledge = {
            "medication": {
                "antibiotics": "Most antibiotics should be taken **after food** to prevent stomach upset.",
                "thyroid": "Thyroid medications (like Levothyroxine) should be taken in the morning on an **empty stomach**, at least 30-60 minutes before breakfast.",
                "iron": "Iron supplements are best absorbed on an **empty stomach** (before food). However, if they cause nausea, they can be taken with a small amount of food (avoid dairy).",
                "calcium": "Calcium supplements are best taken **after food** for better absorption.",
                "paracetamol": "Paracetamol can be taken with or without food. Maximum dose is 4g in 24 hours.",
                "insulin": "Insulin timing depends on the type (rapid-acting vs long-acting). Consult your prescription for exact timing relative to meals.",
            },
            "nutrition": {
                "low iron": "For low iron (anemia), eat iron-rich foods: **Spinach, dates, jaggery, beetroot, beans, red meat, and pumpkin seeds**. Pair with Vitamin C (lemon/orange) for better absorption.",
                "low calcium": "For low calcium, consume: **Milk, curd (yogurt), paneer (cottage cheese), almonds, broccoli, and fortified cereals**.",
                "low hemoglobin": "To boost hemoglobin, combine **iron-rich foods** (spinach, meat) with **folate** (lentils, asparagus) and **Vitamin C**.",
                "immune boost": "For immunity, focus on: **Citrus fruits, ginger, garlic, turmeric, and zinc-rich foods like nuts**.",
            },
            "parameters": {
                "spo2": "**SpO2 (Oxygen Saturation):** Measures the percentage of oxygen in your blood. \n- **Normal Range:** 95%–100%. \n- **Caution:** Below 92% may require medical attention.",
                "crp": "**CRP (C-Reactive Protein):** A marker of inflammation in the body. \n- **Normal Range:** Generally below 3.0 mg/L. \n- **High CRP:** Indicates infection, inflammation, or tissue damage.",
                "heart rate": "**Heart Rate (Pulse):** The number of times your heart beats per minute. \n- **Normal Range:** 60–100 bpm (at rest). \n- **Tachycardia:** High heart rate (>100 bpm).",
                "lactate": "**Lactate:** Measures lactic acid levels. High levels often indicate sepsis or tissue hypoxia.",
            },
            "side_effects": {
                "paracetamol": "Common side effects are rare but can include skin rash or nausea. Overdose can cause severe liver damage.",
                "cortisol": "Chronically high cortisol can lead to weight gain (especially in the face/abdomen), high blood pressure, and muscle weakness.",
                "antibiotics": "Common side effects include diarrhea, nausea, and yeast infections. Consult a doctor if you develop a severe rash.",
            }
        }
        
    def get_intent(self, query):
        query = query.lower()
        if any(word in query for word in ["take", "medicine", "pill", "tablet", "antibiotic", "thyroid", "iron", "calcium"]):
            return "medication"
        if any(word in query for word in ["eat", "food", "diet", "nutrition", "deficiency", "low iron", "low calcium", "hemoglobin"]):
            return "nutrition"
        if any(word in query for word in ["what is", "explain", "spo2", "crp", "lactate", "heart rate"]):
            return "parameters"
        if any(word in query for word in ["side effect", "risk of", "harm", "problem with"]):
            return "side_effects"
        return "general"

    def get_response(self, query, patient_vitals=None):
        query = query.lower()
        intent = self.get_intent(query)
        
        response = ""
        
        # 1. Check patient vitals context first
        if patient_vitals:
            vitals_alert = self._check_vitals_context(patient_vitals)
            if vitals_alert:
                response += f"⚠️ **Observation:** {vitals_alert}\n\n"

        # 2. Match against knowledge base
        found_data = False
        for category, data in self.knowledge.items():
            for key, info in data.items():
                if key in query:
                    response += info
                    found_data = True
                    break
            if found_data: break
            
        if not found_data:
            if intent == "medication":
                response += "For medication timing, general rules apply: Thyroid/Iron usually before food, Antibiotics/Calcium after food. Always check the label."
            elif intent == "nutrition":
                response += "Focus on whole foods. For specific deficiencies (like Iron or Calcium), focus on leafy greens and dairy/nuts respectively."
            elif intent == "parameters":
                response += "I can explain SpO2, CRP, and Heart Rate. Which one would you like to know about?"
            elif intent == "side_effects":
                response += "Common side effects for most meds include nausea or rash. Please consult a doctor for severe reactions."
            else:
                response += "I'm your AI Medical Assistant. I can help with medicine timing, diet advice, and explaining medical tests. How can I help today?"

        response += "\n\n***\n*Disclaimer: This is general guidance. Please consult a doctor for medical decisions.*"
        return response

    def _check_vitals_context(self, vitals):
        alerts = []
        hr = vitals.get("heart_rate")
        spo2 = vitals.get("spo2_pct")
        bp_sys = vitals.get("systolic_bp")
        
        if hr and hr > 110:
            alerts.append("The patient's heart rate is elevated (>110 bpm), which may indicate stress, pain, or infection.")
        if spo2 and spo2 < 93:
            alerts.append("The patient's oxygen levels (SpO2) are low (<93%). Please ensure proper respiratory support and monitoring.")
        if bp_sys and bp_sys < 90:
            alerts.append("The patient's blood pressure is low (hypotension). This should be monitored closely.")
            
        return " ".join(alerts) if alerts else None
