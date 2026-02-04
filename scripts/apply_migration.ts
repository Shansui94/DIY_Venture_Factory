
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), debug: false });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    const migrationPath = process.argv[2];
    if (!migrationPath) {
        console.error("Please provide migration file path");
        process.exit(1);
    }

    const absPath = path.resolve(process.cwd(), migrationPath);
    if (!fs.existsSync(absPath)) {
        console.error("Migration file not found:", absPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(absPath, 'utf8');
    console.log(`Applying migration from ${migrationPath}...`);

    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
        console.error("Migration failed:", error.message);
        process.exit(1);
    } else {
        console.log("✅ Migration applied successfully!");
    }
}

applyMigration();
