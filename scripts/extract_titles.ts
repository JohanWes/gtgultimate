import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAMES_DB_PATH = path.join(__dirname, '../src/data/games_db.json');
const BAIT_GAMES_PATH = path.join(__dirname, '../src/data/bait_games.json');
const TITLES_OUTPUT_PATH = path.join(__dirname, '../titles.txt');

async function extractTitles() {
    try {
        console.log('Reading games databases...');
        const gamesData = await fs.readFile(GAMES_DB_PATH, 'utf-8');
        const baitData = await fs.readFile(BAIT_GAMES_PATH, 'utf-8');

        const games = JSON.parse(gamesData);
        const baitGames = JSON.parse(baitData).baitGames;

        console.log(`Found ${games.length} main games.`);
        console.log(`Found ${baitGames.length} bait games.`);

        // Extract names from main games
        const mainTitles = games.map((game: any) => game.name);

        // Combine with bait games
        const allTitles = [...mainTitles, ...baitGames];

        // Sort alphabetically (optional but nice)
        allTitles.sort((a, b) => a.localeCompare(b));

        const outputContent = allTitles.join('\n');

        await fs.writeFile(TITLES_OUTPUT_PATH, outputContent);
        console.log(`Successfully extracted ${allTitles.length} total titles to ${TITLES_OUTPUT_PATH}`);
    } catch (error) {
        console.error('Error extracting titles:', error);
    }
}

extractTitles();
