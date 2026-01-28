
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CHECK_INTERVAL_MS = 60 * 1000; // Check every 1 minute
const GAP_THRESHOLD_MINS = 10;
const OFFLINE_THRESHOLD_MINS = 5;

// Machine ID to monitor
const TARGET_MACHINE = 'T1.2-M01';

console.log(`\n🤖 FACTORY MONITOR AGENT ACTIVE`);
console.log(`   Target: ${TARGET_MACHINE}`);
console.log(`   Scanning every ${CHECK_INTERVAL_MS / 1000}s...`);
console.log(`   (Press Ctrl+C to stop)\n`);

async function runCheck() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Singapore', hour12: false });

    // 1. Fetch recent logs (last 30 mins)
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60000).toISOString();

    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('*')
        .eq('machine_id', TARGET_MACHINE)
        .gte('created_at', thirtyMinsAgo)
        .order('created_at', { ascending: true });

    if (error) {
        console.error(`[${timeStr}] ⚠️ DB Error: ${error.message}`);
        return;
    }

    if (!logs || logs.length === 0) {
        console.log(`[${timeStr}] 🔴 CRITICAL: No data in last 30 mins! Machine OFF?`);
        return;
    }

    const lastLog = logs[logs.length - 1];
    const lastSeenTime = new Date(lastLog.created_at);
    const minsSinceLast = (now.getTime() - lastSeenTime.getTime()) / 60000;

    // STATUS ANALYSIS
    let status = "🟢 HEALTHY";
    let alerts: string[] = [];

    // Check 1: Online Status
    if (minsSinceLast > OFFLINE_THRESHOLD_MINS) {
        status = "🔴 OFFLINE";
        alerts.push(`Last seen ${minsSinceLast.toFixed(1)}m ago`);
    }

    // Check 2: Reboots (Boot Signal 0)
    const reboots = logs.filter(l => l.alarm_count === 0);
    if (reboots.length > 0) {
        status = "⚠️ UNSTABLE";
        alerts.push(`Detected ${reboots.length} reboots in last 30m`);
    }

    // Check 3: Gaps in the stream
    // Only check gaps between logs in the fetched window
    for (let i = 1; i < logs.length; i++) {
        const t1 = new Date(logs[i - 1].created_at).getTime();
        const t2 = new Date(logs[i].created_at).getTime();
        const gap = (t2 - t1) / 60000;
        if (gap > GAP_THRESHOLD_MINS) {
            status = "⚠️ GAP DETECTED";
            alerts.push(`Gap of ${gap.toFixed(1)}m at ${new Date(logs[i - 1].created_at).toLocaleTimeString('en-US', { timeZone: 'Asia/Singapore' })}`);
        }
    }

    // OUTPUT
    if (status === "🟢 HEALTHY") {
        // Heartbeat log (only every 10 mins to avoid spam, or just single line overwrite?)
        // Let's just print simple status
        console.log(`[${timeStr}] 🟢 ONLINE | Logs: ${logs.length} | Last: ${minsSinceLast.toFixed(1)}m ago`);
    } else {
        console.log(`[${timeStr}] ${status} | ${alerts.join(', ')}`);
    }
}

// Initial run
runCheck();

// Loop
setInterval(runCheck, CHECK_INTERVAL_MS);
