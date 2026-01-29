
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdahubyhwndgyloaljak.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4Njg4OSwiZXhwIjoyMDgwOTYyODg5fQ.82VCH3EqJXXfdR08i_pxr7yafb1gNunLd6wEomRcfVM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser() {
    const email = '8335@packsecure.com';
    console.log(`Checking user: ${email}...`);

    const { data, error } = await supabase
        .from('users_public')
        .select('*')
        .eq('email', email);

    if (error) {
        console.error('Error fetching user:', error);
        return;
    }

    if (data.length === 0) {
        console.log('User NOT FOUND in users_public!');
    } else {
        console.log('User found:', data[0]);
        console.log('Employee ID:', data[0].employee_id);
    }
}

checkUser();
