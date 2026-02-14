
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function forceSync() {
    console.log('--- Force Syncing Status for 8335 ---');

    const userId = "38f575dd-8339-470a-b1cf-1b9796606886"; // From deep check

    // 1. Set to Inactive
    console.log("Setting to Inactive...");
    const { error: err1 } = await supabase
        .from('sys_users_v2')
        .update({ status: 'Inactive' })
        .eq('id', userId);

    if (err1) console.error("Error setting Inactive:", err1);

    // Wait 2 seconds
    await new Promise(r => setTimeout(r, 2000));

    // 2. Set back to Active
    console.log("Setting back to Active...");
    const { data, error: err2 } = await supabase
        .from('sys_users_v2')
        .update({ status: 'Active' })
        .eq('id', userId)
        .select();

    if (err2) {
        console.error("Error setting Active:", err2);
    } else {
        console.log("Success! Updated sys_users_v2:", data);
    }
}

forceSync();
