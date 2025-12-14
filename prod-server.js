import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import sharp from 'sharp';
import axios from 'axios';
import crypto from 'crypto';
import helmet from 'helmet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


// Security Configuration
const ALLOWED_IMAGE_HOSTS = ['images.igdb.com'];

// Rate Limiting
import rateLimit from 'express-rate-limit';
const highscoreLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: { error: 'Too many highscore submissions, please try again later' }
});
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
app.use(helmet());
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
app.post('/api/highscores', highscoreLimiter, (req, res) => {
    const { name, score, runId } = req.body;

    if (!name || typeof score !== 'number') {
        return res.status(400).json({ error: 'Invalid input' });
    }

    const newScore = {
        name: name.trim().substring(0, 20), // Limit name length
        score,
        runId, // Optional run ID
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

// Runs Persistence for Local Dev
const RUNS_FILE = path.join(DATA_DIR, 'runs.json');

// Initialize runs file if it doesn't exist
if (!fs.existsSync(RUNS_FILE)) {
    fs.writeFileSync(RUNS_FILE, JSON.stringify([], null, 2));
}

const readRuns = () => {
    try {
        const data = fs.readFileSync(RUNS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading runs:', err);
        return [];
    }
};

const writeRuns = (runs) => {
    try {
        fs.writeFileSync(RUNS_FILE, JSON.stringify(runs, null, 2));
    } catch (err) {
        console.error('Error writing runs:', err);
    }
};

// POST /api/run/save
app.post('/api/run/save', (req, res) => {
    const { history, totalScore, totalGames } = req.body;

    if (!history || !Array.isArray(history)) {
        return res.status(400).json({ error: 'Invalid data' });
    }

    const runs = readRuns();
    const runId = crypto.randomUUID().substring(0, 8);

    const newRun = {
        _id: runId,
        history,
        totalScore,
        totalGames,
        createdAt: new Date().toISOString()
    };

    runs.push(newRun);
    writeRuns(runs);

    res.status(201).json({ id: runId });
});

// GET /api/run/:id
app.get('/api/run/:id', (req, res) => {
    const { id } = req.params;
    const runs = readRuns();
    const run = runs.find(r => r._id === id);

    if (!run) {
        return res.status(404).json({ error: 'Run not found' });
    }

    res.json(run);
});

// GET /api/image-proxy
app.get('/api/image-proxy', async (req, res) => {
    const { url, x, y, zoom } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        const decodedUrl = decodeURIComponent(url);

        // SSRF Protection: Validate Host
        try {
            const parsedUrl = new URL(decodedUrl);
            if (!ALLOWED_IMAGE_HOSTS.includes(parsedUrl.hostname)) {
                return res.status(403).json({ error: 'Domain not allowed' });
            }
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL' });
        }

        const response = await axios({
            url: decodedUrl,
            responseType: 'arraybuffer'
        });

        const buffer = Buffer.from(response.data);

        // If no crop parameters, return original image
        if (!x || !y || !zoom || parseFloat(zoom) <= 100) {
            res.set('Content-Type', response.headers['content-type']);
            res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
            return res.send(buffer);
        }

        // Apply cropping
        const image = sharp(buffer);
        const metadata = await image.metadata();
        const width = metadata.width;
        const height = metadata.height;

        const zoomVal = parseFloat(zoom);
        const xPos = parseFloat(x);
        const yPos = parseFloat(y);

        // Calculate crop view
        // The frontend shows a window of 100% width/height of the container.
        // The background-size is "zoom%".
        // The background-position is "x% y%".

        // Logical logic for crop:
        // Visible portion width = Total Width / (Zoom / 100)
        // Visible portion height = Total Height / (Zoom / 100)
        const scale = zoomVal / 100;
        const cropWidth = Math.round(width / scale);
        const cropHeight = Math.round(height / scale);

        // Calculate top-left based on background-position percentages
        // bg-pos x% means: align the point x% of the image with the point x% of the container.
        // Formula for top/left in CSS background-position:
        // left = (containerWidth - imageWidth) * (x / 100) <--- this is relative to container, not what we want.

        // Let's reverse engineer from what the user sees.
        // The user sees a "portal" into the image.
        // We need to extract exactly that portal.

        // Actually, CSS background-position percentages are tricky.
        // "50% 50%" means center of image is at center of container.
        // "0% 0%" means top-left of image is at top-left of container.
        // "100% 100%" means bottom-right of image is at bottom-right of container.

        // The "visible window" size is (1/scale) * imageDimensions.
        // The "available traverse space" for the top-left corner of the crop is (ImageWidth - CropWidth).
        // cropX = (ImageWidth - CropWidth) * (x / 100)

        const maxScrollX = width - cropWidth;
        const maxScrollY = height - cropHeight;

        let cropX = Math.round(maxScrollX * (xPos / 100));
        let cropY = Math.round(maxScrollY * (yPos / 100));

        // Clamp values
        cropX = Math.max(0, Math.min(cropX, maxScrollX));
        cropY = Math.max(0, Math.min(cropY, maxScrollY));

        const croppedImage = await image
            .extract({ left: cropX, top: cropY, width: cropWidth, height: cropHeight })
            .toBuffer();

        res.set('Content-Type', response.headers['content-type']);
        // Don't cache aggressively for dynamic crops, or do? 
        // Use a shorter cache for crops or vary header? 
        // Let's cache it, the URL params make it unique enough.
        res.set('Cache-Control', 'public, max-age=86400'); // 1 day
        res.send(croppedImage);

    } catch (err) {
        console.error('Error proxying image:', err);
        res.status(500).json({ error: 'Failed to proxy image' });
    }
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



    // ... imports ...

    if (adminKey && process.env.ADMIN_KEY) {
        try {
            const bufferA = Buffer.from(adminKey);
            const bufferB = Buffer.from(process.env.ADMIN_KEY);
            if (bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB)) {
                res.json({ success: true });
                return;
            }
        } catch (e) {
            // Buffer creation failed
        }
    }

    res.status(401).json({ error: 'Invalid admin key' });
});

// POST /api/admin/update-game
app.post('/api/admin/update-game', (req, res) => {
    const adminKey = req.headers['x-admin-key'];

    if (!process.env.ADMIN_KEY) {
        return res.status(500).json({ error: 'Server misconfiguration' });
    }

    let authorized = false;
    if (adminKey && process.env.ADMIN_KEY) {
        try {
            const bufferA = Buffer.from(adminKey);
            const bufferB = Buffer.from(process.env.ADMIN_KEY);
            if (bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB)) {
                authorized = true;
            }
        } catch (e) {
            // Buffer creation failed
        }
    }

    if (!authorized) {
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

        if (gameIndex === -1) {
            return res.status(404).json({ error: 'Game not found' });
        }

        // Update fields
        if (name) games[gameIndex].name = name.trim();
        if (req.body.platform) games[gameIndex].platform = req.body.platform.trim();
        if (req.body.genre) games[gameIndex].genre = req.body.genre.trim();

        // Write back to file
        fs.writeFileSync(GAMES_DB_FILE, JSON.stringify(games, null, 2));

        console.log(`Updated game ${id}: ${JSON.stringify(games[gameIndex])}`);
        res.json({ success: true, game: games[gameIndex] });
    } catch (err) {
        console.error('Error updating game:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- IGDB HELPER FUNCTIONS ---
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
                client_id: process.env.VITE_IGDB_CLIENT_ID,
                client_secret: process.env.VITE_IGDB_CLIENT_SECRET,
                grant_type: 'client_credentials',
            },
        });
        igdbToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Buffer of 1 min
        return igdbToken;
    } catch (error) {
        console.error('Error getting access token:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with IGDB');
    }
}

