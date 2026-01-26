
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

async function checkLiveStatus() {
    console.log("Checking Live Status (Last 24 Hours)...");

    // Fetch distinct machine IDs (or just fetch recent logs and aggregate)
    // We'll fetch last 100 logs.
    const { data, error } = await supabase
        .from('production_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No logs found recently.");
        return;
    }

    const report: Record<string, { lastSeen: string, countLast100: number, sku: string }> = {};

    data.forEach(log => {
        const mid = log.machine_id || 'Unknown';
        if (!report[mid]) {
            report[mid] = { lastSeen: log.created_at, countLast100: 0, sku: log.product_sku || 'N/A' };
        }
        report[mid].countLast100++;
    });

    console.log("--- RAW REPORT ---");
    console.log(JSON.stringify(Object.entries(report).map(([id, stats]) => {
        const date = new Date(stats.lastSeen);
        const localTime = new Date(date.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(11, 19);
        const diffMins = (Date.now() - date.getTime()) / 60000;
        return {
            Machine: id,
            Status: diffMins < 15 ? "ONLINE" : `OFFLINE (${Math.floor(diffMins)}m ago)`,
            Last_Seen: localTime,
            Count: stats.countLast100
        };
    }), null, 2));
}

checkLiveStatus();
