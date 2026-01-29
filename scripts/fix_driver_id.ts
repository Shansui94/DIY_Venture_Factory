
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdahubyhwndgyloaljak.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4Njg4OSwiZXhwIjoyMDgwOTYyODg5fQ.82VCH3EqJXXfdR08i_pxr7yafb1gNunLd6wEomRcfVM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDriverID() {
    const email = '8335@packsecure.com';
    const id = '8335';

    console.log(`Fixing Employee ID for: ${email}...`);

    const { data, error } = await supabase
        .from('users_public')
        .update({ employee_id: id })
        .eq('email', email)
        .select();

    if (error) {
        console.error('Error updating ID:', error);
        return;
    }

    console.log('Success! Updated Employee ID:', data[0]);
}

fixDriverID();
