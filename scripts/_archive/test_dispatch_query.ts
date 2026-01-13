
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SERVICE_ROLE_KEY);

async function testQuery() {
    console.log("Testing Dispatch Query...");
    try {
        const { data, error } = await supabase
            .from('sales_orders')
            .select('*, sys_customers(lat, lng)')
            .limit(1);

        if (error) {
            console.error("❌ Query Failed (Expected):", error.message);
        } else {
            console.log("✅ Query Succeeded (Unexpected). Rows:", data.length);
        }
    } catch (e) {
        console.error("❌ Exception:", e);
    }
}

testQuery();
