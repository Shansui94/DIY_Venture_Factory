
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

async function inspectMachines() {
    console.log("Inspecting 'machines' table...");
    const { data: machines, error } = await supabase
        .from('machines')
        .select('*')
        .eq('id', 'T1.3-M03');

    if (error) {
        console.error(error);
        return;
    }

    if (machines && machines.length > 0) {
        console.log("Machine State:", JSON.stringify(machines[0], null, 2));
    } else {
        console.log("Machine T1.3-M03 not found in 'machines' table.");
    }
}

inspectMachines();
