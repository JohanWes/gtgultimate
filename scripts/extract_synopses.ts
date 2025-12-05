/**
 * Extract synopses from games_db.json to a separate synopsis.json file
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAMES_DB_PATH = path.join(__dirname, '../data/games_db.json');
const SYNOPSIS_PATH = path.join(__dirname, '../src/assets/synopsis.json');

interface Game {
    id: number;
    synopsis?: string;
    [key: string]: unknown;
}

async function main() {
    console.log('📂 Loading games database...');
    const gamesData = await fs.readFile(GAMES_DB_PATH, 'utf-8');
    const games: Game[] = JSON.parse(gamesData);

    // Extract synopses
    const synopses: Record<number, string> = {};
    for (const game of games) {
        if (game.synopsis) {
            synopses[game.id] = game.synopsis;
            delete game.synopsis;
        }
    }

    console.log(`📝 Extracted ${Object.keys(synopses).length} synopses`);

    // Write synopsis.json
    await fs.writeFile(SYNOPSIS_PATH, JSON.stringify(synopses, null, 2));
    console.log(`✅ Saved synopses to: ${SYNOPSIS_PATH}`);

    // Write cleaned games_db.json
    await fs.writeFile(GAMES_DB_PATH, JSON.stringify(games, null, 2));
    console.log(`✅ Removed synopsis field from games_db.json`);
}

main().catch(console.error);
