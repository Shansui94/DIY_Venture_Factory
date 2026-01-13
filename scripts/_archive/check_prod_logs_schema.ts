
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("Checking schema for 'production_logs'...");
    const { data, error } = await supabase
        .from('production_logs')
        .select('*')
        .limit(1);

    if (error) {
        console.error(error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Columns found:", Object.keys(data[0]));
        if (Object.keys(data[0]).includes('lane_id')) {
            console.log("✅ 'lane_id' column EXISTS.");
        } else {
            console.log("❌ 'lane_id' column MISSING.");
        }
    } else {
        console.log("Table empty, cannot infer columns easily via select. Assuming missing if new dev.");
    }
}

main();
