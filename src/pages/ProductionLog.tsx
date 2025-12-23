import React, { useState } from 'react';
import { jobOrders } from '../data/mockData';
import { Download } from 'lucide-react';
import { ProductionLog as ProductionLogType, UserRole } from '../types';

interface ProductionLogProps {
    logs: ProductionLogType[];
    userRole: UserRole | string;
}

const ProductionLog: React.FC<ProductionLogProps> = ({ logs, userRole }) => {
    const displayLogs = logs || [];
    const [formData, setFormData] = useState({
        jobId: '',
        outputQty: '',
        notes: ''
    });

    const activeJobs = jobOrders.filter(j => j.Status === 'Production');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert(`Production Logged!\nJob: ${formData.jobId}\nOutput: ${formData.outputQty}`);
        setFormData({ jobId: '', outputQty: '', notes: '' });
    };

    const handleExport = () => {
        if (!displayLogs || displayLogs.length === 0) {
            alert("No logs to export");
            return;
        }

        // Define headers
        const headers = ["Timestamp", "Job_ID", "Output_Qty", "Operator_Email", "GPS_Coordinates", "Stock_Deduction_Status"];

        // Convert to CSV
        const csvContent = [
            headers.join(','),
            ...displayLogs.map(log => [
                `"${log.Timestamp}"`,
                log.Job_ID,
                log.Output_Qty,
                log.Operator_Email,
                `"${log.GPS_Coordinates || ''}"`,
                log.Stock_Deduction_Status || 'Pending'
            ].join(','))
        ].join('\n');

        // Create Blob and Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `production_logs_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1 className="text-3xl font-bold text-white mb-2">Log Production</h1>
                <p className="text-slate-400">Record output for active jobs</p>

                {(userRole === 'Manager' || userRole === 'Admin') && (
                    <button
                        onClick={handleExport}
                        className="mt-4 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2 mx-auto font-bold transition-colors"
                    >
                        <Download size={18} /> Export to CSV
                    </button>
                )}
            </header>

            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Select Job Order</label>
                        <select
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white"
                            value={formData.jobId}
                            onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                            required
                        >
                            <option value="">-- Select Active Job --</option>
                            {activeJobs.map(job => (
                                <option key={job.Job_ID} value={job.Job_ID}>
                                    {job.Job_ID} - {job.SKU_ID} (Target: {job.Target_Qty})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Output Quantity</label>
                        <input
                            type="number"
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white"
                            value={formData.outputQty}
                            onChange={(e) => setFormData({ ...formData, outputQty: e.target.value })}
                            required
                            min="1"
                        />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Notes / Issues</label>
                        <textarea
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white min-h-[100px]"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg">
                        Submit Production Log
                    </button>
                </form>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 className="text-xl font-bold text-white mb-4">Recent Logs</h2>
                <div className="space-y-4">
                    {displayLogs.map((log) => (
                        <div key={log.Log_ID} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center border border-gray-700">
                            <div>
                                <div className="font-bold text-white">{log.Job_ID}</div>
                                <div className="text-sm text-gray-500">{log.Timestamp}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-xl text-green-400">{log.Output_Qty} Rolls</div>
                                <div className="text-sm text-gray-400">{log.Operator_Email}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProductionLog;
