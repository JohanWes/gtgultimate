import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Game {
    id: number;
    name: string;
    year: number;
    platform: string;
    genre: string;
    rating: number;
}

// Define common/expected platforms that are mainstream
const COMMON_PLATFORMS = new Set([
    'PC (Microsoft Windows)',
    'PlayStation',
    'PlayStation 2',
    'PlayStation 3',
    'PlayStation 4',
    'PlayStation 5',
    'Xbox',
    'Xbox 360',
    'Xbox One',
    'Xbox Series X|S',
    'Nintendo Entertainment System',
    'Super Nintendo Entertainment System',
    'Nintendo 64',
    'GameCube',
    'Wii',
    'Wii U',
    'Nintendo Switch',
    'Game Boy',
    'Game Boy Color',
    'Game Boy Advance',
    'Nintendo DS',
    'Nintendo 3DS',
    'Arcade',
    'Sega Master System',
    'Sega Genesis',
    'Sega Saturn',
    'Dreamcast',
    'Mac',
    'Linux',
    'iOS',
    'Android'
]);

// Map of game corrections based on knowledge of game history
const PLATFORM_CORRECTIONS: Record<string, string> = {
    // Mario games
    'Super Mario Bros.': 'Nintendo Entertainment System',
    'Super Mario World': 'Super Nintendo Entertainment System',
    'Super Mario World 2: Yoshi\'s Island': 'Super Nintendo Entertainment System',
    'Super Mario 64': 'Nintendo 64',
    'Super Mario Sunshine': 'GameCube',
    'Super Mario Galaxy': 'Wii',
    'Super Mario Galaxy 2': 'Wii',
    'Super Mario 3D World': 'Wii U',
    'Super Mario Odyssey': 'Nintendo Switch',

    // Zelda games
    'The Legend of Zelda': 'Nintendo Entertainment System',
    'The Legend of Zelda: A Link to the Past': 'Super Nintendo Entertainment System',
    'The Legend of Zelda: Ocarina of Time': 'Nintendo 64',
    'The Legend of Zelda: Majora\'s Mask': 'Nintendo 64',
    'The Legend of Zelda: The Wind Waker': 'GameCube',
    'The Legend of Zelda: Twilight Princess': 'Wii',
    'The Legend of Zelda: Skyward Sword': 'Wii',
    'The Legend of Zelda: Breath of the Wild': 'Nintendo Switch',

    // Classic PC games
    'Doom': 'PC (Microsoft Windows)',
    'Doom II: Hell on Earth': 'PC (Microsoft Windows)',
    'Quake': 'PC (Microsoft Windows)',
    'Half-Life': 'PC (Microsoft Windows)',
    'Half-Life 2': 'PC (Microsoft Windows)',
    'Counter-Strike': 'PC (Microsoft Windows)',
    'StarCraft': 'PC (Microsoft Windows)',
    'Diablo': 'PC (Microsoft Windows)',
    'Diablo II': 'PC (Microsoft Windows)',
    'Warcraft III: Reign of Chaos': 'PC (Microsoft Windows)',

    // Metal Gear
    'Metal Gear Solid': 'PlayStation',
    'Metal Gear Solid 2: Sons of Liberty': 'PlayStation 2',
    'Metal Gear Solid 3: Snake Eater': 'PlayStation 2',
    'Metal Gear Solid 4: Guns of the Patriots': 'PlayStation 3',

    // Final Fantasy
    'Final Fantasy VII': 'PlayStation',
    'Final Fantasy VIII': 'PlayStation',
    'Final Fantasy IX': 'PlayStation',
    'Final Fantasy X': 'PlayStation 2',
    'Final Fantasy XII': 'PlayStation 2',
    'Final Fantasy XIII': 'PlayStation 3',

    // Castlevania
    'Castlevania: Symphony of the Night': 'PlayStation',

    // Other classics
    'Minecraft': 'PC (Microsoft Windows)',
    'Resident Evil 4': 'GameCube',
    'God of War': 'PlayStation 2',
    'God of War II': 'PlayStation 2',
    'God of War III': 'PlayStation 3',
    'Uncharted: Drake\'s Fortune': 'PlayStation 3',
    'Uncharted 2: Among Thieves': 'PlayStation 3',
    'Halo: Combat Evolved': 'Xbox',
    'Halo 2': 'Xbox',
    'Halo 3': 'Xbox 360',
    'Gears of War': 'Xbox 360',
};

interface SuspiciousEntry {
    game: Game;
    gameIndex: number;
    lineNumber: number;
    reason: string;
}

function findGameLineNumber(games: Game[], gameIndex: number, lines: string[]): number {
    let idCount = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('"id":')) {
            if (idCount === gameIndex) {
                return i + 1; // Line numbers are 1-indexed
            }
            idCount++;
        }
    }
    return -1;
}

