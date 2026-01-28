
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkOldLogs() {
    console.log("Checking for logs with invalid timestamps (Year < 2025)...");

    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('*')
        .lt('created_at', '2025-01-01T00:00:00')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (logs && logs.length > 0) {
        console.log(`⚠️ FOUND ${logs.length} RECORDS WITH INVALID DATES!`);
        console.table(logs.map(l => ({
            id: l.id,
            machine: l.machine_id,
            time_recorded: l.created_at, // Likely 1970
            inserted_at: l.created_at // Usually same, but if default... wait, created_at is timestamp in DB? 
            // My firmware sends "created_at" in JSON.
        })));
        console.log("Reason: Device rebooted and recorded data before NTP Time Sync.");
    } else {
        console.log("✅ No logs found with invalid dates (1970).");
    }
}

checkOldLogs();
