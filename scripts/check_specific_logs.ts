
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRange() {
    // User is in UTC+8
    // Target Start: 2026-01-26 01:30:00 (MYT)
    // Target End:   Now (approx 09:06 MYT)

    // Construct Date objects in Local Time context (simulated since server is UTC)
    // We can rely on ISO strings. 
    // 2026-01-26 01:30:00 +08:00 -> 2026-01-25 17:30:00 UTC

    // Target Start: 2026-01-26 10:00:00 (MYT) -> 02:00:00 UTC
    const startISO = '2026-01-26T02:00:00.000Z'; // 10:00 AM UTC+8
    const endISO = new Date().toISOString();

    console.log(`Checking logs from UTC: ${startISO} to ${endISO}`);
    console.log(`(This corresponds to 01:30 AM to Now in UTC+8)`);

    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('*')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    if (!logs || logs.length === 0) {
        console.log("❌ No logs found in this time range!");
        return;
    }

    console.log(`✅ Found ${logs.length} logs.`);
    console.log(`First Log: ${new Date(logs[0].created_at).toLocaleString('en-US', { timeZone: 'Asia/Singapore' })}`);
    console.log(`Last Log:  ${new Date(logs[logs.length - 1].created_at).toLocaleString('en-US', { timeZone: 'Asia/Singapore' })}`);

    // Check for Gaps
    console.log("\n--- Integrity Check (Gaps > 10 mins) ---");
    let gapFound = false;
    for (let i = 1; i < logs.length; i++) {
        const prev = new Date(logs[i - 1].created_at);
        const curr = new Date(logs[i].created_at);
        const diffMins = (curr.getTime() - prev.getTime()) / 60000;

        if (diffMins > 10) {
            gapFound = true;
            console.log(`⚠️ Gap of ${diffMins.toFixed(1)} mins`);
            console.log(`   From: ${prev.toLocaleString('en-US', { timeZone: 'Asia/Singapore' })}`);
            console.log(`   To:   ${curr.toLocaleString('en-US', { timeZone: 'Asia/Singapore' })}`);
        }
    }

    if (!gapFound) console.log("✅ Continuous production (No gaps > 10 mins).");
}

checkRange();