function showSuspiciousWithContext(contextLines: number = 5): void {
    const dbPath = path.join(__dirname, '..', 'src', 'data', 'games_db.json');
    const rawContent = fs.readFileSync(dbPath, 'utf-8');
    const lines = rawContent.split('\n');
    const games: Game[] = JSON.parse(rawContent);

    const suspiciousGames: SuspiciousEntry[] = [];

    for (let i = 0; i < games.length; i++) {
        const game = games[i];
        if (!COMMON_PLATFORMS.has(game.platform)) {
            const lineNumber = findGameLineNumber(games, i, lines);
            suspiciousGames.push({
                game,
                gameIndex: i,
                lineNumber,
                reason: 'Uncommon platform'
            });
        }
    }

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║           SUSPICIOUS PLATFORM ANALYSIS WITH CONTEXT            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    console.log(`Total suspicious games: ${suspiciousGames.length}\n`);

    for (let idx = 0; idx < suspiciousGames.length; idx++) {
        const entry = suspiciousGames[idx];
        const { game, lineNumber } = entry;
        const startLine = Math.max(0, lineNumber - contextLines - 1);
        const endLine = Math.min(lines.length - 1, lineNumber + contextLines);

        console.log(`\n${'─'.repeat(70)}`);
        console.log(`[${idx + 1}/${suspiciousGames.length}] ${game.name} (${game.year})`);
        console.log(`Suspicious Platform: "${game.platform}"`);
        console.log(`${'─'.repeat(70)}\n`);

        // Show context
        for (let i = startLine; i <= endLine; i++) {
            const currentLineNum = i + 1;
            const isGameLine = currentLineNum === lineNumber;
            const prefix = isGameLine ? '>>> ' : '    ';
            const lineNumStr = currentLineNum.toString().padStart(6);
            console.log(`${prefix}${lineNumStr} │ ${lines[i]}`);
        }

        // Suggestion
        if (PLATFORM_CORRECTIONS[game.name]) {
            console.log(`\n✓ Suggested correction: "${PLATFORM_CORRECTIONS[game.name]}"`);
        } else {
            console.log(`\n⚠️  Manual correction needed (look up based on game name and year)`);
        }
    }

    console.log(`\n${'═'.repeat(70)}\n`);
}

function analyzePlatforms(): void {
    const dbPath = path.join(__dirname, '..', 'src', 'data', 'games_db.json');
    const rawContent = fs.readFileSync(dbPath, 'utf-8');
    const lines = rawContent.split('\n');
    const games: Game[] = JSON.parse(rawContent);

    const platformStats: Record<string, number> = {};
    const suspiciousGames: SuspiciousEntry[] = [];

    for (let index = 0; index < games.length; index++) {
        const game = games[index];
        platformStats[game.platform] = (platformStats[game.platform] || 0) + 1;

        // Find actual line number for this game's "id" field
        const lineNumber = findGameLineNumber(games, index, lines);

        // Check if platform is unusual/suspicious
        if (!COMMON_PLATFORMS.has(game.platform)) {
            suspiciousGames.push({
                game,
                gameIndex: index,
                lineNumber,
                reason: 'Uncommon platform'
            });
        }

        // Check for year/platform mismatches
        if (game.platform === 'Xbox Series X|S' && game.year < 2020) {
            suspiciousGames.push({
                game,
                gameIndex: index,
                lineNumber,
                reason: 'Platform didn\'t exist in release year'
            });
        }
        if (game.platform === 'PlayStation 5' && game.year < 2020) {
            suspiciousGames.push({
                game,
                gameIndex: index,
                lineNumber,
                reason: 'Platform didn\'t exist in release year'
            });
        }
        if (game.platform === 'Wii' && game.year < 2006) {
            suspiciousGames.push({
                game,
                gameIndex: index,
                lineNumber,
                reason: 'Platform didn\'t exist in release year (Wii released 2006)'
            });
        }
    }

    // Sort platforms by frequency
    const sortedPlatforms = Object.entries(platformStats)
        .sort(([, a], [, b]) => a - b);

    console.log('\n=== PLATFORM STATISTICS ===\n');
    console.log('Sorted by frequency (least to most common):\n');
    for (const [platform, count] of sortedPlatforms) {
        const isCommon = COMMON_PLATFORMS.has(platform);
        const marker = isCommon ? '' : ' ⚠️  UNCOMMON';
        console.log(`${count.toString().padStart(4)} - ${platform}${marker}`);
    }

    console.log('\n=== SUSPICIOUS GAMES ===\n');
    console.log(`Found ${suspiciousGames.length} games with suspicious platforms:\n`);

    const displayLimit = 50;
    for (let idx = 0; idx < suspiciousGames.length && idx < displayLimit; idx++) {
        const entry = suspiciousGames[idx];
        const { game, lineNumber, reason } = entry;
        console.log(`Line ${lineNumber}: "${game.name}" (${game.year})`);
        console.log(`  Current: ${game.platform}`);

        if (PLATFORM_CORRECTIONS[game.name]) {
            console.log(`  Suggested: ${PLATFORM_CORRECTIONS[game.name]} ✓`);
        } else {
            console.log(`  Suggested: <MANUAL REVIEW NEEDED>`);
        }
        console.log(`  Reason: ${reason}\n`);
    }

    if (suspiciousGames.length > displayLimit) {
        console.log(`... and ${suspiciousGames.length - displayLimit} more suspicious entries\n`);
    }
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--context')) {
    const contextLines = args.includes('--context-lines')
        ? Number.parseInt(args[args.indexOf('--context-lines') + 1], 10) || 5
        : 5;
    showSuspiciousWithContext(contextLines);
} else {
    analyzePlatforms();
    console.log('\n💡 Commands:\n');
    console.log('  npm run analyze-platforms              - Show analysis of suspicious platforms');
    console.log('  npm run analyze-platforms -- --context - Show suspicious platforms with file context (5 lines)');
    console.log('  npm run analyze-platforms -- --context --context-lines 10 - Show with 10 lines of context\n');
}
