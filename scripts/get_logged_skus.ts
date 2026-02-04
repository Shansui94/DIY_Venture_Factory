import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
    console.log('Fetching unique SKUs from production_logs...');
    const { data, error } = await supabase
        .from('production_logs')
        .select('product_sku')
        .not('product_sku', 'eq', 'UNKNOWN')
        .not('product_sku', 'eq', 'BW-UNKNOWN');

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    const skus = Array.from(new Set(data?.map(d => d.product_sku))).sort();
    console.log('Unique Valid SKUs:', JSON.stringify(skus, null, 2));
}

run();
