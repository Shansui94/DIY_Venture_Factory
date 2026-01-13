
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking for V3 columns...");
    // Try to select the new columns. If they don't exist, this will error.
    const { data, error } = await supabase
        .from('master_items_v2')
        .select('sku, brand, supplier, function_usage')
        .limit(1);

    if (error) {
        console.log("SCHEMA_MISSING: " + error.message);
    } else {
        console.log("SCHEMA_OK");
    }
}

check();
