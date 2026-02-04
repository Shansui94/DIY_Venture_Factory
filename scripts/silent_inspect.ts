
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env without logging
dotenv.config({ path: path.resolve(process.cwd(), '.env'), debug: false });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function silentInspect() {
    process.stdout.write("--- START INSPECTION ---\n");

    // Check UNKNOWN logic first
    const { data: uItem } = await supabase
        .from('master_items_v2')
        .select('sku, name, status')
        .eq('sku', 'UNKNOWN');

    if (!uItem || uItem.length === 0) {
        process.stdout.write("RESULT: UNKNOWN_SKU_MISSING\n");
    } else {
        process.stdout.write(`RESULT: UNKNOWN_SKU_EXISTS (${uItem[0].status})\n`);
    }

    // Check Machine Structure
    const { data: mData } = await supabase
        .from('machines')
        .select('*')
        .limit(1);

    if (mData && mData.length > 0) {
        process.stdout.write("MACHINE_COLUMNS: " + Object.keys(mData[0]).join(", ") + "\n");

        // Check finding T1.2-M01
        const { data: found } = await supabase
            .from('machines')
            .select('*')
            .like('id', '%T1.2-M01%') // Try like on ID (since it's text)
            .maybeSingle(); // or .limit(1)

        if (!found) {
            // Try Name
            const { data: foundName } = await supabase.from('machines').select('*').like('name', '%T1.2-M01%').maybeSingle();
            if (foundName) process.stdout.write("FOUND_BY_NAME: " + JSON.stringify(foundName) + "\n");
            else process.stdout.write("RESULT: MACHINE_NOT_FOUND_VIA_QUERY\n");
        } else {
            process.stdout.write("FOUND_BY_ID: " + JSON.stringify(found) + "\n");
        }
    }

    process.stdout.write("--- END INSPECTION ---\n");
}

silentInspect();
