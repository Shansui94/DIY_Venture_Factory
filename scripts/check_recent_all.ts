
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), debug: false });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkRecent() {
    console.log("--- Checking Logs (Last 15 Mins) ---");

    // 15 mins ago
    const timeThreshold = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('machine_id, alarm_count, created_at, product_sku')
        .gte('created_at', timeThreshold)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    if (logs && logs.length > 0) {
        console.log(`FOUND ${logs.length} RECORDS:`);
        logs.forEach(log => {
            const time = new Date(log.created_at).toLocaleTimeString();
            console.log(`[${time}] Machine: ${log.machine_id} | Count: ${log.alarm_count} | SKU: ${log.product_sku}`);
        });
    } else {
        console.log("No logs found in the last 15 minutes.");
    }
}

checkRecent();
