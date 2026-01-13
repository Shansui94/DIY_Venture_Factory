
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env explicitly from current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Try to use Service Role Key, fall back to Anon
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log("--- CONFIG ---");
console.log("URL:", supabaseUrl);
console.log("Key Role:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "SERVICE_ROLE" : "ANON");

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log("\n--- TEST: INSERT ---");
    const testId = `TEST-${Date.now()}`;
    const insertRes = await supabase.from('production_logs').insert({
        machine_id: testId,
        alarm_count: 123
    });

    if (insertRes.error) {
        console.error("INSERT FAILED:", insertRes.error);
    } else {
        console.log("INSERT SUCCESS");
    }

    console.log("\n--- TEST: SELECT ---");
    const selectRes = await supabase.from('production_logs').select('*')
        .eq('machine_id', testId);

    if (selectRes.error) {
        console.error("SELECT FAILED:", selectRes.error);
    } else {
        console.log("SELECT SUCCESS. Found rows:", selectRes.data?.length);
        console.log("Data:", selectRes.data);
    }
}

runTest();
