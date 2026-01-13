
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDualLane() {
    const machineId = 'T1.2-M01';
    console.log(`Testing Dual Lane Logic for ${machineId}...`);

    // 1. Setup Dual Configuration
    console.log("1. Setting up Dual Configuration (Left & Right)...");

    // Clear existing
    await supabase.from('machine_active_products').delete().eq('machine_id', machineId);

    // Set Left
    await supabase.from('machine_active_products').insert({
        machine_id: machineId,
        lane_id: 'Left',
        product_sku: 'TEST-SKU-LEFT-A'
    });

    // Set Right
    await supabase.from('machine_active_products').insert({
        machine_id: machineId,
        lane_id: 'Right',
        product_sku: 'TEST-SKU-RIGHT-B'
    });

    // 2. Simulate Signal from Firmware (only machine_id, count=2 default)
    console.log("2. Simulating Firmware Signal...");
    const { data: insertData, error: insertError } = await supabase
        .from('production_logs')
        .insert({
            machine_id: machineId,
            alarm_count: 2, // Firmware sends 2
            // product_sku is NULL/Omittted, Trigger should fill it
        })
        .select()
        .single();

    if (insertError) {
        console.error("Insert Failed:", insertError);
        return;
    }
    console.log("Original Insert ID:", insertData.id);

    // 3. Verify Results
    console.log("3. Verifying Logs (Wait 1s for Trigger)...");
    await new Promise(r => setTimeout(r, 1000));

    const { data: logs } = await supabase
        .from('production_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 5000).toISOString()) // Last 5 seconds
        .eq('machine_id', machineId);

    console.log("Recent Logs Found:", logs?.length);
    console.table(logs?.map(l => ({
        sku: l.product_sku,
        count: l.alarm_count,
        original_id: l.id === insertData.id ? 'YES' : 'NO'
    })));

    if (logs?.length === 2) {
        console.log("✅ SUCCESS: Signal split into two logs!");
    } else {
        console.log("❌ FAIL: Expected 2 logs.");
    }
}

testDualLane();
