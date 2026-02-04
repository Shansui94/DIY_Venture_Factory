
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    const { data: users, error } = await supabase
        .from('users_public')
        .select('*');

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Users in public schema:", JSON.stringify(users, null, 2));
}

checkUsers();
