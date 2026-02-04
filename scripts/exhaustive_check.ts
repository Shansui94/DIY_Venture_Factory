
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: leaves } = await supabase.from('driver_leave').select('*');
    const { data: drivers } = await supabase.from('users_public').select('id, name');
    const driverMap = new Map(drivers?.map(d => [d.id, d.name]));

    console.log("ALL LEAVE RECORDS (DEBUG):");
    leaves?.forEach(l => {
        const name = driverMap.get(l.driver_id) || 'Unknown';
        console.log(`JSON_DATA: ${JSON.stringify({ ...l, driver_name: name })}`);
    });
}
check();
