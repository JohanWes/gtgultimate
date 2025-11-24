
import fs from 'fs';
import path from 'path';

const gamesDbPath = path.join(process.cwd(), 'src/data/games_db.json');
const baitGamesPath = path.join(process.cwd(), 'src/data/bait_games.json');

const gamesDb = JSON.parse(fs.readFileSync(gamesDbPath, 'utf-8'));
const baitGamesData = JSON.parse(fs.readFileSync(baitGamesPath, 'utf-8'));
let baitGames = baitGamesData.baitGames;

const normalize = (name: string) => {
    return name.toLowerCase()
        .replace(/\s*\(\d{4}\)/, '') // Remove (YYYY)
        .replace(/[^a-z0-9]/g, ''); // Remove non-alphanumeric
};

const gameDbNames = new Set(gamesDb.map((g: any) => normalize(g.name)));

const toRemove: string[] = [];
const kept: string[] = [];

baitGames.forEach((bait: string) => {
    const normalizedBait = normalize(bait);
    if (bait.includes('Ragnar')) {
        console.log(`Checking bait: "${bait}" -> normalized: "${normalizedBait}"`);
        if (gameDbNames.has(normalizedBait)) {
            console.log('MATCH FOUND in DB!');
        } else {
            console.log('NO MATCH in DB');
        }
    }
    if (gameDbNames.has(normalizedBait)) {
        toRemove.push(bait);
    } else {
        kept.push(bait);
    }
});

console.log(`Found ${toRemove.length} duplicates to remove.`);
console.log('Duplicates:', toRemove);

// Check for potential encoding issues
const encodingSuspects = kept.filter(name => name.match(/[ÃÂ]/));
if (encodingSuspects.length > 0) {
    console.log('Potential encoding issues:', encodingSuspects);
}

// Write back the cleaned list
// baitGamesData.baitGames = kept;
// fs.writeFileSync(baitGamesPath, JSON.stringify(baitGamesData, null, 2));
