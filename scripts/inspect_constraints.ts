
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

async function inspectConstraints() {
    console.log("--- Inspecting Constraints on production_logs ---");

    // We can't easily query information_schema for constraints via JS client without RLS/permissions issues usually.
    // So we will TRY TO INSERT a duplicate and see the detailed error.

    const machineId = 'T1.2-M01';
    const timestamp = new Date().toISOString();

    console.log("Attempt 1: Insert standard log...");
    const { data: d1, error: e1 } = await supabase
        .from('production_logs')
        .insert({
            machine_id: machineId,
            alarm_count: 2,
            created_at: timestamp
        });

    if (e1) {
        console.error("Insert 1 Error:", e1);
    } else {
        console.log("Insert 1 Success.");
    }

    console.log("Attempt 2: Insert EXACT DUPLICATE (Same Machine, Same Time)...");
    const { data: d2, error: e2 } = await supabase
        .from('production_logs')
        .insert({
            machine_id: machineId,
            alarm_count: 2,
            created_at: timestamp
        });

    if (e2) {
        console.log("Insert 2 Expected Error:", e2.code, e2.message, e2.details);
    } else {
        console.log("Insert 2 Success (Duplicate time allowed??)");
    }
}

inspectConstraints();
