
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Wrench, CheckCircle, Calendar, Truck, User } from 'lucide-react';

const MaintenanceManagement: React.FC = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('lorry_service_requests')
            .select(`
                *,
                users_public (name, email)
            `)
            .order('created_at', { ascending: false });

        if (data) setRequests(data);
        setLoading(false);
    };

    const handleSchedule = async (id: string) => {
        const date = window.prompt("Enter Scheduled Date (YYYY-MM-DD):");
        if (!date) return;

        const { error } = await supabase
            .from('lorry_service_requests')
            .update({ status: 'Scheduled', scheduled_date: date })
            .eq('id', id);

        if (error) alert(error.message);
        else fetchRequests();
    };

    const handleDone = async (id: string) => {
        if (!window.confirm("Mark as Maintenance Completed?")) return;

        const { error } = await supabase
            .from('lorry_service_requests')
            .update({ status: 'Completed', completed_at: new Date().toISOString() })
            .eq('id', id);

        if (error) alert(error.message);
        else fetchRequests();
    };

    const pendingList = requests.filter(r => r.status !== 'Completed');
    const historyList = requests.filter(r => r.status === 'Completed');
    const displayList = activeTab === 'pending' ? pendingList : historyList;

    return (
        <div className="p-8 bg-[#121215] min-h-screen text-slate-100">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-white italic flex items-center gap-3">
                    <Wrench className="text-amber-500" />
                    Maintenance Control
                </h1>
                <p className="text-slate-400 mt-1">Manage lorry service requests and schedules.</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-all ${activeTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'
                        }`}
                >
                    Pending for Service ({pendingList.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-all ${activeTab === 'history' ? 'bg-green-600/20 text-green-500 border border-green-500/30' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'
                        }`}
                >
                    Service History ({historyList.length})
                </button>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-20 text-slate-500">Loading requests...</div>
                ) : displayList.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-800 text-slate-500">
                        No service requests found.
                    </div>
                ) : (
                    displayList.map((req) => (
                        <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-6 flex-1">
                                <div className="w-16 h-16 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-500">
                                    <Truck size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight">{req.plate_number}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <User size={12} className="text-slate-500" />
                                        <span className="text-xs font-bold text-slate-400">{req.users_public?.name || 'Unknown Driver'}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-600 mt-2 font-mono">REQUESTED ON: {new Date(req.created_at).toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-12 text-center">
                                <div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Status</div>
                                    <div className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${req.status === 'Completed' ? 'bg-green-500/10 text-green-500' :
                                        req.status === 'Scheduled' ? 'bg-blue-500/10 text-blue-500' :
                                            'bg-amber-500/10 text-amber-500'
                                        }`}>
                                        {req.status}
                                    </div>
                                </div>
                                {req.scheduled_date && (
                                    <div>
                                        <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Scheduled Date</div>
                                        <div className="text-sm font-bold text-white">{new Date(req.scheduled_date).toLocaleDateString()}</div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 w-full md:w-auto">
                                {activeTab === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => handleSchedule(req.id)}
                                            className="flex-1 md:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2"
                                        >
                                            <Calendar size={14} /> Schedule
                                        </button>
                                        <button
                                            onClick={() => handleDone(req.id)}
                                            className="flex-1 md:w-auto px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={14} /> Done
                                        </button>
                                    </>
                                )}
                                {activeTab === 'history' && (
                                    <div className="text-xs font-bold text-slate-500 italic">
                                        Completed on {new Date(req.completed_at).toLocaleDateString()}
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

export default MaintenanceManagement;
