
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkColumns() {
    console.log("Checking columns for 'machine_active_products'...");

    const { data, error } = await supabase
        .from('machine_active_products')
        .select('*')
        .limit(1);

    if (error) { console.error(error); return; }

    if (data && data.length > 0) {
        console.log("Columns found:", Object.keys(data[0]));
    } else {
        console.log("Table is empty, cannot inspect keys via select.");
        // Try rpc or just assuming ctid strategy
    }
}

checkColumns();
