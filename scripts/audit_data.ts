import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function auditData() {
    console.log('--- START AUDIT DATA ---');

    const { data: machines } = await supabase.from('sys_machines_v2').select('*');
    console.log('MACHINES:', JSON.stringify(machines?.map(m => ({ id: m.machine_id, name: m.name, base_width: m.base_width })), null, 2));

    const { data: active } = await supabase.from('machine_active_products').select('*');
    console.log('ACTIVE_PRODUCTS:', JSON.stringify(active, null, 2));

    const { data: iot } = await supabase.from('iot_device_configs').select('*');
    console.log('IOT_CONFIGS:', JSON.stringify(iot, null, 2));

    const { data: logs } = await supabase.from('production_logs')
        .select('id, machine_id, product_sku, alarm_count, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
    console.log('PRODUCTION_LOGS_RECENT:', JSON.stringify(logs, null, 2));

    console.log('--- END AUDIT DATA ---');
}

auditData();
