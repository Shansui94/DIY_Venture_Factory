
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function verifySplit() {
    console.log("Checking for Dual Lane Split behavior...");

    // Get latest log
    const { data: logs, error: lErr } = await supabase
        .from('production_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (!logs || logs.length === 0) { console.log("No logs."); return; }

    const log = logs[0];
    console.log(`Latest Log: Count=${log.alarm_count}, Machine=${log.machine_id}`);

    // Get ledger entries for this log
    const { data: ledger, error: sErr } = await supabase
        .from('stock_ledger_v2')
        .select('*')
        .eq('ref_doc', log.id);

    if (!ledger) { console.log("No ledger entries found."); return; }

    console.log(`Ledger Entries Found: ${ledger.length}`);
    ledger.forEach(l => console.log(` - SKU: ${l.sku}, Qty: ${l.change_qty}`));

    if (ledger.length > 1) {
        console.log("✅ SUCCESS: Log was split into multiple ledger entries!");
    } else if (ledger.length === 1) {
        console.log("ℹ️ Single Entry. (Single lane or 1 product config?)");
    }
}

verifySplit();
