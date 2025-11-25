import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
// Use a data directory for persistence, compatible with docker volume mounting
const DATA_DIR = path.join(__dirname, 'data');
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

// POST /api/highscores
app.post('/api/highscores', (req, res) => {
    const { name, score } = req.body;

    if (!name || typeof score !== 'number') {
        return res.status(400).json({ error: 'Invalid input' });
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

// Handle SPA routing - return index.html for all other routes
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});
