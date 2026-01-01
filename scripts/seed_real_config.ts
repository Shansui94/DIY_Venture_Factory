import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || supabaseKey;

if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase Creds");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// --- REAL DATA DEFINITIONS (Derived from project knowledge) ---

const FACTORY_ID = 'FAC-01';

const MACHINES = [
    { machine_id: 'Cast-Line', name: 'Cast Line Extruder', type: 'Extruder', status: 'Idle' },
    { machine_id: 'Blown-Line', name: 'Blown Line Extruder', type: 'Extruder', status: 'Idle' },
    { machine_id: 'Blown-Double', name: 'Double Layer Blown', type: 'Extruder', status: 'Idle' },
    { machine_id: 'Rewinder', name: 'Rewinding Machine', type: 'Rewinder', status: 'Idle' },
    { machine_id: 'Cutter', name: 'Cutting Machine', type: 'Cutter', status: 'Idle' }
];

// Raw Materials (Resins, Additives, Packaging)
const RAW_MATERIALS = [
    { sku: 'RM-LL-GA1820', name: 'LLDPE Petrothene GA1820', type: 'Raw', category: 'Resin', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-LL-7059', name: 'LLDPE 7059 (OQ)', type: 'Raw', category: 'Resin', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-LD-N125Y', name: 'LDPE Etilinas N125Y', type: 'Raw', category: 'Resin', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-HD-7260', name: 'HDPE GC 7260', type: 'Raw', category: 'Resin', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-LL-ZBB', name: 'LLDPE ZBB (Sabic/Generic)', type: 'Raw', category: 'Resin', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-RC-BLK', name: 'Recycle Material Black', type: 'Raw', category: 'Resin', supply_type: 'Manufactured', uom: 'KG', status: 'Active' }, // Sometimes Manufactured
    { sku: 'RM-MB-BLK', name: 'Masterbatch 8092 Black', type: 'Raw', category: 'Additive', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-ADD-VIS', name: 'Vistamaxx Additive', type: 'Raw', category: 'Additive', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-CORE-0.2', name: 'Paper Core 0.2KG (Stretch)', type: 'Raw', category: 'Packaging', supply_type: 'Purchased', uom: 'PCS', status: 'Active' },
    { sku: 'RM-CORE-0.05', name: 'Paper Core 0.05KG (Baby)', type: 'Raw', category: 'Packaging', supply_type: 'Purchased', uom: 'PCS', status: 'Active' }
];

// Finished Goods
const PRODUCTS = [
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

const RECIPES = [
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
        sku: 'BW-DOUBLE-CLR', name: 'Double Layer Clear', machine: 'Blown-Line', // Typo in source? Blown-Line or Double? Assuming Blown-Double for consistency logic but source said Blown-Line. Keeping source for safety.
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

async function seed() {
    console.log("🌱 STARTING REAL MASTER DATA SEED...");

    // 1. Factory Strategy
    // We assume Factory might exist or not. Upsert.
    console.log("1. Seeding Factory...");
    const { error: facErr } = await supabase.from('sys_factories_v2').upsert({
        factory_id: FACTORY_ID,
        name: 'Venture Factory',
        address: 'Main Industrial Core'
    });
    if (facErr && facErr.code !== '42P01') console.error("Factory Error:", facErr);

    // 2. Machines
    console.log("2. Seeding Machines...");
    for (const m of MACHINES) {
        const { error: mErr } = await supabase.from('sys_machines_v2').upsert({
            ...m,
            factory_id: FACTORY_ID
        }, { onConflict: 'machine_id' });
        if (mErr) console.error(`Machine Error (${m.machine_id}):`, mErr);
    }

    // 3. Items
    console.log("3. Seeding Items (Raw & FG)...");
    const allItems = [...RAW_MATERIALS, ...PRODUCTS];
    // Batched upsert preferred
    const { error: iErr } = await supabase.from('master_items_v2').upsert(allItems, { onConflict: 'sku' });
    if (iErr) console.error("Item Error:", iErr);

    // 4. Recipes
    console.log("4. Seeding Recipes...");
    for (const r of RECIPES) {
        // Find existing header or create
        const { data: existHeader } = await supabase.from('bom_headers_v2').select('recipe_id').eq('sku', r.sku).maybeSingle();

        let recipeId;
        if (existHeader) {
            recipeId = existHeader.recipe_id;
            // Clear items to re-seed logic
            await supabase.from('bom_items_v2').delete().eq('recipe_id', recipeId);
        } else {
            const { data: newHeader, error: hErr } = await supabase
                .from('bom_headers_v2')
                .insert({ sku: r.sku, name: r.name, machine_type: r.machine, is_default: true })
                .select('recipe_id')
                .single();

            if (hErr) { console.error(`Recipe Header Error (${r.sku}):`, hErr); continue; }
            recipeId = newHeader.recipe_id;
        }

        const bomItems = r.items.map(i => ({
            recipe_id: recipeId,
            material_sku: i.mat,
            qty_calculated: i.qty,
            notes: i.note
        }));

        const { error: biErr } = await supabase.from('bom_items_v2').insert(bomItems);
        if (biErr) console.error(`BOM Items Error (${r.sku}):`, biErr);
    }

    console.log("✅ REAL MASTER DATA SEED COMPLETE.");
}

seed();
