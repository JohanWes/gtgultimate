
import clientPromise from '../_lib/mongodb.js';
import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// --- IGDB HELPER FUNCTIONS ---
// Note: In a serverless environment, local variables like token check might not persist between cold starts,
// but it's acceptable to re-authenticate occasionally.
let igdbToken: string | null = null;
let tokenExpiry = 0;

async function getIgdbAccessToken(): Promise<string> {
    if (igdbToken && Date.now() < tokenExpiry) {
        return igdbToken as string;
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
        if (response.data.access_token) {
            igdbToken = response.data.access_token;
            tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Buffer of 1 min
            return igdbToken!;
        } else {
            throw new Error('No access token in response');
        }
    } catch (error: any) {
        console.error('Error getting access token:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with IGDB');
    }
}

const defaultFields = 'fields id, name, first_release_date, platforms.name, genres.name, summary, aggregated_rating, rating, screenshots.url, cover.url, rating_count;';

async function searchIgdbGamesList(name: string, accessToken: string) {
    const query = `
        ${defaultFields}
        search "${name.replace(/"/g, '\\"')}";
        limit 15;
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
        return response.data || [];
    } catch (error: any) {
        console.error(`Error searching for ${name}:`, error.response?.data || error.message);
        return [];
    }
}

async function getIgdbGameDetails(igdbId: number, accessToken: string) {
    const query = `
        ${defaultFields}
        where id = ${igdbId};
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
        return response.data && response.data.length > 0 ? response.data[0] : null;
    } catch (error: any) {
        console.error(`Error getting details for ${igdbId}:`, error.response?.data || error.message);
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
        } catch { /* empty */ }
    }

    if (!authorized) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, mode, igdbId, skipCheck } = req.body;
    // Default to search if name is provided, or details if igdbId is provided
    const requestMode = mode || (igdbId ? 'details' : 'search');

    try {
        const token = await getIgdbAccessToken();

        if (requestMode === 'search') {
            if (!name) return res.status(400).json({ error: 'Missing name for search' });

            const results = await searchIgdbGamesList(name, token);

            const mappedResults = results.map((g: any) => ({
                id: g.id,
                name: g.name,
                year: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : 0,
                platform: g.platforms ? g.platforms[0].name : 'Unknown',
                genre: g.genres ? g.genres[0].name : 'Unknown',
                cover: g.cover ? g.cover.url.replace('t_thumb', 't_cover_small').replace('//', 'https://') : null,
                rating: Math.round(g.aggregated_rating || g.rating || 0),
            }));

            return res.json({ mode: 'search', results: mappedResults });
        }

        else if (requestMode === 'details') {
            if (!igdbId) return res.status(400).json({ error: 'Missing igdbId for details' });

            const gameData = await getIgdbGameDetails(igdbId, token);

            if (!gameData) {
                return res.status(404).json({ error: `Game with ID ${igdbId} not found on IGDB.` });
            }

            // Duplicate Check (only when saving/requesting detailed view to import)
            if (!skipCheck) {
                const client = await clientPromise;
                const db = client.db('guessthegame');

                // Use MongoDB regex for case-insensitive exact match instead of loading all games into memory
                const escapedName = gameData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const existingGame = await db.collection('games').findOne(
                    { name: { $regex: `^${escapedName}$`, $options: 'i' } },
                    { projection: { name: 1 } }
                );

                if (existingGame) {
                    return res.status(409).json({
                        error: 'Potential duplicate found',
                        similarGames: [existingGame.name],
                        gameData: { id: gameData.id, name: gameData.name }
                    });
                }
            }

            // Process screenshots
            const allScreenshots = gameData.screenshots || [];
            if (allScreenshots.length < 5) {
                return res.status(400).json({
                    error: `Found "${gameData.name}" but it only has ${allScreenshots.length} screenshots (minimum 5 required).`
                });
            }

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
                synopsis: gameData.summary || '',
                rating: Math.round(gameData.aggregated_rating || gameData.rating || 0),
                cover: cover,
                availableScreenshots: screenshots
            };

            return res.json(responseData);
        }

    } catch (err) {
        console.error('Error requesting game:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}
