import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ShieldCheck, AlertTriangle } from 'lucide-react';

export const RiskGauge = ({ probability, riskLevel }) => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (probability / 100) * circumference;

    let color = '#10b981'; // Emerald 500
    let shadowColor = 'rgba(16, 185, 129, 0.4)';
    let Icon = ShieldCheck;

    if (probability >= 35 && probability < 70) {
        color = '#f59e0b'; // Amber 500
        shadowColor = 'rgba(245, 158, 11, 0.4)';
        Icon = AlertTriangle;
    }
    if (probability >= 70) {
        color = '#ef4444'; // Red 500
        shadowColor = 'rgba(239, 68, 68, 0.6)';
        Icon = AlertCircle;
    }

    return (
        <div className="flex flex-col items-center justify-center p-6 glass-card w-full h-full relative overflow-hidden group">
            {/* Ambient Background Glow */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl opacity-20 transition-all duration-1000"
                style={{ backgroundColor: color }}
            ></div>

            <h3 className="text-lg font-bold text-gray-300 mb-6 uppercase tracking-widest z-10">Deterioration Risk</h3>

            <div className="relative flex items-center justify-center z-10 drop-shadow-2xl hover:scale-105 transition-transform duration-500">
                {/* Background Circle */}
                <svg width="180" height="180" className="transform -rotate-90 filter drop-shadow-lg">
                    <circle
                        cx="90"
                        cy="90"
                        r={radius}
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="16"
                        fill="none"
                    />
                    {/* Animated Progress Circle */}
                    <motion.circle
                        cx="90"
                        cy="90"
                        r={radius}
                        stroke={color}
                        strokeWidth="16"
                        fill="none"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.5, ease: "easeOut", type: "spring", bounce: 0.2 }}
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 8px ${shadowColor})` }}
                    />
                </svg>

                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-4xl font-black tracking-tighter"
                        style={{ color }}
                    >
                        {probability.toFixed(1)}<span className="text-xl opacity-70">%</span>
                    </motion.span>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 text-center flex flex-col items-center gap-2 z-10"
            >
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border bg-black/40 backdrop-blur-md"
                    style={{ borderColor: `${color}40`, color }}>
                    <Icon size={16} />
                    <span className="font-bold tracking-wide uppercase text-sm">{riskLevel}</span>
                </div>
                {probability >= 70 && (
                    <span className="text-xs text-red-400 mt-2 animate-pulse font-medium">Immediate Clinical Review Required</span>
                )}
            </motion.div>
        </div>
    );
};
