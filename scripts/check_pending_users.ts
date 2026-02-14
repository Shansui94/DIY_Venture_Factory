
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const LOG_FILE = 'pending_users_report.txt';

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function checkPendingUsers() {
    fs.writeFileSync(LOG_FILE, '--- Scanning users_public for Pending status ---\n');
    log('--- Scanning users_public for Pending status ---');

    // Fetch users where status is 'Pending'
    const { data: pendingUsers, error } = await supabase
        .from('users_public')
        .select('*')
        .eq('status', 'Pending');

    if (error) {
        log("Error fetching pending users: " + error.message);
        return;
    }

    if (pendingUsers.length === 0) {
        log("✅ No users found with 'Pending' status in users_public.");
    } else {
        log(`\n⚠️ Found ${pendingUsers.length} users stuck in 'Pending':`);
        pendingUsers.forEach(u => {
            log(`- ${u.name || 'Unnamed'} (${u.email}) | Role: ${u.role} | ID: ${u.id}`);
        });
    }

    // Also check for 'Rejected' just in case
    const { data: rejectedUsers } = await supabase
        .from('users_public')
        .select('*')
        .eq('status', 'Rejected');

    if (rejectedUsers && rejectedUsers.length > 0) {
        log(`\n❌ Found ${rejectedUsers.length} users with 'Rejected' status:`);
        rejectedUsers.forEach(u => {
            log(`- ${u.name || 'Unnamed'} (${u.email}) | Role: ${u.role}`);
        });
    }
}

checkPendingUsers();
