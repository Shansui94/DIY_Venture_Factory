import { supabase } from './supabase';
import { Item, Recipe, ProductionRunResult, Factory, Machine } from '../types';

// --- Items (Materials & Products) ---

export const getItems = async () => {
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name');

    if (error) throw error;
    return data as Item[];
};

export const getItemsByType = async (type: 'raw' | 'product') => {
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('type', type)
        .order('name');

    if (error) throw error;
    return data as Item[];
};

export const getItemBySku = async (sku: string) => {
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('sku', sku)
        .single();

    if (error) return null; // Return null if not found (or throw if preferred)
    return data as Item;
};

// --- Recipes ---

export const getRecipesByProduct = async (productId: string) => {
    const { data, error } = await supabase
        .from('recipes')
        .select(`
            *,
            items:recipe_items (
                *,
                material:items (*)
            )
        `)
        .eq('product_id', productId)
        .eq('status', 'active');

    if (error) throw error;
    // Transform to match our interface structure if needed, 
    // though Supabase returns nested objects well.
    return data as Recipe[];
};

export const getRecipeById = async (recipeId: string) => {
    const { data, error } = await supabase
        .from('recipes')
        .select(`
            *,
            items:recipe_items (
                *,
                material:items (*)
            )
        `)
        .eq('id', recipeId)
        .single();

    if (error) throw error;
    return data as Recipe;
};

export const createRecipe = async (
    productId: string,
    name: string,
    items: { materialId: string, quantity: number }[]
) => {
    // 1. Create Recipe Header
    const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert({ product_id: productId, name, status: 'active' })
        .select()
        .single();

    if (recipeError) throw recipeError;
    const recipeId = recipeData.id;

    // 2. Create Recipe Items
    const recipeItemsData = items.map(item => ({
        recipe_id: recipeId,
        material_id: item.materialId,
        quantity: item.quantity
    }));

    const { error: itemsError } = await supabase
        .from('recipe_items')
        .insert(recipeItemsData);

    if (itemsError) throw itemsError;

    return recipeData;
};

// --- Production Execution ---

export const executeProductionRun = async (
    recipeId: string,
    quantity: number,
    referenceId?: string,
    factoryId?: string,
    machineId?: string
): Promise<ProductionRunResult> => {
    const { data, error } = await supabase
        .rpc('execute_production_run', {
            p_recipe_id: recipeId,
            p_quantity: quantity,
            p_reference_id: referenceId,
            p_factory_id: factoryId,
            p_machine_id: machineId
        });

    if (error) throw error;
    return data as ProductionRunResult;
};
// --- Factories & Machines ---

export const getFactories = async () => {
    const { data, error } = await supabase
        .from('factories')
        .select('*')
        .order('name');
    if (error) throw error;
    return data as Factory[];
};

export const getMachinesByFactory = async (factoryId: string) => {
    const { data, error } = await supabase
        .from('sys_machines_v2')
        .select('id:machine_id, *')
        .eq('factory_id', factoryId)
        .order('name');
    if (error) throw error;
    return data as Machine[];
};

export const getMachines = async () => {
    const { data, error } = await supabase
        .from('sys_machines_v2')
        .select('id:machine_id, *')
        .order('name');
    if (error) throw error;
    return data as Machine[];
};

export const getMachineById = async (id: string) => {
    const { data, error } = await supabase
        .from('sys_machines_v2')
        .select('*')
        .eq('machine_id', id)
        .single();
    if (error) throw error;
    return data as Machine;
};

export const getMachineByCode = async (code: string) => {
    const { data, error } = await supabase
        .from('sys_machines_v2')
        .select('*') // Return raw ID (UUID) and machine_id (Code)
        .eq('machine_id', code)
        .single();
    if (error) return null;
    return data as Machine;
};

// --- Factory Inventory ---
export const getFactoryInventory = async (factoryId: string) => {
    const { data, error } = await supabase
        .from('factory_inventory')
        .select(`
            *,
            item:items(*)
        `)
        .eq('factory_id', factoryId);

    if (error) throw error;
    return data;
};

// Helper: Get total stock for an item across all factories
export const getItemTotalStock = async (itemId: string) => {
    const { data, error } = await supabase
        .from('factory_inventory')
        .select('quantity')
        .eq('item_id', itemId);

    if (error) throw error;
    const total = data.reduce((sum, record) => sum + (record.quantity || 0), 0);
    return total;
};

export const updateFactoryStock = async (itemId: string, factoryId: string, quantity: number) => {
    const { error } = await supabase
        .from('factory_inventory')
        .upsert({
            item_id: itemId,
            factory_id: factoryId,
            quantity: quantity,
            updated_at: new Date().toISOString()
        }, { onConflict: 'item_id, factory_id' });

    if (error) throw error;
};
