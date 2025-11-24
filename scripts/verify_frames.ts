
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../src/data/games_db.json');

async function verifyGames() {
    try {
        const content = await fs.readFile(DB_PATH, 'utf-8');
        const games = JSON.parse(content);

        console.log(`Verifying ${games.length} games...`);

        let invalidCount = 0;
        for (const game of games) {
            if (!game.screenshots || game.screenshots.length < 5) {
                console.error(`FAIL: ${game.name} (${game.year}) has ${game.screenshots ? game.screenshots.length : 0} screenshots`);
                invalidCount++;
            }
        }

        if (invalidCount === 0) {
            console.log('SUCCESS: All games have at least 5 screenshots.');
        } else {
            console.error(`FAILURE: Found ${invalidCount} games with insufficient screenshots.`);
            process.exit(1);
        }

    } catch (error) {
        console.error('Error verifying games:', error);
        process.exit(1);
    }
}

verifyGames();
