
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdahubyhwndgyloaljak.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    console.log("1. Signing in as Driver (maxtan)...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: '8335@packsecure.com',
        password: '83358335'
    });

    if (authError) {
        console.error("Login failed:", authError);
        return;
    }
    console.log("Login successful!");

    console.log("2. Fetching *Unassigned* Orders...");
    const { data: orders, error: fetchError } = await supabase
        .from('sales_orders')
        .select('id, order_number, driver_id')
        .is('driver_id', null)
        .limit(5);

    if (fetchError) {
        console.error("Fetch Error:", fetchError);
    } else {
        console.log(`Fetched ${orders.length} unassigned orders.`);
        orders.forEach(o => console.log(`- Order: ${o.order_number}, Driver: ${o.driver_id}`));
    }
}

checkRLS();
