import clientPromise from '../_lib/mongodb.js';

export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
        const client = await clientPromise;
        const db = client.db('guessthegame');
        const collection = db.collection('runs');

        const run = await collection.findOne({ _id: id } as any);

        if (!run) {
            return res.status(404).json({ error: 'Run not found' });
        }

        // Run data is immutable once saved, cache for 1 hour
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        return res.status(200).json(run);
    } catch (error) {
        console.error('Get Run API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
