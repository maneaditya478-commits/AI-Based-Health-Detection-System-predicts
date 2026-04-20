export const KNOWLEDGE_BASE = {
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
};

export const detectIntent = (query) => {
    const q = query.toLowerCase();
    if (["take", "medicine", "pill", "tablet", "antibiotic", "thyroid", "iron", "calcium"].some(w => q.includes(w))) return "medication";
    if (["eat", "food", "diet", "nutrition", "deficiency", "low iron", "low calcium", "hemoglobin"].some(w => q.includes(w))) return "nutrition";
    if (["what is", "explain", "spo2", "crp", "lactate", "heart rate"].some(w => q.includes(w))) return "parameters";
    if (["side effect", "risk of", "harm", "problem with"].some(w => q.includes(w))) return "side_effects";
    return "general";
};

export const getVitalsAlerts = (vitals) => {
    if (!vitals) return null;
    let alerts = [];
    if (vitals.heart_rate > 110) alerts.push("Patient's heart rate is elevated (>110 bpm).");
    if (vitals.spo2_pct < 93) alerts.push("Patient's oxygen level (SpO2) is low (<93%).");
    if (vitals.systolic_bp < 90) alerts.push("Patient's blood pressure is low (hypotension).");
    return alerts.length > 0 ? alerts.join(" ") : null;
};

export const generateResponse = (query, vitals) => {
    const q = query.toLowerCase();
    const intent = detectIntent(q);
    let response = "";

    const vitalsAlert = getVitalsAlerts(vitals);
    if (vitalsAlert) {
        response += `⚠️ **Observation:** ${vitalsAlert}\n\n`;
    }

    let found = false;
    for (const category of Object.values(KNOWLEDGE_BASE)) {
        for (const [key, info] of Object.entries(category)) {
            if (q.includes(key)) {
                response += info;
                found = true;
                break;
            }
        }
        if (found) break;
    }

    if (!found) {
        switch (intent) {
            case "medication": response += "General rule: Thyroid/Iron usually before food, Antibiotics/Calcium after food. Always check prescription."; break;
            case "nutrition": response += "Focus on whole foods. For specific deficiencies (like Iron or Calcium), focus on leafy greens and dairy/nuts."; break;
            case "parameters": response += "I can explain SpO2, CRP, and Heart Rate. Which one would you like to know about?"; break;
            case "side_effects": response += "Common side effects include nausea or rash. Consult a doctor for severe reactions."; break;
            default: response += "I am your AI Medical Assistant. I can help with medicine timing, diet, and report explanations. How can I help?";
        }
    }

    return response + "\n\n***\n*Disclaimer: This is general guidance. Please consult a doctor for medical decisions.*";
};
