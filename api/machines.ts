import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 1. Fetch Machines
        const { data: machines, error: mError } = await supabase
            .from('sys_machines_v2')
            .select('*')
            .order('machine_id');

        if (mError) throw mError;

        // 2. Fetch IoT Configs (to get heartbeats)
        const { data: iotConfigs, error: iError } = await supabase
            .from('iot_device_configs')
            .select('machine_id, last_heartbeat');

        if (iError) throw iError;

        // 3. Merge Heartbeat
        const result = machines.map((m: any) => {
            const iot = iotConfigs.find((i: any) => i.machine_id === m.machine_id);
            return {
                ...m,
                last_heartbeat: iot ? iot.last_heartbeat : null
            };
        });

        return res.status(200).json(result);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
