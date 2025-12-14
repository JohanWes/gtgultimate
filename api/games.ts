import type { VercelRequest, VercelResponse } from '@vercel/node';

import clientPromise from './_lib/mongodb.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const client = await clientPromise;
        const db = client.db('guessthegame');

        const games = await db.collection('games').find({}).toArray();

        // Remove MongoDB internal _id field to keep client cleaner
        const cleanGames = games.map(game => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _id, ...rest } = game;
            return rest;
        });

        res.status(200).json(cleanGames);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
