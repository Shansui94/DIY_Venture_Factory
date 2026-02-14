
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setPin() {
    console.log('--- Setting PIN 8335 for maxtan ---');

    const userId = "38f575dd-8339-470a-b1cf-1b9796606886"; // Retrieved from debug log

    // 1. Update sys_users_v2
    const { data, error } = await supabase
        .from('sys_users_v2')
        .update({ pin_code: '8335' })
        .eq('id', userId)
        .select();

    if (error) {
        console.error("Error updating sys_users_v2:", error);
    } else {
        console.log("Success! Updated user:", data);
    }
}

setPin();
