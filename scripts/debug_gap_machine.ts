
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkGaps() {
    // Times reported by user (assuming Local Time ~UTC+8, but let's check UTC too)
    // 02:26:30 - 02:36:28
    // 06:00:57 - 06:10:50
    // 15:14:18 - 15:24:16
    // 16:49:04 - 16:59:04

    // We'll query a wide range covering today (2026-01-23 or 24?)
    // User time seems to be "Today". Local time is 2026-01-24 10:35.
    // So 02:26 etc refers to Jan 24th? Or Jan 23rd?
    // Let's check the last 24h.

    console.log("Checking logs around reported gap times...");

    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(2000); // Fetch recent 2000 logs

    if (error) { console.error(error); return; }

    // Group logs by Machine
    const byMachine: Record<string, any[]> = {};
    logs?.forEach(l => {
        const mid = l.machine_id;
        if (!byMachine[mid]) byMachine[mid] = [];
        byMachine[mid].push(l);
    });

    Object.keys(byMachine).forEach(mid => {
        console.log(`\nAnalyzing Machine: ${mid} (${byMachine[mid].length} logs)`);
        const mLogs = byMachine[mid];

        // Scan for gaps > 9 mins
        for (let i = 1; i < mLogs.length; i++) {
            const prev = new Date(mLogs[i - 1].created_at);
            const curr = new Date(mLogs[i].created_at);
            const diffMins = (curr.getTime() - prev.getTime()) / 60000;

            if (diffMins > 9 && diffMins < 12) { // Focus on ~10 min gaps
                const localPrev = new Date(prev.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(11, 19);
                const localCurr = new Date(curr.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').substring(11, 19);

                console.log(`⚠️ GAP ${diffMins.toFixed(1)}m: ${localPrev} -> ${localCurr}`);
            }
        }
    });
}

checkGaps();
