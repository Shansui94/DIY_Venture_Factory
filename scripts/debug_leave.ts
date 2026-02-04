
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeave() {
    console.log("--- Driver Leave Debug ---");

    const { data: leaves, error: leaveError } = await supabase
        .from('driver_leave')
        .select('*');

    if (leaveError) {
        console.error("Error fetching leaves:", leaveError);
        return;
    }

    const { data: drivers } = await supabase
        .from('users_public')
        .select('id, name');

    const driverMap = new Map(drivers?.map(d => [d.id, d.name]));

    console.log("Count:", leaves?.length);
    leaves?.forEach(l => {
        const name = driverMap.get(l.driver_id);
        console.log(`Driver: ${name}, Start: ${l.start_date}, End: ${l.end_date}, Status: ${l.status}`);
    });

    const todayStr = new Date().toLocaleDateString('en-CA');
    console.log("Current Today (Local):", todayStr);
}

checkLeave();
