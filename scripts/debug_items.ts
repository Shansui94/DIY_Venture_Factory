
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkItems() {
    console.log("Checking master_items_v2...");
    const { data, error } = await supabase.from('master_items_v2').select('*');
    if (error) {
        console.error("Error:", error);
    } else {
        console.table(data);
        console.log("Total items:", data.length);
    }
}

checkItems();
