
import clientPromise from './_lib/mongodb.js';

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

            // Cache for 60 seconds, serve stale for background update
            res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
            return res.status(200).json(scores);
        }

        if (req.method === 'POST') {
            const { name, score, runId } = req.body;

            if (!name || typeof score !== 'number') {
                return res.status(400).json({ error: 'Invalid input' });
            }

            const newScore = {
                name: name.trim().substring(0, 20),
                score,
                runId, // Optional run ID
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
