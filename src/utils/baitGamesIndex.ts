import Fuse from 'fuse.js';
import baitGamesData from '../data/bait_games.json';
import type { BaitGame } from '../types';

export interface SearchableItem {
    id: string | number;
    name: string;
    isBait?: boolean;
}

// Convert bait games to searchable format
const getBaitGames = (): BaitGame[] => {
    return baitGamesData.baitGames.map((name, index) => ({
        id: `bait_${index}`,
        name,
        isBait: true,
    }));
};

// Module-level singleton
let combinedIndex: Fuse<SearchableItem> | null = null;
let cachedBaitGames: BaitGame[] | null = null;

export function initializeCombinedSearchIndex(actualGames: SearchableItem[]): Fuse<SearchableItem> {
    cachedBaitGames = getBaitGames();
    
    // Combine actual games with bait games
    const combinedGames: SearchableItem[] = [
        ...actualGames,
        ...cachedBaitGames,
    ];

    combinedIndex = new Fuse(combinedGames, {
        keys: ['name'],
        threshold: 0.3,
        minMatchCharLength: 2,
    });

    return combinedIndex;
}

export function getCombinedSearchIndex(): Fuse<SearchableItem> | null {
    return combinedIndex;
}

export function searchCombined(query: string): SearchableItem[] {
    if (!combinedIndex || !query) {
        return [];
    }

    return combinedIndex
        .search(query)
        .map(result => result.item)
        .slice(0, 20);
}

export function isBaitGame(item: SearchableItem): boolean {
    return item.isBait === true;
}

export function clearCombinedSearchIndex() {
    combinedIndex = null;
    cachedBaitGames = null;
}

export function getBaitGameCount(): number {
    return baitGamesData.baitGames.length;
}
