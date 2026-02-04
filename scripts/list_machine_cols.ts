
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), debug: false });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function listColumns() {
    process.stdout.write("--- Machines Table Columns ---\n");
    const { data, error } = await supabase.from('machines').select('*').limit(1);

    if (data && data.length > 0) {
        process.stdout.write(Object.keys(data[0]).join(", ") + "\n");
    } else {
        process.stdout.write("Error or No Data: " + (error?.message || "Empty") + "\n");
    }
}
listColumns();
