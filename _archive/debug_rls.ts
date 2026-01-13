
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
    console.log("Checking explicit fetch permission on production_logs_v2...");
    // Try to fetch logs as a standard client
    const { data, error } = await supabase.from('production_logs_v2').select('*').limit(5);

    if (error) {
        console.error("Fetch Error:", error);
    } else {
        console.log(`Fetch Success. Count: ${data.length}`);
        console.table(data); // Show me the data!
    }
}

checkPolicies();
