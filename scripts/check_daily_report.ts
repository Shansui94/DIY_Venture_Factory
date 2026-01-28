
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function dailyReport() {
    let output = "";
    const log = (msg: string) => { console.log(msg); output += msg + "\n"; };

    log("📊 Generating Daily Report for Today (Start of Day ~ Now)...");

    // Jan 27 00:00 UTC+8 = Jan 26 16:00 UTC
    const start = '2026-01-26T16:00:00Z';
    const end = new Date().toISOString();

    log(`Checking Window: ${start} -> ${end}`);

    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true })
        .limit(5000);

    if (error) {
        log(`Error: ${error.message}`);
        fs.writeFileSync('daily_report_output.txt', output);
        return;
    }

    if (!logs || logs.length === 0) {
        log("❌ No logs found for today (Supabase returned empty array).");
        fs.writeFileSync('daily_report_output.txt', output);
        return;
    }

    // 1. Reboots (Count = 0)
    const reboots = logs.filter(l => l.alarm_count === 0);

    // 2. Production (Count > 0)
    const production = logs.filter(l => l.alarm_count > 0);
    const totalCount = production.length;
    const totalQty = production.reduce((sum, l) => sum + (l.alarm_count || 1), 0);

    // 3. Gaps
    const gaps: any[] = [];
    for (let i = 1; i < production.length; i++) {
        const prev = new Date(production[i - 1].created_at);
        const curr = new Date(production[i].created_at);
        const diffMins = (curr.getTime() - prev.getTime()) / 60000;
        if (diffMins > 10) {
            gaps.push({
                from: prev.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }),
                to: curr.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }),
                duration: diffMins.toFixed(1)
            });
        }
    }

    // 4. Last Seen
    const lastLog = logs[logs.length - 1];
    const lastSeen = new Date(lastLog.created_at);
    const reportTime = new Date();
    const minsAgo = (reportTime.getTime() - lastSeen.getTime()) / 60000;

    log(`\n--- SUMMARY ---`);
    log(`Total Logs: ${logs.length}`);
    log(`Valid Production Pulses: ${totalCount}`);
    log(`Total Quantity Produced: ${totalQty}`);
    log(`Last Seen: ${lastSeen.toLocaleString('en-US', { timeZone: 'Asia/Singapore' })} (${minsAgo.toFixed(1)} mins ago)`);
    log(`Status: ${minsAgo < 15 ? '🟢 ONLINE' : '🔴 OFFLINE'}`);

    log(`\n--- STABILITY ---`);
    if (reboots.length > 0) {
        log(`⚠️ REBOOTS DETECTED: ${reboots.length}`);
        reboots.forEach(r => log(`   - ${new Date(r.created_at).toLocaleString('en-US', { timeZone: 'Asia/Singapore' })}`));
    } else {
        log(`✅ Zero Reboots (System Stable)`);
    }

    log(`\n--- GAPS (>10m) ---`);
    if (gaps.length > 0) {
        gaps.forEach(g => log(`🔸 ${g.from} -> ${g.to} (${g.duration} mins)`));
    } else {
        log(`✅ Continuous Production (No Gaps)`);
    }

    fs.writeFileSync('daily_report_output.txt', output);
}

dailyReport();
