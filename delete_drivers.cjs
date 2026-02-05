const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kdahubyhwndgyloaljak.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4Njg4OSwiZXhwIjoyMDgwOTYyODg5fQ.82VCH3EqJXXfdR08i_pxr7yafb1gNunLd6wEomRcfVM';
const supabase = createClient(supabaseUrl, supabaseKey);

const ids = ['45673d8c-787e-4c6e-9743-4b2b95f1cf51', 'a8ebb57c-d362-4659-9e62-5e38d8e4ec85'];

async function run() {
    console.log('--- Deleting Drivers ---');

    // 1. Unassign Orders
    console.log('Unassigning orders from drivers...');
    const { error: errorOrders } = await supabase
        .from('sales_orders')
        .update({ driver_id: null })
        .in('driver_id', ids);
    if (errorOrders) console.error('Error unassigning orders:', errorOrders);

    // 2. Delete from users_public
    console.log('Deleting from users_public...');
    const { error: errorUsers } = await supabase
        .from('users_public')
        .delete()
        .in('id', ids);
    if (errorUsers) console.error('Error deleting users:', errorUsers);

    // 3. Delete from sys_users_v2
    console.log('Cleaning up sys_users_v2...');
    await supabase.from('sys_users_v2').delete().ilike('name', '%maxtan%');
    await supabase.from('sys_users_v2').delete().ilike('name', '%mohdtahir%');

    console.log('--- Deletion Finished ---');
}

run();
