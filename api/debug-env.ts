
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    const url = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const status = {
        VITE_SUPABASE_URL: url ? `Present (${url.substring(0, 10)}...)` : 'MISSING',
        VITE_SUPABASE_ANON_KEY: anonKey ? 'Present' : 'MISSING',
        SUPABASE_SERVICE_ROLE_KEY: serviceKey ? 'Present' : 'MISSING',
        NODE_ENV: process.env.NODE_ENV
    };

    res.status(200).json(status);
}
