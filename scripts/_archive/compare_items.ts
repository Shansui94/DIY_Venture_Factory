import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Key");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function compareItems() {
    console.log("Fetching Legacy Items...");
    const { data: legacyItems, error: legError } = await supabase
        .from('items')
        .select('name, type') // Assuming 'name' or some ID is the key. Ideally SKU if it exists, let's check field names.
        // In verify_schema.js or previous files, I might have seen the schema.
        // diagnose_system.sql used: SELECT ... FROM public.items WHERE type = 'product'
        // seed_legacy_data.sql inserts into master_items_v2 using 'sku'.
        // Let's assume 'items' has 'name' or 'id'. I'll fetch * for a few to filter, but commonly it might not have 'sku'.
        // Wait, the user said "proucs/item".
        // Let's try to fetch all columns for a sample first if unsure, but I'll guess 'name' is the common key if SKU is missing in legacy.
        // Actually, let's just fetch all and map in memory.
        .select('*');

    if (legError) {
        console.error("Error fetching legacy items:", legError.message);
        return;
    }

    console.log("Fetching V2 Master Items...");
    const { data: v2Items, error: v2Error } = await supabase
        .from('master_items_v2')
        .select('sku, name, type');

    if (v2Error) {
        console.error("Error fetching V2 items:", v2Error.message);
        return;
    }

    console.log(`\nLegacy Count: ${legacyItems.length}`);
    console.log(`V2 Count: ${v2Items.length}`);

    // Create Sets for comparison
    // Assuming 'name' might be a shared identifier if SKU is not in legacy
    // Or maybe legacy 'items' has a 'code' or 'sku' column?
    // safe bet: index by Name for now.

    const legacyNames = new Set(legacyItems.map(i => i.name));
    const v2Names = new Set(v2Items.map(i => i.name));

    // Find what's in V2 but not in Legacy
    const inV2Only = v2Items.filter(i => !legacyNames.has(i.name));

    // Find what's in Legacy but not in V2
    const inLegacyOnly = legacyItems.filter(i => !v2Names.has(i.name));

    console.log("\n--- In V2 Only (New Items?) ---");
    if (inV2Only.length > 0) {
        inV2Only.forEach(i => console.log(`[${i.type}] ${i.sku} - ${i.name}`));
    } else {
        console.log("None.");
    }

    console.log("\n--- In Legacy Only (Missing in V2?) ---");
    if (inLegacyOnly.length > 0) {
        inLegacyOnly.forEach(i => console.log(`[${i.type}] ${i.name}`)); // Type might be different field
    } else {
        console.log("None.");
    }
}

compareItems();
