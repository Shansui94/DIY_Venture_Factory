import React, { useState } from 'react';
import {
    MapPin, Factory as FactoryIcon, Server,
    TrendingUp, Users, AlertTriangle, Truck, Package, Activity
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { ProductionLog, InventoryItem, JobOrder, Machine } from '../types';
import { FACTORIES } from '../data/factoryData';

interface DashboardProps {
    logs: ProductionLog[];
    inventory: InventoryItem[];
    jobs: JobOrder[];
    machines: Machine[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Dashboard: React.FC<DashboardProps> = ({ logs, inventory, jobs, machines = [] }) => {
    // Factory Selection State
    const [selectedFactoryId, setSelectedFactoryId] = useState<string>(FACTORIES[0].id);

    // --- Computed Metrics ---

    // 1. Production Output (Today)
    const today = new Date().toLocaleDateString();
    const todayLogs = logs.filter(log => new Date(log.Timestamp).toLocaleDateString() === today);
    const totalOutput = todayLogs.reduce((sum, log) => sum + (Number(log.Output_Qty) || 0), 0);
    const productionTarget = 5000; // Mock Daily Target
    const productionProgress = Math.min((totalOutput / productionTarget) * 100, 100);


    // 3. Pending Dispatch
    // Jobs that are 'Pending' or 'In-Transit'
    const pendingDispatch = jobs.filter(j => j.deliveryStatus === 'Pending').length;

    // 4. Machine Status
    const safeMachines = Array.isArray(machines) ? machines : [];
    const filteredMachines = safeMachines.filter(m => m?.factory_id === selectedFactoryId);
    const activeMachinesCount = filteredMachines.filter(m => m?.status === 'Running').length;
    // const maintenanceMachinesCount = filteredMachines.filter(m => m.status === 'Maintenance').length; // Unused

    // OEE Proxy: Running / Total
    const utilizationRate = filteredMachines.length > 0
        ? Math.round((activeMachinesCount / filteredMachines.length) * 100)
        : 0;

    // 5. Low Stock Alerts
    const lowStockItems = inventory.filter(i => i.Stock_Kg < 1000); // 1000kg threshold example

    // --- Chart Data Preparation ---

    // Hourly Production Trend (Mock vs Actual)
    // Group logs by hour
    const hourlyData = Array.from({ length: 12 }, (_, i) => {
        const hour = i + 8; // Start from 8 AM
        const logsInHour = todayLogs.filter(log => {
            const d = new Date(log.Timestamp);
            return d.getHours() === hour;
        });
        const output = logsInHour.reduce((sum, l) => sum + Number(l.Output_Qty), 0);
        return {
            name: `${hour}:00`,
            output: output,
            target: 400 // Mock hourly target
        };
    });

    // Production Mix (By Category/Product)
    // Group by first part of SKU (e.g., 'BW-50x1')
    const mixMap = new Map<string, number>();
    todayLogs.forEach(log => {
        // Look up product via Job
        const job = jobs.find(j => j.Job_ID === log.Job_ID);
        const sku = job?.product || 'Unknown';
        const key = sku.split('-')[2] || 'Other'; // Group by Material/Color code roughly
        const current = mixMap.get(key) || 0;
        mixMap.set(key, current + Number(log.Output_Qty));
    });
    const pieData = Array.from(mixMap.entries()).map(([name, value]) => ({ name, value }));


    // const selectedFactory = FACTORIES.find(f => f.id === selectedFactoryId); // Unused

    // --- Components ---

    const KPICard = ({ title, value, subtext, icon: Icon, colorClass, progress }: any) => (
        <div className="bg-[#1e1e24] rounded-2xl p-6 border border-white/5 shadow-xl relative overflow-hidden group hover:border-white/10 transition-all">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500 ${colorClass}`}>
                <Icon size={80} />
            </div>
            <div className="relative z-10">
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">{title}</p>
                <div className="flex items-end gap-3 mb-2">
                    <h3 className="text-4xl font-black text-white tracking-tight">{value}</h3>
                </div>
                {subtext && <span className="text-xs text-gray-400 font-medium bg-white/5 px-2 py-0.5 rounded border border-white/5">{subtext}</span>}

                {/* Progress Bar (Optional) */}
                {progress !== undefined && (
                    <div className="w-full bg-gray-800 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div
                            className={`h-full ${colorClass.replace('text-', 'bg-')} transition-all duration-1000 ease-out`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                        <Activity className="text-blue-500" size={32} />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
                            Smart Factory Dashboard
                        </span>
                    </h2>
                    <p className="text-gray-500 text-sm font-medium mt-1">Real-time Production Intelligence & Analytics</p>
                </div>

                <div className="flex gap-2">
                    {/* Factory Dropdown */}
                    <div className="relative group w-56">
                        <select
                            value={selectedFactoryId}
                            onChange={(e) => setSelectedFactoryId(e.target.value)}
                            className="appearance-none w-full bg-[#1e1e24] text-white border border-white/10 px-5 py-3 rounded-xl font-bold shadow-lg focus:outline-none focus:border-blue-500/50 cursor-pointer transition-all hover:bg-[#1a1a1e]"
                        >
                            {FACTORIES.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                        <MapPin size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Production Progress"
                    value={`${productionProgress.toFixed(0)}%`}
                    subtext={`${totalOutput} / ${productionTarget} Units`}
                    icon={FactoryIcon}
                    colorClass="text-blue-500"
                    progress={productionProgress}
                />
                <KPICard
                    title="Machine Utilization"
                    value={`${utilizationRate}%`}
                    subtext={`${activeMachinesCount} Active Machines`}
                    icon={Server}
                    colorClass="text-green-500"
                    progress={utilizationRate}
                />
                <KPICard
                    title="Pending Dispatch"
                    value={pendingDispatch}
                    subtext="Orders in Queue"
                    icon={Truck}
                    colorClass="text-orange-500"
                />
                <KPICard
                    title="Low Stock Alerts"
                    value={lowStockItems.length}
                    subtext="Items Below Threshold"
                    icon={AlertTriangle}
                    colorClass="text-red-500"
                />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[400px]">
                {/* Trend Chart (2/3 width) */}
                <div className="lg:col-span-2 bg-[#1e1e24] p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white font-bold flex items-center gap-2 text-lg">
                            <TrendingUp size={20} className="text-blue-400" />
                            Hourly Output Trend
                        </h3>
                        <div className="flex gap-2">
                            <span className="text-[10px] font-bold uppercase text-gray-500 bg-white/5 px-2 py-1 rounded">Target: 400/hr</span>
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hourlyData}>
                                <defs>
                                    <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#52525b"
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#52525b"
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-10}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#18181b',
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        color: '#fff',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="output"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorOutput)"
                                    activeDot={{ r: 6, stroke: '#1d4ed8', strokeWidth: 2, fill: '#fff' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="target"
                                    stroke="#52525b"
                                    strokeDasharray="4 4"
                                    fill="none"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart (1/3 width) */}
                <div className="lg:col-span-1 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Package size={18} className="text-purple-400" />
                        Production Mix
                    </h3>
                    <div className="h-full pb-8">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="85%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                                No production data today
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 3: Action Center */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Low Stock Alerts */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-red-400" />
                        Low Stock Alerts
                        <span className="text-xs bg-red-900/50 text-red-200 px-2 py-0.5 rounded-full border border-red-500/30">
                            {lowStockItems.length} Items
                        </span>
                    </h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {lowStockItems.length > 0 ? lowStockItems.map(item => (
                            <div key={item.Raw_Material_ID} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                                <div>
                                    <p className="text-sm font-bold text-gray-200">{item.Material_Name}</p>
                                    <p className="text-xs text-gray-500">ID: {item.Raw_Material_ID}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-red-400 font-bold text-sm">{item.Stock_Kg} kg</p>
                                    <button className="text-[10px] text-blue-400 hover:underline">Restock</button>
                                </div>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-sm text-center py-4">All inventory levels healthy.</p>
                        )}
                    </div>
                </div>

                {/* Machine Status Grid (Compact) */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Server size={18} className="text-green-400" />
                        Machine Status ({selectedFactoryId})
                    </h3>
                    <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto custom-scrollbar">
                        {filteredMachines.map(m => (
                            <div key={m.id} className={`p-3 rounded-lg border flex flex-col justify-between ${m.status === 'Running' ? 'bg-green-900/20 border-green-500/30' :
                                m.status === 'Maintenance' ? 'bg-red-900/20 border-red-500/30' : 'bg-gray-700/30 border-gray-600'
                                }`}>
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-gray-200 text-sm">{m.name}</span>
                                    <div className={`w-2 h-2 rounded-full ${m.status === 'Running' ? 'bg-green-500 animate-pulse' :
                                        m.status === 'Maintenance' ? 'bg-red-500' : 'bg-gray-500'
                                        }`} />
                                </div>
                                <span className="text-[10px] text-gray-400 mt-2 uppercase tracking-wide">{m.status}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
