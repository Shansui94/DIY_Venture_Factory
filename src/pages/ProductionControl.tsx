import React, { useState } from 'react';
import {
    PACKAGING_COLORS,
    PRODUCT_SIZES,
    PackagingColor,
    ProductSize,
    ProductLayer,
    ProductMaterial
} from '../types';
import { getRecommendedPackaging } from '../utils/packagingRules';
import { RotateCcw, Box, Settings, CheckCircle, Clock, Layers, Droplet, LogOut } from 'lucide-react';
import MachineCheckIn from './MachineCheckIn';

import { JobOrder, Recipe, ProductionLog } from '../types';
import { supabase } from '../services/supabase';
import { getRecipeById } from '../services/productionService';
import { MACHINES } from '../data/factoryData';

interface ProductionControlProps {
    user: any;
    jobs?: JobOrder[];
}

const ProductionControl: React.FC<ProductionControlProps> = ({ user, jobs = [] }) => {
    // State
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Machine Selection State (Persisted)
    const [selectedMachine, setSelectedMachine] = useState<string | null>(localStorage.getItem('selectedMachine'));

    // ... (other states remain)

    // Handle Check-In from QR
    const handleMachineCheckIn = async (machineId: string) => {
        // Simulate a small delay for effect or validation if needed
        await new Promise(resolve => setTimeout(resolve, 800));
        setSelectedMachine(machineId);
        localStorage.setItem('selectedMachine', machineId);
    };

    // Handle Log Out / Change Machine
    const handleChangeMachine = () => {
        // Direct exit for smoother UX
        setSelectedMachine(null);
        localStorage.removeItem('selectedMachine');
        setStep(1); // Reset flow
    };

    // If no machine selected, show QR Scanner
    if (!selectedMachine) {
        return <MachineCheckIn onCheckIn={handleMachineCheckIn} />;
    }

    // (Note: Machine name lookup for header display)
    const currentMachineName = MACHINES.find(m => m.id === selectedMachine)?.name || selectedMachine;

    // Active Job State
    const [activeJob, setActiveJob] = useState<JobOrder | null>(null);
    const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
    const [loadingRecipe, setLoadingRecipe] = useState(false);

    // Effect: Find Active Job for this Machine
    React.useEffect(() => {
        if (!jobs) return;
        const job = jobs.find(j =>
            (j.machine === selectedMachine || j.Machine_ID === selectedMachine) &&
            j.status === 'Production'
        );
        setActiveJob(job || null);
    }, [jobs, selectedMachine]);

    // Effect: Fetch Recipe if Job has recipeId
    React.useEffect(() => {
        if (activeJob && activeJob.recipeId) {
            setLoadingRecipe(true);
            getRecipeById(activeJob.recipeId)
                .then(recipe => setActiveRecipe(recipe))
                .catch(err => console.error("Failed to load recipe", err))
                .finally(() => setLoadingRecipe(false));
        } else {
            setActiveRecipe(null);
        }
    }, [activeJob?.recipeId]);

    // Recent Production Logs State
    const [recentLogs, setRecentLogs] = useState<ProductionLog[]>([]);

    // Effect: Listen to recent production logs for this user (Today's session)
    React.useEffect(() => {
        if (!user?.email) return;

        // Fetches last 20 logs from Supabase
        const fetchUserLogs = async () => {
            const { data } = await supabase
                .from('production_logs')
                .select('*')
                .eq('operator_email', user.email)
                .order('timestamp', { ascending: false })
                .limit(20);

            if (data) {
                const mapped: ProductionLog[] = data.map(log => ({
                    Log_ID: log.log_id,
                    Timestamp: log.timestamp,
                    Job_ID: log.job_id,
                    Operator_Email: log.operator_email,
                    Output_Qty: log.output_qty,
                    GPS_Coordinates: log.gps_coordinates || undefined,
                    Note: log.note || undefined,
                }));
                setRecentLogs(mapped);
            }
        };

        fetchUserLogs();

        // Subscribe to my new logs
        const myLogs = supabase.channel('my-logs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'production_logs', filter: `operator_email=eq.${user.email}` }, fetchUserLogs)
            .subscribe();

        return () => { supabase.removeChannel(myLogs); };
    }, [user?.email]);

    // --- STEP 1 HANDLERS ---
    const handleTypeSelect = (layer: ProductLayer, material: ProductMaterial) => {
        setSelectedLayer(layer);
        setSelectedMaterial(material);
        setStep(2);
    };

    // --- STEP 2 HANDLERS ---
    const handleSizeSelect = (size: ProductSize) => {
        setSelectedSize(size);
        // Auto-calculate packaging
        const pack = getRecommendedPackaging(selectedLayer, selectedMaterial, size);
        setDerivedPackaging(pack);
        setStep(3);
    };

    const completeProduction = async (qty: number) => {
        if (!derivedPackaging || !selectedSize || !user?.email) return;

        const count = qty;
        const variant = PRODUCT_SIZES.find(s => s.value === selectedSize);
        const rollsPerSet = variant?.rolls || 1;
        const totalRolls = count * rollsPerSet;

        // Construct SKU
        const layerCode = selectedLayer === 'Single' ? 'SL' : 'DL';
        const widthCode = variant?.code || '50';
        const matCode = selectedMaterial === 'Clear' ? 'CLR' : (selectedMaterial === 'Black' ? 'BLK' : 'SLV');
        const bagCode = PACKAGING_COLORS.find(p => p.value === derivedPackaging)?.code || 'ORG';

        const productSku = `PROD-BW-${layerCode}${widthCode}-${matCode}-${bagCode}`;

        try {
            // STEP 1: Resolve SKU to Item ID from Supabase
            let { data: itemData } = await supabase
                .from('items')
                .select('id, name')
                .eq('sku', productSku)
                .maybeSingle();

            // --- SELF-HEALING LOGIC (Simplified) ---
            if (!itemData) {
                console.log(`Product ${productSku} not found. Attempting Auto-Seed...`);
                // Create Item
                const productName = `Bubble Wrap ${selectedLayer} ${selectedMaterial} ${variant?.label} (${derivedPackaging})`;
                const { data: newItem, error: createError } = await supabase.from('items').insert({
                    sku: productSku,
                    name: productName,
                    type: 'product',
                    unit: 'roll'
                }).select().single();

                if (createError) {
                    alert(`Error creating product: ${createError.message}.`);
                    return;
                }
                itemData = newItem;
            }
            // ---------------------------

            if (!itemData) {
                alert(`Error: Product ${productSku} issue.`);
                return;
            }

            // STEP 2: Find Active Recipe (Favor Default)
            const { data: recipeData } = await supabase
                .from('recipes')
                .select('id, name')
                .eq('product_id', itemData.id)
                .eq('status', 'active')
                .eq('is_default', true) // Favor default
                .limit(1)
                .maybeSingle();

            // STEP 3: Execute RPC
            const recipeId = recipeData?.id || activeJob?.recipeId;

            const { error: rpcError } = await supabase.rpc('execute_production_run', {
                p_recipe_id: recipeId || null,
                p_quantity: totalRolls,
                p_reference_id: activeJob?.Job_ID || null
            });

            if (rpcError) {
                console.error(rpcError);
                alert(`Production Failed: ${rpcError.message}`);
                return;
            }

            // Done!
            setStep(1); // Auto reset for next batch

        } catch (error: any) {
            console.error("System Error:", error);
            alert("Unexpected Error: " + error.message);
        }
    };

    const resetFlow = () => {
        setStep(1);
        setSelectedLayer('Single');
        setSelectedMaterial('Clear');
        setSelectedSize(null);
        setDerivedPackaging(null);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6 animate-fade-in h-screen flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center bg-gray-800/80 p-4 rounded-xl border border-gray-700 shrink-0 backdrop-blur">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Settings className="text-blue-400" />
                        Production Control
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-400 text-xs">Connected to:</span>
                        <span className="text-green-400 font-bold bg-green-900/30 px-2 py-0.5 rounded text-sm border border-green-500/30">
                            {currentMachineName}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={resetFlow}
                        className="text-gray-400 hover:text-white flex items-center gap-2 text-sm px-3 py-1 rounded-lg hover:bg-gray-700"
                    >
                        <RotateCcw size={16} /> Reset
                    </button>
                    <div className="h-6 w-px bg-gray-700 mx-1"></div>
                    <button
                        onClick={handleChangeMachine}
                        className="text-red-400 hover:text-white flex items-center gap-2 text-sm px-3 py-1 rounded-lg hover:bg-red-900/50 transition-colors"
                    >
                        <LogOut size={16} /> Exit Stn
                    </button>
                </div>
            </div>

            {/* ACTIVE JOB BANNER */}
            {activeJob && (
                <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 p-4 rounded-xl animate-fade-in shrink-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-blue-300 font-bold flex items-center gap-2 text-xs uppercase tracking-wider">
                                <Clock size={14} /> Active Job: {activeJob.Job_ID}
                            </h3>
                            <p className="text-xl font-bold text-white mt-1">{activeJob.product}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-mono font-bold text-white">
                                {activeJob.produced} / <span className="text-gray-400 text-lg">{activeJob.target}</span>
                            </div>
                            <div className="w-32 bg-gray-700 h-1.5 rounded-full ml-auto mt-2 overflow-hidden">
                                <div className="bg-blue-500 h-full" style={{ width: `${Math.min(100, (activeJob.produced / activeJob.target) * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col justify-center min-h-0">

                {/* STEP 1: SELECT TYPE */}
                {step === 1 && (
                    <div className="space-y-4 animate-slide-up">
                        <h3 className="text-gray-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                            <Layers size={18} /> Step 1: Select Type
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            {/* Single Clear */}
                            <button
                                onClick={() => handleTypeSelect('Single', 'Clear')}
                                className="h-24 bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-white rounded-2xl flex flex-col items-center justify-center gap-2 group transition-all transform active:scale-95"
                            >
                                <span className="text-xl font-bold text-white group-hover:text-blue-200">Single Layer</span>
                                <span className="text-sm text-gray-400">Clear (Transparent)</span>
                            </button>

                            {/* Single Black */}
                            <button
                                onClick={() => handleTypeSelect('Single', 'Black')}
                                className="h-24 bg-gray-800 hover:bg-gray-900 border-2 border-gray-700 hover:border-gray-500 rounded-2xl flex flex-col items-center justify-center gap-2 group transition-all transform active:scale-95"
                            >
                                <span className="text-xl font-bold text-white group-hover:text-gray-200">Single Layer</span>
                                <span className="text-sm text-gray-500 group-hover:text-white">Black (Hitam)</span>
                            </button>

                            {/* Double Clear */}
                            <button
                                onClick={() => handleTypeSelect('Double', 'Clear')}
                                className="h-24 bg-blue-900/20 hover:bg-blue-900/40 border-2 border-blue-900/50 hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center gap-2 group transition-all transform active:scale-95"
                            >
                                <span className="text-xl font-bold text-blue-100">Double Layer</span>
                                <span className="text-sm text-blue-300">Clear (Transparent)</span>
                            </button>

                            {/* Double Black */}
                            <button
                                onClick={() => handleTypeSelect('Double', 'Black')}
                                className="h-24 bg-gray-800 hover:bg-gray-900 border-2 border-gray-600 hover:border-gray-400 rounded-2xl flex flex-col items-center justify-center gap-2 group transition-all transform active:scale-95"
                            >
                                <span className="text-xl font-bold text-gray-200">Double Layer</span>
                                <span className="text-sm text-gray-400 group-hover:text-white">Black (Hitam)</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: SELECT SIZE */}
                {step === 2 && (
                    <div className="space-y-4 animate-slide-up">
                        <div className="flex items-center gap-3 mb-2">
                            <button onClick={() => setStep(1)} className="text-gray-500 hover:text-white text-sm">← Back</button>
                            <h3 className="text-gray-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                <Box size={18} /> Step 2: Select Size
                            </h3>
                        </div>

                        {/* Info Banner */}
                        <div className="bg-gray-800/50 px-4 py-2 rounded-lg text-sm text-gray-300 flex gap-4 mb-4">
                            <span>Type: <strong>{selectedLayer} Layer</strong></span>
                            <span>Material: <strong>{selectedMaterial}</strong></span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {PRODUCT_SIZES.map(size => (
                                <button
                                    key={size.value}
                                    onClick={() => handleSizeSelect(size.value)}
                                    className="h-24 bg-gray-800 border-2 border-gray-700 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center gap-1 group transition-all active:scale-95 hover:bg-gray-700"
                                >
                                    <span className="text-2xl font-bold text-white">{size.label.split(' ')[0]}</span>
                                    <span className="text-xs text-gray-500 group-hover:text-gray-300">{size.rolls} rolls/set</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 3: CONFIRM & PACKAGING */}
                {step === 3 && derivedPackaging && (
                    <div className="flex flex-col h-full gap-4 animate-slide-up">
                        <div className="bg-gray-900 border border-gray-700 p-4 rounded-2xl shadow-2xl relative w-full flex-1 flex flex-col">

                            {/* Header / Back */}
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-gray-500 font-bold uppercase text-xs">Production Entry</h3>
                                <button onClick={() => setStep(2)} className="text-blue-400 text-xs hover:text-white underline">Change Size</button>
                            </div>

                            {/* PACKAGING INSTRUCTION - THE BIG FEATURE */}
                            <div className={`flex-1 rounded-xl flex flex-col items-center justify-center mb-4 transition-colors duration-500
                                ${PACKAGING_COLORS.find(c => c.value === derivedPackaging)?.class || 'bg-gray-700'}
                            `}>
                                <span className="text-white/80 text-sm uppercase tracking-widest font-bold mb-2">Use Packaging Bag</span>
                                <h1 className="text-5xl md:text-6xl font-black text-white drop-shadow-md text-center">
                                    {/* Handle naming override: Pink -> Red */}
                                    {derivedPackaging === 'Pink' ? 'RED (Merah)' :
                                        derivedPackaging === 'Orange' ? 'ORANGE (Oren)' :
                                            derivedPackaging === 'Green' ? 'GREEN (Hijau)' :
                                                derivedPackaging === 'Blue' ? 'BLUE (Biru)' :
                                                    derivedPackaging === 'Yellow' ? 'YELLOW (Kuning)' :
                                                        'TRANSPARENT'}
                                </h1>
                                <div className="mt-4 bg-black/20 px-4 py-1 rounded-full text-white text-sm font-mono">
                                    {selectedLayer} • {selectedMaterial} • {selectedSize}
                                </div>
                            </div>

                            {/* KEYPAD */}
                            <div className="grid grid-cols-3 gap-3">
                                {[1, 2, 3, 4, 5, 6].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => completeProduction(num)}
                                        className="h-16 bg-gray-800 hover:bg-white hover:text-black hover:border-white text-white text-2xl font-bold rounded-xl border border-gray-700 transition-all active:scale-95 shadow-lg"
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                            <p className="text-center text-[10px] text-gray-600 mt-3">Tap qty to confirm production immediately.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* LOGS (Collapsed or Small at bottom) */}
            <div className="bg-gray-900/50 border-t border-gray-800 p-2 -mx-4 -mb-4">
                <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2">
                    <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Recent:</span>
                    {recentLogs.length === 0 && <span className="text-xs text-gray-600 italic">No logs yet</span>}
                    {recentLogs.slice(0, 5).map(log => (
                        <div key={log.Log_ID} className="bg-gray-800 px-3 py-1 rounded-full border border-gray-700 flex items-center gap-2 shrink-0">
                            <span className="text-xs text-white font-bold">{log.Output_Qty}r</span>
                            <span className="text-[10px] text-gray-500">{new Date(log.Timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default ProductionControl;
