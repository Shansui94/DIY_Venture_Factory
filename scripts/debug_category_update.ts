
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function test() {
    console.log("🧪 Testing Category Update...");
    const { error } = await supabase
        .from('master_items_v2')
        .update({ category: 'Air Tube' })
        .eq('sku', 'AIRTUBE-15CM-300M');

    if (error) {
        console.error("❌ Update Failed:", error.message);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
    } else {
        console.log("✅ Update Successful (No Constraint)");
    }
}
test();
