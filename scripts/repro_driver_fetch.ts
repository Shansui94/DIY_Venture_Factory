
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function repro() {
    console.log('--- Testing Driver Query ---');

    // The exact query used in frontend
    const { data, error } = await supabase
        .from('users_public')
        .select('id, name, email, role')
        .or('role.eq.Driver,email.eq.neosonchun@gmail.com');

    if (error) {
        console.error('Query Error:', error);
    } else {
        console.log(`Found ${data?.length} users.`);
        const neoson = data?.find(u => u.email === 'neosonchun@gmail.com');
        if (neoson) {
            console.log('✅ Found match:', neoson);
        } else {
            console.log('❌ NOT FOUND: neosonchun@gmail.com');
            console.log('Sample of users found:', data?.slice(0, 3));
        }
    }

    // Double check basic fetch of that user
    console.log('\n--- Direct User Fetch Check ---');
    const { data: directUser } = await supabase
        .from('users_public')
        .select('id, name, email, role')
        .eq('email', 'neosonchun@gmail.com')
        .single();

    console.log('Direct fetch result:', directUser);

}

repro();
