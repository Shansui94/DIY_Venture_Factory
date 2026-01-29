
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdahubyhwndgyloaljak.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4Njg4OSwiZXhwIjoyMDgwOTYyODg5fQ.82VCH3EqJXXfdR08i_pxr7yafb1gNunLd6wEomRcfVM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function activateDriver() {
    const email = '8335@packsecure.com';

    console.log(`Activating user: ${email}...`);

    // 1. Update public table directly using Service Role
    const { data, error } = await supabase
        .from('users_public')
        .update({ status: 'Active' })
        .eq('email', email)
        .select();

    if (error) {
        console.error('Error updating status:', error);
        return;
    }

    if (data.length === 0) {
        console.log('No user found to activate.');
    } else {
        console.log('Success! Account activated:', data[0]);
    }
}

activateDriver();
