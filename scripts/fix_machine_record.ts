
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), debug: false });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function insertMachine() {
    console.log("--- Inserting T1.2-M01 into machines ---");

    // We try to insert with what we know from factoryData.ts
    // Plus 'active_product_sku' which is a common pattern.

    const payload = {
        id: 'T1.2-M01', // If ID is UUID, this will fail. If so, we'll know.
        name: '2M Double Layer (T1.2)',
        factory_id: 'T1',
        type: 'Extruder',
        status: 'Running',
        // Guessing column names for default product:
        // current_sku: 'UNKNOWN',
        // active_job_id: ...
    };

    const { data, error } = await supabase.from('machines').insert(payload).select();

    if (error) {
        console.error("Insert Error:", error.message);
        if (error.details) console.error("Details:", error.details);
        if (error.hint) console.error("Hint:", error.hint);
    } else {
        console.log("SUCCESS! Machine inserted:", data);
    }
}

insertMachine();
