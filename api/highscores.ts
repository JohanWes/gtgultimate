
// Vercel Serverless Function for Highscores
// NOTE: On Vercel, the filesystem is read-only/ephemeral. 
// Writing to a local file will NOT persist across deployments or restarts.
// To save highscores permanently, you must connect a database (e.g., MongoDB, Vercel KV, Supabase).

// Simple in-memory cache (will be wiped frequently on serverless)
let memoryScores = [];

export default function handler(req, res) {
    if (req.method === 'GET') {
        // Return top 50
        // In a real app, fetch from DB here
        return res.status(200).json(memoryScores.slice(0, 50));
    }

    if (req.method === 'POST') {
        const { name, score } = req.body;

        if (!name || typeof score !== 'number') {
            return res.status(400).json({ error: 'Invalid input' });
        }

        const newScore = {
            name: name.trim().substring(0, 20),
            score,
            date: new Date().toISOString()
        };

        memoryScores.push(newScore);
        memoryScores.sort((a, b) => b.score - a.score);
        memoryScores = memoryScores.slice(0, 100);

        // In a real app, INSERT into DB here

        return res.status(201).json(newScore);
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
