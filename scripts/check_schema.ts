
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkSchema() {
    console.log("Checking table columns...");

    // Check production_logs
    const { data: logs, error: err1 } = await supabase.from('production_logs').select('*').limit(1);
    console.log("Production Logs Sample:", logs && logs.length > 0 ? Object.keys(logs[0]) : "Empty/Error");

    // Check machine_active_products
    const { data: map, error: err2 } = await supabase.from('machine_active_products').select('*').limit(1);
    console.log("Machine Active Products Sample:", map && map.length > 0 ? Object.keys(map[0]) : "Empty/Error");

    // Check stock_ledger_v2
    const { data: ledger, error: err3 } = await supabase.from('stock_ledger_v2').select('*').limit(1);
    console.log("Stock Ledger Sample:", ledger && ledger.length > 0 ? Object.keys(ledger[0]) : "Empty/Error");
}

checkSchema();
