import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, AlertTriangle, Apple, Pill, BookOpen } from 'lucide-react';
import { generateResponse } from '../utils/chatbot';

export const MedicalAssistant = ({ currentVitals }) => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hello! I'm your AI Medical Assistant. How can I help you with your health today?" }
    ]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (text = input) => {
        if (!text.trim()) return;

        const userMessage = { role: 'user', content: text };
        setMessages(prev => [...prev, userMessage]);
        setInput("");

        setTimeout(() => {
            const responseText = generateResponse(text, currentVitals);
            setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
        }, 500);
    };

    const QuickAction = ({ icon: Icon, label, query }) => (
        <button
            onClick={() => handleSend(query)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-white/10 rounded-lg text-xs font-medium text-gray-300 transition-all hover:border-blue-500/50"
        >
            <Icon size={14} className="text-blue-400" />
            {label}
        </button>
    );

    return (
        <div className="flex flex-col h-full gap-4 max-h-screen">
            {/* Header / Vitals Check */}
            <div className="flex justify-between items-center px-2">
                <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                    <Bot size={20} className="text-blue-400" />
                    AI Medical Assistant
                </h3>
                {currentVitals && (currentVitals.spo2_pct < 94 || currentVitals.heart_rate > 100) ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-bold animate-pulse">
                        <AlertTriangle size={12} /> CONTEXTUAL MONITORING ACTIVE
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-[10px] font-bold">
                        Vitals Context Linked
                    </div>
                )}
            </div>

            {/* Chat Box */}
            <div className="flex-grow glass-card border border-white/10 shadow-2xl p-4 flex flex-col gap-4 overflow-hidden relative min-h-0">
                <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-2">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl flex gap-3 ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 rounded-tr-none'
                                    : 'bg-gray-800/80 text-gray-100 border border-white/5 rounded-tl-none'
                                }`}>
                                <div className="mt-1 flex-shrink-0">
                                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} className="text-blue-400" />}
                                </div>
                                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions overlaying bottom slightly */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                    <QuickAction icon={Apple} label="Diet Advice" query="What to eat for low iron?" />
                    <QuickAction icon={Pill} label="Meds Timing" query="When to take thyroid medicine?" />
                    <QuickAction icon={BookOpen} label="Explain SpO2" query="What is SpO2?" />
                </div>

                {/* Input Area */}
                <div className="flex gap-2 bg-gray-900/60 p-2 rounded-xl border border-white/10 mt-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about health, diet, or medicine..."
                        className="flex-grow bg-transparent border-none focus:outline-none text-white text-sm px-2 placeholder:text-gray-500"
                    />
                    <button
                        onClick={() => handleSend()}
                        className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>

            <p className="text-[10px] text-center text-gray-500 italic">
                This assistant provides general guidance. Please consult a doctor for medical decisions.
            </p>
        </div>
    );
};
