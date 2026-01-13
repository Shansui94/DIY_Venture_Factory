
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.VITE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runSeed() {
    const sqlPath = path.resolve('seed_missing_skus.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Executing SQL seed...");

    // Split by statement if needed, or run as one block if supported (RPC usually preferred for raw SQL, but here we might not have 'exec_sql' RPC exposed).
    // Actually, Supabase JS client doesn't support raw SQL from client unless via RPC.
    // I will try to use a simple 'rpc' call if 'exec_sql' exists, OTHERWISE I will just 'upsert' via the JS API which is safer/supported.

    // Parsing the SQL to JS objects for safer insertion
    // The SQL is: INSERT INTO master_items_v2 ... ON CONFLICT ...

    const items = [
        { sku: 'SF-100CM-CLEAR', name: 'Stretch Film 100cm Clear (Standard)', type: 'FG', unit: 'Roll', current_stock: 100 },
        { sku: 'SF-100CM-BLACK', name: 'Stretch Film 100cm Black', type: 'FG', unit: 'Roll', current_stock: 50 },
        { sku: 'SF-100CM-SILVER', name: 'Stretch Film 100cm Silver', type: 'FG', unit: 'Roll', current_stock: 50 },

        { sku: 'SF-50CM-CLEAR', name: 'Stretch Film 50cm Clear', type: 'FG', unit: 'Roll', current_stock: 500 },
        { sku: 'SF-50CM-BLACK', name: 'Stretch Film 50cm Black', type: 'FG', unit: 'Roll', current_stock: 200 },
        { sku: 'SF-50CM-SILVER', name: 'Stretch Film 50cm Silver', type: 'FG', unit: 'Roll', current_stock: 100 },

        { sku: 'SF-33CM-CLEAR', name: 'Stretch Film 33cm Clear', type: 'FG', unit: 'Roll', current_stock: 100 },
        { sku: 'SF-33CM-BLACK', name: 'Stretch Film 33cm Black', type: 'FG', unit: 'Roll', current_stock: 50 },
        { sku: 'SF-33CM-SILVER', name: 'Stretch Film 33cm Silver', type: 'FG', unit: 'Roll', current_stock: 20 },

        { sku: 'SF-25CM-CLEAR', name: 'Stretch Film 25cm Clear', type: 'FG', unit: 'Roll', current_stock: 100 },
        { sku: 'SF-25CM-BLACK', name: 'Stretch Film 25cm Black', type: 'FG', unit: 'Roll', current_stock: 50 },
        { sku: 'SF-25CM-SILVER', name: 'Stretch Film 25cm Silver', type: 'FG', unit: 'Roll', current_stock: 20 },

        { sku: 'SF-20CM-CLEAR', name: 'Stretch Film 20cm Clear', type: 'FG', unit: 'Roll', current_stock: 100 },
        { sku: 'SF-20CM-BLACK', name: 'Stretch Film 20cm Black', type: 'FG', unit: 'Roll', current_stock: 50 },
        { sku: 'SF-20CM-SILVER', name: 'Stretch Film 20cm Silver', type: 'FG', unit: 'Roll', current_stock: 20 },
    ];

    const { data, error } = await supabase
        .from('master_items_v2')
        .upsert(items, { onConflict: 'sku' })
        .select();

    if (error) {
        console.error("❌ Seed Failed:", error);
    } else {
        console.log(`✅ Successfully seeded ${data?.length} items.`);
    }
}

runSeed();
