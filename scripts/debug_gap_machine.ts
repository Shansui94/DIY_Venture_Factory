
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkGaps() {
    // Check Date: 2026-01-27
    const todayStart = '2026-01-26T16:00:00'; // UTC for 2026-01-27 00:00 MYT
    const todayEnd = '2026-01-27T16:00:00';   // UTC for 2026-01-27 24:00 MYT

    console.log("Checking gaps for 2026-01-27...");

    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('*')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        .order('created_at', { ascending: true });

    if (error) { console.error(error); return; }

    console.log(`Fetched ${logs?.length} logs.`);

    // Group logs by Machine
    const byMachine: Record<string, any[]> = {};
    logs?.forEach(l => {
        const mid = l.machine_id || l.job_id || 'Unknown';
        if (!byMachine[mid]) byMachine[mid] = [];
        byMachine[mid].push(l);
    });

    Object.keys(byMachine).forEach(mid => {
        console.log(`\n=== Analyzing Machine: ${mid} (${byMachine[mid].length} logs) ===`);
        const mLogs = byMachine[mid];

        // Scan for gaps > 2 mins
        for (let i = 1; i < mLogs.length; i++) {
            const prev = new Date(mLogs[i - 1].created_at);
            const curr = new Date(mLogs[i].created_at);
            const diffMins = (curr.getTime() - prev.getTime()) / 60000;

            if (diffMins > 2) {
                const localPrev = new Date(prev.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(11, 19);
                const localCurr = new Date(curr.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(11, 19);

                console.log(`⚠️ GAP ${diffMins.toFixed(1)}m: ${localPrev} -> ${localCurr}`);
            }
        }
    });
}

checkGaps();
