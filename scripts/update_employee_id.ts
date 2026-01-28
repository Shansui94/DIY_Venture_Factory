
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Fix path to .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use Service Role Key for admin ops, fall back to Anon
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateEmployeeId() {
    const email = 'diyadmin1111@gmail.com';
    const newEmployeeId = '1224';

    console.log(`Updating Employee ID for ${email} to ${newEmployeeId} AND Activating user...`);

    const { data, error } = await supabase
        .from('users_public')
        .update({
            employee_id: newEmployeeId,
            status: 'Active' // Ensure they can login
        })
        .eq('email', email)
        .select();

    if (error) {
        console.error('Error updating user:', error);
    } else {
        console.log('Success! Updated user:', data);
    }
}

updateEmployeeId();
