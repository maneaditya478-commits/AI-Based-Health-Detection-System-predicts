import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';

const VoiceAssistant = ({ onCommand }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(true);
    
    // Refs to avoid stale closures in native event listeners
    const transcriptRef = useRef('');
    const recognitionRef = useRef(null);
    const onCommandRef = useRef(onCommand);

    useEffect(() => {
        onCommandRef.current = onCommand;
    }, [onCommand]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        // Set to false so it automatically stops and processes when the user pauses
        recognition.continuous = false; 
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setTranscript('');
            transcriptRef.current = '';
        };

        recognition.onresult = (event) => {
            let finalTrans = '';
            for (let i = 0; i < event.results.length; ++i) {
                finalTrans += event.results[i][0].transcript;
            }
            setTranscript(finalTrans);
            transcriptRef.current = finalTrans;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
            if (transcriptRef.current.trim()) {
                onCommandRef.current(transcriptRef.current.trim());
            }
            
            // clear display after slight delay so user can see what they said
            setTimeout(() => {
                setTranscript('');
                transcriptRef.current = '';
            }, 2000);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const toggleListening = useCallback(() => {
        if (!isSupported) return;

        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            try {
                recognitionRef.current?.start();
            } catch (err) {
                console.error("Microphone start error:", err);
            }
        }
    }, [isListening, isSupported]);

    if (!isSupported) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            <AnimatePresence>
                {transcript && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="bg-gray-900/90 backdrop-blur-md border border-blue-500/30 p-4 rounded-2xl max-w-sm shadow-2xl shadow-blue-500/20 text-sm text-gray-200"
                    >
                        {isListening ? (
                            <div className="flex items-center gap-2 mb-1">
                                <Loader2 size={12} className="text-blue-400 animate-spin" />
                                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Listening...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Processing</span>
                            </div>
                        )}
                        <p className="italic leading-relaxed">"{transcript}"</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={toggleListening}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 relative border ${
                    isListening 
                        ? 'bg-blue-600 border-blue-400 text-white shadow-blue-500/50' 
                        : 'bg-gray-800 border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-gray-700'
                }`}
            >
                {isListening && (
                    <div className="absolute inset-0 rounded-full bg-blue-500 opacity-30 animate-ping"></div>
                )}
                <div className="relative z-10">
                    {isListening ? <Mic size={24} /> : <MicOff size={24} />}
                </div>
            </motion.button>
        </div>
    );
};

export default VoiceAssistant;
