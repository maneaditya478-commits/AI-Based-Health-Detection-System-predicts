import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';

export const ChartsPanel = ({ historyData }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full h-full">
            {/* Risk Over Time Chart */}
            <div className="glass-card p-6 flex flex-col h-full border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500/50 to-orange-500/50"></div>
                <h3 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2 z-10">
                    <TrendingUp className="text-orange-400" size={20} />
                    Risk Probability Trend
                </h3>

                <div className="flex-grow z-10 min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="hour_from_admission"
                                stroke="#6b7280"
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#6b7280"
                                domain={[0, 100]}
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', color: '#fff' }}
                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="risk_probability_percent"
                                name="Risk (%)"
                                stroke="#ef4444"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRisk)"
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Vitals Over Time Chart */}
            <div className="glass-card p-6 flex flex-col h-full border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500/50 to-indigo-500/50"></div>
                <h3 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2 z-10">
                    <Activity className="text-blue-400" size={20} />
                    Core Vitals Timeline
                </h3>

                <div className="flex-grow z-10 min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="hour_from_admission"
                                stroke="#6b7280"
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#6b7280"
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                            <Line type="monotone" dataKey="heart_rate" name="Heart Rate" stroke="#f43f5e" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="spo2_pct" name="SpO2 (%)" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="temperature_f" name="Temp (°F)" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="systolic_bp" name="Sys BP" stroke="#a855f7" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="diastolic_bp" name="Dia BP" stroke="#c084fc" strokeWidth={3} strokeDasharray="5 5" dot={false} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
