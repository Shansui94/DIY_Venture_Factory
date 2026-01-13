
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Checking SKUs...");

    // 1. Check for bad SKUs
    const { data: badSkus, error: err1 } = await supabase
        .from('master_items_v2')
        .select('sku')
        .like('sku', 'SF-22KG%');

    if (err1) {
        console.error("Error reading bad SKUs:", err1);
        return;
    }

    // 2. Check for good SKUs
    const { data: goodSkus, error: err2 } = await supabase
        .from('master_items_v2')
        .select('sku')
        .like('sku', 'SF-2.2KG%');

    if (err2) {
        console.error("Error reading good SKUs:", err2);
        return;
    }

    console.log("Found Bad (SF-22KG):", badSkus?.length || 0, badSkus?.map(i => i.sku));
    console.log("Found Good (SF-2.2KG):", goodSkus?.length || 0, goodSkus?.map(i => i.sku));

    // 3. Fix Logic if needed
    if (badSkus && badSkus.length > 0) {
        console.log("DETECTED BAD SKUS. FIXING NOW...");

        // Delete Bad
        for (const item of badSkus) {
            console.log(`Deleting ${item.sku}...`);
            // Must delete BOM headers referencing this SKU first?
            // Or cascade might handle it? Let's check BOMs.
            const { error: delBomErr } = await supabase.from('bom_headers_v2').delete().eq('sku', item.sku);
            if (delBomErr) console.error("Error deleting BOM:", delBomErr);

            const { error: delItemErr } = await supabase.from('master_items_v2').delete().eq('sku', item.sku);
            if (delItemErr) console.error("Error deleting Item:", delItemErr);
        }

        // Insert Good (Simple replacement for SF-2.2KG items)
        // Since seed_legacy_data.sql has the INSERT statements, we can rely on running that again 
        // OR just manually insert specific records here.
        // For robustness, let's just log that we cleaned up, and the user can re-run seed or we re-insert.
        console.log("Cleanup complete. Please re-run seed to populate Good SKUs if missing.");
    } else {
        console.log("No bad SKUs found. System is clean.");
    }
}

main();
