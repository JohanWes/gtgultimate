export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const adminKey = req.headers['x-admin-key'];
    const envKey = process.env.ADMIN_KEY;

    if (!envKey) {
        return res.status(500).json({ error: 'Server misconfiguration: ADMIN_KEY not set' });
    }

    if (adminKey === envKey) {
        return res.status(200).json({ success: true });
    } else {
        return res.status(401).json({ error: 'Invalid admin key' });
    }
}
