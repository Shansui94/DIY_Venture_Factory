
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, anonKey);

async function checkSku() {
    const targetSku = 'BW25CM-BLACK-1'; // Legacy SKU check
    console.log(`Checking SKU: ${targetSku}...`);

    // Check Item
    const { data: item, error: itemError } = await supabase
        .from('master_items_v2')
        .select('sku, net_weight_kg')
        .eq('sku', targetSku)
        .single();

    if (itemError) {
        console.error("❌ Item Lookoup Failed:", itemError.message);
    } else {
        console.log("✅ Item Found:", item);
    }

    // Check Recipe
    const { data: recipe, error: recipeError } = await supabase
        .from('bom_headers_v2')
        .select('recipe_id, name, is_default')
        .eq('sku', targetSku);

    if (recipeError) {
        console.error("❌ Recipe Lookup Failed:", recipeError.message);
    } else {
        console.log("✅ Recipes Found:", recipe);
    }
}

checkSku();
