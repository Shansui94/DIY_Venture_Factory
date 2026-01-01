
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('items')
        .select('sku, name')
        .limit(5);

    if (error) {
        console.error(error);
        return;
    }

    console.log("Sample SKUs:");
    data.forEach(d => console.log(`${d.sku} (${d.name})`));
}

check();
