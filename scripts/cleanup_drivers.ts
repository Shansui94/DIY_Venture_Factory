
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function purgeDrivers() {
    console.log("⚠️ STARTING DATA PURGE: DRIVERS ⚠️");

    // 1. Delete from users_public where role is Driver
    const { error, count } = await supabase
        .from('users_public')
        .delete()
        .eq('role', 'Driver');

    if (error) {
        console.error("Error deleting drivers:", error);
    } else {
        console.log(`✅ Deleted Drivers.`);
    }

    // Note: We cannot easily delete from auth.users via client without Admin API (GoTrue admin), 
    // but removing from users_public hides them from the app.
    // The User Management page syncs from users_public.
}

purgeDrivers();
