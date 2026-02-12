
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listManagers() {
    console.log('Fetching users with role "Manager"...');

    // Try 'Manager' (Capitalized) as seen in types/index.ts
    const { data, error } = await supabase
        .from('sys_users_v2')
        .select('id, name, email, role, status')
        .eq('role', 'Manager');

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data.length === 0) {
        console.log('No managers found. Checking for "manager" (lowercase)...');
        const { data: lowerData, error: lowerError } = await supabase
            .from('sys_users_v2')
            .select('id, name, email, role, status')
            .eq('role', 'manager');

        if (lowerData && lowerData.length > 0) {
            console.table(lowerData);
        } else {
            console.log('No managers found with lowercase either.');
            // List distinct roles to see what's available
            const { data: roles } = await supabase.from('sys_users_v2').select('role');
            const uniqueRoles = [...new Set(roles?.map(r => r.role))];
            console.log('Available roles:', uniqueRoles);
        }
    } else {
        console.table(data);
    }
}

listManagers();
