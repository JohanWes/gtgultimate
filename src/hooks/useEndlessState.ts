import { useState, useEffect, useCallback } from 'react';
import type { Game, EndlessState, LifelineType, GuessResult } from '../types';
import { calculateScore, getShopItems, generateRandomCrop } from '../utils/endlessUtils';
import { areSimilarNames } from '../utils/seriesDetection';


function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateWeightedGameOrder(allGames: Game[]): number[] {
    // 1. Classify games into Friendly (Rated/New) and Standard pools with fuzzy thresholds
    const friendlyRated: Game[] = [];
    const friendlyNew: Game[] = [];
    const standardGames: Game[] = [];

    allGames.forEach(game => {
        // Fuzzy thresholds per game
        const ratingThreshold = getRandomInt(88, 91);
        const yearThreshold = getRandomInt(2010, 2015);

        // Check if game is "Friendly"
        // Ensure rating exists (some games might not have it, treat as 0)
        const rating = game.rating || 0;
        const year = game.year || 0;

        const isRated = rating >= ratingThreshold;
        const isNew = year >= yearThreshold;

        if (isRated) {
            // Prioritize "Rated" classification for games that are both (to boost the smaller pool)
            friendlyRated.push(game);
        } else if (isNew) {
            friendlyNew.push(game);
        } else {
            standardGames.push(game);
        }
    });

    // Shuffle all pools initially
    let shuffledRated = shuffleArray(friendlyRated);
    let shuffledNew = shuffleArray(friendlyNew);
    let shuffledStandard = shuffleArray(standardGames);

    const finalOrder: number[] = [];
    const friendlyProbabilities = [1.0, 0.9, 0.7, 0.4, 0.3]; // Probabilities for first 5 games

    // 2. Select first 5 games based on probabilities
    for (let i = 0; i < 5; i++) {
        // If we run out of games in total, stop
        if (shuffledRated.length === 0 && shuffledNew.length === 0 && shuffledStandard.length === 0) break;

        const chance = friendlyProbabilities[i] ?? 0;
        const roll = Math.random();

        let pickedGame: Game | undefined;

        if (roll < chance && (shuffledRated.length > 0 || shuffledNew.length > 0)) {
            // Pick Friendly
            // 50/50 chance between Rated and New (if both available)
            const useRated = Math.random() < 0.5;

            if (useRated && shuffledRated.length > 0) {
                pickedGame = shuffledRated.pop();
            } else if (!useRated && shuffledNew.length > 0) {
                pickedGame = shuffledNew.pop();
            } else {
                // Fallback if the chosen pool was empty
                pickedGame = shuffledRated.pop() || shuffledNew.pop();
            }
        } else {
            // Pick Standard (or fallback to friendly if standard is empty)
            pickedGame = shuffledStandard.pop() || shuffledRated.pop() || shuffledNew.pop();
        }

        if (pickedGame) {
            finalOrder.push(pickedGame.id);
        }
    }

    // 3. Fill the rest
    const remainingGames = [...shuffledRated, ...shuffledNew, ...shuffledStandard];
    const shuffledRemaining = shuffleArray(remainingGames);

    shuffledRemaining.forEach(g => finalOrder.push(g.id));

    return finalOrder;
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
        zoom_out: 1,
        cover_peek: 1,
        synopsis: 1
    },
    currentLevelIndex: 0,
    gameOrder: [],
    isGameOver: false,
    highScoreModalShown: false,
    status: 'playing',
    guesses: [],
    history: [],
    currentLevelLifelinesUsed: [],
    doubleTroubleGameId: null,
    zoomOutActive: false,
    cropPositions: [],
    hotStreakCount: 0,
    isHotStreakActive: false,
    lastShopStreak: 0,
    hasBonusRoundOccurredInCurrentBlock: false,
    bonusRound: undefined
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

        // Ensure lastShopStreak exists (for legacy state)
        if (parsedState.lastShopStreak === undefined) {
            parsedState.lastShopStreak = 0;
        }

        // Ensure currentLevelLifelinesUsed exists
        if (!parsedState.currentLevelLifelinesUsed) {
            parsedState.currentLevelLifelinesUsed = [];
        }

        // Ensure bonus round state exists
        if (parsedState.hasBonusRoundOccurredInCurrentBlock === undefined) {
            parsedState.hasBonusRoundOccurredInCurrentBlock = false;
        }

        return parsedState;
    });

    // Initialize game order if empty
    useEffect(() => {
        if (state.gameOrder.length === 0 && allGames.length > 0) {
            const weightedIds = generateWeightedGameOrder(allGames);
            setState(prev => ({ ...prev, gameOrder: weightedIds }));
        }
    }, [allGames, state.gameOrder.length]);


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

            // Progressive difficulty bonus: +1 flat score every 5 levels
            const difficultyBonus = Math.floor(state.streak / 5);
            points += difficultyBonus;

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
                history: [...prev.history, {
                    gameId: currentGame.id,
                    score: points,
                    status: 'won',
                    guesses: newGuesses,
                    lifelinesUsed: prev.currentLevelLifelinesUsed,
                    correctAnswer: currentGame.name,
                    cropPositions: prev.cropPositions
                }],
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
                history: [...prev.history, {
                    gameId: currentGame.id,
                    score: 0,
                    status: 'lost',
                    guesses: newGuesses,
                    lifelinesUsed: prev.currentLevelLifelinesUsed,
                    correctAnswer: currentGame.name,
                    cropPositions: prev.cropPositions
                }],
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
                history: [...prev.history, {
                    gameId: currentGame.id,
                    score: 0,
                    status: 'lost',
                    guesses: newGuesses,
                    lifelinesUsed: prev.currentLevelLifelinesUsed,
                    correctAnswer: currentGame.name,
                    cropPositions: prev.cropPositions
                }],
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

    const submitBonusGuess = useCallback((gameId: number) => {
        if (!state.bonusRound || !state.bonusRound.active) return;

        const isCorrect = gameId === state.bonusRound.targetId;
        const targetGame = state.bonusRound.games.find(g => g.id === state.bonusRound!.targetId);

        if (isCorrect) {
            // Calculate Score
            let points = 2; // Base score
            // Bonus: +1 flat score for each shop that appears (every 5 levels)
            // Shop appears at 5, 10, 15... so Math.floor(streak / 5) gives the shop count
            const shopBonus = Math.floor(state.streak / 5);
            points += shopBonus;

            // Apply Hot Streak Multiplier if active
            // Note: Bonus round does NOT grant/gain hot streak, but uses it if active
            const isHotStreakActive = state.isHotStreakActive; // Maintained from previous level
            if (isHotStreakActive) {
                points *= 2;
            }

            const newStreak = state.streak + 1;
            const newScore = state.score + points;

            // Proceed to next level logic
            // Check if we hit a shop boundary after this bonus level
            // NOTE: Shop appears if streak % 5 === 0.
            // But we just incremented streak. If newStreak % 5 === 0, then next level IS a shop.
            // We reset 'hasBonusRoundOccurredInCurrentBlock' if we pass a shop.
            // Actually, the requirement says "reset after shop". Shop logic handles its own reset usually?
            // Let's look at `nextLevel` logic below.

            // We update state effectively simulating a "nextLevel" call + win
            setState(prev => ({
                ...prev,
                score: newScore,
                streak: newStreak,
                highScore: Math.max(prev.highScore, newScore),
                status: 'playing', // Go straight to playing next level
                guesses: [],
                currentLevelLifelinesUsed: [],
                doubleTroubleGameId: null,
                zoomOutActive: false,
                cropPositions: Array(5).fill(0).map(() => generateRandomCrop()),
                currentLevelIndex: prev.currentLevelIndex + 1,
                bonusRound: undefined, // Close bonus round
                hasBonusRoundOccurredInCurrentBlock: newStreak % 5 === 0 ? false : prev.hasBonusRoundOccurredInCurrentBlock, // If we completed a block (e.g. 4->5), reset? user says "reset after shop".
                // Wait, if next level is a shop, the user sees the shop.
                // If the user says "max once per 5 level block (reset after shop)", it means:
                // Level 1-5: Max 1 bonus.
                // Shop at 5.
                // Level 6-10: Max 1 bonus.
                // If we just finished the bonus round and newStreak is 5, we are about to enter shop.
                // So passedShop = (newStreak % 5 === 0).
                // If passedShop is true, we should reset the flag for the NEXT block?
                // Actually, if we are at streak 5 (entering shop), the current block (1-5) is done.
                // So yes, if newStreak % 5 === 0, we can reset.
                // Actually, if streak is 5, the NEXT level is the shop.
                history: [...prev.history, {
                    gameId: targetGame?.id || -1,
                    score: points,
                    status: 'won',
                    guesses: [],
                    lifelinesUsed: [],
                    correctAnswer: targetGame?.name || 'Bonus Round',
                    cropPositions: []
                }]
            }));

        } else {
            // Wrong guess
            // No points, strict progression
            const newStreak = state.streak + 1;

            setState(prev => ({
                ...prev,
                streak: newStreak,
                // Score unchanged
                status: 'playing',
                guesses: [],
                currentLevelLifelinesUsed: [],
                doubleTroubleGameId: null,
                zoomOutActive: false,
                cropPositions: Array(5).fill(0).map(() => generateRandomCrop()),
                currentLevelIndex: prev.currentLevelIndex + 1,
                bonusRound: undefined,
                hasBonusRoundOccurredInCurrentBlock: newStreak % 5 === 0 ? false : prev.hasBonusRoundOccurredInCurrentBlock,
                history: [...prev.history, {
                    gameId: targetGame?.id || -1,
                    score: 0,
                    status: 'lost', // Or 'skipped' effectively
                    guesses: [],
                    lifelinesUsed: [],
                    correctAnswer: targetGame?.name || 'Bonus Round',
                    cropPositions: []
                }]
            }));
        }

    }, [state.bonusRound, state.streak, state.score, state.isHotStreakActive]);

    const nextLevel = useCallback(() => {
        if (state.isGameOver) {
            // Reset run with a fresh shuffled game order (weighted)
            const weightedIds = generateWeightedGameOrder(allGames);
            setState({
                ...INITIAL_STATE,
                highScore: state.highScore,
                highScoreModalShown: false, // Reset for new game
                gameOrder: weightedIds,
                cropPositions: Array(5).fill(0).map(() => generateRandomCrop())
            });
        } else {
            // Check for Bonus Round Trigger
            // 1. Min level 3 (streak >= 2) - user said "CANT trigger the first 2 levels" -> level 1, 2 safe. Streak 0, 1 safe. Streak 2 -> Level 3.
            // 2. Max 1 per 5 levels (!hasBonusRoundOccurredInCurrentBlock)
            // 3. 10% chance
            // 4. NEXT level cannot be a shop? User said "if you are on level 3, and level 4 is a bonus round then the next level should be a shop".
            //    Wait, shop appears at streak 5. If we are at streak 4 (Level 5), next is Level 6 (Streak 5)?
            //    Actually, streak starts at 0 (Level 1).
            //    Streak 4 = Level 5.
            //    If we are at Streak 3 (Level 4), can we trigger bonus?
            //    If Bonus triggers, it takes place of Level 5.
            //    Completing Bonus increments streak to 4? No, finishing level 4 (streak 3) increments to streak 4.
            //    If nextLevel() is called, we are finishing current level.
            //    Current streak is X. We are moving to streak X+1.
            //    If we trigger Bonus, the Bonus Round IS the level for streak X+1.
            //    If streak X+1 would be a shop (e.g. 5, 10), we probably shouldn't trigger bonus?
            //    User said: "Average 1 per 10". "Max 1 per 5".
            //    If streak+1 is a multiple of 5, it's a shop level (usually).
            //    Wait, does Shop count as a level? The code says:
            //    "if (state.streak > 0 && state.streak % 5 === 0 ... setShowShop(true)"
            //    It shows shop overlay ON TOP of the game.
            //    So Level 6 (Streak 5) IS a game level, but shop opens first.
            //    So Bonus Round can ideally happen on any level.
            //    BUT, if Bonus Round UI replaces the Game UI, and Shop UI overlays the Game UI...
            //    If they happen together, clear conflict.
            //    Let's prevent Bonus Round on Shop Levels (Streak % 5 === 0).
            //    Current `state.streak` is the COMPLETED streak.
            //    When `nextLevel` is called, we are incrementing index, but `state.streak` hasn't incremented yet?
            //    Wait, `nextLevel` calculates `currentLevelIndex + 1`.
            //    It does NOT increment streak. Streak increments on WIN.
            //    Ah. `nextLevel` just moves to next puzzle.
            //    `submitGuess` -> `correct` -> `streak + 1`.
            //    So when `nextLevel` is called, we are at `streak` (e.g. 2). We are starting Level 3.
            //    If we trigger Bonus, we set `bonusRound: active`.
            //    We do NOT increment index or streak yet?
            //    Actually, `nextLevel` sets `currentLevelIndex + 1`.
            //    So we consume a game from the list?
            //    The bonus round requires 5 random images. It generates them independently.
            //    It doesn't necessarily consume the `currentLevelIndex`?
            //    If we don't increment index, we replay the same game ID later?
            //    Let's say: Bonus Round is a "side" thing.
            //    If triggered, we set `bonusRound: active`. We do NOT increment `currentLevelIndex`.
            //    When Bonus Phase finishes, we increment `streak` (it counts as a level),
            //    AND we increment `currentLevelIndex`?
            //    If we increment `streak`, but not `currentLevelIndex`, we are desyncing "Index in List" vs "Streak".
            //    The list is infinite (generated). `gameOrder` is finite but re-generated?
            //    `nextLevel` increments `currentLevelIndex`.
            //    Implementation choice:
            //    When triggering Bonus:
            //      Don't increment `currentLevelIndex` (save the scheduled game for next time).
            //      Just set `bonusRound`.
            //    When Bonus Finished:
            //      Increment `streak` (+1 level completed).
            //      Do NOT increment `currentLevelIndex` (we still haven't played that scheduled game).
            //      Reset `bonusRound`.
            //      Check if `streak` is now a Shop level.

            // Let's refine restrictions:
            // Streak = 0 (Lvl 1). Next = Lvl 2. (Streak 1).
            // User: "CANT trigger first 2 levels". So Streak 0 and 1 forbidden.
            // If current Streak is 1. We are finishing Lvl 2.
            // We invoke nextLevel. We CANNOT trigger.
            // Return to IDLE/Playing.
            // If current Streak is 2. We are finishing Lvl 3.
            // We invoke nextLevel. We CAN trigger.
            // If triggered -> Bonus Round.
            // Player plays Bonus. Wins. Streak becomes 3.
            // User sees Lvl 4 next.

            const currentStreak = state.streak;
            // Actually `useEffect` shows shop if `streak % 5 === 0` and `guesses.length === 0`.
            // So if we just finished level 4 (streak became 4->5 in `submitGuess`),
            // then `nextLevel` calls. We are at streak 5.
            // The Shop will open immediately on render.
            // We should NOT trigger Bonus Round if Shop is opening.
            // So if `currentStreak % 5 === 0` (and > 0), don't trigger.

            // Logic:
            const canTrigger =
                currentStreak >= 2 && // Min level 3 (completed 2)
                !state.hasBonusRoundOccurredInCurrentBlock && // Max 1 per block
                currentStreak % 5 !== 0 && // Not a shop level start
                Math.random() < 0.1; // 10% chance
            // Dev override: Math.random() < 1.0 (for testing)

            if (canTrigger) {
                // Trigger Bonus
                // Select 5 random games
                const shuffled = [...allGames].sort(() => 0.5 - Math.random()).slice(0, 5);
                const target = shuffled[Math.floor(Math.random() * shuffled.length)];

                setState(prev => ({
                    ...prev,
                    bonusRound: {
                        active: true,
                        games: shuffled,
                        targetId: target.id
                    },
                    hasBonusRoundOccurredInCurrentBlock: true,
                    // Do NOT increment currentLevelIndex
                    status: 'playing',
                    guesses: [],
                    currentLevelLifelinesUsed: [],
                    zoomOutActive: false
                }));
                return;
            }

            // Normal Next Level Logic
            // Reset block flag if we passed a shop (streak is multiple of 5)
            // Wait, if we are at streak 5 (Shop Level). We finish it. Streak -> 6.
            // We call `nextLevel`.
            // We are starting block 6-10.
            // We should reset the flag.
            // `currentStreak` is 6 here? No `submitGuess` updates streak.
            // UI Button calls `nextLevel`.
            // So `state.streak` is 6.
            // `currentStreak % 5 === 1` means we just started a new block?
            // Let's reset if `currentStreak % 5 === 0`? No that was shop.
            // If we are at streak 5. We play.
            // If we passed shop, we want to allow bonus again.
            // Let's reset `hasBonusRoundOccurredInCurrentBlock` if `currentStreak % 5 === 0` (we just finished a shop-compatible level? or we are ABOUT to start a new block?).
            // Actually, simply: If `canTrigger` failed, we proceed.
            // If `currentStreak % 5 === 0`, we are just starting a shop level (technically shop opens).
            // After shop, we are still on that level.
            // Wait, Shop is an overlay.
            // EndlessState track `lastShopStreak`.
            // If we use simpler logic: Reset `hasBonusRoundOccurred` when `streak % 5 === 0`.
            // But we do that in `setState` below.

            const shouldResetBonusFlag = currentStreak % 5 === 0;

            setState(prev => ({
                ...prev,
                currentLevelIndex: prev.currentLevelIndex + 1,
                status: 'playing',
                guesses: [],
                currentLevelLifelinesUsed: [], // Reset for new level
                doubleTroubleGameId: null,
                zoomOutActive: false,
                cropPositions: Array(5).fill(0).map(() => generateRandomCrop()),
                hasBonusRoundOccurredInCurrentBlock: shouldResetBonusFlag ? false : prev.hasBonusRoundOccurredInCurrentBlock
            }));
        }
    }, [state.isGameOver, state.highScore, allGames, state.streak, state.hasBonusRoundOccurredInCurrentBlock]);

    const useLifeline = useCallback((type: LifelineType) => {
        if (state.lifelines[type] <= 0 || state.status !== 'playing') return;

        setState(prev => {
            const newLifelines = { ...prev.lifelines, [type]: prev.lifelines[type] - 1 };
            const newLifelinesUsed = [...prev.currentLevelLifelinesUsed, type];

            if (type === 'skip') {
                return {
                    ...prev,
                    lifelines: newLifelines,
                    status: 'won', // Treat as won but 0 points
                    history: [...prev.history, {
                        gameId: currentGameId,
                        score: 0,
                        status: 'skipped',
                        guesses: [...prev.guesses], // Current guesses at time of skip
                        lifelinesUsed: newLifelinesUsed,
                        correctAnswer: currentGame?.name || 'Unknown',
                        cropPositions: prev.cropPositions
                    }],
                    currentLevelLifelinesUsed: newLifelinesUsed,
                    hotStreakCount: 0,
                    isHotStreakActive: false
                };
            }

            if (type === 'zoom_out') {
                return {
                    ...prev,
                    lifelines: newLifelines,
                    currentLevelLifelinesUsed: newLifelinesUsed,
                    zoomOutActive: true
                };
            }

            return {
                ...prev,
                lifelines: newLifelines,
                currentLevelLifelinesUsed: newLifelinesUsed
            };
        });
    }, [state.lifelines, state.status, currentGameId, currentGame]);

    const buyShopItem = useCallback((itemId: string, cost?: number) => {
        const item = getShopItems().find(i => i.id === itemId);
        if (!item) return;

        const finalCost = cost !== undefined ? cost : item.cost;

        if (state.score < finalCost) return; // Should be handled by UI too

        setState(prev => {
            const newLifelines = { ...prev.lifelines };
            if (item.type === 'refill_skip') newLifelines.skip += 1;
            if (item.type === 'refill_anagram') newLifelines.anagram += 1;
            if (item.type === 'refill_consultant') newLifelines.consultant += 1;
            if (item.type === 'refill_double_trouble') newLifelines.double_trouble += 1;
            if (item.type === 'refill_zoom_out') newLifelines.zoom_out += 1;
            if (item.type === 'refill_cover_peek') newLifelines.cover_peek += 1;
            if (item.type === 'refill_synopsis') newLifelines.synopsis += 1;

            return {
                ...prev,
                score: prev.score - finalCost, // finalCost is negative for bonus points (if bonus points could adhere to this, but they likely won't be discounted), so this works
                lifelines: newLifelines
            };
        });
    }, [state.score]);

    const markHighScoreModalShown = useCallback(() => {
        setState(prev => ({ ...prev, highScoreModalShown: true }));
    }, []);

    const markShopVisited = useCallback(() => {
        setState(prev => ({ ...prev, lastShopStreak: prev.streak }));
    }, []);

    return {
        state,
        currentGame,
        submitGuess,
        skipGuess,
        nextLevel,
        useLifeline,
        buyShopItem,
        markHighScoreModalShown,
        markShopVisited,
        submitBonusGuess
    };
};
