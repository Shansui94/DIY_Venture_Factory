import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { JobOrder } from '../types';
import { Truck, MapPin, CheckCircle, Navigation } from 'lucide-react';

interface DriverDeliveryProps {
    user: any;
}

const DriverDelivery: React.FC<DriverDeliveryProps> = ({ user }) => {
    const [jobs, setJobs] = useState<JobOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'Pending' | 'Completed'>('Pending');

    // Fetch Jobs assigned to this driver or unassigned if needed
    // Assuming simplified logic: Show all "Ready-to-Ship" or "In-Transit" jobs in current zone preference (if any)
    const fetchJobs = async () => {
        setLoading(true);
        try {
            // Fetch jobs that are relevant for delivery
            let query = supabase
                .from('job_orders')
                .select('*')
                .order('created_at', { ascending: false });

            // If we had driver assignment, we'd filter by driver_id.
            // For now, let's just show all jobs that need delivery or are in transit.

            const { data } = await query;

            if (data) {
                const allJobs: JobOrder[] = data.map(j => ({
                    Job_ID: j.job_id,
                    id: j.id,
                    customer: j.customer,
                    product: j.product,
                    target: j.target_qty,
                    produced: j.produced_qty,
                    status: j.status as any,
                    machine: j.machine,
                    Priority: j.priority as any,
                    deliveryZone: j.delivery_zone as any,
                    deliveryAddress: j.delivery_address || '123 Industrial Park, Factory Rd', // Placeholder if null
                    deliveryStatus: j.delivery_status as any || (j.status === 'Ready-to-Ship' ? 'Pending' : 'Delivered') // Infer
                }));

                // Filter for "delivery view"
                // Pending = Ready to Ship or In Transit
                // Completed = Delivered
                const relevantJobs = allJobs.filter(j => {
                    if (activeTab === 'Pending') return ['Ready-to-Ship', 'Shipped'].includes(j.status || '');
                    return j.status === 'Completed' || j.deliveryStatus === 'Delivered'; // Simplified logic
                });

                setJobs(relevantJobs);
            }
        } catch (error) {
            console.error("Error fetching delivery jobs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, [activeTab]); // Re-fetch when switching tabs

    const updateStatus = async (jobId: string, newStatus: string) => {
        // Optimistic Update
        setJobs(jobs.filter(j => j.id !== jobId));

        try {
            // If Delivered, maybe mark Job as Completed too?
            const updates: any = { delivery_status: newStatus };
            if (newStatus === 'Delivered') {
                updates.status = 'Completed'; // Fully close the loop
            } else if (newStatus === 'In-Transit') {
                updates.status = 'Shipped';
            }

            await supabase
                .from('job_orders')
                .update(updates)
                .eq('id', jobId);

            alert(`Order Updated to ${newStatus}`);
        } catch (error) {
            console.error("Update failed", error);
            fetchJobs(); // Revert
        }
    };

    return (
        <div className="p-4 bg-gray-900 min-h-screen text-gray-100 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 bg-blue-600 p-4 -mx-4 -mt-4 shadow-lg">
                <Truck className="text-white" size={28} />
                <div>
                    <h1 className="text-xl font-bold text-white">Driver Portal</h1>
                    <p className="text-blue-200 text-xs">Welcome, {user?.email}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-800 p-1 rounded-lg mb-6">
                <button
                    onClick={() => setActiveTab('Pending')}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'Pending' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                >
                    Current Tasks
                </button>
                <button
                    onClick={() => setActiveTab('Completed')}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'Completed' ? 'bg-green-600 text-white' : 'text-gray-400'}`}
                >
                    History
                </button>
            </div>

            {/* Job List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center text-gray-500 py-10">Loading Deliveries...</div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                        <Truck size={48} className="mx-auto mb-2 opacity-50" />
                        <p>No {activeTab.toLowerCase()} deliveries.</p>
                    </div>
                ) : (
                    jobs.map(job => (
                        <div key={job.id} className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700">
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-white">{job.customer}</h3>
                                    <span className="bg-gray-700 text-xs font-mono px-2 py-1 rounded text-gray-300">{job.Job_ID}</span>
                                </div>
                                <div className="flex items-start gap-3 mb-4">
                                    <MapPin className="text-red-400 shrink-0 mt-0.5" size={16} />
                                    <p className="text-gray-300 text-sm leading-tight ml-[-4px]">
                                        {job.deliveryAddress || 'No Address Provided'}
                                    </p>
                                </div>
                                <div className="flex gap-4 text-xs text-gray-400 mb-4 bg-gray-900/50 p-2 rounded">
                                    <div>
                                        <span className="block font-bold text-gray-500 uppercase">Product</span>
                                        <span className="text-white">{job.product}</span>
                                    </div>
                                    <div>
                                        <span className="block font-bold text-gray-500 uppercase">Qty</span>
                                        <span className="text-white">{job.target} Rolls</span>
                                    </div>
                                    <div>
                                        <span className="block font-bold text-gray-500 uppercase">Zone</span>
                                        <span className="text-white">{job.deliveryZone || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {activeTab === 'Pending' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.deliveryAddress || '')}`)}
                                            className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Navigation size={18} /> Navigate
                                        </button>

                                        {/* Swipe Logic Simulated by Button for Web */}
                                        <button
                                            onClick={() => updateStatus(job.id || '', 'Delivered')}
                                            className="bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <CheckCircle size={18} /> Complete
                                        </button>
                                    </div>
                                )}

                                {activeTab === 'Completed' && (
                                    <div className="text-green-400 text-sm font-bold flex items-center gap-2">
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
