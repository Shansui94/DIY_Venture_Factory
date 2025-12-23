import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getRecommendedPackaging } from '../utils/packagingRules';
import { Plus, Search, Calendar, FileText, X, Truck, Package } from 'lucide-react';
import {
    SalesOrder,
    PRODUCT_LAYERS,
    PRODUCT_MATERIALS,
    PACKAGING_COLORS,
    PRODUCT_SIZES,
    ProductLayer,
    ProductMaterial,
    PackagingColor,
    ProductSize
} from '../types';

const DeliveryOrderManagement: React.FC = () => {
    // State
    const [orders, setOrders] = useState<SalesOrder[]>([]); // Keeping SalesOrder type for now
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');

    // New Order Form State
    const [newOrderCustomer, setNewOrderCustomer] = useState('');
    const [newOrderDeliveryDate, setNewOrderDeliveryDate] = useState(''); // Optional Delivery Date
    const [newOrderItems, setNewOrderItems] = useState<SalesOrder['items']>([]);

    // Item Entry State
    const [currentItemLayer, setCurrentItemLayer] = useState<ProductLayer>('Single');
    const [currentItemMaterial, setCurrentItemMaterial] = useState<ProductMaterial>('Clear');
    const [currentItemSize, setCurrentItemSize] = useState<ProductSize>('50cm');

    // Manual/Auto Fields
    const [currentItemPackaging, setCurrentItemPackaging] = useState<PackagingColor>('Orange');
    const [currentItemProductDesc, setCurrentItemProductDesc] = useState(''); // Manual Product/SKU

    const [currentItemQty, setCurrentItemQty] = useState(0);

    // Auto-calculate packaging & SKU on spec change
    useEffect(() => {
        // 1. Recommend Packaging
        const recommended = getRecommendedPackaging(currentItemLayer, currentItemMaterial, currentItemSize);
        if (recommended) setCurrentItemPackaging(recommended);

        // 2. Auto-generate SKU/Description
        const wCode = PRODUCT_SIZES.find(s => s.value === currentItemSize)?.code;
        const mCode = PRODUCT_MATERIALS.find(m => m.value === currentItemMaterial)?.code;
        const lCode = PRODUCT_LAYERS.find(l => l.value === currentItemLayer)?.code;
        // Optimization: Use the recommended packaging for SKU generation initially to ensure match
        const cCode = PACKAGING_COLORS.find(c => c.value === recommended)?.code;

        const sku = `PROD-BW-${lCode}${wCode}-${mCode}-${cCode}`;
        setCurrentItemProductDesc(sku);

    }, [currentItemLayer, currentItemMaterial, currentItemSize]);

    // Initial Fetch (Same logic, just mapped to Delivery Orders)
    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sales_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching delivery orders:", error);
                setOrders([]);
            } else if (data) {
                const mappedOrders: SalesOrder[] = data.map(o => ({
                    id: o.id,
                    orderNumber: o.order_number || o.id.substring(0, 8),
                    customer: o.customer,
                    items: o.items || [],
                    status: o.status,
                    orderDate: o.order_date, // This might be used as Delivery Date in our new view
                    deadline: o.deadline, // We will map this to Delivery Date UI wise if set
                    notes: o.notes
                }));
                setOrders(mappedOrders);
            }
        } catch (err) {
            console.error("System Error fetching orders:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        const channel = supabase.channel('delivery-orders-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_orders' }, fetchOrders)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // Handlers
    const handleAddItem = () => {
        if (currentItemQty <= 0) return;
        if (!currentItemProductDesc) {
            alert("Product description is required");
            return;
        }

        const newItem = {
            product: currentItemProductDesc, // Use the manual/auto field
            layer: currentItemLayer,
            material: currentItemMaterial,
            packaging: currentItemPackaging, // Use the manual/auto field
            size: currentItemSize,
            quantity: currentItemQty
        };

        setNewOrderItems([...newOrderItems, newItem]);
        setCurrentItemQty(0);
    };

    const handleRemoveItem = (index: number) => {
        const updated = [...newOrderItems];
        updated.splice(index, 1);
        setNewOrderItems(updated);
    };

    const handleSubmitOrder = async () => {
        if (!newOrderCustomer || newOrderItems.length === 0) {
            alert("Please fill in customer and at least one item.");
            return;
        }

        try {
            // Generate DO Number
            const doNumber = `DO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

            const payload = {
                order_number: doNumber,
                customer: newOrderCustomer,
                items: newOrderItems,
                status: 'New',
                // Map Delivery Date to 'deadline' column as agreed in plan? 
                // Or use order_date? Let's use 'deadline' as Delivery Date.
                // and order_date as today.
                order_date: new Date().toISOString().split('T')[0],
                deadline: newOrderDeliveryDate || null
            };

            const { error } = await supabase.from('sales_orders').insert(payload);

            if (error) throw error;

            setIsCreateModalOpen(false);
            setNewOrderCustomer('');
            setNewOrderDeliveryDate('');
            setNewOrderItems([]);
            alert("Delivery Order Created!");

        } catch (err: any) {
            console.error("Error creating DO:", err);
            alert("Failed to create DO: " + err.message);
        }
    };

    const filteredOrders = orders.filter(o =>
        (statusFilter === 'All' || o.status === statusFilter) &&
        (o.customer.toLowerCase().includes(searchTerm.toLowerCase()) || o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-6 bg-gray-900 min-h-screen text-gray-100 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Truck className="text-blue-500" />
                        Delivery Orders
                    </h1>
                    <p className="text-gray-400 mt-1">Manage delivery requests and logistics.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg transition-all"
                >
                    <Plus size={20} /> New Delivery Order
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6 bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search customer or DO #..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-blue-500 outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto">
                    {['All', 'New', 'In-Production', 'Ready', 'Shipped'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${statusFilter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-20 text-gray-500">Loading Delivery Orders...</div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                        No delivery orders found.
                    </div>
                ) : (
                    filteredOrders.map(order => (
                        <div key={order.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-blue-500/50 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-white">{order.customer}</h3>
                                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300 font-mono">{order.orderNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                                        <div className="flex items-center gap-1">
                                            <FileText size={14} /> Created: {order.orderDate}
                                        </div>
                                        {/* Display Delivery Date from deadline field */}
                                        <div className={`flex items-center gap-1 ${order.deadline ? 'text-yellow-500' : 'text-gray-600'}`}>
                                            <Calendar size={14} />
                                            Delivery: {order.deadline || 'Pending'}
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                                    ${order.status === 'New' ? 'bg-blue-900/50 text-blue-400' :
                                        order.status === 'Shipped' ? 'bg-green-900/50 text-green-400' :
                                            'bg-gray-700 text-gray-300'
                                    }`}>
                                    {order.status}
                                </div>
                            </div>

                            {/* Items Preview */}
                            <div className="bg-gray-900/50 rounded-lg p-3 space-y-2">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-800 last:border-0 pb-1 last:pb-0">
                                        <div className="flex flex-col">
                                            <span className="text-gray-300 font-medium">{item.product}</span>
                                            <span className="text-xs text-gray-500">Packaging: {item.packaging}</span>
                                        </div>
                                        <span className="font-mono text-white font-bold">{item.quantity} rls</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create DO Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Truck className="text-blue-500" /> New Delivery Order
                            </h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-white"><X /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Customer & Dates */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
                                        value={newOrderCustomer}
                                        onChange={e => setNewOrderCustomer(e.target.value)}
                                        placeholder="Enter customer..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Delivery Date (Optional)</label>
                                    <input
                                        type="date"
                                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:border-blue-500 outline-none placeholder-gray-600"
                                        value={newOrderDeliveryDate}
                                        onChange={e => setNewOrderDeliveryDate(e.target.value)}
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">Leave empty if undetermined.</p>
                                </div>
                            </div>

                            <hr className="border-gray-700" />

                            {/* Add Items Section */}
                            <div>
                                <h3 className="text-sm font-bold text-blue-400 uppercase mb-4 flex items-center gap-2">
                                    <Package size={16} /> Order Items
                                </h3>

                                {/* Generator Controls */}
                                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 space-y-4">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1">Layer</label>
                                            <select
                                                value={currentItemLayer}
                                                onChange={(e) => setCurrentItemLayer(e.target.value as ProductLayer)}
                                                className="w-full bg-gray-800 border border-gray-600 rounded text-sm px-2 py-1 text-white"
                                            >
                                                {PRODUCT_LAYERS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1">Material</label>
                                            <select
                                                value={currentItemMaterial}
                                                onChange={(e) => setCurrentItemMaterial(e.target.value as ProductMaterial)}
                                                className="w-full bg-gray-800 border border-gray-600 rounded text-sm px-2 py-1 text-white"
                                            >
                                                {PRODUCT_MATERIALS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1">Size</label>
                                            <select
                                                value={currentItemSize}
                                                onChange={(e) => setCurrentItemSize(e.target.value as ProductSize)}
                                                className="w-full bg-gray-800 border border-gray-600 rounded text-sm px-2 py-1 text-white"
                                            >
                                                {PRODUCT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Manual Fields (Auto-populated but editable) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1">Product Description / SKU</label>
                                            <input
                                                type="text"
                                                value={currentItemProductDesc}
                                                onChange={e => setCurrentItemProductDesc(e.target.value)}
                                                className="w-full bg-gray-800 border border-gray-600 rounded text-sm px-2 py-1 text-white font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 block mb-1">Packaging Color (Bag)</label>
                                            <select
                                                value={currentItemPackaging}
                                                onChange={(e) => setCurrentItemPackaging(e.target.value as PackagingColor)}
                                                className="w-full bg-gray-800 border border-gray-600 rounded text-sm px-2 py-1 text-white font-bold"
                                            >
                                                {PACKAGING_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Qty & Add */}
                                    <div className="flex items-end gap-3">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-gray-500 block mb-1">Quantity (Rolls)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={currentItemQty}
                                                onChange={e => setCurrentItemQty(Number(e.target.value))}
                                                className="w-full bg-gray-800 border border-gray-600 rounded text-sm px-2 py-1 text-white"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddItem}
                                            className="px-6 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded font-bold transition-colors shadow-lg"
                                        >
                                            Add Item
                                        </button>
                                    </div>
                                </div>

                                {/* Items Lists */}
                                <div className="mt-4 space-y-2">
                                    {newOrderItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-gray-800 px-3 py-2 rounded border border-gray-700">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-300 font-bold">{item.product}</span>
                                                <span className="text-xs text-gray-500">
                                                    Bag: <span className="text-white">{item.packaging}</span> ({item.size})
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-mono font-bold text-white">{item.quantity}</span>
                                                <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-300">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-700 bg-gray-800 sticky bottom-0 z-10 flex justify-end gap-3">
                            <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                            <button
                                onClick={handleSubmitOrder}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg"
                            >
                                Submit Delivery Order
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryOrderManagement;
