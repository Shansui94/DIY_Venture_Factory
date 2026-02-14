
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const LOG_FILE = 'audit_results.txt';

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function auditUsers() {
    fs.writeFileSync(LOG_FILE, '--- Auditing User Accounts ---\n');
    log('--- Auditing User Accounts ---');

    // Fetch all active users
    const { data: users, error } = await supabase
        .from('sys_users_v2')
        .select('*')
        .eq('status', 'Active');

    if (error) {
        log("Error fetching users: " + error.message);
        return;
    }

    log(`Scanned ${users.length} active users.\n`);

    const missingPin: any[] = [];
    const mismatchedPin: any[] = [];

    users.forEach(u => {
        // Check 1: Missing PIN
        if (!u.pin_code || u.pin_code.trim() === '') {
            missingPin.push(u);
            return;
        }

        // Check 2: Numeric Email vs PIN mismatch (e.g. 8335@... vs PIN 1234)
        // Check if email starts with 4 digits
        const emailMatch = u.email.match(/^(\d{4})@/);
        if (emailMatch) {
            const expectedPin = emailMatch[1];
            if (u.pin_code !== expectedPin) {
                // Ignore if it's admin or some other role? No, let's flag all mismatches.
                mismatchedPin.push({ ...u, expectedPin });
            }
        }
    });

    // REPORT
    if (missingPin.length > 0) {
        log(`\n❌ [CRITICAL] ${missingPin.length} Users Missing PIN:`);
        missingPin.forEach(u => {
            log(`   - ${u.name} (${u.role}) | Email: ${u.email} | ID: ${u.id}`);
        });
    }

    if (mismatchedPin.length > 0) {
        log(`\n⚠️ [WARNING] ${mismatchedPin.length} Users with PIN Mismatch (Email ID vs PIN):`);
        mismatchedPin.forEach(u => {
            log(`   - ${u.name} (${u.role}) | Email: ${u.email} | Current PIN: ${u.pin_code} | Expected: ${u.expectedPin}`);
        });
    }

    if (missingPin.length === 0 && mismatchedPin.length === 0) {
        log("\n✅ All active users look good!");
    } else {
        log("\n--- Audit Complete ---");
    }
}

auditUsers();
