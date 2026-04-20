import React from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Heart, Brain, AlertCircle, ShieldCheck, AlertTriangle, ChevronDown, Stethoscope } from 'lucide-react';

const DiseaseRiskPanel = ({ diseaseRisks }) => {
    if (!diseaseRisks) {
        return (
            <div className="glass-card p-8 border border-white/5 text-center">
                <Stethoscope size={48} className="mx-auto mb-4 text-gray-600" />
                <h3 className="text-lg font-bold text-gray-400 mb-2">Disease Risk Assessment</h3>
                <p className="text-sm text-gray-500">Run a prediction to see disease-specific risk scores</p>
            </div>
        );
    }

    const diseases = [
        {
            key: 'sepsis',
            data: diseaseRisks.sepsis,
            icon: Thermometer,
            gradient: 'from-orange-600 to-red-600',
            lightColor: '#f97316',
            bgGlow: 'rgba(249, 115, 22, 0.1)',
            description: 'Sepsis risk based on qSOFA+ clinical criteria'
        },
        {
            key: 'stroke',
            data: diseaseRisks.stroke,
            icon: Brain,
            gradient: 'from-purple-600 to-indigo-600',
            lightColor: '#a855f7',
            bgGlow: 'rgba(168, 85, 247, 0.1)',
            description: 'Stroke risk based on multi-factor clinical assessment'
        },
        {
            key: 'heart_disease',
            data: diseaseRisks.heart_disease,
            icon: Heart,
            gradient: 'from-red-600 to-pink-600',
            lightColor: '#ef4444',
            bgGlow: 'rgba(239, 68, 68, 0.1)',
            description: 'Heart disease risk based on Framingham-inspired scoring'
        }
    ];

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-red-500/20 to-purple-500/20 rounded-xl border border-white/10">
                    <Stethoscope size={22} className="text-red-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Disease Risk Assessment</h2>
                    <p className="text-xs text-gray-400">Clinical scoring algorithms for Sepsis, Stroke & Heart Disease</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {diseases.map((disease, idx) => {
                    const d = disease.data;
                    if (!d) return null;

                    const Icon = disease.icon;
                    const riskScore = d.risk_score || 0;

                    const getRiskIcon = (level) => {
                        if (level === 'High') return <AlertCircle size={14} />;
                        if (level === 'Medium') return <AlertTriangle size={14} />;
                        return <ShieldCheck size={14} />;
                    };

                    const getRiskColor = (level) => {
                        if (level === 'High') return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
                        if (level === 'Medium') return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
                        return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
                    };

                    const riskColors = getRiskColor(d.risk_level);
                    const radius = 50;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference - (riskScore / 100) * circumference;

                    return (
                        <motion.div
                            key={disease.key}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.15 }}
                            className="glass-card border border-white/5 relative overflow-hidden group"
                        >
                            {/* Top gradient bar */}
                            <div className={`h-1.5 bg-gradient-to-r ${disease.gradient} opacity-60`}></div>

                            <div className="p-6">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="p-2.5 rounded-xl border border-white/10" style={{ backgroundColor: disease.bgGlow }}>
                                        <Icon size={20} style={{ color: disease.lightColor }} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">{d.disease}</h3>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{disease.description}</p>
                                    </div>
                                </div>

                                {/* Risk Gauge */}
                                <div className="flex items-center justify-center mb-5">
                                    <div className="relative">
                                        <svg width="120" height="120" className="transform -rotate-90">
                                            <circle
                                                cx="60" cy="60" r={radius}
                                                stroke="rgba(255,255,255,0.05)"
                                                strokeWidth="10"
                                                fill="none"
                                            />
                                            <motion.circle
                                                cx="60" cy="60" r={radius}
                                                stroke={disease.lightColor}
                                                strokeWidth="10"
                                                fill="none"
                                                strokeDasharray={circumference}
                                                initial={{ strokeDashoffset: circumference }}
                                                animate={{ strokeDashoffset }}
                                                transition={{ duration: 1.5, ease: "easeOut" }}
                                                strokeLinecap="round"
                                                style={{ filter: `drop-shadow(0 0 6px ${disease.lightColor}40)` }}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-black" style={{ color: disease.lightColor }}>
                                                {riskScore.toFixed(0)}
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-semibold">/ 100</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Risk Level Badge */}
                                <div className="text-center mb-5">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${riskColors.bg} ${riskColors.text} border ${riskColors.border}`}>
                                        {getRiskIcon(d.risk_level)}
                                        {d.risk_level} Risk
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-2">{d.score_detail}</p>
                                </div>

                                {/* Contributing Factors */}
                                {d.factors && d.factors.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contributing Factors</h4>
                                        {d.factors.slice(0, 4).map((factor, fi) => {
                                            const severityColors = {
                                                critical: 'border-l-red-500 bg-red-500/5',
                                                high: 'border-l-orange-500 bg-orange-500/5',
                                                medium: 'border-l-amber-500 bg-amber-500/5',
                                                low: 'border-l-gray-500 bg-gray-500/5'
                                            };
                                            return (
                                                <motion.div
                                                    key={fi}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.15 + fi * 0.05 }}
                                                    className={`border-l-2 rounded-r-lg p-2 ${severityColors[factor.severity] || severityColors.low}`}
                                                >
                                                    <p className="text-xs text-gray-300 font-medium">{factor.factor}</p>
                                                    <p className="text-[10px] text-gray-500">{factor.detail}</p>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Recommendation */}
                                {d.recommendation && (
                                    <div className="bg-gray-900/40 border border-white/5 rounded-xl p-3 mt-4">
                                        <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                            <Stethoscope size={10} /> Clinical Recommendation
                                        </h4>
                                        <p className="text-xs text-gray-400 leading-relaxed">{d.recommendation}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default DiseaseRiskPanel;
