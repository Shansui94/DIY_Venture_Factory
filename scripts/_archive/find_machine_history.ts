
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findMachineProducts() {
    const machineId = 'T1.2-M01';
    console.log(`Searching history for ${machineId}...`);

    // 1. Check Job Orders (Best source for "assigned" products)
    const { data: jobs, error: jobError } = await supabase
        .from('job_orders')
        .select('product, created_at')
        .eq('machine', machineId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (jobs && jobs.length > 0) {
        console.log("\nFound in Job Orders:");
        console.table(jobs);
    } else {
        console.log("\nNo Job Orders found for this machine.");
    }

    // 2. Check Production Logs V2 (If jobs are empty)
    // Note: V2 logs might link to job, but let's see if we can find product info distinct from job
    // Actually, logs usually just have job_id. 
}

findMachineProducts();
