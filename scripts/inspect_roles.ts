
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectRoles() {
    const { data, error } = await supabase.from('sys_users_v2').select('role, name');
    if (error) {
        console.error(error);
        return;
    }

    // Group by role
    const groups = {};
    data.forEach(u => {
        const r = u.role || 'NULL';
        if (!groups[r]) groups[r] = [];
        groups[r].push(u.name);
    });

    console.log('--- User Roles Distribution ---');
    for (const [role, names] of Object.entries(groups)) {
        console.log(`Role: ${role} (${names.length})`);
        console.log(`  - Sample: ${names.slice(0, 5).join(', ')}`);
    }
}

inspectRoles();
