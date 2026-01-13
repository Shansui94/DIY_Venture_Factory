
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

const sql = `
BEGIN;

-- 1. Enable RLS
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

-- 2. Drop All Existing Policies (Clean Slate)
DROP POLICY IF EXISTS "Allow public read sales_orders" ON sales_orders;
DROP POLICY IF EXISTS "Allow auth insert sales_orders" ON sales_orders;
DROP POLICY IF EXISTS "Allow auth update sales_orders" ON sales_orders;
DROP POLICY IF EXISTS "Enable Access for Authenticated Users" ON sales_orders;
DROP POLICY IF EXISTS "Auth Only Access" ON sales_orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON sales_orders;
DROP POLICY IF EXISTS "Enable All Access for Authenticated Users" ON sales_orders;

-- 3. Create Simplified Policies

-- A. Read Access (Public for now, or Auth)
CREATE POLICY "Public Read Access" ON sales_orders
FOR SELECT
TO public
USING (true);

-- B. Write Access (Authenticated Only)
CREATE POLICY "Authenticated Full Access" ON sales_orders
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Grant Permissions
GRANT ALL ON TABLE sales_orders TO authenticated;
GRANT ALL ON TABLE sales_orders TO service_role;
GRANT SELECT ON TABLE sales_orders TO public;

-- 5. Force PostgREST Cache Reload
NOTIFY pgrst, 'reload schema';

COMMIT;
`;

async function run() {
    try {
        console.log("Connecting to DB...");
        await client.connect();
        console.log("Connected. Applying Fix & Reloading Schema Cache...");

        await client.query(sql);
        console.log("✅ Policies Updated & Cache Reloaded.");

    } catch (err) {
        console.error("Database Error:", err);
        try { await client.query('ROLLBACK'); } catch { }
    } finally {
        await client.end();
    }
}

run();
