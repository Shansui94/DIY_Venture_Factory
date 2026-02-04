
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkDevices() {
    console.log('Checking for recently added/updated devices...');
    const { data, error } = await supabase
        .from('iot_device_configs')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching devices:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No devices found.');
        return;
    }

    data.forEach((d: any) => {
        console.log(`MAC: ${d.mac_address} | Machine: ${d.machine_id || 'Pending'} | Updated: ${d.updated_at}`);
    });
}

checkDevices();
