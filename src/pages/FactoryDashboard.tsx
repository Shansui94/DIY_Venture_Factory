
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

interface MachineStats {
    machine_id: string;
    total_count: number;
    last_seen: string;
    status: 'Online' | 'Offline';
    current_product?: string;
    // New Health Stats
    reboot_count: number;
    gap_count: number;
    health_status: 'Healthy' | 'Warning' | 'Critical';
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
                    // If no signal for 6 minutes, consider offline
                    if (now - lastSeenTime > 360000 && machine.status === 'Online') {
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
        // 0. Fetch Registered Machines FIRST via API (Bypass RLS)
        let registeredMachines: any[] = [];
        try {
            const res = await fetch('/api/machines');
            if (res.ok) {
                registeredMachines = await res.json();
            } else {
                console.error("Failed to fetch machines API", res.status);
            }
        } catch (e) {
            console.error("Error calling machines API", e);
        }

        const stats: { [key: string]: MachineStats } = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // 1. Initialize all registered machines as Offline
        if (registeredMachines) {
            registeredMachines.forEach(m => {
                stats[m.machine_id] = {
                    machine_id: m.machine_id,
                    total_count: 0,
                    last_seen: todayISO, // Default to start of day
                    status: 'Offline',
                    current_product: undefined,
                    reboot_count: 0,
                    gap_count: 0,
                    health_status: 'Healthy'
                };
            });
        }

        console.log("Fetching logs since:", todayISO);

        const { data, error } = await supabase
            .from('production_logs')
            .select('*')
            .gte('created_at', todayISO)
            .order('created_at', { ascending: true }); // ASC for gap check

        if (error) {
            console.error('Error fetching initial logs:', error);
            // Even if logs fail, set machines so UI isn't empty
            setMachines(stats);
            return;
        }

        // Helper to process a machine if not exists (e.g. ad-hoc machine not in sys_machines_v2)
        const getStats = (id: string) => {
            if (!stats[id]) {
                stats[id] = {
                    machine_id: id,
                    total_count: 0,
                    last_seen: todayISO, // Default start
                    status: 'Offline',
                    current_product: undefined,
                    reboot_count: 0,
                    gap_count: 0,
                    health_status: 'Healthy'
                };
            }
            return stats[id];
        }

        // Aggregate logs for today
        const lastLogTime: { [key: string]: number } = {};

        data.forEach(log => {
            const m = getStats(log.machine_id);
            const logTime = new Date(log.created_at).getTime();

            // 1. Count
            if (log.alarm_count > 0) {
                m.total_count += log.alarm_count;
            } else if (log.alarm_count === 0) {
                // Reboot Signal
                m.reboot_count++;
            }

            // 2. Gap Detection (>10 mins)
            if (lastLogTime[log.machine_id]) {
                const diffMins = (logTime - lastLogTime[log.machine_id]) / 60000;
                if (diffMins > 10) {
                    m.gap_count++;
                }
            }
            lastLogTime[log.machine_id] = logTime;

            // 3. Update Last Seen & Product
            if (logTime >= new Date(m.last_seen).getTime()) {
                m.last_seen = log.created_at;
                if (log.product_sku) m.current_product = log.product_sku;
            }
        });

        // Determine Final Status
        const now = new Date().getTime();
        Object.keys(stats).forEach(key => {
            const m = stats[key];
            const timeDiff = now - new Date(m.last_seen).getTime();

            // Online/Offline
            // Only consider online if last_seen > today start AND < 6 mins ago
            // But last_seen defaults to todayISO. So we need check if it was actually updated?
            // Actually timeDiff logic works fine: if last_seen is 00:00, timeDiff will be huge -> Offline.

            if (timeDiff < 360000) { // 6 mins
                m.status = 'Online';
            } else {
                m.status = 'Offline';
            }

            // Health Status
            if (m.reboot_count > 5 || m.gap_count > 5) {
                m.health_status = 'Critical';
            } else if (m.reboot_count > 0 || m.gap_count > 0) {
                m.health_status = 'Warning';
            } else {
                m.health_status = 'Healthy';
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
                current_product: log.product_sku, // fallback
                reboot_count: 0,
                gap_count: 0,
                health_status: 'Healthy'
            };

            const newReboot = (log.alarm_count === 0) ? current.reboot_count + 1 : current.reboot_count;

            // Should check gap (requires prev log time... simplified here for realtime)
            const now = new Date().getTime();
            const last = new Date(current.last_seen).getTime();
            const diff = (now - last) / 60000;
            const newGap = (diff > 10) ? current.gap_count + 1 : current.gap_count;

            let health: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
            if (newReboot > 5 || newGap > 5) health = 'Critical';
            else if (newReboot > 0 || newGap > 0) health = 'Warning';

            return {
                ...prev,
                [log.machine_id]: {
                    ...current,
                    total_count: current.total_count + (log.alarm_count || 1),
                    last_seen: log.created_at || new Date().toISOString(),
                    status: 'Online',
                    current_product: log.product_sku || current.current_product,
                    reboot_count: newReboot,
                    gap_count: newGap,
                    health_status: health
                }
            };
        });
    };

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Factory Dashboard</h1>
                    <p className="text-gray-500">Real-time Production & Health Monitoring</p>
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
                        {/* Header: ID + Status */}
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold text-gray-700">
                                {machine.machine_id}
                            </h2>
                            <div className="flex flex-col items-end gap-1">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${machine.status === 'Online'
                                    ? 'bg-green-100 text-green-700 animate-pulse'
                                    : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {machine.status.toUpperCase()}
                                </span>
                                {/* Health Badge */}
                                {machine.health_status !== 'Healthy' && (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${machine.health_status === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                                        }`}>
                                        {machine.health_status}
                                    </span>
                                )}
                            </div>
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

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <div className="text-xs text-gray-400 font-medium">Production</div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-extrabold text-gray-900">
                                        {machine.total_count}
                                    </span>
                                    <span className="text-xs text-gray-400">units</span>
                                </div>
                            </div>

                            {/* Health Stats */}
                            <div className="flex flex-col justify-center gap-1 border-l pl-4 border-gray-100">
                                <div className={`text-xs flex justify-between ${machine.gap_count > 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                    <span>Gaps:</span>
                                    <span>{machine.gap_count}</span>
                                </div>
                                <div className={`text-xs flex justify-between ${machine.reboot_count > 0 ? 'text-orange-500 font-bold' : 'text-gray-400'}`}>
                                    <span>Reboots:</span>
                                    <span>{machine.reboot_count}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
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
