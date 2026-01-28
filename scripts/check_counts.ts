
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("❌ Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const tables = [
    'sales_orders',
    'sales_order_items',
    'master_items_v2',
    'bom_headers_v2',
    'bom_items_v2',
    'stock_ledger_v2',
    'production_logs_v2'
];

async function check() {
    console.log("📊 Checking Table Rows:");
    for (const t of tables) {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        if (error) console.log(`${t}: Error - ${error.message}`);
        else console.log(`${t}: ${count} rows`);
    }
}
check();
