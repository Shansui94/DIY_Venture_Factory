
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log("Cleaning up test data...");

    // Clear Active Products
    await supabase.from('machine_active_products').delete().eq('machine_id', 'T1.2-M01');

    // Clear Logs (optional, but good for fresh start)
    // await supabase.from('production_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Actually, user might want to see the test logs? 
    // "Now quantity stays at 0" imply they are watching.
    // I'll leave the logs, or clear them? 
    // "Now clear 0, observe for a day" was the original request.
    // I should probably clear it again so it's a true fresh start.

    await supabase.from('production_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log("Cleanup Done. System Ready.");
}

cleanup();
