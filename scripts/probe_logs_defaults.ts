
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), debug: false });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function inspectLogsTable() {
    console.log("--- production_logs Columns ---");
    // We can query the structure by getting one row and printing keys, OR assuming public schema access

    // Attempt: Insert a row with ONLY machine_id and count, see what comes back (defaults).
    // This proved T1.3-M03 works.

    const { data, error } = await supabase
        .from('production_logs')
        .insert({
            machine_id: 'T1.2-M01-PROBE', // Use a unique probe ID
            alarm_count: 1
        })
        .select();

    if (error) {
        console.log("Probe Error:", error.message, error.details);
    } else {
        console.log("Probe Success:", data);
    }
}

inspectLogsTable();
