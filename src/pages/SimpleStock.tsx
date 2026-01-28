
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getV2Items } from '../services/apiV2';
import { V2Item } from '../types/v2';
import { Package, User, Send, CheckCircle, RefreshCw, Search, X, Plus } from 'lucide-react';
import { determineZone } from '../utils/logistics';

// Malaysian States
const MALAYSIA_STATES = [
    "Not Specified",
    "Johor",
    "Kedah",
    "Kelantan",
    "Melaka",
    "Negeri Sembilan",
    "Pahang",
    "Penang",
    "Perak",
    "Perlis",
    "Sabah",
    "Sarawak",
    "Selangor",
    "Terengganu",
    "Kuala Lumpur",
    "Labuan",
    "Putrajaya"
];

// Reusable Searchable Select Component
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

// Item in the Cart
interface CartItem {
    id: string; // SKU
    name: string;
    quantity: number;
    uom: string;
}

const SimpleStock: React.FC = () => {
    // Data State
    const [items, setItems] = useState<V2Item[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [stockMap, setStockMap] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    // Form State
    const [customerName, setCustomerName] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [selectedDriver, setSelectedDriver] = useState('');

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);

    // Quick Add Line State
    const [selectedSku, setSelectedSku] = useState('');
    const [addQty, setAddQty] = useState<number | ''>('');

    const [submitting, setSubmitting] = useState(false);
    const [lastOrder, setLastOrder] = useState<string | null>(null);

    // Fetch Data Function
    const loadData = async () => {
        setLoading(true);
        try {
            const v2Items = await getV2Items();
            if (v2Items) setItems(v2Items);

            const { data: driverData } = await supabase
                .from('users_public')
                .select('id, name, email')
                .eq('role', 'Driver');

            if (driverData) setDrivers(driverData);

            const { data: stockData } = await supabase.rpc('get_live_stock_viewer');
            if (stockData) {
                const map: Record<string, number> = {};
                stockData.forEach((item: any) => map[item.sku] = item.current_stock);
                setStockMap(map);
            }

        } catch (e) {
            console.error("Error loading data:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Add to Cart
    const handleAddToCart = () => {
        if (!selectedSku) return;
        if (!addQty || Number(addQty) <= 0) return; // Silent return if invalid

        const itemData = items.find(i => i.sku === selectedSku);
        if (!itemData) return;

        // Check Stock
        const currentStock = stockMap[selectedSku] || 0;
        if (Number(addQty) > currentStock) {
            if (!window.confirm(`⚠️ Low Stock (${currentStock}). Proceed?`)) return;
        }

        // Check if exists
        const existingIdx = cart.findIndex(c => c.id === selectedSku);
        if (existingIdx >= 0) {
            const newCart = [...cart];
            newCart[existingIdx].quantity += Number(addQty);
            setCart(newCart);
        } else {
            setCart([...cart, {
                id: selectedSku,
                name: itemData.name,
                quantity: Number(addQty),
                uom: itemData.uom || 'Unit'
            }]);
        }

        // Reset inputs and stay in flow
        setSelectedSku('');
        setAddQty('');
    };

    // Auto-Add on Enter Key (in Qty field)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddToCart();
        }
    };

    // Remove from Cart
    const handleRemoveInfoCart = (sku: string) => {
        setCart(cart.filter(c => c.id !== sku));
    };

    // Update Cart Qty REMOVED (Unused in Single Column Layout)

    // Final Submit
    const handleBatchSubmit = async () => {
        if (cart.length === 0) return alert("Please add at least one item.");
        if (!customerName.trim()) return alert("Please enter Customer Name.");
        if (!selectedState) return alert("Please select a State.");

        setSubmitting(true);
        try {
            const doNumber = `DO-SS-${Date.now().toString().slice(-6)}`;

            const orderPayload = {
                order_number: doNumber,
                customer: customerName,
                delivery_address: selectedState,
                zone: determineZone(selectedState),
                driver_id: selectedDriver || null,
                status: 'New',
                items: cart.map(c => ({
                    product: c.name,
                    sku: c.id,
                    quantity: c.quantity,
                    remark: 'Batch Stock Out',
                    packaging: c.uom
                })),
                order_date: new Date().toISOString().split('T')[0],
                notes: `Batch Out: ${cart.length} items to ${customerName}`
            };

            const { error: orderError } = await supabase
                .from('sales_orders')
                .insert(orderPayload);

            if (orderError) throw orderError;

            for (const c of cart) {
                await supabase.rpc('record_stock_movement', {
                    p_sku: c.id,
                    p_qty: -c.quantity,
                    p_event_type: 'Transfer Out',
                    p_ref_doc: doNumber,
                    p_notes: `Batch Out: ${customerName}`
                });
            }

            setLastOrder(doNumber);
            setCart([]);
            await loadData();

        } catch (err: any) {
            console.error(err);
            alert("Error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };


    // Prepare Options
    const productOptions = items.map(item => {
        const stock = stockMap[item.sku] || 0;
        const isLow = stock < 100;
        return {
            value: item.sku,
            label: item.name,
            subLabel: `${item.sku} • Stock: ${stock}`,
            statusColor: isLow ? 'text-red-400' : 'text-green-400',
            statusLabel: isLow ? 'LOW' : 'OK'
        };
    });

    const stateOptions = MALAYSIA_STATES.map(s => ({ value: s, label: s }));
    const driverOptions = drivers.map(d => ({ value: d.id, label: d.name, subLabel: d.email }));

    const selectedItem = items.find(i => i.sku === selectedSku);

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 pb-24 font-sans flex justify-center">
            {/* SINGLE COLUMN CONTAINER */}
            <div className="w-full max-w-xl space-y-4">

                {/* 0. Header (Minimal) */}
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                        DIRECT STOCK OUT
                    </h1>
                    <button onClick={loadData} disabled={loading} className="p-2 bg-slate-900 rounded-full hover:bg-slate-800">
                        <RefreshCw size={16} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {lastOrder && (
                    <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                        <CheckCircle size={20} className="text-green-400" />
                        <div className="flex-1">
                            <div className="font-bold text-green-400 text-sm">Created: {lastOrder}</div>
                        </div>
                        <button onClick={() => setLastOrder(null)} className="px-3 py-1 bg-green-900/50 rounded-lg text-[10px] font-bold uppercase">
                            OK
                        </button>
                    </div>
                )}

                {/* 1. WHO (Customer) */}
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                        <User size={12} /> Customer Info
                    </div>

                    <input type="text" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-red-500/50 outline-none font-medium" />

                    <div className="flex gap-3">
                        <div className="flex-1">
                            <SearchableSelect placeholder="State/Area" options={stateOptions} value={selectedState} onChange={setSelectedState} minimal />
                        </div>
                        <div className="flex-1">
                            <SearchableSelect placeholder="Driver (Optional)" options={[{ value: '', label: 'No Driver' }, ...driverOptions]} value={selectedDriver} onChange={setSelectedDriver} minimal />
                        </div>
                    </div>
                </div>

                {/* 2. WHAT (Items List + Add Row) */}
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-lg min-h-[400px] flex flex-col">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-3">
                        <Package size={12} /> Items List
                    </div>

                    {/* EXISTING ITEMS */}
                    <div className="flex-1 space-y-2 mb-4">
                        {cart.length === 0 ? (
                            <div className="text-center py-8 text-slate-700 text-sm italic border-2 border-dashed border-slate-800 rounded-xl">
                                List empty. Add items below.
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center group hover:border-slate-700 transition-colors">
                                    <div className="flex-1">
                                        <div className="font-bold text-white text-sm">{item.name}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">{item.id}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-sm font-bold text-orange-400 bg-slate-900 px-2 py-1 rounded">
                                            x {item.quantity} {item.uom}
                                        </div>
                                        <button onClick={() => handleRemoveInfoCart(item.id)} className="text-slate-600 hover:text-red-500 p-1">
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* ADD ROW (integrated at bottom) */}
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col gap-3">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quick Add</div>

                        <SearchableSelect
                            placeholder="Select Product..."
                            options={productOptions}
                            value={selectedSku}
                            onChange={setSelectedSku}
                            minimal
                        />

                        <div className="flex gap-2 items-center">
                            {selectedItem && (
                                <div className={`text-xs px-2 py-1 rounded border ${(stockMap[selectedSku] || 0) < 100 ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-green-500/10 border-green-500/30 text-green-500'
                                    }`}>
                                    Stack: {stockMap[selectedSku] || 0}
                                </div>
                            )}
                            <div className="flex-1"></div>
                            <input
                                type="number"
                                placeholder="Qty"
                                value={addQty}
                                onChange={e => setAddQty(Number(e.target.value))}
                                onKeyDown={handleKeyDown}
                                className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-right font-bold outline-none focus:border-orange-500"
                            />
                            <button
                                onClick={handleAddToCart}
                                disabled={!selectedSku || !addQty}
                                className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg p-2 disabled:opacity-50"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. SUBMIT (Sticky Bottom or Just Bottom) */}
                <button
                    onClick={handleBatchSubmit}
                    disabled={submitting || cart.length === 0}
                    className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-2xl font-black text-lg uppercase shadow-xl shadow-red-900/30 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale transition-all active:scale-[0.98] mt-4"
                >
                    {submitting ? 'Processing...' : (
                        <>CONFIRM ORDER ({cart.length}) <Send size={20} /></>
                    )}
                </button>

            </div>
        </div>
    );
};

export default SimpleStock;
