
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const userClient = createClient(supabaseUrl, anonKey);

async function checkUserAccess() {
    console.log("Checking ANON access to sys_users_v2...");

    // Try to count users
    const { count, error, data } = await userClient
        .from('sys_users_v2')
        .select('id, employee_id', { count: 'exact', head: false })
        .limit(5);

    if (error) {
        console.error("Access Denied or Error:", error);
    } else {
        console.log(`Success! Visible Users: ${count}`);
        console.table(data);
    }
}

checkUserAccess();
