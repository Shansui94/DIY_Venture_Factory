
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load Environment Variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const SKUS_TO_ADD = [
    "eoo-b17", "eoo-b20", "eoo-b25", "eoo-b28", "eoo-b32", "eoo-b35", "eoo-b38", "eoo-b40", "eoo-b45", "eoo-b50", "eoo-b60",
    "eoo-w17", "eoo-w20", "eoo-w25", "eoo-w28", "eoo-w32", "eoo-w35", "eoo-w38", "eoo-w40", "eoo-w45", "eoo-w50", "eoo-w60"
];

async function addProducts() {
    console.log(`🌱 Adding ${SKUS_TO_ADD.length} EOO products...`);

    const productsToInsert = SKUS_TO_ADD.map(sku => ({
        sku: sku,
        name: sku, // Using SKU as Name for now
        type: 'FG',
        category: 'Packaging',
        supply_type: 'Manufactured',
        uom: 'Unit',
        status: 'Active'
    }));

    // Perform Upsert (Insert or Update if exists)
    // On conflict on 'sku', do nothing or update? 
    // Usually ignoring duplicates is safer if we just want to ensure they exist.
    const { error, data } = await supabaseAdmin
        .from('master_items_v2')
        .upsert(productsToInsert, { onConflict: 'sku' })
        .select();

    if (error) {
        console.error("❌ Insert/Upsert Failed:", error.message);
    } else {
        console.log(`✅ Successfully processed products. (Inserted/Updated)`);
    }
}

addProducts();
