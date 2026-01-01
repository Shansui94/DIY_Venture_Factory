import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getInventoryStatus } from '../services/apiV2';
import { JobOrder } from '../types';
import { Truck, MapPin, CheckCircle, Navigation, Package, User, Calendar, ArrowRight, AlertCircle } from 'lucide-react';

interface DriverDeliveryProps {
    user: any;
}

const DriverDelivery: React.FC<DriverDeliveryProps> = ({ user }) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'Pending' | 'Completed'>('Pending');
    const [inventoryMap, setInventoryMap] = useState<Record<string, number>>({});

    // Editing State
    const [editingItem, setEditingItem] = useState<{ orderId: string, itemIndex: number } | null>(null);
    const [tempQty, setTempQty] = useState<number>(0);

    const handleEditClick = (orderId: string, index: number, currentQty: number) => {
        setEditingItem({ orderId, itemIndex: index });
        setTempQty(currentQty);
    };

    const saveQuantity = async () => {
        if (!editingItem) return;

        const { orderId, itemIndex } = editingItem;
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        // Clone items and update
        const updatedItems = [...order.items];
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], quantity: tempQty };

        // Optimistic Update
        const updatedOrders = orders.map(o =>
            o.id === orderId ? { ...o, items: updatedItems } : o
        );
        setOrders(updatedOrders);
        setEditingItem(null);

        try {
            const { error } = await supabase
                .from('sales_orders')
                .update({ items: updatedItems })
                .eq('id', orderId);

            if (error) throw error;
        } catch (err) {
            console.error("Failed to update quantity:", err);
            alert("Failed to update quantity. Reverting...");
            fetchData(); // Revert
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Orders
            let query = supabase
                .from('sales_orders')
                .select('*')
                .order('created_at', { ascending: false });

            const { data: orderData } = await query;

            // 2. Fetch Live Inventory
            const inventoryList = await getInventoryStatus();
            const invMap: Record<string, number> = {};
            inventoryList.forEach(i => {
                if (i.sku) invMap[i.sku] = i.current_stock;
            });
            setInventoryMap(invMap);

            if (orderData) {
                const allOrders = orderData.map(o => ({
                    id: o.id,
                    orderNumber: o.order_number || o.id.substring(0, 8),
                    customer: o.customer,
                    items: o.items || [],
                    status: o.status,
                    deliveryAddress: o.delivery_address || '123 Industrial Park, Factory Rd',
                    deliveryZone: o.delivery_zone,
                    driverId: o.driver_id,
                    notes: o.notes
                }));

                const relevantOrders = allOrders.filter(o => {
                    const isCompleted = o.status === 'Delivered' || o.status === 'Completed';
                    if (activeTab === 'Pending') return !isCompleted;
                    return isCompleted;
                });

                setOrders(relevantOrders);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const updateStatus = async (orderId: string, newStatus: string) => {
        // Optimistic Update
        setOrders(orders.filter(o => o.id !== orderId));

        try {
            const { error } = await supabase
                .from('sales_orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;
        } catch (error) {
            console.error("Update failed", error);
            fetchData(); // Revert
        }
    };

    return (
        <div className="min-h-screen bg-[#121215] text-white animate-fade-in pb-20 p-4 lg:p-6">
            {/* Header */}
            <div className="flex flex-col gap-1 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600/20 rounded-xl border border-blue-500/30">
                        <Truck className="text-blue-400" size={24} />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-white uppercase">Driver Portal</h1>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm pl-[3.75rem]">
                    <User size={14} />
                    <span className="font-bold">{user?.name || user?.email || 'Driver'}</span>
                    <span className="text-gray-700 mx-2">|</span>
                    <Calendar size={14} />
                    <span>{new Date().toLocaleDateString()}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex w-full bg-[#1e1e24] p-1.5 rounded-2xl border border-white/5 mb-8 max-w-md mx-auto">
                <button
                    onClick={() => setActiveTab('Pending')}
                    className={`flex-1 py-3 text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${activeTab === 'Pending'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                        : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                >
                    Current Tasks
                </button>
                <button
                    onClick={() => setActiveTab('Completed')}
                    className={`flex-1 py-3 text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${activeTab === 'Completed'
                        ? 'bg-green-600 text-white shadow-lg shadow-green-900/40'
                        : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                >
                    History
                </button>
            </div>

            {/* Order List */}
            <div className="space-y-4 max-w-3xl mx-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 animate-pulse">
                        <Truck size={48} className="mb-4 opacity-50" />
                        <div className="text-sm font-bold uppercase tracking-wider">Loading Deliveries...</div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-600 border border-dashed border-white/10 rounded-2xl bg-[#1e1e24]/50">
                        <Package size={48} className="mb-4 opacity-50" />
                        <p className="font-medium">No {activeTab.toLowerCase()} deliveries found.</p>
                    </div>
                ) : (
                    orders.map((order, idx) => (
                        <div
                            key={order.id}
                            style={{ animationDelay: `${idx * 100}ms` }}
                            className="bg-[#1e1e24] rounded-2xl overflow-hidden shadow-xl border border-white/5 hover:border-white/10 transition-all group animate-fade-in"
                        >
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                                            {order.customer}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="bg-white/5 text-[10px] font-mono px-2 py-0.5 rounded text-gray-400 border border-white/5">#{order.orderNumber}</span>
                                            {order.deliveryZone && (
                                                <span className="bg-purple-900/30 text-[10px] font-bold px-2 py-0.5 rounded text-purple-300 border border-purple-500/20">{order.deliveryZone}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`p-2 rounded-full ${activeTab === 'Pending' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                                        <Package size={20} />
                                    </div>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                        <MapPin className="text-red-400 shrink-0 mt-1" size={16} />
                                        <p className="text-gray-300 text-sm leading-relaxed font-medium">
                                            {order.deliveryAddress}
                                        </p>
                                    </div>

                                    {/* Items List */}
                                    <div className="space-y-2">
                                        {order.items.map((item: any, i: number) => {
                                            const currentStock = inventoryMap[item.sku] || 0;
                                            const isLowStock = currentStock < item.quantity;
                                            const stockColor = isLowStock ? 'text-red-400' : 'text-green-500';

                                            return (
                                                <div key={i} className="bg-[#121215] p-3 rounded-lg border border-white/5 flex justify-between items-center">
                                                    <div>
                                                        {/* If SKU exists, product is Name, SKU is Code. If not, product might be the Code (Manual Mode) */}
                                                        <span className="block text-white font-medium text-sm">
                                                            {item.sku ? item.product : 'Manual Item'}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 font-mono">
                                                            {item.sku || item.product}
                                                        </span>
                                                        {item.remark && (
                                                            <span className="block text-[10px] text-yellow-500/80 italic mt-0.5">
                                                                Note: {item.remark}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Qty & Stock Status */}
                                                    <div className="text-right flex flex-col items-end">
                                                        {editingItem?.orderId === order.id && editingItem?.itemIndex === i ? (
                                                            <div className="flex items-center gap-1 mb-1">
                                                                <input
                                                                    type="number"
                                                                    className="w-16 bg-white/10 border border-blue-500 rounded px-1 py-0.5 text-white text-xs font-bold text-center outline-none"
                                                                    value={tempQty}
                                                                    onChange={(e) => setTempQty(Number(e.target.value))}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    autoFocus
                                                                />
                                                                <button onClick={(e) => { e.stopPropagation(); saveQuantity(); }} className="p-1 bg-green-600 rounded text-white hover:bg-green-500"><CheckCircle size={12} /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); setEditingItem(null); }} className="p-1 bg-gray-600 rounded text-white hover:bg-gray-500"><ArrowRight size={12} className="rotate-180" /></button>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                onClick={(e) => {
                                                                    if (activeTab === 'Pending') {
                                                                        e.stopPropagation();
                                                                        handleEditClick(order.id, i, item.quantity);
                                                                    }
                                                                }}
                                                                className={`bg-white/10 text-white text-xs font-bold px-2 py-1 rounded inline-block mb-1 flex items-center gap-1 ${activeTab === 'Pending' ? 'cursor-pointer hover:bg-white/20 hover:text-blue-300 transition-colors border border-transparent hover:border-blue-500/30' : ''}`}
                                                                title={activeTab === 'Pending' ? "Click to Edit" : ""}
                                                            >
                                                                <span>x{item.quantity}</span>
                                                                {activeTab === 'Pending' && <span className="opacity-0 group-hover:opacity-100 text-[8px] text-blue-400">✏️</span>}
                                                            </div>
                                                        )}
                                                        {item.sku && (
                                                            <span className={`text-[10px] font-mono mt-1 font-bold ${stockColor} flex items-center gap-1 uppercase tracking-wider`}>
                                                                {isLowStock ? (
                                                                    <>
                                                                        <AlertCircle size={10} />
                                                                        <span>Insufficient Stock</span>
                                                                    </>
                                                                ) : (
                                                                    <span>Ready</span>
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {activeTab === 'Pending' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress || '')}`)}
                                            className="bg-[#18181b] hover:bg-[#202025] border border-white/10 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                                        >
                                            <Navigation size={16} className="text-blue-400" /> Navigate
                                        </button>

                                        <button
                                            onClick={() => updateStatus(order.id, 'Delivered')}
                                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/30 active:scale-95 text-sm"
                                        >
                                            <CheckCircle size={16} /> Complete
                                        </button>
                                    </div>
                                )}

                                {activeTab === 'Completed' && (
                                    <div className="w-full bg-green-900/20 border border-green-500/20 rounded-xl py-3 flex items-center justify-center gap-2 text-green-400 font-bold text-sm">
                                        <CheckCircle size={16} /> Delivered Successfully
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DriverDelivery;
