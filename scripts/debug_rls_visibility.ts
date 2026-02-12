
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugRLS() {
    console.log('--- Debugging RLS Visibility ---');

    // 1. Sign in as a dummy driver (using credentials from previous scripts)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: '8335@packsecure.com',
        password: '83358335'
    });

    if (authError) {
        console.error('Login failed:', authError.message);
        return;
    }
    console.log('Logged in as:', authData.user?.email);

    // 2. Try to fetch neoson from users_public
    const { data: publicUser, error: err1 } = await supabase
        .from('users_public')
        .select('id, name, email, role')
        .eq('email', 'neosonchun@gmail.com');

    console.log('users_public fetch result:', publicUser?.length ? publicUser : 'EMPTY (Blocked by RLS?)');
    if (err1) console.error(err1);

    // 3. Try to fetch from sys_users_v2
    const { data: v2User, error: err2 } = await supabase
        .from('sys_users_v2')
        .select('*')
        .eq('email', 'neosonchun@gmail.com');

    console.log('sys_users_v2 fetch result:', v2User?.length ? v2User : 'EMPTY (Blocked by RLS?)');
    if (err2) console.error(err2);
}

debugRLS();
