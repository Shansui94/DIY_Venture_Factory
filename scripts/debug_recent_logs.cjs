
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking schema...");
    const { data, error } = await supabase
        .rpc('get_column_type', { table_n: 'sys_users_v2', col_n: 'id' });
    // Note: RPC might not exist. 
    // Fallback to raw SQL via a different method? 
    // Supabase client doesn't support raw SQL easily without RPC.
    // Let's just assume UUID if I can't check easily.
    // Or check a sample ID string in the logs/console.

    // ACTUALLY: Let's just fetch one user and print the ID.
    const { data: users } = await supabase.from('sys_users_v2').select('id').limit(1);
    console.log("Sample User ID:", users ? users[0] : 'None');


    if (error) {
        console.error("Error:", error);
    } else {
        console.table(data);
    }
}

check();
