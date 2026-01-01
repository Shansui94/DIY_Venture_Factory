import React from 'react';
import { MACHINES } from '../data/factoryData';

const MachineLabels: React.FC = () => {
    // Standard A4 dimensions in pixels (approximate for screen display)
    const qrStyles = (text: string) => `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(text)}`;

    return (
        <div className="bg-gray-100 min-h-screen p-8 print:p-0">
            <div className="max-w-4xl mx-auto space-y-12 print:space-y-0">
                {MACHINES.map((machine) => (
                    <div
                        key={machine.id}
                        className="bg-white p-12 shadow-2xl rounded-3xl border-8 border-blue-600 flex flex-col items-center justify-between aspect-[1/1.414] mb-12 print:mb-0 print:shadow-none print:border-8 print:rounded-none page-break-after-always"
                        style={{ height: 'calc(100vh - 4rem)', maxHeight: '1120px' }}
                    >
                        {/* Header */}
                        <div className="text-center w-full">
                            <h1 className="text-6xl font-black text-blue-700 tracking-tighter mb-4">
                                PACK SECURE
                            </h1>
                            <div className="h-1.5 w-full bg-blue-600 rounded-full mb-8"></div>

                            <h2 className="text-4xl font-bold text-gray-800 mb-2">
                                MACHINE STATION
                            </h2>
                            <p className="text-7xl font-black text-gray-900 uppercase">
                                {machine.name}
                            </p>
                        </div>

                        {/* QR CODE */}
                        <div className="flex-1 flex items-center justify-center w-full">
                            <div className="p-4 border-[12px] border-gray-900 rounded-6xl bg-white shadow-xl">
                                <img
                                    src={qrStyles(machine.id)}
                                    alt={`QR for ${machine.id}`}
                                    className="w-[450px] h-[450px]"
                                />
                            </div>
                        </div>

                        {/* Footer & Instructions */}
                        <div className="text-center w-full">
                            <div className="bg-blue-600 text-white py-6 px-12 rounded-2xl mb-8">
                                <p className="text-4xl font-bold tracking-widest uppercase mb-1">
                                    SCAN FOR CHECK-IN / CHECK-OUT
                                </p>
                                <p className="text-xl opacity-90 uppercase font-mono">
                                    Device ID: {machine.id}
                                </p>
                            </div>

                            <div className="flex justify-between items-center text-gray-400 text-sm font-bold uppercase tracking-widest">
                                <span>Taiping / Nilai Production Line</span>
                                <div className="flex gap-4">
                                    <span>v3.0</span>
                                    <span>PackSecure Standard</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Print Button - Hidden on print */}
            <div className="fixed bottom-8 right-8 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold shadow-2xl hover:bg-blue-700 transition-all flex items-center gap-2 text-xl"
                >
                    <span>Print All Labels (A4)</span>
                </button>
            </div>

            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        -webkit-print-color-adjust: exact;
                    }
                    .page-break-after-always {
                        page-break-after: always;
                        height: 100vh !important;
                        margin: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default MachineLabels;
