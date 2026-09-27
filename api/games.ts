import type { VercelRequest, VercelResponse } from '@vercel/node';

import { getClient } from './_lib/mongodb.js';

const PROJECTION = {
    _id: 0, id: 1, name: 1, year: 1, platform: 1, genre: 1, rating: 1,
    screenshots: 1, cover: 1, cropPositions: 1, synopsis: 1, redactedRegions: 1,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const poolParam = Array.isArray(req.query.pool) ? req.query.pool[0] : req.query.pool;
        const pool = poolParam ?? 'default';

        if (pool !== 'default' && pool !== 'horse') {
            return res.status(400).json({ error: 'Invalid pool value' });
        }

        const collectionName = pool === 'horse' ? 'horse_games' : 'games';

        const client = await getClient();
        const db = client.db('guessthegame');

        // Only the fields the client uses. Natural order is what clients have always seen (Standard mode maps level -> index);
        // it does NOT match _id order in this collection, so do not sort by _id.
        const filter = pool === 'default' ? { 'screenshots.4': { $exists: true } } : {};
        const games = await db.collection(collectionName)
            .find(filter, { projection: PROJECTION })
            .sort({ $natural: 1 })
            .toArray();

        const hasValidScreenshots = (g: Record<string, unknown>): boolean =>
            Array.isArray(g.screenshots) &&
            g.screenshots.length >= 5 &&
            (g.screenshots as unknown[]).every(s => typeof s === 'string' && s.length > 0);

        // Filter out games without usable screenshots (default pool only).
        // Horse pool is left untouched to preserve its curated set.
        const filtered = pool === 'default' ? games.filter(hasValidScreenshots) : games;

        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
        res.status(200).json(filtered);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
