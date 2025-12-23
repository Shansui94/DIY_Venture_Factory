import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Item, Recipe, RecipeItem } from '../types/factory';
import { Plus, Edit, Copy, CheckCircle, Search, Save, X, Trash2 } from 'lucide-react';

const RecipeManager: React.FC = () => {
    // State
    const [products, setProducts] = useState<Item[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Item | null>(null);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(false);
    const [materials, setMaterials] = useState<Item[]>([]); // For dropdowns

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);
    const [recipeItems, setRecipeItems] = useState<Partial<RecipeItem>[]>([]);

    useEffect(() => {
        fetchProducts();
        fetchMaterials();
    }, []);

    useEffect(() => {
        if (selectedProduct) {
            fetchRecipes(selectedProduct.id);
        } else {
            setRecipes([]);
        }
    }, [selectedProduct]);

    async function fetchProducts() {
        // Fetch items where type = 'product'
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('type', 'product');
        if (error) console.error(error);
        else setProducts(data || []);
    }

    async function fetchMaterials() {
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('type', 'raw');
        if (error) console.error(error);
        else setMaterials(data || []);
    }

    async function fetchRecipes(productId: string) {
        setLoading(true);
        const { data, error } = await supabase
            .from('recipes')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setRecipes(data || []);
        setLoading(false);
    }

    async function handleSetDefault(recipe: Recipe) {
        if (!selectedProduct) return;

        // 1. Unset others
        await supabase
            .from('recipes')
            .update({ is_default: false })
            .eq('product_id', selectedProduct.id);

        // 2. Set this one
        const { error } = await supabase
            .from('recipes')
            .update({ is_default: true })
            .eq('id', recipe.id);

        if (error) alert("Error setting default: " + error.message);
        else fetchRecipes(selectedProduct.id);
    }

    async function toggleStatus(recipe: Recipe) {
        const newStatus = recipe.status === 'active' ? 'draft' : 'active';
        const { error } = await supabase
            .from('recipes')
            .update({ status: newStatus })
            .eq('id', recipe.id);

        if (error) alert("Error updating status");
        else {
            setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, status: newStatus } : r));
        }
    }

    // --- Modal Logic ---

    const openNewRecipeModal = () => {
        if (!selectedProduct) return;
        setEditingRecipe({
            product_id: selectedProduct.id,
            name: `${selectedProduct.name} - New Ver`,
            status: 'draft',
            is_default: false
        });
        setRecipeItems([]); // Start fresh
        setIsModalOpen(true);
    };

    const openEditModal = async (recipe: Recipe) => {
        setEditingRecipe(recipe);
        // Fetch items
        const { data } = await supabase
            .from('recipe_items')
            .select('*, material:items(*)') // Join to get names if needed
            .eq('recipe_id', recipe.id);

        setRecipeItems(data || []);
        setIsModalOpen(true);
    };

    const saveRecipe = async () => {
        if (!editingRecipe || !editingRecipe.name) return;

        try {
            let recipeId = editingRecipe.id;

            // 1. Upsert Recipe Header
            const { data: recipeData, error: recipeError } = await supabase
                .from('recipes')
                .upsert({
                    id: editingRecipe.id, // Undefined if new -> UUID gen
                    product_id: editingRecipe.product_id,
                    name: editingRecipe.name,
                    status: editingRecipe.status,
                    is_default: editingRecipe.is_default || false
                })
                .select()
                .single();

            if (recipeError) throw recipeError;
            recipeId = recipeData.id;

            // 2. Upsert Recipe Items
            // Improve: Delete existing items and re-insert? Or smart upsert? 
            // Simple approach: Delete all for this recipe, then insert current list.
            if (editingRecipe.id) {
                await supabase.from('recipe_items').delete().eq('recipe_id', recipeId);
            }

            if (recipeItems.length > 0) {
                const itemsToInsert = recipeItems.map(item => ({
                    recipe_id: recipeId,
                    material_id: item.material_id,
                    quantity: item.quantity
                }));
                const { error: itemsError } = await supabase.from('recipe_items').insert(itemsToInsert);
                if (itemsError) throw itemsError;
            }

            setIsModalOpen(false);
            if (selectedProduct) fetchRecipes(selectedProduct.id);
            alert("Recipe Saved!");

        } catch (err: any) {
            console.error(err);
            alert("Error saving: " + err.message);
        }
    };

    const addIngredientRow = () => {
        setRecipeItems([...recipeItems, { material_id: '', quantity: 0 }]);
    };

    const updateIngredient = (index: number, field: string, value: any) => {
        const newItems = [...recipeItems];
        (newItems[index] as any)[field] = value;
        setRecipeItems(newItems);
    };

    const removeIngredient = (index: number) => {
        setRecipeItems(recipeItems.filter((_, i) => i !== index));
    };


    // --- Render ---

    return (
        <div className="p-6 h-full flex flex-col gap-6 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Copy className="text-purple-400" /> Recipe Manager
                    </h1>
                    <p className="text-gray-400 text-sm">Manage standard and alternative BOMs for production.</p>
                </div>
            </div>

            <div className="flex gap-6 h-full min-h-0">

                {/* Left: Product List */}
                <div className="w-1/3 bg-gray-800 rounded-xl border border-gray-700 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-700 bg-gray-800 sticky top-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search Products..."
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-2">
                        {products.map(prod => (
                            <button
                                key={prod.id}
                                onClick={() => setSelectedProduct(prod)}
                                className={`w-full text-left p-3 rounded-lg flex justify-between items-center transition-all ${selectedProduct?.id === prod.id
                                    ? 'bg-purple-900/40 border border-purple-500/50 text-white'
                                    : 'hover:bg-gray-700 text-gray-300'
                                    }`}
                            >
                                <div>
                                    <p className="font-bold">{prod.name}</p>
                                    <p className="text-xs text-gray-500 font-mono">{prod.sku}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Recipe Details */}
                <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden relative">
                    {!selectedProduct ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4">
                            <Search size={48} className="opacity-20" />
                            <p>Select a product to view recipes</p>
                        </div>
                    ) : (
                        <>
                            {/* Toolbar */}
                            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-850">
                                <h2 className="text-xl font-bold text-white">
                                    <span className="text-gray-500 mr-2">Recipes for:</span>
                                    {selectedProduct.name}
                                </h2>
                                <button
                                    onClick={openNewRecipeModal}
                                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg transition-all"
                                >
                                    <Plus size={18} /> New Recipe
                                </button>
                            </div>

                            {/* Recipes Grid */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {loading && <p className="text-center text-gray-500">Loading recipes...</p>}

                                {!loading && recipes.length === 0 && (
                                    <div className="text-center p-12 border-2 border-dashed border-gray-700 rounded-2xl">
                                        <p className="text-gray-400">No recipes found for this product.</p>
                                        <button onClick={openNewRecipeModal} className="text-purple-400 font-bold mt-2 hover:underline">Create First Recipe</button>
                                    </div>
                                )}

                                {recipes.map(recipe => (
                                    <div key={recipe.id} className={`p-4 rounded-xl border ${recipe.is_default ? 'border-green-500/50 bg-green-900/10' : 'border-gray-700 bg-gray-800'} relative group`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-bold text-white">{recipe.name}</h3>
                                                    {recipe.is_default && (
                                                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded flex items-center gap-1 font-bold border border-green-500/30">
                                                            <CheckCircle size={10} /> DEFAULT
                                                        </span>
                                                    )}
                                                    <span className={`px-2 py-0.5 rounded text-xs border ${recipe.status === 'active' ? 'border-blue-500/30 text-blue-400' :
                                                        recipe.status === 'draft' ? 'border-orange-500/30 text-orange-400' : 'border-gray-600 text-gray-500'
                                                        }`}>
                                                        {recipe.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">ID: {recipe.id}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {!recipe.is_default && (
                                                    <button onClick={() => handleSetDefault(recipe)} className="text-xs text-gray-500 hover:text-green-400 border border-gray-600 hover:border-green-400 px-2 py-1 rounded transition-colors">
                                                        Set as Default
                                                    </button>
                                                )}
                                                <button onClick={() => toggleStatus(recipe)} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">
                                                    Make {recipe.status === 'active' ? 'Draft' : 'Active'}
                                                </button>
                                                <button onClick={() => openEditModal(recipe)} className="p-2 hover:bg-gray-700 rounded-lg text-blue-400 transition-colors">
                                                    <Edit size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* EDIT/CREATE MODAL */}
            {isModalOpen && editingRecipe && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {editingRecipe.id ? <Edit className="text-blue-400" /> : <Plus className="text-purple-400" />}
                                {editingRecipe.id ? 'Edit Recipe' : 'New Recipe'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X /></button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">

                            {/* General Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Recipe Name</label>
                                    <input
                                        type="text"
                                        value={editingRecipe.name}
                                        onChange={e => setEditingRecipe({ ...editingRecipe, name: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                                        placeholder="e.g. Standard Version A"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Status</label>
                                    <select
                                        value={editingRecipe.status}
                                        onChange={e => setEditingRecipe({ ...editingRecipe, status: e.target.value as any })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                                    >
                                        <option value="draft">Draft (R&D)</option>
                                        <option value="active">Active (Production)</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                            </div>

                            {/* BOM */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-gray-400 text-xs font-bold uppercase">Ingredients (BOM)</label>
                                    <button onClick={addIngredientRow} className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                                        <Plus size={12} /> Add Material
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {recipeItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <select
                                                value={item.material_id}
                                                onChange={(e) => updateIngredient(idx, 'material_id', e.target.value)}
                                                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm"
                                            >
                                                <option value="">Select Material...</option>
                                                {materials.map(mat => (
                                                    <option key={mat.id} value={mat.id}>{mat.name} ({mat.sku})</option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                value={item.quantity}
                                                onChange={(e) => updateIngredient(idx, 'quantity', parseFloat(e.target.value))}
                                                className="w-24 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm"
                                            />
                                            <button onClick={() => removeIngredient(idx)} className="text-red-400 hover:text-red-300 p-2"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                    {recipeItems.length === 0 && (
                                        <p className="text-center text-gray-500 text-sm py-4 italic bg-gray-800/50 rounded-lg">No ingredients added yet.</p>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-700 flex justify-end gap-3 bg-gray-850 rounded-b-2xl">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                            <button onClick={saveRecipe} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg flex items-center gap-2">
                                <Save size={18} /> Save Recipe
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecipeManager;
