import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';
import Fuse from 'fuse.js';
import crypto from 'crypto';
import { MongoClient } from 'mongodb';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// --- CONSTANTS & PATHS ---
const DATA_DIR = path.join(__dirname, 'data');
const STORAGE_DIR = path.join(__dirname, 'storage');
const RUNS_DIR = path.join(STORAGE_DIR, 'runs');
const GAMES_DB = path.join(DATA_DIR, 'games_db.json');
const HIGHSCORES_DB = path.join(STORAGE_DIR, 'highscores.json');

// Ensure storage directories exist
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
if (!fs.existsSync(RUNS_DIR)) fs.mkdirSync(RUNS_DIR, { recursive: true });

// --- HELPERS ---
const readJson = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err);
        return [];
    }
};

const writeJson = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error(`Error writing ${filePath}:`, err);
        return false;
    }
};

let mongoClientPromise = null;
const getMongoClient = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is required for horse games');
    }

    if (!mongoClientPromise) {
        const client = new MongoClient(uri, {
            maxPoolSize: 10,
            minPoolSize: 1,
            maxIdleTimeMS: 30000
        });
        mongoClientPromise = client.connect();
    }

    return mongoClientPromise;
};

// --- IGDB HELPERS ---
let igdbToken = null;
let tokenExpiry = 0;

async function getIgdbAccessToken() {
    if (igdbToken && Date.now() < tokenExpiry) {
        return igdbToken;
    }

    console.log('Authenticating with IGDB...');
    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.IGDB_CLIENT_ID,
                client_secret: process.env.IGDB_CLIENT_SECRET,
                grant_type: 'client_credentials',
            },
        });
        igdbToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
        return igdbToken;
    } catch (error) {
        console.error('Error getting IGDB access token:', error.message);
        throw new Error('Failed to authenticate with IGDB');
    }
}

async function searchIgdbGame(name, accessToken) {
    const query = `
        fields id, name, first_release_date, platforms.name, genres.name, summary, aggregated_rating, rating, screenshots.url, cover.url, rating_count;
        search "${name.replace(/"/g, '\\"')}";
        limit 1;
    `;

    try {
        const response = await axios.post(
            'https://api.igdb.com/v4/games',
            query,
            {
                headers: {
                    'Client-ID': process.env.IGDB_CLIENT_ID,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'text/plain',
                },
            }
        );
        return response.data && response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
        console.error(`Error searching IGDB for ${name}:`, error.message);
        return null;
    }
}

// --- MIDDLEWARE ---
const requireAdmin = (req, res, next) => {
    const adminKey = req.headers['x-admin-key'];
    const envKey = process.env.ADMIN_KEY;

    if (!envKey) {
        console.warn('ADMIN_KEY not set in .env');
        return res.status(500).json({ error: 'Server misconfiguration' });
    }

    if (!adminKey) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const bufferA = Buffer.from(adminKey);
        const bufferB = Buffer.from(envKey);
        if (bufferA.length !== bufferB.length || !crypto.timingSafeEqual(bufferA, bufferB)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
};

// --- ROUTES ---

// Games
app.get('/api/games', async (req, res) => {
    const pool = req.query.pool ?? 'default';

    if (pool !== 'default' && pool !== 'horse') {
        return res.status(400).json({ error: 'Invalid pool value' });
    }

    if (pool === 'default') {
        const games = readJson(GAMES_DB);
        return res.json(games);
    }

    try {
        const client = await getMongoClient();
        const db = client.db('guessthegame');
        const games = await db.collection('horse_games').find({}).toArray();
        const cleanGames = games.map(game => {
            const { _id, ...rest } = game;
            return rest;
        });
        return res.json(cleanGames);
    } catch (err) {
        console.error('Failed to load horse games:', err);
        return res.status(503).json({ error: 'Horse games unavailable in local mode without MongoDB.' });
    }
});

// Highscores
app.get('/api/highscores', (req, res) => {
    const scores = readJson(HIGHSCORES_DB);
    const sorted = Array.isArray(scores) ? scores.sort((a, b) => b.score - a.score).slice(0, 100) : [];
    res.json(sorted);
});

app.post('/api/highscores', (req, res) => {
    const { name, score, runId } = req.body;
    if (!name || score === undefined) return res.status(400).json({ error: 'Missing name or score' });

    let scores = readJson(HIGHSCORES_DB);
    if (!Array.isArray(scores)) scores = [];

    const newScore = {
        name,
        score,
        date: new Date().toISOString(),
        runId
    };
    scores.push(newScore);
    const sorted = scores.sort((a, b) => b.score - a.score).slice(0, 100);
    writeJson(HIGHSCORES_DB, sorted);
    res.json(newScore);
});

// Image Proxy
app.get('/api/image-proxy', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('Missing URL');

    try {
        const response = await axios.get(url, { responseType: 'stream' });
        res.setHeader('Content-Type', response.headers['content-type']);
        response.data.pipe(res);
    } catch (err) {
        // console.error('Proxy error:', err.message);
        res.status(500).send('Error fetching image');
    }
});

