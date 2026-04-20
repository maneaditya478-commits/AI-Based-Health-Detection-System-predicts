import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Heart, Thermometer, Wind, Droplet, Shield, ShieldCheck, AlertTriangle, AlertCircle, MessageSquare, Bell, User, Stethoscope, Brain, Zap } from 'lucide-react';
import { MedicalAssistant } from './MedicalAssistant';

const PatientDashboard = ({ riskData, vitals, diseaseRisks, alerts }) => {
    const [activeSection, setActiveSection] = useState('overview');

    const probability = riskData?.risk_probability || 0;
    const riskLevel = riskData?.risk_level || 'Low';

    const getRiskConfig = () => {
        if (probability >= 70) return { color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: AlertCircle, label: 'High Risk', advice: 'Please contact your healthcare provider immediately.' };
        if (probability >= 35) return { color: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: AlertTriangle, label: 'Medium Risk', advice: 'Stay vigilant. Monitor your symptoms closely.' };
        return { color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: ShieldCheck, label: 'Low Risk', advice: 'Your vitals are within normal range. Keep up the healthy lifestyle!' };
    };

    const riskConfig = getRiskConfig();
    const RiskIcon = riskConfig.icon;

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (probability / 100) * circumference;

    // Simple vitals display
    const vitalCards = [
        { icon: Heart, label: 'Heart Rate', value: vitals?.heart_rate || 75, unit: 'bpm', normal: '60-100', color: '#f43f5e' },
        { icon: Droplet, label: 'Oxygen Level', value: vitals?.spo2_pct || 98, unit: '%', normal: '95-100', color: '#3b82f6' },
        { icon: Thermometer, label: 'Temperature', value: vitals?.temperature_f || 98.6, unit: '°F', normal: '97-99.5', color: '#f59e0b' },
        { icon: Activity, label: 'Blood Pressure', value: `${vitals?.systolic_bp || 120}/${vitals?.diastolic_bp || 80}`, unit: 'mmHg', normal: '90-120/60-80', color: '#a855f7' },
        { icon: Wind, label: 'Breathing Rate', value: vitals?.respiratory_rate || 16, unit: 'rpm', normal: '12-20', color: '#06b6d4' },
    ];

    const sections = [
        { id: 'overview', label: 'Overview', icon: Shield },
        { id: 'chat', label: 'Ask AI Doctor', icon: MessageSquare },
        { id: 'alerts', label: 'My Alerts', icon: Bell },
    ];

    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Navigation */}
            <div className="flex gap-2 bg-gray-900/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
                {sections.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSection === s.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'text-gray-400 hover:text-white'}`}
                    >
                        <s.icon size={16} /> {s.label}
                    </button>
                ))}
            </div>

            {activeSection === 'overview' && (
                <div className="flex flex-col gap-6">
                    {/* Main Risk Display */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`glass-card p-8 border ${riskConfig.border} relative overflow-hidden text-center`}
                    >
                        <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at center, ${riskConfig.color}, transparent 70%)` }}></div>

                        <h2 className="text-lg font-bold text-gray-300 mb-6 uppercase tracking-widest">Your Health Status</h2>

                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <svg width="200" height="200" className="transform -rotate-90">
                                    <circle cx="100" cy="100" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="14" fill="none" />
                                    <motion.circle
                                        cx="100" cy="100" r={radius}
                                        stroke={riskConfig.color}
                                        strokeWidth="14"
                                        fill="none"
                                        strokeDasharray={circumference}
                                        initial={{ strokeDashoffset: circumference }}
                                        animate={{ strokeDashoffset }}
                                        transition={{ duration: 2, ease: "easeOut" }}
                                        strokeLinecap="round"
                                        style={{ filter: `drop-shadow(0 0 10px ${riskConfig.color}40)` }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <RiskIcon size={28} style={{ color: riskConfig.color }} />
                                    <span className="text-4xl font-black mt-1" style={{ color: riskConfig.color }}>
                                        {probability.toFixed(0)}%
                                    </span>
                                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">risk</span>
                                </div>
                            </div>
                        </div>

                        <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full ${riskConfig.bg} border ${riskConfig.border}`} style={{ color: riskConfig.color }}>
                            <RiskIcon size={16} />
                            <span className="font-bold text-sm uppercase tracking-wider">{riskConfig.label}</span>
                        </div>

                        <p className="mt-4 text-sm text-gray-400 max-w-sm mx-auto">{riskConfig.advice}</p>
                    </motion.div>

                    {/* Vitals Cards (Simple) */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Your Current Vitals</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {vitalCards.map((vital, i) => {
                                const Icon = vital.icon;
                                return (
                                    <motion.div
                                        key={vital.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.08 }}
                                        className="glass-card p-4 border border-white/5 text-center group hover:border-blue-500/20 transition-all"
                                    >
                                        <Icon size={20} style={{ color: vital.color }} className="mx-auto mb-2" />
                                        <p className="text-xs text-gray-500 font-semibold mb-1">{vital.label}</p>
                                        <p className="text-xl font-black text-white">{vital.value}</p>
                                        <p className="text-[10px] text-gray-600 mt-0.5">{vital.unit}</p>
                                        <p className="text-[9px] text-gray-600 mt-1">Normal: {vital.normal}</p>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Disease Risks (Simple Cards) */}
                    {diseaseRisks && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Health Risk Summary</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { key: 'sepsis', icon: Thermometer, label: 'Infection Risk', color: '#f97316' },
                                    { key: 'stroke', icon: Brain, label: 'Stroke Risk', color: '#a855f7' },
                                    { key: 'heart_disease', icon: Heart, label: 'Heart Risk', color: '#ef4444' }
                                ].map((d, i) => {
                                    const data = diseaseRisks[d.key];
                                    if (!data) return null;
                                    const Icon = d.icon;

                                    return (
                                        <motion.div
                                            key={d.key}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="glass-card p-5 border border-white/5"
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <Icon size={20} style={{ color: d.color }} />
                                                <span className="text-sm font-bold text-gray-300">{d.label}</span>
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <span className="text-3xl font-black" style={{ color: d.color }}>{data.risk_score?.toFixed(0)}</span>
                                                <span className="text-sm text-gray-500 mb-1">/ 100</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">{data.risk_level} risk</p>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeSection === 'chat' && (
                <div className="h-[calc(100vh-250px)]">
                    <MedicalAssistant currentVitals={vitals} />
                </div>
            )}

            {activeSection === 'alerts' && (
                <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Bell size={20} className="text-red-400" /> Your Alert History
                    </h3>
                    {(!alerts || alerts.length === 0) ? (
                        <div className="glass-card p-12 border border-white/5 text-center">
                            <ShieldCheck size={48} className="mx-auto mb-4 text-emerald-500/30" />
                            <p className="text-gray-400 text-lg font-semibold">No alerts</p>
                            <p className="text-sm text-gray-500 mt-1">You have no active health alerts. Great!</p>
                        </div>
                    ) : (
                        alerts.slice(0, 10).map((alert, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="glass-card p-4 border border-red-500/10 hover:border-red-500/30 transition-colors"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-mono text-gray-500">{alert.timestamp}</span>
                                    <span className="text-xs text-red-400 font-bold">ALERT</span>
                                </div>
                                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">{alert.message}</pre>
                            </motion.div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default PatientDashboard;
