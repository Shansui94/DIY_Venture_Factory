
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const keepIds = [
    'N1-M01',
    'N2-M02',
    'T1.1-M03',
    'T1.2-M01',
    'T1.3-M02'
];

async function cleanup() {
    console.log(`Targeting to keep only: ${keepIds.join(', ')}`);

    // 1. Fetch all
    const { data: all, error: fetchErr } = await supabase.from('sys_machines_v2').select('machine_id');
    if (fetchErr) {
        console.error('Fetch error:', fetchErr);
        return;
    }

    if (!all || all.length === 0) {
        console.log('No machines found in DB.');
        return;
    }

    // 2. Identify to delete
    const toDelete = all
        .map(m => m.machine_id)
        .filter(id => !keepIds.includes(id));

    console.log(`Found ${toDelete.length} machines to delete.`);

    if (toDelete.length === 0) {
        console.log('No extra machines to delete.');
        return;
    }

    // 3. Delete
    const { error: delErr, count } = await supabase
        .from('sys_machines_v2')
        .delete({ count: 'exact' })
        .in('machine_id', toDelete);

    if (delErr) {
        console.error('Delete error:', delErr);
    } else {
        console.log(`✅ Supabase reported success. Rows deleted: ${count}`);
        if (count === 0) {
            console.error("⚠️  Zero rows deleted. This implies RLS is blocking the delete operation.");
            console.error("   Solution: Run the following SQL in Supabase Dashboard SQL Editor:");
            console.log(`   DELETE FROM sys_machines_v2 WHERE machine_id NOT IN ('${keepIds.join("', '")}');`);
        }
    }
}

cleanup();
