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
        const { machine_id, alarm_count } = req.body;

        if (!machine_id) {
            return res.status(400).json({ error: 'machine_id is required' });
        }

        console.log(`Received alarm from ${machine_id}, count: ${alarm_count || 1}`);

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

        // Always use the count sent by the hardware (Dual Lane = 2)
        const { error } = await supabase.from('production_logs').insert({
            machine_id,
            alarm_count: alarm_count || 1,
            product_sku: productSku
        });

        if (error) throw error;

        return res.status(200).json({ status: 'ok', message: 'Logged successfully', product: productSku });

    } catch (e: any) {
        console.error("Alarm Log Error:", e);
        return res.status(500).json({ error: e.message || "Failed to log alarm" });
    }
}
