import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const MAPPING = [
    { driver: 'Dean', plate: 'ANX 9821' },
    { driver: 'Wan', plate: 'PETRA 9821' },
    { driver: 'Ameer', plate: 'NEH 9821' },
    { driver: 'Faizal', plate: 'VPC 9821' },
    { driver: 'Waldan', plate: 'TDE 9821' },
    { driver: 'Yashin', plate: 'JYH 9821' },
    { driver: 'Sam', plate: 'RBC 9821' }, // SAM 6434
    { driver: 'Mahadi', plate: 'DFK 9821' },
    { driver: 'Tahir', plate: 'RAU 9821' },
    { driver: 'Ayam', plate: 'APD 9821' },
    { driver: 'Bob', plate: 'ANW 9821' }
];

async function main() {
    console.log("Registering Vehicles...");

    for (const item of MAPPING) {
        // 1. Upsert Vehicle
        // We use plate_number as unique key likely, but need to check constraints.
        // If not unique constraint on plate, we might duplicate.
        // Assuming unique on plate_number or we check first.

        const { data: existing } = await supabase.from('sys_vehicles').select('id').eq('plate_number', item.plate).single();

        if (existing) {
            console.log(`Vehicle ${item.plate} exists (ID: ${existing.id}). Updating...`);
            await supabase.from('sys_vehicles').update({ status: 'Available' }).eq('id', existing.id);
        } else {
            console.log(`Creating Vehicle ${item.plate}...`);
            const { error } = await supabase.from('sys_vehicles').insert({
                plate_number: item.plate,
                status: 'Available',
                max_volume_m3: 10, // Default
                max_weight_kg: 3000 // Default
            });
            if (error) console.error("Error creating vehicle:", error.message);
        }
    }
    console.log("Done.");
}

main();
