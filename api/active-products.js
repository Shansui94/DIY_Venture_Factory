const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    try {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const { mac, ping } = req.query;

        if (ping) {
            return res.status(200).json({ status: 'js_pong', env: !!process.env.VITE_SUPABASE_URL });
        }

        const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://kdahubyhwndgyloaljak.supabase.co";
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYWh1Ynlod25kZ3lsb2FsamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODY4ODksImV4cCI6MjA4MDk2Mjg4OX0.mzTtQ6zpfvRY07372UH_M4dvKPzHBDkiydwosUYPs-8";
        const supabase = createClient(supabaseUrl, supabaseKey);

        if (mac) {
            const { data: device, error: deviceError } = await supabase
                .from('iot_device_configs')
                .select('*')
                .eq('mac_address', mac)
                .single();

            if (deviceError || !device) {
                await supabase.from('iot_device_configs').upsert({
                    mac_address: mac,
                    notes: 'Auto-registered'
                }, { onConflict: 'mac_address' });

                return res.status(200).json({ status: 'new', yield: 1, debounce: 240000, sku: 'UNKNOWN' });
            }

            const { data: activeProduct } = await supabase
                .from('machine_active_products')
                .select('*')
                .eq('machine_id', device.machine_id)
                .eq('lane_id', device.lane_id || 'Single')
                .single();

            const machineId = device.machine_id;
            const cuttingSize = activeProduct?.cutting_size || device.cutting_size || 100;
            const activeSku = activeProduct?.product_sku || device.active_product_sku || 'UNKNOWN';
            let yieldCount = activeProduct?.yield || device.count_per_signal || 1;

            return res.status(200).json({
                machine_id: machineId,
                lane_id: device.lane_id,
                sku: activeSku,
                yield: yieldCount,
                debounce: device.debounce_ms
            });
        }

        const { data, error } = await supabase.from('machine_active_products').select('*');
        if (error) throw error;
        return res.status(200).json(data);

    } catch (e) {
        return res.status(200).json({ error: true, message: e.message, stack: e.stack });
    }
};
