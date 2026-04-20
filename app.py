import streamlit as st
import requests
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import numpy as np
import time
# from chatbot import MedicalChatbot # Removed as per React migration

# --- Layout & Styling ---
st.set_page_config(page_title="ICU Monitor | EWS", page_icon="🫀", layout="wide")

# Custom CSS for Dark Theme, Cards, and Alerts 🚨
st.markdown("""
<style>
    /* Dark Theme & Card Styling */
    .stApp {
        background-color: #0d1117;
        color: #e6edf3;
    }
    
    .card {
        background-color: #161b22;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        margin-bottom: 20px;
        border: 1px solid #30363d;
        transition: transform 0.2s;
    }
    .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.5);
    }
    
    .metric-value {
        font-size: 2rem;
        font-weight: bold;
        color: #58a6ff;
    }
    
    .metric-label {
        font-size: 0.9rem;
        color: #8b949e;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    
    /* Custom Alerts */
    .alert-box {
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 10px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: fadeIn 0.5s ease-in;
    }
    
    .alert-high { background-color: rgba(248, 81, 73, 0.15); border-left: 4px solid #f85149; color: #ff7b72; }
    .alert-med { background-color: rgba(210, 153, 34, 0.15); border-left: 4px solid #d29922; color: #e3b341; }
    .alert-low { background-color: rgba(46, 160, 67, 0.15); border-left: 4px solid #2ea043; color: #56d364; }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    /* Customize Streamlit Expander & Sliders */
    .stSlider > div[data-baseweb="slider"] > div > div { background-color: #58a6ff; }

    /* Chat Styling */
    .chat-container {
        border-radius: 15px;
        padding: 15px;
        margin-bottom: 10px;
    }
</style>
""", unsafe_allow_html=True)

API_URL = "http://localhost:8000"

# --- Baseline Ranges for Simulation & Sliders ---
FEATURE_RANGES = {
    "weight_kg": {"min": 30.0, "max": 250.0, "normal": "50–100 kg", "default": 70.0},
    "heart_rate": {"min": 40.0, "max": 180.0, "normal": "60–100 bpm", "default": 75.0},
    "respiratory_rate": {"min": 8.0, "max": 40.0, "normal": "12–20 rpm", "default": 16.0},
    "spo2_pct": {"min": 70.0, "max": 100.0, "normal": "95–100 %", "default": 98.0},
    "temperature_c": {"min": 34.0, "max": 42.0, "normal": "36.5–37.5 °C", "default": 37.0},
    "systolic_bp": {"min": 70.0, "max": 200.0, "normal": "90–120 mmHg", "default": 120.0},
    "diastolic_bp": {"min": 40.0, "max": 120.0, "normal": "60–80 mmHg", "default": 80.0},
    "wbc_count": {"min": 1.0, "max": 30.0, "normal": "4.5–11.0 k/µL", "default": 7.5},
    "lactate": {"min": 0.2, "max": 10.0, "normal": "0.5–1.0 mmol/L", "default": 1.0},
    "creatinine": {"min": 0.3, "max": 10.0, "normal": "0.7–1.3 mg/dL", "default": 0.9},
    "crp_level": {"min": 0.0, "max": 300.0, "normal": "0–10 mg/L", "default": 3.0},
    "platelets": {"min": 10.0, "max": 1000.0, "normal": "150–450 k/µL", "default": 250.0},
    "calcium_level": {"min": 5.0, "max": 15.0, "normal": "8.5–10.2 mg/dL", "default": 9.5},
    "iron_level": {"min": 10.0, "max": 300.0, "normal": "60–170 µg/dL", "default": 100.0},
    "cholesterol": {"min": 100.0, "max": 400.0, "normal": "< 200 mg/dL", "default": 150.0},
    "cortisol": {"min": 1.0, "max": 50.0, "normal": "5–25 µg/dL", "default": 15.0},
    "esr": {"min": 0.0, "max": 100.0, "normal": "0–20 mm/hr", "default": 10.0},
    "urine_routine": {"min": 0.0, "max": 2.0, "normal": "0 (Normal)", "default": 0.0},
    "t3": {"min": 50.0, "max": 300.0, "normal": "80–200 ng/dL", "default": 120.0},
    "t4": {"min": 2.0, "max": 20.0, "normal": "5–12 µg/dL", "default": 8.0},
    "tsh": {"min": 0.1, "max": 10.0, "normal": "0.4–4.0 mIU/L", "default": 2.0},
}


