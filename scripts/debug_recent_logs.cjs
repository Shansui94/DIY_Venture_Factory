
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
    console.log("Checking production_logs_v2 schema...");
    // We can't easily run raw SQL for schema info via client without a helper RPC.
    // Let's try to query the table with a dummy insert to see the error? No that's risky.
    // Let's just try to READ the machine_id of an existing row?
    const { data: logs } = await supabase.from('production_logs_v2').select('machine_id').limit(1);
    console.log("Existing Log Machine ID:", logs?.[0]);

    // Let's check the RPC definition if possible? Hard from client.
    // I will assume the error is correct: It expects UUID.

    // I will try to run the migration script 'create_production_rpc_v3.sql' again to FORCE the update.
    // But first, I need to know if the TABLE is the problem.

    // Let's try to find an existing machine with that code check strict equality
    console.log("Checking if T1.2-M01 exists...");
    const { data: m } = await supabase.from('sys_machines_v2').select('*').eq('machine_id', 'T1.2-M01');
    console.log("Machine Lookup:", m);
}

check();
