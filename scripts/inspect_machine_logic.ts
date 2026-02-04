
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

async function inspectMachineCorrectly() {
    console.log("--- Finding T1.2-M01 in machines table ---");

    // Attempt to find by flexible search since we don't know the exact column name for "T1.2-M01"
    // It failed as UUID, so it must be a text column like 'machine_code', 'name', 'label', etc.
    // Or maybe 'id' IS text but some rows have UUIDs?? (Unlikely)

    // First, list all machines to see structure
    const { data: allMachines, error: listErr } = await supabase
        .from('machines')
        .select('*')
        .limit(5);

    if (listErr) {
        console.error("List Error:", listErr);
        return;
    }

    if (allMachines && allMachines.length > 0) {
        console.log("Sample Machine Structure:", Object.keys(allMachines[0]));
        // Try to match T1.2-M01 in any value
        const match = allMachines.find(m => Object.values(m).includes('T1.2-M01'));
        if (match) {
            console.log("Found T1.2-M01 by scanning:", match);
        } else {
            console.log("Scanning full query...");
            // Query specifically for standard identifier columns
            const { data: specific, error: sErr } = await supabase
                .from('machines')
                .select('*')
                .or(`name.eq.T1.2-M01,machine_id.eq.T1.2-M01,code.eq.T1.2-M01`)
                .limit(1);

            if (specific && specific.length > 0) {
                console.log("Found specific:", specific[0]);
            } else {
                console.log("Could not find T1.2-M01 via standard queries.");
            }
        }
    }

    console.log("\n--- Checking for UNKNOWN in master_items_v2 ---");
    const { data: uItem } = await supabase
        .from('master_items_v2')
        .select('*')
        .eq('sku', 'UNKNOWN');

    if (uItem && uItem.length > 0) {
        console.log("UNKNOWN SKU exists:", uItem[0]);
    } else {
        console.log("UNKNOWN SKU DOES NOT EXIST. (We should add it if user wants it default)");
    }
}

inspectMachineCorrectly();