def init_state():
    if "history" not in st.session_state:
        st.session_state.history = []
    if "current_hour" not in st.session_state:
        st.session_state.current_hour = 0
    if "risk_history" not in st.session_state:
        st.session_state.risk_history = []
    if "top_factors" not in st.session_state:
        st.session_state.top_factors = []
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []
# if "chatbot" not in st.session_state:
#     st.session_state.chatbot = MedicalChatbot()


init_state()


def simulate_patient_timeline(hours: int = 24):
    """Simulate realistic patient deterioration using Gaussian noise and random walks"""
    st.session_state.history = []
    st.session_state.risk_history = []
    
    # Starting base vitals
    current_vitals = {k: v["default"] for k, v in FEATURE_RANGES.items()}
    
    # Randomly decide if patient will deteriorate
    deteriorate = np.random.choice([True, False], p=[0.7, 0.3])

    with st.spinner(f"Simulating {hours}-hour Patient Timeline..."):
        for h in range(1, hours + 1):
            measurement = {"hour_from_admission": float(h)}
            for k, limits in FEATURE_RANGES.items():
                low = limits["min"]
                high = limits["max"]
                base = limits["default"]
                noise = np.random.normal(0, (high-low)*0.02)
                
                if deteriorate and h > hours // 2:
                    if k in ["heart_rate", "respiratory_rate", "lactate", "crp_level", "wbc_count"]:
                        current_vitals[k] += np.random.normal((high-low)*0.01, (high-low)*0.005)
                    if k in ["spo2_pct", "systolic_bp", "diastolic_bp"]:
                        current_vitals[k] -= np.random.normal((high-low)*0.01, (high-low)*0.005)
                else:
                    current_vitals[k] += noise
                    
                val = np.clip(current_vitals[k], low, high)
                measurement[k] = round(float(val), 2)
                
            measurement["oxygen_device"] = "nasal_cannula" if measurement["spo2_pct"] < 94 else "room_air"
            measurement["rs_status"] = "Wheezing" if measurement["respiratory_rate"] > 24 else "Normal A/E"
            measurement["cvs_status"] = "Normal"
            measurement["cns_status"] = "drowsy" if measurement["spo2_pct"] < 90 else "alert"
            
            st.session_state.history.append(measurement)
            st.session_state.current_hour = h
            
            # Request Prediction
            try:
                payload = {
                    "profile": {
                        "age": st.session_state.get('profile_age', 65),
                        "gender": st.session_state.get('profile_gender', 'Male'),
                        "phone_number": st.session_state.get('profile_phone', ''),
                        "comorbidity_index": st.session_state.get('profile_comor', 3),
                        "admission_type": "emergency"
                    },
                    "history": st.session_state.history,
                    "threshold": 0.5
                }
                res = requests.post(f"{API_URL}/predict", json=payload)
                if res.status_code == 200:
                    data = res.json()
                    st.session_state.risk_history.append(data["risk_probability"])
                    st.session_state.top_factors = data.get("top_factors", [])
            except requests.exceptions.ConnectionError:
                st.error("Cannot connect to FastAPI Backend. Is it running?")
                break
            
            time.sleep(0.05) # UX delay to see it loading


