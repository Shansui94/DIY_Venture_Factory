
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("❌ Missing Env Vars");
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function categorize() {
    console.log("🏷️  Categorizing Products...");

    const updates = [
        { cat: 'Packaging', filter: (sku: string) => sku.startsWith('AIRTUBE') },
        { cat: 'Trading', filter: (sku: string) => sku.startsWith('CUKUPP') && sku.includes('TAPE') },
        { cat: 'Bag', filter: (sku: string) => sku.startsWith('CUKUPP') && !sku.includes('TAPE') },
        { cat: 'Trading', filter: (sku: string) => sku.startsWith('AWB') },
        {
            cat: 'StretchFilm', filter: (sku: string) =>
                sku.startsWith('SF-') ||
                sku.startsWith('SL-') ||
                sku.startsWith('DL-') ||
                sku.startsWith('HITAM') ||
                ['MERAH', 'OREN', 'SILVER-GREY'].includes(sku)
        }
    ];

    // Fetch all items
    const { data: items, error } = await supabaseAdmin.from('master_items_v2').select('sku');
    if (error) {
        console.error("Error fetching items:", error);
        return;
    }

    let count = 0;
    for (const item of items) {
        let newCat = 'Uncategorized';
        for (const rule of updates) {
            if (rule.filter(item.sku)) {
                newCat = rule.cat;
                break;
            }
        }

        if (newCat !== 'Uncategorized') {
            await supabaseAdmin.from('master_items_v2').update({ category: newCat }).eq('sku', item.sku);
            process.stdout.write('.'); // Progress dot
            count++;
        }
    }

    console.log(`\n✅ Updated categories for ${count} products.`);
}

categorize();
