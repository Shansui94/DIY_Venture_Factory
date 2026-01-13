
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("🔍 Checking latest signal in Database...");
    const { data, error } = await supabase
        .from('production_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error("❌ DB Error:", error.message);
        return;
    }

    if (data && data.length > 0) {
        const latest = data[0];
        const logTime = new Date(latest.created_at);
        const now = new Date();
        const diffSeconds = (now.getTime() - logTime.getTime()) / 1000;

        console.log(`\n📅 Latest Record Time: ${logTime.toLocaleTimeString()} (Active SKU: ${latest.product_sku})`);

        if (diffSeconds < 60) {
            console.log(`✅ SUCCESS! Signal received ${Math.round(diffSeconds)} seconds ago.`);
            console.log(`   Count Added: ${latest.alarm_count}`);
        } else {
            console.log(`⚠️ No new signal. Last one was ${Math.round(diffSeconds)} seconds ago.`);
        }
    } else {
        console.log("⚠️ No logs found at all.");
    }
}

check();
