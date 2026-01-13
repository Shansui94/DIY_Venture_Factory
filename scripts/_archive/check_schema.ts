
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Checking sales_orders columns...");
    // Try to select the non-existent column to trigger a clear error or listing
    const { data, error } = await supabase.from('sales_orders').select('*').limit(1);

    if (error) {
        console.error("Error fetching sales_orders:", error);
    } else if (data && data.length > 0) {
        console.log("Columns found in first row keys:", Object.keys(data[0]));
        if (!Object.keys(data[0]).includes('delivery_address')) {
            console.log("CONFIRMED: 'delivery_address' column is MISSING.");
        } else {
            console.log("WEIRD: 'delivery_address' column EXISTS.");
        }
    } else {
        console.log("Table empty, cannot infer keys from data, but query worked.");
    }
}

main();
