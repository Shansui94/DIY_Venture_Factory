
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findProducts() {
    console.log("Searching for '2m' or 'double' products...");
    const { data: items } = await supabase
        .from('v2_inventory_view')
        .select('sku, name')
        .or('name.ilike.%2m%,name.ilike.%double%');

    if (items) {
        console.table(items);
    }
}

findProducts();
