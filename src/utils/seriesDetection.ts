/**
 * Sophisticated game series detection utility
 * Handles various naming patterns to detect if two games belong to the same series
 */

// Common words to ignore when comparing game names
const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for']);

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
 */
function haveSubstringMatch(name1: string, name2: string): boolean {
    const n1 = normalizeGameName(name1);
    const n2 = normalizeGameName(name2);

    // Ignore very short names to prevent false positives
    if (n1.length < 3 || n2.length < 3) {
        return false;
    }

    // Check if one is contained in the other
    if (n1.includes(n2) || n2.includes(n1)) {
        return true;
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
