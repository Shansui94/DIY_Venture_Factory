
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

// --- DATA DEFINITION ---

const rawMaterials = [
    { sku: 'RM-LL-GA1820', name: 'LLDPE Petrothene GA1820', type: 'Raw', category: 'Resin', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-LL-7059', name: 'LLDPE 7059 (OQ)', type: 'Raw', category: 'Resin', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-LD-N125Y', name: 'LDPE Etilinas N125Y', type: 'Raw', category: 'Resin', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-HD-7260', name: 'HDPE GC 7260', type: 'Raw', category: 'Resin', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-LL-ZBB', name: 'LLDPE ZBB (Sabic/Generic)', type: 'Raw', category: 'Resin', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-RC-BLK', name: 'Recycle Material Black', type: 'Raw', category: 'Resin', supply_type: 'Manufactured', uom: 'KG', status: 'Active' },
    { sku: 'RM-MB-BLK', name: 'Masterbatch 8092 Black', type: 'Raw', category: 'Additive', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-ADD-VIS', name: 'Vistamaxx Additive', type: 'Raw', category: 'Additive', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-CORE-0.2', name: 'Paper Core 0.2KG (Stretch)', type: 'Raw', category: 'Packaging', supply_type: 'Purchased', uom: 'PCS', status: 'Active' },
    { sku: 'RM-CORE-0.05', name: 'Paper Core 0.05KG (Baby)', type: 'Raw', category: 'Packaging', supply_type: 'Purchased', uom: 'PCS', status: 'Active' }
];

const products = [
    { sku: 'SF-2.2KG-BLACK', name: 'Stretch Film Black 2.2kg', type: 'FG', category: 'StretchFilm', supply_type: 'Manufactured', uom: 'Roll', net_weight_kg: 2.00, core_weight_kg: 0.2, gross_weight_kg: 2.2, status: 'Active' },
    { sku: 'SF-2.2KG-CLEAR', name: 'Stretch Film Clear 2.2kg', type: 'FG', category: 'StretchFilm', supply_type: 'Manufactured', uom: 'Roll', net_weight_kg: 2.00, core_weight_kg: 0.2, gross_weight_kg: 2.2, status: 'Active' },
    { sku: 'BABYROLL-CLR', name: 'Baby Roll Stretch Film Clear', type: 'FG', category: 'StretchFilm', supply_type: 'Manufactured', uom: 'Roll', net_weight_kg: 0.25, status: 'Active' },
    { sku: 'BW-SINGLE-BLK', name: 'BW Single Layer Black (1m)', type: 'FG', category: 'StretchFilm', supply_type: 'Manufactured', uom: 'Roll', net_weight_kg: 4.45, status: 'Active' },
    { sku: 'BW-DOUBLE-BLK', name: 'BW Double Layer Black (1m)', type: 'FG', category: 'StretchFilm', supply_type: 'Manufactured', uom: 'Roll', net_weight_kg: 6.55, status: 'Active' },
    { sku: 'BW-SINGLE-CLR', name: 'BW Single Layer Clear (1m)', type: 'FG', category: 'StretchFilm', supply_type: 'Manufactured', uom: 'Roll', net_weight_kg: 4.45, status: 'Active' },
    { sku: 'BW-DOUBLE-CLR', name: 'BW Double Layer Clear (1m)', type: 'FG', category: 'StretchFilm', supply_type: 'Manufactured', uom: 'Roll', net_weight_kg: 6.55, status: 'Active' },
    { sku: 'BW20CM-BLK', name: 'BW Black 20cm Cut', type: 'FG', category: 'StretchFilm', supply_type: 'Manufactured', uom: 'Roll', net_weight_kg: 0.89, status: 'Active' },
    { sku: 'BW20CM-CLR', name: 'BW Clear 20cm Cut', type: 'FG', category: 'StretchFilm', supply_type: 'Manufactured', uom: 'Roll', net_weight_kg: 0.89, status: 'Active' }
];

const recipes = [
    {
        sku: 'SF-2.2KG-BLACK', name: 'Standard Recipe', machine: 'Cast-Line',
        items: [
            { mat: 'RM-LL-GA1820', qty: 1.88, note: '94% Body' },
            { mat: 'RM-MB-BLK', qty: 0.06, note: '3% MB' },
            { mat: 'RM-ADD-VIS', qty: 0.06, note: '3% Vis' },
            { mat: 'RM-CORE-0.2', qty: 1.00, note: 'Core' }
        ]
    },
    {
        sku: 'SF-2.2KG-CLEAR', name: 'Standard Recipe', machine: 'Cast-Line',
        items: [
            { mat: 'RM-LL-GA1820', qty: 1.90, note: '95% Body' },
            { mat: 'RM-ADD-VIS', qty: 0.10, note: '5% Vis' },
            { mat: 'RM-CORE-0.2', qty: 1.00, note: 'Core' }
        ]
    },
    {
        sku: 'BW-SINGLE-BLK', name: 'Blown Film Recipe', machine: 'Blown-Line',
        items: [
            { mat: 'RM-LL-ZBB', qty: 1.16, note: 'Mix' },
            { mat: 'RM-HD-7260', qty: 0.97, note: 'Mix' },
            { mat: 'RM-LD-N125Y', qty: 0.77, note: 'Mix' },
            { mat: 'RM-LL-7059', qty: 0.77, note: 'Mix' },
            { mat: 'RM-LL-GA1820', qty: 0.58, note: 'Mix' },
            { mat: 'RM-MB-BLK', qty: 0.12, note: 'Color' },
            { mat: 'RM-RC-BLK', qty: 0.08, note: 'Recycle' }
        ]
    },
    // Adding rest of recipes strictly matching seed_legacy_data.sql content logic
    {
        sku: 'BW-DOUBLE-BLK', name: 'Double Layer Recipe', machine: 'Blown-Double',
        items: [
            { mat: 'RM-LL-ZBB', qty: 1.71 }, { mat: 'RM-HD-7260', qty: 1.42 },
            { mat: 'RM-LD-N125Y', qty: 1.14 }, { mat: 'RM-LL-7059', qty: 1.14 },
            { mat: 'RM-LL-GA1820', qty: 0.85 }, { mat: 'RM-MB-BLK', qty: 0.18 },
            { mat: 'RM-RC-BLK', qty: 0.11 }
        ]
    },
    {
        sku: 'BW-SINGLE-CLR', name: 'Single Layer Clear', machine: 'Blown-Line',
        items: [
            { mat: 'RM-LL-ZBB', qty: 1.21 }, { mat: 'RM-HD-7260', qty: 1.01 },
            { mat: 'RM-LD-N125Y', qty: 0.81 }, { mat: 'RM-LL-7059', qty: 0.81 },
            { mat: 'RM-LL-GA1820', qty: 0.61 }
        ]
    },
    {
        sku: 'BW-DOUBLE-CLR', name: 'Double Layer Clear', machine: 'Blown-Line',
        items: [
            { mat: 'RM-LL-ZBB', qty: 1.79 }, { mat: 'RM-HD-7260', qty: 1.49 },
            { mat: 'RM-LD-N125Y', qty: 1.19 }, { mat: 'RM-LL-7059', qty: 1.19 },
            { mat: 'RM-LL-GA1820', qty: 0.89 }
        ]
    },
    {
        sku: 'BABYROLL-CLR', name: 'Baby Roll Recipe', machine: 'Rewinder',
        items: [
            { mat: 'RM-LL-GA1820', qty: 0.24 }, { mat: 'RM-ADD-VIS', qty: 0.01 },
            { mat: 'RM-CORE-0.05', qty: 1.00 }
        ]
    },
    {
        sku: 'BW20CM-BLK', name: '20cm Cut Black', machine: 'Cutter',
        items: [
            { mat: 'RM-LL-ZBB', qty: 0.23 }, { mat: 'RM-HD-7260', qty: 0.19 },
            { mat: 'RM-LD-N125Y', qty: 0.15 }, { mat: 'RM-LL-7059', qty: 0.15 },
            { mat: 'RM-LL-GA1820', qty: 0.12 }, { mat: 'RM-MB-BLK', qty: 0.03 },
            { mat: 'RM-RC-BLK', qty: 0.02 }
        ]
    },
    {
        sku: 'BW20CM-CLR', name: '20cm Cut Clear', machine: 'Cutter',
        items: [
            { mat: 'RM-LL-ZBB', qty: 0.24 }, { mat: 'RM-HD-7260', qty: 0.20 },
            { mat: 'RM-LD-N125Y', qty: 0.16 }, { mat: 'RM-LL-7059', qty: 0.16 },
            { mat: 'RM-LL-GA1820', qty: 0.13 }
        ]
    }
];

async function main() {
    console.log("Starting JS Seed...");

    // 1. Insert Items
    console.log("Upserting Items...");
    const allItems = [...rawMaterials, ...products];
    const { error: itemErr } = await supabase.from('master_items_v2').upsert(allItems, { onConflict: 'sku' });
    if (itemErr) { console.error("Item Error:", itemErr); return; }
    console.log("Items done.");

    // 2. Insert Recipes
    console.log("Upserting Recipes...");
    for (const r of recipes) {
        // Create Header
        // First check if exists
        const { data: existHeader } = await supabase.from('bom_headers_v2').select('recipe_id').eq('sku', r.sku).maybeSingle();

        let recipeId;
        if (existHeader) {
            recipeId = existHeader.recipe_id;
            // Clear existing items to re-seed
            await supabase.from('bom_items_v2').delete().eq('recipe_id', recipeId);
        } else {
            const { data: newHeader, error: hErr } = await supabase
                .from('bom_headers_v2')
                .insert({ sku: r.sku, name: r.name, machine_type: r.machine, is_default: true })
                .select('recipe_id')
                .single();
            if (hErr) { console.error(`Header Error for ${r.sku}:`, hErr); continue; }
            recipeId = newHeader.recipe_id;
        }

        // Insert Items
        const bomItems = r.items.map(i => ({
            recipe_id: recipeId,
            material_sku: i.mat,
            qty_calculated: i.qty,
            notes: i.note
        }));

        const { error: iErr } = await supabase.from('bom_items_v2').insert(bomItems);
        if (iErr) console.error(`BOM Item Error for ${r.sku}:`, iErr);
    }

    console.log("All Seeding Complete.");
}

main();
