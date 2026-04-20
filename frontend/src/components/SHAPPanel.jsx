import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Brain, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, Zap, Info } from 'lucide-react';

const SHAPPanel = ({ shapData, riskProbability }) => {
    if (!shapData) {
        return (
            <div className="glass-card p-8 border border-white/5 text-center">
                <Brain size={48} className="mx-auto mb-4 text-gray-600" />
                <h3 className="text-lg font-bold text-gray-400 mb-2">SHAP Explanation</h3>
                <p className="text-sm text-gray-500">Run a prediction to see AI explanations</p>
            </div>
        );
    }

    const shapValues = shapData.shap_values || [];
    const riskFactors = shapData.top_risk_factors || [];
    const protectiveFactors = shapData.top_protective_factors || [];
    const method = shapData.explanation_method || "SHAP";

    // Prepare chart data — top 10 features
    const chartData = shapValues.slice(0, 10).map(item => ({
        name: humanReadableName(item.feature),
        value: parseFloat(item.value?.toFixed(3) || 0),
        absValue: parseFloat(item.abs_value?.toFixed(3) || 0),
        direction: item.direction,
        fill: item.value > 0 ? '#ef4444' : '#3b82f6'
    }));

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="glass-card p-6 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 opacity-60"></div>

                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                            <Brain size={22} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Why is this patient at risk?</h2>
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                <Info size={10} /> Powered by {method}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Overall Risk</p>
                        <p className={`text-2xl font-black ${riskProbability > 70 ? 'text-red-400' : riskProbability > 35 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {(riskProbability || 0).toFixed(1)}%
                        </p>
                    </div>
                </div>

                {/* Risk & Protective Factors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Risk Factors */}
                    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <TrendingUp size={14} /> Risk-Increasing Factors
                        </h4>
                        <div className="space-y-2">
                            {riskFactors.length > 0 ? riskFactors.map((factor, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></div>
                                    <span className="text-gray-300 font-medium">{factor}</span>
                                </motion.div>
                            )) : (
                                <p className="text-xs text-gray-500">No significant risk factors detected</p>
                            )}
                        </div>
                    </div>

                    {/* Protective Factors */}
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <TrendingDown size={14} /> Protective Factors
                        </h4>
                        <div className="space-y-2">
                            {protectiveFactors.length > 0 ? protectiveFactors.map((factor, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                                    <span className="text-gray-300 font-medium">{factor}</span>
                                </motion.div>
                            )) : (
                                <p className="text-xs text-gray-500">No protective factors detected</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* SHAP Bar Chart */}
            <div className="glass-card p-6 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500/40 via-transparent to-blue-500/40"></div>

                <h3 className="text-lg font-bold text-gray-200 mb-2 flex items-center gap-2">
                    <Zap size={18} className="text-amber-400" />
                    Feature Contribution Chart
                </h3>
                <p className="text-xs text-gray-500 mb-6">
                    <span className="text-red-400 font-semibold">Red bars</span> increase risk · <span className="text-blue-400 font-semibold">Blue bars</span> decrease risk
                </p>

                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                        >
                            <XAxis
                                type="number"
                                stroke="#6b7280"
                                tick={{ fill: '#9ca3af', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                dataKey="name"
                                type="category"
                                stroke="#6b7280"
                                tick={{ fill: '#d1d5db', fontSize: 12, fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                width={110}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                contentStyle={{
                                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                    color: '#fff',
                                    fontSize: '12px'
                                }}
                                formatter={(value) => [value > 0 ? `+${value} (increases risk)` : `${value} (decreases risk)`, 'SHAP Value']}
                            />
                            <ReferenceLine x={0} stroke="rgba(255,255,255,0.1)" />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
                                {chartData.map((entry, idx) => (
                                    <Cell key={idx} fill={entry.fill} fillOpacity={0.8} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Feature Details Table */}
            <div className="glass-card p-6 border border-white/5">
                <h3 className="text-lg font-bold text-gray-200 mb-4">Feature Contribution Details</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left py-2 px-3 text-xs text-gray-500 uppercase tracking-wider font-semibold">Feature</th>
                                <th className="text-center py-2 px-3 text-xs text-gray-500 uppercase tracking-wider font-semibold">Direction</th>
                                <th className="text-right py-2 px-3 text-xs text-gray-500 uppercase tracking-wider font-semibold">SHAP Value</th>
                                <th className="text-right py-2 px-3 text-xs text-gray-500 uppercase tracking-wider font-semibold">Impact</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shapValues.slice(0, 15).map((item, idx) => (
                                <motion.tr
                                    key={idx}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                                >
                                    <td className="py-2.5 px-3 text-gray-300 font-medium">{humanReadableName(item.feature)}</td>
                                    <td className="py-2.5 px-3 text-center">
                                        <span className={`inline-flex items-center gap-1 text-lg ${item.value > 0 ? 'text-red-400' : item.value < 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                                            {item.direction}
                                        </span>
                                    </td>
                                    <td className={`py-2.5 px-3 text-right font-mono text-xs ${item.value > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                        {item.value > 0 ? '+' : ''}{item.value?.toFixed(4)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                        <div className="w-full max-w-[80px] ml-auto bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min(100, (item.abs_value / (shapValues[0]?.abs_value || 1)) * 100)}%`,
                                                    backgroundColor: item.value > 0 ? '#ef4444' : '#3b82f6'
                                                }}
                                            ></div>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


// Feature name helper
function humanReadableName(name) {
    const map = {
        'heart_rate': 'Heart Rate', 'respiratory_rate': 'Resp. Rate', 'spo2_pct': 'SpO2',
        'temperature_c': 'Temperature', 'systolic_bp': 'Systolic BP', 'diastolic_bp': 'Diastolic BP',
        'wbc_count': 'WBC Count', 'lactate': 'Lactate', 'creatinine': 'Creatinine',
        'crp_level': 'CRP Level', 'platelets': 'Platelets', 'calcium_level': 'Calcium',
        'iron_level': 'Iron', 'cholesterol': 'Cholesterol', 'cortisol': 'Cortisol',
        'esr': 'ESR', 't3': 'Free T3', 't4': 'Free T4', 'tsh': 'TSH',
        'comorbidity_index': 'Comorbidity', 'age': 'Age', 'hour_from_admission': 'Time in Hospital',
    };
    // Clean rolling/delta suffixes
    let base = name.split('_roll_')[0].split('_delta_')[0];
    let suffix = '';
    if (name.includes('_roll_mean_')) suffix = ' (avg)';
    else if (name.includes('_roll_var_')) suffix = ' (var)';
    else if (name.includes('_roll_min_')) suffix = ' (min)';
    else if (name.includes('_roll_max_')) suffix = ' (max)';
    else if (name.includes('_delta_') && !name.includes('_sign_')) suffix = ' (trend)';
    else if (name.includes('_delta_sign_')) suffix = ' (dir)';

    return (map[base] || base.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) + suffix;
}

export default SHAPPanel;
