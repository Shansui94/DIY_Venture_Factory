
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSFItems() {
    console.log("Checking SF items...");
    // Select all columns to see correct weight column name
    const { data, error } = await supabase
        .from('master_items_v2')
        .select('*')
        .ilike('sku', 'SF%')
        .order('sku');

    if (error) {
        console.error("Error:", error);
    } else {
        console.table(data.map(i => ({ sku: i.sku, name: i.name, type: i.type, weight_net: i.net_weight_kg, weight_gross: i.gross_weight_kg })));
    }
}

checkSFItems();
