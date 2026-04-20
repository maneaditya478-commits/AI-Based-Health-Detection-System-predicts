import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, AlertTriangle, ShieldCheck, AlertCircle, Search, Activity, Heart, Brain, RefreshCw, ArrowUpDown, ChevronRight, MapPin, Bed } from 'lucide-react';

const ICUDashboard = ({ onSelectPatient }) => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('risk'); // 'risk', 'name', 'ward'
    const [filterStatus, setFilterStatus] = useState('all');

    const fetchPatients = async () => {
        try {
            const res = await fetch('http://localhost:8000/patients');
            const data = await res.json();
            setPatients(data);
        } catch (err) {
            console.error('Failed to fetch patients', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
        const interval = setInterval(fetchPatients, 10000);
        return () => clearInterval(interval);
    }, []);

    // Filter & Sort
    let displayed = [...patients];

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        displayed = displayed.filter(p =>
            p.name?.toLowerCase().includes(q) ||
            p.patient_id?.toLowerCase().includes(q) ||
            p.ward?.toLowerCase().includes(q)
        );
    }

    if (filterStatus !== 'all') {
        displayed = displayed.filter(p => p.status === filterStatus);
    }

    if (sortBy === 'risk') {
        displayed.sort((a, b) => (b.risk_probability || 0) - (a.risk_probability || 0));
    } else if (sortBy === 'name') {
        displayed.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'ward') {
        displayed.sort((a, b) => (a.ward || '').localeCompare(b.ward || ''));
    }

    const stats = {
        total: patients.length,
        critical: patients.filter(p => p.status === 'critical').length,
        warning: patients.filter(p => p.status === 'warning').length,
        stable: patients.filter(p => p.status === 'stable').length
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'critical': return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', glow: 'shadow-red-500/20', icon: AlertCircle, label: 'CRITICAL' };
            case 'warning': return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'shadow-amber-500/20', icon: AlertTriangle, label: 'WARNING' };
            default: return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20', icon: ShieldCheck, label: 'STABLE' };
        }
    };

    const getRiskColor = (prob) => {
        if (prob >= 70) return '#ef4444';
        if (prob >= 35) return '#f59e0b';
        return '#10b981';
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Stats Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Patients', value: stats.total, icon: Users, color: 'blue', bg: 'from-blue-600/20 to-blue-600/5' },
                    { label: 'Critical', value: stats.critical, icon: AlertCircle, color: 'red', bg: 'from-red-600/20 to-red-600/5' },
                    { label: 'Warning', value: stats.warning, icon: AlertTriangle, color: 'amber', bg: 'from-amber-600/20 to-amber-600/5' },
                    { label: 'Stable', value: stats.stable, icon: ShieldCheck, color: 'emerald', bg: 'from-emerald-600/20 to-emerald-600/5' }
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`glass-card p-4 border border-white/5 bg-gradient-to-br ${stat.bg} relative overflow-hidden group`}
                    >
                        <div className={`absolute top-0 inset-x-0 h-0.5 bg-${stat.color}-500/50`}></div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{stat.label}</p>
                                <p className={`text-3xl font-black text-${stat.color}-400 mt-1`}>{stat.value}</p>
                            </div>
                            <stat.icon size={28} className={`text-${stat.color}-500/30 group-hover:text-${stat.color}-500/50 transition-colors`} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-grow w-full md:w-auto">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search patients by name, ID, or ward..."
                        className="w-full bg-gray-900/60 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/30 transition-colors"
                    />
                </div>

                <div className="flex gap-2 flex-shrink-0">
                    {['all', 'critical', 'warning', 'stable'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${filterStatus === status
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'bg-gray-900/60 text-gray-400 border border-white/5 hover:text-white'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                    <button
                        onClick={() => setSortBy(sortBy === 'risk' ? 'name' : sortBy === 'name' ? 'ward' : 'risk')}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-900/60 border border-white/5 rounded-lg text-xs font-medium text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowUpDown size={14} />
                        Sort: {sortBy === 'risk' ? 'Risk Level' : sortBy === 'name' ? 'Name' : 'Ward'}
                    </button>
                    <button onClick={fetchPatients} className="p-2 bg-gray-900/60 border border-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Patient Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
            ) : displayed.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    <Users size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-semibold">No patients found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {displayed.map((patient, idx) => {
                            const cfg = getStatusConfig(patient.status);
                            const riskColor = getRiskColor(patient.risk_probability || 0);
                            const StatusIcon = cfg.icon;

                            return (
                                <motion.div
                                    key={patient.patient_id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => onSelectPatient?.(patient)}
                                    className={`glass-card p-5 border ${cfg.border} cursor-pointer group hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg ${cfg.glow} relative overflow-hidden`}
                                >
                                    {/* Status bar */}
                                    <div className={`absolute top-0 inset-x-0 h-1`} style={{ backgroundColor: riskColor, opacity: 0.6 }}></div>

                                    {/* Critical pulse effect */}
                                    {patient.status === 'critical' && (
                                        <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" style={{ animationDuration: '2s' }}></div>
                                    )}

                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">{patient.name}</h3>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span className="font-mono">{patient.patient_id}</span>
                                                <span>•</span>
                                                <span>{patient.age}y {patient.gender}</span>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                                            <StatusIcon size={12} />
                                            {cfg.label}
                                        </div>
                                    </div>

                                    {/* Risk Score */}
                                    <div className="flex items-center gap-4 mb-3 bg-black/20 rounded-xl p-3 border border-white/5">
                                        <div className="relative w-14 h-14 flex-shrink-0">
                                            <svg width="56" height="56" className="transform -rotate-90">
                                                <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.05)" strokeWidth="5" fill="none" />
                                                <circle
                                                    cx="28" cy="28" r="22"
                                                    stroke={riskColor}
                                                    strokeWidth="5"
                                                    fill="none"
                                                    strokeDasharray={2 * Math.PI * 22}
                                                    strokeDashoffset={2 * Math.PI * 22 * (1 - (patient.risk_probability || 0) / 100)}
                                                    strokeLinecap="round"
                                                    style={{ filter: `drop-shadow(0 0 4px ${riskColor}40)` }}
                                                />
                                            </svg>
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-black" style={{ color: riskColor }}>
                                                {(patient.risk_probability || 0).toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Risk Level</p>
                                            <p className="text-sm font-bold" style={{ color: riskColor }}>{patient.risk_level || 'Low'}</p>
                                        </div>
                                    </div>

                                    {/* Quick Vitals */}
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {[
                                            { icon: Heart, label: 'HR', value: patient.heart_rate, unit: 'bpm', color: '#f43f5e' },
                                            { icon: Activity, label: 'SpO2', value: patient.spo2_pct, unit: '%', color: '#3b82f6' },
                                            { icon: Brain, label: 'BP', value: patient.systolic_bp, unit: 'mmHg', color: '#a855f7' }
                                        ].map(vital => (
                                            <div key={vital.label} className="bg-gray-900/40 rounded-lg p-2 text-center border border-white/5">
                                                <p className="text-[9px] text-gray-500 font-semibold uppercase">{vital.label}</p>
                                                <p className="text-sm font-bold" style={{ color: vital.color }}>{vital.value || '—'}</p>
                                                <p className="text-[9px] text-gray-600">{vital.unit}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1"><MapPin size={10} /> {patient.ward || 'N/A'}</span>
                                            <span className="flex items-center gap-1"><Bed size={10} /> {patient.bed || 'N/A'}</span>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default ICUDashboard;
