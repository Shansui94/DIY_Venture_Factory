import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const { count, error } = await supabase.from('production_logs').select('*', { count: 'exact', head: true });
    if (error) console.error(error);
    else console.log(`Total production_logs count: ${count}`);

    const { data: machines } = await supabase.from('sys_machines_v2').select('machine_id, name');
    console.log(`Registered machines in sys_machines_v2:`, machines);
}
run();
