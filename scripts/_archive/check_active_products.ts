
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("Checking Active Products for T1.2-M01...");
    const { data, error } = await supabase
        .from('machine_active_products')
        .select('*')
        .eq('machine_id', 'T1.2-M01');

    if (error) console.error(error);
    else console.table(data);
}

main();
