import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { JobOrder } from '../types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Calendar, Truck, AlertCircle } from 'lucide-react';

// Kanban Board Columns
const COLUMNS = [
    { id: 'Pending', title: 'Pending', color: 'border-yellow-500' },
    { id: 'Scheduled', title: 'Scheduled', color: 'border-blue-500' },
    { id: 'Production', title: 'In Production', color: 'border-green-500' },
    { id: 'Completed', title: 'Completed', color: 'border-gray-500' }
];

const ProductionPlanning: React.FC = () => {
    const [jobs, setJobs] = useState<JobOrder[]>([]);
    // const [loading, setLoading] = useState(true); // Unused

    const fetchJobs = async () => {
        try {
            const { data } = await supabase
                .from('job_orders')
                .select('*')
                .order('order_index', { ascending: true }); // Prioritize by index/priority

            if (data) {
                const mappedJobs: JobOrder[] = data.map(j => ({
                    Job_ID: j.job_id,
                    id: j.id, // DnD needs string ID
                    customer: j.customer,
                    product: j.product,
                    target: j.target_qty,
                    produced: j.produced_qty,
                    status: j.status as any,
                    machine: j.machine,
                    Priority: j.priority as any,
                    deliveryZone: j.delivery_zone as any
                }));
                setJobs(mappedJobs);
            }
        } catch (error) {
            console.error("Error fetching jobs:", error);
        } finally {
            // setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();

        const channel = supabase.channel('planning-board')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_orders' }, fetchJobs)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // Optimistic Update
        const newJobs = Array.from(jobs);
        const movedJob = newJobs.find(j => j.id === draggableId);
        if (!movedJob) return;

        // Update Status if column changed
        const newStatus = destination.droppableId;

        // Remove from old pos, insert to new (This handles reordering visually, but for simplicity we just update status in DB for now)
        // Advanced drag and drop reordering requires updating 'order_index' for all items in the column.
        // For this migration, we will focus on Status Change first.

        const updatedJob = { ...movedJob, status: newStatus as any };

        // Update Local State (Simplified for status)
        const otherJobs = newJobs.filter(j => j.id !== draggableId);
        setJobs([...otherJobs, updatedJob]); // Naive re-render, strictly we should place it right.

        try {
            await supabase
                .from('job_orders')
                .update({ status: newStatus })
                .eq('id', draggableId);
        } catch (error) {
            console.error("Failed to update job status", error);
            fetchJobs(); // Revert
        }
    };

    return (
        <div className="p-6 bg-gray-900 min-h-screen animate-fade-in overflow-x-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Calendar className="text-purple-500" />
                        Production Planning
                    </h1>
                    <p className="text-gray-400 mt-1">Drag and drop jobs to manage production workflow.</p>
                </div>
                <div className="flex gap-3">
                    {/* Add Job Button Placeholder */}
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-6 min-w-[1000px]">
                    {COLUMNS.map(col => (
                        <Droppable key={col.id} droppableId={col.id}>
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex-1 bg-gray-800/50 rounded-xl border-t-4 ${col.color} p-4 min-h-[500px] flex flex-col`}
                                >
                                    <h2 className="text-lg font-bold text-gray-200 mb-4 flex justify-between">
                                        {col.title}
                                        <span className="bg-gray-700 text-xs px-2 py-1 rounded-full text-gray-300">
                                            {jobs.filter(j => j.status === col.id).length}
                                        </span>
                                    </h2>

                                    <div className="space-y-3 flex-1">
                                        {jobs.filter(j => j.status === col.id).map((job, index) => (
                                            <Draggable key={job.id} draggableId={job.id || job.Job_ID} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-sm hover:shadow-lg transition-shadow group ${snapshot.isDragging ? 'rotate-2 ring-2 ring-blue-500 z-50' : ''}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-xs font-mono text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded">
                                                                {job.Job_ID}
                                                            </span>
                                                            {job.Priority === 'High' && (
                                                                <AlertCircle size={14} className="text-red-500" />
                                                            )}
                                                        </div>
                                                        <h4 className="font-bold text-white mb-1">{job.customer}</h4>
                                                        <p className="text-sm text-blue-400 font-medium mb-3">{job.product}</p>

                                                        <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-700 pt-3">
                                                            <div className="flex items-center gap-1">
                                                                <Truck size={12} />
                                                                {job.deliveryZone || 'No Zone'}
                                                            </div>
                                                            <div className="font-mono text-gray-300">
                                                                Qty: <span className="text-white font-bold">{job.target}</span>
                                                            </div>
                                                        </div>

                                                        {/* Progress Bar (if Production) */}
                                                        {col.id === 'Production' && (
                                                            <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-green-500"
                                                                    style={{ width: `${Math.min(100, ((job.produced || 0) / job.target) * 100)}%` }}
                                                                ></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                </div>
                            )}
                        </Droppable>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
};

export default ProductionPlanning;
