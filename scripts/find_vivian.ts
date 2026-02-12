
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findVivian() {
    console.log('--- Listing Users to find Vivian ---');

    const { data, error } = await supabase
        .from('users_public')
        .select('id, name, email, role')
        .ilike('name', '%vivian%'); // Case insensitive search for Vivian

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Found users matching "Vivian":', data);

        // Also check for 'neoson' again just to be sure it looks correct from Anon perspective
        const { data: neoson } = await supabase
            .from('users_public')
            .select('id, name, email, role')
            .eq('email', 'neosonchun@gmail.com');
        console.log('Neoson status from Anon:', neoson);
    }
}

findVivian();
