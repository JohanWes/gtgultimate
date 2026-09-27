import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Fuse from 'fuse.js';
import crypto from 'crypto';
import { MongoClient } from 'mongodb';
import { rateLimit } from 'express-rate-limit';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Docker runs behind a reverse proxy (proxynet); trust one hop so rate limiting keys on the client IP, not the proxy's.
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' })); // run saves carry up to 500 history entries

// --- CONSTANTS & PATHS ---
const DATA_DIR = path.join(__dirname, 'data');
const STORAGE_DIR = path.join(__dirname, 'storage');
const RUNS_DIR = path.join(STORAGE_DIR, 'runs');
const GAMES_DB = path.join(DATA_DIR, 'games_db.json');
const HIGHSCORES_DB = path.join(STORAGE_DIR, 'highscores.json');
const DIST_DIR = path.join(__dirname, 'dist');
const RUN_ID_RE = /^[0-9a-f]{8}$/;
const ALLOWED_IMAGE_HOSTS = ['images.igdb.com'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 });

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
        mongoClientPromise = client.connect().catch((err) => {
            mongoClientPromise = null;
            throw err;
        });
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
        const params = new URLSearchParams({
            client_id: process.env.IGDB_CLIENT_ID ?? '',
            client_secret: process.env.IGDB_CLIENT_SECRET ?? '',
            grant_type: 'client_credentials',
        });
        const response = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, { method: 'POST' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        igdbToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
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
        const response = await fetch('https://api.igdb.com/v4/games', {
            method: 'POST',
            headers: {
                'Client-ID': process.env.IGDB_CLIENT_ID ?? '',
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'text/plain',
            },
            body: query,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data && data.length > 0 ? data[0] : null;
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
    } catch {
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
        // Filter out games without usable screenshots (default pool only).
        // Horse pool is left untouched to preserve its curated set.
        const filtered = games.filter(g =>
            Array.isArray(g.screenshots) &&
            g.screenshots.length >= 5 &&
            g.screenshots.every(s => typeof s === 'string' && s.length > 0)
        );
        return res.json(filtered);
    }

    try {
        const client = await getMongoClient();
        const db = client.db('guessthegame');
        const games = await db.collection('horse_games').find({}, { projection: { _id: 0 } }).toArray();
        return res.json(games);
    } catch (err) {
        console.error('Failed to load horse games:', err);
        return res.status(503).json({ error: 'Horse games unavailable in local mode without MongoDB.' });
    }
});

// Highscores
app.get('/api/highscores', (req, res) => {
    const scores = readJson(HIGHSCORES_DB);
    const sorted = Array.isArray(scores) ? scores.sort((a, b) => b.score - a.score).slice(0, 50) : [];
    res.json(sorted);
});

app.post('/api/highscores', writeLimiter, (req, res) => {
    const { name, score, runId } = req.body;
    if (
        typeof name !== 'string' || !name.trim() ||
        !Number.isInteger(score) || score < 0 || score > 10000 ||
        (runId !== undefined && (typeof runId !== 'string' || !RUN_ID_RE.test(runId)))
    ) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    let scores = readJson(HIGHSCORES_DB);
    if (!Array.isArray(scores)) scores = [];

    const newScore = {
        name: name.trim().substring(0, 20),
        score,
        date: new Date().toISOString(),
        runId
    };
    scores.push(newScore);
    const sorted = scores.sort((a, b) => b.score - a.score).slice(0, 100);
    writeJson(HIGHSCORES_DB, sorted);
    res.status(201).json(newScore);
});

// Image Proxy
app.get('/api/image-proxy', async (req, res) => {
    let parsed;
    try {
        parsed = new URL(req.query.url);
    } catch {
        return res.status(400).send('Invalid URL');
    }
    if (parsed.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.includes(parsed.hostname)) {
        return res.status(400).send('URL not allowed');
    }

    try {
        const response = await fetch(parsed.href, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) throw new Error('Image too large');
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.startsWith('image/')) return res.status(400).send('Not an image');
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > MAX_IMAGE_BYTES) throw new Error('Image too large');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(buffer);
    } catch {
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
    res.json({ success: true });
});

// Run: Save
app.post('/api/run/save', writeLimiter, (req, res) => {
    const { history, totalScore, totalGames } = req.body;
    if (!Array.isArray(history) || history.length > 500) return res.status(400).json({ error: 'Invalid data' });

    const id = crypto.randomUUID().slice(0, 8);
    const run = {
        _id: id,
        history,
        totalScore: Number(totalScore) || 0,
        totalGames: Number(totalGames) || history.length,
        createdAt: new Date().toISOString()
    };
    if (!writeJson(path.join(RUNS_DIR, `${id}.json`), run)) return res.status(500).json({ error: 'Internal Server Error' });
    res.status(201).json({ id });
});

// Run: Get (same shape as the Vercel route, which returns the Mongo doc with _id)
app.get('/api/run/:id', (req, res) => {
    const { id } = req.params;
    if (!RUN_ID_RE.test(id)) return res.status(404).json({ error: 'Run not found' });
    const run = readJson(path.join(RUNS_DIR, `${id}.json`));
    if (!run || Array.isArray(run)) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
});

// Serve the built frontend (Docker/production mode)
if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    // Hashed build assets never change; index.html keeps the default (no long cache)
    app.use('/assets', express.static(path.join(DIST_DIR, 'assets'), { maxAge: '1y', immutable: true }));
    app.use(express.static(DIST_DIR));
    app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}


// Start Server
app.listen(PORT, () => {
    console.log(`Local Prod Server running on http://localhost:${PORT}`);
});
