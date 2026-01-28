
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function purgeDispatch() {
    console.log("⚠️ STARTING DATA PURGE: DISPATCH SYSTEM ⚠️");

    // 1. Logistics Trips (Child records first usually, but check FK)
    // Trips might depend on users, vehicles. Sales orders depend on Trips maybe?
    // `sales_orders` has `trip_id`. So clear `sales_orders` trip_id first or delete sales orders.

    // Actually, delete from `sales_orders` first? No, if we delete Sales Orders, that cleans the orders.
    // If we delete Trips, we must ensure Sales Orders are not linking to them, or cascade delete.

    // Strategy: 
    // 1. Clear `trip_id` from Sales Orders (reset them) OR Delete Sales Orders entirely?
    // User said "Clean orders". So I will delete Sales Orders entirely.

    const { error: err1, count: count1 } = await supabase
        .from('sales_orders')
        .delete()
        .gt('id', '00000000-0000-0000-0000-000000000000'); // UUID filter

    if (err1) console.error("Error deleting sales_orders:", err1);
    else console.log(`✅ Deleted Sales Orders.`);

    // 2. Delete Trips
    const { error: err2, count: count2 } = await supabase
        .from('logistics_trips')
        .delete()
        .gt('trip_id', '00000000-0000-0000-0000-000000000000');

    if (err2) console.error("Error deleting logistics_trips:", err2);
    else console.log(`✅ Deleted Logistics Trips.`);

}

purgeDispatch();
