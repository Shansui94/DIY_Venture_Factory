
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkGaps() {
    // Check Date: Observation Period (2026-01-27 12:00 PM - Now)
    // Local Time: 2026-01-27 12:00 -> 2026-01-28 09:40
    // UTC Time:   2026-01-27 04:00 -> 2026-01-28 01:40

    const todayStart = '2026-01-27T04:00:00';
    const todayEnd = new Date().toISOString();

    console.log(`Checking major gaps (>10m) for Observation Period...`);

    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('*')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        .order('created_at', { ascending: true });

    if (error) { console.error(error); return; }

    // Group logs by Machine
    const byMachine: Record<string, any[]> = {};
    logs?.forEach(l => {
        const mid = l.machine_id || l.job_id || 'Unknown';
        if (!byMachine[mid]) byMachine[mid] = [];
        byMachine[mid].push(l);
    });

    const machines = Object.keys(byMachine);
    console.log(`Found machines: ${machines.join(', ')}`);

    machines.forEach(mid => {
        const mLogs = byMachine[mid];
        console.log(`\n=== Machine: ${mid} (${mLogs.length} logs) ===`);

        if (mLogs.length < 2) {
            console.log("Not enough data to calculate gaps.");
            return;
        }

        let gapsFound = 0;
        // Scan for gaps > 10 mins (ignoring the 5m heartbeat)
        for (let i = 1; i < mLogs.length; i++) {
            const prev = new Date(mLogs[i - 1].created_at);
            const curr = new Date(mLogs[i].created_at);
            const diffMins = (curr.getTime() - prev.getTime()) / 60000;

            if (diffMins > 10) {
                gapsFound++;
                const localPrev = new Date(prev.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(11, 19);
                const localCurr = new Date(curr.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(11, 19);

                console.log(`🔴 GAP ${diffMins.toFixed(0)} mins: ${localPrev} -> ${localCurr}`);
            }
        }
        if (gapsFound === 0) console.log("✅ No major gaps (>10m) found.");
    });
}

checkGaps();
