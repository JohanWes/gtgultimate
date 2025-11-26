

export interface Game {
    id: number;
    name: string;
    year: number;
    platform: string;
    genre: string;
    rating: number;
    screenshots: string[];
    cover: string | null;
    cropPositions: Array<{ x: number; y: number }>; // Random crop positions for each screenshot
}

export interface BaitGame {
    id: string; // Format: 'bait_' + index
    name: string;
    isBait: true;
}

export type ConsultantOption = Game | BaitGame;

export type GameMode = 'standard' | 'endless';

export type GameStatus = 'playing' | 'won' | 'lost';

export type GuessResult = 'wrong' | 'similar-name' | 'correct' | 'skipped';

export interface GuessWithResult {
    name: string;
    result: GuessResult;
}

export interface LevelProgress {
    status: GameStatus;
    guesses: GuessWithResult[]; // List of guessed games with their results
}


export interface GameState {
    currentLevel: number; // 1-100
    progress: Record<number, LevelProgress>; // Map level number to progress
}

export type LifelineType = 'skip' | 'anagram' | 'consultant' | 'double_trouble' | 'zoom_out' | 'cover_peek';

export interface Lifelines {
    skip: number;
    anagram: number;
    consultant: number;
    double_trouble: number;
    zoom_out: number;
    cover_peek: number;
}

export interface EndlessState {
    score: number;
    streak: number;
    highScore: number;
    lifelines: Lifelines;
    currentLevelIndex: number; // Index in the randomized game list
    gameOrder: number[]; // Array of game IDs for the current run
    isGameOver: boolean;
    highScoreModalShown: boolean; // Track if the high score modal has been shown for this game over
    status: GameStatus;
    guesses: GuessWithResult[];
    history: Array<{ gameId: number; score: number; status: 'won' | 'skipped' | 'lost' }>;
    doubleTroubleGameId: number | null;
    zoomOutActive: boolean; // Whether Zoom Out lifeline is active for current round
    cropPositions: Array<{ x: number; y: number }>; // Persisted crop positions for the current level
    hotStreakCount: number; // Number of consecutive "Close to Perfect" guesses (1st or 2nd image)
    isHotStreakActive: boolean; // Whether the hot streak effect is currently active (>= 3 hotStreakCount)
}

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    type: 'refill_skip' | 'refill_anagram' | 'refill_consultant' | 'refill_double_trouble' | 'refill_zoom_out' | 'refill_cover_peek' | 'bonus_points';
}

export interface ConsultantOptionsHandle {
    stopSounds: () => void;
}
