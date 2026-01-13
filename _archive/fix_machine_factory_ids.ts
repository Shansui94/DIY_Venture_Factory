
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use Service Key for update if possible, else fallback to anon (RLS might block update if anon)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const updates = [
    { id: 'N1-M01', factory: 'N1' },
    { id: 'N2-M02', factory: 'N2' },
    { id: 'T1.1-M03', factory: 'T1' },
    { id: 'T1.2-M01', factory: 'T1' },
    { id: 'T1.3-M02', factory: 'T1' }
];

async function fixFactoryIds() {
    console.log('Starting Factory ID Fix...');

    for (const update of updates) {
        console.log(`Updating ${update.id} to factory ${update.factory}...`);
        const { error } = await supabase
            .from('sys_machines_v2')
            .update({ factory_id: update.factory })
            .eq('machine_id', update.id);

        if (error) {
            console.error(`❌ Error updating ${update.id}:`, error.message);
        } else {
            console.log(`✅ Updated ${update.id}`);
        }
    }

    console.log('Fix complete. Please check Dashboard.');
}

fixFactoryIds();
