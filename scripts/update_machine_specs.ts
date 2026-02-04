import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function updateMachines() {
    try {
        console.log("Updating Machine IDs...");
        // 1. Correct T1.3-M02 to T1.3-M03
        await supabase.from('sys_machines_v2').update({ machine_id: 'T1.3-M03' }).eq('machine_id', 'T1.3-M02');

        console.log("Adding base_width and specific configs...");
        // Define machine capabilities based on user input
        const machineConfigs = [
            { id: 'N1-M01', width: 100, type: 'Double Layer' },
            { id: 'N2-M02', width: 100, type: 'Single Layer' },
            { id: 'T1.1-M03', width: 50, type: 'Stretch', rolls_per_cycle: 2 },
            { id: 'T1.2-M01', width: 200, type: 'Double Layer' },
            { id: 'T1.3-M03', width: 100, type: 'Single Layer' }
        ];

        // Ensure these machines exist or update them
        for (const m of machineConfigs) {
            const { error } = await supabase.from('sys_machines_v2').upsert({
                machine_id: m.id,
                name: (m.width === 50 ? 'Stretch Film' : `${m.width / 100}M ${m.type}`) + ` (${m.id.split('-')[0]})`,
                type: m.type === 'Stretch' ? 'Extruder (Stretch)' : 'Extruder'
            });
            if (error) console.error(`Error upserting ${m.id}:`, error);
        }

        console.log("Machine update complete.");
    } catch (err) {
        console.error("Update failed:", err);
    }
}

updateMachines();
