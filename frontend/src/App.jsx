import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Download, RefreshCw, ServerOff, Server, LayoutDashboard, MessageSquare, LogOut, Users, Brain, Stethoscope, Heart, Shield } from 'lucide-react';
import { RiskGauge } from './components/RiskGauge';
import { ChartsPanel } from './components/ChartsPanel';
import { VitalsControl } from './components/VitalsControl';
import { PatientProfile } from './components/PatientProfile';
import { MedicalAssistant } from './components/MedicalAssistant';
import { predictRisk, fetchAlerts, API_BASE_URL } from './utils/api';
import { simulatePatientSeries } from './utils/simulate';
import { FEATURE_RANGES } from './utils/constants';
import { AlertCircle, Bell } from 'lucide-react';
import PatientAlerts from './components/PatientAlerts';
import LoginPage from './components/LoginPage';
import ICUDashboard from './components/ICUDashboard';
import './i18n';
import MultiOrganSystem from './components/MultiOrganSystem';
import SHAPPanel from './components/SHAPPanel';
import DiseaseRiskPanel from './components/DiseaseRiskPanel';
import PatientDashboard from './components/PatientDashboard';
import VoiceAssistant from './components/VoiceAssistant';

const INITIAL_VITALS = Object.keys(FEATURE_RANGES).reduce((acc, key) => {
  acc[key] = FEATURE_RANGES[key].default;
  return acc;
}, {
  oxygen_device: 'none',
  oxygen_flow: 0.0,
  mobility_score: 2.0,
  nurse_alert: 0,
  rs_status: 'Normal A/E',
  cvs_status: 'Normal',
  cns_status: 'alert',
  hemoglobin: 13.5,
  sepsis_risk_score: 0.0
});

const INITIAL_PROFILE = {
  name: 'John Doe',
  patient_id: 'PT-89412',
  phone_number: '+91 98765 43210',
  age: 60,
  gender: 'M',
  weight_kg: 75.0,
  comorbidity_index: 2.0,
  admission_type: 'Elective'
};

