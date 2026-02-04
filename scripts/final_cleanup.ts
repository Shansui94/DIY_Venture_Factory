import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function finalCleanup() {
    console.log('--- START FINAL CLEANUP (Service Role) ---');

    const tables = ['machine_active_products', 'production_logs', 'iot_device_configs'];

    // 1. Move everything away from T1.3-M03
    console.log('Migrating data from T1.3-M03 to T1.3-M02...');
    for (const table of tables) {
        const { error } = await supabase.from(table)
            .update({ machine_id: 'T1.3-M02' })
            .eq('machine_id', 'T1.3-M03');
        if (error) console.error(`Error migrating ${table}:`, error.message);
    }

    // 2. Delete the old machine
    console.log('Deleting T1.3-M03...');
    const { error: delMachineErr } = await supabase.from('sys_machines_v2').delete().eq('machine_id', 'T1.3-M03');
    if (delMachineErr) console.error('Error deleting machine:', delMachineErr.message);

    // 3. Purge UNKNOWNs
    console.log('Purging UNKNOWN/BW-UNKNOWN SKUs...');
    const skuTables = ['machine_active_products', 'production_logs'];
    for (const table of skuTables) {
        const { error: p1 } = await supabase.from(table).delete().eq('product_sku', 'UNKNOWN');
        const { error: p2 } = await supabase.from(table).delete().eq('product_sku', 'BW-UNKNOWN');
        if (p1) console.error(`Error purging UNKNOWN from ${table}:`, p1.message);
        if (p2) console.error(`Error purging BW-UNKNOWN from ${table}:`, p2.message);
    }

    // 4. Delete the test MAC
    console.log('Deleting test MAC AA:BB:CC...');
    await supabase.from('iot_device_configs').delete().eq('mac_address', 'AA:BB:CC:DD:EE:FF');

    console.log('--- FINAL CLEANUP FINISHED ---');
}

finalCleanup();
