import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    const threshold = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data, error } = await supabase
        .from('production_logs')
        .select('machine_id, created_at')
        .gte('created_at', threshold)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    const map = new Map();
    data?.forEach(log => {
        if (!map.has(log.machine_id)) {
            map.set(log.machine_id, log.created_at);
        }
    });

    console.log(`Active Machines (Last 15 mins): ${map.size}`);
    map.forEach((lastSeen, id) => {
        console.log(`- ${id}: Last seen ${lastSeen}`);
    });
}
run();
