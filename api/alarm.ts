
export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    // CORS Headers
    const headers = {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
        'Content-Type': 'application/json'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers });
    }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase Env Vars');
        }

        const { machine_id, alarm_count } = await req.json();

        if (!machine_id) {
            return new Response(JSON.stringify({ error: 'machine_id is required' }), { status: 400, headers });
        }

        // 1. Get Active Product (Fetch)
        let productSku = 'UNKNOWN';
        try {
            const queryUrl = `${supabaseUrl}/rest/v1/machine_active_products?machine_id=eq.${machine_id}&select=product_sku`;
            const getResp = await fetch(queryUrl, {
                method: 'GET',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.pgrst.object+json' // Expect object, not array
                }
            });

            if (getResp.ok) {
                const data = await getResp.json();
                if (data && data.product_sku) {
                    productSku = data.product_sku;
                }
            }
        } catch (e) {
            console.error("Product fetch failed", e);
        }

        // 2. Insert Log (Fetch)
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
            throw new Error(`DB Insert Failed: ${postResp.status}`);
        }

        const result = await postResp.json();

        return new Response(JSON.stringify({
            status: 'ok',
            message: 'Logged via Edge Runtime',
            product: productSku
        }), { status: 200, headers });

    } catch (e) {
        return new Response(JSON.stringify({
            error: e.message,
            stack: e.stack
        }), { status: 500, headers });
    }
}
