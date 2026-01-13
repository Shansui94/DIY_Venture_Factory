import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Truck, MapPin, CheckCircle, Navigation, Package, User, Calendar, Camera, PenTool, X, UploadCloud } from 'lucide-react';
import { LogisticsTrip, SalesOrder } from '../types';

interface DriverDeliveryProps {
    user: any;
}

const DriverDelivery: React.FC<DriverDeliveryProps> = ({ user }) => {
    // Mode: 'Trip' (New) or 'Legacy' (Fallback)
    const [activeTrip, setActiveTrip] = useState<LogisticsTrip | null>(null);
    const [loading, setLoading] = useState(true);

    // POD State
    const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
    const [isPODOpen, setIsPODOpen] = useState(false);
    const [signature, setSignature] = useState<string | null>(null);
    const [photoFunction, setPhotoFunction] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // Canvas Ref for Signature
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (!user?.uid) return;

            // 1. Check for Active Trip (En-Route)
            const { data: tripData } = await supabase
                .from('logistics_trips')
                .select(`*, sys_vehicles(*)`)
                .eq('driver_id', user.uid)
                .in('status', ['En-Route', 'Ready', 'Loading']) // Show even if loading
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (tripData) {
                // Fetch Orders for Trip
                const { data: orders } = await supabase
                    .from('sales_orders')
                    .select('*')
                    .eq('trip_id', tripData.trip_id)
                    .order('stop_sequence', { ascending: true });

                setActiveTrip({
                    ...tripData,
                    orders: orders || [],
                    vehicle: tripData.sys_vehicles
                });
            } else {
                setActiveTrip(null);
            }

        } catch (error) {
            console.error("Driver Load Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    // --- POD LOGIC ---

    const openPOD = (order: SalesOrder) => {
        setSelectedOrder(order);
        setSignature(null);
        setPhotoFunction(null);
        setIsPODOpen(true);
        setTimeout(initCanvas, 100); // Delay for modal render
    };

    const initCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        // Handle resizing? keeping it fixed for MVP
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const startDrawing = (e: any) => {
        isDrawing.current = true;
        draw(e);
    };

    const stopDrawing = () => {
        isDrawing.current = false;
        const canvas = canvasRef.current;
        if (canvas) {
            ctx(canvas)?.beginPath(); // reset path
            setSignature(canvas.toDataURL()); // Save state
        }
    };

    const draw = (e: any) => {
        if (!isDrawing.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        const clientY = e.clientY || e.touches?.[0]?.clientY;

        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
    };

    const ctx = (canvas: HTMLCanvasElement) => canvas.getContext('2d');

    const handlePODSubmit = async () => {
        if (!selectedOrder) return;
        setUploading(true);

        try {
            let photoUrl = '';
            let signatureUrl = signature; // DataURL is fine for now, or upload as file

            // Upload Photo if exists
            if (photoFunction) {
                const fileName = `pod/${selectedOrder.id}/${Date.now()}.jpg`;
                // Mock Upload for MVP (or real if bucket exists). 
                // Assuming no storage bucket 'pod' configured yet. 
                // We'll skip actual upload to bucket and use a placeholder or dataURL if small
                // For MVP, we'll just alert that upload is simulated unless bucket exists.
                // Assuming bucket 'public' exists?
                console.log("Simulating Upload of photo:", photoFunction.name);
                photoUrl = "https://placehold.co/600x400?text=POD+Photo";
            }

            // Update Order
            await supabase.from('sales_orders').update({
                status: 'Delivered',
                pod_signed_by: 'Customer (Digital)', // Could ask for name
                pod_signature_url: signatureUrl, // Storing base64 directly might be large, but ok for MVP < 100kb
                pod_photo_url: photoUrl,
                pod_timestamp: new Date().toISOString()
            }).eq('id', selectedOrder.id);

            alert("Delivery Confirmed!");
            setIsPODOpen(false);
            fetchData();
        } catch (e: any) {
            alert("Error saving POD: " + e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleCompleteTrip = async () => {
        if (!activeTrip) return;
        const confirm = window.confirm("Mark trip as COMPLETED? This will alert dispatch.");
        if (confirm) {
            await supabase.from('logistics_trips').update({
                status: 'Completed',
                completed_at: new Date().toISOString()
            }).eq('trip_id', activeTrip.trip_id);

            alert("Trip Completed. Great job!");
            fetchData(); // Will likely clear the view
        }
    };

    return (
        <div className="min-h-screen bg-[#121215] text-white p-4 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black uppercase text-white">Driver Mode</h1>
                    <div className="flex items-center gap-2 text-gray-500 text-xs mt-1">
                        <User size={12} /> {user?.name || 'Driver'}
                        <span className="text-gray-700">|</span>
                        <Truck size={12} /> {(activeTrip?.vehicle as any)?.plate_number || 'No Vehicle'}
                    </div>
                </div>
                {activeTrip && (
                    <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-xs font-bold uppercase border border-green-500/30 animate-pulse">
                        On Trip
                    </div>
                )}
            </div>

            {/* TRIP VIEW */}
            {activeTrip ? (
                <div className="space-y-6">
                    {/* Trip Card */}
                    <div className="bg-gradient-to-br from-[#1e1e24] to-[#121215] p-5 rounded-2xl border border-white/10 shadow-xl">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Current Trip</div>
                                <div className="text-xl font-black text-white">{activeTrip.trip_number}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-blue-500">
                                    {activeTrip.orders?.filter(o => o.status === 'Delivered').length} / {activeTrip.orders?.length}
                                </div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold">Completed</div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all duration-500"
                                style={{ width: `${(activeTrip.orders?.filter(o => o.status === 'Delivered').length || 0) / (activeTrip.orders?.length || 1) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Stops List */}
                    <div className="space-y-4">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Stops Sequence</h2>
                        {activeTrip.orders?.map((order, idx) => {
                            const isDelivered = order.status === 'Delivered';
                            const isNext = !isDelivered && (idx === 0 || activeTrip.orders?.[idx - 1].status === 'Delivered');

                            return (
                                <div key={order.id} className={`relative p-5 rounded-2xl border transition-all ${isDelivered ? 'bg-[#1e1e24]/50 border-white/5 opacity-60' :
                                        isNext ? 'bg-[#1e1e24] border-blue-500 shadow-lg shadow-blue-900/20 scale-[1.02] z-10' :
                                            'bg-[#1e1e24] border-white/5 opacity-80'
                                    }`}>
                                    {/* Timeline Connector */}
                                    {idx < (activeTrip.orders?.length || 0) - 1 && (
                                        <div className="absolute left-[2.25rem] top-[4rem] bottom-[-2rem] w-0.5 bg-white/5 -z-10" />
                                    )}

                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${isDelivered ? 'bg-green-500/20 text-green-500' :
                                                isNext ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' :
                                                    'bg-gray-700 text-gray-400'
                                            }`}>
                                            {isDelivered ? <CheckCircle size={20} /> : idx + 1}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className={`font-bold text-lg ${isDelivered ? 'text-gray-500 line-through' : 'text-white'}`}>{order.customer}</h3>
                                                <span className="text-[10px] text-gray-500 font-mono">#{order.orderNumber}</span>
                                            </div>

                                            <div className="flex items-center gap-2 text-gray-400 text-sm mt-1 mb-3">
                                                <MapPin size={14} /> {order.deliveryAddress}
                                            </div>

                                            {!isDelivered && (
                                                <div className="grid grid-cols-2 gap-3 mt-4">
                                                    <button
                                                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress || '')}`)}
                                                        className="py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2"
                                                    >
                                                        <Navigation size={14} /> Navigate
                                                    </button>
                                                    <button
                                                        onClick={() => openPOD(order)}
                                                        className="py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40"
                                                    >
                                                        <PenTool size={14} /> Deliver (POD)
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Complete Trip Button */}
                    {activeTrip.orders?.every(o => o.status === 'Delivered') && (
                        <div className="fixed bottom-6 left-6 right-6">
                            <button
                                onClick={handleCompleteTrip}
                                className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-2xl shadow-green-900/50 hover:scale-[1.02] transition-transform flex items-center justify-center gap-3"
                            >
                                <CheckCircle size={24} /> Complete Trip
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
                    <Truck size={64} className="text-gray-600 mb-6" />
                    <h2 className="text-xl font-bold text-white mb-2">No Active Trip</h2>
                    <p className="text-gray-500 max-w-xs">
                        You don't have any active trips assigned. Wait for dispatch or check with the logistics manager.
                    </p>
                </div>
            )}

            {/* POD MODAL */}
            {isPODOpen && selectedOrder && (
                <div className="fixed inset-0 bg-black/90 z-50 flex flex-col animate-in fade-in duration-200">
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <h2 className="font-bold text-white">Proof of Delivery</h2>
                        <button onClick={() => setIsPODOpen(false)} className="p-2 bg-white/10 rounded-full"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">1. Photo Proof (Optional)</label>
                            <div className="border border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 bg-white/5">
                                <UploadCloud size={32} className="mb-2" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => setPhotoFunction(e.target.files?.[0] || null)}
                                    className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                                />
                                <p className="text-[10px] mt-2 text-gray-500">Tap to take photo</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">2. Customer Signature</label>
                            <div className="bg-white rounded-xl overflow-hidden h-40 touch-none">
                                <canvas
                                    ref={canvasRef}
                                    className="w-full h-full cursor-crosshair"
                                    onMouseDown={startDrawing}
                                    onMouseUp={stopDrawing}
                                    onMouseOut={stopDrawing}
                                    onMouseMove={draw}
                                    onTouchStart={startDrawing}
                                    onTouchEnd={stopDrawing}
                                    onTouchMove={draw}
                                />
                            </div>
                            <div className="flex justify-between mt-2">
                                <button onClick={initCanvas} className="text-xs text-red-400 font-bold uppercase">Clear Signature</button>
                                <p className="text-[10px] text-gray-500">Sign in the white box</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-white/10 glass-panel">
                        <button
                            onClick={handlePODSubmit}
                            disabled={uploading}
                            className="w-full py-4 bg-blue-600 rounded-xl font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {uploading ? 'Uploading...' : 'Confirm Delivery'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverDelivery;