async function searchIgdbGame(name, accessToken) {
    const query = `
        fields id, name, first_release_date, platforms.name, genres.name, aggregated_rating, rating, screenshots.url, cover.url, rating_count;
        search "${name.replace(/"/g, '\\"')}";
        limit 1;
    `;

    try {
        const response = await axios.post(
            'https://api.igdb.com/v4/games',
            query,
            {
                headers: {
                    'Client-ID': process.env.VITE_IGDB_CLIENT_ID,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'text/plain',
                },
            }
        );

        if (response.data && response.data.length > 0) {
            return response.data[0];
        }
        return null;
    } catch (error) {
        console.error(`Error searching for ${name}:`, error.response?.data || error.message);
        return null;
    }
}

function generateCropPositions(count) {
    return Array.from({ length: count }, () => ({
        x: Math.floor(Math.random() * 100),
        y: Math.floor(Math.random() * 100),
    }));
}

import Fuse from 'fuse.js';

// POST /api/admin/search-local
app.post('/api/admin/search-local', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    let authorized = false;
    if (adminKey && process.env.ADMIN_KEY) {
        try {
            const bufferA = Buffer.from(adminKey);
            const bufferB = Buffer.from(process.env.ADMIN_KEY);
            if (bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB)) {
                authorized = true;
            }
        } catch (e) { }
    }
    if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

    const { query } = req.body;

    try {
        if (!fs.existsSync(GAMES_DB_FILE)) {
            return res.json([]);
        }

        const data = fs.readFileSync(GAMES_DB_FILE, 'utf8');
        const games = JSON.parse(data);

        if (!query) {
            // Return all games if no query, but maybe limit?
            // Let's limit to 50 for performance if list is huge
            return res.json(games.slice(0, 50));
        }

        const fuse = new Fuse(games, {
            keys: ['name'],
            threshold: 0.3
        });

        const results = fuse.search(query).map(r => r.item);
        res.json(results);

    } catch (err) {
        console.error('Error searching local games:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/request-game
app.post('/api/admin/request-game', async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    let authorized = false;
    if (adminKey && process.env.ADMIN_KEY) {
        try {
            const bufferA = Buffer.from(adminKey);
            const bufferB = Buffer.from(process.env.ADMIN_KEY);
            if (bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB)) {
                authorized = true;
            }
        } catch (e) { }
    }
    if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

    const { name, skipCheck } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });

    try {
        // Check local DB
        if (fs.existsSync(GAMES_DB_FILE)) {
            const data = fs.readFileSync(GAMES_DB_FILE, 'utf8');
            const localGames = JSON.parse(data);

            // 1. Exact match check (always enforced unless skipped, but really we should just block exacts?)
            // Actually, exact matches are bad regardless. But let's stick to the fuzzy logic plan.
            // If skipCheck is false, we do the check.

            if (!skipCheck) {
                const fuse = new Fuse(localGames, {
                    keys: ['name'],
                    threshold: 0.3, // 0.0 = perfect match, 1.0 = match anything
                    includeScore: true
                });

                const results = fuse.search(name);

                // Filter meaningful matches? Threshold handles it mostly.
                if (results.length > 0) {
                    const similarGames = results.map(r => r.item.name).slice(0, 5);
                    return res.status(409).json({
                        error: 'Potential duplicates found',
                        similarGames: similarGames
                    });
                }
            }
        }

        // Fetch from IGDB
        const token = await getIgdbAccessToken();
        const gameData = await searchIgdbGame(name, token);

        if (!gameData) {
            return res.status(404).json({ error: `Game "${name}" not found on IGDB.` });
        }

        // Process screenshots
        const allScreenshots = gameData.screenshots || [];
        if (allScreenshots.length < 5) {
            return res.status(400).json({
                error: `Found "${gameData.name}" but it only has ${allScreenshots.length} screenshots (minimum 5 required).`
            });
        }

        // Return up to 10 screenshots
        const screenshots = allScreenshots
            .slice(0, 10)
            .map(s => s.url.replace('t_thumb', 't_720p').replace('//', 'https://'));

        const cover = gameData.cover ? gameData.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://') : null;

        const responseData = {
            id: gameData.id,
            name: gameData.name,
            year: gameData.first_release_date ? new Date(gameData.first_release_date * 1000).getFullYear() : 0,
            platform: gameData.platforms ? gameData.platforms[0].name : 'Unknown',
            genre: gameData.genres ? gameData.genres[0].name : 'Unknown',
            rating: Math.round(gameData.aggregated_rating || gameData.rating || 0),
            cover: cover,
            availableScreenshots: screenshots
        };

        res.json(responseData);

    } catch (err) {
        console.error('Error requesting game:', err);
        res.status(500).json({ error: 'Internal server error during game request' });
    }
});

