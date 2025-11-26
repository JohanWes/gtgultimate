import { useState, useEffect, useCallback } from 'react';
import type { Game, EndlessState, LifelineType, GuessResult } from '../types';
import { calculateScore, getShopItems, generateRandomCrop } from '../utils/endlessUtils';
import { areSimilarNames } from '../utils/seriesDetection';


// Proper Fisher-Yates shuffle algorithm (unbiased)
function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

const STORAGE_KEY = 'guessthegame_endless_state';
const HIGH_SCORE_KEY = 'guessthegame_endless_highscore';

const INITIAL_STATE: EndlessState = {
    score: 0,
    streak: 0,
    highScore: 0,
    lifelines: {
        skip: 1,
        anagram: 1,
        consultant: 1,
        double_trouble: 1,
        zoom_out: 1
    },
    currentLevelIndex: 0,
    gameOrder: [],
    isGameOver: false,
    highScoreModalShown: false,
    status: 'playing',
    guesses: [],
    history: [],
    doubleTroubleGameId: null,
    zoomOutActive: false,
    cropPositions: [],
    hotStreakCount: 0,
    isHotStreakActive: false
};

export const useEndlessState = (allGames: Game[]) => {
    const [state, setState] = useState<EndlessState>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const savedHighScore = localStorage.getItem(HIGH_SCORE_KEY);
        const parsedState = saved ? JSON.parse(saved) : INITIAL_STATE;

        // Ensure high score is up to date
        if (savedHighScore) {
            parsedState.highScore = Math.max(parsedState.highScore, Number.parseInt(savedHighScore, 10));
        }

        // Ensure crop positions exist (for legacy state or fresh start)
        if (!parsedState.cropPositions || parsedState.cropPositions.length === 0) {
            parsedState.cropPositions = Array(5).fill(0).map(() => generateRandomCrop());
        }

        return parsedState;
    });

    // Initialize game order if empty
    useEffect(() => {
        if (state.gameOrder.length === 0 && allGames.length > 0) {
            const shuffledIds = shuffleArray(allGames).map(g => g.id);
            setState(prev => ({ ...prev, gameOrder: shuffledIds }));
        }
    }, [allGames, state.gameOrder.length]);

    // Save state on change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        if (state.score > state.highScore) {
            localStorage.setItem(HIGH_SCORE_KEY, state.score.toString());
        }
    }, [state]);

    const currentGameId = state.gameOrder[state.currentLevelIndex];
    const currentGame = allGames.find(g => g.id === currentGameId);

    const submitGuess = useCallback((game: Game, isFatal: boolean = false) => {
        if (state.isGameOver || state.status !== 'playing' || !currentGame) return;

        let result: GuessResult = 'wrong';
        if (game.id === currentGame.id) {
            result = 'correct';
        } else {
            if (areSimilarNames(game.name, currentGame.name)) {
                result = 'similar-name';
            }
        }

        const newGuesses = [...state.guesses, { name: game.name, result }];

        if (result === 'correct') {
            const isCloseToPerfect = newGuesses.length <= 2;
            const newHotStreakCount = isCloseToPerfect ? state.hotStreakCount + 1 : 0;
            const isHotStreakActive = newHotStreakCount >= 3;

            let points = calculateScore(newGuesses.length);
            if (isHotStreakActive) {
                points *= 2;
            }

            setState(prev => ({
                ...prev,
                score: prev.score + points,
                streak: prev.streak + 1,
                status: 'won',
                guesses: newGuesses,
                highScore: Math.max(prev.highScore, prev.score + points),
                history: [...prev.history, { gameId: currentGame.id, score: points, status: 'won' }],
                hotStreakCount: newHotStreakCount,
                isHotStreakActive: isHotStreakActive
            }));
        } else if (newGuesses.length >= 5 || isFatal) {
            // Permadeath or Fatal Error (Consultant wrong guess)
            setState(prev => ({
                ...prev,
                isGameOver: true,
                highScoreModalShown: false, // Reset when game over happens
                status: 'lost',
                guesses: newGuesses,
                history: [...prev.history, { gameId: currentGame.id, score: 0, status: 'lost' }],
                hotStreakCount: 0,
                isHotStreakActive: false
            }));
        } else {
            setState(prev => ({
                ...prev,
                guesses: newGuesses
            }));
        }
    }, [state.isGameOver, state.status, currentGame, state.guesses]);

    const skipGuess = useCallback(() => {
        if (state.isGameOver || state.status !== 'playing' || !currentGame) return;

        const newGuesses = [...state.guesses, { name: "Skipped", result: 'skipped' as GuessResult }];

        if (newGuesses.length >= 5) {
            // Permadeath
            setState(prev => ({
                ...prev,
                isGameOver: true,
                highScoreModalShown: false, // Reset when game over happens
                status: 'lost',
                guesses: newGuesses,
                history: [...prev.history, { gameId: currentGame.id, score: 0, status: 'lost' }],
                hotStreakCount: 0,
                isHotStreakActive: false
            }));
        } else {
            setState(prev => ({
                ...prev,
                guesses: newGuesses
            }));
        }
    }, [state.isGameOver, state.status, currentGame, state.guesses]);

    const nextLevel = useCallback(() => {
        if (state.isGameOver) {
            // Reset run with a fresh shuffled game order
            const shuffledIds = shuffleArray(allGames).map(g => g.id);
            setState({
                ...INITIAL_STATE,
                highScore: state.highScore,
                highScoreModalShown: false, // Reset for new game
                gameOrder: shuffledIds,
                cropPositions: Array(5).fill(0).map(() => generateRandomCrop())
            });
        } else {
            setState(prev => ({
                ...prev,
                currentLevelIndex: prev.currentLevelIndex + 1,
                status: 'playing',
                guesses: [],
                doubleTroubleGameId: null,
                zoomOutActive: false,
                cropPositions: Array(5).fill(0).map(() => generateRandomCrop())
            }));
        }
    }, [state.isGameOver, state.highScore, allGames]);

    const useLifeline = useCallback((type: LifelineType) => {
        if (state.lifelines[type] <= 0 || state.status !== 'playing') return;

        setState(prev => {
            const newLifelines = { ...prev.lifelines, [type]: prev.lifelines[type] - 1 };

            if (type === 'skip') {
                return {
                    ...prev,
                    lifelines: newLifelines,
                    status: 'won', // Treat as won but 0 points
                    history: [...prev.history, { gameId: currentGameId, score: 0, status: 'skipped' }],
                    hotStreakCount: 0,
                    isHotStreakActive: false
                };
            }

            if (type === 'zoom_out') {
                return {
                    ...prev,
                    lifelines: newLifelines,
                    zoomOutActive: true
                };
            }

            return {
                ...prev,
                lifelines: newLifelines
            };
        });
    }, [state.lifelines, state.status, currentGameId]);

    const buyShopItem = useCallback((itemId: string) => {
        const item = getShopItems().find(i => i.id === itemId);
        if (!item) return;

        if (state.score < item.cost) return; // Should be handled by UI too

        setState(prev => {
            const newLifelines = { ...prev.lifelines };
            if (item.type === 'refill_skip') newLifelines.skip += 1;
            if (item.type === 'refill_anagram') newLifelines.anagram += 1;
            if (item.type === 'refill_consultant') newLifelines.consultant += 1;
            if (item.type === 'refill_double_trouble') newLifelines.double_trouble += 1;
            if (item.type === 'refill_zoom_out') newLifelines.zoom_out += 1;

            return {
                ...prev,
                score: prev.score - item.cost, // item.cost is negative for bonus points, so this works
                lifelines: newLifelines
            };
        });
    }, [state.score]);

    const markHighScoreModalShown = useCallback(() => {
        setState(prev => ({ ...prev, highScoreModalShown: true }));
    }, []);

    return {
        state,
        currentGame,
        submitGuess,
        skipGuess,
        nextLevel,
        useLifeline,
        buyShopItem,
        markHighScoreModalShown
    };
};
