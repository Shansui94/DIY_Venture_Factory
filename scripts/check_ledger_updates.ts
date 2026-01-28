
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkLedger() {
    console.log("Checking Stock Ledger vs Production Logs (Last 10 entries)...");

    // 1. Get last 10 logs
    const { data: logs, error: lErr } = await supabase
        .from('production_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (lErr) { console.error(lErr); return; }

    console.log(`\nLast 5 Production Logs:`);
    console.table(logs.slice(0, 5).map(l => ({
        id: l.id.substring(0, 8),
        time: new Date(l.created_at).toLocaleTimeString(),
        machine: l.machine_id,
        sku: l.product_sku
    })));

    // 2. Get last 10 ledger entries
    const { data: ledger, error: sErr } = await supabase
        .from('stock_ledger_v2')
        .select('*')
        .eq('event_type', 'Production')
        .order('timestamp', { ascending: false })
        .limit(10);

    if (sErr) { console.error(sErr); return; }

    console.log(`\nLast 5 Report Ledger Entries:`);
    console.table(ledger.slice(0, 5).map(l => ({
        txn: l.txn_id,
        time: new Date(l.timestamp).toLocaleTimeString(),
        sku: l.sku,
        qty: l.change_qty,
        ref: l.ref_doc ? l.ref_doc.substring(0, 8) : 'null'
    })));

    // Match them
    if (logs.length > 0 && ledger.length > 0) {
        // Compare timestamps or IDs?
        // Note: Logic adds triggers, so timestamps should be identical/close.
        const logId = logs[0].id;
        const match = ledger.find(l => l.ref_doc === logId);
        if (match) {
            console.log("\n✅ TRIGGER OK: Latest log found in Ledger.");
        } else {
            console.log("\n❌ TRIGGER FAIL: Latest log NOT found in Ledger.");
            if (!logs[0].product_sku) console.log("   Reason: Log has NO SKU (NULL). trigger enrich failed?");
        }
    }
}

checkLedger();
