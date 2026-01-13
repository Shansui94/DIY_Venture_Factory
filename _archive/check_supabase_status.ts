import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Key in .env files");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    console.log("Checking Supabase Status...");
    console.log(`URL: ${supabaseUrl}`);

    // --- LEGACY CHECKS ---
    console.log("\n--- Legacy Tables Status ---");

    // Items (Products)
    const { count: prodCount, error: prodError } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'product');

    if (prodError && prodError.code !== '42P01') console.error("Error reading 'items':", prodError.message);
    else console.log(`- Total Products: ${prodCount !== null ? prodCount : 'Table not found'}`);

    // Recipes
    const { count: recipeCount, error: recipeError } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true });

    if (recipeError && recipeError.code !== '42P01') console.error("Error reading 'recipes':", recipeError.message);
    else console.log(`- Total Recipes: ${recipeCount !== null ? recipeCount : 'Table not found'}`);

    // Machines
    const { count: machineCount, error: machineError } = await supabase
        .from('machines')
        .select('*', { count: 'exact', head: true });

    if (machineError && machineError.code !== '42P01') console.error("Error reading 'machines':", machineError.message);
    else console.log(`- Total Machines: ${machineCount !== null ? machineCount : 'Table not found'}`);

    // Logs
    const { count: logCount, error: logError } = await supabase
        .from('production_logs')
        .select('*', { count: 'exact', head: true });

    if (logError && logError.code !== '42P01') console.error("Error reading 'production_logs':", logError.message);
    else console.log(`- Total Production Logs: ${logCount !== null ? logCount : 'Table not found'}`);


    // --- V2 CHECKS ---
    console.log("\n--- V2 Tables Status ---");

    // master_items_v2
    const { count: itemsV2, error: errItemsV2 } = await supabase
        .from('master_items_v2')
        .select('*', { count: 'exact', head: true });
    if (errItemsV2 && errItemsV2.code !== '42P01') console.error("Error reading 'master_items_v2':", errItemsV2.message);
    else console.log(`- Master Items V2: ${itemsV2 !== null ? itemsV2 : 'Table not found'}`);

    // bom_headers_v2
    const { count: bomV2, error: errBomV2 } = await supabase
        .from('bom_headers_v2')
        .select('*', { count: 'exact', head: true });
    if (errBomV2 && errBomV2.code !== '42P01') console.error("Error reading 'bom_headers_v2':", errBomV2.message);
    else console.log(`- Recipes (BOM Headers) V2: ${bomV2 !== null ? bomV2 : 'Table not found'}`);

    // sys_machines_v2
    const { count: machV2, error: errMachV2 } = await supabase
        .from('sys_machines_v2')
        .select('*', { count: 'exact', head: true });
    if (errMachV2 && errMachV2.code !== '42P01') console.error("Error reading 'sys_machines_v2':", errMachV2.message);
    else console.log(`- Machines V2: ${machV2 !== null ? machV2 : 'Table not found'}`);

    // production_logs_v2
    const { count: logsV2, error: errLogsV2 } = await supabase
        .from('production_logs_v2')
        .select('*', { count: 'exact', head: true });
    if (errLogsV2 && errLogsV2.code !== '42P01') console.error("Error reading 'production_logs_v2':", errLogsV2.message);
    else console.log(`- Production Logs V2: ${logsV2 !== null ? logsV2 : 'Table not found'}`);
}

checkStatus();
