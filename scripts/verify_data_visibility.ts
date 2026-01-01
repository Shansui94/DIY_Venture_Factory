
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceKey = process.env.VITE_SERVICE_ROLE_KEY || ''; // Must have this
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const adminClient = createClient(supabaseUrl, serviceKey);
const userClient = createClient(supabaseUrl, anonKey);

async function diagnose() {
    console.log("--- DIAGNOSTICS: production_logs_v2 ---");

    // 1. Check Total Count (Admin)
    const { count: totalCount, error: adminError } = await adminClient
        .from('production_logs_v2')
        .select('*', { count: 'exact', head: true });

    if (adminError) console.error("Admin Check Failed:", adminError.message);
    else console.log(`[Admin/ServiceRole] Total Rows in DB: ${totalCount}`);

    // 2. Check Visible Count (Anon)
    const { count: visibleCount, error: userError } = await userClient
        .from('production_logs_v2')
        .select('*', { count: 'exact', head: true });

    if (userError) console.error("User Check Failed:", userError.message);
    else console.log(`[User/Anon] Visible Rows: ${visibleCount}`);

    // 3. List recent 5 rows (Admin) to check Operator IDs
    if (totalCount && totalCount > 0) {
        const { data: logs } = await adminClient
            .from('production_logs_v2')
            .select('log_id, operator_id, created_at')
            .order('created_at', { ascending: false })
            .limit(5);
        console.table(logs);
    }
}

diagnose();
