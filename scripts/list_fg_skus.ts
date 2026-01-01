
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // Read-only is fine
const supabase = createClient(supabaseUrl, anonKey);

async function listSkus() {
    console.log("Fetching Finished Goods (FG) from master_items_v2...");

    const { data, error } = await supabase
        .from('master_items_v2')
        .select('sku, net_weight_kg')
        .ilike('sku', 'BW%')
        .is('net_weight_kg', null);

    if (error) {
        console.error("Error:", error);
    } else {
        console.table(data);
    }
}

listSkus();