// POST /api/admin/add-game
app.post('/api/admin/add-game', async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    let authorized = false;
    if (adminKey && process.env.ADMIN_KEY) {
        try {
            const bufferA = Buffer.from(adminKey);
            const bufferB = Buffer.from(process.env.ADMIN_KEY);
            if (bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB)) {
                authorized = true;
            }
        } catch (e) { }
    }
    if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

    const { gameData, selectedScreenshots } = req.body;
    if (!gameData || !selectedScreenshots || !Array.isArray(selectedScreenshots)) {
        return res.status(400).json({ error: 'Invalid data' });
    }

    if (selectedScreenshots.length !== 5) {
        return res.status(400).json({ error: 'Exactly 5 screenshots must be selected.' });
    }

    try {
        const cropPositions = generateCropPositions(5);

        const newGame = {
            id: gameData.id,
            name: gameData.name,
            year: gameData.year,
            platform: gameData.platform,
            genre: gameData.genre,
            rating: gameData.rating,
            screenshots: selectedScreenshots,
            cover: gameData.cover,
            cropPositions: cropPositions
        };

        if (!fs.existsSync(GAMES_DB_FILE)) {
            fs.writeFileSync(GAMES_DB_FILE, JSON.stringify([], null, 2));
        }

        const data = fs.readFileSync(GAMES_DB_FILE, 'utf8');
        const games = JSON.parse(data);

        // Check for duplicates
        if (games.some(g => g.id === newGame.id)) {
            return res.status(409).json({ error: 'Game already exists (ID match).' });
        }

        games.push(newGame);
        fs.writeFileSync(GAMES_DB_FILE, JSON.stringify(games, null, 2));

        console.log(`Added new game: ${newGame.name}`);
        res.json({ success: true, game: newGame });

    } catch (err) {
        console.error('Error adding game:', err);
        res.status(500).json({ error: 'Internal server error while saving game' });
    }
});

// POST /api/admin/delete-game
app.post('/api/admin/delete-game', (req, res) => {
    const adminKey = req.headers['x-admin-key'];

    if (!process.env.ADMIN_KEY) {
        return res.status(500).json({ error: 'Server misconfiguration' });
    }

    let authorized = false;
    if (adminKey && process.env.ADMIN_KEY) {
        try {
            const bufferA = Buffer.from(adminKey);
            const bufferB = Buffer.from(process.env.ADMIN_KEY);
            if (bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB)) {
                authorized = true;
            }
        } catch (e) {
            // Buffer creation failed
        }
    }

    if (!authorized) {
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

// Handle SPA routing - return index.html for all other routes
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});
