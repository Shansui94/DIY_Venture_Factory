
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), debug: false });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function readRoutine() {
    console.log("--- Reading Trigger Source ---");
    // Standard query for Postgres functions
    // Note: This requires permissions to access pg_proc or information_schema.routines
    // Service Role usually has it.

    const { data, error } = await supabase
        .from('information_schema.routines')
        .select('routine_name, routine_definition')
        .eq('routine_name', 'handle_production_log_insert')
        .eq('routine_schema', 'public');

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("FUNCTION FOUND: " + data[0].routine_name);
        console.log("----------------------------------------");
        console.log(data[0].routine_definition);
        console.log("----------------------------------------");
    } else {
        console.log("Function 'handle_production_log_insert' not found. Checking all routines...");
        // List all public routines to guess the name
        const { data: all } = await supabase
            .from('information_schema.routines')
            .select('routine_name')
            .eq('routine_schema', 'public');
        console.log("Available Routines:", all?.map(r => r.routine_name).join(", "));
    }
}

readRoutine();
