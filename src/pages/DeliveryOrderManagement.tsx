import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getRecommendedPackaging } from '../utils/packagingRules';
import { getV2Items } from '../services/apiV2';
import { Plus, Search, Calendar, FileText, X, Truck, Package, User as UserIcon, ListFilter, Box } from 'lucide-react';
import {
    SalesOrder,
    ProductLayer,
    ProductMaterial,
    PackagingColor,
    ProductSize,
    User
} from '../types';
import { V2Item } from '../types/v2';
import {
    PRODUCT_LAYERS,
    PRODUCT_MATERIALS,
    PACKAGING_COLORS,
    PRODUCT_SIZES
} from '../data/constants';

const DeliveryOrderManagement: React.FC = () => {
    // State
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [drivers, setDrivers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');

    // Editing State
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

    // New Order Form State
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [newOrderDeliveryDate, setNewOrderDeliveryDate] = useState('');
    const [newOrderItems, setNewOrderItems] = useState<SalesOrder['items']>([]);

    // Hybrid Item Entry State
    const [entryMode, setEntryMode] = useState<'search' | 'manual'>('search');

    // -- Mode A: V2 Search --
    const [v2Items, setV2Items] = useState<V2Item[]>([]);
    const [itemSearchTerm, setItemSearchTerm] = useState('');
    const [selectedV2Item, setSelectedV2Item] = useState<V2Item | null>(null);

    // -- Mode B: Manual Builder --
    const [currentItemLayer, setCurrentItemLayer] = useState<ProductLayer>('Single');
    const [currentItemMaterial, setCurrentItemMaterial] = useState<ProductMaterial>('Clear');
    const [currentItemSize, setCurrentItemSize] = useState<ProductSize>('50cm');
    const [currentItemPackaging, setCurrentItemPackaging] = useState<PackagingColor>('Orange');
    const [currentItemProductDesc, setCurrentItemProductDesc] = useState('');
    const [currentItemSku, setCurrentItemSku] = useState('');

    // Shared Additional Info
    const [currentItemRemark, setCurrentItemRemark] = useState('');

    // Shared Quantity
    const [currentItemQty, setCurrentItemQty] = useState(0);

    // Auto-calculate packaging & SKU (Manual Mode)
    useEffect(() => {
        const recommended = getRecommendedPackaging(currentItemLayer, currentItemMaterial, currentItemSize);
        if (recommended) setCurrentItemPackaging(recommended);

        const wCode = PRODUCT_SIZES.find(s => s.value === currentItemSize)?.code;
        const mCode = PRODUCT_MATERIALS.find(m => m.value === currentItemMaterial)?.code;
        const lCode = PRODUCT_LAYERS.find(l => l.value === currentItemLayer)?.code;
        const cCode = PACKAGING_COLORS.find(c => c.value === recommended)?.code;

        const sku = `PROD-BW-${lCode}${wCode}-${mCode}-${cCode}`;

        // Generate Human Readable Description
        const layerLabel = PRODUCT_LAYERS.find(l => l.value === currentItemLayer)?.label || currentItemLayer;
        const materialLabel = PRODUCT_MATERIALS.find(m => m.value === currentItemMaterial)?.label || currentItemMaterial;
        const sizeLabel = PRODUCT_SIZES.find(s => s.value === currentItemSize)?.label || currentItemSize;

        const description = `Bubble Wrap ${sizeLabel} ${layerLabel} Layer ${materialLabel}`;

        setCurrentItemSku(sku);
        setCurrentItemProductDesc(description);
    }, [currentItemLayer, currentItemMaterial, currentItemSize]);

    // Fetch Initial Data
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Drivers & Orders Parallel
            const [usersRes, ordersRes, itemsRes] = await Promise.all([
                supabase.from('users_public').select('*').eq('role', 'Driver'),
                supabase.from('sales_orders').select('*').order('created_at', { ascending: false }),
                getV2Items()
            ]);

            // Process Drivers
            if (usersRes.data) {
                const mappedDrivers: User[] = usersRes.data.map(u => ({
                    uid: u.id,
                    email: u.email,
                    name: u.name || u.email?.split('@')[0] || 'Unknown Driver',
                    role: 'Driver'
                } as any));
                setDrivers(mappedDrivers);
            }

            // Process Orders
            if (ordersRes.data) {
                const mappedOrders: SalesOrder[] = ordersRes.data.map(o => ({
                    id: o.id,
                    orderNumber: o.order_number || o.id.substring(0, 8),
                    customer: o.customer,
                    driverId: o.driver_id,
                    items: o.items || [],
                    status: o.status,
                    orderDate: o.order_date,
                    deadline: o.deadline,
                    notes: o.notes
                }));
                setOrders(mappedOrders);
            }

            // Process Items
            setV2Items(itemsRes);

        } catch (err) {
            console.error("System Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('delivery-orders-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_orders' }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // Logic: Filtered V2 Items
    const filteredV2Items = v2Items.filter(item =>
    (item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(itemSearchTerm.toLowerCase()))
    ).slice(0, 50); // Limit to 50 results for performance

    // Handlers
    const handleAddItem = () => {
        if (currentItemQty <= 0) {
            alert("Please enter a valid quantity.");
            return;
        }

        let newItem: any = {};

        if (entryMode === 'search') {
            if (!selectedV2Item) {
                alert("Please select a product from the list.");
                return;
            }
            newItem = {
                product: selectedV2Item.name,
                sku: selectedV2Item.sku, // Store explicit SKU
                quantity: currentItemQty,
                remark: currentItemRemark,
                // Optional fields for compatibility
                packaging: selectedV2Item.uom || 'Unit'
            };
        } else {
            // Manual Mode
            newItem = {
                product: currentItemProductDesc, // Human Readable
                sku: currentItemSku,             // Machine Code
                layer: currentItemLayer,
                material: currentItemMaterial,
                packaging: currentItemPackaging,
                size: currentItemSize,
                quantity: currentItemQty,
                remark: currentItemRemark
            };
        }

        setNewOrderItems([...newOrderItems, newItem]);
        setCurrentItemQty(0);
        setCurrentItemRemark(''); // Reset remark
        setSelectedV2Item(null);
        setItemSearchTerm('');
    };

    const handleRemoveItem = (index: number) => {
        const updated = [...newOrderItems];
        updated.splice(index, 1);
        setNewOrderItems(updated);
    };

    const handleSubmitOrder = async () => {
        if (!selectedDriverId || newOrderItems.length === 0) {
            alert("Please select a driver and at least one item.");
            return;
        }

        try {
            const doNumber = `DO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
            const driver = drivers.find(d => d.uid === selectedDriverId);
            const driverName = driver ? driver.name : 'Unknown Driver';

            const payload = {
                order_number: doNumber,
                customer: `Assigned: ${driverName}`,
                driver_id: selectedDriverId,
                items: newOrderItems, // JSONB
                status: 'New',
                order_date: new Date().toISOString().split('T')[0],
                deadline: newOrderDeliveryDate || null
            };

            if (editingOrderId) {
                // UPDATE Existing
                const { error } = await supabase
                    .from('sales_orders')
                    .update({
                        driver_id: selectedDriverId,
                        customer: `Assigned: ${driverName}`, // Optional: keep original customer name? keeping simple for now
                        items: newOrderItems,
                        deadline: newOrderDeliveryDate || null
                    })
                    .eq('id', editingOrderId);
                if (error) throw error;
                alert("Order Updated Successfully!");
            } else {
                // CREATE New
                const payload = {
                    order_number: doNumber,
                    customer: `Assigned: ${driverName}`,
                    driver_id: selectedDriverId,
                    items: newOrderItems, // JSONB
                    status: 'New',
                    order_date: new Date().toISOString().split('T')[0],
                    deadline: newOrderDeliveryDate || null
                };

                const { error } = await supabase.from('sales_orders').insert(payload);
                if (error) throw error;
                alert("Delivery Order Assigned!");
            }

            setIsCreateModalOpen(false);
            setEditingOrderId(null); // Reset
            setSelectedDriverId('');
            setNewOrderDeliveryDate('');
            setNewOrderItems([]);
        } catch (err: any) {
            console.error("Error creating DO:", err);
            alert("Failed: " + err.message);
        }
    };

    const getDriverName = (driverId?: string) => {
        if (!driverId) return 'Unassigned';
        const d = drivers.find(u => u.uid === driverId);
        return d ? d.name : 'Unknown Driver';
    };

    const filteredOrders = orders.filter(o =>
        (statusFilter === 'All' || o.status === statusFilter) &&
        (getDriverName(o.driverId)?.toLowerCase().includes(searchTerm.toLowerCase()) || o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleEditOrder = (order: SalesOrder) => {
        setEditingOrderId(order.id);
        setSelectedDriverId(order.driverId);
        setNewOrderDeliveryDate(order.deadline || '');
        setNewOrderItems(order.items || []);
        setIsCreateModalOpen(true);
    };

    return (
        <div className="p-6 h-full text-gray-100 animate-fade-in flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Truck className="text-blue-500" />
                        Logistics & Dispatch
                    </h1>
                    <p className="text-gray-400 mt-1">Assign orders to drivers and track deliveries.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg transition-all"
                >
                    <Plus size={20} /> Assign New Order
                </button>
            </div>

            {/* Filters */}
            {/* Filters */}
            <div className="flex flex-wrap gap-4 bg-[#1e1e24] p-4 rounded-xl border border-white/5 shadow-xl">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search Driver or DO #..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#121215] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-600"
                    />
                </div>
                {/* Status Filters */}
                <div className="flex items-center gap-2 bg-[#121215] p-1 rounded-lg border border-white/5">
                    {['All', 'New', 'Delivered'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${statusFilter === status
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Driver Cards (Grouped) */}
                {drivers.map(driver => {
                    // Filter orders for this driver
                    const driverOrders = filteredOrders.filter(o => o.driverId === driver.uid);
                    if (driverOrders.length === 0 && searchTerm) return null; // Hide empty if searching

                    return (
                        <div key={driver.uid} className="bg-[#1e1e24] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all flex flex-col h-[500px]">
                            {/* Driver Header */}
                            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/5">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 flex items-center justify-center border border-white/5">
                                    <UserIcon className="text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white">{driver.name}</h3>
                                    <p className="text-xs text-gray-500 font-mono">ID: {driver.uid.substring(0, 6)}</p>
                                </div>
                                <div className="ml-auto text-right">
                                    <span className="block text-2xl font-black text-white">{driverOrders.length}</span>
                                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Active DOs</span>
                                </div>
                            </div>

                            {/* Orders List */}
                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                {driverOrders.map(order => (
                                    <div key={order.id} className="bg-[#121215] p-4 rounded-xl border border-white/5 group hover:border-blue-500/30 transition-all relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">{order.orderNumber}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditOrder(order); }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded text-blue-400"
                                                    title="Edit Order"
                                                >
                                                    ✏️
                                                </button>
                                            </div>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${order.status === 'New' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                                                order.status === 'Delivered' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                                                    'text-gray-400 border-gray-600 bg-gray-800'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-gray-200 text-sm mb-1">{order.customer}</h4>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Calendar size={12} /> {order.deadline || 'No Deadline'}
                                        </p>

                                        {/* Items Summary */}
                                        <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
                                            {order.items?.map((item, idx) => (
                                                <div key={idx} className="bg-white/5 p-2 rounded text-[10px] text-gray-400 truncate">
                                                    <span className="text-white font-bold">{item.quantity}x</span> {item.product}
                                                    {item.remark && <div className="text-[10px] text-yellow-500/80 italic mt-0.5">{item.remark}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {driverOrders.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50 space-y-2">
                                        <Box size={32} />
                                        <p className="text-sm font-medium">No active orders</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create DO Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#18181b] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#18181b] z-20">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Truck className="text-blue-500" /> {editingOrderId ? 'Edit Driver Order' : 'Assign Driver Order'}
                            </h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X /></button>
                        </div>

                        <div className="p-6 space-y-6 flex-1">
                            {/* Driver Selection & Dates */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Select Driver</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                                        <select
                                            className="w-full bg-[#121215] border border-white/10 rounded-lg px-10 py-2.5 text-white focus:border-blue-500/50 outline-none appearance-none transition-all"
                                            value={selectedDriverId}
                                            onChange={e => setSelectedDriverId(e.target.value)}
                                        >
                                            <option value="">-- Choose Driver --</option>
                                            {drivers.map(d => (
                                                <option key={d.uid} value={d.uid}>
                                                    {d.name} ({d.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Target Date (Optional)</label>
                                    <input
                                        type="date"
                                        className="w-full bg-[#121215] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-blue-500/50 outline-none placeholder-gray-600 transition-all"
                                        value={newOrderDeliveryDate}
                                        onChange={e => setNewOrderDeliveryDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <hr className="border-white/5" />

                            {/* Add Items Section */}
                            <div>
                                <h3 className="text-sm font-bold text-blue-400 uppercase mb-4 flex items-center gap-2 tracking-wider">
                                    <Package size={16} /> Load Items
                                </h3>

                                {/* Tabs */}
                                <div className="flex gap-2 mb-4 bg-[#121215] p-1 rounded-lg w-fit border border-white/5">
                                    <button
                                        onClick={() => setEntryMode('search')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${entryMode === 'search' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        <Search size={14} /> Search
                                    </button>
                                    <button
                                        onClick={() => setEntryMode('manual')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${entryMode === 'manual' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        <ListFilter size={14} /> Bubblewrap
                                    </button>
                                </div>

                                <div className="bg-[#121215]/50 p-4 rounded-xl border border-white/5 space-y-4">
                                    {/* MODE A: Search */}
                                    {entryMode === 'search' && (
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                                                <input
                                                    type="text"
                                                    placeholder="Search SKU or Name (e.g. 'AirTube')"
                                                    className="w-full bg-[#121215] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-600"
                                                    value={itemSearchTerm}
                                                    onChange={e => {
                                                        setItemSearchTerm(e.target.value);
                                                        setSelectedV2Item(null); // Reset selection on search
                                                    }}
                                                />
                                            </div>

                                            {/* Results List */}
                                            {itemSearchTerm && !selectedV2Item && (
                                                <div className="max-h-40 overflow-y-auto bg-[#121215] border border-white/10 rounded-lg divide-y divide-white/5 custom-scrollbar">
                                                    {filteredV2Items.length === 0 ? (
                                                        <div className="p-3 text-gray-500 text-sm text-center">No matches found.</div>
                                                    ) : (
                                                        filteredV2Items.map(item => (
                                                            <div
                                                                key={item.sku}
                                                                onClick={() => {
                                                                    setSelectedV2Item(item);
                                                                    setItemSearchTerm(item.name); // Fill input
                                                                }}
                                                                className="p-2 px-3 hover:bg-white/5 cursor-pointer flex justify-between items-center group transition-colors"
                                                            >
                                                                <div>
                                                                    <div className="text-sm text-gray-200 font-medium group-hover:text-blue-300 transition-colors">{item.name}</div>
                                                                    <div className="text-[10px] text-gray-600 font-mono">{item.sku}</div>
                                                                </div>
                                                                <div className="text-[10px] px-2 py-0.5 bg-white/5 rounded text-gray-400 border border-white/5">{item.uom}</div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}

                                            {/* Selection Preview */}
                                            {selectedV2Item && (
                                                <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                                    <Box className="text-blue-400" />
                                                    <div>
                                                        <div className="text-sm font-bold text-blue-300">Selected: {selectedV2Item.name}</div>
                                                        <div className="text-xs text-gray-400">{selectedV2Item.sku} | Supply: {selectedV2Item.supply_type}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Remark Input (Search Mode) */}
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Remark (Optional)..."
                                                    className="w-full bg-[#121215] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 outline-none placeholder-gray-600"
                                                    value={currentItemRemark}
                                                    onChange={e => setCurrentItemRemark(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* MODE B: Manual */}
                                    {entryMode === 'manual' && (
                                        <>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="text-[10px] text-gray-500 block mb-1 uppercase font-bold">Layer</label>
                                                    <select
                                                        value={currentItemLayer}
                                                        onChange={(e) => setCurrentItemLayer(e.target.value as ProductLayer)}
                                                        className="w-full bg-[#121215] border border-white/10 rounded-lg text-sm px-2 py-1.5 text-white outline-none focus:border-blue-500/50"
                                                    >
                                                        {PRODUCT_LAYERS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-500 block mb-1 uppercase font-bold">Material</label>
                                                    <select
                                                        value={currentItemMaterial}
                                                        onChange={(e) => setCurrentItemMaterial(e.target.value as ProductMaterial)}
                                                        className="w-full bg-[#121215] border border-white/10 rounded-lg text-sm px-2 py-1.5 text-white outline-none focus:border-blue-500/50"
                                                    >
                                                        {PRODUCT_MATERIALS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-500 block mb-1 uppercase font-bold">Size</label>
                                                    <select
                                                        value={currentItemSize}
                                                        onChange={(e) => setCurrentItemSize(e.target.value as ProductSize)}
                                                        className="w-full bg-[#121215] border border-white/10 rounded-lg text-sm px-2 py-1.5 text-white outline-none focus:border-blue-500/50"
                                                    >
                                                        {PRODUCT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] text-gray-500 block mb-1 uppercase font-bold">Product Desc</label>
                                                    <input
                                                        type="text"
                                                        value={currentItemProductDesc}
                                                        readOnly
                                                        className="w-full bg-white/5 border border-white/5 rounded-lg text-sm px-2 py-1.5 text-gray-400 font-mono cursor-not-allowed"
                                                    />
                                                    <div className="text-[10px] text-blue-400 mt-1 font-mono">
                                                        SKU: {currentItemSku}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-500 block mb-1 uppercase font-bold">Packaging</label>
                                                    <select
                                                        value={currentItemPackaging}
                                                        onChange={(e) => setCurrentItemPackaging(e.target.value as PackagingColor)}
                                                        className="w-full bg-[#121215] border border-white/10 rounded-lg text-sm px-2 py-1.5 text-white font-bold outline-none focus:border-blue-500/50"
                                                    >
                                                        {PACKAGING_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Remark Input (Manual Mode) */}
                                            <div>
                                                <label className="text-[10px] text-gray-500 block mb-1 uppercase font-bold">Remark</label>
                                                <input
                                                    type="text"
                                                    placeholder="Any special requests..."
                                                    className="w-full bg-[#121215] border border-white/10 rounded-lg text-sm px-3 py-1.5 text-white outline-none focus:border-blue-500/50"
                                                    value={currentItemRemark}
                                                    onChange={e => setCurrentItemRemark(e.target.value)}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Qty & Add (Shared) */}
                                    <div className="flex items-end gap-3 pt-4 border-t border-white/5">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-gray-500 block mb-1 uppercase font-bold">Quantity</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={currentItemQty}
                                                onChange={e => setCurrentItemQty(Number(e.target.value))}
                                                className="w-full bg-[#121215] border border-white/10 rounded-lg text-sm px-3 py-1.5 text-white outline-none focus:border-blue-500/50 font-mono"
                                                placeholder={entryMode === 'search' ? 'Units' : 'Rolls'}
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddItem}
                                            className="px-6 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg font-bold transition-all shadow-lg hover:shadow-green-900/30 flex items-center gap-2"
                                        >
                                            <Plus size={16} /> Add
                                        </button>
                                    </div>
                                </div>

                                {/* Added Items List */}
                                <div className="mt-4 space-y-2">
                                    {newOrderItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-[#121215] px-3 py-2 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-300 font-bold">{item.product}</span>
                                                {item.sku && <span className="text-[10px] text-gray-500 font-mono">{item.sku}</span>}
                                                <span className="text-xs text-gray-500">
                                                    {item.packaging ? `Package: ${item.packaging}` : ''} {item.size ? `(${item.size})` : ''}
                                                </span>
                                                {item.remark && (
                                                    <span className="text-xs text-yellow-500/80 italic mt-0.5">
                                                        Note: {item.remark}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded text-xs">{item.quantity}</span>
                                                <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-300 transition-colors p-1 hover:bg-red-500/10 rounded">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {newOrderItems.length === 0 && (
                                        <div className="text-center py-4 text-gray-600 text-xs italic">
                                            No items loaded yet. Use the tool above to add items.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-[#18181b] sticky bottom-0 z-20 flex justify-end gap-3">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm font-bold active:scale-95 transform"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitOrder}
                                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/40 hover:shadow-blue-900/60 active:scale-95 transform transition-all flex items-center gap-2"
                            >
                                <Truck size={16} /> {editingOrderId ? 'Update Order' : 'Assign Driver'}
                            </button>
                        </div>
                    </div>
                </div >
            )
            }
        </div >
    );
};

export default DeliveryOrderManagement;
