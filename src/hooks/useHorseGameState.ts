import { useEffect, useMemo, useState } from 'react';
import type { Game, GameStatus, GuessResult, LevelProgress } from '../types';
import { areSimilarNames } from '../utils/seriesDetection';

function shuffleArray<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function buildHorseLevelOrder(games: Game[]): Game[] {
    const TARGET_LEVELS = 100;

    if (games.length === 0) return [];
    if (games.length >= TARGET_LEVELS) return shuffleArray(games).slice(0, TARGET_LEVELS);

    // Fallback if DB has fewer than 100 entries: repeat shuffled pool until we hit 100.
    const output: Game[] = [];
    while (output.length < TARGET_LEVELS) {
        output.push(...shuffleArray(games));
    }
    return output.slice(0, TARGET_LEVELS);
}

export function useHorseGameState(games: Game[], sessionKey: number) {
    const [levelGames, setLevelGames] = useState<Game[]>([]);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [progress, setProgress] = useState<Record<number, LevelProgress>>({});

    useEffect(() => {
        const nextLevelGames = buildHorseLevelOrder(games);
        setLevelGames(nextLevelGames);
        setCurrentLevel(1);
        setProgress({});
    }, [games, sessionKey]);

    const currentGame = levelGames[currentLevel - 1] || null;
    const currentProgress = progress[currentLevel] || { status: 'playing' as GameStatus, guesses: [] };

    const allHorseGames = useMemo(() => {
        const seen = new Set<string>();
        const unique: Game[] = [];

        games.forEach(game => {
            const key = game.name.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(game);
            }
        });

        return unique;
    }, [games]);

    const submitGuess = (guess: string) => {
        if (!currentGame || currentProgress.status !== 'playing') return;

        const guessedGame = allHorseGames.find(g => g.name.toLowerCase() === guess.toLowerCase());
        const isCorrect = guess.toLowerCase() === currentGame.name.toLowerCase();

        let result: GuessResult = 'wrong';
        if (isCorrect) {
            result = 'correct';
        } else if (guessedGame && areSimilarNames(guessedGame.name, currentGame.name)) {
            result = 'similar-name';
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
        if (!currentGame || currentProgress.status !== 'playing') return;

        const newGuesses = [...currentProgress.guesses, { name: 'Skipped', result: 'skipped' as GuessResult }];
        const newStatus: GameStatus = newGuesses.length >= 5 ? 'lost' : 'playing';

        setProgress(prev => ({
            ...prev,
            [currentLevel]: {
                status: newStatus,
                guesses: newGuesses
            }
        }));
    };

    const goToLevel = (level: number) => {
        if (level >= 1 && level <= levelGames.length) {
            setCurrentLevel(level);
        }
    };

    const nextLevel = () => {
        goToLevel(currentLevel + 1);
    };

    return {
        games: allHorseGames,
        isLoading: false,
        error: null as string | null,
        currentLevel,
        currentGame,
        currentProgress,
        allProgress: progress,
        submitGuess,
        skipGuess,
        goToLevel,
        nextLevel,
        totalLevels: levelGames.length
    };
}
