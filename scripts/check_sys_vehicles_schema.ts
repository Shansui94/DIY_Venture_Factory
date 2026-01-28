import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    // We can't query information_schema directly via JS client usually unless exposed.
    // But we can try to Insert a dummy row with valid columns and see error, OR 
    // better: Try to Insert with 'driver_id' and see if it fails.

    console.log("Checking if 'driver_id' exists in sys_vehicles...");

    const { error } = await supabase.from('sys_vehicles').select('driver_id').limit(1);

    if (error) {
        console.log("Error selecting driver_id:", error.message);
        console.log("Likely column does not exist.");
    } else {
        console.log("Success! 'driver_id' column exists.");
    }

    const { error: err2 } = await supabase.from('sys_vehicles').select('current_driver_id').limit(1);
    if (err2) {
        console.log("Error selecting current_driver_id:", err2.message);
    } else {
        console.log("Success! 'current_driver_id' column exists.");
    }
}

main();
