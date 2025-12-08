import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
// Use a data directory for persistence, compatible with docker volume mounting
const DATA_DIR = path.join(__dirname, 'storage');
const DATA_FILE = path.join(DATA_DIR, 'highscores.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(cors());
app.use(bodyParser.json());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize highscores file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// Helper to read scores
const readScores = () => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading scores:', err);
        return [];
    }
};

// Helper to write scores
const writeScores = (scores) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(scores, null, 2));
    } catch (err) {
        console.error('Error writing scores:', err);
    }
};

// GET /api/highscores
app.get('/api/highscores', (req, res) => {
    const scores = readScores();
    // Return top 50
    res.json(scores.slice(0, 50));
});

// GET /api/image-proxy
app.get('/api/image-proxy', async (req, res) => {
    const { path: imagePath } = req.query;

    if (!imagePath || typeof imagePath !== 'string') {
        return res.status(400).json({ error: 'Missing path parameter' });
    }

    const targetUrl = `https://images.igdb.com/igdb/image/upload/${imagePath}`;

    try {
        const imageRes = await fetch(targetUrl);

        if (!imageRes.ok) {
            return res.status(imageRes.status).send('Failed to fetch image');
        }

        const buffer = await imageRes.arrayBuffer();
        const bufferObj = Buffer.from(buffer);

        res.setHeader('Content-Type', imageRes.headers.get('content-type') || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.send(bufferObj);

    } catch (error) {
        console.error('Image proxy error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/highscores
app.post('/api/highscores', (req, res) => {
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
        name: name.trim().substring(0, 20), // Limit name length
        score,
        date: new Date().toISOString()
    };

    let scores = readScores();
    scores.push(newScore);

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Keep top 100 to save space
    scores = scores.slice(0, 100);

    writeScores(scores);

    res.status(201).json(newScore);
});

// Define path to games_db.json
const GAMES_DB_FILE = path.join(__dirname, 'data', 'games_db.json');

// GET /api/games
app.get('/api/games', (req, res) => {
    try {
        if (!fs.existsSync(GAMES_DB_FILE)) {
            return res.status(404).json({ error: 'Games database not found' });
        }
        const data = fs.readFileSync(GAMES_DB_FILE, 'utf8');
        const games = JSON.parse(data);
        res.json(games);
    } catch (err) {
        console.error('Error reading games database:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/verify
app.post('/api/admin/verify', (req, res) => {
    const adminKey = req.headers['x-admin-key'];

    if (!process.env.ADMIN_KEY) {
        console.error('ADMIN_KEY not set in environment variables');
        return res.status(500).json({ error: 'Server misconfiguration' });
    }

    if (adminKey === process.env.ADMIN_KEY) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid admin key' });
    }
});

// POST /api/admin/update-game
app.post('/api/admin/update-game', (req, res) => {
    const adminKey = req.headers['x-admin-key'];

    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, name } = req.body;

    if (!id || !name) {
        return res.status(400).json({ error: 'Missing id or name' });
    }

    try {
        if (!fs.existsSync(GAMES_DB_FILE)) {
            return res.status(404).json({ error: 'Games database not found' });
        }

        const data = fs.readFileSync(GAMES_DB_FILE, 'utf8');
        const games = JSON.parse(data);

        const gameIndex = games.findIndex(g => g.id === id);
        if (gameIndex === -1) {
            return res.status(404).json({ error: 'Game not found' });
        }

        // Update the name
        games[gameIndex].name = name.trim();

        // Write back to file
        fs.writeFileSync(GAMES_DB_FILE, JSON.stringify(games, null, 2));

        console.log(`Updated game ${id} name to: ${name}`);
        res.json({ success: true, game: games[gameIndex] });
    } catch (err) {
        console.error('Error updating game:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/delete-game
app.post('/api/admin/delete-game', (req, res) => {
    const adminKey = req.headers['x-admin-key'];

    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'Missing id' });
    }

    try {
        if (!fs.existsSync(GAMES_DB_FILE)) {
            return res.status(404).json({ error: 'Games database not found' });
        }

        const data = fs.readFileSync(GAMES_DB_FILE, 'utf8');
        let games = JSON.parse(data);

        const gameIndex = games.findIndex(g => g.id === id);
        if (gameIndex === -1) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const gameName = games[gameIndex].name;

        // Remove the game
        games.splice(gameIndex, 1);

        // Write back to file
        fs.writeFileSync(GAMES_DB_FILE, JSON.stringify(games, null, 2));

        console.log(`Deleted game ${id}: ${gameName}`);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting game:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/migrate-screenshots
app.post('/api/admin/migrate-screenshots', async (req, res) => {
    const adminKey = req.headers['x-admin-key'];

    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Dynamically import the migration module
        const { runMigration } = await import('./scripts/migrate_screenshots.ts');

        // Run the migration
        const result = await runMigration();

        res.json(result);
    } catch (err) {
        console.error('Error running migration:', err);
        res.status(500).json({
            success: false,
            error: 'Migration failed',
            message: err.message || 'Unknown error'
        });
    }
});

// Handle SPA routing - return index.html for all other routes
app.get(/(.*)/, (req, res) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ error: 'Resource not found and SPA index.html missing' });
    }
});

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});
