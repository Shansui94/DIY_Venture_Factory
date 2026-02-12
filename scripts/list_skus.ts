
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listSkus() {
    const { data, error } = await supabase
        .from('master_items_v2')
        .select('sku, name, type, category, status')
        .limit(20);

    if (error) {
        console.error('Error fetching SKUs:', error);
        return;
    }

    console.log('Current SKUs (Top 20):');
    console.table(data);
}

listSkus();
