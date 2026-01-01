
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.from('sales_orders').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]) : 'Table empty or no access');
        if (data && data.length > 0) {
            console.log('Sample Row:', data[0]);
        }
    }

    // Check users for drivers
    const { data: users, error: userError } = await supabase.from('users_public').select('*').eq('role', 'Driver');
    console.log('Drivers found:', users ? users.length : 0);
    if (users && users.length > 0) console.log('Sample Driver:', users[0]);
}

checkSchema();
