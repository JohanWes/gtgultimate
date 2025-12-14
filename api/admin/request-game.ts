
import clientPromise from '../_lib/mongodb.js';
import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import Fuse from 'fuse.js';

// --- IGDB HELPER FUNCTIONS ---
// Note: In a serverless environment, local variables like token check might not persist between cold starts,
// but it's acceptable to re-authenticate occasionally.
let igdbToken: string | null = null;
let tokenExpiry = 0;

async function getIgdbAccessToken(): Promise<string> {
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
    } catch (error: any) {
        console.error('Error getting access token:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with IGDB');
    }
}

async function searchIgdbGame(name: string, accessToken: string) {
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
    } catch (error: any) {
        console.error(`Error searching for ${name}:`, error.response?.data || error.message);
        return null;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1. Authentication
    const adminKey = req.headers['x-admin-key'];
    const envKey = process.env.ADMIN_KEY;

    if (!envKey) {
        return res.status(500).json({ error: 'Server misconfiguration: ADMIN_KEY not set' });
    }

    let authorized = false;
    if (adminKey && envKey) {
        try {
            const bufferA = Buffer.from(adminKey as string);
            const bufferB = Buffer.from(envKey);
            if (bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB)) {
                authorized = true;
            }
        } catch (e) { }
    }

    if (!authorized) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, skipCheck } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });

    try {
        // 2. Duplicate Check with MongoDB + Fuse.js
        if (!skipCheck) {
            const client = await clientPromise;
            const db = client.db('guessthegame');
            // Fetch names only for efficiency? Or all data needed for Fuse? Fuse needs keys.
            const allGames = await db.collection('games').find({}, { projection: { name: 1 } }).toArray();

            const fuse = new Fuse(allGames, {
                keys: ['name'],
                threshold: 0.3,
                includeScore: true
            });

            const results = fuse.search(name);
            if (results.length > 0) {
                const similarGames = results.map(r => r.item.name).slice(0, 5);
                return res.status(409).json({
                    error: 'Potential duplicates found',
                    similarGames: similarGames
                });
            }
        }

        // 3. Fetch from IGDB
        const token = await getIgdbAccessToken();
        const gameData = await searchIgdbGame(name, token);

        if (!gameData) {
            return res.status(404).json({ error: `Game "${name}" not found on IGDB.` });
        }

        // 4. Process screenshots
        const allScreenshots = gameData.screenshots || [];
        if (allScreenshots.length < 5) {
            return res.status(400).json({
                error: `Found "${gameData.name}" but it only has ${allScreenshots.length} screenshots (minimum 5 required).`
            });
        }

        // Return up to 10 screenshots
        const screenshots = allScreenshots
            .slice(0, 10)
            .map((s: any) => s.url.replace('t_thumb', 't_720p').replace('//', 'https://'));

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
        res.status(500).json({ error: 'Internal server error' });
    }
}
