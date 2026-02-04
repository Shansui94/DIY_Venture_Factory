import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function cleanup() {
    console.log('--- 1. Renaming T1.3-M03 to T1.3-M02 ---');

    // Check if T1.3-M03 exists
    const { data: m03 } = await supabase.from('sys_machines_v2')
        .select('*')
        .eq('machine_id', 'T1.3-M03')
        .single();

    if (m03) {
        // We can't easily update PRIMARY KEY if it's referenced. 
        // Let's check for references first or simply delete/insert.
        console.log('Found T1.3-M03, updating to T1.3-M02...');

        // 1.1 Insert corrected machine if it doesn't exist
        await supabase.from('sys_machines_v2').upsert({
            machine_id: 'T1.3-M02',
            name: '1M Single Layer (T1.3)',
            base_width: 100
        });

        // 1.2 Update machine_active_products
        await supabase.from('machine_active_products')
            .update({ machine_id: 'T1.3-M02' })
            .eq('machine_id', 'T1.3-M03');

        // 1.3 Update production_logs
        await supabase.from('production_logs')
            .update({ machine_id: 'T1.3-M02' })
            .eq('machine_id', 'T1.3-M03');

        // 1.4 Update iot_device_configs
        await supabase.from('iot_device_configs')
            .update({ machine_id: 'T1.3-M02' })
            .eq('machine_id', 'T1.3-M03');

        // 1.5 Delete old machine ID
        await supabase.from('sys_machines_v2')
            .delete()
            .eq('machine_id', 'T1.3-M03');
    }

    console.log('\n--- 2. Cleaning up UNKNOWN SKUs ---');
    // Delete for machine_active_products
    const { error: activeErr } = await supabase.from('machine_active_products')
        .delete()
        .or('product_sku.eq.UNKNOWN,product_sku.eq.BW-UNKNOWN');
    if (activeErr) console.error('Error cleaning active products:', activeErr.message);

    // For production_logs, we might want to update instead of delete if they are real production
    // But since user says they are "wrong", we can delete them or label them "Invalid-Entry"
    // Let's delete them as requested ("删除没用数据")
    const { error: logErr } = await supabase.from('production_logs')
        .delete()
        .or('product_sku.eq.UNKNOWN,product_sku.eq.BW-UNKNOWN');
    if (logErr) console.error('Error cleaning logs:', logErr.message);

    console.log('Cleanup complete.');
}

cleanup();
