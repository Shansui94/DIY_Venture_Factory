
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getV2Items } from '../services/apiV2';
import { V2Item } from '../types/v2';
import { Package, User, Send, CheckCircle, RefreshCw, Search, X, Plus, Calendar } from 'lucide-react';
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

// Utility
const formatDateDMY = (dateStr?: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
};

// Item in the Cart
interface CartItem {
    id: string; // SKU
    name: string;
    quantity: number;
    uom: string;
    location: string;
    remark?: string; // Inline Item Remark
}

interface SimpleStockProps {
    onClose?: () => void;
    isModal?: boolean;
    onSuccess?: () => void;
}

const SimpleStock: React.FC<SimpleStockProps> = ({ onClose, isModal = false, onSuccess }) => {
    // Data State
    const [items, setItems] = useState<V2Item[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [stockMap, setStockMap] = useState<Record<string, number>>({});
    const [driverLeaves, setDriverLeaves] = useState<any[]>([]);
    const [scheduledServices, setScheduledServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedDriver, setSelectedDriver] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [selectedPlace, setSelectedPlace] = useState('1'); // Default 1
    const [stockLocation, setStockLocation] = useState('');
    const [batchNotes, setBatchNotes] = useState(''); // Batch Notes (Noted)

    // Dual Date States
    const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [deliveryDate, setDeliveryDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);

    // Quick Add Line State
    const [selectedSku, setSelectedSku] = useState('');
    const [addQty, setAddQty] = useState<number | ''>('');
    const [addRemark, setAddRemark] = useState(''); // Item Remark Input

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

            // Fetch Leaves & Services for validation
            const { data: leaves } = await supabase.from('driver_leave').select('*');
            if (leaves) setDriverLeaves(leaves);

            const { data: services } = await supabase.from('lorry_service_requests').select('*').eq('status', 'Scheduled');
            if (services) setScheduledServices(services);

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

    // Helper: Ensure YYYY-MM-DD format (Local Time safe)
    const toDateString = (date: string | Date) => {
        if (!date) return '';
        if (typeof date === 'string') {
            if (date.includes('T')) return new Date(date).toLocaleDateString('en-CA');
            return date;
        }
        return new Date(date).toLocaleDateString('en-CA');
    };

    const checkDriverAvailability = (driverId: string, orderDateStr?: string) => {
        if (!driverId || driverId === 'unassigned') return true;

        const targetDateStr = toDateString(orderDateStr || new Date());
        const driverName = drivers.find(d => d.id === driverId)?.name || 'Driver';

        // 1. BLOCK: Check for exact Leave date match
        const strictConflict = driverLeaves.filter(l => l.status !== 'Rejected').find(l => {
            if (l.driver_id !== driverId) return false;
            const startStr = toDateString(l.start_date);
            const endStr = toDateString(l.end_date);
            return targetDateStr >= startStr && targetDateStr <= endStr;
        });

        if (strictConflict) {
            alert(`⛔ BLOCKED: ${driverName} is on leave from ${formatDateDMY(strictConflict.start_date)} to ${formatDateDMY(strictConflict.end_date)}.\n\nCannot assign orders on ${formatDateDMY(targetDateStr)}.`);
            return false;
        }

        // 2. WARN: Near-future Warning (3 days before leave starts)
        const targetDateObj = new Date(targetDateStr);
        const nearConflict = driverLeaves.filter(l => l.status !== 'Rejected').find(l => {
            if (l.driver_id !== driverId) return false;

            const startStr = toDateString(l.start_date);
            const start = new Date(startStr);
            const bufferDate = new Date(startStr);
            bufferDate.setDate(bufferDate.getDate() - 3);

            return targetDateObj >= bufferDate && targetDateObj < start;
        });

        if (nearConflict) {
            const confirmLeaveWithUser = window.confirm(`💡 LEAVE REMINDER: ${driverName} will be on leave starting ${formatDateDMY(nearConflict.start_date)} (in 3 days or less).\n\nAre you sure you want to assign this trip?`);
            if (!confirmLeaveWithUser) return false;
        }

        // 3. WARN: Service Date Conflict
        const serviceConflict = scheduledServices.find(s => {
            if (s.driver_id !== driverId) return false;
            return toDateString(s.scheduled_date) === targetDateStr;
        });

        if (serviceConflict) {
            const confirmService = window.confirm(`🔧 SERVICE WARNING: The lorry for ${driverName} is scheduled for maintenance on ${formatDateDMY(targetDateStr)}.\n\nProceed with assignment?`);
            if (!confirmService) return false;
        }

        return true;
    };

    // Auto-check availability when Driver or Date changes
    useEffect(() => {
        if (selectedDriver && (deliveryDate || entryDate)) {
            // Use timeout to prevent blocked render loop if alert/confirm is shown
            const timer = setTimeout(() => {
                const dateToCheck = deliveryDate || entryDate;
                const ok = checkDriverAvailability(selectedDriver, dateToCheck);
                if (!ok) {
                    // Reset selection if user cancels or is blocked
                    setSelectedDriver('');
                }
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [selectedDriver, deliveryDate, entryDate]);

    // Add to Cart
    const handleAddToCart = () => {
        if (!selectedSku) return;
        if (!addQty || Number(addQty) <= 0) return;
        if (!stockLocation) return alert("Please select a Stock Location before adding item.");

        const itemData = items.find(i => i.sku === selectedSku);
        if (!itemData) return;

        const existingIdx = cart.findIndex(c => c.id === selectedSku && c.location === stockLocation);
        if (existingIdx >= 0) {
            const newCart = [...cart];
            newCart[existingIdx].quantity += Number(addQty);
            setCart(newCart);
        } else {
            setCart([...cart, {
                id: selectedSku,
                name: itemData.name,
                quantity: Number(addQty),
                uom: itemData.uom || 'Unit',
                location: stockLocation,
                remark: addRemark
            }]);
        }

        setSelectedSku('');
        setAddQty('');
        setAddRemark('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddToCart();
        }
    };

    const handleRemoveInfoCart = (sku: string) => {
        setCart(cart.filter(c => c.id !== sku));
    };


    const handleBatchSubmit = async () => {
        if (cart.length === 0) return alert("Please add at least one item.");
        if (!selectedDriver) return alert("Please select a Driver.");
        if (!selectedState) return alert("Please select a State.");

        // Driver Check
        if (!checkDriverAvailability(selectedDriver, deliveryDate || entryDate)) return;

        const driverObj = drivers.find(d => d.id === selectedDriver);
        const driverName = driverObj ? driverObj.name.split(' ')[0] : 'Driver';

        const yymmdd = deliveryDate.replace(/-/g, '').slice(2);

        setSubmitting(true);
        try {
            const prefix = `DO-${driverName}-${yymmdd}-`;
            const { count, error: countError } = await supabase
                .from('sales_orders')
                .select('*', { count: 'exact', head: true })
                .ilike('order_number', `${prefix}%`);

            if (countError) throw countError;

            const nextSeq = ((count || 0) + 1).toString().padStart(3, '0');
            const doNumber = `${prefix}${nextSeq}`;

            const autoCustomerName = `Stock Out - ${driverName}`;
            const uniqueLocs = Array.from(new Set(cart.map(c => c.location))).join(', ');

            const orderPayload = {
                order_number: doNumber,
                customer: autoCustomerName,
                delivery_address: selectedState,
                zone: determineZone(selectedState),
                driver_id: selectedDriver,
                status: 'New',
                items: cart.map(c => ({
                    product: c.name,
                    sku: c.id,
                    quantity: c.quantity,
                    remark: c.remark ? `${c.remark} (Loc: ${c.location})` : `Loc: ${c.location}`,
                    packaging: c.uom
                })),
                order_date: entryDate,
                deadline: deliveryDate,
                notes: `${batchNotes ? batchNotes + ' | ' : ''}Quick Out by ${driverName} (${cart.length} items) | Locs: ${uniqueLocs} | Places: ${selectedPlace}`
            };

            const { error: orderError } = await supabase
                .from('sales_orders')
                .insert(orderPayload);

            if (orderError) throw orderError;

            setLastOrder(doNumber);
            setCart([]);
            setBatchNotes('');

            if (onSuccess) {
                onSuccess();
            } else {
                alert("✅ Order Created!");
                // window.location.reload();
            }

            if (onClose) onClose();

        } catch (err: any) {
            console.error(err);
            alert("Error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };


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
    const placeOptions = Array.from({ length: 15 }, (_, i) => ({ value: (i + 1).toString(), label: (i + 1).toString() }));
    const locationOptions = [
        { value: 'SPD', label: 'SPD' },
        { value: 'OPM Lama', label: 'OPM Lama' },
        { value: 'OPM Corner', label: 'OPM Corner' },
        { value: 'Nilai', label: 'Nilai' }
    ];

    const selectedItem = items.find(i => i.sku === selectedSku);

    return (
        <div className={isModal ? "bg-slate-950 text-white font-sans flex justify-center w-full" : "min-h-screen bg-slate-950 text-white p-4 pb-24 font-sans flex justify-center"}>
            <div className="w-full max-w-xl space-y-4">

                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                        {onClose && (
                            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        )}
                        <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                            NEW ORDER
                        </h1>
                    </div>
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

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                        <User size={12} /> Stock Out Info
                    </div>

                    <SearchableSelect
                        placeholder="Select Driver (Mandatory)"
                        options={driverOptions}
                        value={selectedDriver}
                        onChange={setSelectedDriver}
                    />

                    <div className="pt-2 border-t border-slate-800 flex gap-3">
                        <div className="flex-1">
                            <SearchableSelect
                                placeholder="Select State / Area (Mandatory)"
                                options={stateOptions}
                                value={selectedState}
                                onChange={setSelectedState}
                                minimal={true}
                            />
                        </div>
                        <div className="flex-1">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-600 uppercase mb-1 tracking-tighter">📦 Order Date</label>
                                    <input
                                        type="date"
                                        value={entryDate}
                                        onChange={(e) => setEntryDate(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-2 text-slate-400 text-[11px] outline-none [color-scheme:dark]"
                                    />
                                    <div className="text-[8px] text-slate-700 mt-0.5 font-bold">{formatDateDMY(entryDate)}</div>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-blue-500/80 uppercase mb-1 tracking-tighter">🚚 Deliver Date</label>
                                    <input
                                        type="date"
                                        value={deliveryDate}
                                        onChange={(e) => setDeliveryDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white text-[11px] font-black outline-none [color-scheme:dark] focus:border-blue-500/30"
                                    />
                                    <div className="text-[8px] text-blue-500/60 mt-0.5 font-bold">{formatDateDMY(deliveryDate)}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                        <SearchableSelect
                            label="Total Places (Drops)"
                            placeholder="Select drop count..."
                            options={placeOptions}
                            value={selectedPlace}
                            onChange={setSelectedPlace}
                            minimal={true}
                        />
                    </div>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-lg">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Order Notes (Batch Remark)</label>
                    <textarea
                        rows={2}
                        placeholder="Enter general notes for this stock out..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 focus:border-blue-500/50 outline-none placeholder:text-slate-600 resize-none"
                        value={batchNotes}
                        onChange={e => setBatchNotes(e.target.value)}
                    />
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-lg min-h-[400px] flex flex-col">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-3">
                        <Package size={12} /> Items List
                    </div>

                    <div className="flex-1 space-y-2 mb-4">
                        {cart.length === 0 ? (
                            <div className="text-center py-8 text-slate-700 text-sm italic border-2 border-dashed border-slate-800 rounded-xl">
                                List empty. Add items below.
                            </div>
                        ) : (
                            cart.map((item, idx) => (
                                <div key={item.id + idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center group hover:border-slate-700 transition-colors">
                                    <div className="flex-1">
                                        <div className="font-bold text-white text-sm">{item.name}</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-500 font-mono">{item.id}</span>
                                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold border border-blue-500/20">
                                                {item.location}
                                            </span>
                                            {item.remark && (
                                                <span className="text-[10px] text-slate-400 italic">
                                                    — {item.remark}
                                                </span>
                                            )}
                                        </div>
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

                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col gap-3">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quick Add</div>

                        <SearchableSelect
                            label="Source Location"
                            placeholder="Select Origin..."
                            options={locationOptions}
                            value={stockLocation}
                            onChange={setStockLocation}
                            minimal
                        />

                        <SearchableSelect
                            placeholder="Select Product..."
                            options={productOptions}
                            value={selectedSku}
                            onChange={setSelectedSku}
                            minimal
                        />

                        <div className="flex gap-2 items-center">
                            {selectedItem && (
                                <div className={`text-xs px-2 py-1 rounded border ${(stockMap[selectedSku] || 0) < 100 ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-green-500/10 border-green-500/30 text-green-500'}`}>
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
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Item Remark (Optional)..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-xs outline-none focus:border-blue-500 placeholder:text-slate-600"
                                value={addRemark}
                                onChange={e => setAddRemark(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                onClick={handleAddToCart}
                                disabled={!selectedSku || !addQty}
                                className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 disabled:opacity-50"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                </div>

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
