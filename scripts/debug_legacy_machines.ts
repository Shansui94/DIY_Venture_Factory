
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLegacyMachines() {
    console.log("Checking LEGACY machines table...");
    // Attempting to finding table name - usually 'machines' or similar
    const { data, error } = await supabase.from('machines').select('*');
    if (error) {
        console.error("Error (machines):", error.message);
        // Try other common names if failed
    } else {
        console.table(data);
    }
}

checkLegacyMachines();