// Admin: Request Game
app.post('/api/admin/request-game', requireAdmin, async (req, res) => {
    const { name, skipCheck } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });

    try {
        // 1. Duplicate Check
        if (!skipCheck) {
            const games = readJson(GAMES_DB);
            const fuse = new Fuse(games, { keys: ['name'], threshold: 0.3 });
            const results = fuse.search(name);
            if (results.length > 0) {
                return res.status(409).json({
                    error: 'Potential duplicates found',
                    similarGames: results.slice(0, 5).map(r => r.item.name)
                });
            }
        }

        // 2. IGDB Search
        const token = await getIgdbAccessToken();
        const gameData = await searchIgdbGame(name, token);

        if (!gameData) {
            return res.status(404).json({ error: `Game "${name}" not found on IGDB.` });
        }

        const allScreenshots = gameData.screenshots || [];
        if (allScreenshots.length < 5) {
            return res.status(400).json({
                error: `Found "${gameData.name}" but it has only ${allScreenshots.length} screenshots (5 required).`
            });
        }

        const screenshots = allScreenshots
            .slice(0, 10)
            .map(s => s.url.replace('t_thumb', 't_720p').replace('//', 'https://'));

        const cover = gameData.cover ? gameData.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://') : null;

        res.json({
            id: gameData.id,
            name: gameData.name,
            year: gameData.first_release_date ? new Date(gameData.first_release_date * 1000).getFullYear() : 0,
            platform: gameData.platforms ? gameData.platforms[0].name : 'Unknown',
            genre: gameData.genres ? gameData.genres[0].name : 'Unknown',
            synopsis: gameData.summary || '',
            rating: Math.round(gameData.aggregated_rating || gameData.rating || 0),
            cover,
            availableScreenshots: screenshots
        });

    } catch (err) {
        console.error('Error requesting game:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Add Game
app.post('/api/admin/add-game', requireAdmin, (req, res) => {
    const { gameData, selectedScreenshots } = req.body;
    const games = readJson(GAMES_DB);

    if (games.some(g => g.id === gameData.id)) {
        return res.status(409).json({ error: 'Game already exists' });
    }

    const newGame = {
        ...gameData,
        screenshots: selectedScreenshots,
        synopsis: gameData.synopsis,
        addedAt: new Date().toISOString()
    };
    // Ensure we only keep what we need, but spreading gameData is fine if it matches schema
    // In prod we might extract explicit fields.

    games.push(newGame);
    writeJson(GAMES_DB, games);
    res.json({ success: true, game: newGame });
});

// Admin: Update Game
app.post('/api/admin/update-game', requireAdmin, (req, res) => {
    const { id, name, platform, genre } = req.body;
    const games = readJson(GAMES_DB);
    const index = games.findIndex(g => g.id === id);
    if (index === -1) return res.status(404).json({ error: 'Game not found' });

    games[index] = { ...games[index], name, platform, genre };
    writeJson(GAMES_DB, games);
    res.json({ success: true, game: games[index] });
});

// Admin: Delete Game
app.post('/api/admin/delete-game', requireAdmin, (req, res) => {
    const { id } = req.body;
    let games = readJson(GAMES_DB);
    const initialLen = games.length;
    games = games.filter(g => g.id !== id);

    if (games.length === initialLen) return res.status(404).json({ error: 'Game not found' });

    writeJson(GAMES_DB, games);
    res.json({ success: true });
});

// Admin: Search Local
app.post('/api/admin/search-local', requireAdmin, (req, res) => {
    const { query } = req.body;
    const games = readJson(GAMES_DB);
    if (!query) {
        return res.json(games);
    }
    const fuse = new Fuse(games, { keys: ['name'], threshold: 0.3 });
    const results = fuse.search(query).map(r => r.item);
    res.json(results);
});

// Admin: Verify (Optional but good practice)
app.post('/api/admin/verify', requireAdmin, (req, res) => {
    res.json({ valid: true });
});

// Run: Save
app.post('/api/run/save', (req, res) => {
    const runData = req.body;
    if (!runData.id) return res.status(400).json({ error: 'Missing run ID' });

    writeJson(path.join(RUNS_DIR, `${runData.id}.json`), runData);
    res.json({ success: true });
});

// Run: Get
app.get('/api/run/:id', (req, res) => {
    const run = readJson(path.join(RUNS_DIR, `${req.params.id}.json`));
    if (!run || Object.keys(run).length === 0) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
});


// Start Server
app.listen(PORT, () => {
    console.log(`Local Prod Server running on http://localhost:${PORT}`);
});
