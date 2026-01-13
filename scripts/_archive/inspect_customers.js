
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

        console.log("Checking sys_customers columns...");
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sys_customers'
        `);
        console.table(res.rows);

    } catch (err) {
        console.error("Database Error:", err);
    } finally {
        await client.end();
    }
}

run();
