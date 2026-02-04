import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActiveDevices() {
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    console.log(`Checking logs since: ${threshold}`);

    // Query latest log for each machine that is within the threshold
    const { data, error } = await supabase
        .from('production_logs')
        .select('machine_id, created_at')
        .gte('created_at', threshold)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    const activeMachines = new Set(data?.map(log => log.machine_id));

    console.log("--- Active ESP32 Devices (Last 6 Minutes) ---");
    console.log(`Count: ${activeMachines.size}`);
    activeMachines.forEach(id => {
        const lastLog = data?.find(l => l.machine_id === id);
        console.log(`- ${id} (Last seen: ${lastLog?.created_at})`);
    });
}

checkActiveDevices();
