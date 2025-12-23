import React, { useState } from 'react';
import { Truck, MapPin, Package } from 'lucide-react';
import { JobOrder } from '../types';
import { LORRIES } from '../data/deliveryData';

interface DispatchProps {
    jobs: JobOrder[];
    onUpdateJob: (jobId: string, updates: Partial<JobOrder>) => void;
}

const Dispatch: React.FC<DispatchProps> = ({ jobs, onUpdateJob }) => {
    const [selectedZone, setSelectedZone] = useState<string>('All');

    // Filter Jobs: Completed Production but Delivery Pending
    const pendingDeliveries = jobs.filter(j =>
        (j.status === 'Completed' || j.Status === 'Completed') &&
        (!j.deliveryStatus || j.deliveryStatus === 'Pending')
    );

    // Filter Jobs by Zone for Display
    const displayedJobs = selectedZone === 'All'
        ? pendingDeliveries
        : pendingDeliveries.filter(j => j.deliveryZone === selectedZone);

    // Calculate Counts
    const zoneCounts = pendingDeliveries.reduce((acc, job) => {
        const zone = job.deliveryZone || 'Unknown';
        acc[zone] = (acc[zone] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Handle Assign
    const handleAssign = (jobId: string, lorryId: string) => {
        if (window.confirm(`Assign Job ${jobId} to Lorry ${lorryId}?`)) {
            const lorry = LORRIES.find(l => l.id === lorryId);
            onUpdateJob(jobId, {
                deliveryStatus: 'In-Transit',
                driverId: lorry?.driverUserId, // Assign to the Driver User ID
                // In a real app we might also store lorryId
            });
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-20">
            <header className="flex justify-between items-center bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Truck className="text-blue-400" />
                        Smart Dispatch
                    </h1>
                    <p className="text-gray-400">Logistics & Fleet Management</p>
                </div>
                <div className="bg-blue-600 px-4 py-2 rounded-lg font-bold text-white">
                    {pendingDeliveries.length} Pending Orders
                </div>
            </header>

            {/* Zone Filter & Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {['All', 'North', 'Central_Left', 'Central_Right', 'South', 'East'].map(zone => (
                    <button
                        key={zone}
                        onClick={() => setSelectedZone(zone)}
                        className={`p-4 rounded-xl border transition-all ${selectedZone === zone
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                            }`}
                    >
                        <div className="font-bold text-lg">{zone}</div>
                        <div className="text-sm opacity-80">{zone === 'All' ? pendingDeliveries.length : (zoneCounts[zone] || 0)} Orders</div>
                    </button>
                ))}
            </div>

            {/* Main Content Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Pending Orders List */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Package /> Pending Assignments
                    </h2>
                    {displayedJobs.length === 0 ? (
                        <div className="bg-gray-800/50 p-8 rounded-xl text-center text-gray-500 border border-gray-700">
                            No pending orders for {selectedZone}.
                        </div>
                    ) : (
                        displayedJobs.map(job => (
                            <div key={job.Job_ID} className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-blue-400 font-bold">{job.Job_ID}</span>
                                            <span className="bg-gray-700 text-xs px-2 py-1 rounded text-white">{job.deliveryZone || 'No Zone'}</span>
                                        </div>
                                        <h3 className="text-white font-bold text-lg mt-1">{job.customer}</h3>
                                        <p className="text-gray-400 text-sm flex items-center gap-1">
                                            <MapPin size={14} /> {job.deliveryAddress || 'No Address Provided'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-white">{job.produced} <span className="text-sm font-normal text-gray-400">Rolls</span></div>
                                        <div className="text-xs text-green-400">{job.product}</div>
                                    </div>
                                </div>

                                {/* Quick Assign Dropdown */}
                                <div className="border-t border-gray-700 pt-4 flex items-center gap-3">
                                    <span className="text-sm text-gray-500">Assign to:</span>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {LORRIES.filter(l => l.preferredZone === job.deliveryZone || selectedZone === 'All').slice(0, 4).map(lorry => (
                                            <button
                                                key={lorry.id}
                                                onClick={() => handleAssign(job.Job_ID, lorry.id)}
                                                className="flex items-center gap-2 bg-gray-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap"
                                            >
                                                <Truck size={14} />
                                                {lorry.plateNumber} ({lorry.driverName})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* 2. Fleet Status */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Truck /> Fleet Status
                    </h2>
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        {LORRIES.map(lorry => {
                            // Mock Load Calculation: Filter jobs in 'In-Transit' for this driver
                            // In a real app we'd pass this as a prop or calc from global jobs
                            const currentLoad = jobs.filter(j => j.driverId === lorry.driverUserId && j.deliveryStatus === 'In-Transit').length;

                            return (
                                <div key={lorry.id} className="p-4 border-b border-gray-700 last:border-0 hover:bg-gray-750">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-white">{lorry.plateNumber}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${lorry.status === 'Available' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {lorry.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400 flex justify-between">
                                        <span>{lorry.driverName} • {lorry.preferredZone}</span>
                                        <span className={currentLoad > 0 ? "text-blue-400 font-bold" : ""}>
                                            {currentLoad} Active Orders
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dispatch;
