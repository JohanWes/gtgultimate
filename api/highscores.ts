
import clientPromise from './_lib/mongodb.js';

import crypto from 'crypto';

export default async function handler(req, res) {
    try {
        const client = await clientPromise;
        const db = client.db('guessthegame');
        const collection = db.collection('highscores');

        if (req.method === 'GET') {
            // Return top 50 scores - sorted by score descending
            const scores = await collection
                .find({}, { projection: { _id: 0 } }) // Exclude _id
                .sort({ score: -1 })
                .limit(50)
                .toArray();

            return res.status(200).json(scores);
        }

        if (req.method === 'POST') {
            const { name, score, signature } = req.body;

            if (!name || typeof score !== 'number') {
                return res.status(400).json({ error: 'Invalid input' });
            }

            const secret = process.env.HIGHSCORE_SECRET;
            if (secret) {
                if (!signature) {
                    return res.status(400).json({ error: 'Missing signature' });
                }
                const expectedSignature = crypto.createHash('sha256').update(`${score}-${secret}`).digest('hex');
                if (signature !== expectedSignature) {
                    return res.status(403).json({ error: 'Invalid signature' });
                }
            }

            const newScore = {
                name: name.trim().substring(0, 20),
                score,
                date: new Date().toISOString()
            };

            await collection.insertOne(newScore);

            return res.status(201).json(newScore);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Highscore API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
