const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env manually since we might not have dotenv globally installed or configured
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (key) => {
    const match = envContent.match(new RegExp(`${key}=(.*)`));
    return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchLorries() {
    console.log("--- Checking 'lorries' table ---");
    const { data: lorries, error: lorryError } = await supabase.from('lorries').select('*');
    if (lorryError) console.error("Error fetching lorries:", lorryError);
    else if (lorries && lorries.length > 0) console.table(lorries);
    else console.log("No data in 'lorries' table.");

    console.log("\n--- Checking 'lorry_service_requests' history ---");
    const { data: requests, error: reqError } = await supabase.from('lorry_service_requests').select('plate_number').order('created_at', { ascending: false });
    if (reqError) console.error("Error fetching requests:", reqError);
    else if (requests && requests.length > 0) {
        const uniquePlates = [...new Set(requests.map(r => r.plate_number))].filter(Boolean);
        console.log("Found plates in service history:", uniquePlates);
    } else {
        console.log("No service request history found.");
    }
}

fetchLorries();
