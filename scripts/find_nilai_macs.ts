import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Using service role for full visibility
);

async function findNilaiMacs() {
    console.log('--- Searching for Nilai Machines ---');

    // 1. Get machines labeled as Nilai or with IDs like N1-M01
    const { data: machines } = await supabase
        .from('sys_machines_v2')
        .select('*');

    const nilaiMachines = machines?.filter(m => m.machine_id.startsWith('N') || m.name?.toLowerCase().includes('nilai')) || [];

    if (nilaiMachines.length === 0) {
        console.log('No Nilai machines found in sys_machines_v2.');
    }

    // 2. Get IoT configs for these machines
    const machineIds = nilaiMachines.map(m => m.machine_id);
    const { data: configs } = await supabase
        .from('iot_device_configs')
        .select('*')
        .in('machine_id', machineIds);

    console.log('\n--- Nilai Machine IoT Configs ---');
    configs?.forEach(config => {
        const machineName = nilaiMachines.find(m => m.machine_id === config.machine_id)?.name || 'Unknown';
        console.log(`Machine: ${config.machine_id} (${machineName})`);
        console.log(`MAC Address: ${config.mac_address}`);
        console.log(`Lane: ${config.lane_id || 'Single'}`);
        console.log('---------------------------');
    });

    if (!configs || configs.length === 0) {
        console.log('No IoT configs found for these machines.');

        // Fallback: Show all configs to let user pick
        console.log('\n--- All IoT Configs (for reference) ---');
        const { data: allConfigs } = await supabase.from('iot_device_configs').select('*');
        allConfigs?.forEach(c => console.log(`${c.machine_id}: ${c.mac_address}`));
    }
}

findNilaiMacs();
