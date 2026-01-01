import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
    AlertCircle, Database,
    Clock, CheckCircle, Factory, Settings, User, AlertTriangle
} from 'lucide-react';
import { JobOrder, Recipe } from '../types';
import { PRODUCT_LAYERS, PRODUCT_MATERIALS, PACKAGING_COLORS, PRODUCT_SIZES } from '../data/constants';
import { getRecipesByProduct, getItemBySku } from '../services/productionService';
import { MACHINES } from '../data/factoryData';
import { getRecommendedPackaging } from '../utils/packagingRules';

interface JobOrdersProps {
    jobs: JobOrder[];
    onCreateJob: (jobData: any) => void;
    onReorderJobs: (items: JobOrder[]) => void;
}

// Kanban Column Definition
const COLUMNS = [
    { id: 'Backlog', title: 'New Requests', icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { id: 'Scheduled', title: 'Scheduled', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'Production', title: 'In Production', icon: Factory, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { id: 'Completed', title: 'Completed', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
];

const JobOrders: React.FC<JobOrdersProps> = ({ jobs, onCreateJob, onReorderJobs }) => {
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedOrderToAssign, setSelectedOrderToAssign] = useState<JobOrder | null>(null);
    const [assignData, setAssignData] = useState({ machine: '', priority: 'Normal' });

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newJobData, setNewJobData] = useState({
        customer: '',
        location: '',
        layer: '',
        material: '',
        packaging: '',
        size: '',
        target: '',
        machine: '',
        priority: 'Normal',
        recipeId: ''
    });

    // Recipes State
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loadingRecipes, setLoadingRecipes] = useState(false);

    // Auto-select packaging color based on rules
    React.useEffect(() => {
        const { layer, material, size } = newJobData;
        if (layer && material && size) {
            const recommended = getRecommendedPackaging(
                layer as any,
                material as any,
                size as any
            );
            if (recommended) {
                setNewJobData(prev => ({ ...prev, packaging: recommended }));
            }
        }
    }, [newJobData.layer, newJobData.material, newJobData.size]);

    // Fetch recipes when product details change
    React.useEffect(() => {
        const { layer, size, material, packaging } = newJobData;
        if (layer && size && material && packaging) {
            const fetchRecipes = async () => {
                setLoadingRecipes(true);
                setRecipes([]);
                try {
                    const layerCode = PRODUCT_LAYERS.find(l => l.value === layer)?.code;
                    const widthCode = PRODUCT_SIZES.find(s => s.value === size)?.code;
                    const matCode = PRODUCT_MATERIALS.find(m => m.value === material)?.code;
                    const bagCode = PACKAGING_COLORS.find(p => p.value === packaging)?.code;
                    const sku = `BW-${layerCode}${widthCode}-${matCode}-${bagCode}`;

                    const item = await getItemBySku(sku);

                    if (item && item.id) {
                        const recipesData = await getRecipesByProduct(item.id);
                        setRecipes(recipesData);
                        const defaultRecipe = recipesData.find(r => r.is_default);
                        if (defaultRecipe) {
                            setNewJobData(prev => ({ ...prev, recipeId: defaultRecipe.id }));
                        }
                    }
                } catch (err) {
                    console.error("Error fetching recipes", err);
                } finally {
                    setLoadingRecipes(false);
                }
            };
            fetchRecipes();
        } else {
            setRecipes([]);
        }
    }, [newJobData.layer, newJobData.size, newJobData.material, newJobData.packaging]);


    // -- LOGIC: Categorize Jobs by Status --
    const columns = useMemo(() => {
        const cols: Record<string, JobOrder[]> = {
            Backlog: [],
            Scheduled: [],
            Production: [],
            Completed: []
        };

        jobs.forEach(job => {
            // Map legacy statuses if needed
            let status = job.status || 'Pending';
            if (status === 'Pending') status = 'Backlog'; // Remap Pending to Backlog visually
            if (status === 'Paused') status = 'Scheduled'; // Treat Paused as Scheduled for now

            if (cols[status]) {
                cols[status].push(job);
            } else {
                // Fallback for unknown status
                cols['Backlog'].push(job);
            }
        });

        return cols;
    }, [jobs]);

    const getMachineName = (id: string) => MACHINES.find(m => m.id === id)?.name || id;

    // -- DRAG & DROP HANDLER --
    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const job = jobs.find(j => (j.Job_ID || j.id) === draggableId);
        if (!job) return;

        const targetStatus = destination.droppableId;

        // Logic for changing status
        // 1. Moving to 'Scheduled' or 'Production' requires a Machine
        if ((targetStatus === 'Scheduled' || targetStatus === 'Production') && !job.machine && targetStatus !== source.droppableId) {
            // Trigger Modal
            setSelectedOrderToAssign(job);
            setShowAssignModal(true);
            return; // We handle the actual update in the modal confirm
        }

        // 2. Standard Move (Optimistic Update)
        const updatedJobs = jobs.map(j => {
            if ((j.Job_ID || j.id) === draggableId) {
                // Map visual column back to data status
                let newStatus = targetStatus;
                if (targetStatus === 'Backlog') newStatus = 'Pending';

                return { ...j, status: newStatus as any };
            }
            return j;
        });

        onReorderJobs(updatedJobs);
    };

    // -- ASSIGN MACHINE HANDLER --
    const handleConfirmAssign = () => {
        if (!assignData.machine || !selectedOrderToAssign) return;

        const updatedJobs = jobs.map(j => {
            if ((j.Job_ID || j.id) === (selectedOrderToAssign.Job_ID || selectedOrderToAssign.id)) {
                return {
                    ...j,
                    machine: assignData.machine,
                    status: 'Scheduled' as any, // Move to scheduled
                    Priority: assignData.priority as any
                };
            }
            return j;
        });

        onReorderJobs(updatedJobs);
        setShowAssignModal(false);
        setAssignData({ machine: '', priority: 'Normal' });
        setSelectedOrderToAssign(null);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Validation... (Simplified for brevity, similar to previous)
        // Generate Standardized SKU
        const layerCode = PRODUCT_LAYERS.find(l => l.value === newJobData.layer)?.code;
        const widthCode = PRODUCT_SIZES.find(s => s.value === newJobData.size)?.code;
        const matCode = PRODUCT_MATERIALS.find(m => m.value === newJobData.material)?.code;
        const bagCode = PACKAGING_COLORS.find(p => p.value === newJobData.packaging)?.code;
        const productSKU = `BW-${layerCode}${widthCode}-${matCode}-${bagCode}`;

        onCreateJob({
            product: productSKU,
            Product_SKU: productSKU, // Keep alias for safety
            Target_Qty: parseInt(newJobData.target),
            Assigned_To: 'Machine',
            Priority: newJobData.priority,
            Machine_ID: newJobData.machine || 'Unassigned', // Allow unassigned creation
            Customer: newJobData.customer,
            Location: newJobData.location,
            recipeId: newJobData.recipeId,
            status: newJobData.machine ? 'Scheduled' : 'Pending' // Auto-status
        });
        setShowCreateModal(false);
        setNewJobData({ customer: '', location: '', layer: '', material: '', packaging: '', size: '', target: '', machine: '', priority: 'Normal', recipeId: '' });
    };

    return (
        <div className="space-y-6 animate-fade-in h-[calc(100vh-140px)] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Database className="text-blue-500" /> Job Orders Board
                    </h2>
                    <p className="text-gray-400 text-sm">Drag and drop cards to manage production flow</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20"
                    >
                        + New Job
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                    <div className="flex gap-6 h-full min-w-[1000px]">
                        {COLUMNS.map(col => (
                            <div key={col.id} className="flex-1 min-w-[300px] flex flex-col bg-gray-800/30 border border-gray-700/50 rounded-2xl backdrop-blur-sm">
                                {/* Column Header */}
                                <div className={`p-4 border-b border-gray-700/50 flex justify-between items-center rounded-t-2xl ${col.bg}`}>
                                    <div className={`font-bold flex items-center gap-2 ${col.color}`}>
                                        <col.icon size={18} />
                                        {col.title}
                                    </div>
                                    <span className="bg-gray-900/50 text-gray-400 text-xs px-2 py-1 rounded-full font-mono">
                                        {columns[col.id]?.length || 0}
                                    </span>
                                </div>

                                {/* Droppable Area */}
                                <Droppable droppableId={col.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={`flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar transition-colors ${snapshot.isDraggingOver ? 'bg-white/5' : ''}`}
                                        >
                                            {columns[col.id]?.map((job, index) => (
                                                <Draggable
                                                    key={job.Job_ID || job.id}
                                                    draggableId={job.Job_ID || job.id || 'unknown'}
                                                    index={index}
                                                >
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`
                                                                group bg-gray-800 border p-4 rounded-xl shadow-sm hover:shadow-lg transition-all
                                                                ${snapshot.isDragging ? 'border-blue-500 ring-2 ring-blue-500/20 rotate-2 z-50' : 'border-gray-700 hover:border-gray-500'}
                                                            `}
                                                            style={provided.draggableProps.style}
                                                        >
                                                            {/* Card Header: Product & Priority */}
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <div className="font-bold text-white text-base leading-tight">
                                                                        {job.product || job.Product_SKU || 'Unknown Product'}
                                                                    </div>
                                                                    <div className="text-xs text-gray-400 mt-0.5">
                                                                        {job.Job_ID || job.id}
                                                                    </div>
                                                                </div>
                                                                {job.Priority === 'High' && (
                                                                    <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                                                        <AlertTriangle size={10} /> URGENT
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Card Body: Progress & Machine */}
                                                            <div className="space-y-3">
                                                                {/* Progress Bar */}
                                                                <div>
                                                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                                        <span>Progress</span>
                                                                        <span className="text-white font-mono">{Math.round(((job.produced || 0) / (job.target || job.Target_Qty || 1)) * 100)}%</span>
                                                                    </div>
                                                                    <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full transition-all duration-500 ${col.id === 'Completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                                                                            style={{ width: `${Math.min(100, ((job.produced || 0) / (job.target || job.Target_Qty || 1)) * 100)}%` }}
                                                                        />
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                                                                        <span>{job.produced || 0} produced</span>
                                                                        <span>Target: {job.target || job.Target_Qty}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Info Badges */}
                                                                <div className="flex items-center gap-2 pt-2 border-t border-gray-700/50">
                                                                    {job.machine && (
                                                                        <div className="bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded flex items-center gap-1.5">
                                                                            <Settings size={12} className="text-blue-400" />
                                                                            {getMachineName(job.machine)}
                                                                        </div>
                                                                    )}
                                                                    <div className="bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded flex items-center gap-1.5">
                                                                        <User size={12} className="text-orange-400" />
                                                                        {job.customer?.split(' ')[0] || 'Client'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                </div>
            </DragDropContext>

            {/* -- MODALS (Reused Logic) -- */}
            {/* Assign Machine Modal */}
            {showAssignModal && selectedOrderToAssign && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-1">Assign Machine</h3>
                        <p className="text-xs text-gray-500 mb-6">Order: {selectedOrderToAssign.Job_ID || selectedOrderToAssign.id}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">SELECT MACHINE</label>
                                <select
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                                    value={assignData.machine}
                                    onChange={e => setAssignData({ ...assignData, machine: e.target.value })}
                                >
                                    <option value="">-- Choose Machine --</option>
                                    {MACHINES.map(m => <option key={m.id} value={m.id}>{m.name} ({m.status})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">PRIORITY</label>
                                <select
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                                    value={assignData.priority}
                                    onChange={e => setAssignData({ ...assignData, priority: e.target.value })}
                                >
                                    <option value="Normal">Normal</option>
                                    <option value="High">High (Urgent)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setShowAssignModal(false)} className="flex-1 py-2 rounded text-gray-400 hover:bg-gray-800">Cancel</button>
                            <button onClick={handleConfirmAssign} className="flex-1 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-500">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Job Modal (Same as before but ensures consistent styling) */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h3 className="text-xl font-bold text-white mb-6">Create New Job</h3>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            {/* ... Fields ... */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">CUSTOMER</label>
                                <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                                    value={newJobData.customer} onChange={e => setNewJobData({ ...newJobData, customer: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">LOCATION</label>
                                <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                                    value={newJobData.location} onChange={e => setNewJobData({ ...newJobData, location: e.target.value })} />
                            </div>

                            {/* Product Selection Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">Layer</label>
                                    <select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
                                        value={newJobData.layer} onChange={e => setNewJobData({ ...newJobData, layer: e.target.value })} required>
                                        <option value="">Select</option>
                                        {PRODUCT_LAYERS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">Size</label>
                                    <select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
                                        value={newJobData.size} onChange={e => setNewJobData({ ...newJobData, size: e.target.value })} required>
                                        <option value="">Select</option>
                                        {PRODUCT_SIZES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">Material</label>
                                    <select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
                                        value={newJobData.material} onChange={e => setNewJobData({ ...newJobData, material: e.target.value })} required>
                                        <option value="">Select</option>
                                        {PRODUCT_MATERIALS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">Packing</label>
                                    <select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm"
                                        value={newJobData.packaging} onChange={e => setNewJobData({ ...newJobData, packaging: e.target.value })} required>
                                        <option value="">Select</option>
                                        {PACKAGING_COLORS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">TARGET QTY (Rolls)</label>
                                    <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                                        value={newJobData.target} onChange={e => setNewJobData({ ...newJobData, target: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">RECIPE</label>
                                    <select
                                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                                        value={newJobData.recipeId}
                                        onChange={e => setNewJobData({ ...newJobData, recipeId: e.target.value })}
                                        disabled={loadingRecipes}
                                    >
                                        <option value="">{loadingRecipes ? 'Loading...' : '-- Auto Select --'}</option>
                                        {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">INITIAL STATUS</label>
                                <select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                                    value={newJobData.machine} onChange={e => setNewJobData({ ...newJobData, machine: e.target.value })}>
                                    <option value="">Backlog (Unassigned)</option>
                                    {MACHINES.map(m => <option key={m.id} value={m.id}>Assign to: {m.name}</option>)}
                                </select>
                            </div>

                            <div className="flex gap-3 mt-8 pt-4 border-t border-gray-800">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2 rounded text-gray-400 hover:bg-gray-800">Cancel</button>
                                <button type="submit" className="flex-1 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-500">Create Job</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobOrders;
