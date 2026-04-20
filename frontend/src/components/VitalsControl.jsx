import React, { useState } from 'react';
import { HeartPulse, TestTube, Brain, Activity, Droplet } from 'lucide-react';
import { FEATURE_RANGES } from '../utils/constants';

const getColorClass = (value, config) => {
    if (value >= config.normal_low && value <= config.normal_high) {
        return "text-green-400 bg-green-500/10 border-green-500/30"; // Green -> normal
    }
    // Simple heuristic for Critical vs Borderline (usually tail ends are critical)
    const range = config.max - config.min;
    if (value < config.normal_low - (range * 0.1) || value > config.normal_high + (range * 0.1)) {
        return "text-red-400 bg-red-500/10 border-red-500/30"; // Red -> critical
    }
    return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"; // Yellow -> borderline
};

const getSliderColorClass = (value, config) => {
    if (value >= config.normal_low && value <= config.normal_high) return "accent-green-500 hover:accent-green-400";
    const range = config.max - config.min;
    if (value < config.normal_low - (range * 0.1) || value > config.normal_high + (range * 0.1)) return "accent-red-500 hover:accent-red-400";
    return "accent-yellow-500 hover:accent-yellow-400";
};

const Slider = ({ featureKey, value, onChange }) => {
    const config = FEATURE_RANGES[featureKey];
    if (!config) return null;

    const colorStyle = getColorClass(value, config);
    const sliderTheme = getSliderColorClass(value, config);
    const step = (config.max - config.min) < 50 ? 0.1 : 1.0;

    return (
        <div className="mb-5">
            <div className="flex justify-between items-end mb-1">
                <div>
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wide flex items-center gap-2">
                        {config.label}
                    </label>
                    <span className="text-[10px] text-gray-500 font-medium tracking-wide">
                        NORMAL: {config.normal} {config.unit}
                    </span>
                </div>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-md border ${colorStyle} transition-colors duration-300`}>
                    {value} <span className="text-xs font-normal opacity-70">{config.unit}</span>
                </span>
            </div>
            <input
                type="range"
                min={config.min}
                max={config.max}
                step={step}
                value={value}
                onChange={e => onChange(parseFloat(e.target.value))}
                className={`w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer transition-all ${sliderTheme}`}
            />
        </div>
    );
};

export const VitalsControl = ({ vitals, onChangeVitals }) => {
    const [activeTab, setActiveTab] = useState('vitals');
    const handleChange = (key, val) => onChangeVitals({ ...vitals, [key]: val });

    const tabs = [
        { id: 'vitals', label: 'Vitals', icon: <HeartPulse size={16} /> },
        { id: 'labs', label: 'Labs', icon: <TestTube size={16} /> },
        { id: 'systems', label: 'Systems', icon: <Brain size={16} /> },
        { id: 'thyroid', label: 'Thyroid', icon: <Droplet size={16} /> }
    ];

    return (
        <div className="glass-card p-0 flex flex-col h-full overflow-hidden border border-white/10 shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-transparent opacity-50"></div>

            <div className="p-4 border-b border-white/5 bg-black/20">
                <div className="flex gap-2 p-1 bg-gray-900/50 rounded-lg border border-white/5">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex flex-1 items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all duration-300 ${activeTab === t.id ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            {t.icon} <span className="hidden sm:inline">{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-5 custom-scrollbar">

                {activeTab === 'vitals' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-2">
                            <Slider featureKey="heart_rate" value={vitals.heart_rate} onChange={v => handleChange('heart_rate', v)} />
                            <Slider featureKey="respiratory_rate" value={vitals.respiratory_rate} onChange={v => handleChange('respiratory_rate', v)} />
                            <Slider featureKey="spo2_pct" value={vitals.spo2_pct} onChange={v => handleChange('spo2_pct', v)} />
                        </div>
                        <div className="space-y-2">
                            <Slider featureKey="temperature_f" value={vitals.temperature_f} onChange={v => handleChange('temperature_f', v)} />
                            <Slider featureKey="systolic_bp" value={vitals.systolic_bp} onChange={v => handleChange('systolic_bp', v)} />
                            <Slider featureKey="diastolic_bp" value={vitals.diastolic_bp} onChange={v => handleChange('diastolic_bp', v)} />
                        </div>
                        <div className="bg-gray-900/30 p-4 rounded-xl border border-white/5 h-fit">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Oxygen Supp.</label>
                            <select
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500 transition-colors mb-4"
                                value={vitals.oxygen_device}
                                onChange={e => handleChange('oxygen_device', e.target.value)}
                            >
                                <option value="none">Room Air</option>
                                <option value="nasal_cannula">Nasal Cannula</option>
                                <option value="mask">Face Mask</option>
                                <option value="hfnc">High Flow (HFNC)</option>
                                <option value="vent">Ventilator</option>
                            </select>
                            <div className="mb-4">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex justify-between">O2 Flow Rate <span className="text-white font-bold">{vitals.oxygen_flow} L/m</span></label>
                                <input type="range" min={0} max={15} step={0.1} value={vitals.oxygen_flow} onChange={e => handleChange('oxygen_flow', parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'labs' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-2">
                            <Slider featureKey="wbc_count" value={vitals.wbc_count} onChange={v => handleChange('wbc_count', v)} />
                            <Slider featureKey="lactate" value={vitals.lactate} onChange={v => handleChange('lactate', v)} />
                            <Slider featureKey="creatinine" value={vitals.creatinine} onChange={v => handleChange('creatinine', v)} />
                            <Slider featureKey="platelets" value={vitals.platelets} onChange={v => handleChange('platelets', v)} />
                        </div>
                        <div className="space-y-2">
                            <Slider featureKey="crp_level" value={vitals.crp_level} onChange={v => handleChange('crp_level', v)} />
                            <Slider featureKey="calcium_level" value={vitals.calcium_level} onChange={v => handleChange('calcium_level', v)} />
                            <Slider featureKey="iron_level" value={vitals.iron_level} onChange={v => handleChange('iron_level', v)} />
                            <Slider featureKey="cholesterol" value={vitals.cholesterol} onChange={v => handleChange('cholesterol', v)} />
                        </div>
                        <div className="space-y-2">
                            <Slider featureKey="cortisol" value={vitals.cortisol} onChange={v => handleChange('cortisol', v)} />
                            <Slider featureKey="esr" value={vitals.esr} onChange={v => handleChange('esr', v)} />
                            <div className="mt-4">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Urine Routine</label>
                                <select
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-yellow-400 outline-none focus:border-blue-500 transition-colors"
                                    value={vitals.urine_routine}
                                    onChange={e => handleChange('urine_routine', parseFloat(e.target.value))}
                                >
                                    <option value={0}>Normal / Clear</option>
                                    <option value={1}>Abnormal / Infection</option>
                                    <option value={2}>Critical (Blood/Protein)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'thyroid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
                        <div className="space-y-2">
                            <Slider featureKey="t3" value={vitals.t3} onChange={v => handleChange('t3', v)} />
                            <Slider featureKey="t4" value={vitals.t4} onChange={v => handleChange('t4', v)} />
                        </div>
                        <div className="space-y-2 bg-gray-900/30 p-5 rounded-xl border border-blue-500/10">
                            <Slider featureKey="tsh" value={vitals.tsh} onChange={v => handleChange('tsh', v)} />
                            <div className="text-xs text-gray-400 mt-4 border-l-2 border-yellow-500/50 pl-3 leading-relaxed">
                                <b>Note:</b> Abnormal TSH combined with extreme T3/T4 indicates hyper/hypothyroidism cascading to cardiovascular events.
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'systems' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-gray-900/40 p-4 rounded-xl border border-white/5 shadow-inner">
                            <label className="text-xs font-semibold text-blue-400 uppercase tracking-wide block mb-3 flex items-center gap-2">
                                <Activity size={14} /> Respiratory Sys
                            </label>
                            <select className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-3 text-sm text-gray-200 outline-none focus:border-blue-500"
                                value={vitals.rs_status} onChange={e => handleChange('rs_status', e.target.value)}>
                                <option value="Normal A/E">Normal A/E, Bilaterally Clear</option>
                                <option value="Decreased A/E">Decreased A/E</option>
                                <option value="Wheezing">Wheezing / Rhonchi</option>
                                <option value="Crackles">Crackles / Crepitations</option>
                            </select>
                        </div>
                        <div className="bg-gray-900/40 p-4 rounded-xl border border-white/5 shadow-inner">
                            <label className="text-xs font-semibold text-red-400 uppercase tracking-wide block mb-3 flex items-center gap-2">
                                <HeartPulse size={14} /> Cardiovascular Sys
                            </label>
                            <select className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-3 text-sm text-gray-200 outline-none focus:border-red-500"
                                value={vitals.cvs_status} onChange={e => handleChange('cvs_status', e.target.value)}>
                                <option value="Normal">Normal S1S2, Regular Rhythm</option>
                                <option value="Irregular">Irregular / AFib</option>
                                <option value="Murmur">Systolic/Diastolic Murmur</option>
                            </select>
                        </div>
                        <div className="bg-gray-900/40 p-4 rounded-xl border border-white/5 shadow-inner">
                            <label className="text-xs font-semibold text-purple-400 uppercase tracking-wide block mb-3 flex items-center gap-2">
                                <Brain size={14} /> CNS Status
                            </label>
                            <select className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-3 text-sm text-gray-200 outline-none focus:border-purple-500"
                                value={vitals.cns_status} onChange={e => handleChange('cns_status', e.target.value)}>
                                <option value="alert">Alert & Oriented x3</option>
                                <option value="drowsy">Drowsy / Lethargic</option>
                                <option value="unconscious">Unconscious / Comatose</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
