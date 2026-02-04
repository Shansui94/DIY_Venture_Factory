
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function addUnknownSku() {
    console.log("Adding 'UNKNOWN' to master_items_v2...");

    // Insert with safe defaults
    const { data, error } = await supabase
        .from('master_items_v2')
        .insert({
            sku: 'UNKNOWN',
            name: 'Unknown Product',
            type: 'FG',
            category: 'Uncategorized',
            supply_type: 'Manufactured',
            uom: 'Unit',
            status: 'Active'
        });

    if (error) {
        if (error.code === '23505') { // Unique violation
            console.log("UNKNOWN already exists (Race condition?).");
        } else {
            console.error("Error adding UNKNOWN:", error);
        }
    } else {
        console.log("SUCCESS: 'UNKNOWN' SKU added.");
    }
}

addUnknownSku();
