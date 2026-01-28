import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { machine_id, product_sku } = req.body;
        if (!machine_id || !product_sku) return res.status(400).json({ error: 'Missing params' });

        const { error } = await supabase.from('machine_active_products').upsert({
            machine_id,
            product_sku,
            updated_at: new Date()
        });

        if (error) throw error;
        return res.status(200).json({ status: 'ok', active_sku: product_sku });

    } catch (e: any) {
        console.error("Set Product Error", e);
        return res.status(500).json({ error: e.message });
    }
}
