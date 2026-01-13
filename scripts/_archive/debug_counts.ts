
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use Service Role for full access
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Checking logs for Today (UTC): ${today}`);

    // 1. Total Count (Rows)
    const { count, error } = await supabase
        .from('production_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

    if (error) {
        console.error("Error:", error);
        return;
    }

    // 1b. Total SUM (alarm_count)
    // Supabase JS doesn't have a direct .sum() helper easily on 'select', we might need to fetch and reduce if not using RPC.
    // For 300 rows it's fine to fetch all.
    const { data: allLogs } = await supabase
        .from('production_logs')
        .select('alarm_count')
        .gte('created_at', today);

    const validLogs = allLogs || [];
    const totalSum = validLogs.reduce((acc, curr) => acc + (curr.alarm_count || 1), 0);

    console.log(`\nRow Count: ${count}`);
    console.log(`Sum of Alarm Count: ${totalSum}`);

    // 2. Breakdown by Machine
    const { data: logs } = await supabase
        .from('production_logs')
        .select('machine_id, created_at')
        .gte('created_at', today);

    if (logs) {
        const breakdown: Record<string, number> = {};
        logs.forEach(l => {
            breakdown[l.machine_id] = (breakdown[l.machine_id] || 0) + 1;
        });
        console.log("\nBreakdown by Machine:");
        console.table(breakdown);

        // 3. Time Range
        const times = logs.map(l => new Date(l.created_at).getTime());
        const minTime = new Date(Math.min(...times)).toISOString();
        const maxTime = new Date(Math.max(...times)).toISOString();
        console.log(`\nTime Range: ${minTime} to ${maxTime}`);
    }
}

main();
