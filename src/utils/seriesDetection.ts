/**
 * Sophisticated game series detection utility
 * Handles various naming patterns to detect if two games belong to the same series
 */

// Common words to ignore when comparing game names
const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for']);

// Iconic series names that should trigger a match if present in both games
// This overrides standard logic to ensure obvious series matches are caught
const ICONIC_SERIES = [
    "Mario", "Zelda", "Metroid", "Pokemon", "Pokémon", "Final Fantasy",
    "Resident Evil", "Silent Hill", "Street Fighter", "Sonic", "Halo",
    "God of War", "Call of Duty", "Battlefield", "Assassin's Creed",
    "Grand Theft Auto", "GTA", "Metal Gear", "Mortal Kombat", "Persona",
    "Kingdom Hearts", "Dark Souls", "Elden Ring", "Bloodborne", "Mass Effect",
    "Dragon Age", "Fallout", "Elder Scrolls", "Uncharted", "The Last of Us",
    "Tomb Raider", "Civilization", "Warcraft", "StarCraft", "Diablo",
    "Overwatch", "Doom", "Quake", "Wolfenstein", "Half-Life", "Portal",
    "Left 4 Dead", "Counter-Strike", "Borderlands", "BioShock", "Spyro",
    "Crash Bandicoot", "Ratchet & Clank", "Sly Cooper", "Need for Speed",
    "Burnout", "Tony Hawk", "Guitar Hero", "Rock Band", "Lego", "Star Wars",
    "Batman", "Spider-Man", "X-Men", "Avengers", "Mega Man", "Castlevania",
    "Pac-Man", "Donkey Kong", "Sims", "Tetris", "Gran Turismo", "Forza",
    "Fable", "Gears of War", "Splinter Cell", "Rainbow Six", "Ghost Recon",
    "Hitman", "Devil May Cry", "Yakuza", "Like a Dragon", "Monster Hunter",
    "Fire Emblem", "Xenoblade", "Dragon Quest", "Tales of", "Shin Megami Tensei",
    "Sid Meier's"
];

// Patterns to remove when normalizing game names
const REMOVAL_PATTERNS = [
    // Numbers (both Arabic and Roman numerals at word boundaries)
    /\b(I{1,3}|IV|V|VI{0,3}|IX|X|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX)\b/gi,
    /\b\d+\b/g,

    // Edition markers
    /\b(HD|Remastered|Definitive|Enhanced|Special|Collector's?|Ultimate|Complete|GOTY|Game of the Year)\s*(Edition)?\b/gi,

    // Platform indicators
    /\b(PS[1-5]|Xbox|PC|Windows|Mac|Linux|Switch|Mobile|iOS|Android)\b/gi,

    // Online/Offline indicators
    /\b(Online|Offline|Multiplayer|Single[ -]?player)\b/gi,

    // Years (1990-2099)
    /\b(19\d{2}|20\d{2})\b/g,

    // Common suffixes in parentheses
    /\([^)]*\)/g,
];

/**
 * Escape special characters for regex
 */
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize a game name by removing common variations
 */
function normalizeGameName(name: string): string {
    let normalized = name.trim();

    // Remove leading articles (The, A, An)
    // We do this BEFORE other removals to ensure clean start
    normalized = normalized.replace(/^(The|A|An)\s+/i, '');

    // Apply all removal patterns
    for (const pattern of REMOVAL_PATTERNS) {
        normalized = normalized.replace(pattern, ' ');
    }

    // Clean up whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized.toLowerCase();
}

/**
 * Extract the "core" series name by removing subtitles after colons
 */
function extractCoreName(name: string): string {
    // Remove everything after the first colon (subtitles)
    const withoutSubtitle = name.split(':')[0].trim();

    // Normalize it
    return normalizeGameName(withoutSubtitle);
}

/**
 * Tokenize a game name into significant words
 */
function tokenize(name: string): string[] {
    return name
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
        .split(/\s+/)
        .filter(word => word.length > 0 && !STOP_WORDS.has(word));
}

/**
 * Calculate token overlap percentage between two game names
 */
function calculateTokenOverlap(name1: string, name2: string): number {
    const tokens1 = tokenize(name1);
    const tokens2 = tokenize(name2);

    if (tokens1.length === 0 || tokens2.length === 0) {
        return 0;
    }

    // Count matching tokens
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    // Calculate overlap as percentage of smaller set
    const smaller = Math.min(set1.size, set2.size);
    return intersection.size / smaller;
}

/**
 * Check if two strings are identical core names
 */
function haveSameCoreName(name1: string, name2: string): boolean {
    const core1 = extractCoreName(name1);
    const core2 = extractCoreName(name2);

    // Must be at least 3 characters to avoid false positives like "The", "Star", etc.
    if (core1.length < 3 || core2.length < 3) {
        return false;
    }

    return core1 === core2;
}

/**
 * Check if two strings have significant token overlap
 * This catches cases where core names might differ slightly but are clearly related
 */
