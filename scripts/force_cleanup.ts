
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function forcePurge() {
    console.log("⚠️ FORCE PURGING ALL ORDERS ⚠️");

    // Use a broad filter that matches everything
    const { error, count } = await supabase
        .from('job_orders')
        .delete()
        .gt('created_at', '2000-01-01'); // Should match everything

    if (error) {
        console.error("Purge Error:", error);
    } else {
        console.log(`Purged count: ${count}`);
    }

    // Final count check
    const { count: final } = await supabase.from('job_orders').select('*', { count: 'exact', head: true });
    console.log(`Final Database Count: ${final}`);
}

forcePurge();