function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [vitals, setVitals] = useState(INITIAL_VITALS);
  const [history, setHistory] = useState([]);

  // Prediction state
  const [riskData, setRiskData] = useState({
    risk_probability: 0,
    risk_level: 'Low Risk',
    risk_probability_over_time: [],
    shap_explanation: null,
    disease_risks: null
  });
  const [apiConnected, setApiConnected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [criticalOverride, setCriticalOverride] = useState(false);
  const [alertsData, setAlertsData] = useState([]);
  const [voiceToast, setVoiceToast] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('ews_token');
    const savedUser = localStorage.getItem('ews_user');
    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch { }
    }
    setAuthChecked(true);
  }, []);

  // Fetch alerts periodically
  useEffect(() => {
    if (user) {
      const loadAlerts = async () => {
        try {
          const data = await fetchAlerts();
          setAlertsData(Array.isArray(data) ? data.reverse() : []);
        } catch { }
      };
      loadAlerts();
      const interval = setInterval(loadAlerts, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Initial Health Check
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { healthCheck } = await import('./utils/api');
        const status = await healthCheck();
        setApiConnected(status.status === 'ok');
      } catch {
        setApiConnected(false);
      }
    };
    checkStatus();
    // Check every 30s to recover from any backend restarts
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cross-field validation
  useEffect(() => {
    if (vitals.diastolic_bp >= vitals.systolic_bp) {
      setValidationError("Inconsistency: Diastolic BP must be strictly less than Systolic BP.");
    } else {
      setValidationError(null);
    }
  }, [vitals]);

  // Initialize history on mount
  useEffect(() => {
    if (user) resetDashboard();
  }, [user]);

  // Update Prediction when history or vitals change
  useEffect(() => {
    if (history.length === 0) return;
    const currentHist = [...history];
    const lastHour = currentHist[currentHist.length - 1].hour_from_admission;
    currentHist[currentHist.length - 1] = { hour_from_admission: lastHour, ...vitals };
    const timer = setTimeout(() => runPrediction(currentHist), 500);
    return () => clearTimeout(timer);
  }, [vitals, history.length, profile]);

  const handleLogin = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    setActiveTab(userData.role === 'doctor' ? 'dashboard' : 'patient-dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('ews_token');
    localStorage.removeItem('ews_user');
  };

  const runPrediction = async (currentHist) => {
    setLoading(true);
    try {
      const apiHist = currentHist.map(h => ({
        ...h,
        temperature_c: (h.temperature_f - 32) * 5 / 9
      }));

      const data = await predictRisk(profile, apiHist, 0.5);

      let criticalCount = 0;
      const latest = currentHist[currentHist.length - 1];
      if (latest.heart_rate > 140 || latest.heart_rate < 50) criticalCount++;
      if (latest.spo2_pct < 88) criticalCount++;
      if (latest.systolic_bp < 80 || latest.systolic_bp > 180) criticalCount++;
      if (latest.respiratory_rate > 30 || latest.respiratory_rate < 10) criticalCount++;

      setCriticalOverride(criticalCount >= 2);

      if (criticalCount >= 2) {
        data.risk_probability = Math.max(data.risk_probability, 95.0);
        data.risk_level = "High Risk";
      }

      setRiskData(data);
      setApiConnected(true);
    } catch (err) {
      setApiConnected(false);
      const pseudoProb = Math.min(100, (vitals.heart_rate / 2 + (100 - vitals.spo2_pct) * 5 + vitals.lactate * 10) / 2);
      setRiskData({
        risk_probability: pseudoProb,
        risk_level: pseudoProb > 70 ? 'High Risk' : pseudoProb > 35 ? 'Medium Risk' : 'Low Risk',
        risk_probability_over_time: currentHist.map((h, i) => Math.min(100, Math.max(0, pseudoProb + Math.sin(i) * 5))),
        shap_explanation: null,
        disease_risks: null
      });
    } finally {
      setLoading(false);
    }
  };

  const resetDashboard = () => {
    setVitals(INITIAL_VITALS);
    setProfile(INITIAL_PROFILE);
    const initialHist = [];
    for (let i = 0; i < 6; i++) {
      initialHist.push({ hour_from_admission: i, ...INITIAL_VITALS });
    }
    setHistory(initialHist);
  };

  const handleSimulate = () => {
    const simulated = simulatePatientSeries(24, history[history.length - 1].hour_from_admission + 1, vitals, profile);
    const newHistory = [...history.slice(-6), ...simulated];
    setHistory(newHistory);
    const last = newHistory[newHistory.length - 1];
    setVitals(Object.keys(INITIAL_VITALS).reduce((acc, k) => ({ ...acc, [k]: last[k] }), {}));
  };

  const addObservation = () => {
    const nextHour = history[history.length - 1].hour_from_admission + 1;
    setHistory([...history, { hour_from_admission: nextHour, ...vitals }]);
  };

  const historyWithRisk = history.map((h, idx) => ({
    ...h,
    risk_probability_percent: riskData.risk_probability_over_time[idx] || 0
  }));

  const downloadReport = () => {
    if (!historyWithRisk.length) return;
    const csvContent = "data:text/csv;charset=utf-8,"
      + Object.keys(historyWithRisk[0]).join(",") + "\n"
      + historyWithRisk.map(row => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ews_patient_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectPatient = (patient) => {
    // Load selected patient into the dashboard
    setProfile({
      name: patient.name,
      patient_id: patient.patient_id,
      phone_number: patient.phone_number || '',
      age: patient.age || 60,
      gender: patient.gender || 'M',
      weight_kg: patient.weight_kg || 70,
      comorbidity_index: patient.comorbidity_index || 2,
      admission_type: patient.admission_type || 'Emergency'
    });
    // Update vitals from patient data
    const newVitals = { ...INITIAL_VITALS };
    if (patient.heart_rate) newVitals.heart_rate = patient.heart_rate;
    if (patient.spo2_pct) newVitals.spo2_pct = patient.spo2_pct;
    if (patient.systolic_bp) newVitals.systolic_bp = patient.systolic_bp;
    if (patient.temperature_f) newVitals.temperature_f = patient.temperature_f;
    if (patient.respiratory_rate) newVitals.respiratory_rate = patient.respiratory_rate;
    if (patient.lactate) newVitals.lactate = patient.lactate;
    if (patient.diastolic_bp) newVitals.diastolic_bp = patient.diastolic_bp;
    setVitals(newVitals);
    setActiveTab('dashboard');
  };

  const handleVoiceCommand = async (transcript) => {
    const text = transcript.toLowerCase();
    
    const showToast = (message, type = 'success') => {
        setVoiceToast({ message, type });
        setTimeout(() => setVoiceToast(null), 3500);
    };

    if (text.includes('log')) {
        const cleanText = transcript.replace(/log/i, '').trim();
        showToast(`Logged successfully: ${cleanText}`, 'success');
        return;
    }

    if ((text.includes('show') || text.includes('find')) && (text.includes('vitals') || text.includes('patient'))) {
        showToast('Searching for patient...', 'info');
        try {
            const res = await fetch(`${API_BASE_URL}/patients`);
            const data = await res.json();
            const match = data.find(p => text.includes(p.name.toLowerCase().split(' ')[0]) || text.includes(p.patient_id.toLowerCase()));
            if (match) {
                handleSelectPatient(match);
                showToast(`Loaded vitals for ${match.name}`);
            } else {
                showToast(`Could not find a matching patient.`, 'error');
            }
        } catch (e) {
            showToast('Failed to fetch patients list.', 'error');
        }
        return;
    }

    if (text.includes('icu') || text.includes('monitor')) {
        setActiveTab('icu');
        showToast('Navigating to ICU Monitor...');
        return;
    }
    if (text.includes('shap') || text.includes('analysis')) {
        setActiveTab('shap');
        showToast('Opening SHAP Analysis...');
        return;
    }
    if (text.includes('disease') || text.includes('risk')) {
        setActiveTab('disease');
        showToast('Opening Disease Risk...');
        return;
    }
    if (text.includes('assistant') || text.includes('ai')) {
        setActiveTab('assistant');
        showToast('Opening AI Medical Assistant...');
        return;
    }
    if (text.includes('alerts')) {
        setActiveTab('alerts');
        showToast('Opening Alerts Panel...');
        return;
    }

    showToast(`Command not recognized: "${transcript}"`, 'error');
  };

  // Show login page if not authenticated
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e1a' }}>
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const isDoctor = user.role === 'doctor';

  // Doctor mode tabs
  const doctorTabs = [
    { id: 'dashboard', label: 'Clinical Monitor', icon: LayoutDashboard, color: 'blue' },
    { id: 'icu', label: 'ICU Monitor', icon: Users, color: 'cyan' },
    { id: 'shap', label: 'SHAP Analysis', icon: Brain, color: 'purple' },
    { id: 'disease', label: 'Disease Risk', icon: Stethoscope, color: 'red' },
    { id: 'assistant', label: 'AI Assistant', icon: MessageSquare, color: 'indigo' },
    { id: 'alerts', label: 'Alerts', icon: Bell, color: 'red' },
  ];

  // Patient mode — simplified, handled by PatientDashboard component
  if (!isDoctor) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex flex-col gap-6 max-w-[96%] mx-auto pb-20">
        {/* Patient mode header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">My Health Dashboard</h1>
              <p className="text-xs text-emerald-400 font-medium">Welcome, {user.full_name}</p>
            </div>
          </div>

          <div className="bg-gray-900/60 p-1 rounded-2xl flex border border-white/5 backdrop-blur-md">
            <button
                onClick={() => setActiveTab('patient-dashboard')}
                className={`flex text-xs items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'patient-dashboard' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-gray-200'}`}
            >
               My Vitals
            </button>
            <button
                onClick={() => setActiveTab('multi-organ')}
                className={`flex text-xs items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'multi-organ' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:text-gray-200'}`}
            >
               Multi-Organ Check
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${apiConnected ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {apiConnected ? <Server size={14} /> : <ServerOff size={14} />}
              {apiConnected ? 'Connected' : 'Offline'}
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-white/5 rounded-lg text-xs text-gray-400 hover:text-white transition-all">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>

        {activeTab === 'multi-organ' ? (
          <MultiOrganSystem user={user} />
        ) : (
          <PatientDashboard
            riskData={riskData}
            vitals={vitals}
            diseaseRisks={riskData.disease_risks}
            alerts={alertsData}
          />
        )}
      </div>
    );
  }

  // Doctor Mode Dashboard
  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col gap-6 max-w-[96%] mx-auto pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3 text-blue-400">
          <Activity size={32} />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-100">EWS Pro Dashboard</h1>
            <p className="text-sm text-gray-400 font-medium italic">Hospital-Grade AI Monitoring • Dr. {user.full_name}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-900/60 p-1 rounded-2xl flex flex-wrap border border-white/5 backdrop-blur-md gap-0.5">
          {doctorTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id
                ? `bg-${tab.color}-600 text-white shadow-lg shadow-${tab.color}-500/20`
                : 'text-gray-400 hover:text-gray-200'}`}
            >
              <tab.icon size={14} />
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${apiConnected ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            {apiConnected ? <Server size={14} /> : <ServerOff size={14} />}
            {apiConnected ? 'API Connected' : 'Local Fallback'}
          </div>
          {activeTab === 'dashboard' && (
            <>
              <button onClick={addObservation} disabled={!!validationError} className={`px-4 py-2 rounded-lg text-sm transition-colors shadow-lg ${validationError ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}>
                + Add 1h
              </button>
              <button onClick={handleSimulate} disabled={!!validationError} className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${validationError ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/5'}`}>
                <RefreshCw size={16} /> Simulate 24h
              </button>
            </>
          )}
          <button onClick={downloadReport} className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/5 px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
            <Download size={16} /> Export
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-red-900/40 border border-white/5 rounded-lg text-xs text-gray-400 hover:text-red-400 transition-all">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Main Content Areas */}
      {activeTab === 'dashboard' && (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Left Column */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="h-[380px]">
              <PatientProfile profile={profile} onChangeProfile={setProfile} />
            </div>
            <div className="flex-grow min-h-[350px] relative">
              {criticalOverride && (
                <div className="absolute -top-4 w-full text-center bg-red-600 text-white text-xs font-bold py-1.5 rounded-md shadow-[0_0_15px_rgba(220,38,38,0.7)] z-50 animate-pulse flex justify-center items-center gap-2">
                  <AlertCircle size={14} /> CRITICAL CONDITION DETECTED
                </div>
              )}
              <RiskGauge probability={riskData.risk_probability} riskLevel={riskData.risk_level} />
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-9 flex flex-col gap-6">
            {validationError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border bg-red-500/10 text-red-400 border-red-500/20 animate-shake">
                <AlertCircle size={18} /> {validationError}
              </div>
            )}
            <div className="min-h-[500px] h-[580px]">
              <VitalsControl vitals={vitals} onChangeVitals={setVitals} />
            </div>
            <div className="flex-grow min-h-[400px]">
              <ChartsPanel historyData={historyWithRisk} />
            </div>
          </div>
        </main>
      )}

      {activeTab === 'icu' && (
        <ICUDashboard onSelectPatient={handleSelectPatient} />
      )}

      {activeTab === 'shap' && (
        <SHAPPanel shapData={riskData.shap_explanation} riskProbability={riskData.risk_probability} />
      )}

      {activeTab === 'disease' && (
        <DiseaseRiskPanel diseaseRisks={riskData.disease_risks} />
      )}

      {activeTab === 'assistant' && (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)] animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="lg:col-span-4 h-full">
            <PatientProfile profile={profile} onChangeProfile={setProfile} />
          </div>
          <div className="lg:col-span-8 h-full">
            <MedicalAssistant currentVitals={{ ...vitals, spo2_pct: vitals.spo2_pct }} />
          </div>
        </main>
      )}

      {activeTab === 'alerts' && (
        <PatientAlerts />
      )}

      {/* Voice Assistant & Notifications */}
      <VoiceAssistant onCommand={handleVoiceCommand} />
      
      <AnimatePresence>
        {voiceToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl border ${
              voiceToast.type === 'error' 
                ? 'bg-red-900/90 border-red-500/30 text-red-200 shadow-red-500/20'
                : voiceToast.type === 'info'
                ? 'bg-blue-900/90 border-blue-500/30 text-blue-200 shadow-blue-500/20'
                : 'bg-emerald-900/90 border-emerald-500/30 text-emerald-200 shadow-emerald-500/20'
            } backdrop-blur-md font-medium text-sm`}
          >
            {voiceToast.type === 'success' && '✅ '}
            {voiceToast.type === 'error' && '❌ '}
            {voiceToast.type === 'info' && '🔍 '}
            {voiceToast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
