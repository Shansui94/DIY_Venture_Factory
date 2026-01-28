
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkConfig() {
    console.log("Checking Active Products for T1.2-M01...");

    const { data, error } = await supabase
        .from('machine_active_products')
        .select('*')
        .eq('machine_id', 'T1.2-M01');

    if (error) { console.error(error); return; }

    console.table(data);

    if (data && data.length > 2) {
        console.log("⚠️ WARNING: More than 2 active products detected! This dilutes the count.");
    }
}

checkConfig();
