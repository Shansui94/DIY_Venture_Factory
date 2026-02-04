
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("LOG: Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("LOG: Script started");
    try {
        console.log("LOG: Checking lane_id...");
        const col = 'lane_id';
        const { data, error } = await supabase
            .from('production_logs')
            .select(`created_at, ${col}`)
            .or(`${col}.is.null,${col}.eq.unknown,${col}.eq.Unknown,${col}.eq.""`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error(`LOG: Error checking ${col}:`, JSON.stringify(error));
        } else if (data && data.length > 0) {
            console.log(`LOG: FOUND INVALID '${col}': ${data.length} records.`);
            console.log(`LOG: START: ${new Date(data[0].created_at).toLocaleString()}`);
            console.log(`LOG: END:   ${new Date(data[data.length - 1].created_at).toLocaleString()}`);
        } else {
            console.log(`LOG: Column '${col}' is clean.`);
        }

    } catch (e) {
        console.error("LOG: Exception:", e);
    }
    console.log("LOG: Script finished");
}

main();