# --- Navigation Sidebar ---
with st.sidebar:
    st.markdown("<h1 style='text-align:center; color: #58a6ff;'>🏥 EWS Pro</h1>", unsafe_allow_html=True)
    page = st.radio("Navigation", ["📊 Clinical Dashboard", "🤖 AI Medical Assistant"], index=0)
    
    st.markdown("---")
    st.markdown("### 👤 Patient Profile")
    st.number_input("Age", min_value=0, max_value=100, value=65, key='profile_age')
    st.selectbox("Gender", ["Male", "Female"], key='profile_gender')
    st.text_input("Phone Number", value="+91 98765 43210", key='profile_phone')
    st.slider("Comorbidity Index", 0, 10, 3, key='profile_comor')
    
    st.markdown("---")
    if page == "📊 Clinical Dashboard":
        st.markdown("### 🧬 Simulation Engine")
        if st.button("▶️ Simulate 24h Timeline", use_container_width=True):
            simulate_patient_timeline(24)
            
        if st.button("🗑️ Reset Data", use_container_width=True):
            init_state()
            st.session_state.history = []
            st.session_state.risk_history = []
            st.rerun()

# --- Page Routing ---

if page == "📊 Clinical Dashboard":
    st.title("Clinical Monitoring Dashboard")
    st.markdown("##### Real-Time ICU Physiological Deterioration Monitor")

    tabs = st.tabs(["📊 Real-Time Monitor", "📈 Timeline & Trends", "🧠 Explainable AI"])

    # Current data
    current_data = st.session_state.history[-1] if st.session_state.history else {}
    current_risk = st.session_state.risk_history[-1] if st.session_state.risk_history else 0.0

    with tabs[0]:
        col1, col2 = st.columns([2, 1])
        
        with col1:
            st.markdown("<div class='card'>", unsafe_allow_html=True)
            st.markdown("### 🫀 Vital Signs Input", unsafe_allow_html=True)
            
            # Grid layout for inputs
            v_cols = st.columns(3)
            vitals_input = {}
            feature_keys = list(FEATURE_RANGES.keys())
            
            for idx in range(7): # First 7 are core vitals
                k = feature_keys[idx]
                lims = FEATURE_RANGES[k]
                with v_cols[idx % 3]:
                    val = current_data.get(k, lims["default"])
                    vitals_input[k] = st.slider(
                        f"{k.replace('_', ' ').title()} ({lims['normal']})", 
                        min_value=float(lims["min"]), max_value=float(lims["max"]), value=float(val),
                        step=0.1 if (lims['max'] - lims['min']) < 50 else 1.0,
                        key=f"input_{k}"
                    )
                
            with st.expander("🧪 Extended Labs & Clinical Markers", expanded=True):
                l_cols = st.columns(3)
                for idx in range(7, 18):
                    k = feature_keys[idx]
                    lims = FEATURE_RANGES[k]
                    with l_cols[(idx-7) % 3]:
                        val = current_data.get(k, lims["default"])
                        vitals_input[k] = st.slider(
                            f"{k.replace('_', ' ').title()} ({lims['normal']})", 
                            min_value=float(lims["min"]), max_value=float(lims["max"]), value=float(val),
                            step=0.1 if (lims['max'] - lims['min']) < 50 else 1.0,
                            key=f"input_{k}"
                        )
                    
            with st.expander("🦋 Thyroid & Systems Profile", expanded=True):
                t_cols = st.columns(3)
                for idx in range(18, 21):
                    k = feature_keys[idx]
                    lims = FEATURE_RANGES[k]
                    with t_cols[(idx-18) % 3]:
                        val = current_data.get(k, lims["default"])
                        vitals_input[k] = st.slider(
                            f"{k.upper()} ({lims['normal']})", 
                            min_value=float(lims["min"]), max_value=float(lims["max"]), value=float(val),
                            step=0.1,
                            key=f"input_{k}"
                        )
                        
                sys_col1, sys_col2, sys_col3 = st.columns(3)
                vitals_input["rs_status"] = sys_col1.selectbox("Respiratory (A/E)", ["Normal A/E", "Wheezing", "Decreased A/E", "Crackles"], index=0)
                vitals_input["cvs_status"] = sys_col2.selectbox("Cardiovascular", ["Normal", "Murmur", "Irregular"], index=0)
                vitals_input["cns_status"] = sys_col3.selectbox("CNS Status", ["alert", "drowsy", "unconscious"], index=0)
                
            validation_error = False
            if vitals_input.get("diastolic_bp", 80) >= vitals_input.get("systolic_bp", 120):
                st.error("⚠️ **Inconsistency:** Diastolic BP >= Systolic BP.")
                validation_error = True
            if vitals_input.get("spo2_pct", 100) < 70:
                st.error("❌ **Invalid SpO2:** Must be above 70%.")
                validation_error = True

            calc_btn = st.button("➕ Add Reading & Calculate Risk", disabled=validation_error, use_container_width=True)
            
            if calc_btn and not validation_error:
                st.session_state.current_hour += 1
                vitals_input["hour_from_admission"] = float(st.session_state.current_hour)
                st.session_state.history.append(vitals_input)
                
                try:
                    payload = {
                        "profile": {
                            "age": st.session_state.get('profile_age'),
                            "gender": st.session_state.get('profile_gender'),
                            "phone_number": st.session_state.get('profile_phone'),
                            "comorbidity_index": st.session_state.get('profile_comor'),
                            "admission_type": "emergency",
                            "weight": vitals_input.get("weight_kg", 70.0)
                        },
                        "history": st.session_state.history,
                        "threshold": 0.5
                    }
                    res = requests.post(f"{API_URL}/predict", json=payload).json()
                    
                    critical_count = 0
                    if vitals_input.get("heart_rate") > 140 or vitals_input.get("heart_rate") < 50: critical_count += 1
                    if vitals_input.get("spo2_pct") < 88: critical_count += 1
                    if vitals_input.get("systolic_bp") < 80 or vitals_input.get("systolic_bp") > 180: critical_count += 1
                    
                    final_risk = res["risk_probability"]
                    if critical_count >= 2: final_risk = max(final_risk, 90.0)
                        
                    st.session_state.risk_history.append(final_risk)
                    st.session_state.top_factors = res.get("top_factors", [])
                    st.rerun()
                except:
                    st.error("Failed to connect to backend")

            st.markdown("</div>", unsafe_allow_html=True)
            
        with col2:
            st.markdown("<div class='card'>", unsafe_allow_html=True)
            st.markdown("<h3 style='text-align:center;'>Deterioration Risk</h3>", unsafe_allow_html=True)
            
            fig = go.Figure(go.Indicator(
                mode = "gauge+number",
                value = current_risk,
                number = {'suffix': "%", 'font': {'color': '#e6edf3', 'size': 40}},
                domain = {'x': [0, 1], 'y': [0, 1]},
                gauge = {
                    'axis': {'range': [None, 100], 'tickwidth': 1, 'tickcolor': "#e6edf3"},
                    'bar': {'color': "rgba(0,0,0,0)"},
                    'steps': [
                        {'range': [0, 35], 'color': "rgba(46, 160, 67, 0.8)"},
                        {'range': [35, 70], 'color': "rgba(210, 153, 34, 0.8)"},
                        {'range': [70, 100], 'color': "rgba(248, 81, 73, 0.8)"}
                    ],
                    'threshold': {'line': {'color': "white", 'width': 4}, 'thickness': 0.75, 'value': current_risk}
                }
            ))
            fig.update_layout(height=250, margin=dict(l=20, r=20, t=30, b=20), paper_bgcolor="rgba(0,0,0,0)", font={'color': "#e6edf3"})
            st.plotly_chart(fig, use_container_width=True)
            
            st.markdown("### 🚨 Smart Alerts")
            alerts = []
            if current_risk > 70:
                alerts.append(("<i class='fa fa-exclamation-triangle'></i> <b>CRITICAL:</b> ML Model predicts high risk.", "high"))
            elif current_risk > 35:
                alerts.append(("<i class='fa fa-exclamation-triangle'></i> <b>WARNING:</b> ML Model predicts medium risk.", "med"))
                
            if current_data.get("heart_rate", 0) > 120 or current_data.get("heart_rate", 100) < 50: alerts.append(("<b>Heart Rate Alert:</b> Abnormal HR", "high"))
            if current_data.get("spo2_pct", 100) < 92: alerts.append(("<b>Oxygen Risk Alert:</b> SpO2 dropped below 92%", "high"))
                
            if not alerts:
                st.markdown("<div class='alert-box alert-low'>✅ All parameters stable.</div>", unsafe_allow_html=True)
            else:
                for msg, level in alerts:
                    st.markdown(f"<div class='alert-box alert-{level}'>{msg}</div>", unsafe_allow_html=True)
            st.markdown("</div>", unsafe_allow_html=True)


    with tabs[1]:
        if not st.session_state.history:
            st.info("No timeline data yet.")
        else:
            st.markdown("### 📈 Risk & Vitals Trends")
            risk_df = pd.DataFrame({"Hour": [d["hour_from_admission"] for d in st.session_state.history], "Risk (%)": st.session_state.risk_history})
            fig_risk = px.line(risk_df, x="Hour", y="Risk (%)", markers=True)
            fig_risk.update_layout(template="plotly_dark", plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)", height=300)
            st.plotly_chart(fig_risk, use_container_width=True)

        st.markdown("</div>", unsafe_allow_html=True)