function haveSignificantOverlap(name1: string, name2: string): boolean {
    const overlap = calculateTokenOverlap(name1, name2);
    const tokens1 = tokenize(name1);
    const tokens2 = tokenize(name2);

    // Need at least 2 significant words and 70% overlap
    // This avoids "Star Fox" matching "Star Wars" (only 1 word matches)
    const minTokens = Math.min(tokens1.length, tokens2.length);

    if (minTokens < 2) {
        // For single-word names, require exact match
        return overlap === 1.0;
    }

    // For multi-word names, require 70% overlap (lowered from 80% to be more aggressive)
    // This means "The Elder Scrolls: Skyrim" and "The Elder Scrolls: Online"
    // will match (both have "elder" and "scrolls" = 100% of significant words)
    return overlap >= 0.7;
}

/**
 * Get the first significant word from a game name
 * This is crucial for series like "Metro 2033" vs "Metro Exodus"
 */
function getFirstSignificantWord(name: string): string | null {
    const tokens = tokenize(name);

    // Return the first token that's at least 3 characters
    // This avoids matching on short words like "of", "the", etc. that slipped through
    for (const token of tokens) {
        if (token.length >= 3) {
            return token;
        }
    }

    return null;
}

/**
 * Check if two games have the same first significant word
 * This is a strong indicator of the same series (Metro, Fallout, Dark Souls, etc.)
 */
function haveSameFirstWord(name1: string, name2: string): boolean {
    const first1 = getFirstSignificantWord(name1);
    const first2 = getFirstSignificantWord(name2);

    if (!first1 || !first2) {
        return false;
    }

    // Match if the first significant word is the same AND it's at least 4 characters
    // This avoids false positives like "Call of Duty" vs "Call of Juarez"
    // but catches "Metro 2033" vs "Metro Exodus", "Fallout 3" vs "Fallout New Vegas"
    return first1 === first2 && first1.length >= 4;
}

/**
 * Check if one normalized name is a substring of the other
 * This catches "Super Metroid" vs "Metroid", "The Legend of Zelda" vs "Zelda"
 * Enforces word boundaries to avoid "Metro" matching "Metroid"
 */
function haveSubstringMatch(name1: string, name2: string): boolean {
    const n1 = normalizeGameName(name1);
    const n2 = normalizeGameName(name2);

    // Ignore very short names to prevent false positives
    if (n1.length < 3 || n2.length < 3) {
        return false;
    }

    // Check if shorter name is in longer name with word boundaries
    const [shorter, longer] = n1.length < n2.length ? [n1, n2] : [n2, n1];

    try {
        const regex = new RegExp(`\\b${escapeRegExp(shorter)}\\b`, 'i');
        return regex.test(longer);
    } catch (e) {
        // Fallback to simple inclusion if regex fails (unlikely)
        return longer.includes(shorter);
    }
}

/**
 * Check if both games belong to the same iconic series
 * This is a manual override for obvious series matches
 */
function haveIconicSeriesMatch(name1: string, name2: string): boolean {
    // Normalize names to remove accents (e.g. Pokémon -> Pokemon)
    // This ensures we catch variations like "Pokemon" vs "Pokémon"
    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const n1 = normalize(name1);
    const n2 = normalize(name2);

    for (const series of ICONIC_SERIES) {
        const s = normalize(series);

        // Check if the series name is present in BOTH game names
        // Use word boundaries to prevent "Halo" matching "Shallow"
        try {
            const regex = new RegExp(`\\b${escapeRegExp(s)}\\b`, 'i');
            if (regex.test(n1) && regex.test(n2)) {
                return true;
            }
        } catch (e) {
            // Fallback to simple inclusion
            if (n1.includes(s) && n2.includes(s)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Main function: Check if two games have similar names (likely same series)
 */
export function areSimilarNames(gameName1: string, gameName2: string): boolean {
    // Don't match if names are identical (same game)
    if (gameName1.toLowerCase() === gameName2.toLowerCase()) {
        return false;
    }

    // Strategy 0: Iconic Series Override (Highest Priority)
    if (haveIconicSeriesMatch(gameName1, gameName2)) {
        return true;
    }

    // Strategy 1: Check if they have the same core name (before the colon)
    if (haveSameCoreName(gameName1, gameName2)) {
        return true;
    }

    // Strategy 2: Check if the first significant word matches
    // This catches "Metro 2033" vs "Metro Exodus", "Fallout 3" vs "Fallout 4"
    if (haveSameFirstWord(gameName1, gameName2)) {
        return true;
    }

    // Strategy 3: Check for significant token overlap
    if (haveSignificantOverlap(gameName1, gameName2)) {
        return true;
    }

    // Strategy 4: Substring match (Aggressive)
    // Catches "Super Metroid" vs "Metroid"
    if (haveSubstringMatch(gameName1, gameName2)) {
        return true;
    }

    return false;
}
