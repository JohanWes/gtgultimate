import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

export default function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Vercel/Node: Resolve path relative to process.cwd()
        const dbPath = path.join(process.cwd(), 'data', 'games_db.json');

        if (!fs.existsSync(dbPath)) {
            return res.status(404).json({ error: 'Database not found' });
        }

        const fileContents = fs.readFileSync(dbPath, 'utf8');
        const data = JSON.parse(fileContents);

        res.status(200).json(data);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
