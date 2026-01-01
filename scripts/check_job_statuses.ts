
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SERVICE_ROLE_KEY || ''; // Use Service Role to bypass RLS for debugging

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkJobs() {
    console.log("Checking job_orders table...");

    // 1. Get all unique statuses
    const { data: jobs, error } = await supabase
        .from('job_orders')
        .select('id, job_id, status, delivery_status, customer');

    if (error) {
        console.error("Error fetching jobs:", error);
        return;
    }

    console.log(`Total Job Orders: ${jobs?.length}`);

    const statusCounts = {};
    const deliveryStatusCounts = {};
    const eligibleJobs: any[] = [];

    jobs?.forEach(j => {
        // Count Statuses
        statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
        // Count Delivery Statuses
        deliveryStatusCounts[j.delivery_status] = (deliveryStatusCounts[j.delivery_status] || 0) + 1;

        // Check availability for logic
        // Logic in DriverDelivery.tsx: ['Ready-to-Ship', 'Shipped'].includes(j.status) && j.deliveryStatus !== 'Delivered'
        if (['Ready-to-Ship', 'Shipped'].includes(j.status) && j.delivery_status !== 'Delivered') {
            eligibleJobs.push(j);
        }
    });

    console.log("\n--- Job Status Breakdown ---");
    console.table(statusCounts);

    console.log("\n--- Delivery Status Breakdown ---");
    console.table(deliveryStatusCounts);

    console.log("\n--- Eligible for Driver View (Logic: Status in [Ready-to-Ship, Shipped] & Not Delivered) ---");
    if (eligibleJobs.length > 0) {
        console.log(`Found ${eligibleJobs.length} eligible jobs:`);
        console.table(eligibleJobs);
    } else {
        console.log("NO ELIGIBLE JOBS FOUND based on current logic.");
    }
}

checkJobs();
