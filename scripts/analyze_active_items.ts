
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function analyzeItems() {
    console.log('Fetching all active items...');
    const { data: items, error } = await supabase
        .from('master_items_v2')
        .select('*')
        .eq('status', 'Active')
        .order('sku');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`\nTotal Active Items: ${items.length}`);

    // 1. Group by Type
    const byType = items.reduce((acc, item) => {
        acc[item.type || 'Unknown'] = (acc[item.type || 'Unknown'] || 0) + 1;
        return acc;
    }, {});
    console.log('\n--- Distribution by Type ---');
    console.table(byType);

    // 2. Group by Category
    const byCat = items.reduce((acc, item) => {
        acc[item.category || 'Unknown'] = (acc[item.category || 'Unknown'] || 0) + 1;
        return acc;
    }, {});
    console.log('\n--- Distribution by Category ---');
    console.table(byCat);

    // 3. Detect Potential Issues
    const missingName = items.filter(i => !i.name).length;
    const missingUOM = items.filter(i => !i.uom).length;
    const zeroWeight = items.filter(i => !i.net_weight_kg || i.net_weight_kg === 0).length;

    console.log('\n--- Data Quality Issues ---');
    console.log(`Missing Name: ${missingName}`);
    console.log(`Missing UOM: ${missingUOM}`);
    console.log(`No Net Weight: ${zeroWeight}`);

    // 4. Sample Listing
    console.log('\n--- Sample Items (First 20) ---');
    // Simple table with key fields
    const tableData = items.slice(0, 20).map(i => ({
        sku: i.sku,
        name: i.name?.substring(0, 30), // truncated
        type: i.type,
        category: i.category,
        uom: i.uom
    }));
    console.table(tableData);
}

analyzeItems();
