const fs = require('fs');
const path = require('path');

// Roman to Arabic numeral mapping
const romanToArabic = {
    ' I': ' 1',
    ' II': ' 2',
    ' III': ' 3',
    ' IV': ' 4',
    ' V': ' 5',
    ' VI': ' 6',
    ' VII': ' 7',
    ' VIII': ' 8',
    ' IX': ' 9',
    ' X': ' 10',
    ' XI': ' 11',
    ' XII': ' 12',
    ' XIII': ' 13',
    ' XIV': ' 14',
    ' XV': ' 15',
    ' XVI': ' 16',
    ' XVII': ' 17',
    ' XVIII': ' 18',
    ' XIX': ' 19',
    ' XX': ' 20'
};

/**
 * Converts Roman numerals to Arabic numerals in game names
 * Only converts when the Roman numeral is at the end of the name (before quotes/commas)
 */
function convertRomanToArabic(text) {
    let result = text;

    // Sort by length (longest first) to avoid partial matches
    const romanNumerals = Object.keys(romanToArabic).sort((a, b) => b.length - a.length);

    for (const roman of romanNumerals) {
        const arabic = romanToArabic[roman];

        // Match Roman numerals that are:
        // 1. Preceded by a space (the space is included in the pattern)
        // 2. Followed by a quote, comma, or end of string
        const regex = new RegExp(roman.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=[",]|$)', 'g');
        result = result.replace(regex, arabic);
    }

    return result;
}

/**
 * Process games_db.json file
 */
function processGamesDb(filePath) {
    console.log(`\n📖 Processing ${filePath}...`);

    const content = fs.readFileSync(filePath, 'utf8');
    const games = JSON.parse(content);

    let changes = [];

    games.forEach((game, index) => {
        if (game.name) {
            const originalName = game.name;
            const newName = convertRomanToArabic(originalName);

            if (originalName !== newName) {
                changes.push({
                    index,
                    id: game.id,
                    original: originalName,
                    converted: newName
                });
                game.name = newName;
            }
        }
    });

    if (changes.length > 0) {
        console.log(`\n✅ Found ${changes.length} games to convert:`);
        changes.forEach(change => {
            console.log(`   #${change.index} (ID: ${change.id}): "${change.original}" → "${change.converted}"`);
        });

        // Write back to file with proper formatting
        fs.writeFileSync(filePath, JSON.stringify(games, null, 2), 'utf8');
        console.log(`\n💾 Saved changes to ${path.basename(filePath)}`);
    } else {
        console.log('   ℹ️  No Roman numerals found in game names.');
    }

    return changes.length;
}

/**
 * Process bait_games.json file
 */
function processBaitGames(filePath) {
    console.log(`\n📖 Processing ${filePath}...`);

    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    let changes = [];

    if (data.baitGames && Array.isArray(data.baitGames)) {
        data.baitGames.forEach((gameName, index) => {
            const originalName = gameName;
            const newName = convertRomanToArabic(originalName);

            if (originalName !== newName) {
                changes.push({
                    index,
                    original: originalName,
                    converted: newName
                });
                data.baitGames[index] = newName;
            }
        });
    }

    if (changes.length > 0) {
        console.log(`\n✅ Found ${changes.length} games to convert:`);
        changes.forEach(change => {
            console.log(`   #${change.index}: "${change.original}" → "${change.converted}"`);
        });

        // Write back to file with proper formatting
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`\n💾 Saved changes to ${path.basename(filePath)}`);
    } else {
        console.log('   ℹ️  No Roman numerals found in game names.');
    }

    return changes.length;
}

// Main execution
function main() {
    console.log('🎮 Game Numeral Normalizer');
    console.log('==========================================');
    console.log('Converting Roman numerals to Arabic numerals...\n');

    const gamesDbPath = path.join(__dirname, '..', 'src', 'data', 'games_db.json');
    const baitGamesPath = path.join(__dirname, '..', 'src', 'data', 'bait_games.json');

    let totalChanges = 0;

    try {
        // Process games_db.json
        if (fs.existsSync(gamesDbPath)) {
            totalChanges += processGamesDb(gamesDbPath);
        } else {
            console.error(`❌ File not found: ${gamesDbPath}`);
        }

        // Process bait_games.json
        if (fs.existsSync(baitGamesPath)) {
            totalChanges += processBaitGames(baitGamesPath);
        } else {
            console.error(`❌ File not found: ${baitGamesPath}`);
        }

        console.log('\n==========================================');
        if (totalChanges > 0) {
            console.log(`✨ Done! Converted ${totalChanges} game names total.`);
        } else {
            console.log('✅ All game names already use Arabic numerals.');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
main();
