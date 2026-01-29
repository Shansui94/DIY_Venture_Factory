
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdahubyhwndgyloaljak.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4Njg4OSwiZXhwIjoyMDgwOTYyODg5fQ.82VCH3EqJXXfdR08i_pxr7yafb1gNunLd6wEomRcfVM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createDriver() {
    const email = '8335@packsecure.com';
    const password = '83358335'; // Min 6 chars
    const name = 'maxtan';
    const id = '8335'; // Employee ID

    console.log(`Creating user: ${name} (${email})...`);

    const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
            name: name,
            role: 'Driver',
            employee_id: id,
            status: 'Active' // For Online/Offline logic
        }
    });

    if (error) {
        console.error('Error creating user:', error);
        return;
    }

    console.log('User created successfully:', data.user);
}

createDriver();
