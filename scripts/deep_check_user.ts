
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const LOG_FILE = 'deep_check_output.txt';

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function deepCheck() {
    fs.writeFileSync(LOG_FILE, '--- Deep Check for 8335 ---\n');
    log('--- Deep Check for 8335 ---');

    const email = '8335@packsecure.com';
    const targetId = '45673d8c-787e-4c6e-9743-4b2b95f1cf51'; // From previous checks

    // 1. check users_public by EMAIL
    log('\n[users_public] Searching by Email: ' + email);
    const { data: pubByEmail, error: pubEmailErr } = await supabase
        .from('users_public')
        .select('*')
        .eq('email', email);

    if (pubEmailErr) log('Error: ' + pubEmailErr.message);
    else {
        log(`Found ${pubByEmail.length} records.`);
        pubByEmail.forEach(u => log(JSON.stringify(u, null, 2)));
    }

    // 2. check users_public by ID
    log('\n[users_public] Searching by ID: ' + targetId);
    const { data: pubById, error: pubIdErr } = await supabase
        .from('users_public')
        .select('*')
        .eq('id', targetId);

    if (pubIdErr) log('Error: ' + pubIdErr.message);
    else {
        log(`Found ${pubById.length} records.`);
        pubById.forEach(u => log(JSON.stringify(u, null, 2)));
    }

    // 3. check sys_users_v2 by ID
    log('\n[sys_users_v2] Searching by ID: ' + targetId);
    const { data: sysById, error: sysIdErr } = await supabase
        .from('sys_users_v2')
        .select('*')
        .eq('auth_user_id', targetId); // Check foreign key mapping? Or primary ID? 
    // sys_users_v2 usually has its own UUID, trying to find mapping.

    // Let's try matching email in sys_users_v2
    const { data: sysByEmail, error: sysEmailErr } = await supabase
        .from('sys_users_v2')
        .select('*')
        .eq('email', email);

    if (sysEmailErr) log('Error: ' + sysEmailErr.message);
    else {
        log(`Found ${sysByEmail.length} records in sys_users_v2.`);
        sysByEmail.forEach(u => log(JSON.stringify(u, null, 2)));
    }
}

deepCheck();
