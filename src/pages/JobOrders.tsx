import React from 'react';
import { Database } from 'lucide-react';
import { JobOrder } from '../types';
import JobFeed from './JobFeed';

interface JobOrdersProps {
    jobs: JobOrder[];
    onCreateJob: (jobData: any) => void;
    onReorderJobs: (items: JobOrder[]) => void; // Kept for interface compatibility
}

const JobOrders: React.FC<JobOrdersProps> = ({ jobs, onCreateJob, onReorderJobs }) => {

    // Mock Update Handler (In real app, update via Supabase/App.tsx)
    const handleUpdateJob = (jobId: string, updates: Partial<JobOrder>) => {
        // Find job index
        const updatedJobs = jobs.map(j => {
            if ((j.Job_ID || j.id) === jobId) {
                return { ...j, ...updates };
            }
            return j;
        });
        onReorderJobs(updatedJobs);
    };

    return (
        <div className="space-y-4 animate-fade-in h-screen flex flex-col pb-4">
            {/* Header */}
            <div className="flex justify-between items-center shrink-0 mb-2">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Database className="text-indigo-500" /> Production Live Feed
                    </h2>
                    <p className="text-gray-400 text-xs">Chat-based command center for machine operators.</p>
                </div>
            </div>

            {/* Smart Feed Component */}
            <JobFeed
                jobs={jobs}
                onCreateJob={onCreateJob}
                onUpdateJob={handleUpdateJob}
            />
        </div>
    );
};

export default JobOrders;

