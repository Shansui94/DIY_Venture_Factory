import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, CheckCircle, Clock } from 'lucide-react';
import { JobOrder } from '../types';
import { MACHINES } from '../data/factoryData';
import { PRODUCT_LAYERS, PRODUCT_MATERIALS, PACKAGING_COLORS, PRODUCT_SIZES } from '../data/constants';
import { getRecommendedPackaging } from '../utils/packagingRules';

interface JobFeedProps {
    jobs: JobOrder[];
    onCreateJob: (jobData: any) => void;
    onUpdateJob: (jobId: string, updates: Partial<JobOrder>) => void;
}

const JobFeed: React.FC<JobFeedProps> = ({ jobs, onCreateJob, onUpdateJob }) => {
    const [selectedMachine, setSelectedMachine] = useState<string>(MACHINES[0]?.id || 'M01');

    // Structured Form State
    const [form, setForm] = useState({
        layer: 'Single',
        size: '50cm',
        material: 'Clear',
        packaging: 'Orange',
        target: 70,
        input: '' // Optional remark
    });

    // Auto-Select Packaging Color
    useEffect(() => {
        const recommended = getRecommendedPackaging(
            form.layer as any,
            form.material as any,
            form.size as any
        );
        if (recommended && recommended !== form.packaging) {
            setForm(prev => ({ ...prev, packaging: recommended }));
        }
    }, [form.layer, form.material, form.size]);

    const feedEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [jobs, selectedMachine]);

    const filteredJobs = jobs.filter(j => j.machine === selectedMachine || (!j.machine && selectedMachine === 'Unassigned'));

    // --- SUBMISSION LOGIC ---
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Check for System Commands in Text Input
        const lowerInput = form.input.toLowerCase();
        let isSystemEvent = false;
        if (lowerInput.includes('buka') || lowerInput.includes('tutup') || lowerInput.includes('machine')) {
            isSystemEvent = true;
        }

        let newJob: any = {
            Job_ID: `CMD-${Date.now()}`,
            machine: selectedMachine,
            created_at: new Date().toISOString(),
            originalText: form.input,
            status: 'Pending',
            Priority: 'Normal',
            produced: 0
        };

        if (isSystemEvent) {
            newJob = {
                ...newJob,
                type: 'System',
                product: 'System Event',
                notes: form.input,
                target: 0
            };
        } else {
            // Production Job Construction
            // Generate SKU/Description
            const layerLabel = PRODUCT_LAYERS.find(l => l.value === form.layer)?.label.split(' ')[0] || form.layer;
            const matLabel = PRODUCT_MATERIALS.find(m => m.value === form.material)?.label.split(' ')[0] || form.material;
            const sizeLabel = PRODUCT_SIZES.find(s => s.value === form.size)?.label || form.size;

            // Format: "Single Black 50cm (Orange)"
            const productDesc = `${layerLabel} ${matLabel} ${sizeLabel}`;

            newJob = {
                ...newJob,
                type: 'Production',
                product: productDesc,
                target: form.target,
                notes: form.input
            };
        }

        onCreateJob(newJob);
        // Reset only input, maybe keep config?
        setForm(prev => ({ ...prev, input: '' }));
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-gradient-to-br from-gray-900 to-[#0c0c0e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            {/* 1. HEADER: Glassmorphism */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gray-900/80 backdrop-blur-md border-b border-white/5 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-900/30">
                        {selectedMachine.replace('Machine ', '')}
                    </div>
                    <div>
                        <div className="relative group">
                            <select
                                value={selectedMachine}
                                onChange={e => setSelectedMachine(e.target.value)}
                                className="appearance-none bg-transparent text-white font-bold text-2xl outline-none cursor-pointer pr-8 z-10 relative"
                            >
                                {MACHINES.map(m => (
                                    <option key={m.id} value={m.id} className="bg-gray-800 text-gray-200">
                                        {m.name}
                                    </option>
                                ))}
                            </select>
                            {/* Custom caret */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                <Settings size={16} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs text-green-400 font-medium tracking-wide">OPERATIONAL</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. FEED AREA */}
            <div className="flex-1 overflow-y-auto p-4 pt-24 pb-48 space-y-8 scroll-smooth" id="feed-container">
                {/* Date Divider */}
                <div className="flex items-center justify-center sticky top-20 z-0 opacity-80">
                    <span className="text-[10px] font-bold text-gray-400 bg-black/40 backdrop-blur-sm border border-white/5 px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                        Today, {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                </div>

                {filteredJobs.length === 0 && (
                    <div className="text-center mt-32 opacity-50">
                        <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Send size={32} className="text-white/20 ml-1" />
                        </div>
                        <p className="text-gray-400 text-lg font-medium">No activity yet</p>
                        <p className="text-xs text-gray-600 mt-1">Start production by sending a command below</p>
                    </div>
                )}

                {filteredJobs.map((job) => (
                    <div key={job.Job_ID || job.id} className={`flex ${job.type === 'System' ? 'justify-center' : 'justify-start'} animate-fade-in-up`}>
                        {/* SYSTEM EVENT (Center Capsule) */}
                        {job.type === 'System' && (
                            <div className="bg-gray-800/60 backdrop-blur border border-white/5 rounded-full px-6 py-2 text-center shadow-lg transform hover:scale-105 transition-transform cursor-default">
                                <span className="text-[10px] font-bold text-gray-500 mr-3">{new Date(job.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-sm text-gray-200 font-medium tracking-wide">{job.notes || job.product}</span>
                            </div>
                        )}

                        {/* PRODUCTION JOB (Modern Card) */}
                        {(!job.type || job.type === 'Production') && (
                            <div className="max-w-[85%] md:max-w-[70%] group relative pl-4">
                                {/* Timeline Line */}
                                <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-700 to-transparent group-hover:via-indigo-500/50 transition-colors"></div>
                                <div className="absolute left-[-4px] top-6 w-2 h-2 rounded-full bg-gray-700 border-2 border-gray-900 group-hover:bg-indigo-500 transition-colors"></div>

                                <div className="bg-gradient-to-br from-[#1e1e24] to-[#15151a] border border-white/5 rounded-2xl p-5 shadow-xl hover:shadow-2xl hover:border-indigo-500/20 transition-all duration-300">
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col">
                                            <h4 className="text-xl font-bold text-white tracking-tight">{job.product}</h4>
                                            {job.notes && <p className="text-sm text-gray-500 italic mt-1">"{job.notes}"</p>}
                                        </div>
                                        <span className="text-[10px] text-gray-600 font-mono bg-black/20 px-2 py-1 rounded">
                                            {job.created_at ? new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold">Target</div>
                                            <div className="text-lg font-mono font-bold text-indigo-400">{job.target} <span className="text-xs text-gray-600">Rolls</span></div>
                                        </div>
                                        <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold">Status</div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                {job.status === 'Completed'
                                                    ? <span className="text-green-500 font-bold text-sm flex items-center gap-1"><CheckCircle size={14} /> Done</span>
                                                    : <span className="text-orange-400 font-bold text-sm flex items-center gap-1"><Clock size={14} className="animate-pulse" /> Pending</span>
                                                }
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    {job.status !== 'Completed' && (
                                        <div className="pt-3 border-t border-white/5 flex justify-end">
                                            <button
                                                onClick={() => onUpdateJob(job.Job_ID, { status: 'Completed', produced: job.target })}
                                                className="bg-white/5 hover:bg-green-600 hover:text-white text-gray-400 text-xs font-bold px-4 py-2 rounded-lg border border-white/10 hover:border-transparent transition-all flex items-center gap-2 group/btn"
                                            >
                                                <CheckCircle size={14} className="group-hover/btn:scale-110 transition-transform" />
                                                Mark as Complete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={feedEndRef} />
            </div>

            {/* 3. FLOAT INPUT ISLAND */}
            <div className="absolute bottom-6 left-4 right-4 z-20">
                <div className="bg-gray-800/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl ring-1 ring-black/50">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Selector Row */}
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { val: form.layer, set: (v: string) => setForm({ ...form, layer: v }), opts: ['Single', 'Double'], variant: 'blue' },
                                { val: form.size, set: (v: string) => setForm({ ...form, size: v }), opts: PRODUCT_SIZES.map(s => s.value), labels: PRODUCT_SIZES.map(s => s.label), variant: 'purple' },
                                { val: form.material, set: (v: string) => setForm({ ...form, material: v }), opts: PRODUCT_MATERIALS.map(m => m.value), labels: PRODUCT_MATERIALS.map(m => m.label), variant: 'pink' },
                                { val: form.packaging, set: (v: string) => setForm({ ...form, packaging: v }), opts: PACKAGING_COLORS.map(p => p.value), labels: PACKAGING_COLORS.map(p => p.label), variant: 'orange' }
                            ].map((field, idx) => (
                                <div key={idx} className="relative">
                                    <select
                                        value={field.val}
                                        onChange={(e) => field.set(e.target.value)}
                                        className={`w-full bg-gray-900/50 border border-gray-600 text-white text-xs font-bold rounded-xl px-3 py-3 appearance-none focus:ring-2 focus:ring-${field.variant}-500 focus:border-transparent transition-all cursor-pointer hover:bg-gray-800`}
                                    >
                                        {field.opts.map((opt, i) => (
                                            <option key={opt} value={opt}>{field.labels ? field.labels[i] : opt}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Row */}
                        <div className="flex gap-3">
                            <div className="relative w-32 shrink-0 group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <span className="text-gray-500 font-bold text-[10px] uppercase tracking-wider group-focus-within:text-indigo-400 transition-colors">Qty</span>
                                </div>
                                <input
                                    type="number"
                                    value={form.target}
                                    onChange={(e) => setForm({ ...form, target: parseInt(e.target.value) || 0 })}
                                    className="block w-full pl-10 bg-gray-900 border border-gray-600 text-white rounded-xl py-3 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                                    placeholder="0"
                                />
                            </div>

                            <input
                                type="text"
                                value={form.input}
                                onChange={(e) => setForm({ ...form, input: e.target.value })}
                                placeholder="Add a note or system command..."
                                className="flex-1 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-600 shadow-inner"
                            />

                            <button
                                type="submit"
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl px-6 py-2 shadow-lg shadow-blue-900/30 transform active:scale-95 transition-all flex items-center justify-center"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default JobFeed;
