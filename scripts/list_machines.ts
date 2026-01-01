
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (process.env.DEBUG) {
    console.log('Available Env Vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('VITE')));
}

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials. URL:', !!supabaseUrl, 'Key:', !!supabaseServiceKey);
    // process.exit(1); 
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listMachines() {
    console.log('Fetching machines from sys_machines_v2...');
    const { data, error } = await supabase
        .from('sys_machines_v2')
        .select('*')
        .order('machine_id');

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No machines found.');
        return;
    }

    console.table(data);
}

listMachines();
