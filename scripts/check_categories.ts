
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    const { data } = await supabase.from('master_items_v2').select('category, sku');

    const counts: Record<string, number> = {};
    data?.forEach(i => {
        counts[i.category] = (counts[i.category] || 0) + 1;
    });
    console.log("📊 Category Breakdown:");
    console.table(counts);
}
check();
