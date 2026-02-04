
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

const MACHINE_ID = 'T1.2-M01';

async function check1970() {
    console.log(`Checking 1970 logs for ${MACHINE_ID}...`);

    // Check for logs before year 2000
    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('*')
        .eq('machine_id', MACHINE_ID)
        .lt('created_at', '2000-01-01T00:00:00Z')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    if (logs && logs.length > 0) {
        console.log(`⚠️ FOUND 1970 LOGS (${logs.length}):`);
        logs.forEach(log => {
            console.log(`ID: ${log.id} | Time: ${log.created_at} | Count: ${log.alarm_count}`);
        });
        console.log("Likely NTP failure on device.");
    } else {
        console.log("No 1970 logs found.");
    }
}

check1970();
