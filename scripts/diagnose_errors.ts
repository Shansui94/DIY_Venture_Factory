
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), debug: false });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function diagnose() {
    console.log("--- DIAGNOSTIC START ---");

    // 1. Check T1.2-M01 existence
    const { data: mData, error: mErr } = await supabase
        .from('machines')
        .select('*')
        .eq('id', 'T1.2-M01');

    if (mErr || !mData || mData.length === 0) {
        console.log("❌ CRITICAL: Machine T1.2-M01 NOT FOUND in DB. This causes 409 FK Error.");
        if (mErr) console.log("Error:", mErr.message);
    } else {
        console.log("✅ Machine T1.2-M01 Exists.", mData[0]);
    }

    // 2. Check UNKNOWN SKU existence
    const { data: sData, error: sErr } = await supabase
        .from('master_items_v2')
        .select('*')
        .eq('sku', 'UNKNOWN');

    if (sErr || !sData || sData.length === 0) {
        console.log("❌ CRITICAL: SKU 'UNKNOWN' NOT FOUND. This causes 409 FK Error.");
    } else {
        console.log("✅ SKU 'UNKNOWN' Exists.");
    }

    // 3. Check T1.3-M03 Config (Why +2?)
    // Find what product T1.3-M03 is linked to.
    const { data: m3Data } = await supabase.from('machines').select('*').eq('id', 'T1.3-M03').single();
    if (m3Data) {
        console.log("T1.3-M03 Config:", m3Data);
        // If there's an active_sku field
    }

    // 4. Check if we can Insert a Test Log for T1.2-M01
    console.log("--- SIMULATING INSERT FOR T1.2-M01 ---");
    const { data: insData, error: insErr } = await supabase
        .from('production_logs')
        .insert({
            machine_id: 'T1.2-M01',
            alarm_count: 2,
            created_at: new Date().toISOString(),
            // product_sku: 'UNKNOWN' // Try explicit UNKNOWN
        })
        .select();

    if (insErr) {
        console.log("❌ INSERT FAILED:", insErr.code, insErr.message);
    } else {
        console.log("✅ INSERT SUCCESS:", insData);
    }
}

diagnose();
