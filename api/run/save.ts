import { getClient } from '../_lib/mongodb.js';
import { randomUUID } from 'crypto';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { history, totalScore, totalGames } = req.body;

        if (!Array.isArray(history) || history.length > 500) {
            return res.status(400).json({ error: 'Invalid data' });
        }

        const client = await getClient();
        const db = client.db('guessthegame');
        const collection = db.collection('runs');

        const runId = randomUUID().substring(0, 8); // Short ID for shareability

        const runData: any = {
            _id: runId, // Use custom short ID as _id
            history,
            totalScore: Number(totalScore) || 0,
            totalGames: Number(totalGames) || history.length,
            createdAt: new Date().toISOString()
        };

        await collection.insertOne(runData);

        return res.status(201).json({ id: runId });
    } catch (error) {
        console.error('Save Run API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
