import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
    console.log('Checking for cutting_size column...');
    const { data, error } = await supabase.from('machine_active_products').select('cutting_size').limit(1);
    if (error) {
        if (error.message.includes('column "cutting_size" does not exist')) {
            console.log('❌ Column cutting_size does NOT exist.');
        } else {
            console.log('Error:', error.message);
        }
    } else {
        console.log('✅ Column cutting_size exists!');
    }
}
run();
