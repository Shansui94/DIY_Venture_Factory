
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addClearSku() {
    console.log("Adding 'CLEAR' to master_items_v2...");

    const { data, error } = await supabase
        .from('master_items_v2')
        .insert({
            sku: 'CLEAR',
            name: 'Clear Film (Generic)',
            type: 'FG',
            category: 'Packaging',
            supply_type: 'Manufactured',
            uom: 'Roll',
            status: 'Active'
        });

    if (error) {
        console.error("Error adding SKU:", error);
    } else {
        console.log("SUCCESS: 'CLEAR' SKU added.");
    }
}

addClearSku();
