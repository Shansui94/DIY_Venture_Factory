
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

async function analyze() {
    console.log("Analyze Production Data (Last 30 Days)...");

    // Calculate Date Range
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Fetch All Logs (Looping to bypass limits)
    let allLogs: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('production_logs')
            .select('*') // Use * to safely get whatever columns exist
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error("Fetch error:", error);
            break;
        }

        if (data && data.length > 0) {
            allLogs = [...allLogs, ...data];
            if (data.length < pageSize) hasMore = false;
            else page++;
        } else {
            hasMore = false;
        }
        process.stdout.write(`\rFetched ${allLogs.length} logs...`);
    }
    console.log("\nDone fetching.");

    // --- ANALYSIS ---
    const dailyCounts: Record<string, number> = {};
    const daySet = new Set<string>();

    allLogs.forEach(log => {
        const date = log.created_at.split('T')[0];
        // 'alarm_count' seems to be the quantity field based on ReportHistory.tsx
        // But in some contexts it implies "alarms"? 
        // ReportHistory.tsx says: Output_Qty: log.alarm_count || 1
        const qty = Number(log.alarm_count) || 1;

        dailyCounts[date] = (dailyCounts[date] || 0) + qty;
        daySet.add(date);
    });

    // 1. Check Daily Trends
    console.log("\n--- Daily Production Totals ---");
    const sortedDates = Array.from(daySet).sort().reverse();
    const values: number[] = [];

    console.table(sortedDates.map(date => {
        const count = dailyCounts[date];
        values.push(count);
        return { Date: date, 'Total Sets': count };
    }));

    // 2. Statistics
    if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        console.log("\n--- Statistics ---");
        console.log(`Average Daily: ${avg.toFixed(0)}`);
        console.log(`Max Daily: ${max}`);
        console.log(`Min Daily: ${min}`);

        // 3. Anomalies
        console.log("\n--- Anomalies Detected ---");
        let found = false;

        // Low Production Days (< 50% of average)
        sortedDates.forEach(date => {
            const count = dailyCounts[date];
            if (count < avg * 0.5) {
                console.warn(`⚠️  Low Production on ${date}: ${count} (Avg: ${avg.toFixed(0)})`);
                found = true;
            }
        });

        // 4. Check Missing Dates
        // Iterate from 30 days ago to today
        let curr = new Date(thirtyDaysAgo);
        const now = new Date();
        while (curr <= now) {
            const dStr = curr.toISOString().split('T')[0];
            if (!daySet.has(dStr)) {
                // Ignore today if it just started? No, check all.
                // Ignore future dates
                if (curr < new Date(now.setHours(0, 0, 0, 0))) {
                    console.warn(`❌ MISSING DATA for Date: ${dStr}`);
                    found = true;
                }
            }
            curr.setDate(curr.getDate() + 1);
        }

        if (!found) console.log("✅ No significant anomalies found.");
    } else {
        console.log("No data found in range.");
    }
}

analyze();
