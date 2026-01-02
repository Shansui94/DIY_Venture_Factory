import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Truck, MapPin, Package, User, Navigation, Calendar, Filter, Users, Factory, Gauge, Phone } from 'lucide-react';
import { calculateLoad, findNearestFactory, determineZone } from '../utils/logistics';

// Types
interface DispatchOrder {
    id: string;
    orderNumber: string;
    customer: string;
    customer_id?: string;
    items: any[];
    status: string;
    deliveryAddress: string;
    deliveryZone: string;
    driverId?: string;
    deadline?: string;
    nearestFactory?: any;
    distance?: number;
    loadStats?: any;
    lat?: number;
    lng?: number;
}

interface Vehicle {
    id: string;
    plate_number: string;
    status: string;
    max_volume_m3: number;
    max_weight_kg: number;
    driver_id?: string;
    current_load?: any;
}

interface Driver {
    uid: string;
    name: string;
    email: string;
    status: 'Available' | 'On-Route' | 'Offline';
    activeOrders: number;
}

const Dispatch: React.FC = () => {
    const [orders, setOrders] = useState<DispatchOrder[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedZone, setSelectedZone] = useState<string>('All');

    // Assignment Modal State
    const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<string>('');

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Sales Orders (Pending/In-Transit)
            const { data: salesData } = await supabase
                .from('sales_orders')
                .select('*, sys_customers(lat, lng)') // Join with customers for coords
                .neq('status', 'Completed')
                .neq('status', 'Delivered')
                .order('created_at', { ascending: false });

            // 2. Fetch Drivers
            const { data: userData } = await supabase
                .from('users_public')
                .select('*')
                .eq('role', 'Driver');

            // 3. Fetch Vehicles
            const { data: vehicleData } = await supabase
                .from('sys_vehicles')
                .select('*')
                .order('id');

            const mappedOrders: DispatchOrder[] = (salesData || []).map(o => {
                // Determine Logic
                const lat = o.sys_customers?.lat;
                const lng = o.sys_customers?.lng;

                // Nearest Factory
                let nearest = null;
                if (lat && lng) {
                    nearest = findNearestFactory(lat, lng);
                }

                // Load Calc (Generic without vehicle first)
                const load = calculateLoad(o.items || [], null);

                return {
                    id: o.id,
                    orderNumber: o.order_number || o.id.substring(0, 8),
                    customer: o.customer,
                    customer_id: o.customer_id,
                    items: o.items || [],
                    status: o.status,
                    deliveryAddress: o.delivery_address || 'Unspecified Location',
                    deliveryZone: o.delivery_zone || determineZone(o.delivery_address || ''),
                    driverId: o.driver_id,
                    deadline: o.deadline,
                    nearestFactory: nearest,
                    loadStats: load,
                    lat, lng
                };
            });

            // Map Drivers & Vehicles
            const mappedDrivers: Driver[] = (userData || []).map(u => ({
                uid: u.id,
                name: u.name || u.email?.split('@')[0] || 'Unknown',
                email: u.email,
                status: mappedOrders.some(o => o.driverId === u.id) ? 'On-Route' : 'Available',
                activeOrders: mappedOrders.filter(o => o.driverId === u.id).length
            }));

            // Calculate Vehicle Loads (if orders are assigned to vehicles - for now assume driver assignment proxies vehicle)
            // Ideally we need logistics_delivery_orders table. 
            // For MVP, we just list vehicles.
            setOrders(mappedOrders);
            setDrivers(mappedDrivers);
            setVehicles(vehicleData || []);

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

    const handleAssign = async (orderId: string, vehicleId: string, driverId: string) => {
        if (!vehicleId && !driverId) return;

        // In real app: Create a Delivery Order (DO) entry
        // Here: Just update sales_order for simplicity of demo
        try {
            const { error } = await supabase
                .from('sales_orders')
                .update({
                    driver_id: driverId, // Assign Driver
                    status: 'Shipped'
                })
                .eq('id', orderId);

            if (error) throw error;
            fetchData();
            setSelectedOrder(null);
            alert(`Assigned to ${driverId ? 'Driver' : 'Vehicle'} successfully!`);
        } catch (error: any) {
            alert("Assignment Failed: " + error.message);
        }
    };

    // Filter Logic
    const filteredOrders = orders.filter(o =>
        selectedZone === 'All' || o.deliveryZone === selectedZone
    );

    const unassignedOrders = filteredOrders.filter(o => !o.driverId);

    // Stats
    const stats = {
        pending: orders.filter(o => !o.driverId).length,
        inTransit: orders.filter(o => o.driverId).length,
        capacity: '78%' // Dummy aggregated
    };

    // Load Simulation for Selected Order + Selected Vehicle
    const getSimulation = (order: DispatchOrder, vehicleId: string) => {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (!vehicle) return null;
        return calculateLoad(order.items, vehicle);
    };

    return (
        <div className="p-6 h-full text-white animate-fade-in flex flex-col gap-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-[#1e1e24] p-6 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -z-10"></div>
                <div className="z-10">
                    <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3 mb-2">
                        <Truck className="text-indigo-500" size={32} />
                        SMART DISPATCH
                    </h1>
                    <p className="text-gray-400 font-medium">AI Routing & Load Optimization</p>
                </div>
                {/* HUD Stats */}
                <div className="flex gap-4 mt-4 md:mt-0 z-10 w-full md:w-auto overflow-x-auto">
                    <div className="px-6 py-3 bg-[#121215] rounded-xl border border-white/5 flex flex-col items-center">
                        <span className="text-2xl font-black text-white">{stats.pending}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Queue</span>
                    </div>
                    <div className="px-6 py-3 bg-[#121215] rounded-xl border border-white/5 flex flex-col items-center">
                        <span className="text-2xl font-black text-green-400">{stats.capacity}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fleet Cap.</span>
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
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                            : 'bg-[#1e1e24] border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {zone}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT: ORDER QUEUE */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">Unassigned Orders ({unassignedOrders.length})</h2>

                    {unassignedOrders.map(order => (
                        <div key={order.id} className="bg-[#1e1e24] p-4 rounded-xl border border-white/5 hover:border-indigo-500/50 transition-all group relative">
                            {/* Best Factory Tag */}
                            {order.nearestFactory && (
                                <div className="absolute top-4 right-4 flex items-center gap-2">
                                    <span className="bg-green-500/10 text-green-400 text-[10px] font-bold px-2 py-1 rounded border border-green-500/20 flex items-center gap-1">
                                        <Factory size={10} />
                                        Fulfil via {order.nearestFactory.factory.id} ({order.nearestFactory.distance.toFixed(1)}km)
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="text-indigo-400 font-black text-sm mb-1">{order.orderNumber}</div>
                                    <h3 className="text-lg font-bold text-white">{order.customer}</h3>
                                    <div className="text-gray-500 text-xs mt-1 flex items-center gap-1"><MapPin size={12} /> {order.deliveryAddress}</div>
                                </div>
                            </div>

                            {/* Load Visual */}
                            <div className="bg-[#121215] p-3 rounded-lg border border-white/5 mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
                                    <span>Vol: <span className="text-white">{order.loadStats.totalVol}m³</span></span>
                                    <span>Wgt: <span className="text-white">{order.loadStats.totalWeight}kg</span></span>
                                </div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Est. Load</div>
                            </div>

                            <button
                                onClick={() => setSelectedOrder(order)}
                                className="w-full bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-600/30 py-2 rounded-lg text-sm font-bold transition-all uppercase tracking-wide"
                            >
                                Assign Vehicle & Driver
                            </button>
                        </div>
                    ))}

                    {unassignedOrders.length === 0 && (
                        <div className="text-center py-20 text-gray-600 bg-white/5 rounded-xl border border-dashed border-white/5">
                            No pending orders. Good job!
                        </div>
                    )}
                </div>

                {/* RIGHT: FLEET STATUS (or ASSIGNMENT PANEL) */}
                <div className="space-y-6">
                    {selectedOrder ? (
                        <div className="bg-[#1e1e24] p-6 rounded-2xl border border-indigo-500/50 shadow-2xl relative animate-in slide-in-from-right-10">
                            <div className="absolute top-0 right-0 p-4">
                                <button onClick={() => setSelectedOrder(null)}><Users size={16} className="text-gray-500 hover:text-white" /></button>
                            </div>

                            <h2 className="text-xl font-bold text-white mb-1">Assign Deliver</h2>
                            <p className="text-indigo-400 text-sm font-bold mb-6">{selectedOrder.orderNumber}</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">1. Select Vehicle (Capacity Check)</label>
                                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                                        {vehicles.map(v => {
                                            const sim = getSimulation(selectedOrder, v.id);
                                            const isOver = sim?.isOverloaded;
                                            return (
                                                <button
                                                    key={v.id}
                                                    onClick={() => setSelectedVehicle(v.id)}
                                                    className={`p-3 rounded-lg border text-left transition-all ${selectedVehicle === v.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#121215] border-white/10 text-gray-400'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-bold text-sm">{v.plate_number}</span>
                                                        <span className="text-[10px]">{v.max_volume_m3}m³</span>
                                                    </div>
                                                    {sim && selectedVehicle === v.id && (
                                                        <div className="space-y-1">
                                                            <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
                                                                <div className={`h-full ${isOver ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${sim.percentVol}%` }}></div>
                                                            </div>
                                                            <div className="flex justify-between text-[10px]">
                                                                <span>{sim.percentVol}% Full</span>
                                                                <span className={isOver ? 'text-red-300' : 'text-green-300'}>
                                                                    {isOver ? 'OVERLOAD' : `${sim.spaceRemaining}m³ Left`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {selectedVehicle && (
                                    <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                                        <div className="flex items-center gap-2 text-yellow-500 font-bold text-xs mb-1">
                                            <Phone size={14} />
                                            <span>Opportunity: Fill the Truck!</span>
                                        </div>
                                        <p className="text-[11px] text-gray-400">
                                            This truck has <strong>{getSimulation(selectedOrder, selectedVehicle)?.spaceRemaining}m³</strong> remaining.
                                            Contact nearby customers in <strong>{selectedOrder.deliveryZone}</strong> to add more items?
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">2. Assign Driver</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {drivers.map(d => (
                                            <button
                                                key={d.uid}
                                                onClick={() => handleAssign(selectedOrder.id, selectedVehicle, d.uid)}
                                                className="p-2 bg-[#121215] border border-white/10 rounded hover:border-white/30 text-xs text-left"
                                            >
                                                <div className="font-bold text-white">{d.name}</div>
                                                <div className={`text-[10px] ${d.status === 'Available' ? 'text-green-500' : 'text-amber-500'}`}>{d.status}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Standard Fleet List
                        <div className="bg-[#1e1e24] p-5 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2 mb-4">
                                <Users size={18} className="text-gray-400" />
                                <h2 className="text-lg font-bold text-white">Active Fleet</h2>
                            </div>
                            <div className="space-y-3">
                                {drivers.map(driver => (
                                    <div key={driver.uid} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${driver.status === 'On-Route' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                                            <span className="text-sm font-bold text-gray-300">{driver.name}</span>
                                        </div>
                                        <span className="text-xs text-gray-500">{driver.activeOrders} Jobs</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dispatch;
