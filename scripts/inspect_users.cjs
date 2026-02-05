const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load env
const envPath = path.resolve(__dirname, '../.env');
const envConfig = require('dotenv').parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTables() {
    let output = "";

    output += "--- Inspecting 'users_public' (Top 2) ---\n";
    const { data: usersPublic, error: err1 } = await supabase
        .from('users_public')
        .select('*')
        .limit(2);

    if (err1) output += "Error: " + err1.message + "\n";
    else output += JSON.stringify(usersPublic, null, 2) + "\n";

    output += "\n--- Inspecting 'sys_users_v2' (Top 2) ---\n";
    const { data: sysUsers, error: err2 } = await supabase
        .from('sys_users_v2')
        .select('*')
        .limit(2);

    if (err2) output += "Error: " + err2.message + "\n";
    else output += JSON.stringify(sysUsers, null, 2) + "\n";

    fs.writeFileSync(path.resolve(__dirname, 'users_inspection_output.txt'), output);
    console.log("Output written to users_inspection_output.txt");
}

inspectTables();
