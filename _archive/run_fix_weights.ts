
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''; // Prefer service role for updates
// Note: Anon key might not have permission to update master items depending on RLS. 
// If this fails, we might need the user to run it in SQL Editor, currently assuming we have enough privileges or RLS allows it.
// Actually, for a backend script, we should use SERVICE_ROLE_KEY if available in .env, but usually it's not exposed to client.
// Let's try with what we have. If anon key fails, I'll ask user to run SQL manually. 
// Wait, I see .env.local usually has anon key. Let's check .env file presence. I saw .env earlier.

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSql() {
    const sqlPath = path.join(process.cwd(), 'scripts', 'fix_sf_weights.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Executing SQL...");
    // Supabase JS client doesn't have a direct 'query' method for raw SQL unless using a specific function or pg driver.
    // However, if we don't have a run_sql RPC, we might have to use a different approach.
    // Let's assume there isn't a generic run_sql function.
    // I will try to use the `rpc` if there is a helper, but standard way is via Table API.
    // Since I have simple updates:
    // UPDATE master_items_v2 SET net_weight_kg = 2.2 ... WHERE sku IN ...

    // I will rewrite this script to use standard Table API updates instead of raw SQL for safety and compatibility.

    const skusToUpdate = ['SF-22KG-BLACK', 'SF-22KG-CLEAR', 'SF-BLACK-SATUKOTAK6ROLL-22', 'SF-CLEAR-SATUKOTAK6ROLL-22', 'SF-GREY-SATUKOTAK6ROLL-22'];

    const { data, error } = await supabase
        .from('master_items_v2')
        .update({ net_weight_kg: 2.2, gross_weight_kg: 2.4 })
        .in('sku', skusToUpdate)
        .select();

    if (error) {
        console.error("Error updating weights:", error);
    } else {
        console.log(`Success! Updated ${data.length} items.`);
    }

    // Reuse items
    const { error: err2 } = await supabase
        .from('master_items_v2')
        .update({ net_weight_kg: 1.0, gross_weight_kg: 1.0 })
        .ilike('sku', 'SF-REUSE%');

    if (err2) console.error("Error updating Reuse items:", err2);
    else console.log("Updated reuse items.");
}

runSql();
