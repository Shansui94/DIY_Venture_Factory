
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("Checking for 'Malformed' or 'Raw' logs (Channel/Trigger Failures)...");

    // 1. Check for Raw Firmware Logs (Trigger didn't run/split)
    // Firmware sends alarm_count: 2. Trigger splits into 1+1.
    // If we see '2', the trigger failed.
    const { data: rawLogs, error: err1 } = await supabase
        .from('production_logs')
        .select('*')
        .eq('alarm_count', 2)
        .eq('machine_id', 'T1.2-M01')
        .order('created_at', { ascending: false })
        .limit(10);

    // 2. Check for NULL/Unknown SKUs
    const { data: nullSkuLogs, error: err2 } = await supabase
        .from('production_logs')
        .select('*')
        .or('product_sku.is.null,product_sku.eq.UNKNOWN')
        .eq('machine_id', 'T1.2-M01')
        .order('created_at', { ascending: false })
        .limit(10);

    console.log('--- Results ---');

    if (rawLogs && rawLogs.length > 0) {
        console.log(`⚠️ FOUND ${rawLogs.length} RAW LOGS (Alarm Count = 2). Trigger might be failing!`);
        console.table(rawLogs);
    } else {
        console.log('✅ No Raw Logs found (All successfully processed by Trigger).');
    }

    if (nullSkuLogs && nullSkuLogs.length > 0) {
        console.log(`⚠️ FOUND ${nullSkuLogs.length} LOGS WITH MISSING SKU.`);
        console.table(nullSkuLogs);
    } else {
        console.log('✅ No Logs with Missing/Unknown SKU found.');
    }

    if ((!rawLogs || rawLogs.length === 0) && (!nullSkuLogs || nullSkuLogs.length === 0)) {
        console.log('\nCONCLUSION: Database looks clean. The missing logs validly NEVER reached the database.');
    }
}

main();
