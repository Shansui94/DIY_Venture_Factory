import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Box, Search, Plus, Edit2, Trash2, X, Save, Factory as FactoryIcon } from 'lucide-react';
import { getFactories, getFactoryInventory, updateFactoryStock, getItemTotalStock } from '../services/productionService';
import { Factory } from '../types/factory';

interface Item {
    id: string;
    sku: string;
    name: string;
    type: 'product' | 'raw';
    current_stock: number;
    unit: string;
}

const ProductLibrary: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [factories, setFactories] = useState<Factory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'product' | 'raw'>('all');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        type: 'product' as 'product' | 'raw',
        current_stock: 0,
        unit: 'Rolls'
    });
    // Temporary state to hold factory stock inputs inside modal
    const [factoryStocks, setFactoryStocks] = useState<Record<string, number>>({});

    const [saving, setSaving] = useState(false);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('items')
                .select('*')
                .order('sku', { ascending: true });

            if (error) throw error;
            if (data) setItems(data as Item[]);
        } catch (error) {
            console.error("Error fetching items:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
        getFactories().then(setFactories).catch(console.error);
    }, []);

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || item.type === filterType;
        return matchesSearch && matchesType;
    });

    const handleOpenModal = async (item?: Item) => {
        setFactoryStocks({}); // Reset

        if (item) {
            setEditingItem(item);
            setFormData({
                sku: item.sku,
                name: item.name,
                type: item.type,
                current_stock: item.current_stock,
                unit: item.unit
            });

            // Fetch existing factory stock
            // This is inefficient (N+1) but fine for single item edit
            try {
                // We need to query factory_inventory by item_id
                const { data, error } = await supabase
                    .from('factory_inventory')
                    .select('factory_id, quantity')
                    .eq('item_id', item.id);

                if (!error && data) {
                    const stocks: Record<string, number> = {};
                    data.forEach((rec: any) => {
                        stocks[rec.factory_id] = rec.quantity;
                    });
                    setFactoryStocks(stocks);
                }
            } catch (err) {
                console.error("Error loading factory stock details", err);
            }

        } else {
            setEditingItem(null);
            setFormData({ sku: '', name: '', type: 'product', current_stock: 0, unit: 'Rolls' });
            // Initialize 0 for all factories
            const initialStocks: Record<string, number> = {};
            factories.forEach(f => initialStocks[f.id] = 0);
            setFactoryStocks(initialStocks);
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let itemId = editingItem?.id;

            // Calculate total from factory inputs
            const totalStock = Object.values(factoryStocks).reduce((a, b) => a + b, 0);
            const dataToSave = { ...formData, current_stock: totalStock };

            if (editingItem) {
                // Update Item Header
                const { error } = await supabase
                    .from('items')
                    .update(dataToSave)
                    .eq('id', editingItem.id);
                if (error) throw error;
            } else {
                // Insert Item Header
                const { data, error } = await supabase
                    .from('items')
                    .insert(dataToSave)
                    .select()
                    .single();
                if (error) throw error;
                itemId = data.id;
            }

            // Save Factory Inventory Details
            if (itemId) {
                const updates = factories.map(f =>
                    updateFactoryStock(itemId!, f.id, factoryStocks[f.id] || 0)
                );
                await Promise.all(updates);
            }

            setIsModalOpen(false);
            fetchItems();
        } catch (error: any) {
            console.error("Error saving item:", error);
            alert("Failed to save: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        try {
            const { error } = await supabase.from('items').delete().eq('id', id);
            if (error) throw error;
            fetchItems();
        } catch (error: any) {
            console.error("Error deleting item:", error);
            alert("Delete failed: " + error.message);
        }
    };

    return (
        <div className="p-4 md:p-6 min-h-screen bg-gray-900 text-gray-100 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 flex items-center gap-3">
                        <Box size={36} className="text-teal-500" />
                        PRODUCT LIBRARY
                    </h1>
                    <p className="text-gray-400 mt-2">Manage Master Product & Material Data</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-teal-500/20 transition-all"
                >
                    <Plus size={20} /> New Item
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input
                        type="text"
                        placeholder="Search SKU or Name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                    />
                </div>
                <div className="flex bg-gray-800 rounded-xl p-1 border border-gray-700">
                    {['all', 'product', 'raw'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${filterType === type
                                ? 'bg-teal-600 text-white shadow'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {type === 'all' ? 'All Items' : type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-700/50 text-gray-400 uppercase text-xs font-bold">
                            <tr>
                                <th className="px-6 py-4">SKU</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Unit</th>
                                <th className="px-6 py-4">Current Stock (Total)</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading library...</td></tr>
                            ) : filteredItems.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No items found.</td></tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-700/30 transition-colors group">
                                        <td className="px-6 py-4 font-mono font-bold text-teal-300">{item.sku}</td>
                                        <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.type === 'product' ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
                                                : 'bg-blue-900/50 text-blue-300 border border-blue-700'
                                                }`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">{item.unit}</td>
                                        <td className="px-6 py-4 text-white font-mono">{item.current_stock}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenModal(item)}
                                                    className="p-2 hover:bg-gray-600 rounded-lg text-blue-400 hover:text-white transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 hover:bg-gray-600 rounded-lg text-red-400 hover:text-white transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-2xl shadow-2xl animate-fade-in-up">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {editingItem ? <Edit2 size={20} className="text-blue-400" /> : <Plus size={20} className="text-teal-400" />}
                                {editingItem ? 'Edit Item' : 'New Item'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SKU</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.sku}
                                        onChange={e => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-teal-500 uppercase font-mono"
                                        placeholder="E.g. PROD-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-teal-500"
                                    >
                                        <option value="product">Product</option>
                                        <option value="raw">Raw Material</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-teal-500"
                                    placeholder="Product Name"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unit</label>
                                    <input
                                        type="text"
                                        value={formData.unit}
                                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-teal-500"
                                        placeholder="e.g. Rolls, Kg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Current Stock (Total)</label>
                                    <input
                                        type="number"
                                        disabled
                                        value={Object.values(factoryStocks).reduce((a, b) => a + b, 0)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-400 cursor-not-allowed"
                                        title="Sum of factory stocks below"
                                    />
                                </div>
                            </div>

                            {/* Factory Stock Distribution */}
                            <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-700">
                                <h3 className="text-sm font-bold text-teal-400 mb-3 flex items-center gap-2">
                                    <FactoryIcon size={16} /> Stock Distribution by Factory
                                </h3>
                                {factories.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">No factories found. Please ensure database migration is run.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        {factories.map(factory => (
                                            <div key={factory.id}>
                                                <label className="block text-xs font-bold text-gray-500 mb-1 truncate">{factory.name}</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={factoryStocks[factory.id] || 0}
                                                    onChange={e => setFactoryStocks({
                                                        ...factoryStocks,
                                                        [factory.id]: Number(e.target.value)
                                                    })}
                                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>


                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`flex-1 bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {saving ? 'Saving...' : <><Save size={18} /> Save Item</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )}
        </div >
    );
};

export default ProductLibrary;
