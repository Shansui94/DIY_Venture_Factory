import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getRecommendedPackaging } from '../utils/packagingRules';
import { getV2Items } from '../services/apiV2';
import { determineZone, findBestFactory } from '../utils/logistics';
import {
    Plus, Search, Calendar, FileText, X, Truck, Package,
    User as UserIcon, ListFilter, Box, Sparkles, Upload,
    ChevronRight, MapPin, AlertCircle
} from 'lucide-react';
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
    // --- STATE ---
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [drivers, setDrivers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');

    // AI / Smart Import State
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Editing State
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

    // New Order Form State
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [newOrderDeliveryDate, setNewOrderDeliveryDate] = useState('');
    const [newOrderItems, setNewOrderItems] = useState<SalesOrder['items']>([]);
    const [orderCustomer, setOrderCustomer] = useState('');
    const [newOrderAddress, setNewOrderAddress] = useState('');

    // AI Autocomplete State
    const [customerDB, setCustomerDB] = useState<any[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

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
    const [currentItemQty, setCurrentItemQty] = useState(0);

    // --- EFFECTS ---

    // Auto-calculate packaging & SKU (Manual Mode)
    useEffect(() => {
        const recommended = getRecommendedPackaging(currentItemLayer, currentItemMaterial, currentItemSize);
        if (recommended) setCurrentItemPackaging(recommended);

        const wCode = PRODUCT_SIZES.find(s => s.value === currentItemSize)?.code;
        const mCode = PRODUCT_MATERIALS.find(m => m.value === currentItemMaterial)?.code;
        const lCode = PRODUCT_LAYERS.find(l => l.value === currentItemLayer)?.code;
        const cCode = PACKAGING_COLORS.find(c => c.value === recommended)?.code;
        const sku = `PROD-BW-${lCode}${wCode}-${mCode}-${cCode}`;

        const layerLabel = PRODUCT_LAYERS.find(l => l.value === currentItemLayer)?.label || currentItemLayer;
        const materialLabel = PRODUCT_MATERIALS.find(m => m.value === currentItemMaterial)?.label || currentItemMaterial;
        const sizeLabel = PRODUCT_SIZES.find(s => s.value === currentItemSize)?.label || currentItemSize;
        const description = `Bubble Wrap ${sizeLabel} ${layerLabel} Layer ${materialLabel}`;

        setCurrentItemSku(sku);
        setCurrentItemProductDesc(description);
    }, [currentItemLayer, currentItemMaterial, currentItemSize]);

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, ordersRes, itemsRes, customersRes] = await Promise.all([
                supabase.from('users_public').select('*').eq('role', 'Driver'),
                supabase.from('sales_orders').select('*').order('created_at', { ascending: false }),
                getV2Items(),
                supabase.from('sys_customers').select('*')
            ]);

            if (customersRes.data) setCustomerDB(customersRes.data);
            if (itemsRes) setV2Items(itemsRes);

            if (usersRes.data) {
                const mappedDrivers: User[] = usersRes.data.map(u => ({
                    uid: u.id,
                    email: u.email,
                    name: u.name || u.email?.split('@')[0] || 'Unknown Driver',
                    role: 'Driver'
                } as any));
                setDrivers(mappedDrivers);
            }

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
                    notes: o.notes,
                    zone: o.zone,
                    deliveryAddress: o.delivery_address
                }));
                setOrders(mappedOrders);
            }
        } catch (err) {
            console.error("System Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('do-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_orders' }, fetchData)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // Filter Logic
    const filteredOrders = orders.filter(o =>
        (statusFilter === 'All' || o.status === statusFilter) &&
        (getDriverName(o.driverId)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.customer.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredV2Items = v2Items.filter(item =>
    (item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(itemSearchTerm.toLowerCase()))
    ).slice(0, 50);

    // Stock Visibility
    const [stockMap, setStockMap] = useState<Record<string, number>>({});
    useEffect(() => {
        const fetchStock = async () => {
            const { data } = await supabase.rpc('get_live_stock_viewer');
            if (data) {
                const map: Record<string, number> = {};
                data.forEach((item: any) => map[item.sku] = item.current_stock);
                setStockMap(map);
            }
        };
        if (isCreateModalOpen) fetchStock();
    }, [isCreateModalOpen]);

    // --- HANDLERS ---

    const handleAddItem = () => {
        if (currentItemQty <= 0) return alert("Please enter a valid quantity.");

        let newItem: any = {};
        if (entryMode === 'search') {
            if (!selectedV2Item) return alert("Please select a product.");

            // Stock Check
            const currentStock = stockMap[selectedV2Item.sku] || 0;
            if (currentItemQty > currentStock) {
                if (!window.confirm(`⚠️ Insufficient Stock!\nAvailable: ${currentStock}\nProceed anyway?`)) return;
            }

            newItem = {
                product: selectedV2Item.name,
                sku: selectedV2Item.sku,
                quantity: currentItemQty,
                remark: currentItemRemark,
                packaging: selectedV2Item.uom || 'Unit'
            };
        } else {
            newItem = {
                product: currentItemProductDesc,
                sku: currentItemSku,
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
        setCurrentItemRemark('');
        setSelectedV2Item(null);
        setItemSearchTerm('');
    };

    const handleRemoveItem = (index: number) => {
        const updated = [...newOrderItems];
        updated.splice(index, 1);
        setNewOrderItems(updated);
    };

    const handleCustomerSearch = (term: string) => {
        setOrderCustomer(term);
        if (term.length > 0) {
            const matches = customerDB.filter(c => c.name.toLowerCase().includes(term.toLowerCase())).slice(0, 5);
            setFilteredCustomers(matches);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSelectCustomer = (customer: any) => {
        setOrderCustomer(customer.name);
        setNewOrderAddress(customer.address || '');
        setShowSuggestions(false);
    };

    const handleSubmitOrder = async () => {
        if (!orderCustomer.trim()) return alert("Enter Customer Name");
        if (newOrderItems.length === 0) return alert("Add at least one item");

        try {
            const doNumber = `DO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
            const zone = determineZone(newOrderAddress || '');
            const bestFactory = findBestFactory(zone, newOrderItems, stockMap);

            const payload = {
                order_number: doNumber,
                customer: orderCustomer,
                delivery_address: newOrderAddress,
                zone: zone,
                factory_id: bestFactory.id,
                driver_id: selectedDriverId || null,
                items: newOrderItems,
                status: 'New',
                order_date: new Date().toISOString().split('T')[0],
                deadline: newOrderDeliveryDate || null
            };

            if (editingOrderId) {
                const { error } = await supabase.from('sales_orders').update(payload).eq('id', editingOrderId);
                if (error) throw error;
                alert(`Order Updated!\nAssigned to ${bestFactory.name}`);
            } else {
                const { error } = await supabase.from('sales_orders').insert(payload);
                if (error) throw error;

                // Auto-save NEW customer
                const existing = customerDB.find(c => c.name.toLowerCase() === orderCustomer.toLowerCase());
                if (!existing && newOrderAddress) {
                    supabase.from('sys_customers').insert({
                        name: orderCustomer, address: newOrderAddress, zone: determineZone(newOrderAddress)
                    }).then(() => {
                        supabase.from('sys_customers').select('*').then(res => res.data && setCustomerDB(res.data));
                    });
                }
                alert(`Order Created!\nAssigned to ${bestFactory.name} (Zone: ${zone})`);
            }

            handleCloseModal();
            fetchData();
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setEditingOrderId(null);
        setSelectedDriverId('');
        setOrderCustomer('');
        setNewOrderAddress('');
        setNewOrderDeliveryDate('');
        setNewOrderItems([]);
    };

    function getDriverName(driverId?: string) {
        if (!driverId) return 'Unassigned';
        const d = drivers.find(u => u.uid === driverId);
        return d ? d.name : 'Unknown Driver';
    }

    // --- AI SMART IMPORT LOGIC ---
    const handleAIFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Data = reader.result as string;
                const base64Clean = base64Data.split(',')[1]; // Server expects raw base64

                // Call Server Vision API
                const response = await fetch('http://localhost:8080/api/agent/vision', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64Clean })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Server error');
                }

                const data = await response.json(); // Array of extracted objects

                if (Array.isArray(data) && data.length > 0) {
                    const first = data[0]; // Take first contact found
                    if (first.name) setOrderCustomer(first.name);
                    if (first.address) setNewOrderAddress(first.address);
                    // You could also extract items if the prompt was updated, but for now just Contact Info
                    alert(`✨ AI Extracted:\nName: ${first.name}\nAddress: ${first.address}`);
                } else {
                    alert("AI couldn't find contact info in this image.");
                }
                setIsAnalyzing(false);
            };
        } catch (err: any) {
            console.error(err);
            alert("AI Error: " + err.message);
            setIsAnalyzing(false);
        }
    };


    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans selection:bg-blue-500/30">
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 flex items-center gap-3">
                        <Truck className="text-blue-400" size={32} />
                        Order Management
                    </h1>
                    <p className="text-slate-400 mt-1 font-medium">Assign orders, track shipments, and manage fleet.</p>
                </div>
                <button
                    onClick={() => { handleCloseModal(); setIsCreateModalOpen(true); }}
                    className="group relative bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center gap-3 font-bold shadow-xl shadow-blue-900/20 transition-all active:scale-95"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    New Order
                </button>
            </div>

            {/* --- FILTERS & STATS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                {/* Search Bar */}
                <div className="lg:col-span-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search Driver, Customer, or DO Number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/50 backdrop-blur-sm border border-slate-800 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                    />
                </div>

                {/* Status Tabs */}
                <div className="lg:col-span-2 flex bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-1">
                    {['All', 'New', 'Delivered'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${statusFilter === status
                                    ? 'bg-blue-600/20 text-blue-400 shadow-sm border border-blue-500/10'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- MAIN GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {drivers.map(driver => {
                    const driverOrders = filteredOrders.filter(o => o.driverId === driver.uid);
                    if (driverOrders.length === 0 && (searchTerm || statusFilter !== 'All')) return null;

                    return (
                        <div key={driver.uid} className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl flex flex-col overflow-hidden hover:border-blue-500/30 transition-all group">
                            {/* Card Header */}
                            <div className="p-5 border-b border-slate-800/60 bg-gradient-to-r from-slate-900 to-transparent">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-blue-400">
                                            <UserIcon size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-200">{driver.name}</h3>
                                            <p className="text-xs text-slate-500 font-mono">ID: {driver.uid.substring(0, 6)}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="text-2xl font-black text-slate-100">{driverOrders.length}</div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active DOs</div>
                                    </div>
                                </div>
                            </div>

                            {/* Orders List */}
                            <div className="flex-1 p-3 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {driverOrders.map(order => (
                                    <div
                                        key={order.id}
                                        onClick={() => {
                                            setEditingOrderId(order.id);
                                            setSelectedDriverId(order.driverId || '');
                                            setOrderCustomer(order.customer);
                                            setNewOrderAddress(order.deliveryAddress || '');
                                            setNewOrderDeliveryDate(order.deadline || '');
                                            setNewOrderItems(order.items || []);
                                            setIsCreateModalOpen(true);
                                        }}
                                        className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl hover:bg-blue-900/10 hover:border-blue-500/30 cursor-pointer transition-all relative group/card"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/10">
                                                {order.orderNumber}
                                            </div>
                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${order.status === 'New' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' :
                                                    order.status === 'Delivered' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' :
                                                        'text-slate-400 border-slate-700 bg-slate-800'
                                                }`}>
                                                {order.status}
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-slate-200 text-sm mb-1 truncate">{order.customer}</h4>
                                        <div className="text-xs text-slate-500 flex items-center gap-2 mb-3">
                                            <Calendar size={12} /> {order.deadline || 'No Deadline'}
                                            {order.zone && <span className="text-slate-600">• {order.zone}</span>}
                                        </div>

                                        {/* Items Preview */}
                                        <div className="space-y-1">
                                            {order.items?.slice(0, 3).map((item, i) => (
                                                <div key={i} className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                                                    <Box size={10} className="text-slate-600" />
                                                    <span className="text-slate-300 font-bold">{item.quantity}x</span> {item.product}
                                                </div>
                                            ))}
                                            {order.items && order.items.length > 3 && (
                                                <div className="text-[10px] text-slate-600 italic">+ {order.items.length - 3} more items</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {driverOrders.length === 0 && (
                                    <div className="h-32 flex flex-col items-center justify-center text-slate-700">
                                        <Box size={32} className="mb-2 opacity-50" />
                                        <span className="text-xs font-medium">No active orders</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- CREATE / EDIT MODAL --- */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-black">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    {editingOrderId ? <FileText className="text-blue-400" /> : <Plus className="text-blue-400" />}
                                    {editingOrderId ? 'Edit Order' : 'Create New Order'}
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">Fill in details manually or use AI Import.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* AI IMPORT BUTTON */}
                                <label className="relative cursor-pointer group">
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAIFileUpload} disabled={isAnalyzing} />
                                    <div className={`px-4 py-2 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all flex items-center gap-2 font-bold text-sm ${isAnalyzing ? 'animate-pulse cursor-wait' : ''}`}>
                                        <Sparkles size={16} className={isAnalyzing ? 'animate-spin' : ''} />
                                        {isAnalyzing ? 'Analyzing...' : 'AI Auto-Fill'}
                                    </div>
                                    <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                        Upload a DO/Invoice image to auto-fill customer info.
                                    </div>
                                </label>

                                <button onClick={handleCloseModal} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-slate-950">

                            {/* Section 1: Customer & Delivery */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Customer Name</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 text-slate-600" size={16} />
                                            <input
                                                type="text"
                                                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 focus:border-blue-500/50 outline-none font-bold"
                                                placeholder="Search or type new customer..."
                                                value={orderCustomer}
                                                onChange={e => handleCustomerSearch(e.target.value)}
                                                onFocus={() => orderCustomer && setShowSuggestions(true)}
                                            />
                                            {showSuggestions && filteredCustomers.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                                    {filteredCustomers.map(c => (
                                                        <div key={c.id} onClick={() => handleSelectCustomer(c)} className="px-4 py-3 hover:bg-blue-600/10 hover:text-blue-400 cursor-pointer text-sm border-b border-slate-800 last:border-0 transition-colors">
                                                            <div className="font-bold">{c.name}</div>
                                                            <div className="text-xs text-slate-500 truncate">{c.address}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Delivery Address</label>
                                        <textarea
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 focus:border-blue-500/50 outline-none min-h-[80px]"
                                            placeholder="Full address..."
                                            value={newOrderAddress}
                                            onChange={e => setNewOrderAddress(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assigned Driver</label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-3 top-3 text-slate-600" size={16} />
                                            <select
                                                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 focus:border-blue-500/50 outline-none appearance-none"
                                                value={selectedDriverId}
                                                onChange={e => setSelectedDriverId(e.target.value)}
                                            >
                                                <option value="">-- Unassigned --</option>
                                                {drivers.map(d => <option key={d.uid} value={d.uid}>{d.name}</option>)}
                                            </select>
                                            <div className="absolute right-4 top-4 pointer-events-none text-slate-600">▼</div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Deadline</label>
                                        <input
                                            type="date"
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 focus:border-blue-500/50 outline-none"
                                            value={newOrderDeliveryDate}
                                            onChange={e => setNewOrderDeliveryDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-800" />

                            {/* Section 2: Items */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Box size={16} /> Order Items
                                </h3>

                                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 space-y-5">
                                    {/* Entry Mode Switch */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEntryMode('search')}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${entryMode === 'search' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                                        >
                                            <Search size={14} /> Search SKU
                                        </button>
                                        <button
                                            onClick={() => setEntryMode('manual')}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 ${entryMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                                        >
                                            <ListFilter size={14} /> Manual Build
                                        </button>
                                    </div>

                                    {/* Inputs */}
                                    <div className="space-y-4">
                                        {entryMode === 'search' ? (
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Search product name or SKU..."
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none"
                                                    value={itemSearchTerm}
                                                    onChange={e => { setItemSearchTerm(e.target.value); setSelectedV2Item(null); }}
                                                />
                                                {/* Results */}
                                                {itemSearchTerm && !selectedV2Item && (
                                                    <div className="absolute w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl z-20 max-h-48 overflow-y-auto shadow-2xl">
                                                        {filteredV2Items.map(item => (
                                                            <div key={item.sku} onClick={() => { setSelectedV2Item(item); setItemSearchTerm(item.name); }} className="p-3 hover:bg-slate-800 cursor-pointer flex justify-between items-center group">
                                                                <div>
                                                                    <div className="text-sm font-medium text-slate-200 group-hover:text-blue-300">{item.name}</div>
                                                                    <div className="text-xs text-slate-500">{item.sku}</div>
                                                                </div>
                                                                <div className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">Stock: {stockMap[item.sku] || 0}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {selectedV2Item && (
                                                    <div className="mt-2 text-xs text-blue-400 flex items-center gap-2">
                                                        <CheckCircle size={12} /> Selected: <span className="font-bold">{selectedV2Item.sku}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {/* Manual Selects */}
                                                <select value={currentItemLayer} onChange={e => setCurrentItemLayer(e.target.value as any)} className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white outline-none">
                                                    {PRODUCT_LAYERS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                                </select>
                                                <select value={currentItemMaterial} onChange={e => setCurrentItemMaterial(e.target.value as any)} className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white outline-none">
                                                    {PRODUCT_MATERIALS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                                </select>
                                                <select value={currentItemSize} onChange={e => setCurrentItemSize(e.target.value as any)} className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white outline-none">
                                                    {PRODUCT_SIZES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                                </select>
                                            </div>
                                        )}

                                        <div className="flex gap-4">
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-blue-500/50 outline-none"
                                                value={currentItemQty}
                                                onChange={e => setCurrentItemQty(Number(e.target.value))}
                                            />
                                            <button
                                                onClick={handleAddItem}
                                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-sm transition-all"
                                            >
                                                Add Item
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Items List Table */}
                                <div className="mt-4 space-y-2">
                                    {newOrderItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-900 border border-slate-800 rounded-lg group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-200">{item.product}</div>
                                                    <div className="text-xs text-slate-500">{item.sku}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="font-mono text-sm text-blue-400 font-bold">{item.quantity} units</div>
                                                <button onClick={() => handleRemoveItem(idx)} className="text-slate-600 hover:text-red-400 transition-colors">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={handleCloseModal} className="px-6 py-2 rounded-xl text-slate-400 hover:text-white font-bold transition-colors">Cancel</button>
                            <button
                                onClick={handleSubmitOrder}
                                className="px-8 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-all active:scale-95"
                            >
                                {editingOrderId ? 'Save Changes' : 'Confirm Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Start Icon helper needed for V2 items check mark
import { Check } from 'lucide-react';
function CheckCircle({ size, className }: { size?: number, className?: string }) {
    return <div className={`rounded-full border flex items-center justify-center ${className}`} style={{ width: size, height: size }}>✓</div>;
}

export default DeliveryOrderManagement;
