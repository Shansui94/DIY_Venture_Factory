import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
    console.log("Checking database...");
    const { error } = await supabase.from('iot_device_configs').select('*').limit(1);
    if (error) {
        console.log("RESULT: TABLE_MISSING", error.message);
    } else {
        console.log("RESULT: TABLE_EXISTS");
    }
}
check();
