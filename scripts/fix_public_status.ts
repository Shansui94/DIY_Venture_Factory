
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixPublicStatus() {
    console.log('--- Fixing users_public status for 8335 ---');

    const email = '8335@packsecure.com';

    // Update status to Active
    const { data, error } = await supabase
        .from('users_public')
        .update({ status: 'Active' })
        .eq('email', email)
        .select();

    if (error) {
        console.error("Error updating users_public:", error);
    } else {
        console.log("Success! Updated user:", data);
    }
}

fixPublicStatus();
