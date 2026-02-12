
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const whitelist = [
    "MERAH", "OREN", "SL-33CM", "SL-25CM", "SL-20CM", "DL-FULL", "DL-HALF",
    "DL-33CM", "DL-25CM", "DL-20CM", "HITAM-FULL", "HITAM-HALF", "HITAM-33CM",
    "HITAM-25CM", "HITAM-20CM", "DL-HITAM-FULL", "DL-HITAM-HALF", "DL-HITAM-33CM",
    "DL-HITAM-25CM", "DL-HITAM-20CM", "SILVER-GREY",
    "CUKUPP-B17", "CUKUPP-B20", "CUKUPP-B25", "CUKUPP-B28", "CUKUPP-B32", "CUKUPP-B35",
    "CUKUPP-B38", "CUKUPP-B40", "CUKUPP-B45", "CUKUPP-B50", "CUKUPP-B60",
    "CUKUPP-W17", "CUKUPP-W20", "CUKUPP-W25", "CUKUPP-W28", "CUKUPP-W32", "CUKUPP-W35",
    "CUKUPP-W38", "CUKUPP-W40", "CUKUPP-W45", "CUKUPP-W50", "CUKUPP-W60",
    "CUKUPP-YEL-17", "CUKUPP-YEL-20", "CUKUPP-YEL-25", "CUKUPP-YEL-28", "CUKUPP-YEL-32",
    "CUKUPP-YEL-35", "CUKUPP-YEL-38", "CUKUPP-YEL-40", "CUKUPP-YEL-45", "CUKUPP-YEL-50",
    "CUKUPP-YEL-60", "CUKUPP-PUR-17", "CUKUPP-PUR-20", "CUKUPP-PUR-25", "CUKUPP-PUR-28",
    "CUKUPP-PUR-32", "CUKUPP-PUR-35", "CUKUPP-PUR-38", "CUKUPP-PUR-40", "CUKUPP-PUR-45",
    "CUKUPP-PUR-50", "CUKUPP-PUR-60", "CUKUPP-PINK-17", "CUKUPP-PINK-20", "CUKUPP-PINK-25",
    "CUKUPP-PINK-28", "CUKUPP-PINK-32", "CUKUPP-PINK-35", "CUKUPP-PINK-38", "CUKUPP-PINK-40",
    "CUKUPP-PINK-45", "CUKUPP-PINK-50", "CUKUPP-PINK-60", "CUKUPP-DARKGREEN-17",
    "CUKUPP-DARKGREEN-20", "CUKUPP-DARKGREEN-25", "CUKUPP-DARKGREEN-28", "CUKUPP-DARKGREEN-32",
    "CUKUPP-DARKGREEN-35", "CUKUPP-DARKGREEN-38", "CUKUPP-DARKGREEN-40", "CUKUPP-DARKGREEN-45",
    "CUKUPP-DARKGREEN-50", "CUKUPP-DARKGREEN-60", "CUKUPP-MINT-17", "CUKUPP-MINT-20",
    "CUKUPP-MINT-25", "CUKUPP-MINT-28", "CUKUPP-MINT-32", "CUKUPP-MINT-35", "CUKUPP-MINT-38",
    "CUKUPP-MINT-40", "CUKUPP-MINT-45", "CUKUPP-MINT-50", "CUKUPP-MINT-60",
    "AIRTUBE-15CM-300M", "AIRTUBE-20CM-300M", "AIRTUBE-25CM-300M", "AIRTUBE-30CM-300M",
    "AIRTUBE-35CM-300M", "AIRTUBE-40CM-300M", "AIRTUBE-45CM-300M", "AIRTUBE-50CM-300M",
    "AIRTUBE-55CM-300M", "AIRTUBE-60CM-300M", "AIRTUBE-65CM-300M", "AIRTUBE-70CM-300M",
    "AIRTUBE-75CM-300M", "AIRTUBE-80CM-300M", "AIRTUBE-15CM-50M", "AIRTUBE-20CM-50M",
    "AIRTUBE-25CM-50M", "AIRTUBE-30CM-50M", "AIRTUBE-35CM-50M", "AIRTUBE-40CM-50M",
    "AIRTUBE-45CM-50M", "AIRTUBE-50CM-50M", "AIRTUBE-55CM-50M", "AIRTUBE-60CM-50M",
    "AIRTUBE-65CM-50M", "AIRTUBE-70CM-50M", "AIRTUBE-75CM-50M", "AIRTUBE-80CM-50M",
    "AWB-350ROLL-24", "AWB-500STACK-20", "AWB-2000STACK-4", "AWB-5000STACK-2",
    "CUKUPP-CLEAR-TAPE-80M", "CUKUPP-CLEAR-TAPE-160M", "CUKUPP-BROWN-TAPE-80M",
    "CUKUPP-BROWN-TAPE-160M", "CUKUPP-FRAGILE-TAPE-80M", "CUKUPP-FRAGILE-TAPE-160M",
    "SF-CLEAR", "SF-BLACK", "SF-GREYSILVER", "SF-BABYROLL"
];

async function executeCleanup() {
    console.log(`Starting cleanup. Keeping ${whitelist.length} items...`);

    // 1. Fetch ALL Active items first
    const { data: dbItems, error } = await supabase
        .from('master_items_v2')
        .select('sku, status')
        .eq('status', 'Active');

    if (error) {
        console.error('Error fetching DB items:', error);
        process.exit(1);
    }

    const toDelete = dbItems
        .map(i => i.sku)
        .filter(sku => !whitelist.includes(sku));

    if (toDelete.length === 0) {
        console.log('No items to delete!');
        return;
    }

    console.log(`Setting ${toDelete.length} items to 'Obsolete'...`);

    // Batch update? Supabase doesn't support "update where sku IN (...)" easily with different values, but here the value is valid for all.
    // We can use the 'in' filter.

    const { error: updateError, count } = await supabase
        .from('master_items_v2')
        .update({ status: 'Obsolete' })
        .in('sku', toDelete);

    if (updateError) {
        console.error('Error updating items:', updateError);
    } else {
        console.log('Successfully updated items to Obsolete.');
        // Re-verify
        // const { count: activeCount } = await supabase.from('master_items_v2').select('*', { count: 'exact', head: true }).eq('status', 'Active');
        // console.log(`Remaining Active Items: ${activeCount}`);
    }
}

executeCleanup();
