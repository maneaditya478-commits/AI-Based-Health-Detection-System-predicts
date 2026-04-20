import React, { useEffect, useState } from 'react';
import { fetchAlerts } from '../utils/api';

const PatientAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAlerts = async () => {
            try {
                const data = await fetchAlerts();
                setAlerts(data.reverse()); // Show newest first
            } catch (err) {
                console.error('Failed to load alerts', err);
            } finally {
                setLoading(false);
            }
        };
        loadAlerts();
        const interval = setInterval(loadAlerts, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-center text-slate-400">Loading alerts...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <span className="text-red-500">🔔</span> Patient Notification History
                </h2>
                <span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400">
                    Auto-refreshes every 10s
                </span>
            </div>

            {alerts.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                    <p className="text-slate-400 text-lg">No alerts sent yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {alerts.map((alert, idx) => (
                        <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-red-500/30 transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded">
                                        {alert.timestamp}
                                    </span>
                                    <span className="text-sm font-semibold text-red-500">
                                        CRITICAL ALERT
                                    </span>
                                </div>
                                <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">
                                    Delivered via Twilio SMS
                                </span>
                            </div>
                            <pre className="text-slate-300 font-sans whitespace-pre-wrap text-sm bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                                {alert.message}
                            </pre>
                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                <span>Recipient: <strong>{alert.patient_name}</strong></span>
                                <span>•</span>
                                <span>Phone: {alert.phone_number}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PatientAlerts;
