import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function cleanup() {
    console.log('--- START ROBUST CLEANUP ---');

    // 1. Rename T1.3-M03 -> T1.3-M02
    console.log('Renaming T1.3-M03 to T1.3-M02...');

    // Upsert the new ID first
    const { error: insErr } = await supabase.from('sys_machines_v2').upsert({
        machine_id: 'T1.3-M02',
        name: '1M Single Layer (T1.3)',
        base_width: 100
    });
    if (insErr) console.error('Error inserting T1.3-M02:', insErr.message);

    // Update references
    const tables = ['machine_active_products', 'production_logs', 'iot_device_configs'];
    for (const table of tables) {
        const { error: updErr } = await supabase.from(table)
            .update({ machine_id: 'T1.3-M02' })
            .eq('machine_id', 'T1.3-M03');
        if (updErr) console.error(`Error updating ${table}:`, updErr.message);
        else console.log(`Updated ${table} successfully.`);
    }

    // Delete old ID
    const { error: delErr } = await supabase.from('sys_machines_v2')
        .delete()
        .eq('machine_id', 'T1.3-M03');
    if (delErr) console.error('Error deleting T1.3-M03:', delErr.message);

    // 2. Clean up UNKNOWN SKUs
    console.log('Purging UNKNOWN SKUs...');
    const skuTables = ['machine_active_products', 'production_logs'];
    for (const table of skuTables) {
        const { error: purge1 } = await supabase.from(table).delete().eq('product_sku', 'UNKNOWN');
        const { error: purge2 } = await supabase.from(table).delete().eq('product_sku', 'BW-UNKNOWN');
        if (purge1) console.error(`Error purging UNKNOWN from ${table}:`, purge1.message);
        if (purge2) console.error(`Error purging BW-UNKNOWN from ${table}:`, purge2.message);
    }

    console.log('--- CLEANUP FINISHED ---');
}

cleanup();
