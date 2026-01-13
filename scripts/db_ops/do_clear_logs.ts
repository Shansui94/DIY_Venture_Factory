
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearLogs() {
    console.log("Clearing all production logs...");

    // Delete all rows where id is not null (which is all rows)
    const { error, count } = await supabase
        .from('production_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
        console.error("Error clearing logs:", error);
    } else {
        console.log(`Logs cleared! Deleted rows.`);
    }
}

clearLogs();
