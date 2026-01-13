
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SERVICE_ROLE_KEY!; // Must use service role to delete
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    // 1:00 AM Today (2025-12-30)
    // Adjust logic to be dynamic or static? "Today" is relative.
    // User said "Today morning 1:00 AM" relative to now (2025-12-30).
    const cutoff = '2025-12-30T01:00:00+08:00';

    console.log(`Deleting production_logs_v2 before ${cutoff}...`);

    const { error, count } = await supabase
        .from('production_logs_v2')
        .delete({ count: 'exact' })
        .lt('created_at', cutoff);

    if (error) {
        console.error('Error deleting logs:', error);
    } else {
        console.log(`Deleted ${count} records from production_logs_v2.`);
    }

    // Optional: Clear Stock Ledger? User only asked for "production data".
    // Usually sticking to logs is safer unless requested.
}

cleanup();
