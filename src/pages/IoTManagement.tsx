import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import {
    Cpu,
    Settings,
    RefreshCw,
    Activity
} from 'lucide-react';

interface IoTConfig {
    mac_address: string;
    machine_id: string;
    lane_id: string;
    active_product_sku: string;
    count_per_signal: number;
    debounce_ms: number;
    cutting_size: number;
    firmware_version: string;
    last_heartbeat: string | null;
    notes: string;
}

interface Machine {
    machine_id: string;
    name: string;
}

const IoTManagement: React.FC = () => {
    const [configs, setConfigs] = useState<IoTConfig[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    // Fetch all data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [configRes, machineRes, productRes] = await Promise.all([
                supabase.from('iot_device_configs').select('*').order('updated_at', { ascending: false }),
                supabase.from('sys_machines_v2').select('machine_id, name'),
                supabase.from('products_v2').select('sku, name')
            ]);

            if (configRes.data) setConfigs(configRes.data);
            if (machineRes.data) setMachines(machineRes.data);
            if (productRes.data) setProducts(productRes.data);
        } catch (err) {
            console.error("Error fetching IoT data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Subscribe to real-time updates
        const channel = supabase.channel('iot-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'iot_device_configs' }, () => {
                fetchData();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleUpdate = async (mac: string, updates: Partial<IoTConfig>) => {
        setSaving(mac);
        try {
            const { error } = await supabase
                .from('iot_device_configs')
                .update({ ...updates, updated_at: new Date() })
                .eq('mac_address', mac);

            if (error) throw error;

            // Local state update
            setConfigs(prev => prev.map(c => c.mac_address === mac ? { ...c, ...updates } : c));
        } catch (err: any) {
            alert("Update failed: " + err.message);
        } finally {
            setSaving(null);
        }
    };

    const getStatus = (lastHeartbeat: string | null) => {
        if (!lastHeartbeat) return 'Offline';
        const diff = Date.now() - new Date(lastHeartbeat).getTime();
        return diff < 300000 ? 'Online' : 'Offline'; // 5 mins threshold
    };

    return (
        <div className="p-6 min-h-screen bg-slate-900 text-white animate-fade-in pb-20">
            <header className="flex justify-between items-center mb-8 bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-xl">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                        <Cpu className="text-blue-500" />
                        IoT Management
                    </h1>
                    <p className="text-gray-400 mt-1">Remote Configuration & Monitoring Hub</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            <div className="grid grid-cols-1 gap-6">
                {configs.length === 0 && !loading && (
                    <div className="bg-black/20 border border-white/5 rounded-3xl p-20 text-center">
                        <Activity size={60} className="mx-auto text-gray-700 mb-4" />
                        <h3 className="text-xl font-bold text-gray-500">No IoT Devices Discovered Yet</h3>
                        <p className="text-gray-600 mt-2">Connect an ESP32 to auto-register it here.</p>
                    </div>
                )}

                {configs.map(config => (
                    <div key={config.mac_address} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden group hover:border-blue-500/30 transition-all duration-500">
                        {/* Header / MAC Row */}
                        <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex flex-wrap justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${getStatus(config.last_heartbeat) === 'Online' ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                                <span className="font-mono text-sm tracking-widest text-blue-400">{config.mac_address}</span>
                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400">Ver: {config.firmware_version}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>Last Seen: {config.last_heartbeat ? new Date(config.last_heartbeat).toLocaleString() : 'Never'}</span>
                            </div>
                        </div>

                        {/* Grid Settings */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                            {/* Machine & Lane */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Binding Machine</label>
                                    <select
                                        value={config.machine_id || ''}
                                        onChange={(e) => handleUpdate(config.mac_address, { machine_id: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-blue-500 focus:outline-none appearance-none"
                                    >
                                        <option value="">Unassigned</option>
                                        {machines.map(m => <option key={m.machine_id} value={m.machine_id}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Assigned Lane</label>
                                    <div className="flex gap-2">
                                        {['Left', 'Right', 'Single'].map(l => (
                                            <button
                                                key={l}
                                                onClick={() => handleUpdate(config.mac_address, { lane_id: l })}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${config.lane_id === l ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Product SKU */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Active Product SKU</label>
                                <select
                                    value={config.active_product_sku || ''}
                                    onChange={(e) => handleUpdate(config.mac_address, { active_product_sku: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="">Select SKU...</option>
                                    {products.map(p => <option key={p.sku} value={p.sku}>{p.sku} - {p.name}</option>)}
                                </select>
                                <p className="mt-2 text-[10px] text-gray-600 italic">This controls which item inventory is deducted from.</p>
                            </div>

                            {/* Cutting & Yield */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Cutting Size (cm)</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[100, 50, 33, 25, 20].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => handleUpdate(config.mac_address, { cutting_size: s })}
                                                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${config.cutting_size === s ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                {s}cm
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 flex justify-between items-center">
                                    <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Auto Yield</div>
                                    <div className="text-xl font-black text-blue-400">
                                        {config.machine_id === 'T1.1-M03' ? '2' : Math.floor(100 / (config.cutting_size || 100)) || 1}
                                    </div>
                                </div>
                            </div>

                            {/* Hardware Pulse */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Debounce (ms)</label>
                                    <input
                                        type="number"
                                        value={config.debounce_ms}
                                        onChange={(e) => handleUpdate(config.mac_address, { debounce_ms: parseInt(e.target.value) })}
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        step={1000}
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <div className="flex-1 text-[10px] text-gray-600 leading-tight">
                                        Current cooling period: <span className="text-gray-400">{(config.debounce_ms / 60000).toFixed(1)} mins</span>
                                    </div>
                                    {saving === config.mac_address && <RefreshCw size={14} className="animate-spin text-blue-500" />}
                                </div>
                            </div>

                        </div>

                        {/* Notes Section Footer */}
                        <div className="px-6 py-3 bg-black/20 border-t border-white/5 flex items-center gap-2">
                            <Settings size={12} className="text-gray-600" />
                            <input
                                type="text"
                                placeholder="Device notes (e.g. Near window M01)..."
                                value={config.notes || ''}
                                onBlur={(e) => handleUpdate(config.mac_address, { notes: e.target.value })}
                                className="bg-transparent border-none text-[11px] text-gray-500 w-full focus:outline-none italic"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default IoTManagement;
