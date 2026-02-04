
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Truck, Wrench, Send, History, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface LorryServiceProps {
    user: any;
}

const LorryService: React.FC<LorryServiceProps> = ({ user }) => {
    const [plateNumber, setPlateNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [serviceHistory, setServiceHistory] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            fetchDriverLorry();
            fetchServiceHistory();
        }
    }, [user]);

    const fetchDriverLorry = async () => {
        // Try to fetch from a vehicles or metadata table if available
        // For now, let's assume we can prompt or it's in user profile
        const { data: profile } = await supabase.from('users_public').select('notes').eq('id', user.uid).single();
        if (profile?.notes && profile.notes.includes('Plate:')) {
            const match = profile.notes.match(/Plate:\s*([^\s,]+)/);
            if (match) setPlateNumber(match[1]);
        }

        // Fallback: If not found, look at assigned orders
        if (!plateNumber) {
            const { data: orders } = await supabase.from('sales_orders').select('notes').eq('driver_id', user.uid).limit(1);
            if (orders && orders.length > 0 && orders[0].notes?.includes('Lorry:')) {
                const match = orders[0].notes.match(/Lorry:\s*([^\s,]+)/);
                if (match) setPlateNumber(match[1]);
            }
        }
    };

    const fetchServiceHistory = async () => {
        const { data } = await supabase
            .from('lorry_service_requests')
            .select('*')
            .eq('driver_id', user.uid)
            .order('created_at', { ascending: false });
        if (data) setServiceHistory(data);
    };

    const handleRequest = async () => {
        if (!plateNumber) {
            const plate = window.prompt("Enter Lorry Plate Number:");
            if (!plate) return;
            setPlateNumber(plate);
            // Auto-submit after prompt
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.from('lorry_service_requests').insert({
                driver_id: user.uid,
                plate_number: plateNumber || 'UNKNOWN',
                status: 'Pending'
            });

            if (error) throw error;

            alert("✅ Service Request Sent to Vivian!");
            fetchServiceHistory();
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-slate-200 p-4 pb-20 font-sans">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8 pt-4">
                <div className="p-3 bg-amber-600/20 rounded-2xl border border-amber-500/30 text-amber-400">
                    <Truck size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white italic uppercase tracking-wider">Lorry Service</h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Maintenance Control</p>
                </div>
            </div>

            {/* Large Request Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 mb-8 shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform duration-700">
                    <Wrench size={120} />
                </div>

                <div className="relative z-10 text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Assigned Vehicle</p>
                    <h2 className="text-4xl font-black text-white mb-8 tracking-tighter">
                        {plateNumber || 'NO PLATE SET'}
                    </h2>

                    <button
                        onClick={handleRequest}
                        disabled={submitting}
                        className="w-full py-6 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black rounded-2xl font-black text-lg uppercase tracking-widest flex items-center justify-center gap-4 shadow-xl shadow-amber-900/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {submitting ? 'SENDING...' : (
                            <>
                                <Wrench size={24} />
                                Request Service
                            </>
                        )}
                    </button>
                    <p className="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Vivian will be notified immediately</p>
                </div>
            </div>

            {/* History */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <History size={16} className="text-slate-500" />
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Request History</h2>
                </div>

                {serviceHistory.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
                        <AlertCircle size={32} className="mx-auto mb-2 text-slate-700" />
                        <p className="text-slate-500 text-sm font-bold">No history available</p>
                    </div>
                ) : (
                    serviceHistory.map((req, idx) => (
                        <div key={idx} className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl flex justify-between items-center transition-all hover:border-slate-700">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl ${req.status === 'Completed' ? 'bg-green-500/10 text-green-500' :
                                        req.status === 'Scheduled' ? 'bg-blue-500/10 text-blue-500' :
                                            'bg-amber-500/10 text-amber-500'
                                    }`}>
                                    {req.status === 'Completed' ? <CheckCircle size={20} /> :
                                        req.status === 'Scheduled' ? <Clock size={20} /> : <AlertCircle size={20} />}
                                </div>
                                <div>
                                    <div className="text-white font-bold text-sm uppercase">Maintenance Request</div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase">
                                        {req.scheduled_date ? `Scheduled for: ${new Date(req.scheduled_date).toLocaleDateString()}` : 'Date Pending'}
                                    </div>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${req.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                                    req.status === 'Scheduled' ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-amber-500/20 text-amber-400'
                                }`}>
                                {req.status}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LorryService;
