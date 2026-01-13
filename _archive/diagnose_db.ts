
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SERVICE_ROLE_KEY!; // Service Role to see EVERYTHING
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("--- DATABASE DIAGNOSIS ---");

    // 1. Check 'items' table (V1)
    const { count: itemsCount, error: itemsError } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true });

    if (itemsError) console.error("Error checking 'items':", itemsError.message);
    else console.log(`Table 'public.items': ${itemsCount} rows.`);

    // 2. Check 'master_items_v2' table (V2)
    const { count: v2Count, error: v2Error } = await supabase
        .from('master_items_v2')
        .select('*', { count: 'exact', head: true });

    if (v2Error) console.error("Error checking 'master_items_v2':", v2Error.message);
    else console.log(`Table 'public.master_items_v2': ${v2Count} rows.`);

    // 3. Check specific SKUs in 'items' (Sample)
    const { data: sampleItems } = await supabase
        .from('items')
        .select('sku, current_stock')
        .limit(5);

    if (sampleItems && sampleItems.length > 0) {
        console.log("Sample 'items' data:", sampleItems);
    } else {
        console.log("Table 'items' is EMPTY or returned no data.");
    }
}

diagnose();
