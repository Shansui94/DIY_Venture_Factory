
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

async function inspectTable() {
    console.log("Inspecting machine_active_products...");
    const { data, error } = await supabase
        .from('machine_active_products')
        .select('*');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Found rows:", data.length);
        if (data.length > 0) {
            console.log("Columns:", Object.keys(data[0]));
            console.log("Sample Data:", data[0]);
        }
    }
}

inspectTable();
