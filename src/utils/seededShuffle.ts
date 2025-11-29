import type { Game } from '../types';

// Mulberry32 is a simple and fast 32-bit PRNG
function mulberry32(a: number) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

// Hardcoded seed to ensure persistence across all users/sessions
const SEED = 20250101; // New Year 2025!

export function getSeededGameOrder(games: Game[], fixedCount: number = 50): Game[] {
    if (!games || games.length === 0) return [];

    // Keep the first 'fixedCount' games fixed (indices 0 to fixedCount-1)
    // These are the "easy" introductory levels

    if (games.length <= fixedCount) {
        return [...games];
    }

    const fixedGames = games.slice(0, fixedCount);
    const gamesToShuffle = games.slice(fixedCount);

    // Create a seeded RNG
    const rng = mulberry32(SEED);

    // Fisher-Yates shuffle using the seeded RNG
    for (let i = gamesToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [gamesToShuffle[i], gamesToShuffle[j]] = [gamesToShuffle[j], gamesToShuffle[i]];
    }

    return [...fixedGames, ...gamesToShuffle];
}
