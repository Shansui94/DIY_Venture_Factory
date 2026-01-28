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
    const targetId = '6434';
    const newPassword = '827391';

    console.log(`Finding user with employee_id: ${targetId}...`);

    // 1. Find User UID from public table
    const { data: users, error } = await supabase
        .from('users_public')
        .select('*')
        .eq('employee_id', targetId)
        .single();

    if (error || !users) {
        console.error("User not found or error:", error);
        return;
    }

    console.log(`Found User: ${users.name} (${users.email}) [UID: ${users.id}]`);
    console.log(`Resetting password to: ${newPassword}`);

    // 2. Update Auth Password
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
        users.id,
        { password: newPassword }
    );

    if (authError) {
        console.error("Auth Update Error:", authError);
    } else {
        console.log("✅ Password Updated Successfully!");
        console.log(`Email: ${users.email}`);
        console.log(`Password: ${newPassword}`);
    }
}

main();
