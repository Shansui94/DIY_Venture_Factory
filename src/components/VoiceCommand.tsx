
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Activity } from 'lucide-react';

export const VoiceCommand: React.FC = () => {
    const [isListening, setIsListening] = useState(false);
    const [status, setStatus] = useState<string>('Ready');

    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioQueueRef = useRef<Int16Array[]>([]);
    const isPlayingRef = useRef(false);

    useEffect(() => {
        return () => {
            stopRecording();
        };
    }, []);

    const initWebSocket = () => {
        // Use environment variable if available (Production), otherwise fallback to localhost
        // UPDATED: Pointing to the Asia-Southeast1 (Singapore) instance
        const envUrl = 'wss://factory-voice-backend-874011854758.asia-southeast1.run.app';

        let wsUrl = envUrl;

        // Fallback for local dev only if needed, but for now force Prod for testing
        if (window.location.hostname === 'localhost') {
            wsUrl = 'ws://localhost:8080';
        }

        console.log("Connecting to Voice Server at:", wsUrl);

        const ws = new WebSocket(wsUrl);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            console.log('Voice Socket Connected');
            setStatus('Connected');
        };

        ws.onmessage = async (event) => {
            if (event.data instanceof ArrayBuffer) {
                // Received Audio Data
                const pcmData = new Int16Array(event.data);
                audioQueueRef.current.push(pcmData);
                playNextAudioChunk();
            } else {
                // Text Data (Logs/Status)
                try {
                    const msg = JSON.parse(event.data);
                    console.log('Server Message:', msg);
                    if (msg.type === 'status') {
                        setStatus(msg.text);
                    }
                } catch (e) {
                    console.log('Received text:', event.data);
                }
            }
        };

        ws.onerror = (e) => {
            console.error('WebSocket Error:', e);
            setStatus('Error');
            setIsListening(false);
        };

        ws.onclose = () => {
            console.log('Voice Socket Closed');
            setStatus('Ready');
            setIsListening(false);
        };

        wsRef.current = ws;
    };

    const playNextAudioChunk = () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) return;

        isPlayingRef.current = true;
        const pcmData = audioQueueRef.current.shift()!;

        // Convert Int16 to Float32
        const float32Data = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            float32Data[i] = pcmData[i] / 32768.0;
        }

        const buffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000); // Assuming 24kHz response
        buffer.getChannelData(0).set(float32Data);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => {
            isPlayingRef.current = false;
            playNextAudioChunk();
        };
        source.start();
    };

    const startRecording = async () => {
        try {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                initWebSocket();
                // Wait for connection... logic simplified for prototype
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Init Audio Context (24kHz recommended for Gemini, or 16kHz)
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass({ sampleRate: 16000 }); // 16kHz capture

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const source = audioContextRef.current.createMediaStreamSource(stream);
            // Buffer size 2048 or 4096
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
                if (!isListening) return;

                const inputData = e.inputBuffer.getChannelData(0); // Float32
                // Downsample/Convert to Int16
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    let s = Math.max(-1, Math.min(1, inputData[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                // Send to WS
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(pcm16.buffer);
                }
            };

            source.connect(processor);
            processor.connect(audioContextRef.current.destination);

            processorRef.current = processor;
            setIsListening(true);
            setStatus('Listening...');

        } catch (err) {
            console.error("Error starting audio:", err);
            setStatus('Mic Error');
        }
    };

    const stopRecording = () => {
        // Stop UI
        setIsListening(false);
        setStatus('Processing...');

        // Stop Audio Capture
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (wsRef.current) {
            // Signal end of turn, sending the ACTUAL sample rate used
            const actualSampleRate = audioContextRef.current?.sampleRate || 16000;
            console.log("Committing audio with Sample Rate:", actualSampleRate);
            wsRef.current.send(JSON.stringify({
                type: 'commit',
                sampleRate: actualSampleRate
            }));
        }
    };

    const toggleListening = () => {
        if (isListening) {
            stopRecording();
        } else {
            setIsListening(true); // Immediate UI update
            startRecording();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            {status !== 'Ready' && (
                <div className="bg-black/80 text-white px-3 py-1 rounded-full text-xs font-mono backdrop-blur-md mb-2 animate-fade-in border border-white/10">
                    {status}
                </div>
            )}

            <button
                onClick={toggleListening}
                className={`p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${isListening
                    ? 'bg-red-500 animate-pulse ring-4 ring-red-500/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 ring-4 ring-indigo-500/0 hover:ring-indigo-500/20'
                    }`}
            >
                {isListening ? (
                    <Activity className="w-8 h-8 text-white animate-bounce" />
                ) : (
                    <Mic className="w-8 h-8 text-white" />
                )}
            </button>
        </div>
    );
};
