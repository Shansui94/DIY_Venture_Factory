
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkNoise() {
    console.log("🔍 Fetching last 20 logs to analyze pattern...");
    const { data, error } = await supabase
        .from('production_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No logs found.");
        return;
    }

    console.log(`\nFound ${data.length} recent logs:`);
    console.table(data.map(d => ({
        time: new Date(d.created_at).toLocaleTimeString(),
        ms: new Date(d.created_at).getMilliseconds(),
        count: d.alarm_count,
        machine: d.machine_id
    })));

    // Calculate intervals
    for (let i = 0; i < data.length - 1; i++) {
        const curr = new Date(data[i].created_at).getTime();
        const prev = new Date(data[i + 1].created_at).getTime();
        const diff = curr - prev;
        if (diff < 1000) {
            console.log(`⚠️ WARNING: Rapid fire detected! Interval: ${diff}ms between rows ${i} and ${i + 1}`);
        }
    }
}

checkNoise();
