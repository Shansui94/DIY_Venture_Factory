
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    // Get Today's Date in Local Time (assume server run in local or handle UTC)
    // The user context says it's 2026-01-10 approx 10:41 AM
    // We'll search >= 2026-01-10 00:00:00

    // Note: Database is usually UTC. Local 10:41 AM = UTC 02:41 AM.
    // So we fetch logs > 2026-01-09 16:00:00 UTC (which is 2026-01-10 00:00:00 Local)

    // Simplest is to just ask for logs > 2026-01-09T16:00:00Z
    const startOfTodayUTC = '2026-01-09T16:00:00.000Z';

    console.log(`Checking logs since 2026-01-10 00:00:00 Local (UTC ${startOfTodayUTC})...`);

    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('*')
        .eq('machine_id', 'T1.2-M01')
        .gte('created_at', startOfTodayUTC)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!logs || logs.length === 0) {
        console.log('No logs found for today.');
        return;
    }

    console.log(`Found ${logs.length} logs.`);

    // Analysis
    let totalQty = 0;
    const skuBreakdown: Record<string, number> = {};
    let gapCount = 0;
    const thresholdMinutes = 8;

    logs.forEach((log, index) => {
        totalQty += (log.alarm_count || 1);

        // SKU Breakdown
        const sku = log.product_sku || 'UNKNOWN';
        skuBreakdown[sku] = (skuBreakdown[sku] || 0) + (log.alarm_count || 1);

        // Gap Analysis (skip first log)
        if (index > 0) {
            const prev = new Date(logs[index - 1].created_at);
            const curr = new Date(log.created_at);
            const diffMs = curr.getTime() - prev.getTime();
            // Ignore small diffs (dual lane inserts happen same second)
            if (diffMs > 1000) {
                const diffMins = diffMs / 60000;
                if (diffMins > thresholdMinutes) {
                    console.log(`⚠️ Gap: ${prev.toLocaleTimeString()} -> ${curr.toLocaleTimeString()} (${diffMins.toFixed(1)} mins)`);
                    gapCount++;
                }
            }
        }
    });

    console.log('\n--- Summary ---');
    console.log(`Total Quantity: ${totalQty}`);
    console.log('Breakdown:', skuBreakdown);
    console.log(`Missed Cycles (Gaps > 8m): ${gapCount}`);

    // Show last 5 logs for spot check
    console.log('\n--- Latest 5 Logs ---');
    console.table(logs.slice(-5).map(l => ({
        time: new Date(l.created_at).toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }),
        sku: l.product_sku,
        qty: l.alarm_count
    })));
}

main();
