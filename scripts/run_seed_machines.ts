
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''; // Prefer Service Role
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
    console.log("Seeding common machines...");

    // Using Table API for safety
    const machines = [
        { machine_id: 'Machine 1', name: 'Generic Machine 1', type: 'Extruder', factory_id: 'FAC-01' },
        { machine_id: 'Machine 2', name: 'Generic Machine 2', type: 'Extruder', factory_id: 'FAC-01' },
        { machine_id: 'Machine 3', name: 'Generic Machine 3', type: 'Extruder', factory_id: 'FAC-01' },
        { machine_id: 'M-01', name: 'Machine M-01', type: 'Extruder', factory_id: 'FAC-01' },
        { machine_id: 'M-02', name: 'Machine M-02', type: 'Extruder', factory_id: 'FAC-01' },
        { machine_id: 'Extruder 1', name: 'Extruder 1', type: 'Extruder', factory_id: 'FAC-01' },
        { machine_id: 'Extruder 2', name: 'Extruder 2', type: 'Extruder', factory_id: 'FAC-01' },
        { machine_id: 'EXT-01', name: 'EXT-01', type: 'Extruder', factory_id: 'FAC-01' },
        { machine_id: 'EXT-02', name: 'EXT-02', type: 'Extruder', factory_id: 'FAC-01' },
        // Also seed simple numbers as strings just in case
        { machine_id: '1', name: 'Machine 1 (Simple)', type: 'Extruder', factory_id: 'FAC-01' },
        { machine_id: '2', name: 'Machine 2 (Simple)', type: 'Extruder', factory_id: 'FAC-01' },
    ];

    const { error } = await supabase.from('sys_machines_v2').upsert(machines, { onConflict: 'machine_id' });

    if (error) {
        console.error("Error seeding machines:", error);
    } else {
        console.log("Successfully seeded common machine IDs.");
    }
}

runSeed();
