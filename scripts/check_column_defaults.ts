
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), debug: false });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkDefaults() {
    console.log("--- Column Defaults ---");
    // We can query information_schema.columns
    const { data: cols, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, column_default, data_type')
        .eq('table_name', 'production_logs');

    if (error) {
        console.log("Error:", error.message);
    } else {
        cols?.forEach(c => {
            console.log(`Column: ${c.column_name} | Default: ${c.column_default} | Type: ${c.data_type}`);
        });
    }
}

checkDefaults();
