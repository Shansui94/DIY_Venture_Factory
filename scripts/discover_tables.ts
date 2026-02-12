
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function discover() {
    console.log('--- Discovering Tables ---');

    // We can't query information_schema easily with js client sometimes, 
    // but we can try basic fetches on likely candidates

    const candidates = ['users', 'user_profiles', 'employees', 'staff', 'members', 'sys_users_v1'];

    for (const table of candidates) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (!error) {
            console.log(`✅ Table '${table}' exists!`);
        } else {
            // console.log(`X Table '${table}' error:`, error.message);
        }
    }
}

discover();
