
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
    console.error("❌ Missing DATABASE_URL in .env");
    process.exit(1);
}

// Disable SSL check for some setups or enable? Supabase usually needs ssl: { rejectUnauthorized: false }
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    console.log("🔌 Connecting to DB...");
    const client = await pool.connect();

    try {
        console.log("🛠️  Adding new categories...");
        // Postgres cannot add multiple values in one command easily, do one by one.
        // Also 'IF NOT EXISTS' for enum values is only supported in newer Postgres or via block.
        // We'll try/catch each.

        const newCats = ['Air Tube', 'Tape', 'Courier Bag', 'Thermal Paper', 'StretchFilm']; // Ensure StretchFilm is there if not

        for (const cat of newCats) {
            try {
                await client.query(`ALTER TYPE "item_category" ADD VALUE '${cat}'`);
                console.log(`   ✅ Added '${cat}'`);
            } catch (e: any) {
                if (e.message.includes("already exists")) {
                    console.log(`   ℹ️  '${cat}' already exists.`);
                } else {
                    console.error(`   ❌ Failed to add '${cat}': ${e.message}`);
                }
            }
        }
    } finally {
        client.release();
        await pool.end();
        console.log("👋 Done.");
    }
}

run();
