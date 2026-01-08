
// CommonJS Handler for Vercel
// Uses internal fetch (Node 18+)
// Saved as .cjs to bypass package.json "type": "module"

module.exports = async function handler(req, res) {
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

        const { machine_id, alarm_count } = req.body;
        if (!machine_id) {
            return res.status(400).json({ error: 'machine_id is required' });
        }

        console.log(`[Cloud CJS] Alarm from ${machine_id}`);

        // 1. Get Active Product (Native Fetch)
        let productSku = 'UNKNOWN';
        try {
            const queryUrl = `${supabaseUrl}/rest/v1/machine_active_products?machine_id=eq.${machine_id}&select=product_sku`;
            const getResp = await fetch(queryUrl, {
                method: 'GET',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.pgrst.object+json'
                }
            });

            if (getResp.ok) {
                const data = await getResp.json();
                if (data && data.product_sku) {
                    productSku = data.product_sku;
                }
            }
        } catch (err) {
            console.error("Fetch Product Error:", err);
        }

        // 2. Insert Log
        const postUrl = `${supabaseUrl}/rest/v1/production_logs`;
        const postResp = await fetch(postUrl, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                machine_id: machine_id,
                alarm_count: 2,
                product_sku: productSku
            })
        });

        if (!postResp.ok) {
            const errorText = await postResp.text();
            throw new Error(`Supabase Insert Failed: ${postResp.status} - ${errorText}`);
        }

        const responseData = await postResp.json();
        res.status(200).json({
            status: 'ok',
            message: 'Logged via CJS Fetch',
            product: productSku,
            data: responseData
        });

    } catch (e) {
        console.error("Handler Error:", e);
        res.status(500).json({
            error: e.message,
            stack: e.stack
        });
    }
};
