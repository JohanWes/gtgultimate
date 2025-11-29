import { useState, useEffect } from 'react';
import type { Game, GameStatus, LevelProgress, GuessResult } from '../types';
import { areSimilarNames } from '../utils/seriesDetection';
import { getSeededGameOrder } from '../utils/seededShuffle';

const STORAGE_KEY = 'guessthegame_unlimited_progress';
const MIGRATION_VERSION_KEY = 'guessthegame_version';
const CURRENT_VERSION = 3;

// Load initial state from localStorage
function loadInitialState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        console.log('🔍 Loading initial state from localStorage:', saved);
        if (saved) {
            const parsed = JSON.parse(saved);
            console.log('✅ Parsed initial state:', parsed);
            return {
                currentLevel: parsed.currentLevel || 1,
                progress: parsed.progress || {}
            };
        }
    } catch (e) {
        console.error('Failed to parse saved game state', e);
    }
    return { currentLevel: 1, progress: {} };
}

function migrateProgress(
    savedProgress: Record<number, LevelProgress>,
    fromGames: Game[],
    toGames: Game[]
): Record<number, LevelProgress> {
    console.log('🔄 Starting progress migration...');
    const newProgress: Record<number, LevelProgress> = {};

    // Create maps for O(1) lookups
    // fromMap: Level -> Game ID (in the old order)
    const fromMap = new Map(fromGames.map((g, i) => [i + 1, g.id]));

    // toMap: Game ID -> Level (in the new order)
    const toMap = new Map(toGames.map((g, i) => [g.id, i + 1]));

    Object.entries(savedProgress).forEach(([levelStr, progress]) => {
        const level = parseInt(levelStr, 10);

        // Find which game was at this level in the OLD order
        const gameId = fromMap.get(level);

        if (gameId !== undefined) {
            // Find where this game is in the NEW order
            const newLevel = toMap.get(gameId);

            if (newLevel) {
                if (level !== newLevel) {
                    console.log(`Moving progress from Level ${level} (Game ${gameId}) to Level ${newLevel}`);
                }
                newProgress[newLevel] = progress;
            } else {
                console.warn(`Could not find new level for game ID: ${gameId}`);
                // Fallback: keep it at the same level if possible
                newProgress[level] = progress;
            }
        } else {
            // If we can't identify the game (e.g. level out of bounds), keep it
            newProgress[level] = progress;
        }
    });

    return newProgress;
}

export function useGameState() {
    const [games, setGames] = useState<Game[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Use lazy initialization to load from localStorage only once
    const [currentLevel, setCurrentLevel] = useState<number>(() => loadInitialState().currentLevel);
    const [progress, setProgress] = useState<Record<number, LevelProgress>>(() => loadInitialState().progress);

    useEffect(() => {
        fetch('/api/games')
            .then(res => {
                if (!res.ok) throw new Error('Failed to load games');
                return res.json();
            })
            .then((originalGames: Game[]) => {
                // Determine the target shuffle (50 fixed)
                const targetGames = getSeededGameOrder(originalGames, 50);
                setGames(targetGames);

                // Check for migration
                const storedVersion = parseInt(localStorage.getItem(MIGRATION_VERSION_KEY) || '0', 10);

                if (storedVersion < CURRENT_VERSION) {
                    console.log(`⚠️ Migration needed (v${storedVersion} -> v${CURRENT_VERSION})`);

                    // Determine "from" games based on version
                    let fromGames: Game[] = originalGames;

                    if (storedVersion === 2) {
                        // Version 2 was "100 fixed"
                        fromGames = getSeededGameOrder(originalGames, 100);
                    } else {
                        // Version 0/1 was "Original / sorted"
                        fromGames = originalGames;
                    }

                    setProgress(prevProgress => {
                        const migrated = migrateProgress(prevProgress, fromGames, targetGames);
                        return migrated;
                    });

                    localStorage.setItem(MIGRATION_VERSION_KEY, CURRENT_VERSION.toString());
                }

                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to load games:', err);
                setError(err.message);
                setIsLoading(false);
            });
    }, []);

    // Save to local storage whenever state changes
    useEffect(() => {
        const dataToSave = { currentLevel, progress };
        console.log('💾 Saving to localStorage:', dataToSave);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }, [currentLevel, progress]);

    const currentGame = games[currentLevel - 1];
    const currentProgress = progress[currentLevel] || { status: 'playing', guesses: [] };

    const submitGuess = (guess: string) => {
        if (currentProgress.status !== 'playing') return;

        const guessedGame = games.find(g => g.name.toLowerCase() === guess.toLowerCase());
        const isCorrect = guess.toLowerCase() === currentGame.name.toLowerCase();

        let result: GuessResult = 'wrong';
        if (isCorrect) {
            result = 'correct';
        } else if (guessedGame) {
            if (areSimilarNames(guessedGame.name, currentGame.name)) {
                result = 'similar-name';
            }
        }

        const newGuesses = [...currentProgress.guesses, { name: guess, result }];

        let newStatus: GameStatus = 'playing';
        if (isCorrect) {
            newStatus = 'won';
        } else if (newGuesses.length >= 5) {
            newStatus = 'lost';
        }

        setProgress(prev => ({
            ...prev,
            [currentLevel]: {
                status: newStatus,
                guesses: newGuesses
            }
        }));
    };

    const skipGuess = () => {
        if (currentProgress.status !== 'playing') return;

        const newGuesses = [...currentProgress.guesses, { name: "Skipped", result: 'skipped' as GuessResult }];

        let newStatus: GameStatus = 'playing';
        if (newGuesses.length >= 5) {
            newStatus = 'lost';
        }

        setProgress(prev => ({
            ...prev,
            [currentLevel]: {
                status: newStatus,
                guesses: newGuesses
            }
        }));
    };

    const goToLevel = (level: number) => {
        if (level >= 1 && level <= games.length) {
            setCurrentLevel(level);
        }
    };

    const nextLevel = () => {
        goToLevel(currentLevel + 1);
    };

    return {
        games,
        isLoading,
        error,
        currentLevel,
        currentGame,
        currentProgress,
        allProgress: progress,
        submitGuess,
        skipGuess,
        goToLevel,
        nextLevel,
        totalLevels: games.length
    };
}
