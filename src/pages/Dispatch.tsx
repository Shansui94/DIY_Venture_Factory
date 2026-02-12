import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import {
    Truck, MapPin, Package, User, Navigation, Calendar, Filter, Users,
    Factory, Gauge, Phone, Plus, List, CheckSquare, Square, ChevronRight,
    Sparkles, LayoutDashboard
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { generateDraftTrips, DraftTrip } from '../utils/autoRouting';
import { calculateLoad, findNearestFactory, determineZone } from '../utils/logistics';
import { LogisticsTrip, SalesOrder, User as AppUser } from '../types';

// Extended Types for Local State
interface DispatchOrder extends SalesOrder {
    loadStats?: any;
    nearestFactory?: any;
    lat?: number;
    lng?: number;
    distance?: number;
    deliveryAddress: string;
    deliveryZone: string;
}

interface Vehicle {
    id: string;
    plate_number: string;
    status: string;
    max_volume_m3: number;
    max_weight_kg: number;
    driver_id?: string;
}

interface Driver {
    uid: string;
    name: string;
    email: string;
    status: 'Available' | 'On-Route' | 'Offline';
    activeOrders: number;
}

const Dispatch: React.FC = () => {
    // Data State
    const [orders, setOrders] = useState<DispatchOrder[]>([]);
    const [trips, setTrips] = useState<LogisticsTrip[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [selectedZone, setSelectedZone] = useState<string>('All');
    const [viewMode, setViewMode] = useState<'orders' | 'trips'>('orders');

    // -- PHASE 3: AI PLANNING STATE --
    const [draftTrips, setDraftTrips] = useState<DraftTrip[]>([]);
    const [unassignedOrders, setUnassignedOrders] = useState<DispatchOrder[]>([]); // Derived state for board

    // Initialize unassigned when orders load
    useEffect(() => {
        setUnassignedOrders(orders.filter(o => !o.trip_id));
    }, [orders]);


    // Selection State
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

    // Modal State
    const [isTripModalOpen, setIsTripModalOpen] = useState(false);
    const [tripDriverId, setTripDriverId] = useState('');
    const [tripVehicleId, setTripVehicleId] = useState('');
    const [confirmingDraftId, setConfirmingDraftId] = useState<string | null>(null); // New for converting draft

    const fetchData = async () => {
        setLoading(true);
        try {
            const [salesRes, tripRes, userRes, vehicleRes, customerRes] = await Promise.all([
                supabase.from('sales_orders').select('*').neq('status', 'Completed').neq('status', 'Delivered').neq('status', 'Archived').order('created_at', { ascending: false }),
                supabase.from('logistics_trips').select('*').order('created_at', { ascending: false }),
                supabase.from('users_public').select('*'),
                supabase.from('sys_vehicles').select('*').order('id'),
                supabase.from('sys_customers').select('name, lat, lng')
            ]);

            const salesData = salesRes.data;
            const tripData = tripRes.data;
            const userData = userRes.data;
            const vehicleData = vehicleRes.data;
            const customerData = customerRes.data || [];

            // Process Orders
            const mappedOrders: DispatchOrder[] = (salesData || []).map(o => {
                const matchedCustomer = customerData.find(c => c.name.toLowerCase() === (o.customer || '').toLowerCase());
                const lat = matchedCustomer?.lat || null;
                const lng = matchedCustomer?.lng || null;
                let nearest = null;
                if (lat && lng) nearest = findNearestFactory(lat, lng);
                const load = calculateLoad(o.items || [], null);

                return {
                    ...o,
                    orderNumber: o.order_number || o.id.substring(0, 8),
                    deliveryAddress: o.delivery_address || 'Unspecified Location',
                    deliveryZone: o.delivery_zone || determineZone(o.delivery_address || ''),
                    nearestFactory: nearest,
                    loadStats: load,
                    lat, lng
                };
            });

            // Filter in memory to handle dual roles correctly
            const filteredUsers = (userData || []).filter(u =>
                u.role === 'Driver' ||
                u.email === 'neosonchun@gmail.com' ||
                u.name?.toLowerCase().includes('neoson')
            );

            const mappedDrivers: Driver[] = filteredUsers.map(u => ({
                uid: u.id,
                name: (u.name && u.name.trim() !== '') ? u.name : (u.email?.split('@')[0] || 'Unknown'),
                email: u.email,
                status: 'Available',
                activeOrders: 0
            }));

            setOrders(mappedOrders);
            setTrips(tripData || []);
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
        const sub = supabase.channel('dispatch_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_orders' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'logistics_trips' }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(sub) };
    }, []);

    // -- HANDLERS --

    const handleAutoPlan = () => {
        const drafts = generateDraftTrips(unassignedOrders);
        setDraftTrips(drafts);
        const assignedIds = new Set(drafts.flatMap(d => d.orders.map(o => o.id)));
        setUnassignedOrders(prev => prev.filter(o => !assignedIds.has(o.id)));
    };

    const handleDragEnd = (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;

        const sourceId = source.droppableId;
        const destId = destination.droppableId;
        if (sourceId === destId && source.index === destination.index) return;

        const getList = (id: string) => {
            if (id === 'unassigned') return unassignedOrders;
            const draft = draftTrips.find(d => d.id === id);
            return draft ? draft.orders : [];
        };

        const sourceList = [...getList(sourceId)];
        const destList = sourceId === destId ? sourceList : [...getList(destId)];

        const [movedItem] = sourceList.splice(source.index, 1);
        destList.splice(destination.index, 0, movedItem);

        if (sourceId === 'unassigned') {
            setUnassignedOrders(sourceList);
        } else {
            setDraftTrips(prev => prev.map(d => d.id === sourceId ? { ...d, orders: sourceList, ...recalcStats(sourceList) } : d));
        }

        if (sourceId !== destId) {
            if (destId === 'unassigned') {
                setUnassignedOrders(destList);
            } else {
                setDraftTrips(prev => prev.map(d => d.id === destId ? { ...d, orders: destList, ...recalcStats(destList) } : d));
            }
        }
    };

    const recalcStats = (orders: any[]) => {
        const vol = orders.reduce((acc, o) => acc + (parseFloat(o.loadStats?.totalVol || 0)), 0);
        const wgt = orders.reduce((acc, o) => acc + (parseFloat(o.loadStats?.totalWeight || 0)), 0);
        return { totalVol: vol, totalWeight: wgt, isOverloaded: vol > 20 };
    };


    const handleConfirmDraft = (draft: DraftTrip) => {
        // Instead of auto-confirming with random driver, open the modal
        const ids = new Set(draft.orders.map(o => o.id));
        setSelectedOrderIds(ids);
        setIsTripModalOpen(true);
        // We can optionally set a draft ID to remove it later, but for now logic is fine
        setConfirmingDraftId(draft.id);
    };

    const handleCreateTrip = async () => {
        if (!tripDriverId || !tripVehicleId) return alert("Select driver and vehicle");
        try {
            const { data: trip, error: tripError } = await supabase
                .from('logistics_trips')
                .insert({
                    trip_number: `T-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
                    driver_id: tripDriverId,
                    vehicle_id: tripVehicleId,
                    status: 'Planning'
                }).select().single();
            if (tripError) throw tripError;

            const updates = Array.from(selectedOrderIds).map((orderId, index) => ({
                id: orderId, trip_id: trip.trip_id, stop_sequence: index + 1, status: 'Planned'
            }));

            for (const update of updates) {
                await supabase.from('sales_orders').update({
                    trip_id: update.trip_id, stop_sequence: update.stop_sequence, status: 'Planned'
                }).eq('id', update.id);
            }

            // If we were confirming a draft, remove it from the board
            if (confirmingDraftId) {
                setDraftTrips(prev => prev.filter(d => d.id !== confirmingDraftId));
                setConfirmingDraftId(null);
            }

            setIsTripModalOpen(false);
            setSelectedOrderIds(new Set());
            setTripDriverId('');
            setTripVehicleId('');
            setViewMode('trips');
            fetchData();
        } catch (error: any) {
            alert("Failed: " + error.message);
        }
    };


    const getSimulation = (ordersToSim: DispatchOrder[], vehicleId: string) => {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (!vehicle) return null;
        const allItems = ordersToSim.flatMap(o => o.items);
        return calculateLoad(allItems, vehicle);
    };

    const selectedOrdersList = orders.filter(o => selectedOrderIds.has(o.id));

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans selection:bg-indigo-500/30">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl mb-6">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center gap-3">
                        <Truck className="text-indigo-400" size={32} />
                        Smart Dispatch <span className="text-sm font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">AI Enabled</span>
                    </h1>
                    <p className="text-slate-400 font-medium mt-1">Drag-and-drop planning powered by Logistics AI.</p>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0 bg-slate-800/50 p-1 rounded-xl border border-slate-700">
                    <button
                        onClick={() => setViewMode('orders')}
                        className={`px-4 py-2 rounded-lg font-bold transition-all text-sm flex items-center gap-2 ${viewMode === 'orders' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <LayoutDashboard size={14} /> Planning Board
                    </button>
                    <button
                        onClick={() => setViewMode('trips')}
                        className={`px-4 py-2 rounded-lg font-bold transition-all text-sm flex items-center gap-2 ${viewMode === 'trips' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Truck size={14} /> Active Trips ({trips.length})
                    </button>
                </div>
            </div>

            {/* Main Content */}
            {viewMode === 'orders' && (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-220px)]">
                        {/* LEFT: Unassigned Pool */}
                        <div className="w-[380px] flex flex-col shrink-0 bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
                            <div className="p-4 bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-10 flex justify-between items-center">
                                <span className="text-slate-400 font-bold text-sm uppercase flex items-center gap-2">
                                    <List size={16} /> Unassigned ({unassignedOrders.length})
                                </span>
                                <button
                                    onClick={handleAutoPlan}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-95 transition-all group"
                                >
                                    <Sparkles size={14} className="group-hover:rotate-12 transition-transform" /> Auto-Plan
                                </button>
                            </div>

                            <Droppable droppableId="unassigned">
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar bg-slate-950/30"
                                    >
                                        {unassignedOrders.map((order, index) => (
                                            <Draggable key={order.id} draggableId={order.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`p-4 rounded-xl border transition-all shadow-sm group ${snapshot.isDragging
                                                            ? 'bg-indigo-900/80 border-indigo-500 z-50 scale-105 shadow-2xl'
                                                            : 'bg-slate-800/40 border-slate-700/50 hover:border-indigo-500/30 hover:bg-slate-800/60'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="font-mono text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">{order.orderNumber}</div>
                                                            <div className="text-[10px] font-bold bg-slate-950/50 px-2 py-0.5 rounded text-slate-400 border border-slate-700">{order.deliveryZone}</div>
                                                        </div>
                                                        <div className="font-bold text-slate-200 text-sm mb-1">{order.customer}</div>
                                                        <div className="flex justify-between items-end mt-2">
                                                            <div className="text-[10px] text-slate-500 truncate max-w-[180px] flex items-center gap-1">
                                                                <MapPin size={10} /> {order.deliveryAddress}
                                                            </div>
                                                            <div className="flex gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/30 px-2 py-1 rounded">
                                                                <span className={parseFloat(order.loadStats.totalVol) > 5 ? 'text-amber-400 font-bold' : ''}>
                                                                    {order.loadStats.totalVol}m³
                                                                </span>
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

                        {/* RIGHT: Drafting Board */}
                        {draftTrips.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
                                <div className="bg-slate-900 p-6 rounded-full border border-slate-800 mb-4 shadow-xl">
                                    <Sparkles size={48} className="text-indigo-500" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-300">Ready to Plan</h3>
                                <p className="text-sm max-w-sm text-center mt-2 text-slate-500">
                                    Drag orders from the left to create a trip, or click <strong className="text-indigo-400">Auto-Plan</strong> to let AI optimize routes for you.
                                </p>
                            </div>
                        ) : (
                            draftTrips.map((draft) => (
                                <div key={draft.id} className="w-[340px] flex flex-col shrink-0 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                                    {/* Trip Header */}
                                    <div className={`p-4 border-b border-slate-700/50 flex flex-col gap-3 ${draft.isOverloaded ? 'bg-red-500/10' : 'bg-indigo-500/10'}`}>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Truck size={16} className={draft.isOverloaded ? 'text-red-400' : 'text-indigo-400'} />
                                                <h4 className="font-bold text-slate-100 text-sm">{draft.name}</h4>
                                            </div>
                                            <span className="text-[10px] bg-slate-950/50 px-2 py-0.5 rounded text-slate-400 font-mono border border-slate-700/50">{draft.zone}</span>
                                        </div>

                                        {/* Capacity Bar */}
                                        <div>
                                            <div className="flex justify-between text-[10px] font-mono font-bold mb-1">
                                                <span className={draft.isOverloaded ? 'text-red-400' : 'text-slate-400'}>
                                                    {draft.totalVol.toFixed(1)} / 20.0 m³
                                                </span>
                                                <span className={draft.isOverloaded ? 'text-red-400' : 'text-emerald-400'}>
                                                    {draft.isOverloaded ? 'OVERLOADED' : 'OPTIMAL'}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/50">
                                                <div
                                                    className={`h-full transition-all duration-500 ${draft.isOverloaded ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${Math.min((draft.totalVol / 20) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleConfirmDraft(draft)}
                                            disabled={confirmingDraftId === draft.id}
                                            className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex justify-center items-center gap-2"
                                        >
                                            {confirmingDraftId === draft.id ? <span className="animate-spin">⏳</span> : <CheckSquare size={14} />}
                                            Confirm Trip
                                        </button>
                                    </div>

                                    {/* Trip Orders */}
                                    <Droppable droppableId={draft.id}>
                                        {(provided) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className={`flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar bg-slate-950/30 ${draft.isOverloaded ? 'bg-red-900/5' : ''}`}
                                            >
                                                {draft.orders.map((order: any, index: number) => (
                                                    <Draggable key={order.id} draggableId={order.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={`p-3 rounded-lg border transition-all ${snapshot.isDragging
                                                                    ? 'bg-slate-800 border-indigo-500 shadow-xl z-50'
                                                                    : 'bg-slate-900 border-slate-800'
                                                                    }`}
                                                            >
                                                                <div className="flex justify-between mb-1">
                                                                    <span className="text-slate-200 font-bold text-xs truncate max-w-[150px]">{order.customer}</span>
                                                                    <span className="text-slate-500 text-[10px] bg-slate-950 px-1 rounded">{order.loadStats.totalVol}m³</span>
                                                                </div>
                                                                <div className="text-[10px] text-slate-600 truncate">{order.deliveryAddress}</div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            ))
                        )}
                    </div>
                </DragDropContext>
            )}

            {/* View Mode: TRIPS */}
            {viewMode === 'trips' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {trips.length === 0 ? (
                        <div className="col-span-full p-20 text-center text-slate-600 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
                            <Truck size={48} className="mx-auto mb-4 opacity-50" />
                            <h3 className="text-xl font-bold mb-2">No Active Trips</h3>
                        </div>
                    ) : (
                        trips.map(trip => (
                            <div key={trip.trip_id} className="bg-slate-900/50 backdrop-blur border border-slate-800 p-6 rounded-2xl shadow-lg hover:border-indigo-500/30 transition-all group">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-indigo-400">
                                                <Truck size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-100 text-lg">{trip.trip_number}</h3>
                                                <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${trip.status === 'Planning' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' :
                                                    trip.status === 'Completed' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' :
                                                        'text-blue-400 border-blue-500/20 bg-blue-500/10'
                                                    }`}>
                                                    {trip.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-black text-slate-200">{orders.filter(o => o.trip_id === trip.trip_id).length}</div>
                                        <div className="text-[10px] font-bold text-slate-600 uppercase">Stops</div>
                                    </div>
                                </div>

                                <div className="space-y-1 mb-4">
                                    <div className="flex items-center justify-between text-sm p-2 bg-slate-950/50 rounded-lg border border-slate-800/50">
                                        <span className="text-slate-500 flex items-center gap-2"><User size={14} /> Driver</span>
                                        <span className="text-slate-300 font-bold">{drivers.find(d => d.uid === trip.driver_id)?.name || 'Unknown'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm p-2 bg-slate-950/50 rounded-lg border border-slate-800/50">
                                        <span className="text-slate-500 flex items-center gap-2"><Truck size={14} /> Vehicle</span>
                                        <span className="text-slate-300 font-bold">{vehicles.find(v => v.id === trip.vehicle_id)?.plate_number || 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
            {/* Trip Creation Modal */}
            {isTripModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsTripModalOpen(false)} />
                    <div className="relative bg-[#1a1a1e] border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                                <Truck className="text-indigo-500" />
                                Confirm Trip details
                            </h2>
                            <button onClick={() => setIsTripModalOpen(false)} className="text-slate-500 hover:text-white">
                                <Square size={20} className="rotate-45" /> {/* Close Icon Simulation */}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Assign Driver</label>
                                <select
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold text-sm focus:border-indigo-500 outline-none"
                                    value={tripDriverId}
                                    onChange={(e) => setTripDriverId(e.target.value)}
                                >
                                    <option value="">Select Driver...</option>
                                    {drivers.map(d => (
                                        <option key={d.uid} value={d.uid}>
                                            {d.name || d.email} {d.status !== 'Available' ? `(${d.status})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Select Vehicle</label>
                                <select
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold text-sm focus:border-indigo-500 outline-none"
                                    value={tripVehicleId}
                                    onChange={(e) => setTripVehicleId(e.target.value)}
                                >
                                    <option value="">Select Vehicle...</option>
                                    {vehicles.map(v => (
                                        <option key={v.id} value={v.id}>
                                            {v.plate_number} ({v.max_volume_m3}m³)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setIsTripModalOpen(false)}
                                className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-400 p-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTrip}
                                disabled={!tripDriverId || !tripVehicleId}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-indigo-900/20"
                            >
                                Create Trip
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dispatch;
