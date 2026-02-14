
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const LOG_FILE = 'debug_output.txt';

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function debugLogin() {
    fs.writeFileSync(LOG_FILE, '--- Debugging User Login (8335 / maxtan) ---\n');

    try {
        // 1. Check Max Tan by name
        log('\n--- Searching for name "Max" ---');
        const { data: nameUsers, error: nameError } = await supabase
            .from('sys_users_v2')
            .select('*')
            .ilike('name', '%max%');

        if (nameError) log('Error fetching by name: ' + JSON.stringify(nameError));
        else {
            log(`Found ${nameUsers.length} users with name "Max":`);
            nameUsers.forEach(u => log(JSON.stringify(u, null, 2)));
        }

        // 2. Check PIN 8335
        log('\n--- Searching for PIN "8335" ---');
        const { data: pinUsers, error: pinError } = await supabase
            .from('sys_users_v2')
            .select('*')
            .eq('pin_code', '8335');

        if (pinError) log('Error fetching by PIN: ' + JSON.stringify(pinError));
        else {
            log(`Found ${pinUsers.length} users with PIN "8335":`);
            pinUsers.forEach(u => log(JSON.stringify(u, null, 2)));
        }

    } catch (err) {
        log("Unexpected error: " + err);
    }
}

debugLogin();
