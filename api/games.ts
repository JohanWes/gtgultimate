
import clientPromise from '../lib/mongodb';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const client = await clientPromise;
        const db = client.db('guessthegame');

        const games = await db.collection('games').find({}).toArray();

        // Remove MongoDB internal _id field to keep client cleaner
        const cleanGames = games.map(game => {
            const { _id, ...rest } = game;
            return rest;
        });

        res.status(200).json(cleanGames);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
