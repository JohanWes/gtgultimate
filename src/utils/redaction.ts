export const redactGameName = (synopsis: string, gameName: string): string => {
    const variations: string[] = [];
    const stopWords = new Set([
        'a', 'an', 'the', 'and', 'or', 'but', 'nor', 'yet', 'so',
        'at', 'by', 'for', 'in', 'of', 'on', 'to', 'up', 'with', 'from',
        'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'it', 'its', 'this', 'that', 'these', 'those',
        'game', 'video', 'series', 'edition', 'version',
        'episode', 'part', 'vol', 'volume', 'chapter', 'season',
        'remastered', 'remake', 'definitive', 'collection', 'anthology', 'bundle', 'pack'
    ]);

    // 1. Add Full Name
    variations.push(gameName);

    // 2. Add Subtitle Variations (Split by colon, dash, etc.)
    const splitters = [':', '-', '–', '—'];
    let parts: string[] = [gameName];

    // Iteratively split by all splitters
    splitters.forEach(splitter => {
        let newParts: string[] = [];
        parts.forEach(part => {
            newParts = newParts.concat(part.split(splitter));
        });
        parts = newParts;
    });

    parts.forEach(part => {
        const trimmed = part.trim();
        if (trimmed.length >= 3) { // Avoid very short fragments
            variations.push(trimmed);
        }
    });

    // 3. Remove Roman Numerals and Numbers
    const baseName = gameName
        .replace(/\s+(I{1,3}|IV|VI{0,3}|IX|X|XI{0,3}|\d+)$/i, '')
        .replace(/[:\-–]/g, ' ')
        .trim();
    if (baseName.length >= 4 && baseName !== gameName) {
        variations.push(baseName);
    }

    // 4. Token-based generation (Aggressive)
    // Split the game name into individual words
    const tokens = gameName
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/);

    tokens.forEach(token => {
        // Only add if it's NOT a stop word and has decent length
        if (!stopWords.has(token) && token.length >= 3) {
            variations.push(token);
        }
    });

    // 5. Clean up variations
    const cleanVariations = [...new Set(variations)]
        .map(v => v.trim())
        .filter(v => v.length >= 3) // Minimum length check
        .sort((a, b) => b.length - a.length); // Longest first to avoid partial replacement issues

    let redacted = synopsis;
    for (const variant of cleanVariations) {
        // Escape regex special characters
        const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Use word boundary for short words to avoid replacing parts of other words
        // But for longer words/phrases, we might be more aggressive? 
        // Let's try standard regex first.

        // If it's a single word, use word boundaries
        const isSingleWord = !variant.includes(' ');
        const pattern = isSingleWord ? `\\b${escaped}\\b` : escaped;

        const regex = new RegExp(pattern, 'gi');
        redacted = redacted.replace(regex, '[REDACTED]');
    }

    // Cleanup: Collapse multiple [REDACTED] tags into one
    redacted = redacted.replace(/\[REDACTED\](\s*\[REDACTED\])+/g, '[REDACTED]');

    return redacted;
};
