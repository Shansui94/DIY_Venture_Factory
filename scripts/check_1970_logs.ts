
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkOldLogs() {
    console.log("Checking for 'Ghost' Logs (1970 timestamps)...");

    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('*')
        .lt('created_at', '2020-01-01T00:00:00') // Check logs older than 2020
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) { console.error(error); return; }

    if (logs && logs.length > 0) {
        console.log(`⚠️ FOUND ${logs.length} logs with invalid dates! This means NTP failed.`);
        logs.forEach(l => {
            console.log(`- ID: ${l.id}, Machine: ${l.machine_id}, Time: ${l.created_at}`);
        });
    } else {
        console.log("✅ No logs found with 1970 timestamps.");
    }
}

checkOldLogs();
