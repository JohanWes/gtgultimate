import Fuse from 'fuse.js';
import type { Game } from '../types';

// Module-level singleton to prevent re-creating Fuse index on every render
let searchIndex: Fuse<Game> | null = null;
let cachedGames: Game[] | null = null;

export function initializeSearchIndex(games: Game[]): Fuse<Game> {
    // Only rebuild if games data has actually changed
    if (searchIndex && cachedGames === games) {
        return searchIndex;
    }

    cachedGames = games;
    searchIndex = new Fuse(games, {
        keys: ['name'],
        threshold: 0.3,
        minMatchCharLength: 2,
    });

    return searchIndex;
}

export function getSearchIndex(): Fuse<Game> | null {
    return searchIndex;
}

export function search(query: string): Game[] {
    if (!searchIndex || !query) {
        return [];
    }

    return searchIndex
        .search(query)
        .map(result => result.item)
        .slice(0, 20);
}

export function clearSearchIndex() {
    searchIndex = null;
    cachedGames = null;
}
