
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SERVICE_ROLE_KEY!; // Using SERVICE ROLE to bypass RLS for check
const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY!); // Using ANON to test RLS

async function checkAccess() {
    console.log("Checking 'items' table...");

    // 1. Admin/Service Role Check (Should always work)
    const adminClient = createClient(supabaseUrl, supabaseKey);
    const { data: adminData, error: adminError, count } = await adminClient
        .from('items')
        .select('*', { count: 'exact', head: true });

    if (adminError) {
        console.error("SERVICE ROLE Error:", adminError);
    } else {
        console.log(`SERVICE ROLE: Found ${count} items in DB.`);
    }

    // 2. Public/Anon Check (Simulating Frontend)
    const { data: publicData, error: publicError } = await supabaseAnon
        .from('items')
        .select('id, sku')
        .limit(5);

    if (publicError) {
        console.error("ANON CLIENT Error (RLS Issue?):", publicError);
    } else {
        console.log(`ANON CLIENT: Success! Retrieved ${publicData?.length} items.`);
    }
}

checkAccess();
