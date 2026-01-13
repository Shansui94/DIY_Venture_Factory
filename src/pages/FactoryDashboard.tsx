
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

interface MachineStats {
    machine_id: string;
    total_count: number;
    last_seen: string;
    status: 'Online' | 'Offline';
    current_product?: string;
}

const FactoryDashboard = () => {
    const [machines, setMachines] = useState<{ [key: string]: MachineStats }>({});
    const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
    const [activeProducts, setActiveProducts] = useState<{ [key: string]: string[] }>({});

    // Fetch Active Products Map
    useEffect(() => {
        const fetchActive = async () => {
            const { data } = await supabase.from('machine_active_products').select('*');
            if (data) {
                const map: { [key: string]: string[] } = {};
                data.forEach(row => {
                    if (!map[row.machine_id]) map[row.machine_id] = [];
                    map[row.machine_id].push(`${row.product_sku || 'Unknown'} (${row.lane_id})`);
                });
                setActiveProducts(map);
            }
        };
        fetchActive();

        // Subscribe to changes on active products
        const channel = supabase.channel('active-products-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'machine_active_products' }, () => {
                fetchActive();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Initialize with data (Aggregated simulation for now, or fetch latest logs)
    useEffect(() => {
        fetchInitialData();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('production-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'production_logs' },
                (payload) => {
                    const newLog = payload.new;
                    console.log('New Production Log:', newLog);
                    handleNewLog(newLog);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Check for offline machines every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setMachines(prev => {
                const now = Date.now();
                const updated = { ...prev };
                let converted = false;

                Object.keys(updated).forEach(key => {
                    const machine = updated[key];
                    const lastSeenTime = new Date(machine.last_seen).getTime();
                    // If no signal for 2 minutes, consider offline
                    if (now - lastSeenTime > 120000 && machine.status === 'Online') {
                        updated[key] = { ...machine, status: 'Offline' };
                        converted = true;
                    }
                });

                return converted ? updated : prev;
            });
            setLastUpdate(Date.now()); // Trigger re-render
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchInitialData = async () => {
        // Scope to TODAY only
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        console.log("Fetching logs since:", todayISO);

        const { data, error } = await supabase
            .from('production_logs')
            .select('*')
            .gte('created_at', todayISO)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching initial logs:', error);
            return;
        }

        const stats: { [key: string]: MachineStats } = {};

        // Aggregate logs for today
        data.forEach(log => {
            if (!stats[log.machine_id]) {
                stats[log.machine_id] = {
                    machine_id: log.machine_id,
                    total_count: 0,
                    last_seen: log.created_at,
                    status: 'Offline',
                    current_product: log.product_sku
                };
            }
            stats[log.machine_id].total_count += (log.alarm_count || 1);

            // Keep the most recent product SKU
            if (new Date(log.created_at) >= new Date(stats[log.machine_id].last_seen)) {
                stats[log.machine_id].last_seen = log.created_at;
                if (log.product_sku) stats[log.machine_id].current_product = log.product_sku;
            }
        });

        // Determine status based on recentness (e.g., within last 5 mins)
        const now = new Date().getTime();
        Object.keys(stats).forEach(key => {
            const timeDiff = now - new Date(stats[key].last_seen).getTime();
            if (timeDiff < 300000) { // 5 mins
                stats[key].status = 'Online';
            }
        });

        setMachines(stats);
    };

    const handleNewLog = (log: any) => {
        setMachines(prev => {
            const current = prev[log.machine_id] || {
                machine_id: log.machine_id,
                total_count: 0,
                last_seen: new Date().toISOString(),
                status: 'Online',
                current_product: log.product_sku
            };

            return {
                ...prev,
                [log.machine_id]: {
                    ...current,
                    total_count: current.total_count + (log.alarm_count || 1),
                    last_seen: log.created_at || new Date().toISOString(),
                    status: 'Online',
                    current_product: log.product_sku || current.current_product
                }
            };
        });
    };

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Factory Dashboard</h1>
                    <p className="text-gray-500">Real-time Production Monitoring</p>
                </div>
                <div className="text-sm text-gray-400">
                    Last Check: {new Date(lastUpdate).toLocaleTimeString()}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.values(machines).map(machine => (
                    <div
                        key={machine.machine_id}
                        className={`bg-white rounded-xl shadow-sm p-6 border-l-4 transition-all duration-300 ${machine.status === 'Online' ? 'border-green-500 shadow-md ring-2 ring-green-50' : 'border-gray-300 opacity-80'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold text-gray-700">
                                {machine.machine_id}
                            </h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${machine.status === 'Online'
                                ? 'bg-green-100 text-green-700 animate-pulse'
                                : 'bg-gray-100 text-gray-500'
                                }`}>
                                {machine.status.toUpperCase()}
                            </span>
                        </div>

                        {/* DISPLAY ACTIVE PRODUCTS (Dual Lane Support) */}
                        <div className="mb-4 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${machine.status === 'Online' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                <span className="text-xs text-gray-500 font-bold uppercase">Running Production</span>
                            </div>

                            {activeProducts[machine.machine_id] && activeProducts[machine.machine_id].length > 0 ? (
                                activeProducts[machine.machine_id].map((sku, idx) => (
                                    <div key={idx} className="text-sm font-bold text-gray-700 truncate pl-5">
                                        • {sku}
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm font-bold text-gray-700 truncate pl-5">
                                    {machine.current_product || 'Idle / No Config'}
                                </div>
                            )}
                        </div>

                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-5xl font-extrabold text-gray-900">
                                {machine.total_count}
                            </span>
                            <span className="text-gray-400 font-medium">units</span>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
                            <span>Last Signal:</span>
                            <span className="font-mono">
                                {new Date(machine.last_seen).toLocaleTimeString()}
                            </span>
                        </div>
                    </div>
                ))
                }

                {
                    Object.keys(machines).length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-400">
                            <p>Waiting for machine signals...</p>
                            <p className="text-sm mt-2">Send a POST to /api/alarm to activate.</p>
                        </div>
                    )
                }
            </div >
        </div >
    );
};

export default FactoryDashboard;
