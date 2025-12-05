/**
 * Fetch Synopses Migration Script
 * 
 * Iterates through all games in games_db.json and fetches the 'summary' field
 * from IGDB, appending it to each game object.
 * 
 * Usage: npx tsx scripts/fetch_synopses.ts
 */

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAMES_DB_PATH = path.join(__dirname, '../data/games_db.json');
const BACKUP_PATH = path.join(__dirname, '../data/games_db.backup.json');

const CLIENT_ID = process.env.VITE_IGDB_CLIENT_ID;
const CLIENT_SECRET = process.env.VITE_IGDB_CLIENT_SECRET;

// IGDB allows batching up to 500 IDs per request
const BATCH_SIZE = 50;
const RATE_LIMIT_DELAY = 300; // ms between requests

interface Game {
    id: number;
    name: string;
    synopsis?: string;
    [key: string]: unknown;
}

async function getAccessToken(): Promise<string> {
    console.log('🔑 Authenticating with IGDB...');
    const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'client_credentials',
        },
    });
    console.log('✅ Authenticated successfully\n');
    return response.data.access_token;
}

async function fetchSynopsesForIds(ids: number[], token: string): Promise<Map<number, string>> {
    const query = `
        fields id, summary;
        where id = (${ids.join(',')});
        limit ${ids.length};
    `;

    try {
        const response = await axios.post(
            'https://api.igdb.com/v4/games',
            query,
            {
                headers: {
                    'Client-ID': CLIENT_ID,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'text/plain',
                },
            }
        );

        const synopsisMap = new Map<number, string>();
        for (const game of response.data) {
            if (game.summary) {
                synopsisMap.set(game.id, game.summary);
            }
        }
        return synopsisMap;
    } catch (error: any) {
        console.error(`❌ Error fetching batch:`, error.response?.data || error.message);
        return new Map();
    }
}

async function main() {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error('❌ Missing IGDB credentials in .env file');
        process.exit(1);
    }

    // Load games database
    console.log('📂 Loading games database...');
    const gamesData = await fs.readFile(GAMES_DB_PATH, 'utf-8');
    const games: Game[] = JSON.parse(gamesData);
    console.log(`   Found ${games.length} games\n`);

    // Create backup
    console.log('💾 Creating backup...');
    await fs.writeFile(BACKUP_PATH, gamesData);
    console.log(`   Backup saved to: ${BACKUP_PATH}\n`);

    // Filter games that don't already have a synopsis
    const gamesNeedingSynopsis = games.filter(g => !g.synopsis);
    console.log(`📝 Games needing synopsis: ${gamesNeedingSynopsis.length}`);
    console.log(`   Games already with synopsis: ${games.length - gamesNeedingSynopsis.length}\n`);

    if (gamesNeedingSynopsis.length === 0) {
        console.log('✅ All games already have synopses. Nothing to do!');
        return;
    }

    // Get access token
    const token = await getAccessToken();

    // Process in batches
    const totalBatches = Math.ceil(gamesNeedingSynopsis.length / BATCH_SIZE);
    let fetchedCount = 0;
    let missingCount = 0;

    // Create a map for quick lookup
    const synopsisMap = new Map<number, string>();

    console.log(`🚀 Fetching synopses in ${totalBatches} batches of ${BATCH_SIZE}...\n`);

    for (let i = 0; i < gamesNeedingSynopsis.length; i += BATCH_SIZE) {
        const batch = gamesNeedingSynopsis.slice(i, i + BATCH_SIZE);
        const batchIds = batch.map(g => g.id);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;

        process.stdout.write(`   Batch ${batchNum}/${totalBatches} (IDs: ${batchIds.length})... `);

        const batchSynopses = await fetchSynopsesForIds(batchIds, token);

        // Merge into main map
        for (const [id, synopsis] of batchSynopses) {
            synopsisMap.set(id, synopsis);
        }

        const foundInBatch = batchSynopses.size;
        const missingInBatch = batchIds.length - foundInBatch;
        fetchedCount += foundInBatch;
        missingCount += missingInBatch;

        console.log(`Found: ${foundInBatch}, Missing: ${missingInBatch}`);

        // Rate limit delay
        if (i + BATCH_SIZE < gamesNeedingSynopsis.length) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
    }

    // Apply synopses to games array
    console.log('\n📝 Applying synopses to games...');
    for (const game of games) {
        const synopsis = synopsisMap.get(game.id);
        if (synopsis) {
            game.synopsis = synopsis;
        }
    }

    // Save updated database
    console.log('💾 Saving updated database...');
    await fs.writeFile(GAMES_DB_PATH, JSON.stringify(games, null, 2));

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(50));
    console.log(`   Total games: ${games.length}`);
    console.log(`   Synopses fetched: ${fetchedCount}`);
    console.log(`   Games without synopsis: ${missingCount}`);
    console.log(`   Backup location: ${BACKUP_PATH}`);
    console.log('='.repeat(50));
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
