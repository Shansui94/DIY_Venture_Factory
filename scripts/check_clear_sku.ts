
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectClear() {
    console.log("--- Inspecting Machine T1.2-M01 Config ---");
    const { data: mData, error: mErr } = await supabase
        .from('machines')
        .select('*')
        .eq('id', 'T1.2-M01')
        .single();

    if (mErr) {
        console.error("Machine Error:", mErr);
    } else {
        console.log("Machine Data:", JSON.stringify(mData, null, 2));
    }

    console.log("\n--- Inspecting 'CLEAR' in master_items_v2 ---");
    const { data: item, error: iErr } = await supabase
        .from('master_items_v2')
        .select('*')
        .eq('sku', 'CLEAR');

    if (item && item.length > 0) {
        console.log("Found 'CLEAR':", item[0]);
    } else {
        console.log("'CLEAR' NOT FOUND in master_items_v2.");
    }
}

inspectClear();
