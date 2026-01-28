
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load Environment Variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const NEW_PRODUCTS = [
    "MERAH", "OREN", "SL-33CM", "SL-25CM", "SL-20CM",
    "DL-FULL", "DL-HALF", "DL-33CM", "DL-25CM", "DL-20CM",
    "HITAM-FULL", "HITAM-HALF", "HITAM-33CM", "HITAM-25CM", "HITAM-20CM",
    "DL-HITAM-FULL", "DL-HITAM-HALF", "DL-HITAM-33CM", "DL-HITAM-25CM", "DL-HITAM-20CM",
    "SILVER-GREY",
    "CUKUPP-B17", "CUKUPP-B20", "CUKUPP-B25", "CUKUPP-B28", "CUKUPP-B32", "CUKUPP-B35", "CUKUPP-B38", "CUKUPP-B40", "CUKUPP-B45", "CUKUPP-B50", "CUKUPP-B60",
    "CUKUPP-W17", "CUKUPP-W20", "CUKUPP-W25", "CUKUPP-W28", "CUKUPP-W32", "CUKUPP-W35", "CUKUPP-W38", "CUKUPP-W40", "CUKUPP-W45", "CUKUPP-W50", "CUKUPP-W60",
    "CUKUPP-YEL-17", "CUKUPP-YEL-20", "CUKUPP-YEL-25", "CUKUPP-YEL-28", "CUKUPP-YEL-32", "CUKUPP-YEL-35", "CUKUPP-YEL-38", "CUKUPP-YEL-40", "CUKUPP-YEL-45", "CUKUPP-YEL-50", "CUKUPP-YEL-60",
    "CUKUPP-PUR-17", "CUKUPP-PUR-20", "CUKUPP-PUR-25", "CUKUPP-PUR-28", "CUKUPP-PUR-32", "CUKUPP-PUR-35", "CUKUPP-PUR-38", "CUKUPP-PUR-40", "CUKUPP-PUR-45", "CUKUPP-PUR-50", "CUKUPP-PUR-60",
    "CUKUPP-PINK-17", "CUKUPP-PINK-20", "CUKUPP-PINK-25", "CUKUPP-PINK-28", "CUKUPP-PINK-32", "CUKUPP-PINK-35", "CUKUPP-PINK-38", "CUKUPP-PINK-40", "CUKUPP-PINK-45", "CUKUPP-PINK-50", "CUKUPP-PINK-60",
    "CUKUPP-DARKGREEN-17", "CUKUPP-DARKGREEN-20", "CUKUPP-DARKGREEN-25", "CUKUPP-DARKGREEN-28", "CUKUPP-DARKGREEN-32", "CUKUPP-DARKGREEN-35", "CUKUPP-DARKGREEN-38", "CUKUPP-DARKGREEN-40", "CUKUPP-DARKGREEN-45", "CUKUPP-DARKGREEN-50", "CUKUPP-DARKGREEN-60",
    "CUKUPP-MINT-17", "CUKUPP-MINT-20", "CUKUPP-MINT-25", "CUKUPP-MINT-28", "CUKUPP-MINT-32", "CUKUPP-MINT-35", "CUKUPP-MINT-38", "CUKUPP-MINT-40", "CUKUPP-MINT-45", "CUKUPP-MINT-50", "CUKUPP-MINT-60",
    "AIRTUBE-15CM-300M", "AIRTUBE-20CM-300M", "AIRTUBE-25CM-300M", "AIRTUBE-30CM-300M", "AIRTUBE-35CM-300M", "AIRTUBE-40CM-300M", "AIRTUBE-45CM-300M", "AIRTUBE-50CM-300M", "AIRTUBE-55CM-300M", "AIRTUBE-60CM-300M", "AIRTUBE-65CM-300M", "AIRTUBE-70CM-300M", "AIRTUBE-75CM-300M", "AIRTUBE-80CM-300M",
    "AIRTUBE-15CM-50M", "AIRTUBE-20CM-50M", "AIRTUBE-25CM-50M", "AIRTUBE-30CM-50M", "AIRTUBE-35CM-50M", "AIRTUBE-40CM-50M", "AIRTUBE-45CM-50M", "AIRTUBE-50CM-50M", "AIRTUBE-55CM-50M", "AIRTUBE-60CM-50M", "AIRTUBE-65CM-50M", "AIRTUBE-70CM-50M", "AIRTUBE-75CM-50M", "AIRTUBE-80CM-50M",
    "AWB-350ROLL-24", "AWB-500STACK-20", "AWB-2000STACK-4", "AWB-5000STACK-2",
    "CUKUPP-CLEAR-TAPE-80M", "CUKUPP-CLEAR-TAPE-160M", "CUKUPP-BROWN-TAPE-80M", "CUKUPP-BROWN-TAPE-160M",
    "CUKUPP-FRAGILE-TAPE-80M", "CUKUPP-FRAGILE-TAPE-160M",
    "SF-CLEAR", "SF-BLACK", "SF-GREYSILVER", "SF-BABYROLL"
];

