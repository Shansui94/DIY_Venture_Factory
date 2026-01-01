
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.VITE_SERVICE_ROLE_KEY || anonKey;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function listRecentLogs() {
    console.log("Querying recent logs...");
    const { data, error } = await supabase
        .from('production_logs_v2')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (data.length === 0) {
        console.log("No logs found.");
    } else {
        console.log("Recent Logs found:", data.length);
        data.forEach(log => {
            console.log(`[${new Date(log.created_at).toLocaleString()}] LogID: ${log.log_id} | OP_ID: ${log.operator_id} | SKU: ${log.sku} | Qty: ${log.output_qty}`);
        });
    }
}

listRecentLogs();
