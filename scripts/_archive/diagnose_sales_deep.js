
import pg from 'pg';

const config = {
    user: 'postgres',
    password: '$QNQ4rAW*#%294z',
    host: 'db.kdahubyhwndgyloaljak.supabase.co',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
};

const { Client } = pg;
const client = new Client(config);

async function run() {
    try {
        await client.connect();
        console.log("Connected.");

        // 1. Check Columns
        console.log("\n--- COLUMNS ---");
        const cols = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'sales_orders'
        `);
        console.table(cols.rows);

        // 2. Check Policies
        console.log("\n--- POLICIES (pg_policies) ---");
        const pols = await client.query(`
            SELECT policyname, cmd, roles, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'sales_orders'
        `);
        console.table(pols.rows);

        // 3. Check Triggers
        console.log("\n--- TRIGGERS ---");
        const trigs = await client.query(`
            SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers
            WHERE event_object_table = 'sales_orders'
        `);
        console.table(trigs.rows);

        // 4. Test Insert (simulate the failing action)
        console.log("\n--- TEST INSERT (Simulating App) ---");
        const doNum = `TEST-${Date.now()}`;
        try {
            // Simulate the exact payload from the app (unassigned driver)
            /*
             const payload = {
                order_number: doNumber,
                customer: orderCustomer, 
                driver_id: driverIdToSave, // NULL
                items: newOrderItems,
                status: 'New',
                ...
            };
            */
            // Note: We need to use a valid user ID for 'auth.uid()' simulation if policies rely on it.
            // But here we are connecting as 'postgres' (superuser) so RLS is BYPASSED by default for us unless we force it.
            // To test RLS, we should switch role to 'authenticated' or 'anon'.

            // However, Supabase complicates this because 'authenticated' requires a set_config('request.jwt.claim.sub', ...) usually.

            // Let's just try insertion as postgres first. If that works, it IS purely an RLS issue.
            // If that fails, it's a Constraint/Trigger issue.

            await client.query(`
                INSERT INTO sales_orders (order_number, customer, driver_id, status, items)
                VALUES ($1, $2, $3, $4, $5)
            `, [doNum, 'Test Customer', null, 'New', JSON.stringify([{ product: 'TestItem' }])]);

            console.log("✅ Insert as POSTGRES (Superuser) succeeded. This confirms it is an RLS/Permission issue for the app user.");

            // Clean up
            await client.query(`DELETE FROM sales_orders WHERE order_number = $1`, [doNum]);

        } catch (insertErr) {
            console.error("❌ Insert as POSTGRES failed:", insertErr.message);
            if (insertErr.detail) console.error("Detail:", insertErr.detail);
            if (insertErr.hint) console.error("Hint:", insertErr.hint);
        }

    } catch (err) {
        console.error("Script Error:", err);
    } finally {
        await client.end();
    }
}

run();
