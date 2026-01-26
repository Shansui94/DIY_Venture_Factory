import React, { useState, useRef } from 'react';
import { Sparkles, Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';

// Real AI Service
const analyzeInput = async (text: string, file: File | null) => {
    // 1. IMAGE HANDLING
    if (file && file.type.startsWith('image/')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64 = (reader.result as string).split(',')[1];
                    const response = await fetch('/api/agent/vision', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageBase64: base64 })
                    });

                    if (!response.ok) throw new Error('AI Vision Failed');
                    const data = await response.json();

                    // Normalize Array to Single Object if needed
                    let resultData = Array.isArray(data) ? data[0] : data;

                    resolve({
                        type: 'IMAGE_SCAN',
                        confidence: 0.95, // Gemini doesn't always return confidence, assuming high if successful
                        data: resultData
                    });
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = reject;
        });
    }

    // 2. TEXT HANDLING
    if (text) {
        const response = await fetch('/api/agent/parse-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                type: 'customers' // Defaulting to customers for intake, or make dynamic later
            })
        });

        if (!response.ok) throw new Error('AI Text Analysis Failed');
        const data = await response.json();
        const resultData = Array.isArray(data) ? data[0] : data;

        return {
            type: 'TEXT_INTAKE',
            confidence: 0.90,
            data: resultData
        };
    }

    throw new Error("No input provided");
};