elif page == "🤖 AI Medical Assistant":
    st.title("🤖 AI Medical Assistant")
    st.markdown("##### Your personal healthcare guide for medications, diet, and report explanations.")

    # Main Chat Interface
    chat_col, quick_col = st.columns([3, 1])

    with chat_col:
        st.markdown("<div class='card'>", unsafe_allow_html=True)
        
        # Display chat history
        for message in st.session_state.chat_history:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

        # Chat Input
        if prompt := st.chat_input("Ask about medications, diet, or medical tests..."):
            st.session_state.chat_history.append({"role": "user", "content": prompt})
            with st.chat_message("user"):
                st.markdown(prompt)

            # Generate Response
            # current_vitals = st.session_state.history[-1] if st.session_state.history else None
            # response = st.session_state.chatbot.get_response(prompt, patient_vitals=current_vitals)
            response = "The Medical Assistant has been moved to the React Frontend. Please use the 'Medical Assistant' tab in the React app for a better experience."
            
            with st.chat_message("assistant"):
                st.markdown(response)
            st.session_state.chat_history.append({"role": "assistant", "content": response})
        st.markdown("</div>", unsafe_allow_html=True)

    with quick_col:
        st.markdown("### ⚡ Quick Actions")
        if st.button("🍎 Diet Advice", use_container_width=True):
            st.info("Ask: 'What to eat for low iron?' or 'Diet for low hemoglobin'")
        if st.button("💊 Medicine Timing", use_container_width=True):
            st.info("Ask: 'When to take thyroid medicine?' or 'Paracetamol before food?'")
        if st.button("📄 Explain My Report", use_container_width=True):
            st.info("Ask: 'What is SpO2?' or 'Explain CRP level'")
        
        st.markdown("---")
        st.markdown("### 🩺 Contextual Check")
        if st.session_state.history:
            latest = st.session_state.history[-1]
            if latest.get("spo2_pct", 100) < 94:
                st.warning(f"**Oxygen Alert:** SpO2 is {latest['spo2_pct']}%. Consult doctor.")
            if latest.get("heart_rate", 75) > 100:
                st.warning(f"**HR Alert:** Heart rate is {latest['heart_rate']} bpm.")
            else:
                st.success("Current vitals are being used for chat context.")
        else:
            st.info("Input patient data to get personalized health advice.")

    # Safety Footer
    st.markdown("---")
    st.caption("⚠️ **Disclaimer:** This assistant provides general information only. Always seek professional medical advice for clinical decisions.")

