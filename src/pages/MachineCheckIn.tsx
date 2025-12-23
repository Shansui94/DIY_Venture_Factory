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

        // @yudiel/react-qr-scanner returns an array of results or a single object depending on version. 
        // We'll handle the raw value.
        const rawValue = result && result.length ? result[0].rawValue : (result?.rawValue || result);

        if (!rawValue) return;

        console.log("Scanned:", rawValue);
        setIsPaused(true); // Pause scanning immediately to prevent duplicate triggers

        const machine = MACHINES.find(m => m.id === rawValue);

        if (machine) {
            try {
                setIsCheckingIn(true);
                setScanError('');
                await onCheckIn(machine.id);
                // Success - parent will unmount this component
            } catch (err: any) {
                console.error("Check-in failed:", err);
                setIsCheckingIn(false);
                setIsPaused(false); // Resume scanning
                setScanError("Login Failed: " + err.message);
            }
        } else {
            setScanError(`Invalid Machine QR: ${rawValue}`);
            // Resume scanning after 2 seconds to allow user to read error
            setTimeout(() => {
                setScanError('');
                setIsPaused(false);
            }, 2000);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 text-center">
            <div className="mb-8 animate-fade-in-up">
                <div className="bg-blue-600/20 p-4 rounded-full inline-block mb-4 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                    <Scan size={48} className="text-blue-500" />
                </div>
                <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Machine Access</h1>
                <p className="text-gray-400">Scan station QR code to begin</p>
            </div>

            <div className="w-full max-w-sm relative">
                {/* Scanner Container */}
                <div className="bg-gray-800 p-1.5 rounded-3xl border border-gray-700 shadow-2xl relative overflow-hidden aspect-square flex flex-col group">

                    <div className="flex-1 rounded-2xl overflow-hidden relative bg-black">
                        <Scanner
                            onScan={handleScan}
                            onError={(error) => console.warn(error)}
                            components={{
                                audio: false,
                                onOff: false,
                                torch: true,
                                zoom: true,
                                finder: false, // We use our own custom finder CSS
                            }}
                            styles={{
                                container: { width: '100%', height: '100%' },
                                video: { objectFit: 'cover' }
                            }}
                            paused={isPaused}
                        />

                        {/* Custom Overlay / Finder */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                            {/* Corner Markers */}
                            <div className="w-64 h-64 relative opacity-80">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg drop-shadow-md"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg drop-shadow-md"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg drop-shadow-md"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg drop-shadow-md"></div>

                                {/* Scan Line Animation */}
                                {!isPaused && (
                                    <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan-line"></div>
                                )}
                            </div>
                        </div>

                        {/* Loading Overlay */}
                        {isCheckingIn && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
                                <RefreshCw size={48} className="text-green-500 animate-spin mb-4" />
                                <span className="text-white font-bold text-xl tracking-wide">Authenticating...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status / Error Message */}
                <div className={`mt-6 transition-all duration-300 transform ${scanError ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                    {scanError && (
                        <div className="flex items-center justify-center gap-3 bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl animate-shake">
                            <AlertTriangle size={20} className="shrink-0 text-red-500" />
                            <span className="text-sm font-bold">{scanError}</span>
                        </div>
                    )}
                </div>

                {/* Instructions */}
                {!scanError && (
                    <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-sm animate-pulse">
                        <Smartphone size={16} />
                        <span>Point camera at machine code</span>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scan-line {
                    0% { top: 10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan-line 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
            `}</style>
        </div>
    );
};

export default MachineCheckIn;
