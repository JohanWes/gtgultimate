
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../src/data/games_db.json');

async function filterGames() {
    try {
        const content = await fs.readFile(DB_PATH, 'utf-8');
        const games = JSON.parse(content);

        console.log(`Total games before filtering: ${games.length}`);

        const filteredGames = games.filter((game: any) => {
            if (!game.screenshots || game.screenshots.length < 5) {
                console.log(`Removing ${game.name} (${game.year}) - ${game.screenshots ? game.screenshots.length : 0} screenshots`);
                return false;
            }
            return true;
        });

        console.log(`Total games after filtering: ${filteredGames.length}`);
        console.log(`Removed ${games.length - filteredGames.length} games`);

        await fs.writeFile(DB_PATH, JSON.stringify(filteredGames, null, 2));
        console.log('Successfully updated games_db.json');

    } catch (error) {
        console.error('Error filtering games:', error);
    }
}

filterGames();