async function reseed() {
    console.log("🔥 STARTING FULL DATA WIPE & RESEED...");

    // 1. DELETE ORDER ITEMS (Dependant on Orders & Products)
    // Note: 'sales_order_items' is standard, but check if user uses jsonb. 
    // Assuming 'sales_orders' might have jsonb notes, but if there's a relation, delete it.
    // If 'sales_order_items' table exists, delete it.
    // If 'sales_orders' has items in JSONB, just deleting sales_orders is enough.
    // However, stock_ledger usually references SKU.

    // We try to delete in order of dependencies (Child -> Parent)
    // Table Config: [TableName, PrimaryKeyColumn]
    const tablesToDelete = [
        ['sales_order_items', 'id'],
        ['sales_orders', 'id'],
        ['stock_ledger_v2', 'txn_id'],
        ['production_logs_v2', 'log_id'],
        ['job_orders_v2', 'job_id'],
        ['bom_items_v2', 'id'],
        ['bom_headers_v2', 'recipe_id'],
    ];

    for (const [t, pk] of tablesToDelete) {
        console.log(`🗑️  Truncating ${t} (PK: ${pk})...`);
        // Delete where PK is not a dummy UUID
        const { error } = await supabaseAdmin.from(t).delete().neq(pk, '00000000-0000-0000-0000-000000000000');

        if (error) {
            console.log(`   ⚠️ Delete failed for ${t}: ${error.message}`);
        } else {
            console.log(`   ✅ ${t} cleared.`);
        }
    }

    // Special Force Delete for Master Items
    console.log(`🗑️  Deleting ALL PRODUCTS from master_items_v2...`);
    // Delete all where SKU is not empty string
    const { error: prodDeleteError } = await supabaseAdmin.from('master_items_v2').delete().neq('sku', 'XXXXXX');

    if (prodDeleteError) {
        console.error("⚠️ Error deleting products:", prodDeleteError.message);
        // If this fails, the insert below will likely duplicate or fail
    } else {
        console.log("✅ Products wiped.");
    }

    // 2. INSERT NEW PRODUCTS
    console.log(`🌱 Seeding ${NEW_PRODUCTS.length} new products...`);

    const productsToInsert = NEW_PRODUCTS.map(sku => ({
        sku: sku,
        name: sku,
        type: 'FG', // Default
        category: 'Packaging', // Default
        supply_type: 'Manufactured',
        uom: 'Unit',
        status: 'Active'
    }));

    const { error: insertError } = await supabaseAdmin.from('master_items_v2').insert(productsToInsert);

    if (insertError) {
        console.error("❌ Insert Failed:", insertError.message);
    } else {
        console.log("✅ Successfully inserted new products!");
    }
}

reseed();
