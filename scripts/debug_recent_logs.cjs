
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
    console.log("Checking machines...");
    const { data: machines, error } = await supabase.from('sys_machines_v2').select('machine_id, id, name');

    if (error) {
        console.error("Error:", error);
    } else {
        console.table(machines);
    }
}

check();
