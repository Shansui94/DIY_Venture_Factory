
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

if (!supabaseUrl || !supabaseKey) { console.error("Missing credentials"); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

// --- 1. Raw Materials ---
const rawMaterials = [
    { sku: 'RM-LL-GA1820', name: 'LLDPE Petrothene GA1820', category: 'Resin', supplier: 'LyondellBasell', brand: 'Petrothene', function_usage: 'Stretch Film Main Base (Provides stretchability)', min_stock_alert: 1000, type: 'Raw', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-LL-7059', name: 'LLDPE 7059 (OQ)', category: 'Resin', supplier: 'OQ', brand: 'OQ', function_usage: 'Slip Agent (Improves smoothness/opening)', min_stock_alert: 500, type: 'Raw', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-LD-N125Y', name: 'LDPE Etilinas N125Y', category: 'Resin', supplier: 'Petronas', brand: 'Etilinas', function_usage: 'Bubble Wrap Structural Base (Support bubbles)', min_stock_alert: 500, type: 'Raw', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-LL-C4', name: 'LLDPE C4 Linear', category: 'Resin', supplier: 'ExxonMobil', brand: 'Exxon', function_usage: 'Alternative LLDPE Base', min_stock_alert: 500, type: 'Raw', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-HD-7260', name: 'HDPE GC 7260', category: 'Resin', supplier: 'Sabic/Lyondell', brand: 'Hostalen/Generic', function_usage: 'Hardener (Makes film stiffer/crinkly)', min_stock_alert: 500, type: 'Raw', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-LL-ZBB', name: 'LLDPE ZBB', category: 'Resin', supplier: 'Sabic', brand: 'Sabic', function_usage: 'General Linear Resin (Bulk filler)', min_stock_alert: 1000, type: 'Raw', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-RC-BLK', name: 'Recycle Pellets Black', category: 'Resin', supplier: 'In-house/Local', brand: 'Generic', function_usage: 'Cost Reduction (For black products only)', min_stock_alert: 2000, type: 'Raw', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-MB-BLK', name: 'Masterbatch 8092 Black', category: 'Additive', supplier: 'Local Supplier', brand: 'Generic', function_usage: 'Colorant (Turns film black)', min_stock_alert: 200, type: 'Raw', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-ADD-VIS', name: 'Vistamaxx Additive', category: 'Additive', supplier: 'ExxonMobil', brand: 'Vistamaxx', function_usage: 'Tackifier (Makes Stretch Film sticky)', min_stock_alert: 100, type: 'Raw', supply_type: 'Purchased', uom: 'KG', status: 'Active' },
    { sku: 'RM-CORE-0.2', name: 'Paper Core 0.2KG', category: 'Packaging', supplier: 'Local Packaging Co', brand: '-', function_usage: 'Core for 2.2kg Rolls', min_stock_alert: 5000, type: 'Raw', supply_type: 'Purchased', uom: 'PCS', status: 'Active' },
    { sku: 'RM-CORE-0.05', name: 'Paper Core 0.05KG', category: 'Packaging', supplier: 'Local Packaging Co', brand: '-', function_usage: 'Core for Baby Rolls', min_stock_alert: 5000, type: 'Raw', supply_type: 'Purchased', uom: 'PCS', status: 'Active' }
];

// --- 2. Products ---
const products = [
    { sku: 'SF-22KG-BLACK', legacy_code: 'SF-22KG-BLACK', name: 'Stretch Film Black 2.2kg', net_weight_kg: 2.00, packaging_type: 'Carton (6 Rolls)', description: 'Standard Black Stretch', category: 'StretchFilm', type: 'FG', supply_type: 'Manufactured', uom: 'Roll', status: 'Active' },
    { sku: 'SF-22KG-CLEAR', legacy_code: 'SF-22KG-CLEAR', name: 'Stretch Film Clear 2.2kg', net_weight_kg: 2.00, packaging_type: 'Carton (6 Rolls)', description: 'Standard Clear Stretch', category: 'StretchFilm', type: 'FG', supply_type: 'Manufactured', uom: 'Roll', status: 'Active' },
    { sku: 'BABYROLL-CLR', legacy_code: 'BABYROLL-CLEAR', name: 'Baby Roll Stretch Film Clear', net_weight_kg: 0.25, packaging_type: 'Carton (30 Rolls)', description: 'Mini Roll for binding', category: 'StretchFilm', type: 'FG', supply_type: 'Manufactured', uom: 'Roll', status: 'Active' },
    { sku: 'BW-SINGLE-BLK', legacy_code: 'BW-BLACK', name: 'BW Single Layer Black (1m)', net_weight_kg: 4.45, packaging_type: 'Plastic Bag', description: 'Standard Black Bubble', category: 'Bag', type: 'FG', supply_type: 'Manufactured', uom: 'Roll', status: 'Active' },
    { sku: 'BW-DOUBLE-BLK', legacy_code: 'BW-BLACK-DOUBLELAYER-1', name: 'BW Double Layer Black (1m)', net_weight_kg: 6.55, packaging_type: 'Plastic Bag', description: 'Heavy Duty Black Bubble', category: 'Bag', type: 'FG', supply_type: 'Manufactured', uom: 'Roll', status: 'Active' },
    { sku: 'BW-SINGLE-CLR', legacy_code: 'BW-CLEAR', name: 'BW Single Layer Clear (1m)', net_weight_kg: 4.45, packaging_type: 'Plastic Bag', description: 'Standard Clear Bubble', category: 'Bag', type: 'FG', supply_type: 'Manufactured', uom: 'Roll', status: 'Active' },
    { sku: 'BW-DOUBLE-CLR', legacy_code: 'BW-DOUBLELAYER-1', name: 'BW Double Layer Clear (1m)', net_weight_kg: 6.55, packaging_type: 'Plastic Bag', description: 'Heavy Duty Clear Bubble', category: 'Bag', type: 'FG', supply_type: 'Manufactured', uom: 'Roll', status: 'Active' },
    { sku: 'BW20CM-BLK', legacy_code: 'BW20CM-BLACK-1', name: 'BW Black 20cm Cut', net_weight_kg: 0.89, packaging_type: 'Bundle', description: 'Small Cut Roll', category: 'Bag', type: 'FG', supply_type: 'Manufactured', uom: 'Roll', status: 'Active' },
    { sku: 'BW20CM-CLR', legacy_code: 'BW20CM-1', name: 'BW Clear 20cm Cut', net_weight_kg: 0.89, packaging_type: 'Bundle', description: 'Small Cut Roll', category: 'Bag', type: 'FG', supply_type: 'Manufactured', uom: 'Roll', status: 'Active' }
];

// --- 3. Recipes ---
const recipes = [
    { sku: 'SF-22KG-BLACK', items: [{ c: 'RM-LL-GA1820', q: 1.88, u: 'KG', s: 0.03, n: 'Main Body' }, { c: 'RM-MB-BLK', q: 0.06, u: 'KG', s: 0.03, n: 'Color' }, { c: 'RM-ADD-VIS', q: 0.06, u: 'KG', s: 0.03, n: 'Stickiness' }, { c: 'RM-CORE-0.2', q: 1.00, u: 'PCS', s: 0.00, n: 'Core' }] },
    { sku: 'SF-22KG-CLEAR', items: [{ c: 'RM-LL-GA1820', q: 1.90, u: 'KG', s: 0.03, n: 'Main Body' }, { c: 'RM-ADD-VIS', q: 0.10, u: 'KG', s: 0.03, n: 'Stickiness' }, { c: 'RM-CORE-0.2', q: 1.00, u: 'PCS', s: 0.00, n: 'Core' }] },
    { sku: 'BABYROLL-CLR', items: [{ c: 'RM-LL-GA1820', q: 0.24, u: 'KG', s: 0.03, n: 'Main Body' }, { c: 'RM-ADD-VIS', q: 0.01, u: 'KG', s: 0.03, n: 'Stickiness' }, { c: 'RM-CORE-0.05', q: 1.00, u: 'PCS', s: 0.00, n: 'Core' }] },
    { sku: 'BW-SINGLE-BLK', items: [{ c: 'RM-LL-ZBB', q: 1.16, u: 'KG', s: 0.03, n: 'Bulk Resin' }, { c: 'RM-HD-7260', q: 0.97, u: 'KG', s: 0.03, n: 'Hardener' }, { c: 'RM-LL-7059', q: 0.77, u: 'KG', s: 0.03, n: 'Smoothness' }, { c: 'RM-LD-N125Y', q: 0.77, u: 'KG', s: 0.03, n: 'Structure' }, { c: 'RM-LL-GA1820', q: 0.58, u: 'KG', s: 0.03, n: 'Toughness' }, { c: 'RM-MB-BLK', q: 0.12, u: 'KG', s: 0.03, n: 'Color' }, { c: 'RM-RC-BLK', q: 0.08, u: 'KG', s: 0.03, n: 'Filler' }] },
    { sku: 'BW-DOUBLE-BLK', items: [{ c: 'RM-LL-ZBB', q: 1.71, u: 'KG', s: 0.03, n: 'Bulk Resin' }, { c: 'RM-HD-7260', q: 1.42, u: 'KG', s: 0.03, n: 'Hardener' }, { c: 'RM-LD-N125Y', q: 1.14, u: 'KG', s: 0.03, n: 'Structure' }, { c: 'RM-LL-7059', q: 1.14, u: 'KG', s: 0.03, n: 'Smoothness' }, { c: 'RM-LL-GA1820', q: 0.85, u: 'KG', s: 0.03, n: 'Toughness' }, { c: 'RM-MB-BLK', q: 0.18, u: 'KG', s: 0.03, n: 'Color' }, { c: 'RM-RC-BLK', q: 0.11, u: 'KG', s: 0.03, n: 'Filler' }] },
    { sku: 'BW-SINGLE-CLR', items: [{ c: 'RM-LL-ZBB', q: 1.21, u: 'KG', s: 0.03, n: 'Bulk Resin' }, { c: 'RM-HD-7260', q: 1.01, u: 'KG', s: 0.03, n: 'Hardener' }, { c: 'RM-LD-N125Y', q: 0.81, u: 'KG', s: 0.03, n: 'Structure' }, { c: 'RM-LL-7059', q: 0.81, u: 'KG', s: 0.03, n: 'Smoothness' }, { c: 'RM-LL-GA1820', q: 0.61, u: 'KG', s: 0.03, n: 'Toughness' }] },
    { sku: 'BW-DOUBLE-CLR', items: [{ c: 'RM-LL-ZBB', q: 1.79, u: 'KG', s: 0.03, n: 'Bulk Resin' }, { c: 'RM-HD-7260', q: 1.49, u: 'KG', s: 0.03, n: 'Hardener' }, { c: 'RM-LD-N125Y', q: 1.19, u: 'KG', s: 0.03, n: 'Structure' }, { c: 'RM-LL-7059', q: 1.19, u: 'KG', s: 0.03, n: 'Smoothness' }, { c: 'RM-LL-GA1820', q: 0.89, u: 'KG', s: 0.03, n: 'Toughness' }] },
    { sku: 'BW20CM-BLK', items: [{ c: 'RM-LL-ZBB', q: 0.23, u: 'KG', s: 0.03, n: 'Calc (1/5)' }, { c: 'RM-HD-7260', q: 0.19, u: 'KG', s: 0.03, n: 'Calc (1/5)' }, { c: 'RM-LD-N125Y', q: 0.15, u: 'KG', s: 0.03, n: 'Calc (1/5)' }, { c: 'RM-LL-7059', q: 0.15, u: 'KG', s: 0.03, n: 'Calc (1/5)' }, { c: 'RM-LL-GA1820', q: 0.12, u: 'KG', s: 0.03, n: 'Calc (1/5)' }, { c: 'RM-MB-BLK', q: 0.03, u: 'KG', s: 0.03, n: 'Calc (1/5)' }, { c: 'RM-RC-BLK', q: 0.02, u: 'KG', s: 0.03, n: 'Calc (1/5)' }] },
    { sku: 'BW20CM-CLR', items: [{ c: 'RM-LL-ZBB', q: 0.24, u: 'KG', s: 0.03, n: 'Calc (1/5)' }, { c: 'RM-HD-7260', q: 0.20, u: 'KG', s: 0.03, n: 'Calc (1/5)' }, { c: 'RM-LD-N125Y', q: 0.16, u: 'KG', s: 0.03, n: 'Calc (1/5)' }, { c: 'RM-LL-7059', q: 0.16, u: 'KG', s: 0.03, n: 'Calc (1/5)' }, { c: 'RM-LL-GA1820', q: 0.13, u: 'KG', s: 0.03, n: 'Calc (1/5)' }] }
];

async function main() {
    console.log("Starting V3 Layered Seed...");

    console.log("1. Cleaning old data...");
    await supabase.from('bom_items_v2').delete().neq('qty_calculated', -1); // Delete All
    await supabase.from('bom_headers_v2').delete().neq('name', 'x');
    await supabase.from('master_items_v2').delete().neq('name', 'x');

    console.log("2. Inserting Raw Materials...");
    const { error: rmErr } = await supabase.from('master_items_v2').insert(rawMaterials);
    if (rmErr) console.error("RM Error", rmErr);

    console.log("3. Inserting Products...");
    const { error: pErr } = await supabase.from('master_items_v2').insert(products);
    if (pErr) console.error("Product Error", pErr);

    console.log("4. Inserting Recipes...");
    for (const r of recipes) {
        // Create Header
        const { data: header, error: hErr } = await supabase
            .from('bom_headers_v2')
            .insert({ sku: r.sku, name: 'Standard Recipe', is_default: true, machine_type: 'Standard' })
            .select()
            .single();

        if (hErr) { console.log(`Header Err for ${r.sku}:`, hErr); continue; }

        // Items
        const items = r.items.map(i => ({
            recipe_id: header.recipe_id,
            material_sku: i.c,
            qty_calculated: i.q,
            scrap_percent: i.s,
            notes: i.n
        }));

        const { error: iErr } = await supabase.from('bom_items_v2').insert(items);
        if (iErr) console.error(`BOM Error for ${r.sku}`, iErr);
    }

    console.log("V3 Seeding Complete.");
}

main();
