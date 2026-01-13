
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("Checking schema for 'sys_users_v2'...");
    const { data, error } = await supabase
        .from('sys_users_v2')
        .select('*')
        .limit(1);

    if (error) {
        console.error(error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Columns found:", Object.keys(data[0]));
    } else {
        console.log("Table empty. Cannot infer columns.");
    }
}

main();
