
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectLogs() {
    console.log("Fetching Latest 20 Production Logs (Real-time check)...");

    const { data: latestLogs, error } = await supabase
        .from('production_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching latest logs:", error);
        return;
    }

    if (latestLogs && latestLogs.length > 0) {
        console.log(`Found ${latestLogs.length} logs.`);
        console.log(`Found ${latestLogs.length} logs.`);
        const formatted = latestLogs.map(l => {
            const date = new Date(l.created_at);
            const localTime = new Date(date.getTime() + (8 * 60 * 60 * 1000)).toISOString().replace('T', ' ').substring(0, 19);
            return `${localTime} | ID: ${l.machine_id} | Qty: ${l.alarm_count} | CreatedAt: ${l.created_at}`;
        });
        console.log("Recent Logs:\n" + formatted.join("\n"));
    } else {
        console.log("No logs found recently (Count: 0).");
    }
}

inspectLogs();
