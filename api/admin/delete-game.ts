
import clientPromise from '../_lib/mongodb.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const adminKey = req.headers['x-admin-key'];
    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'Missing id' });
    }

    try {
        const client = await clientPromise;
        const db = client.db('guessthegame');

        const result = await db.collection('games').deleteOne({ id: id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Game not found' });
        }

        console.log(`Admin deleted game ${id}`);
        res.json({ success: true });

    } catch (err) {
        console.error('Error deleting game:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}
