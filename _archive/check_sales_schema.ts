
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.from('sales_orders').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]) : 'Table empty or no access (or no rows)');
        if (data && data.length === 0) {
            // If empty, try to insert dummy to see error or just assume standard
            console.log("Table is empty. Cannot deduce columns easily without introspection.");
        } else if (data) {
            console.log('Sample Row:', data[0]);
        }
    }

    // Check users for drivers
    const { data: users, error: userError } = await supabase.from('users_public').select('*');
    if (userError) console.error(userError);
    if (users) {
        console.log(`Found ${users.length} users.`);
        const drivers = users.filter(u => u.role === 'Driver');
        console.log(`Found ${drivers.length} Drivers:`, drivers.map(d => d.name));
    }
}

checkSchema();
