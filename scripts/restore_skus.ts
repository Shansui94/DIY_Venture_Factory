
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kdahubyhwndgyloaljak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const restoreList = [
    "B17-ROLL", "B20-ROLL", "B25-ROLL", "B28-ROLL", "B32-ROLL", "B35-ROLL", "B38-ROLL", "B40-ROLL", "B45-ROLL", "B50-ROLL", "B60-ROLL",
    "W17-ROLL", "W20-ROLL", "W25-ROLL", "W28-ROLL", "W32-ROLL", "W35-ROLL", "W38-ROLL", "W40-ROLL", "W45-ROLL", "W50-ROLL", "W60-ROLL",
    "YEL-17-ROLL", "YEL-20-ROLL", "YEL-25-ROLL", "YEL-28-ROLL", "YEL-32-ROLL", "YEL-35-ROLL", "YEL-38-ROLL", "YEL-40-ROLL", "YEL-45-ROLL", "YEL-50-ROLL", "YEL-60-ROLL",
    "PUR-17-ROLL", "PUR-20-ROLL", "PUR-25-ROLL", "PUR-28-ROLL", "PUR-32-ROLL", "PUR-35-ROLL", "PUR-38-ROLL", "PUR-40-ROLL", "PUR-45-ROLL", "PUR-50-ROLL", "PUR-60-ROLL",
    "PINK-17-ROLL", "PINK-20-ROLL", "PINK-25-ROLL", "PINK-28-ROLL", "PINK-32-ROLL", "PINK-35-ROLL", "PINK-38-ROLL", "PINK-40-ROLL", "PINK-45-ROLL", "PINK-50-ROLL", "PINK-60-ROLL",
    "DARKGREEN-17-ROLL", "DARKGREEN-20-ROLL", "DARKGREEN-25-ROLL", "DARKGREEN-28-ROLL", "DARKGREEN-32-ROLL", "DARKGREEN-35-ROLL", "DARKGREEN-38-ROLL", "DARKGREEN-40-ROLL", "DARKGREEN-45-ROLL", "DARKGREEN-50-ROLL", "DARKGREEN-60-ROLL",
    "MINT-17-ROLL", "MINT-20-ROLL", "MINT-25-ROLL", "MINT-28-ROLL", "MINT-32-ROLL", "MINT-35-ROLL", "MINT-38-ROLL", "MINT-40-ROLL", "MINT-45-ROLL", "MINT-50-ROLL", "MINT-60-ROLL"
];

async function restoreSkus() {
    console.log(`Attempting to restore ${restoreList.length} SKUs...`);

    // 1. Check which ones exist (either Active or Obsolete)
    const { data: existingItems, error } = await supabase
        .from('master_items_v2')
        .select('sku, status')
        .in('sku', restoreList);

    if (error) {
        console.error('Error validation SKUs:', error);
        return;
    }

    const foundSkus = existingItems.map(i => i.sku);
    const missingSkus = restoreList.filter(sku => !foundSkus.includes(sku));

    // 2. Restore found ones
    if (foundSkus.length > 0) {
        const { error: updateError } = await supabase
            .from('master_items_v2')
            .update({ status: 'Active' })
            .in('sku', foundSkus);

        if (updateError) {
            console.error('Error updating status:', updateError);
        } else {
            console.log(`Successfully restored ${foundSkus.length} SKUs to Active.`);
        }
    }

    // 3. Report
    if (missingSkus.length > 0) {
        console.log('--- WARNING: The following SKUs do not exist in the database ---');
        console.log(missingSkus);
        console.log('They cannot be restored because they were never there.');
    }
}

restoreSkus();
