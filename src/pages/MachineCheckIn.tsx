import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Scan, AlertTriangle, RefreshCw, Smartphone } from 'lucide-react';
import { MACHINES } from '../data/factoryData';

interface MachineCheckInProps {
    onCheckIn: (machineId: string) => Promise<void>;
}

const MachineCheckIn: React.FC<MachineCheckInProps> = ({ onCheckIn }) => {
    const [scanError, setScanError] = useState<string>('');
    const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState(false);

    const handleScan = async (result: any) => {
        if (isCheckingIn || isPaused) return;

        console.log("Raw QR Scan Result:", result);

        // Extract raw value handling both v1 and v2 formats
        let rawValue = '';
        if (Array.isArray(result) && result.length > 0) {
            // v2.x returns an array of objects
            rawValue = result[0].rawValue || result[0].text || '';
        } else if (result && typeof result === 'object') {
            // v1.x or single object
            rawValue = result.rawValue || result.text || '';
        } else if (typeof result === 'string') {
            rawValue = result;
        }

        if (!rawValue) return;

        setIsPaused(true);

        // Robust matching: Check exact ID, or if ID ends with the raw value (e.g. "M03" matching "T1.1-M03")
        const machine = MACHINES.find(m =>
            m.id.toLowerCase() === rawValue.toLowerCase() ||
            m.id.toLowerCase().endsWith(rawValue.toLowerCase()) ||
            m.name.toLowerCase().includes(rawValue.toLowerCase())
        );

        if (machine) {
            try {
                setIsCheckingIn(true);
                setScanError('');
                await onCheckIn(machine.id);
            } catch (err: any) {
                console.error("Check-in failed:", err);
                setIsCheckingIn(false);
                setIsPaused(false);
                setScanError("Login Failed: " + (err.message || "Unknown Error"));
            }
        } else {
            // Display exactly what was scanned to help diagnostic
            setScanError(`Unknown Station: "${rawValue}"`);
            setTimeout(() => {
                setScanError('');
                setIsPaused(false);
            }, 3000);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-transparent p-4 text-center h-full">
            <div className="mb-6 animate-fade-in-up">
                <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 bg-cyan-500/30 blur-lg rounded-full"></div>
                    <div className="relative bg-black/40 p-4 rounded-full border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                        <Scan size={40} className="text-cyan-400" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Scanner Ready</h2>
                <p className="text-blue-300/60 text-sm">Align QR code within frame</p>
            </div>

            <div className="w-full max-w-[280px] relative">
                {/* Scanner Container */}
                <div className="bg-black/50 p-2 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden aspect-square flex flex-col group">

                    <div className="flex-1 rounded-2xl overflow-hidden relative bg-black">
                        <Scanner
                            onScan={handleScan}
                            onError={(error) => console.warn(error)}
                            components={{
                                onOff: false,
                                torch: true,
                                zoom: true,
                                finder: false,
                            }}
                            styles={{
                                container: { width: '100%', height: '100%' },
                                video: { objectFit: 'cover' }
                            }}
                            paused={isPaused}
                        />

                        {/* Custom Sci-Fi Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                            {/* Corner Markers */}
                            <div className="w-48 h-48 relative opacity-80">
                                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
                                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br-lg drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>

                                {/* Center Crosshair */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-cyan-500/30"></div>
                                    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-0.5 bg-cyan-500/30"></div>
                                </div>

                                {/* Scan Line Animation */}
                                {!isPaused && (
                                    <div className="absolute top-0 left-0 w-full h-0.5 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-scan-line"></div>
                                )}
                            </div>
                        </div>

                        {/* Loading Overlay */}
                        {isCheckingIn && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
                                <RefreshCw size={32} className="text-cyan-500 animate-spin mb-3" />
                                <span className="text-cyan-100 font-mono text-sm tracking-widest uppercase">Connecting...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status / Error Message */}
                <div className={`mt-4 absolute -bottom-16 left-0 right-0 transition-all duration-300 transform ${scanError ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'}`}>
                    {scanError && (
                        <div className="flex items-center justify-center gap-2 bg-red-900/80 backdrop-blur border border-red-500/50 text-red-200 px-3 py-2 rounded-lg animate-shake shadow-lg">
                            <AlertTriangle size={16} className="shrink-0 text-red-400" />
                            <span className="text-xs font-bold">{scanError}</span>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes scan-line {
                    0% { top: 5%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 95%; opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan-line 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
            `}</style>
        </div>
    );
};

export default MachineCheckIn;
