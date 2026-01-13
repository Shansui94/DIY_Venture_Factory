
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    // Target Time: 11:00 AM - 12:00 PM (Local +08:00)
    // Convert to UTC for Querying
    // 11:00 AM Local = 03:00 AM UTC
    // 12:00 PM Local = 04:00 AM UTC
    const startTime = '2026-01-09T03:00:00.000Z';
    const endTime = '2026-01-09T04:00:00.000Z';

    console.log(`Checking logs from ${startTime} to ${endTime} (UTC)...`);
    console.log(`(Local Time: 11:00 AM to 12:00 PM)`);

    const { data, error } = await supabase
        .from('production_logs')
        .select('id, created_at, alarm_count, product_sku, machine_id')
        .gte('created_at', startTime)
        .lte('created_at', endTime)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No logs found in this time range.');
    } else {
        console.log(`Found ${data.length} logs:`);
        console.table(data.map(log => ({
            ...log,
            local_time: new Date(log.created_at).toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })
        })));
    }
}

main();
