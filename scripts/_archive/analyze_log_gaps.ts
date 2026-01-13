
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Analyzing logs for T1.2-M01 on ${today}...`);

    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('created_at')
        .eq('machine_id', 'T1.2-M01')
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    if (!logs || logs.length < 2) {
        console.log('Not enough logs to analyze.');
        return;
    }

    let gapCount = 0;
    const thresholdMinutes = 8; // If gap > 8 mins, assume a missed cycle (since cycle is ~5 mins)

    console.log('\n--- Gap Analysis ---');
    for (let i = 1; i < logs.length; i++) {
        const prev = new Date(logs[i - 1].created_at);
        const curr = new Date(logs[i].created_at);
        const diffMs = curr.getTime() - prev.getTime();
        const diffMins = diffMs / 60000;

        // Ignore very small gaps (dual lane entries)
        if (diffMs < 1000) continue;

        if (diffMins > thresholdMinutes) {
            gapCount++;
            console.log(`⚠️ Gap Detected: ${prev.toLocaleTimeString()} -> ${curr.toLocaleTimeString()} (${diffMins.toFixed(1)} mins)`);
        }
    }

    console.log('\n----------------------');
    console.log(`Total "Missed Cycle" Events Detected: ${gapCount}`);
}

main();
