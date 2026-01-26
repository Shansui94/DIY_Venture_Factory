import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User, ProductionLog } from '../types';
import { generateSessionReport } from '../utils/reportGenerator';
import { FileText, Download, Calendar, Loader } from 'lucide-react';

interface ReportHistoryProps {
    user: User | null;
}

interface SessionKey {
    date: string;
    operatorId: string;
    operatorName: string;
    operatorEmail: string;
}

const ReportHistory: React.FC<ReportHistoryProps> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<{ key: SessionKey, logs: ProductionLog[] }[]>([]);
    const [viewMode, setViewMode] = useState<'mine' | 'all'>('all');

    // Auth Check
    // Boss (001) OR Admin role can see all reports
    const isBoss = user?.employeeId === '001' || user?.role === 'Admin';

    useEffect(() => {
        if (!user) return;
        // Default to 'mine' if not boss, 'all' if boss
        if (!isBoss) setViewMode('mine');
        fetchHistory();
    }, [user, viewMode]);

    const fetchHistory = async () => {
        setLoading(true);
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            let mySystemId: string | null = null;
            const authId = user.uid;
            const { data: profile } = await supabase
                .from('sys_users_v2')
                .select('id, employee_id, name')
                .eq('auth_user_id', authId)
                .single();

            if (profile) mySystemId = profile.id;

            let userMap: Record<string, any> = {};
            if (viewMode === 'all') {
                const { data: allUsers } = await supabase.from('sys_users_v2').select('id, name, email, employee_id');
                if (allUsers) allUsers.forEach(u => { userMap[u.id] = u; });
            } else {
                if (mySystemId && profile) userMap[mySystemId] = profile;
            }

            // PAGINATION LOGIC
            // Supabase API limits to 1000 rows per request by default.
            // We must loop to fetch all data within our date range (30 days).

            let allLogs: any[] = [];
            let page = 0;
            const pageSize = 1000;
            let hasMore = true;

            // Default: Last 30 Days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const dateFilter = thirtyDaysAgo.toISOString();

            while (hasMore) {
                let query = supabase
                    .from('production_logs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .range(page * pageSize, (page + 1) * pageSize - 1)
                    .gte('created_at', dateFilter);

                if (viewMode === 'mine') {
                    if (mySystemId) {
                        query = query.eq('operator_id', mySystemId);
                    } else {
                        break; // Should not happen
                    }
                }

                const { data, error } = await query;

                if (error) {
                    console.error("Error fetching history page " + page, error);
                    break;
                }

                if (data && data.length > 0) {
                    allLogs = [...allLogs, ...data];
                    if (data.length < pageSize) {
                        hasMore = false; // Less than 1000 means we reached the end
                    } else {
                        page++; // Fetch next page
                    }
                } else {
                    hasMore = false;
                }

                // Safety break to prevent infinite loops (e.g. max 10k rows)
                if (allLogs.length >= 10000) break;
            }

            // Process Data (Group by Session)
            const groups: { [key: string]: { key: SessionKey, logs: ProductionLog[] } } = {};

            allLogs.forEach((log: any) => {
                const dateStr = new Date(log.created_at).toLocaleDateString();
                const opId = log.operator_id;
                const opUser = opId ? userMap[opId] : null;

                const opName = opUser?.name || (opId ? 'Unknown Operator' : 'Automatic Machine Log');
                const opEmail = opUser?.email || 'N/A';

                const uniqueKey = `${dateStr}_${opId || 'AUTO'}`;

                if (!groups[uniqueKey]) {
                    groups[uniqueKey] = {
                        key: {
                            date: dateStr,
                            operatorId: opId || 'AUTO',
                            operatorName: opName,
                            operatorEmail: opEmail
                        },
                        logs: []
                    };
                }

                groups[uniqueKey].logs.push({
                    Log_ID: log.id,
                    Timestamp: log.created_at,
                    Job_ID: log.job_id || log.machine_id,
                    Operator_Email: opEmail,
                    Output_Qty: log.alarm_count || 1,
                    Note: log.product_sku,
                    formattedDate: dateStr
                } as any);
            });

            const sessionList = Object.values(groups).sort((a, b) =>
                new Date(b.key.date).getTime() - new Date(a.key.date).getTime()
            );

            setSessions(sessionList);

        } catch (err) {
            console.error("History load failed:", err);
        }
        setLoading(false);
    };

    const handleDownload = (session: { key: SessionKey, logs: ProductionLog[] }) => {
        const { key, logs } = session;
        if (!logs || logs.length === 0) return;

        // Sort ASC for accurate Start/End times
        const sorted = [...logs].sort((a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());

        const startTime = new Date(sorted[0].Timestamp);
        const endTime = new Date(sorted[sorted.length - 1].Timestamp);

        generateSessionReport(
            key.operatorName || key.operatorEmail, // Show Name on PDF
            logs[0].Job_ID || 'Unknown Machine',
            sorted,
            startTime,
            endTime
        );
    };

    const [selectedSession, setSelectedSession] = useState<{ key: SessionKey, logs: ProductionLog[] } | null>(null);

    // ... (existing code)

    return (
        <div className="p-6 max-w-4xl mx-auto pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                {/* ... (existing header) ... */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                        <FileText className="text-blue-600" size={32} />
                        {isBoss && viewMode === 'all' ? 'All Staff Reports' : 'My Report History'}
                    </h1>
                    <p className="text-gray-500">
                        {isBoss ? 'Boss Mode: View daily reports for all operators.' : 'Archive of your daily production reports.'}
                    </p>
                </div>

                {isBoss && (
                    <div className="flex bg-gray-200 p-1 rounded-lg self-start">
                        <button
                            onClick={() => setViewMode('all')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            All Staff
                        </button>
                        <button
                            onClick={() => setViewMode('mine')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'mine' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            My Reports
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader className="animate-spin text-blue-500" size={48} />
                </div>
            ) : (
                <div className="grid gap-4">
                    {sessions.length === 0 && (
                        <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
                            <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No reports found</h3>
                            <p className="text-gray-500">Production logs will appear here once recorded.</p>
                        </div>
                    )}

                    {sessions.map((session, idx) => {
                        const { key, logs } = session;
                        const totalQty = logs.reduce((sum, l) => sum + (Number(l.Output_Qty) || 0), 0);

                        return (
                            <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between hover:shadow-md transition-shadow gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm ${key.operatorId === user?.employeeId ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                        }`}>
                                        {/* Day of Month */}
                                        {new Date(key.date).getDate()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-800">{key.date}</h3>
                                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600 font-bold border border-gray-200">
                                                {key.operatorName}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {logs.length} Entries • Total: <span className="font-bold text-gray-700">{totalQty}</span> Sets
                                            {logs.length > 1 && (() => {
                                                // Calculate Avg Time
                                                const sorted = [...logs].sort((a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());
                                                const start = new Date(sorted[0].Timestamp).getTime();
                                                const end = new Date(sorted[sorted.length - 1].Timestamp).getTime();
                                                const durationMinutes = (end - start) / 60000;

                                                // Avoid division by zero
                                                if (totalQty > 0 && durationMinutes > 0) {
                                                    const avgTime = durationMinutes / totalQty;
                                                    return (
                                                        <span className="ml-2 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                            Avg: {avgTime.toFixed(1)} m/unit
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => setSelectedSession(session)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-bold"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={() => handleDownload(session)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                    >
                                        <Download size={16} />
                                        PDF
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {selectedSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Production Report</h3>
                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                    {selectedSession.key.date} • {selectedSession.key.operatorName}
                                    {(() => {
                                        const logs = selectedSession.logs;
                                        const totalQty = logs.reduce((sum, l) => sum + (Number(l.Output_Qty) || 0), 0);
                                        if (logs.length > 1) {
                                            const sorted = [...logs].sort((a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());
                                            const start = new Date(sorted[0].Timestamp).getTime();
                                            const end = new Date(sorted[sorted.length - 1].Timestamp).getTime();
                                            const durationMinutes = (end - start) / 60000;
                                            if (totalQty > 0 && durationMinutes > 0) {
                                                const avgTime = durationMinutes / totalQty;
                                                return (
                                                    <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-bold text-xs">
                                                        Avg: {avgTime.toFixed(1)} m/unit
                                                    </span>
                                                );
                                            }
                                        }
                                        return null;
                                    })()}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <span className="text-2xl leading-none">&times;</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3">Time</th>
                                        <th className="px-6 py-3">Job / Machine</th>
                                        <th className="px-6 py-3 text-right">Qty</th>
                                        <th className="px-6 py-3">Note</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {selectedSession.logs.map((log) => (
                                        <tr key={log.Log_ID} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">
                                                {new Date(log.Timestamp).toLocaleTimeString()}
                                            </td>
                                            <td className="px-6 py-3 text-gray-600">
                                                {log.Job_ID}
                                            </td>
                                            <td className="px-6 py-3 text-right font-bold text-blue-600">
                                                {log.Output_Qty}
                                            </td>
                                            <td className="px-6 py-3 text-gray-500 truncate max-w-[150px]">
                                                {log.Note || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => handleDownload(selectedSession)}
                                className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                            >
                                <Download size={16} />
                                Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default ReportHistory;
