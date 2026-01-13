
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listMachines() {
    // Try v2 first
    console.log("Checking sys_machines_v2...");
    const { data: v2Data, error: v2Error } = await supabase.from('sys_machines_v2').select('*').limit(5);

    if (v2Data && v2Data.length > 0) {
        console.table(v2Data.map(m => ({ uuid: m.machine_id, name: m.name, station: m.station_id })));
        return;
    }

    if (v2Error) console.log("V2 Error:", v2Error.message);

    // Try v1
    console.log("Checking sys_machines...");
    const { data: v1Data, error: v1Error } = await supabase.from('sys_machines').select('*').limit(5);

    if (v1Data) {
        console.table(v1Data);
    } else {
        console.log("No machines found or permission error.", v1Error?.message);
    }
}

listMachines();
