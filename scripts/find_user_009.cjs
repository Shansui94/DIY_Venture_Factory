const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../.env');
const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY);

async function findUser() {
    console.log("Searching for user with employee_id '009'...");
    const { data, error } = await supabase
        .from('users_public')
        .select('*')
        .eq('employee_id', '009')
        .single();

    if (error) console.log("Not found by ID 009, trying fuzzy search...");

    // Fallback: list all to manually check if 009 is part of name or something (unlikely but safe)
    if (!data) {
        const { data: all } = await supabase.from('users_public').select('id, name, employee_id, role').limit(50);
        console.log("Quick scan of users:", JSON.stringify(all, null, 2));
    } else {
        console.log("Found User:", JSON.stringify(data, null, 2));
    }
}

findUser();
