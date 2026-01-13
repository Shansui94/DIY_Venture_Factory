
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
// Use service role to ensure we can see everything
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listProducts() {
    console.log("Listing ALL products from inventory view...");
    const { data: v2Data, error: v2Error } = await supabase.from('v2_inventory_view').select('sku, name').limit(50);

    if (v2Data && v2Data.length > 0) {
        console.table(v2Data);
        return;
    }

    if (v2Error) console.log("Error:", v2Error.message);
    else console.log("No products found.");
}

listProducts();
