
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Fix path to .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use Service Role Key to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function purgeOrders() {
    console.log("⚠️ STARTING DATA PURGE: JOB ORDERS ⚠️");

    // 1. Delete all from job_orders
    const { error: err1, count } = await supabase
        .from('job_orders')
        .delete()
        .neq('job_id', '000000'); // Delete everything where ID is not distinct filter (basically all)
    // .neq is used because .delete() requires a filter in Supabase client usually to prevent accidental purge, 
    // unless using filters. But neq '000000' is a safe way to say "everything that has a real ID"

    if (err1) {
        console.error("Error deleting job_orders:", err1);
    } else {
        console.log(`✅ Successfully deleted records from 'job_orders'. (Count might be null if not returned)`);
    }

    // Optional: Check if empty
    const { count: finalCount } = await supabase.from('job_orders').select('*', { count: 'exact', head: true });
    console.log(`Current 'job_orders' count: ${finalCount}`);
}

purgeOrders();
