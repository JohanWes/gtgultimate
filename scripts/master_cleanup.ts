import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAMES_DB_PATH = path.join(__dirname, '../src/data/games_db.json');
const BAIT_GAMES_PATH = path.join(__dirname, '../src/data/bait_games.json');
const TITLES_OUTPUT_PATH = path.join(__dirname, '../titles.txt');

// Roman Numeral Map (1-30)
const ROMAN_MAP: { [key: string]: string } = {
    'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5',
    'VI': '6', 'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10',
    'XI': '11', 'XII': '12', 'XIII': '13', 'XIV': '14', 'XV': '15',
    'XVI': '16', 'XVII': '17', 'XVIII': '18', 'XIX': '19', 'XX': '20',
    'XXI': '21', 'XXII': '22', 'XXIII': '23', 'XXIV': '24', 'XXV': '25',
    'XXVI': '26', 'XXVII': '27', 'XXVIII': '28', 'XXIX': '29', 'XXX': '30'
};

// Sort by length descending to match longer numerals first
const SORTED_NUMERALS = Object.keys(ROMAN_MAP).sort((a, b) => b.length - a.length);
const ROMAN_REGEX = new RegExp(`\\b(${SORTED_NUMERALS.join('|')})\\b`, 'g');

function convertRomanToArabic(name: string): string {
    // Special case check: "I" at the start of a sentence/title might be the pronoun "I"
    // But "Mortal Kombat I" is valid.
    // "I Am Bread" -> "1 Am Bread" (False positive risk)
    // Given "aggressive" instruction, we proceed, but maybe we can skip "I" if it's the *only* word? No.

    if (!name) return name;

    return name.replace(ROMAN_REGEX, (match) => {
        return ROMAN_MAP[match] || match;
    });
}

async function main() {
    console.log('Starting Master Cleanup...');

    // 1. Load Data
    console.log('Loading files...');
    let gamesDbRaw = await fs.readFile(GAMES_DB_PATH, 'utf-8');
    let baitGamesRaw = await fs.readFile(BAIT_GAMES_PATH, 'utf-8');

    let gamesDb = JSON.parse(gamesDbRaw);
    let baitGamesData = JSON.parse(baitGamesRaw);
    let baitGames = baitGamesData.baitGames;

    console.log(`Initial Counts - Games DB: ${gamesDb.length}, Bait Games: ${baitGames.length}`);

    // 2. Process Games DB
    // - Convert Roman to Arabic
    // - Deduplicate internally
    console.log('Processing Games DB...');
    const processedGamesMap = new Map<string, any>(); // Key: normalized name, Value: game object
    let gamesConvertedCount = 0;

    for (const game of gamesDb) {
        let newName = convertRomanToArabic(game.name);
        if (newName !== game.name) {
            gamesConvertedCount++;
        }

        // Update name
        game.name = newName;

        // Normalization for deduplication: lowercase, trim
        const normalized = newName.toLowerCase().trim();

        if (!processedGamesMap.has(normalized)) {
            processedGamesMap.set(normalized, game);
        } else {
            // Duplicate found, keep the one already in map (first occurrence)
            // console.log(`Duplicate removed from Games DB: ${game.name}`);
        }
    }

    const cleanedGamesDb = Array.from(processedGamesMap.values());
    console.log(`Games DB Processed: ${gamesConvertedCount} titles converted. New Count: ${cleanedGamesDb.length} (Removed ${gamesDb.length - cleanedGamesDb.length} duplicates)`);

    // 3. Process Bait Games
    // - Convert Roman to Arabic
    // - Deduplicate internally
    // - Remove if exists in Games DB
    console.log('Processing Bait Games...');
    const processedBaitSet = new Set<string>(); // Store normalized names to avoid internal duplicates
    const finalBaitGames: string[] = [];
    let baitConvertedCount = 0;
    let baitInDbCount = 0;
    let baitInternalDupCount = 0;

    for (const baitName of baitGames) {
        let newName = convertRomanToArabic(baitName);
        if (newName !== baitName) {
            baitConvertedCount++;
        }

        const normalized = newName.toLowerCase().trim();

        // Check if exists in Games DB
        if (processedGamesMap.has(normalized)) {
            baitInDbCount++;
            continue; // Skip, it's in the master DB
        }

        // Check internal duplicate
        if (processedBaitSet.has(normalized)) {
            baitInternalDupCount++;
            continue; // Skip, already in bait list
        }

        processedBaitSet.add(normalized);
        finalBaitGames.push(newName);
    }

    console.log(`Bait Games Processed: ${baitConvertedCount} converted. Removed ${baitInDbCount} found in DB, ${baitInternalDupCount} internal duplicates.`);
    console.log(`New Bait Games Count: ${finalBaitGames.length} (Original: ${baitGames.length})`);

    // 4. Save Files
    console.log('Saving files...');

    // Sort Games DB by name for tidiness (optional but good)
    // cleanedGamesDb.sort((a, b) => a.name.localeCompare(b.name)); 
    // Actually, maybe preserve original order or sort? The user didn't ask to sort, but it helps. 
    // I'll leave order as is (first occurrence order) to minimize diffs if order matters.

    await fs.writeFile(GAMES_DB_PATH, JSON.stringify(cleanedGamesDb, null, 2));

    baitGamesData.baitGames = finalBaitGames.sort(); // Sort bait games alphabetically usually makes sense
    await fs.writeFile(BAIT_GAMES_PATH, JSON.stringify(baitGamesData, null, 2));

    // 5. Extract Titles (Update titles.txt)
    console.log('Updating titles.txt...');
    const titles = cleanedGamesDb.map((g: any) => g.name).join('\n');
    await fs.writeFile(TITLES_OUTPUT_PATH, titles);

    console.log('Master Cleanup Complete!');
}

main().catch(console.error);
