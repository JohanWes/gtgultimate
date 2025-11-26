
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const CLIENT_ID = process.env.VITE_IGDB_CLIENT_ID;
const CLIENT_SECRET = process.env.VITE_IGDB_CLIENT_SECRET;

// Validate that required environment variables are set
if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Error: Missing required environment variables.');
    console.error('Please create a .env file with VITE_IGDB_CLIENT_ID and VITE_IGDB_CLIENT_SECRET');
    console.error('See .env.example for reference.');
    process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAMES_LIST_PATH = path.join(__dirname, '../games.json');
const OUTPUT_FILE = path.join(__dirname, '../data/games_db.json');
const OUTPUT_FILE = path.join(__dirname, '../data/games_db.json');

interface GameEntry {
    name: string;
    year?: number;
}

interface IGDBGame {
    id: number;
    name: string;
    first_release_date?: number;
    platforms?: { name: string }[];
    genres?: { name: string }[];
    aggregated_rating?: number;
    rating?: number;
    screenshots?: { url: string }[];
    cover?: { url: string };
    rating_count?: number;
}

async function getAccessToken() {
    console.log('Authenticating with IGDB...');
    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'client_credentials',
            },
        });
        return response.data.access_token;
    } catch (error: any) {
        console.error('Error getting access token:', error.response?.data || error.message);
        process.exit(1);
    }
}

async function parseGamesList(): Promise<GameEntry[]> {
    const content = await fs.readFile(GAMES_LIST_PATH, 'utf-8');
    const rawGames = JSON.parse(content);
    return rawGames.map((g: any) => ({
        name: g.gamename,
        year: g.releaseyear
    }));
}

async function searchGame(name: string, year: number | undefined, accessToken: string): Promise<IGDBGame | null> {
    let query = `
        fields name, first_release_date, platforms.name, genres.name, aggregated_rating, rating, screenshots.url, cover.url, rating_count;
        search "${name.replace(/"/g, '\\"')}";
        limit 1;
    `;

    if (year) {
        query += `where release_dates.y = ${year};`;
    }

    try {
        const response = await axios.post(
            'https://api.igdb.com/v4/games',
            query,
            {
                headers: {
                    'Client-ID': CLIENT_ID,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'text/plain',
                },
            }
        );

        if (response.data && response.data.length > 0) {
            return response.data[0];
        }

        // Fallback: Try searching without year if strict match fails, but check year manually
        // Or just return null for now to be safe
        return null;

    } catch (error: any) {
        // console.error(`Error searching for ${name}:`, error.response?.data || error.message);
        return null;
    }
}

function generateCropPositions(count: number) {
    return Array.from({ length: count }, () => ({
        x: Math.floor(Math.random() * 100),
        y: Math.floor(Math.random() * 100),
    }));
}

async function main() {
    const token = await getAccessToken();
    let gamesList: GameEntry[] = [];
    try {
        gamesList = await parseGamesList();
        console.log(`Found ${gamesList.length} games in games.json`);
    } catch (error) {
        console.log('games.json not found, skipping main list update.');
    }

    let existingGames: any[] = [];
    try {
        const existingContent = await fs.readFile(OUTPUT_FILE, 'utf-8');
        existingGames = JSON.parse(existingContent);
        console.log(`Loaded ${existingGames.length} existing games from DB.`);
    } catch (error) {
        console.log('No existing DB found, starting fresh.');
    }



    const processedGames = [...existingGames];
    const existingNames = new Set(existingGames.map(g => g.name.toLowerCase()));
    const existingNames = new Set(existingGames.map(g => g.name.toLowerCase()));

    let foundCount = 0;
    let missingCount = 0;
    let skippedCount = 0;

    // Process in chunks to avoid rate limits (4 requests per second is the limit, let's be safe with serial or small batches)
    // Serial for simplicity and safety
    for (const gameEntry of gamesList) {
        const lowerName = gameEntry.name.toLowerCase();

        if (existingNames.has(lowerName)) {
            // console.log(`Skipping ${gameEntry.name} (already exists in DB)`);
            skippedCount++;
            continue;
        }

        // if (baitNames.has(lowerName)) {
        //     console.log(`Skipping ${gameEntry.name} (exists in bait games)`);
        //     skippedCount++;
        //     continue;
        // }

        // Rate limit delay (250ms = 4 req/s)
        await new Promise(resolve => setTimeout(resolve, 300));

        process.stdout.write(`Fetching ${gameEntry.name} (${gameEntry.year})... `);
        const gameData = await searchGame(gameEntry.name, gameEntry.year, token);

        if (gameData) {
            // Process screenshots
            const allScreenshots = gameData.screenshots || [];
            // Prefer 1080p/720p, but IGDB returns thumbnails by default in URL. 
            // We need to replace 't_thumb' with 't_720p' or 't_1080p'.

            if (allScreenshots.length < 5) {
                console.log('Skipped (not enough screenshots)');
                missingCount++;
                continue;
            }

            const screenshots = allScreenshots
                .slice(0, 5)
                .map(s => s.url.replace('t_thumb', 't_720p').replace('//', 'https://'));

            const cropPositions = generateCropPositions(screenshots.length);

            processedGames.push({
                id: gameData.id,
                name: gameData.name,
                year: gameEntry.year, // Use our year as source of truth for display if needed, or API's
                platform: gameData.platforms ? gameData.platforms[0].name : 'Unknown',
                genre: gameData.genres ? gameData.genres[0].name : 'Unknown',
                rating: Math.round(gameData.aggregated_rating || gameData.rating || 0),
                screenshots: screenshots,
                cover: gameData.cover ? gameData.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://') : null,
                cropPositions: cropPositions
            });
            console.log('Found!');
            foundCount++;
        } else {
            console.log('Not found.');
            missingCount++;
        }
    }



    await fs.writeFile(OUTPUT_FILE, JSON.stringify(processedGames, null, 2));
    console.log(`\nFinished! Saved ${processedGames.length} games to ${OUTPUT_FILE}`);
    console.log(`Found: ${foundCount}, Missing: ${missingCount}, Skipped: ${skippedCount}`);
}

main();
