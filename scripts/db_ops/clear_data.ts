import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Key");
    process.exit(1);
}

// Try to use service key if available for bypassing RLS
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || supabaseKey;
const supabase = createClient(supabaseUrl, serviceKey);

async function clearTable(tableName: string) {
    let pk = 'id';
    // Dummy value to match "NOT equal to this". 
    // For UUIDs: 00000000-0000-0000-0000-000000000000
    // For Strings: '$$$IMPOSSIBLE$$$'
    let val = '00000000-0000-0000-0000-000000000000';

    if (tableName === 'stock_ledger_v2') pk = 'txn_id';
    else if (tableName === 'logistics_deliveries_v2') pk = 'delivery_id';
    else if (tableName === 'production_logs_v2') pk = 'log_id';
    else if (tableName === 'production_logs') pk = 'id';
    else if (tableName === 'sales_orders_v2') { pk = 'order_id'; val = '$$$'; }
    else if (tableName === 'production_orders_v2') { pk = 'job_id'; val = '$$$'; }
    else if (tableName === 'sys_machines_v2') { pk = 'machine_id'; val = '$$$'; }
    else if (tableName === 'machines') { pk = 'id'; } // Legacy machines usually has id or we check schema.
    else if (tableName === 'sys_factories_v2') { pk = 'factory_id'; val = '$$$'; }
    else if (tableName === 'sys_locations_v2') { pk = 'loc_id'; val = '$$$'; }
    else if (tableName === 'sys_vehicles_v2') { pk = 'vehicle_id'; val = '$$$'; }
    else if (tableName === 'crm_partners_v2') { pk = 'partner_id'; val = '$$$'; }
    else if (tableName === 'master_items_v2') { pk = 'sku'; val = '$$$'; }
    else if (tableName === 'items') { pk = 'id'; } // Legacy items might be id or name? diagnose script used count(*)
    else if (tableName === 'bom_headers_v2') pk = 'recipe_id';

    // items table in legacy might use different PK. 'items' usually has 'id' bigint or uuid.
    // If we get an error on 'items', we'll know.

    process.stdout.write(`Clearing ${tableName}... `);

    // Attempt delete
    const { error, count } = await supabase.from(tableName).delete().neq(pk, val).select('*', { count: 'exact', head: true });

    if (error) {
        if (error.code === '42P01') {
            console.log(`Skipped (Not Found)`);
        } else if (error.code === '42703') {
            console.log(`❌ Failed (Column '${pk}' mismatch) - ${error.message}`);
        } else {
            console.error(`❌ Failed: ${error.message} (${error.code})`);
        }
    } else {
        // Verify emptiness
        const { count: remaining } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
        if (remaining && remaining > 0) {
            console.log(`⚠️  Done, but ${remaining} rows remain (Check RLS).`);
        } else {
            console.log(`✅ Cleared.`);
        }
    }
}

async function clearAll() {
    console.log("⚠️  STARTING FULL DATABASE CLEAR (EXCEPT USERS) ⚠️");

    // DELETE ORDER (Children first)
    await clearTable('stock_ledger_v2');
    await clearTable('delivery_items_v2');
    await clearTable('logistics_deliveries_v2');
    await clearTable('production_logs_v2');
    await clearTable('production_logs'); // Legacy

    await clearTable('sales_order_items_v2');
    await clearTable('production_orders_v2'); // Jobs
    await clearTable('sales_orders_v2');

    await clearTable('bom_items_v2');
    await clearTable('bom_headers_v2');
    await clearTable('recipes'); // Legacy

    await clearTable('sys_locations_v2');
    await clearTable('sys_machines_v2');
    await clearTable('machines'); // Legacy
    await clearTable('sys_vehicles_v2');
    await clearTable('sys_factories_v2');

    await clearTable('crm_price_lists_v2');
    await clearTable('crm_partners_v2');
    await clearTable('master_items_v2');
    await clearTable('items'); // Legacy

    console.log("🎉 Database clear process finished.");
}

clearAll();
