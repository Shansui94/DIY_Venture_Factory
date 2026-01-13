
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log("Checking sys_users_v2...");
    const { data: v2Users, error } = await supabase.from('sys_users_v2').select('*');
    if (error) console.error("Error V2 Users:", error);
    else console.table(v2Users);

    console.log("Checking Auth Users (via simple metadata check if possible)...");
    // We can't list auth users easily with simple client unless service role.
    // But we can check if the V2 table is empty, which is a big clue.
}

checkUsers();
