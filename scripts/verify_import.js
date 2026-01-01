import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function verifyImport() {
    console.log('--- Verifying Data Import ---');

    // 1. Total Count
    const { count, error: countErr } = await supabase
        .from('master_items_v2')
        .select('*', { count: 'exact', head: true });

    if (countErr) {
        console.error('Error fetching count:', countErr);
        return;
    }
    console.log(`Total Items: ${count}`);

    // 2. Count by Category & Supply Type (Manual Grouping since client doesn't do group by easily)
    const { data, error } = await supabase
        .from('master_items_v2')
        .select('category, supply_type');

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    const report = {};

    data.forEach(item => {
        const key = `${item.category || 'Unknown'} | ${item.supply_type || 'Unknown'}`;
        report[key] = (report[key] || 0) + 1;
    });

    console.log('\n--- Breakdown by Category | Supply Type ---');
    console.table(report);

    // 3. Check specific Manufacturing items (BubbleWrap & StretchFilm)
    const manufactured = data.filter(d => d.supply_type === 'Manufactured');
    console.log(`\nTotal Manufactured Items: ${manufactured.length}`);

    const nonCompliant = manufactured.filter(d =>
        d.category !== 'BubbleWrap' && d.category !== 'StretchFilm'
    );

    if (nonCompliant.length > 0) {
        console.error('WARNING: Found Manufactured items that are NOT BW or SF:', nonCompliant);
    } else {
        console.log('SUCCESS: Only BW and SF are set as Manufactured.');
    }
}

verifyImport();
