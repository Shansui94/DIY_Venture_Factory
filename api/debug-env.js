
export default function handler(req, res) {
    res.status(200).json({
        url: process.env.VITE_SUPABASE_URL ? 'Present' : 'Missing',
        key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing'
    });
}
