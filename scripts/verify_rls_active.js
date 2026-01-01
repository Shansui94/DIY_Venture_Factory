
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function verifyRLS() {
    console.log("Testing Anonymous Access to 'master_items_v2'...");

    // Try to select without logging in
    const { data, error } = await supabase.from('master_items_v2').select('count', { count: 'exact', head: true });

    if (error) {
        console.log("Result: ERROR (This might be good if permission denied)");
        console.log("Error details:", error.message);
    } else {
        console.log(`Result: SUCCESS. Found ${data} rows accessible anonymously.`);
        if (data === null || data === 0) { // count comes back in 'count' property logic varies
            // Actually head:true returns null data but count header
            // Let's do a normal select limit 1
            const { data: rows, error: rowErr } = await supabase.from('master_items_v2').select('sku').limit(1);
            if (rows && rows.length > 0) {
                console.log("CRITICAL: DATA LEAK! Anonymous user can read data:", rows[0]);
                console.log("CONCLUSION: RLS is NOT ENABLED or Policy is too open.");
            } else {
                console.log("Clean result (No rows). This suggests RLS is blocking read, OR table is empty.");
            }
        }
    }
}

verifyRLS();
