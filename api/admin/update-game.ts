
import clientPromise from '../_lib/mongodb.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const adminKey = req.headers['x-admin-key'];
    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, name } = req.body;

    if (!id || !name) {
        return res.status(400).json({ error: 'Missing id or name' });
    }

    try {
        const client = await clientPromise;
        const db = client.db('guessthegame');

        const result = await db.collection('games').updateOne(
            { id: id },
            { $set: { name: name.trim() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Game not found' });
        }

        console.log(`Admin update: Game ${id} renamed to ${name}`);
        res.json({ success: true, message: 'Game updated' });

    } catch (err) {
        console.error('Error updating game:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}
