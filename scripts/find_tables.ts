
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), debug: false });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function listTables() {
    console.log("--- Listing Tables ---");
    // This query usually works for finding table names
    const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    // Wait, JS client can't query information_schema directly usually.
    // Let's try rpc if available, or just guess common names.
    // Actually, I can use the 'tables' view if exposed.

    // Better idea: Create a dummy RPC? No.
    // Let's just try to select from likely candidates.

    const candidates = ['machines', 'active_jobs', 'jobs', 'production_runs', 'machine_assignments', 'machine_states'];

    for (const table of candidates) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (!error) {
            console.log(`FOUND TABLE: ${table} (Rows: ${data?.length})`);
            if (data && data.length > 0) console.log("Sample:", Object.keys(data[0]).join(", "));
        }
    }
}

listTables();
