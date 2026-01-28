import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Truck, CheckCircle, Package, LogOut, ChevronRight, X } from 'lucide-react';
import { SalesOrder } from '../types';

interface DriverDeliveryProps {
    user: any;
    onLogout?: () => void;
}

const DriverDelivery: React.FC<DriverDeliveryProps> = ({ user, onLogout }) => {
    // State
    const [tasks, setTasks] = useState<SalesOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'todo' | 'done'>('todo');

    // NAIK BARANG (Load Items) State
    const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [loadItems, setLoadItems] = useState<any[]>([]); // Items to verify
    const [submitting, setSubmitting] = useState(false);

    // 1. Fetch Data
    const fetchTasks = async () => {
        setLoading(true);
        if (!user?.uid) return;

        try {
            // Fetch assigned orders with items
            const { data } = await supabase
                .from('sales_orders')
                .select('*')
                .eq('driver_id', user.uid)
                .neq('status', 'Cancelled')
                .order('order_date', { ascending: false });

            if (data) {
                // Map DB snake_case to TS camelCase
                const mapped = data.map((item: any) => ({
                    ...item,
                    orderNumber: item.order_number || item.orderNumber,
                    deliveryAddress: item.delivery_address || item.deliveryAddress,
                    zone: item.zone || item.delivery_zone
                }));

                // Client-side sort
                const sorted = mapped.sort((a: any, b: any) => {
                    // "New" or "Assigned" first (Need Loading)
                    // "Loaded" next
                    // "Delivered" last (handled by tab filter)
                    const statusA = a.status;
                    const statusB = b.status;

                    const getStatusPriority = (status: string) => {
                        if (status === 'Assigned' || status === 'New') return 1;
                        if (status === 'Loaded') return 2;
                        return 3; // Other statuses, including 'Delivered'
                    };

                    const priorityA = getStatusPriority(statusA);
                    const priorityB = getStatusPriority(statusB);

                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }

                    return (a.stop_sequence || 999) - (b.stop_sequence || 999);
                });
                setTasks(sorted);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [user]);

    // 2. Open Load Modal
    const handleOpenLoadModal = (order: SalesOrder) => {
        setSelectedOrder(order);
        // Deep copy items to allow editing quantity if needed (default same qty)
        setLoadItems(order.items?.map(i => ({ ...i, confirmedQty: i.quantity })) || []);
        setIsLoadModalOpen(true);
    };

    // 3. Submit Loading (Deduct Stock)
    const handleConfirmLoad = async () => {
        if (!selectedOrder) return;
        setSubmitting(true);

        try {
            // Check for Amendments
            const hasAmendments = loadItems.some(item => item.confirmedQty !== undefined && item.confirmedQty !== item.quantity);

            if (hasAmendments) {
                // 1. UPDATE ORDER with new quantities & Pending Approval Status
                // Map items to update quantities permanently
                const updatedItems = selectedOrder.items?.map(original => {
                    const match = loadItems.find(li => li.sku === original.sku && li.remark === original.remark);
                    return {
                        ...original,
                        quantity: match?.confirmedQty ?? original.quantity,
                        original_quantity: original.quantity // Keep track of original
                    };
                });

                await supabase.from('sales_orders').update({
                    status: 'Pending Approval',
                    items: updatedItems,
                    notes: (selectedOrder.notes || '') + ` | Amended by Driver: ${user?.name}`
                }).eq('id', selectedOrder.id);

                alert("⚠️ Order quantity changed. Sent to Vivian for Approval.");

            } else {
                // 2. NO AMENDMENTS - Proceed to Deduct & Deliver
                for (const item of loadItems) {
                    const qtyToDeduct = item.confirmedQty || item.quantity;
                    if (qtyToDeduct > 0) {
                        const { error } = await supabase.rpc('record_stock_movement', {
                            p_sku: item.sku,
                            p_qty: -qtyToDeduct, // Negative for OUT
                            p_event_type: 'Transfer Out',
                            p_ref_doc: selectedOrder.orderNumber,
                            p_notes: `Loaded by Driver: ${user?.name || 'Unknown'} `
                        });
                        if (error) throw error;
                    }
                }

                await supabase.from('sales_orders').update({
                    status: 'Delivered',
                    pod_timestamp: new Date().toISOString()
                }).eq('id', selectedOrder.id);

                alert("✅ Stock Deducted & Loaded!");
            }

            setIsLoadModalOpen(false);
            fetchTasks();

        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    // View Logic
    const todoList = tasks.filter(t => t.status !== 'Delivered' && t.status !== 'Cancelled');
    const doneList = tasks.filter(t => t.status === 'Delivered');
    const displayList = activeTab === 'todo' ? todoList : doneList;

    return (
        <div className="min-h-screen bg-black text-slate-200 pb-20 font-sans">
            {/* TOP BAR */}
            <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center">
                <div>
                    <img src="/packsecure-logo.jpg" alt="PackSecure" className="h-8 mb-1" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{user?.name || 'Unknown Driver'} • {tasks.length} Orders</p>
                </div>
                {onLogout && (
                    <button onClick={onLogout} className="p-2 bg-slate-900 rounded-full text-slate-400">
                        <LogOut size={16} />
                    </button>
                )}
            </div>

            {/* TABS */}
            <div className="p-4 flex gap-2">
                <button
                    onClick={() => setActiveTab('todo')}
                    className={`flex - 1 py - 3 rounded - xl font - black uppercase text - sm tracking - wider transition - all ${activeTab === 'todo' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-900 text-slate-500'
                        } `}
                >
                    Pending ({todoList.length})
                </button>
                <button
                    onClick={() => setActiveTab('done')}
                    className={`flex - 1 py - 3 rounded - xl font - black uppercase text - sm tracking - wider transition - all ${activeTab === 'done' ? 'bg-green-600/20 text-green-500 border border-green-500/30' : 'bg-slate-900 text-slate-500'
                        } `}
                >
                    Done ({doneList.length})
                </button>
            </div>

            {/* LIST */}
            <div className="px-4 space-y-4">
                {loading ? (
                    <div className="text-center py-10 text-slate-500 animate-pulse">Loading...</div>
                ) : displayList.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-800">
                        <Package size={40} className="mx-auto mb-3 text-slate-700" />
                        <h3 className="font-bold text-slate-500">No orders found.</h3>
                    </div>
                ) : (
                    displayList.map((order) => (
                        <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg relative">
                            {/* Status Strip */}
                            <div className={`absolute left - 0 top - 0 bottom - 0 w - 1.5 ${order.status === 'Delivered' ? 'bg-green-500' : 'bg-blue-500'} `} />

                            {/* Card Body */}
                            <div className="p-5 pl-7">
                                <div className="flex justify-between items-start mb-6">
                                    {/* Swapped: State is now main title, Customer is subtitle */}
                                    <h2 className="text-lg font-black text-white line-clamp-1">{order.deliveryAddress || 'No State'}</h2>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-[10px] font-mono font-bold bg-slate-800 px-2 py-1 rounded text-slate-400">
                                            #{order.orderNumber?.slice(-4)}
                                        </span>
                                        {/* Parse Places from Notes */}
                                        {order.notes?.includes('Places:') && (
                                            <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded uppercase">
                                                {order.notes.split('Places:')[1]?.trim()} Places
                                            </span>
                                        )}
                                    </div>
                                </div>


                                {/* ACTION BUTTON (Only for To-Do) */}
                                {activeTab === 'todo' && (
                                    <button
                                        onClick={() => handleOpenLoadModal(order)}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold uppercase text-sm tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-900/30 active:scale-95 transition-all"
                                    >
                                        <Truck size={18} /> Naik Barang
                                        <ChevronRight size={16} className="opacity-50" />
                                    </button>
                                )}

                                {activeTab === 'done' && (
                                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-center py-2 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2">
                                        <CheckCircle size={14} /> Stock Deducted
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* LOADING MODAL */}
            {isLoadModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in slide-in-from-bottom-10">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                        <div>
                            <h2 className="font-black text-white text-lg">VERIFY STOCK</h2>
                            <p className="text-[10px] text-slate-500 uppercase font-bold">{selectedOrder.orderNumber}</p>
                        </div>
                        <button onClick={() => setIsLoadModalOpen(false)} className="p-2 bg-slate-800 rounded-full text-white"><X size={20} /></button>
                    </div>

                    {/* ITEMS LIST (GROUPED BY LOCATION) */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-black">
                        {/* Group items by Location parsed from remark "Loc: xxx" */}
                        {(() => {
                            const grouped: Record<string, any[]> = {};
                            loadItems.forEach(item => {
                                // Extract Location from Remark "Loc: X"
                                let loc = 'Unknown Location';
                                if (item.remark && item.remark.startsWith('Loc:')) {
                                    loc = item.remark.replace('Loc:', '').trim();
                                }
                                if (!grouped[loc]) grouped[loc] = [];
                                grouped[loc].push(item);
                            });

                            return Object.entries(grouped).map(([location, items]) => (
                                <div key={location}>
                                    {/* Location Header */}
                                    <div className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3 border-b border-blue-500/20 pb-1">
                                        {location}
                                    </div>

                                    {/* Items in this location */}
                                    <div className="space-y-3">
                                        {items.map((item, idx) => {
                                            // Find original index in loadItems to update state correctly
                                            const originalIdx = loadItems.findIndex(i => i.sku === item.sku && i.remark === item.remark); // Use SKU+Remark unique key approx

                                            return (
                                                <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 font-bold border border-slate-700 text-xs">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-white font-bold text-sm">{item.product}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono">Qty: {item.quantity} {item.packaging}</div>
                                                    </div>

                                                    {/* Quantity Editor */}
                                                    <div className="flex flex-col items-end gap-1">
                                                        <input
                                                            type="number"
                                                            className="w-16 bg-black border border-slate-700 rounded-lg p-2 text-center text-lg font-bold text-green-400 focus:border-green-500 outline-none"
                                                            value={loadItems[originalIdx].confirmedQty}
                                                            onChange={(e) => {
                                                                const newQty = parseInt(e.target.value) || 0;
                                                                const newItems = [...loadItems];
                                                                newItems[originalIdx].confirmedQty = newQty;
                                                                setLoadItems(newItems);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900 space-y-3">
                        <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                            <span>Total Items</span>
                            <span className="text-white">{loadItems.reduce((acc, i) => acc + (i.confirmedQty || 0), 0)} Units</span>
                        </div>
                        <button
                            onClick={handleConfirmLoad}
                            disabled={submitting}
                            className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black text-lg uppercase tracking-widest shadow-lg shadow-green-900/40 disabled:opacity-50 disabled:grayscale transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {submitting ? 'PROCESSING...' : 'CONFIRM & DEDUCT STOCK'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverDelivery;
