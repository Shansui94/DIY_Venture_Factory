
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

async function analyzeGaps() {
    const targetDate = '2026-01-26';
    console.log(`Analyzing Time Gaps for ${targetDate}...`);

    // Fetch logs for the specific day (UTC)
    // Assuming local time ~UTC+8, but let's just grab the whole 24h block in UTC that covers it.
    // Or just simple string matching if we assume ISO format.
    // Let's grab ample buffer: 2026-01-20T16:00:00Z to 2026-01-21T16:00:00Z (which is Jan 21 00:00-24:00 MYT)
    // Actually, let's just grab by string containment or a wide range and filter in JS to be safe about timezones.

    // Easier: Fetch all logs, filter by local date string in JS.

    // Fetch logs (using pagination just in case, though 570 fits in one page)
    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('*')
        .gte('created_at', '2026-01-25T10:00:00') // Updated buffer for Jan 26
        .lte('created_at', '2026-01-27T10:00:00') // Updated buffer
        .order('created_at', { ascending: true })
        .limit(2000);

    if (error) {
        console.error("Error:", error);
        return;
    }

    // Filter to Target Date (Machine Time / Local Time)
    // We'll rely on the default JS Date parsing which usually handles browser/system locale, 
    // but in Node it might be UTC. Let's explicitly check for the date string "2026-01-21"

    const targetLogs = logs.filter(l => {
        // Adjust to approximate local time (e.g. UTC+8) if needed, 
        // OR simply check if the day part matches.
        // Let's print the first timestamp to see the format.
        // 2026-01-21T01:00:00...
        const d = new Date(l.created_at);
        // We will assume the User's "Jan 21" means the logs that *look* like Jan 21 locally.
        // Let's use getOurs or manually add offset.
        // 570 logs suggests a full day.

        // Simpler: Just map to ISO date part and check if it matches '2026-01-21'
        // But timestamps are usually UTC in DB.
        // 2026-01-21 00:00 MYT = 2026-01-20 16:00 UTC.
        // 2026-01-21 23:59 MYT = 2026-01-21 15:59 UTC.

        // Let's convert to "Local String" assuming the user wants to see their local time.
        // But Node server time might be different. 
        // Let's try to infer from the distribution.

        return true;
    }).filter(l => {
        // Crudely approximate: check if '2026-01-21' appears in the ISO string 
        // OR if it falls in the calculated range.
        // Let's try to match exactly '2026-01-21' in the string for simplicity,
        // but that ignores timezone shift. 

        // Better: Use a timezone offset of +8 (Malaysia/China common)
        const date = new Date(l.created_at);
        const localTime = date.getTime() + (8 * 60 * 60 * 1000);
        const localDate = new Date(localTime);
        return localDate.toISOString().startsWith(targetDate);
    });

    console.log(`Found ${targetLogs.length} logs for ${targetDate} (Assumed UTC+8).`);

    if (targetLogs.length === 0) {
        console.log("No logs found. Try adjusting query range.");
        return;
    }

    // Sort
    targetLogs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    console.log(`First Log: ${new Date(targetLogs[0].created_at).toISOString().replace('T', ' ').substring(0, 19)} (UTC)`);
    console.log(`Last Log:  ${new Date(targetLogs[targetLogs.length - 1].created_at).toISOString().replace('T', ' ').substring(0, 19)} (UTC)`);

    // Gaps Analysis
    console.log("\n--- TIME GAPS (> 5 mins) ---");
    let gapFound = false;

    for (let i = 1; i < targetLogs.length; i++) {
        const prev = new Date(targetLogs[i - 1].created_at);
        const curr = new Date(targetLogs[i].created_at);

        const diffMs = curr.getTime() - prev.getTime();
        const diffMins = diffMs / (1000 * 60);

        if (diffMins > 5) {
            gapFound = true;
            console.log(`🔻 GAP: ${diffMins.toFixed(1)} mins`);
            console.log(`   From: ${convertToLocal(prev)}`);
            console.log(`   To:   ${convertToLocal(curr)}`);
        }
    }

    if (!gapFound) console.log("✅ No specific gaps > 5 mins found during production time.");

    // Hourly Breakdown
    console.log("\n--- Hourly Production (UTC+8) ---");
    const hourly: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourly[i] = 0;

    targetLogs.forEach(l => {
        const date = new Date(l.created_at);
        const localTime = date.getTime() + (8 * 60 * 60 * 1000);
        const h = new Date(localTime).getUTCHours();
        hourly[h] = (hourly[h] || 0) + 1;
    });

    console.table(hourly);
}

function convertToLocal(date: Date) {
    // Add 8 hours manually for display
    const localTime = date.getTime() + (8 * 60 * 60 * 1000);
    return new Date(localTime).toISOString().replace('T', ' ').substring(11, 19);
}

analyzeGaps();
