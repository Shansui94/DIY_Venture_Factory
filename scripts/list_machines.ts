
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listMachines() {
    console.log("Fetching Machine List...");
    const { data, error } = await supabase
        .from('sys_machines_v2')
        .select('*')
        .order('machine_id');

    if (error) {
        console.error("Error fetching machines:", error);
        return;
    }

    if (data.length === 0) {
        console.log("No machines found in sys_machines_v2.");
    } else {
        console.table(data.map(m => ({
            ID: m.machine_id,
            Name: m.name,
            Type: m.type,
            Factory: m.factory_id,
            Status: m.status
        })));
    }
}

listMachines();
