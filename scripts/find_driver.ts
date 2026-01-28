import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const term = process.argv[2];
    if (!term) {
        console.log("Usage: npx tsx find_driver.ts <term>");
        return;
    }

    console.log(`Searching for '${term}'...`);

    const { data: users, error } = await supabase
        .from('users_public')
        .select('*')
        .or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);

    if (error) {
        console.error(error);
        return;
    }

    if (users.length === 0) {
        console.log("No user found.");
    } else {
        users.forEach(u => {
            console.log(`FOUND: ${u.name} | ${u.email} | ${u.phone} | Role: ${u.role}`);
        });
    }
}

main();
