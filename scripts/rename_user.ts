
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function renameUser() {
    const email = 'diyadmin1111@gmail.com';
    const newName = 'Vivian';

    console.log(`Renaming ${email} to ${newName}...`);

    const { data, error } = await supabase
        .from('users_public')
        .update({ name: newName })
        .eq('email', email)
        .select();

    if (error) {
        console.error("Error updating name:", error);
    } else {
        console.log("✅ Name updated:", data);
    }
}

renameUser();
