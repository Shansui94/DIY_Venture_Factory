const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env manually
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (key) => {
    const match = envContent.match(new RegExp(`${key}=(.*)`));
    return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY'); // Admin access

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function clearMaintenance() {
    console.log("--- Clearing Maintenance Control Data ---");

    const { error } = await supabase.from('lorry_service_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
        console.error("Error clearing data:", error);
    } else {
        console.log("✅ Successfully cleared all maintenance requests.");
    }
}

clearMaintenance();
