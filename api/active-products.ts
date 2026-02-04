import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Debug Ping
    if (req.query.ping) {
        return res.status(200).json({ status: 'pong', env: process.env.VITE_SUPABASE_URL ? 'set' : 'unset' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://kdahubyhwndgyloaljak.supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamakIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksLCJleHAiOjIwODA5NjI4ODl9.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8";

    // Lazy init
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { mac } = req.query;

    // --- MODE 1: IoT Device Config (if mac is present) ---
    if (mac) {
        try {
            // 1. Query Device Base Config
            const { data: device, error: deviceError } = await supabase
                .from('iot_device_configs')
                .select('*')
                .eq('mac_address', mac)
                .single();

            if (deviceError || !device) {
                // 2. Auto Register
                await supabase.from('iot_device_configs').upsert({
                    mac_address: mac,
                    notes: 'Auto-registered - Pending Assignment'
                }, { onConflict: 'mac_address' });

                return res.status(200).json({
                    status: 'new_device',
                    yield: 1,
                    debounce: 240000,
                    sku: 'UNKNOWN'
                });
            }

            // 3. Query Active Product
            const { data: activeProduct } = await supabase
                .from('machine_active_products')
                .select('*')
                .eq('machine_id', device.machine_id)
                .eq('lane_id', device.lane_id || 'Single')
                .single();

            // 4. Calculate Yield Logic
            const machineWidthMap: Record<string, number> = {
                'N1-M01': 100,
                'N2-M02': 100,
                'T1.3-M02': 100,
                'T1.2-M01': 100,
                'T1.1-M03': 0
            };

            const machineId = device.machine_id;
            const baseWidth = machineWidthMap[machineId] || 100;
            const cuttingSize = activeProduct?.cutting_size || device.cutting_size || 100;
            const activeSku = activeProduct?.product_sku || device.active_product_sku || 'UNKNOWN';
            let yieldCount = activeProduct?.yield || device.count_per_signal || 1;

            if (!activeProduct) {
                if (machineId === 'T1.1-M03') {
                    yieldCount = 2;
                } else if (cuttingSize > 0) {
                    yieldCount = Math.floor(baseWidth / cuttingSize);
                    if (yieldCount < 1) yieldCount = 1;
                }
            }

            // 5. Response
            return res.status(200).json({
                machine_id: machineId,
                lane_id: device.lane_id,
                sku: activeSku,
                yield: yieldCount,
                debounce: device.debounce_ms,
                version: device.firmware_version,
                cutting_size: cuttingSize
            });

        } catch (e: any) {
            return res.status(500).json({ error: e.message });
        }
    }

    // --- MODE 2: Active Products List (Original Logic) ---
    try {
        const { data, error } = await supabase.from('machine_active_products').select('*');
        if (error) throw error;
        return res.status(200).json(data);
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
}
