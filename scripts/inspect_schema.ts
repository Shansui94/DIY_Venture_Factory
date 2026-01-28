import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("--- users_public columns ---");
    const { data: u } = await supabase.from('users_public').select('*').limit(1);
    if (u && u[0]) console.log(Object.keys(u[0]));

    console.log("\n--- sys_vehicles columns ---");
    const { data: v } = await supabase.from('sys_vehicles').select('*').limit(1);
    if (v && v[0]) console.log(Object.keys(v[0]));
}

main();
