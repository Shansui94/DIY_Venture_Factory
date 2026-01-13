
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SERVICE_ROLE_KEY!; // Use service role to see everything
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('production_logs_v2')
        .select('operator_id');

    if (error) {
        console.error(error);
        return;
    }

    const unique = [...new Set(data.map(d => d.operator_id))];
    console.log("Unique Operators found:", unique);
}

check();