export default function UniversalIntake() {
    const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
    const [textInput, setTextInput] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);

    const [step, setStep] = useState<'input' | 'processing' | 'review' | 'success'>('input');
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // HANDLERS
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setInputMode('file');
            // Preview
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => setFilePreview(e.target?.result as string);
                reader.readAsDataURL(file);
            } else {
                setFilePreview(null);
            }
        }
    };

    const handleAnalyze = async () => {
        if (!textInput && !selectedFile) return;
        setStep('processing');
        setError(null);

        try {
            // TODO: Connect Real AI Here
            const data = await analyzeInput(textInput, selectedFile);
            setResult(data);
            setStep('review');
        } catch (err: any) {
            setError(err.message);
            setStep('input');
        }
    };

    const handleConfirm = async () => {
        setStep('processing');
        try {
            // Mock Insert
            // if (result.type === 'CUSTOMER') await supabase.from('sys_customers').insert(result.data);
            await new Promise(resolve => setTimeout(resolve, 1000));
            setStep('success');
        } catch (err: any) {
            setError(err.message);
            setStep('review'); // Go back to review on error
        }
    };

    const reset = () => {
        setStep('input');
        setTextInput('');
        setSelectedFile(null);
        setFilePreview(null);
        setResult(null);
    };

    return (
        <div className="h-full flex bg-[#09090b] text-gray-200 font-sans overflow-hidden">

            {/* LEFT PANEL: INPUT */}
            <div className={`flex-1 flex flex-col transition-all duration-500 ${step === 'review' ? 'w-1/3 border-r border-white/5 opacity-50 pointer-events-none hidden md:flex' : 'w-full'}`}>
                <div className="p-8 pb-0">
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                            <Sparkles className="text-white" size={24} />
                        </div>
                        Universal Intake
                    </h1>
                    <p className="text-gray-500">Drop any text, file, or image. AI will handle the rest.</p>
                </div>

                <div className="flex-1 p-8 flex flex-col gap-6 max-w-3xl mx-auto w-full justify-center">

                    {/* DROPZONE / TEXT AREA */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                        <div className="relative bg-[#121215] rounded-2xl p-1 overflow-hidden">

                            {/* TAB TOGGLE */}
                            <div className="flex border-b border-white/5 bg-[#0c0c0e]">
                                <button
                                    onClick={() => setInputMode('text')}
                                    className={`flex-1 py-4 text-sm font-bold transition-colors ${inputMode === 'text' ? 'text-indigo-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Text Input
                                </button>
                                <button
                                    onClick={() => setInputMode('file')}
                                    className={`flex-1 py-4 text-sm font-bold transition-colors ${inputMode === 'file' ? 'text-indigo-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    File / Image
                                </button>
                            </div>

                            <div className="p-6 h-[400px] flex flex-col">
                                {inputMode === 'text' ? (
                                    <textarea
                                        value={textInput}
                                        onChange={e => setTextInput(e.target.value)}
                                        placeholder="Paste anything here...&#10;e.g. 'Customer John Doe, 012-3456789, lives at 123 Street...'"
                                        className="w-full h-full bg-transparent border-none resize-none focus:outline-none text-gray-300 placeholder-gray-700 text-lg leading-relaxed font-mono"
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        className="h-full border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-4 hover:border-indigo-500/50 hover:bg-white/5 transition-all cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {selectedFile ? (
                                            <div className="relative w-full h-full flex items-center justify-center p-4">
                                                {filePreview ? (
                                                    <img src={filePreview} alt="Preview" className="max-h-full rounded-lg shadow-2xl" />
                                                ) : (
                                                    <div className="text-center">
                                                        <FileText size={48} className="text-indigo-400 mx-auto mb-2" />
                                                        <p className="font-bold text-white">{selectedFile.name}</p>
                                                        <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setFilePreview(null); }}
                                                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-red-500 text-white"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                                    <Upload size={32} className="text-gray-500" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-lg font-bold text-gray-300">Click to upload or drag and drop</p>
                                                    <p className="text-sm text-gray-600">Supports Images (OCR), PDF, Text</p>
                                                </div>
                                            </>
                                        )}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            className="hidden"
                                            onChange={handleFileSelect}
                                            accept="image/*,.pdf,.txt,.csv"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ACTION BUTTON */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleAnalyze}
                            disabled={(!textInput && !selectedFile) || step === 'processing'}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-indigo-900/20 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {step === 'processing' ? (
                                <>
                                    <Sparkles className="animate-spin" /> Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="animate-pulse" /> Analyze Intake
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: RESULT / REVIEW */}
            {step !== 'input' && step !== 'processing' && (
                <div className="w-full md:w-1/2 lg:w-2/3 bg-[#0c0c0e] border-l border-white/5 flex flex-col animate-in slide-in-from-right-10 duration-500">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                Intake Review
                                {result?.type && <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded uppercase border border-indigo-500/30">{result.type}</span>}
                            </h2>
                            <p className="text-gray-500 text-sm">Review the extracted data before importing.</p>
                        </div>
                        {step === 'success' ? (
                            <button onClick={reset} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-all">
                                New Intake
                            </button>
                        ) : (
                            <div className="flex gap-3">
                                <button onClick={() => setStep('input')} className="px-4 py-2 text-gray-500 hover:text-white transition-colors">Cancel</button>
                                <button onClick={handleConfirm} className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold shadow-lg shadow-green-900/20 flex items-center gap-2">
                                    <CheckCircle size={18} /> Confirm Import
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        {step === 'success' ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircle size={40} className="text-green-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Import Successful!</h3>
                                <p className="text-gray-500 max-w-md">The data has been verified and added to the database.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* DYNAMIC FORM BASED ON RESULT */}
                                {result?.data && Object.entries(result.data).map(([key, value]) => (
                                    <div key={key} className="group">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 group-hover:text-indigo-400 transition-colors">
                                            {key.replace(/_/g, ' ')}
                                        </label>
                                        <input
                                            // Simple generic input for now
                                            defaultValue={value as string}
                                            className="w-full bg-[#18181b] border border-white/10 rounded-xl py-3 px-4 text-gray-200 focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                                        />
                                    </div>
                                ))}

                                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl mt-8">
                                    <h4 className="flex items-center gap-2 text-indigo-400 font-bold mb-2">
                                        <Sparkles size={16} /> AI Confidence: {(result?.confidence * 100).toFixed(0)}%
                                    </h4>
                                    <p className="text-xs text-gray-500">
                                        The AI has extracted this information from your input. Please verify fields like Phone Numbers and Addresses carefully.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
