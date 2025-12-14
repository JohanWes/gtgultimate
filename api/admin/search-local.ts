
import clientPromise from '../_lib/mongodb.js';
import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const adminKey = req.headers['x-admin-key'];
    const envKey = process.env.ADMIN_KEY;

    let authorized = false;
    if (adminKey && envKey) {
        try {
            const bufferA = Buffer.from(adminKey as string);
            const bufferB = Buffer.from(envKey);
            if (bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB)) {
                authorized = true;
            }
        } catch (e) { }
    }

    if (!authorized) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { query } = req.body;

    try {
        const client = await clientPromise;
        const db = client.db('guessthegame');

        if (!query) {
            // Return top 50 if no query
            const games = await db.collection('games')
                .find({})
                .limit(50)
                .toArray();
            return res.json(games);
        }

        // Use Regex for simple search 
        // Note: For large DBs, text index is better, but regex is fine for ~2600 items
        const games = await db.collection('games')
            .find({
                name: { $regex: query, $options: 'i' }
            })
            .limit(50)
            .toArray();

        res.json(games);

    } catch (err) {
        console.error('Error searching games:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}
