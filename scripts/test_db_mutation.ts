
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
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

async function runSql() {
    console.log("Running SQL inspection...");
    // Since we can't run RAW SQL via JS client easily without RLS bypass or RPC, 
    // we will use the `rpc` call if a specialized exec function exists, 
    // OR just use the inspection schema query directly via the JS client helpers?
    // Actually, we can just query the tables directly.

    // 1. Get Triggers
    const { data: triggers, error: tErr } = await supabase
        .rpc('get_triggers_on_table', { table_name: 'production_logs' });

    // Oh wait, standard user likely doesn't have permissions to view information_schema via API unless exposed.
    // Let's try to infer from behavior:
    // Insert a dummy row (Machine TEST) with count 1 and see what happens?

    console.log("Testing Insert Behavior...");
    const testId = `TEST-PROBE-${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
        .from('production_logs')
        .insert({
            machine_id: 'T1.3-M03', // Use the REAL machine ID to trigger machine-specific logic if any
            alarm_count: 1, // WE SEND 1
            // product_sku: 'TEST_PROBE', // Do NOT send SKU, let DB default logic trigger
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (insertError) {
        console.error("Insert Failed:", insertError);
    } else {
        console.log("Insert Success. Sent 1, Received:", insertData.alarm_count);
        if (insertData.alarm_count !== 1) {
            console.error("🚨 ALERT: Database mutated the count from 1 to " + insertData.alarm_count);
        } else {
            console.log("✅ Database preserved the count 1. The issue is definitely CLIENT-SIDE (Firmware).");
        }
    }
}

runSql();
