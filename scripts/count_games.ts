
import fs from 'fs';
import path from 'path';

const GAMES_LIST_PATH = path.join(process.cwd(), 'gameslist.md');

function parseGamesList() {
    const content = fs.readFileSync(GAMES_LIST_PATH, 'utf-8');
    const lines = content.split('\n');
    const games = [];
    const regex = /^\*\s+(.*?)\s+\((\d{4})\)$/;
    const duplicates = [];
    const seen = new Set();

    for (const line of lines) {
        const match = line.trim().match(regex);
        if (match) {
            const name = match[1];
            const year = match[2];
            const key = `${name} (${year})`;

            if (seen.has(key)) {
                duplicates.push(key);
            } else {
                seen.add(key);
                games.push({ name, year });
            }
        }
    }

    console.log(`Total lines matching format: ${games.length + duplicates.length}`);
    console.log(`Unique games: ${games.length}`);
    console.log(`Duplicates found: ${duplicates.length}`);
    if (duplicates.length > 0) {
        console.log('First 10 duplicates:', duplicates.slice(0, 10));
    }
}

parseGamesList();
