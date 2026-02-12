
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugTables() {
    console.log('--- Debugging Users Tables ---');

    const email = 'neosonchun@gmail.com';

    // 1. users_public
    const { data: publicUser, error: err1 } = await supabase
        .from('users_public')
        .select('*')
        .eq('email', email)
        .single();
    console.log('users_public:', publicUser || err1);

    // 2. sys_users_v2
    const { data: v2User, error: err2 } = await supabase
        .from('sys_users_v2')
        .select('*')
        .eq('email', email)
        .single();
    console.log('sys_users_v2:', v2User || err2);

    // 3. Check for 'profiles' table?
    const { data: profiles, error: err3 } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
    if (!err3) console.log('profiles:', profiles);
    else console.log('profiles table check:', err3.message);

    // 4. Check for 'sys_users' (v1) table?
    const { data: v1User, error: err4 } = await supabase
        .from('sys_users')
        .select('*')
        .eq('email', email)
        .single();
    if (!err4) console.log('sys_users:', v1User);
    else console.log('sys_users table check:', err4.message);

}

debugTables();
