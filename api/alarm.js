
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase Env Vars');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { machine_id, alarm_count } = req.body;

        if (!machine_id) {
            return res.status(400).json({ error: 'machine_id is required' });
        }

        console.log(`[Cloud JS] Received from ${machine_id}`);

        // Resolve Active Product
        let productSku = 'UNKNOWN';
        const { data: activeProduct } = await supabase
            .from('machine_active_products')
            .select('product_sku')
            .eq('machine_id', machine_id)
            .single();

        if (activeProduct) {
            productSku = activeProduct.product_sku;
        }

        const { error } = await supabase.from('production_logs').insert({
            machine_id,
            alarm_count: 2,
            product_sku: productSku
        });

        if (error) throw error;

        res.status(200).json({ status: 'ok', product: productSku });

    } catch (e) {
        console.error("Error:", e);
        res.status(500).json({ error: e.message });
    }
}
