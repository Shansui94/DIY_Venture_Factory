const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kdahubyhwndgyloaljak.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4Njg4OSwiZXhwIjoyMDgwOTYyODg5fQ.82VCH3EqJXXfdR08i_pxr7yafb1gNunLd6wEomRcfVM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- Updating Driver Factory IDs ---');

    // 1. Identification
    const nilaiDriverNames = ['SAM', 'Mahadi', 'Ayam', 'Tahir'];

    // 2. Add column if not exists (using RPC if available, or just check and fail)
    // Note: We can binary execute SQL if we have power, but usually we just try to update.
    // If factory_id doesn't exist, Supabase will error.

    // In this environment, I'll try to update. If it fails due to column missing, I'll know.
    const { data: drivers, error: fetchError } = await supabase
        .from('users_public')
        .select('id, name')
        .eq('role', 'Driver');

    if (fetchError) {
        console.error('Error fetching drivers:', fetchError);
        return;
    }

    console.log(`Found ${drivers.length} drivers.`);

    for (const d of drivers) {
        const isNilai = nilaiDriverNames.some(n => d.name.toUpperCase().includes(n.toUpperCase()));
        const factoryId = isNilai ? 'N1' : 'T1';

        console.log(`Setting ${d.name} to ${factoryId}...`);
        const { error: updateError } = await supabase
            .from('users_public')
            .update({ factory_id: factoryId })
            .eq('id', d.id);

        if (updateError) {
            console.error(`Failed to update ${d.name}:`, updateError.message);
            if (updateError.message.includes('column "factory_id" of relation "users_public" does not exist')) {
                console.log('CRITICAL: Column factory_id missing. Need to add it first.');
                return;
            }
        }
    }

    console.log('--- Finished Update ---');
}

run();
