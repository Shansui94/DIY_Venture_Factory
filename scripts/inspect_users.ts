
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectTables() {
    console.log('Inspecting sys_users_v2...');
    const { data: v2, error: v2Error } = await supabase.from('sys_users_v2').select('*').limit(1);
    if (v2 && v2.length > 0) console.log('sys_users_v2 cols:', Object.keys(v2[0]));

    console.log('Inspecting users_public...');
    const { data: pub, error: pubError } = await supabase.from('users_public').select('*').limit(1);
    if (pub && pub.length > 0) console.log('users_public cols:', Object.keys(pub[0]));
}

inspectTables();
