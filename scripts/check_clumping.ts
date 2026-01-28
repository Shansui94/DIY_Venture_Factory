
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkClumping() {
    // Gap reported: 19:20 - 19:50 (UTC+8)
    // UTC Time: 11:20 - 11:50
    // Check logs from 11:50 to 12:00 UTC (19:50 - 20:00 UTC+8)

    const start = '2026-01-26T11:45:00Z';
    const end = '2026-01-26T12:00:00Z';

    console.log(`Checking logs around 19:45 - 20:00 UTC+8 (After gap)...`);

    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true });

    if (error) { console.error(error); return; }

    if (!logs || logs.length === 0) {
        console.log("❌ No logs found in this recovery window (Supabase returned empty). Gap confirmed real?");
        return;
    }

    console.log(`Found ${logs.length} logs.`);
    console.table(logs.map(l => ({
        time: new Date(l.created_at).toLocaleTimeString('en-US', { timeZone: 'Asia/Singapore', hour12: false }),
        count: l.alarm_count
    })));

    // Analyze density
    // If we see many logs within same second or minute
    let clumpCount = 0;
    for (let i = 1; i < logs.length; i++) {
        const t1 = new Date(logs[i - 1].created_at).getTime();
        const t2 = new Date(logs[i].created_at).getTime();
        if ((t2 - t1) < 2000) { // Less than 2 seconds apart
            clumpCount++;
        }
    }

    if (clumpCount > 3) {
        console.log(`🔥 HIGH DENSITY DETECTED: ${clumpCount} logs are <2s apart.`);
        console.log("Conclusion: Data was buffered and uploaded in a burst (Timestamps are upload-time, not event-time).");
        console.log("Status: DATA SAVED, TIMING INACCURATE.");
    } else {
        console.log("Logs seem evenly spaced. Data was likely truly missing during the gap.");
    }
}

checkClumping();
