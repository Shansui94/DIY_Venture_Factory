
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function forceUpdate() {
    console.log('Attemping to update name for neosonchun@gmail.com...');

    // Try updating users_public directly
    const { data, error } = await supabase
        .from('users_public')
        .update({ name: 'Neoson Chun' })
        .eq('email', 'neosonchun@gmail.com')
        .select();

    if (error) {
        console.error('Update Error:', error);
    } else {
        console.log('Update Result:', data);
    }
}

forceUpdate();
