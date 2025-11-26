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
const DB_FILE = path.join(__dirname, '../data/games_db.json');
const BACKUP_FILE = path.join(__dirname, '../data/games_db_backup.json');

interface Game {
    id: number;
    name: string;
    year?: number;
    platform: string;
    genre: string;
    rating: number;
    screenshots: string[];
    cover: string | null;
    cropPositions: { x: number; y: number }[];
}

interface IGDBScreenshot {
    url: string;
}

interface IGDBGame {
    screenshots?: IGDBScreenshot[];
}

async function getAccessToken(): Promise<string> {
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

async function fetchScreenshotsForGame(gameId: number, accessToken: string): Promise<string[] | null> {
    const query = `
        fields screenshots.url;
        where id = ${gameId};
        limit 1;
    `;

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
            const gameData: IGDBGame = response.data[0];
            const screenshots = gameData.screenshots || [];

            if (screenshots.length >= 5) {
                // Return first 5 screenshots with proper formatting
                return screenshots
                    .slice(0, 5)
                    .map(s => s.url.replace('t_thumb', 't_720p').replace('//', 'https://'));
            }
        }
        return null;
    } catch (error: any) {
        // Return null on error to fallback to shuffle
        return null;
    }
}

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function generateCropPositions(count: number): { x: number; y: number }[] {
    return Array.from({ length: count }, () => ({
        x: Math.floor(Math.random() * 100),
        y: Math.floor(Math.random() * 100),
    }));
}

async function createBackup(): Promise<void> {
    console.log('Creating backup of games_db.json...');
    try {
        await fs.copyFile(DB_FILE, BACKUP_FILE);
        console.log(`✓ Backup created: ${BACKUP_FILE}\n`);
    } catch (error: any) {
        console.error('Error creating backup:', error.message);
        throw new Error('Failed to create backup');
    }
}

export async function runMigration() {
    // Create backup first
    await createBackup();

    // Load existing database
    let games: Game[] = [];
    try {
        const content = await fs.readFile(DB_FILE, 'utf-8');
        games = JSON.parse(content);
        console.log(`Loaded ${games.length} games from database.\n`);
    } catch (error) {
        console.error('Error loading games database:', error);
        throw new Error('Failed to load games database');
    }

    // Get access token
    const token = await getAccessToken();
    console.log('✓ Authentication successful\n');

    // Statistics
    let updatedCount = 0;
    let shuffledCount = 0;
    let errorCount = 0;

    console.log('Starting screenshot migration...\n');

    // Process each game
    for (let i = 0; i < games.length; i++) {
        const game = games[i];
        const progress = `[${i + 1}/${games.length}]`;

        process.stdout.write(`${progress} ${game.name}... `);

        // Rate limit delay (250ms = 4 req/s max)
        if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        try {
            // Try to fetch new screenshots from API
            const newScreenshots = await fetchScreenshotsForGame(game.id, token);

            if (newScreenshots && newScreenshots.length === 5) {
                // Successfully fetched 5 new screenshots
                game.screenshots = newScreenshots;
                game.cropPositions = generateCropPositions(5);
                updatedCount++;
                console.log('✓ Updated with new screenshots');
            } else {
                // Fallback: shuffle existing screenshots
                game.screenshots = shuffleArray(game.screenshots);
                game.cropPositions = generateCropPositions(game.screenshots.length);
                shuffledCount++;
                console.log('↻ Shuffled existing screenshots');
            }
        } catch (error: any) {
            // Error handling - still shuffle on error
            game.screenshots = shuffleArray(game.screenshots);
            game.cropPositions = generateCropPositions(game.screenshots.length);
            shuffledCount++;
            errorCount++;
            console.log('⚠ Error, shuffled existing screenshots');
        }
    }

    // Save updated database
    console.log('\nSaving updated database...');
    await fs.writeFile(DB_FILE, JSON.stringify(games, null, 2));

    // Print statistics
    console.log('\n' + '='.repeat(50));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total games:          ${games.length}`);
    console.log(`Updated with new:     ${updatedCount}`);
    console.log(`Shuffled existing:    ${shuffledCount}`);
    console.log(`Errors (shuffled):    ${errorCount}`);
    console.log('='.repeat(50));
    console.log(`\nBackup location: ${BACKUP_FILE}`);
    console.log(`To restore backup: copy games_db_backup.json to games_db.json`);

    return {
        success: true,
        totalGames: games.length,
        updatedCount,
        shuffledCount,
        errorCount
    };
}

async function main() {
    try {
        await runMigration();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
