
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const LOG_FILE = 'check_public_output.txt';

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function checkPublicUser() {
    fs.writeFileSync(LOG_FILE, '--- Checking users_public for 8335 ---\n');
    log('--- Checking users_public for 8335 ---');

    // 1. Search by email
    const email = '8335@packsecure.com';
    const { data: byEmail, error: emailError } = await supabase
        .from('users_public')
        .select('*')
        .eq('email', email);

    if (emailError) log('Error fetching by email: ' + emailError.message);
    else {
        log(`\nFound ${byEmail.length} users in users_public by email:`);
        byEmail.forEach(u => log(JSON.stringify(u, null, 2)));
    }

    // 2. Search by Auth ID (from previous debug: 45673d8c-787e-4c6e-9743-4b2b95f1cf51)
    const authId = '45673d8c-787e-4c6e-9743-4b2b95f1cf51';
    log(`\nChecking ID: ${authId}`);
    const { data: byId, error: idError } = await supabase
        .from('users_public')
        .select('*')
        .eq('id', authId);

    if (idError) log('Error fetching by ID: ' + idError.message);
    else {
        log(`Found ${byId.length} users in users_public by ID:`);
        byId.forEach(u => log(JSON.stringify(u, null, 2)));
    }
}

checkPublicUser();
