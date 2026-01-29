
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdahubyhwndgyloaljak.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4Njg4OSwiZXhwIjoyMDgwOTYyODg5fQ.82VCH3EqJXXfdR08i_pxr7yafb1gNunLd6wEomRcfVM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDriverRole() {
    const email = '8335@packsecure.com';

    console.log(`Fixing role for: ${email}...`);

    // 1. Get User ID from Auth (optional, but good for verification)
    // const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    // const user = users.find(u => u.email === email);

    // if (!user) {
    //     console.error('User not found in Auth!');
    //     return;
    // }

    // 2. Update public table directly using Service Role (Bypasses RLS)
    const { data, error } = await supabase
        .from('users_public')
        .update({ role: 'Driver' })
        .eq('email', email)
        .select();

    if (error) {
        console.error('Error updating role:', error);
        return;
    }

    if (data.length === 0) {
        console.log('No user found in users_public with that email. Trigger might have failed or delayed.');
    } else {
        console.log('Success! Updated role to Driver:', data[0]);
    }
}

fixDriverRole();
