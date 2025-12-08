
import clientPromise from '../_lib/mongodb.js';
import crypto from 'crypto';

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const adminKey = req.headers['x-admin-key'];
    const envKey = process.env.ADMIN_KEY;

    if (!envKey) {
        return res.status(500).json({ error: 'Server misconfiguration: ADMIN_KEY not set' });
    }

    let authorized = false;
    if (adminKey && envKey) {
        try {
            const bufferA = Buffer.from(adminKey as string);
            const bufferB = Buffer.from(envKey);
            if (bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB)) {
                authorized = true;
            }
        } catch (e) {
            // Ignore errors
        }
    }

    if (!authorized) {
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
