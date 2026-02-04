
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Users, CheckCircle, XCircle, Calendar, Clock, User as UserIcon } from 'lucide-react';

interface LeaveRequest {
    id: string;
    driver_id: string;
    start_date: string;
    end_date: string;
    count_days: number;
    status: 'Pending' | 'Approved' | 'Rejected';
    created_at: string;
    users_public?: {
        name: string;
        email: string;
    };
}

const HRPortal: React.FC = () => {
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        // We join with users_public using driver_id matching users_public.id
        const { data, error } = await supabase
            .from('driver_leave')
            .select(`
                *,
                users_public:driver_id (name, email)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching leave requests:', error);
        } else {
            setRequests(data || []);
        }
        setLoading(false);
    };

    const handleAction = async (id: string, newStatus: 'Approved' | 'Rejected') => {
        const confirmMsg = newStatus === 'Approved' ? "Approve this leave request?" : "Reject this leave request?";
        if (!window.confirm(confirmMsg)) return;

        const { error } = await supabase
            .from('driver_leave')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            alert(error.message);
        } else {
            fetchRequests();
        }
    };

    const pendingList = requests.filter(r => r.status === 'Pending');
    const historyList = requests.filter(r => r.status !== 'Pending');
    const displayList = activeTab === 'pending' ? pendingList : historyList;

    return (
        <div className="p-8 bg-[#121215] min-h-screen text-slate-100">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-white italic flex items-center gap-3">
                    <Users className="text-blue-500" />
                    HR Control Center
                </h1>
                <p className="text-slate-400 mt-1">Approve or manage driver leave applications (Cuti).</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-all ${activeTab === 'pending' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'
                        }`}
                >
                    Pending Approval ({pendingList.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-all ${activeTab === 'history' ? 'bg-slate-800 text-slate-300' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'
                        }`}
                >
                    Leave History ({historyList.length})
                </button>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-20 text-slate-500 flex flex-col items-center gap-3">
                        <Clock className="animate-spin text-blue-500" size={32} />
                        <span>Loading applications...</span>
                    </div>
                ) : displayList.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-800 text-slate-500">
                        No leave requests found in this category.
                    </div>
                ) : (
                    displayList.map((req) => (
                        <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-blue-500/30 transition-all">
                            <div className="flex items-center gap-6 flex-1">
                                <div className="w-16 h-16 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center text-blue-500 shadow-inner">
                                    <UserIcon size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight">{req.users_public?.name || 'Unknown Driver'}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{req.users_public?.email}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-600 mt-2 font-mono flex items-center gap-1">
                                        <Clock size={10} /> APPLIED ON: {new Date(req.created_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-10 text-center">
                                <div className="bg-slate-950/50 px-6 py-3 rounded-2xl border border-slate-800">
                                    <div className="text-[10px] font-black text-slate-500 uppercase mb-1 flex items-center justify-center gap-1">
                                        <Calendar size={10} /> Date Range
                                    </div>
                                    <div className="text-sm font-bold text-white">
                                        {req.start_date} → {req.end_date}
                                    </div>
                                    <div className="text-[10px] font-bold text-blue-400 mt-1 uppercase">{req.count_days} Total Days</div>
                                </div>

                                <div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Status</div>
                                    <div className={`text-xs font-bold uppercase px-4 py-1.5 rounded-full border ${req.status === 'Approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                            req.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                        }`}>
                                        {req.status}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto">
                                {activeTab === 'pending' ? (
                                    <>
                                        <button
                                            onClick={() => handleAction(req.id, 'Approved')}
                                            className="flex-1 md:w-auto px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                                        >
                                            <CheckCircle size={16} /> Approve
                                        </button>
                                        <button
                                            onClick={() => handleAction(req.id, 'Rejected')}
                                            className="flex-1 md:w-auto px-6 py-3 bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-400 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2"
                                        >
                                            <XCircle size={16} /> Reject
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-xs font-bold text-slate-600 italic">
                                        Processed on {new Date(req.created_at).toLocaleDateString()}
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

export default HRPortal;
