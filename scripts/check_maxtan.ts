
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: users } = await supabase.from('users_public').select('*').ilike('name', '%maxtan%');
    console.log("USERS MATCHING 'maxtan':", JSON.stringify(users, null, 2));
}
check();
