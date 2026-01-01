
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
// We use ANON key to simulate the user's client-side restriction
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, anonKey);

async function testInsert() {
    console.log("TEST: Attempting INSERT into sys_users_v2 as Anon/Authenticated...");

    // 1. Need a fake Auth User ID (mocking the context)
    // In a real scenario, the user is logged in. 
    // We can't easily mock "being logged in" without signing in.
    // So we'll try to sign in first if possible, or just fail if we can't.
    // AS A FALLBACK: We will use Service Role to create a dummy Auth user, then sign in as them? 
    // Too complex.

    // SIMPLER TEST: Just try to insert. If RLS is "Allow All", it should work even for anon or random UUID if logic allows.
    // If the policy requires "auth.uid() = auth_user_id", we can't test it easily without a real token.

    // HOWEVER, if the previous policy was "FOR ALL USING (true)", it *should* allow anyone.

    const randomId = crypto.randomUUID();
    const { data, error } = await supabase
        .from('sys_users_v2')
        .insert({
            auth_user_id: randomId, // Random UUID
            employee_id: `TEST-${Date.now()}`,
            name: 'Debug User',
            role: 'Operator',
            status: 'Active'
        })
        .select();

    if (error) {
        console.error("❌ INSERT FAILED:", error);
        console.log("Reason: Likely RLS blocking INSERT.");
    } else {
        console.log("✅ INSERT SUCCESS:", data);
    }
}

testInsert();
