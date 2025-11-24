import type { ShopItem } from '../types';

export const calculateScore = (guessCount: number): number => {
    switch (guessCount) {
        case 1: return 5;
        case 2: return 3;
        case 3: return 2;
        case 4: return 1;
        case 5: return 1;
        default: return 0;
    }
};

export const generateRandomCrop = (_width: number, _height: number, _difficultyMultiplier: number = 1): { x: number, y: number } => {
    // This is a placeholder. In a real implementation, we'd need the actual image dimensions.
    // For now, we'll return a percentage-based position (0-100).
    // As difficulty increases, the crop might become more obscure or smaller (if we controlled zoom).
    // Since we only control position here based on the requirement "randomize the visible portion",
    // we'll just randomize the center point of the crop.

    return {
        x: Math.random() * 100,
        y: Math.random() * 100
    };
};

export const getDifficultyZoomBonus = (levelIndex: number): number => {
    // Every 10 levels, add 10% more zoom
    // Level 0-9 (tier 0): +0%
    // Level 10-19 (tier 1): +10%
    // Level 20-29 (tier 2): +20%
    // etc.
    const tier = Math.floor(levelIndex / 10);
    return tier * 10;
};

export const getShopItems = (): ShopItem[] => [
    {
        id: 'safety_first',
        name: 'Safety First',
        description: 'Refill "Skip" Lifeline',
        cost: 20,
        type: 'refill_skip'
    },
    {
        id: 'utility_anagram',
        name: 'Anagram',
        description: 'Refill "Anagram" Lifeline',
        cost: 10,
        type: 'refill_anagram'
    },
    {
        id: 'utility_consultant',
        name: 'Consultant',
        description: 'Refill "Consultant" Lifeline',
        cost: 10,
        type: 'refill_consultant'
    },
    {
        id: 'utility_double_trouble',
        name: 'Double Trouble',
        description: 'Refill "Double Trouble" Lifeline',
        cost: 5,
        type: 'refill_double_trouble'
    },
    {
        id: 'utility_zoom_out',
        name: 'Zoom Out',
        description: 'Refill "Zoom Out" Lifeline',
        cost: 5,
        type: 'refill_zoom_out'
    },
    {
        id: 'greed',
        name: 'Greed is Good',
        description: 'No refills. +10 Points immediately.',
        cost: -10, // Negative cost means it adds points
        type: 'bonus_points'
    }
];

export const shuffleString = (str: string): string => {
    const arr = str.split('');
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join(' ');
};

export const generateAnagram = (gameName: string): string => {
    const cleanName = gameName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
    return shuffleString(cleanName + randomChar);
};
