
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MACHINE_ID = 'T1.2-M01'; // Target Machine
const TIME_WINDOW_MINUTES = 60; // Look back 1 hour to see the flush happening

async function checkLiveStatus() {
    // console.log(`Checking logs for ${MACHINE_ID} in last ${TIME_WINDOW_MINUTES} mins...`);

    const timeThreshold = new Date(Date.now() - TIME_WINDOW_MINUTES * 60 * 1000).toISOString();

    const { data: logs, error } = await supabase
        .from('production_logs')
        .select('*')
        .eq('machine_id', MACHINE_ID)
        .gte('created_at', timeThreshold)
        .order('created_at', { ascending: false }) // Newest first
        .limit(10);

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    console.log(`LOGS DUMP (${logs?.length || 0} found):`);
    logs?.forEach(log => {
        // Convert URI time to Local
        const localTime = new Date(log.created_at).toLocaleString();
        console.log(`${localTime} | Count: ${log.alarm_count} | SKU: ${log.product_sku || 'NULL'}`);
    });
}

checkLiveStatus();
