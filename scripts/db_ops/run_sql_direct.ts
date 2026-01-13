
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must use Service Role to run SQL

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSql() {
    const sqlFile = process.argv[2];
    if (!sqlFile) {
        console.error("Please provide SQL file path");
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log(`Running SQL from ${sqlFile}...`);

    // Attempt to run via PG (this won't work client side usually without RPC, 
    // but for "check policies" we can just query the view directly using the client)

    // If checking policies, better to just select from pg_policies view
    if (sql.includes('pg_policies')) {
        const { data, error } = await supabase.from('pg_policies').select('*').eq('tablename', 'production_logs');
        if (error) console.error(error);
        else console.table(data);
        return;
    }

    console.log("Custom SQL execution requires RPC or direct connection. For simple checks, use table queries.");
}

runSql();
