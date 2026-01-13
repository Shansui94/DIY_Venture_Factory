
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

-- DISABLE RLS completely for this table
ALTER TABLE sales_orders DISABLE ROW LEVEL SECURITY;

-- Ensure standard permissions exist (since RLS is off, these control access)
GRANT ALL ON TABLE sales_orders TO authenticated;
GRANT ALL ON TABLE sales_orders TO service_role;
-- GRANT SELECT ON TABLE sales_orders TO anon; -- Optional: public read?

COMMIT;
`;

async function run() {
    try {
        console.log("Connecting to DB...");
        await client.connect();

        console.log("Disabling RLS on sales_orders...");
        await client.query(sql);
        console.log("✅ RLS Disabled. Table is now open to all 'authenticated' users via standard GRANTs.");

        // Initial verification
        const check = await client.query(`
            SELECT relname, relrowsecurity 
            FROM pg_class 
            WHERE relname = 'sales_orders'
        `);
        console.log("Verification (relrowsecurity should be false):", check.rows[0]);

    } catch (err) {
        console.error("Database Error:", err);
    } finally {
        await client.end();
    }
}

run();
