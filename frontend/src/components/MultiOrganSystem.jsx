import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, UploadCloud, HeartPulse, BrainCircuit, Activity, CheckCircle, AlertTriangle, ShieldAlert, Volume2, Square, Plus } from 'lucide-react';

const MultiOrganSystem = ({ user }) => {
  const { t, i18n } = useTranslation();
  
  // Form State
  const [formData, setFormData] = useState({ age: '', bloodPressure: '', sugarLevel: '', symptoms: '' });
  
  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  
  // Result State
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  // Voice Output State
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };
  
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    // Set language based on selected UI language
    if (i18n.language === 'hi') recognition.lang = 'hi-IN';
    else if (i18n.language === 'mr') recognition.lang = 'mr-IN';
    else recognition.lang = 'en-IN';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      let finalTrans = '';
      for (let i = 0; i < event.results.length; ++i) {
        finalTrans += event.results[i][0].transcript;
      }
      setFormData(prev => ({ ...prev, symptoms: finalTrans }));
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const speakResults = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!results) return;

    let textToSpeak = `${t('results_summary')} `;
    const mapKeys = [
      { key: 'heart', label: t('heart_status') },
      { key: 'brain', label: t('brain_status') },
      { key: 'lungs', label: t('lungs_status') },
      { key: 'liver', label: t('liver_status') },
      { key: 'kidney', label: t('kidney_status') },
    ];

    mapKeys.forEach(m => {
      // In a real app we'd translate the exact risk string too
      const riskMapping = {
        'High Risk': t('high_risk'),
        'Moderate Risk': t('moderate_risk'),
        'Normal': t('normal')
      };
      textToSpeak += `${m.label}, ${riskMapping[results[m.key]]}. `;
    });

    if (Object.values(results).includes('High Risk')) {
      textToSpeak += t('alert_high_risk');
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (i18n.language === 'hi') utterance.lang = 'hi-IN';
    else if (i18n.language === 'mr') utterance.lang = 'mr-IN';
    else utterance.lang = 'en-IN';

    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  const evaluateHealth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/multi-organ-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: parseFloat(formData.age),
          blood_pressure: parseFloat(formData.bloodPressure),
          sugar_level: parseFloat(formData.sugarLevel),
          symptoms: formData.symptoms,
          patient_name: user?.full_name || "Unknown Patient",
          phone_number: user?.phone || ""
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch risk analysis');
      }

      const backendResults = await response.json();
      setResults(backendResults);
    } catch (error) {
      console.error("Analysis Error:", error);
      alert("Error reaching the AI backend. Please make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    if (risk === 'High Risk') return 'from-red-600 to-rose-500 text-white shadow-red-500/30';
    if (risk === 'Moderate Risk') return 'from-yellow-500 to-orange-500 text-white shadow-orange-500/30';
    return 'from-emerald-500 to-teal-500 text-white shadow-emerald-500/30';
  };

  const hasHighRisk = results && Object.values(results).includes('High Risk');

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Header & Language Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900 border border-white/10 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <Activity className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">{t('multi_organ_system')}</h1>
            <p className="text-sm text-gray-400 mt-1">{t('multi_organ_desc')}</p>
          </div>
        </div>
        
        <select 
          onChange={handleLanguageChange} 
          value={i18n.language}
          className="bg-gray-800 border-2 border-indigo-500/30 text-white text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी (Hindi)</option>
          <option value="mr">मराठी (Marathi)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Input Form Column */}
        <div className="bg-gray-900 border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          
          <form onSubmit={evaluateHealth} className="flex flex-col gap-4 relative z-10">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">{t('age')}</label>
                <input type="number" required value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all placeholder-gray-600" placeholder="e.g. 45" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">{t('blood_pressure')}</label>
                <input type="number" required value={formData.bloodPressure} onChange={e => setFormData({...formData, bloodPressure: e.target.value})} className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all placeholder-gray-600" placeholder="e.g. 120" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">{t('sugar_level')}</label>
              <input type="number" required value={formData.sugarLevel} onChange={e => setFormData({...formData, sugarLevel: e.target.value})} className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all placeholder-gray-600" placeholder="e.g. 110" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1 flex justify-between items-center">
                {t('symptoms')}
              </label>
              <div className="relative">
                <textarea 
                  value={formData.symptoms} 
                  onChange={e => setFormData({...formData, symptoms: e.target.value})} 
                  className="w-full bg-gray-800 border border-white/10 rounded-xl pl-4 pr-14 py-3 text-white focus:border-indigo-500 outline-none transition-all placeholder-gray-600 min-h-[100px] resize-none" 
                  placeholder={t('symptoms_placeholder')}
                ></textarea>
                <button 
                  type="button" 
                  onClick={handleVoiceInput}
                  className={`absolute right-2 bottom-3 p-2 rounded-lg transition-all ${isListening ? 'bg-indigo-600 text-white animate-pulse shadow-lg shadow-indigo-500/30' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  {isListening ? <Mic className="animate-bounce" size={18} /> : <Mic size={18} />}
                </button>
              </div>
              {isListening && <p className="text-xs text-indigo-400 mt-2 ml-1 font-medium">{t('listening')}</p>}
            </div>

            {/* X-Ray Dropzone */}
            <div className="mt-2 border-2 border-dashed border-gray-700 hover:border-indigo-500/50 bg-gray-800/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group">
              <UploadCloud className="text-gray-500 group-hover:text-indigo-400 transition-colors" size={32} />
              <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300">{t('upload_xray')}</p>
            </div>

            <button disabled={loading} type="submit" className="mt-4 w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex justify-center items-center gap-2">
              {loading ? <Activity className="animate-spin" /> : <Plus size={20} />}
              {t('evaluate_health')}
            </button>
          </form>
        </div>

        {/* Results Column */}
        <div className="flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {!results && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center bg-gray-900/50 border border-white/5 border-dashed rounded-3xl p-8 text-center text-gray-500 gap-4">
                <BrainCircuit size={48} className="opacity-40" />
                <p>Fill out the form and evaluate symptoms to see AI health insights here.</p>
              </motion.div>
            )}

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center bg-gray-900/50 border border-white/5 rounded-3xl p-8 text-center text-indigo-400 gap-4">
                <Activity size={48} className="animate-spin" />
                <p className="font-medium animate-pulse">Running AI diagnostic models...</p>
              </motion.div>
            )}

            {results && !loading && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
                
                {hasHighRisk && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-red-500/10 animate-shake relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                    <ShieldAlert size={28} className="shrink-0" />
                    <p className="text-sm font-bold leading-tight">{t('alert_high_risk')}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'heart', label: t('heart_status'), icon: HeartPulse },
                    { key: 'brain', label: t('brain_status'), icon: BrainCircuit },
                    { key: 'lungs', label: t('lungs_status'), icon: Activity },
                    { key: 'liver', label: t('liver_status'), icon: ShieldAlert },
                    { key: 'kidney', label: t('kidney_status'), icon: ShieldAlert },
                  ].map((org, i) => (
                    <div key={org.key} className={`bg-gradient-to-br ${getRiskColor(results[org.key])} p-5 rounded-2xl flex flex-col gap-3 shadow-lg border border-white/10 opacity-90 hover:opacity-100 transition-opacity`}>
                       <div className="flex items-center gap-2">
                         <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm"><org.icon size={18} /></div>
                         <h3 className="font-bold text-sm tracking-wide">{org.label}</h3>
                       </div>
                       <div className="bg-black/20 px-3 py-1.5 rounded-lg w-max backdrop-blur-sm border border-black/10 text-sm font-semibold">
                         {t(results[org.key].toLowerCase().replace(' ', '_'))}
                       </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={speakResults}
                  className={`w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 border shadow-lg transition-all
                    ${isSpeaking 
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 hover:bg-rose-500/30' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'}`
                  }
                >
                  {isSpeaking ? (
                    <><Square size={18} className="fill-current" /> {t('stop_speaking')}</>
                  ) : (
                    <><Volume2 size={20} /> {t('speak_result')}</>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default MultiOrganSystem;
