
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
    const sqlPath = path.join(process.cwd(), 'scripts', 'seed_dummy_recipes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Running SQL Seeder...");

    // Using a simpler approach: Splitting creates and inserts might be complex via RPC if we don't have a direct runner.
    // However, the DO $$ block is a single statement. Let's try to run it via a helper mechanism if available, 
    // or simulate it. 
    // Actually, Supabase JS client 'rpc' calls a postgres function. It can't run raw SQL string unless we have a specialized function.
    // BUT! I saw `fix_sf_weights.sql` was run via a TS script that did direct Table updates.
    // This SQL script uses `DO $$` which is procedural SQL, impossible to run via standard Table API.

    // Pivot: Instead of running the SQL file directly, I will implement the logic in TypeScript 
    // to ensure it works with the standard Supabase Client SDK.

    console.log("Switching to TypeScript logic for seeding...");

    // 1. Get Placeholder Raw
    let rawSku = '';
    const { data: rawData } = await supabase.from('master_items_v2').select('sku').eq('type', 'Raw').limit(1);
    if (rawData && rawData.length > 0) {
        rawSku = rawData[0].sku;
    } else {
        // Create dummy if needed using Table API
        rawSku = 'RAW-DUMMY-TS';
        await supabase.from('master_items_v2').upsert({
            sku: rawSku, name: 'Dummy Raw TS', type: 'Raw', category: 'Resin', supply_type: 'Purchased'
        });
    }
    console.log("Using Raw SKU:", rawSku);

    // 2. Find items needing recipe
    // Get all FGs
    const { data: allFGs } = await supabase.from('master_items_v2').select('sku, name').eq('type', 'FG');
    // Get all existing recipes
    const { data: existingRecipes } = await supabase.from('bom_headers_v2').select('sku');

    const existingSkus = new Set(existingRecipes?.map(r => r.sku) || []);
    const itemsToSeed = allFGs?.filter(i => !existingSkus.has(i.sku)) || [];

    console.log(`Found ${itemsToSeed.length} items missing recipes.`);

    // 3. Create recipes
    let created = 0;
    for (const item of itemsToSeed) {
        // Create Header
        const { data: header, error: hErr } = await supabase
            .from('bom_headers_v2')
            .insert({
                sku: item.sku,
                name: 'Auto-Gen Testing (Zero Usage)',
                is_default: true,
                machine_type: 'Extruder-Auto'
            })
            .select()
            .single();

        if (hErr) {
            console.error(`Failed to create header for ${item.sku}:`, hErr.message);
            continue;
        }

        if (header) {
            // Create Item with 0 usage
            const { error: iErr } = await supabase
                .from('bom_items_v2')
                .insert({
                    recipe_id: header.recipe_id,
                    material_sku: rawSku,
                    qty_calculated: 0,
                    ratio_percentage: 0,
                    notes: 'Auto-generated TS'
                });

            if (iErr) console.error(`Failed item for ${item.sku}:`, iErr.message);
            else created++;
        }
    }

    console.log(`Successfully created ${created} dummy recipes.`);
}

runSeed();
