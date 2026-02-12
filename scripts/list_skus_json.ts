
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Manually load .env from parent directory or current directory
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    // Try to find them in vite-env.d.ts or similar? No, let's just fail.
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listSkus() {
    console.log('Fetching SKUs...');
    const { data, error } = await supabase
        .from('master_items_v2')
        .select('sku, name, type, category, status')
        .limit(20);

    if (error) {
        console.error('Error fetching SKUs:', error);
        return;
    }

    if (data.length === 0) {
        console.log('No SKUs found in master_items_v2.');
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

listSkus();
