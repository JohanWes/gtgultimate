
import { useState, useEffect } from 'react';
import type { Game, GameStatus, LevelProgress, GuessResult } from '../types';
// import gamesData from '../data/games_db.json'; // Removed static import
import { areSimilarNames } from '../utils/seriesDetection';

// const GAMES = gamesData as Game[]; // Removed static constant
const STORAGE_KEY = 'guessthegame_unlimited_progress';

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
            .then(data => {
                setGames(data);
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
