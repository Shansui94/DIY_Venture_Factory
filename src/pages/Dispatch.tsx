import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Truck, MapPin, Package, User, Navigation, Calendar, Filter, Users } from 'lucide-react';

// Types
interface DispatchOrder {
    id: string;
    orderNumber: string;
    customer: string;
    items: any[];
    status: string;
    deliveryAddress: string;
    deliveryZone: string;
    driverId?: string;
    deadline?: string;
}

interface Driver {
    uid: string;
    name: string;
    email: string;
    status: 'Available' | 'On-Route' | 'Offline'; // Inferred
    activeOrders: number;
}

const Dispatch: React.FC = () => {
    const [orders, setOrders] = useState<DispatchOrder[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedZone, setSelectedZone] = useState<string>('All');

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Sales Orders (Pending/In-Transit)
            const { data: salesData } = await supabase
                .from('sales_orders')
                .select('*')
                .neq('status', 'Completed') // Show all active
                .neq('status', 'Delivered')
                .order('created_at', { ascending: false });

            // 2. Fetch Drivers
            const { data: userData } = await supabase
                .from('users_public')
                .select('*')
                .eq('role', 'Driver');

            const mappedOrders: DispatchOrder[] = (salesData || []).map(o => ({
                id: o.id,
                orderNumber: o.order_number || o.id.substring(0, 8),
                customer: o.customer,
                items: o.items || [],
                status: o.status,
                deliveryAddress: o.delivery_address || 'Unspecified Location',
                deliveryZone: o.delivery_zone || 'Unknown',
                driverId: o.driver_id,
                deadline: o.deadline
            }));

            const mappedDrivers: Driver[] = (userData || []).map(u => {
                // Calculate active orders for this driver
                const activeCount = mappedOrders.filter(o => o.driverId === u.id).length;
                return {
                    uid: u.id,
                    name: u.name || u.email?.split('@')[0] || 'Unknown',
                    email: u.email,
                    status: activeCount > 0 ? 'On-Route' : 'Available',
                    activeOrders: activeCount
                };
            });

            setOrders(mappedOrders);
            setDrivers(mappedDrivers);

        } catch (error) {
            console.error("Dispatch Load Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Substribe to changes
        const channel = supabase.channel('dispatch_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_orders' }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(channel) };
    }, []);

    const handleAssignDriver = async (orderId: string, driverId: string) => {
        try {
            const { error } = await supabase
                .from('sales_orders')
                .update({
                    driver_id: driverId,
                    status: 'Shipped' // Assume assignment means shipped/in-transit
                })
                .eq('id', orderId);

            if (error) throw error;
            // Optimistic update done by subscription re-fetch or manual:
            fetchData();
        } catch (error) {
            alert("Assignment Failed");
            console.error(error);
        }
    };

    // Filter Logic
    const filteredOrders = orders.filter(o =>
        selectedZone === 'All' || o.deliveryZone === selectedZone
    );

    const unassignedOrders = filteredOrders.filter(o => !o.driverId);
    const assignedOrders = filteredOrders.filter(o => o.driverId);

    // Stats
    const stats = {
        pending: orders.filter(o => !o.driverId).length,
        inTransit: orders.filter(o => o.driverId).length,
        driversOnline: drivers.length
    };

    return (
        <div className="p-6 h-full text-white animate-fade-in flex flex-col gap-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-[#1e1e24] p-6 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden group">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] -z-10 group-hover:bg-blue-600/20 transition-all duration-1000"></div>

                <div className="z-10">
                    <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3 mb-2">
                        <Truck className="text-blue-500" size={32} />
                        DISPATCH COMMAND
                    </h1>
                    <p className="text-gray-400 font-medium">Fleet Management & Order Assignment</p>
                </div>

                <div className="flex gap-4 mt-4 md:mt-0 z-10">
                    <div className="px-6 py-3 bg-[#121215] rounded-xl border border-white/5 flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-black text-white">{stats.pending}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Unassigned</span>
                    </div>
                    <div className="px-6 py-3 bg-[#121215] rounded-xl border border-white/5 flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-black text-blue-400">{stats.inTransit}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">In Transit</span>
                    </div>
                    <div className="px-6 py-3 bg-[#121215] rounded-xl border border-white/5 flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-black text-green-400">{stats.driversOnline}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Drivers</span>
                    </div>
                </div>
            </div>

            {/* Zone Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {['All', 'North', 'Central', 'South', 'East'].map(zone => (
                    <button
                        key={zone}
                        onClick={() => setSelectedZone(zone)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider border transition-all whitespace-nowrap ${selectedZone === zone
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                            : 'bg-[#1e1e24] border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {zone}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Unassigned Orders */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                            <Package size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Pending Assignments</h2>
                        <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-2 py-1 rounded border border-orange-500/20">{unassignedOrders.length}</span>
                    </div>

                    <div className="grid gap-4">
                        {unassignedOrders.length === 0 ? (
                            <div className="text-center py-20 bg-[#1e1e24] rounded-2xl border border-dashed border-white/10 text-gray-500">
                                No unassigned orders in this zone.
                            </div>
                        ) : (
                            unassignedOrders.map(order => (
                                <div key={order.id} className="bg-[#1e1e24] p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all shadow-lg group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-blue-400 font-black tracking-tight">{order.orderNumber}</span>
                                                {order.deadline && (
                                                    <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/20">
                                                        Due: {order.deadline}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-bold text-white">{order.customer}</h3>
                                            <p className="text-gray-400 text-sm flex items-center gap-1.5 mt-1">
                                                <MapPin size={14} className="text-gray-500" />
                                                {order.deliveryAddress}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 text-xs font-mono text-gray-300">
                                                {order.items.length} Items
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Preview */}
                                    <div className="mb-4 space-y-1">
                                        {order.items.slice(0, 2).map((item: any, i) => (
                                            <div key={i} className="text-xs text-gray-500 flex justify-between">
                                                <span>{item.product || item.Product_SKU}</span>
                                                <span>x{item.quantity}</span>
                                            </div>
                                        ))}
                                        {order.items.length > 2 && <div className="text-[10px] text-gray-600 italic">+{order.items.length - 2} more...</div>}
                                    </div>

                                    {/* Assign Driver Action */}
                                    <div className="border-t border-white/5 pt-4">
                                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                            <span className="text-xs font-bold text-gray-500 uppercase mr-2">Assign:</span>
                                            {drivers.map(driver => (
                                                <button
                                                    key={driver.uid}
                                                    onClick={() => handleAssignDriver(order.id, driver.uid)}
                                                    className="flex items-center gap-2 bg-[#18181b] hover:bg-blue-600 hover:border-blue-500 hover:text-white text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 transition-all whitespace-nowrap"
                                                >
                                                    <User size={12} />
                                                    {driver.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Fleet Status & Active */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                            <Users size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Active Fleet</h2>
                    </div>

                    <div className="bg-[#1e1e24] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                        {drivers.map(driver => (
                            <div key={driver.uid} className="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="font-bold text-white flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${driver.status === 'On-Route' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                                        {driver.name}
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${driver.status === 'On-Route'
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                        }`}>
                                        {driver.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-400">
                                    <span>ID: {driver.uid.substring(0, 4)}...</span>
                                    <span className={driver.activeOrders > 0 ? 'text-blue-400 font-bold' : ''}>
                                        {driver.activeOrders} Active Deliveries
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-2xl p-6 border border-blue-500/20">
                        <h3 className="font-bold text-blue-300 mb-2">Dispatch AI</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            System suggests assigning new "North Zone" orders to <strong className="text-white">Driver Ah Meng</strong> based on current route optimization.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dispatch;
