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
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY'); // Changed to Service Role Key

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials (URL or Service Role Key) in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const newPlates = [
    "ANX 9821",
    "PETRA 9821",
    "NEH 9821",
    "VPC 9821",
    "TDE 9821",
    "JYH 9821",
    "RBC 9821",
    "DFK 9821",
    "RAU 9821",
    "APD 9821",
    "ANW 9821"
];

async function seedLorries() {
    console.log("--- Seeding Lorries Table (Admin Mode) ---");

    // 1. Clear existing data
    const { error: deleteError } = await supabase.from('lorries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) {
        console.error("Error clearing lorries table:", deleteError);
    } else {
        console.log("Cleared existing data from 'lorries' table.");
    }

    // 2. Insert new data
    const payload = newPlates.map(plate => ({
        plate_number: plate,
        status: 'Available',
        preferred_zone: 'Any'
    }));

    const { data, error } = await supabase.from('lorries').insert(payload).select();

    if (error) {
        console.error("Error inserting lorries:", error);
    } else {
        console.log(`Successfully inserted ${data.length} lorries:`);
        console.table(data);
    }
}

seedLorries();
