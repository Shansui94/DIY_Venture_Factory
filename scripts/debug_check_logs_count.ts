
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use SERVICE ROLE KEY to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Service Role Key");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
    console.log("Checking total log count via Service Role (Bypassing RLS)...");

    // 1. Total Count
    const { count, error } = await supabase
        .from('production_logs')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error counting logs:", error);
        return;
    }
    console.log(`Total Logs in DB: ${count}`);

    // 2. Oldest Log
    const { data: oldest } = await supabase
        .from('production_logs')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1);

    console.log(`Oldest Log Date: ${oldest?.[0]?.created_at || 'None'}`);

    // 3. Newest Log
    const { data: newest } = await supabase
        .from('production_logs')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

    console.log(`Newest Log Date: ${newest?.[0]?.created_at || 'None'}`);

    // 4. Count logs older than 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { count: oldLogsCount } = await supabase
        .from('production_logs')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', threeDaysAgo.toISOString());

    console.log(`Logs older than 3 days: ${oldLogsCount}`);

    // 5. Group by Date Distribution
    console.log("\n--- Log Distribution by Date ---");
    const { data: logs } = await supabase
        .from('production_logs')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(5000); // Check the sample

    if (logs) {
        const counts: Record<string, number> = {};
        logs.forEach(l => {
            const date = l.created_at.split('T')[0];
            counts[date] = (counts[date] || 0) + 1;
        });
        console.table(counts);
    }
}

checkLogs();
