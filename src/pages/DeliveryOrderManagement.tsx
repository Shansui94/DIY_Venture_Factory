import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getRecommendedPackaging } from '../utils/packagingRules';
import { getV2Items } from '../services/apiV2';
import { determineZone, findBestFactory } from '../utils/logistics';
import {
    Plus, Search, Calendar, FileText, X, Truck,
    User as UserIcon, ListFilter, Box, Sparkles, Zap
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
import SimpleStock from './SimpleStock';

// Reusable Searchable Select Component (Ported from SimpleStock for consistency)
interface SearchableSelectProps {
    label?: string;
    icon?: React.ReactNode;
    options: { value: string; label: string; subLabel?: string; statusLabel?: string; statusColor?: string }[];
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minimal?: boolean; // For cleaner look
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ label, icon, options, value, onChange, placeholder = "Search...", minimal = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Derived state for display
    const selectedOption = options.find(o => o.value === value);

    return (
        <div className="relative w-full">
            {label && (
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-1">
                    {icon} {label}
                </label>
            )}

            {/* Input / Trigger */}
            <div
                className={`w-full bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3 cursor-pointer hover:border-slate-700 transition-colors ${minimal ? 'p-3' : 'px-4 py-4'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Search size={16} className="text-slate-500" />

                {selectedOption ? (
                    <div className="flex-1">
                        <div className={`font-bold text-white ${minimal ? 'text-sm' : ''}`}>{selectedOption.label}</div>
                        {selectedOption.subLabel && !minimal && (
                            <div className="text-xs text-slate-500 font-mono">{selectedOption.subLabel}</div>
                        )}
                    </div>
                ) : (
                    <input
                        type="text"
                        placeholder={placeholder}
                        className="bg-transparent border-none outline-none text-white placeholder:text-slate-600 w-full"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setIsOpen(true);
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                )}

                {selectedOption ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange('');
                            setSearch('');
                        }}
                        className="p-1 hover:bg-slate-800 rounded-full text-slate-500"
                    >
                        <X size={16} />
                    </button>
                ) : null}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1e] border border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 divide-y divide-slate-800/50">
                        {options
                            .filter(opt =>
                                !search ||
                                opt.label.toLowerCase().includes(search.toLowerCase()) ||
                                (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
                            )
                            .map(opt => (
                                <div
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className="p-3 hover:bg-slate-800 cursor-pointer flex justify-between items-center group transition-colors"
                                >
                                    <div>
                                        <div className="text-sm font-medium text-gray-200 group-hover:text-white">{opt.label}</div>
                                        {opt.subLabel && <div className="text-[10px] text-gray-500 font-mono">{opt.subLabel}</div>}
                                    </div>
                                    {opt.statusColor && opt.statusLabel && (
                                        <div className={`text-[10px] font-bold ${opt.statusColor} bg-white/10 px-2 py-0.5 rounded uppercase`}>
                                            {opt.statusLabel}
                                        </div>
                                    )}
                                </div>
                            ))}
                        {options.filter(opt =>
                            !search ||
                            opt.label.toLowerCase().includes(search.toLowerCase()) ||
                            (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
                        ).length === 0 && (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                    No results found.
                                </div>
                            )}
                    </div>
                </>
            )}
        </div>
    );
};

const DeliveryOrderManagement: React.FC = () => {
    // --- STATE ---
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [drivers, setDrivers] = useState<User[]>([]);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isStockOutOpen, setIsStockOutOpen] = useState(false);
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

    // APPROVE AMENDMENT
    const handleApproveAmendment = async (order: SalesOrder) => {
        if (!window.confirm(`Approve changes for Order ${order.orderNumber}? \nThis will deduct stock and mark as Delivered.`)) return;

        try {
            // 1. Deduct Stock for approved amended quantities
            for (const item of order.items || []) {
                const qtyToDeduct = item.quantity || 0;
                if (qtyToDeduct > 0) {
                    const { error } = await supabase.rpc('record_stock_movement', {
                        p_sku: item.sku,
                        p_qty: -qtyToDeduct, // Negative OUT
                        p_event_type: 'Transfer Out',
                        p_ref_doc: order.orderNumber,
                        p_notes: `Approved Amend: ${order.notes || ''}`
                    });
                    if (error) console.error("Stock error for " + item.sku, error);
                }
            }

            // 2. Update Status
            const { error } = await supabase.from('sales_orders').update({
                status: 'Delivered',
                pod_timestamp: new Date().toISOString()
            }).eq('id', order.id);

            if (error) throw error;

            alert("✅ Approved & Stock Deducted!");
            fetchData();

        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const handleAddItem = () => {
        if (currentItemQty <= 0) return alert("Please enter a valid quantity.");

        let newItem: any = {};
        if (entryMode === 'search') {
            if (!selectedV2Item) return alert("Please select a product.");

            // Stock Check REMOVED
            // const currentStock = stockMap[selectedV2Item.sku] || 0;
            // if (currentItemQty > currentStock) {
            //    if (!window.confirm(`⚠️ Insufficient Stock!\nAvailable: ${currentStock}\nProceed anyway?`)) return;
            // }

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
        // if (!orderCustomer.trim()) return alert("Enter Customer Name");  <-- Removed validation
        if (newOrderItems.length === 0) return alert("Add at least one item");

        try {
            // Assign default customer if empty (since input is hidden)
            const finalCustomer = orderCustomer.trim() || "General Customer";

            let doNumber;
            if (editingOrderId) {
                // Keep existing DO Number
                const existingOrder = orders.find(o => o.id === editingOrderId);
                doNumber = existingOrder?.orderNumber;
            } else {
                // Generate New DO Number (Legacy Format or match new one?)
                // For now keeping legacy random for this manual form unless specified otherwise
                doNumber = `DO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
            }

            const zone = determineZone(newOrderAddress || '');
            const bestFactory = findBestFactory(zone, newOrderItems, stockMap);

            const payload: any = {
                order_number: doNumber,
                customer: finalCustomer,
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
                const response = await fetch('/api/agent/vision', {
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
                    onClick={() => setIsStockOutOpen(true)}
                    className="group relative bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white px-6 py-3 rounded-xl flex items-center gap-3 font-bold shadow-xl shadow-red-900/20 transition-all active:scale-95"
                >
                    <Zap size={20} className="fill-white" />
                    Quick Stock Out
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
                <div className="lg:col-span-2 flex bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-1 relative overflow-x-auto">
                    {['All', 'New', 'Pending Approval', 'Delivered'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${statusFilter === status
                                ? 'bg-blue-600/20 text-blue-400 shadow-sm border border-blue-500/10'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                }`}
                        >
                            {status === 'Pending Approval' ? (
                                <span className="flex items-center gap-2">
                                    Pending
                                    {orders.filter(o => o.status === 'Pending Approval').length > 0 && (
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                    )}
                                </span>
                            ) : status}
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

                                        {/* APPROVE BUTTON FOR VIVIAN */}
                                        {order.status === 'Pending Approval' && (
                                            <div className="mt-3 pt-3 border-t border-slate-800">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleApproveAmendment(order);
                                                    }}
                                                    className="w-full py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-red-900/30"
                                                >
                                                    <Zap size={14} /> Review & Approve Amend
                                                </button>
                                            </div>
                                        )}
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
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-black">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    {editingOrderId ? <FileText className="text-blue-400" /> : <Plus className="text-blue-400" />}
                                    {editingOrderId ? 'Edit Order' : 'Create New Order'}
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">Manage order details and items.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleCloseModal} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-950">

                            {/* Section 1: Basic Info (Simpler) */}
                            <div className="grid grid-cols-2 gap-4">
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
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Delivery Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 focus:border-blue-500/50 outline-none"
                                        value={newOrderDeliveryDate}
                                        onChange={e => setNewOrderDeliveryDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <hr className="border-slate-800" />

                            {/* Section 2: Items */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Box size={16} /> Order Items
                                </h3>

                                {/* Item List Layout */}
                                <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-lg flex flex-col min-h-[400px]">
                                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                            <Box size={14} /> Items List
                                        </div>
                                        <div className="text-xs font-bold text-slate-600 bg-slate-900 px-2 py-1 rounded">
                                            {newOrderItems.length} Items
                                        </div>
                                    </div>

                                    {/* Items List (Inline Edit) */}
                                    <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[400px]">
                                        {newOrderItems.length === 0 ? (
                                            <div className="text-center py-12 text-slate-700 text-sm italic border-2 border-dashed border-slate-800/50 rounded-xl">
                                                List empty. Add items below.
                                            </div>
                                        ) : (
                                            newOrderItems.map((item, idx) => (
                                                <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center group hover:border-slate-700 transition-colors">
                                                    <div className="flex-1">
                                                        <div className="font-bold text-white text-sm">{item.product}</div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-500 font-mono">{item.sku}</span>
                                                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold border border-blue-500/20">
                                                                {item.packaging || 'Unit'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {/* INLINE QUANTITY EDIT */}
                                                        <input
                                                            type="number"
                                                            className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right font-bold text-orange-400 focus:border-orange-500 outline-none text-sm"
                                                            value={item.quantity}
                                                            onChange={(e) => {
                                                                const val = Number(e.target.value);
                                                                const updated = [...newOrderItems];
                                                                updated[idx].quantity = val;
                                                                setNewOrderItems(updated);
                                                            }}
                                                        />
                                                        <button onClick={() => handleRemoveItem(idx)} className="text-slate-600 hover:text-red-500 p-1 rounded-full hover:bg-slate-900 transition-colors">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Add Row (Footer) - Search Only */}
                                    <div className="bg-slate-800/50 p-4 border-t border-slate-700/50 flex flex-col gap-3 rounded-b-2xl">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quick Add (Search SKU)</div>

                                        <div className="flex flex-col gap-3">
                                            <SearchableSelect
                                                placeholder="Select Product..."
                                                options={v2Items.map(item => ({
                                                    value: item.sku,
                                                    label: item.name,
                                                    subLabel: `${item.sku} • Stock: ${stockMap[item.sku] || 0}`,
                                                    statusColor: (stockMap[item.sku] || 0) < 100 ? 'text-red-400' : 'text-green-400',
                                                    statusLabel: (stockMap[item.sku] || 0) < 100 ? 'LOW' : 'OK'
                                                }))}
                                                value={selectedV2Item?.sku || ''}
                                                onChange={(val) => {
                                                    const i = v2Items.find(x => x.sku === val);
                                                    setSelectedV2Item(i || null);
                                                    if (i) setItemSearchTerm(i.name);
                                                }}
                                                minimal
                                            />
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="Qty"
                                                    className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-right font-bold outline-none focus:border-orange-500 text-sm"
                                                    value={currentItemQty || ''}
                                                    onChange={e => setCurrentItemQty(Number(e.target.value))}
                                                />
                                                <button
                                                    onClick={handleAddItem}
                                                    disabled={!selectedV2Item || !currentItemQty}
                                                    className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Plus size={16} /> Add Item
                                                </button>
                                            </div>
                                        </div>
                                    </div>
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

            {/* --- QUICK STOCK OUT MODAL --- */}
            {isStockOutOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl relative">
                        {/* Pass onClose to SimpleStock so it can render a back button or we handle it here. 
                             Actually SimpleStock logic I added handles the button rendering if onClose is present.
                         */}
                        <div className="p-4">
                            <SimpleStock onClose={() => setIsStockOutOpen(false)} isModal={true} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Start Icon helper needed for V2 items check mark

function CheckCircle({ size, className }: { size?: number, className?: string }) {
    return <div className={`rounded-full border flex items-center justify-center ${className}`} style={{ width: size, height: size }}>✓</div>;
}

export default DeliveryOrderManagement;
