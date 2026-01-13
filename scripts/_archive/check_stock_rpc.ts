
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Checking get_live_stock_viewer RPC...");
    const { data, error } = await supabase.rpc('get_live_stock_viewer');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success! First 2 items:");
        console.log(JSON.stringify(data.slice(0, 2), null, 2));
    }
}

main();
