import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { SalesOrder, User } from '../types';
import { Calendar, User as UserIcon, Truck, MapPin } from 'lucide-react';

interface OrderSummaryProps {
    user?: any; // or strict User type
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ user }) => {
    // State
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [drivers, setDrivers] = useState<User[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    // Force Taiping for User 009, else default to Taiping
    const [activeTab, setActiveTab] = useState<'Taiping' | 'Nilai'>('Taiping');
    const [loading, setLoading] = useState(false);

    // Force Tab for User 009
    useEffect(() => {
        if (user?.employeeId === '009') {
            setActiveTab('Taiping');
        }
    }, [user]);

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Drivers
            const { data: driversData } = await supabase
                .from('users_public')
                .select('*')
                .eq('role', 'Driver');

            if (driversData) {
                const mappedDrivers: User[] = driversData.map(u => ({
                    uid: u.id,
                    email: u.email,
                    name: u.name || u.email?.split('@')[0] || 'Unknown Driver',
                    role: 'Driver',
                    factoryId: u.factory_id // Support factory_id for classification
                } as any));
                setDrivers(mappedDrivers);
            }

            // 2. Fetch Orders for Selected Date
            // Note: We filter by order_date or deadline? Usually delivery date (deadline) is what matters for "Daily Delivery"
            // But request says "Daily Need to Deliver", so likely Deadline.
            // Let's grab orders where deadline OR order_date matches, or just generic fetch and filter in memory for small datasets.
            // For efficiency let's fetch a range or just match deadline.

            const { data: ordersData } = await supabase
                .from('sales_orders')
                .select('*')
                .neq('status', 'Cancelled') // Exclude cancelled
                .neq('status', 'Delivered') // Exclude delivered (as per request for production planning)
                .or(`order_date.eq.${selectedDate},deadline.eq.${selectedDate}`);

            if (ordersData) {
                const taipingKeywords = ['SPD', 'OPM Lama', 'OPM Corner'];

                const mappedOrders: SalesOrder[] = ordersData.map(o => {
                    const items = o.items || [];
                    // Extract sourceLocation from remarks
                    let sourceLocation = undefined;
                    for (const item of items) {
                        const match = taipingKeywords.find(k => item.remark?.includes(k));
                        if (match) {
                            sourceLocation = match;
                            break;
                        }
                    }

                    return {
                        id: o.id,
                        orderNumber: o.order_number || o.id.substring(0, 8),
                        customer: o.customer,
                        driverId: o.driver_id,
                        items: items,
                        status: o.status,
                        orderDate: o.order_date,
                        deadline: o.deadline,
                        notes: o.notes,
                        zone: o.zone,
                        deliveryAddress: o.delivery_address,
                        tripSequence: o.trip_sequence || 0,
                        factoryId: o.factory_id,
                        sourceLocation: sourceLocation
                    };
                });
                // Filter strict? User said "Daily need to send".
                // Usually this means Deadline === selectedDate.
                // If deadline is null, maybe fallback to orderDate.
                // Let's filter in memory to be safe.
                const dailyOrders = mappedOrders.filter(o => {
                    const dateToCheck = o.deadline || o.orderDate;
                    return dateToCheck === selectedDate;
                });

                setOrders(dailyOrders);
            }

        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    // Derived Data
    const NILAI_DRIVERS = ['SAM', 'Mahadi', 'Ayam', 'Tahir'];

    const getDriverFactory = (driverId: string | undefined) => {
        if (!driverId) return null;
        const driver = drivers.find(d => d.uid === driverId);
        if (!driver) return null;
        if (driver.factoryId === 'N1' || driver.factoryId === 'N2') return 'Nilai';
        if (driver.factoryId === 'T1') return 'Taiping';
        if (NILAI_DRIVERS.some(n => driver.name?.toUpperCase().includes(n.toUpperCase()))) return 'Nilai';
        return 'Taiping';
    };

    const isTaipingOrder = (o: SalesOrder) => {
        // 1. Check Driver Assignment (Strongest signal)
        const driverFac = getDriverFactory(o.driverId);
        if (driverFac === 'Taiping') return true;
        if (driverFac === 'Nilai') return false;

        // 2. Check Order Factory ID
        if (o.factoryId === 'T1') return true;
        if (o.factoryId === 'N1' || o.factoryId === 'N2') return false;

        // 3. Check Keywords
        const taipingKeywords = ['SPD', 'OPM Lama', 'OPM Corner'];
        const hasTaipingItem = o.items.some(item =>
            item.remark && taipingKeywords.some(k => item.remark!.includes(k))
        );
        return hasTaipingItem;
    };

    const taipingOrders = orders.filter(o => isTaipingOrder(o));
    const nilaiOrders = orders.filter(o => !isTaipingOrder(o));

    // Grouping helper
    const groupOrdersByDriver = (orderList: SalesOrder[]) => {
        const byDriver: Record<string, SalesOrder[]> = {};
        const unassigned: SalesOrder[] = [];

        orderList.forEach(o => {
            if (o.driverId && o.driverId !== 'unassigned') {
                if (!byDriver[o.driverId]) byDriver[o.driverId] = [];
                byDriver[o.driverId].push(o);
            } else {
                unassigned.push(o);
            }
        });

        return { byDriver, unassigned };
    };

    const groupOrdersByLocation = (orderList: SalesOrder[]) => {
        const byLocation: Record<string, SalesOrder[]> = {};
        const noLocation: SalesOrder[] = [];

        orderList.forEach(o => {
            const loc = o.sourceLocation;
            if (loc) {
                if (!byLocation[loc]) byLocation[loc] = [];
                byLocation[loc].push(o);
            } else {
                noLocation.push(o);
            }
        });

        return { byLocation, noLocation };
    };

    const taipingData = groupOrdersByLocation(taipingOrders);
    const nilaiData = groupOrdersByDriver(nilaiOrders);

    const getDriverName = (id: string) => drivers.find(d => d.uid === id)?.name || 'Unknown Driver';

    // UI Helpers
    const TabButton = ({ name, label, count }: { name: 'Taiping' | 'Nilai', label: string, count: number }) => (
        <button
            onClick={() => setActiveTab(name)}
            className={`flex-1 py-4 text-center font-bold text-sm uppercase tracking-wider transition-all border-b-2 ${activeTab === name
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
        >
            {label} <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-xs">{count}</span>
        </button>
    );

    const OrderCard = ({ order }: { order: SalesOrder }) => (
        <div key={order.id} className="bg-[#1a1a1e] border border-white/5 rounded-xl p-4 mb-3 hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="text-blue-400 font-bold text-sm mb-0.5">{order.orderNumber}</div>
                    <div className="text-white font-medium">{order.customer}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${order.status === 'Delivered' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                        {order.status}
                    </div>
                    {order.sourceLocation && (
                        <div className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px] font-mono border border-blue-500/20">
                            {order.sourceLocation}
                        </div>
                    )}
                </div>
            </div>

            <div className="text-xs text-gray-400 mb-3 flex items-start gap-1.5">
                <MapPin size={12} className="mt-0.5 shrink-0" />
                {order.deliveryAddress || 'No Address'}
            </div>

            <div className="bg-black/40 rounded-lg p-2 space-y-1">
                {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                        <span className="text-gray-300">{item.product}</span>
                        <span className="font-mono text-gray-400">x{item.quantity}</span>
                    </div>
                ))}
            </div>

            {order.notes && (
                <div className="mt-2 text-[10px] text-yellow-500/80 italic">
                    Note: {order.notes}
                </div>
            )}
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Daily Prep List</h1>
                    <p className="text-gray-400 text-sm">Daily Production & Delivery Preparation</p>
                </div>

                <div className="flex items-center gap-2 bg-[#1a1a1e] border border-white/10 p-1.5 rounded-xl">
                    <Calendar className="text-gray-500 ml-2" size={18} />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent border-none text-white font-mono text-sm focus:ring-0 outline-none [color-scheme:dark]"
                    />
                </div>
            </div>

            {/* Tabs - Hidden for User 009 */}
            {user?.employeeId !== '009' && (
                <div className="flex mb-6 bg-[#0a0a0c] rounded-xl overflow-hidden border border-white/5">
                    <TabButton name="Taiping" label="Taiping" count={taipingOrders.length} />
                    <TabButton name="Nilai" label="Nilai" count={nilaiOrders.length} />
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="text-center py-20 text-gray-500 animate-pulse">Loading orders...</div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* PRODUCTION SUMMARY HEADER */}
                    <div className="mb-8 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Truck size={16} /> Production Requirements (Total for {activeTab})
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {Object.entries(
                                (activeTab === 'Taiping' ? taipingOrders : nilaiOrders).reduce((acc, order) => {
                                    order.items.forEach(item => {
                                        const key = item.product;
                                        acc[key] = (acc[key] || 0) + (item.quantity || 0);
                                    });
                                    return acc;
                                }, {} as Record<string, number>)
                            ).map(([product, qty]) => (
                                <div key={product} className="bg-[#121215] border border-white/10 rounded-lg px-3 py-2 flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-mono truncate" title={product}>{product}</span>
                                    <span className="text-lg font-bold text-white">{qty}</span>
                                </div>
                            ))}
                            {Object.keys(
                                (activeTab === 'Taiping' ? taipingOrders : nilaiOrders).reduce((acc, order) => {
                                    order.items.forEach(item => {
                                        acc[item.product] = 1;
                                    });
                                    return acc;
                                }, {} as Record<string, number>)
                            ).length === 0 && (
                                    <div className="text-xs text-gray-500 italic col-span-full">No production requirements found.</div>
                                )}
                        </div>
                    </div>

                    {/* TAIPING VIEW */}
                    {activeTab === 'Taiping' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* No Location First */}
                            {taipingData.noLocation.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-xs px-2">
                                        <MapPin size={14} /> No Source Location
                                        <span className="bg-red-500/10 px-1.5 rounded text-[10px]">{taipingData.noLocation.length}</span>
                                    </div>
                                    <div className="bg-[#121215] rounded-xl border border-red-500/10 p-2 min-h-[100px]">
                                        {taipingData.noLocation.map(o => <OrderCard key={o.id} order={o} />)}
                                    </div>
                                </div>
                            )}

                            {/* Locations */}
                            {Object.entries(taipingData.byLocation).map(([location, orders]) => (
                                <div key={location} className="space-y-4">
                                    <div className="flex items-center gap-2 text-gray-400 font-bold uppercase tracking-wider text-xs px-2">
                                        <MapPin size={14} /> {location}
                                        <span className="bg-white/5 px-1.5 rounded text-[10px] ml-auto">{orders.length} DOs</span>
                                    </div>
                                    <div className="bg-[#121215] rounded-xl border border-white/5 p-2 h-full">
                                        {orders
                                            .sort((a, b) => (a.tripSequence || 99) - (b.tripSequence || 99))
                                            .map(o => <OrderCard key={o.id} order={o} />)}
                                    </div>
                                </div>
                            ))}

                            {taipingOrders.length === 0 && (
                                <div className="col-span-full text-center py-20 text-gray-600 italic border border-dashed border-white/5 rounded-xl">
                                    No Taiping orders for this date.
                                </div>
                            )}
                        </div>
                    )}

                    {/* NILAI VIEW */}
                    {activeTab === 'Nilai' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Unassigned First */}
                            {nilaiData.unassigned.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-xs px-2">
                                        <UserIcon size={14} /> Unassigned
                                        <span className="bg-red-500/10 px-1.5 rounded text-[10px]">{nilaiData.unassigned.length}</span>
                                    </div>
                                    <div className="bg-[#121215] rounded-xl border border-red-500/10 p-2 min-h-[100px]">
                                        {nilaiData.unassigned.map(o => <OrderCard key={o.id} order={o} />)}
                                    </div>
                                </div>
                            )}

                            {/* Drivers */}
                            {Object.entries(nilaiData.byDriver).map(([driverId, orders]) => (
                                <div key={driverId} className="space-y-4">
                                    <div className="flex items-center gap-2 text-gray-400 font-bold uppercase tracking-wider text-xs px-2">
                                        <Truck size={14} /> {getDriverName(driverId)}
                                        <span className="bg-white/5 px-1.5 rounded text-[10px] ml-auto">{orders.length} DOs</span>
                                    </div>
                                    <div className="bg-[#121215] rounded-xl border border-white/5 p-2 h-full">
                                        {orders
                                            .sort((a, b) => (a.tripSequence || 99) - (b.tripSequence || 99))
                                            .map(o => <OrderCard key={o.id} order={o} />)}
                                    </div>
                                </div>
                            ))}

                            {nilaiOrders.length === 0 && (
                                <div className="col-span-full text-center py-20 text-gray-600 italic border border-dashed border-white/5 rounded-xl">
                                    No Nilai orders for this date.
                                </div>
                            )}
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};

export default OrderSummary;
