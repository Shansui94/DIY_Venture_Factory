
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

async function analyzeFastProduction() {
    // Target yesterday: 2026-01-24
    const targetDate = '2026-01-24';
    console.log(`Analyzing Production Speed for ${targetDate}...`);

    // Fetch logs (Buffer: 2026-01-23 16:00 to 2026-01-25 10:00 UTC approximately for Jan 24 MYT)
    // To be safe, just fetch a wide range around the target date
    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('*')
        .gte('created_at', '2026-01-23T10:00:00')
        .lte('created_at', '2026-01-25T10:00:00')
        .order('created_at', { ascending: true })
        .limit(5000);

    if (error) {
        console.error("Error:", error);
        return;
    }

    // Filter to Target Date (User's Local Time: UTC+8)
    const targetLogs = logs.filter(l => {
        const date = new Date(l.created_at);
        const localTime = date.getTime() + (8 * 60 * 60 * 1000);
        const localDate = new Date(localTime);
        return localDate.toISOString().startsWith(targetDate);
    });

    console.log(`Found ${targetLogs.length} logs for ${targetDate}.`);

    if (targetLogs.length === 0) {
        console.log("No logs found.");
        return;
    }

    // Sort by time
    targetLogs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let exactFastCount = 0;
    let totalIntervals = 0;
    let minDiff = 9999;
    let maxDiff = 0;
    let totalDiff = 0;

    const buckets: Record<string, number> = {
        '< 1min': 0,
        '1-3 mins': 0,
        '3-4 mins': 0,
        '4-6 mins': 0,
        '> 6 mins': 0
    };

    // Analyze intervals
    for (let i = 1; i < targetLogs.length; i++) {
        const prev = new Date(targetLogs[i - 1].created_at);
        const curr = new Date(targetLogs[i].created_at);

        const diffMs = curr.getTime() - prev.getTime();
        const diffMins = diffMs / (1000 * 60);

        totalIntervals++;

        if (diffMins < 1) buckets['< 1min']++;
        else if (diffMins < 3) buckets['1-3 mins']++;
        else if (diffMins < 4) buckets['3-4 mins']++;
        else if (diffMins < 6) buckets['4-6 mins']++;
        else buckets['> 6 mins']++;

        if (diffMins < minDiff) minDiff = diffMins;
        if (diffMins > maxDiff) maxDiff = diffMins;
        totalDiff += diffMins;
    }

    console.log(`\n--- Interval Distribution (Proof of Error) ---`);
    console.table(buckets);

    console.log(`\n--- Logic Check ---`);
    console.log(`If real cycle > 4.5 mins, we should see NO intervals in '1-3 mins'.`);
    console.log(`Current Count in '1-3 mins': ${buckets['1-3 mins']}`);


    console.log(`\n--- Results for ${targetDate} ---`);
    console.log(`Total Intervals: ${totalIntervals}`);
    console.log(`\n⚡ < 5 Minutes Count: ${exactFastCount}`);
    console.log(`(This represents ${((exactFastCount / totalIntervals) * 100).toFixed(1)}% of production cycles)`);

    if (totalIntervals > 0) {
        console.log(`\nAvg Interval: ${(totalDiff / totalIntervals).toFixed(2)} mins`);
        console.log(`Min Interval: ${minDiff.toFixed(2)} mins`);
        console.log(`Max Interval: ${maxDiff.toFixed(2)} mins`);
    }
}

analyzeFastProduction();
