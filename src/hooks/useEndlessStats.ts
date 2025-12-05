import { useState, useEffect, useCallback } from 'react';
import type { Game } from '../types';

export interface EndlessStats {
    totalCorrect: number;
    totalIncorrect: number;
    guessDistribution: number[]; // Index 0-4 = guesses 1-5
    genreStats: Record<string, { correct: number; total: number }>;
    decadeStats: Record<string, { correct: number; total: number }>;
}

const STORAGE_KEY = 'guessthegame_endless_stats';

const INITIAL_STATS: EndlessStats = {
    totalCorrect: 0,
    totalIncorrect: 0,
    guessDistribution: [0, 0, 0, 0, 0],
    genreStats: {},
    decadeStats: {},
};

function getDecade(year: number): string {
    const decade = Math.floor(year / 10) * 10;
    return `${decade}s`;
}

export const useEndlessStats = () => {
    const [stats, setStats] = useState<EndlessStats>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : INITIAL_STATS;
    });

    // Persist stats on change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    }, [stats]);

    const recordResult = useCallback((game: Game, wasCorrect: boolean, guessCount: number) => {
        setStats(prev => {
            const newStats = { ...prev };
            const genre = game.genre || 'Unknown';
            const decade = getDecade(game.year || 2000);

            // Update correct/incorrect counts
            if (wasCorrect) {
                newStats.totalCorrect = prev.totalCorrect + 1;
                // Update guess distribution (guessCount is 1-5)
                const distributionIdx = Math.min(guessCount - 1, 4);
                newStats.guessDistribution = [...prev.guessDistribution];
                newStats.guessDistribution[distributionIdx] += 1;
            } else {
                newStats.totalIncorrect = prev.totalIncorrect + 1;
            }

            // Update genre stats
            newStats.genreStats = { ...prev.genreStats };
            if (!newStats.genreStats[genre]) {
                newStats.genreStats[genre] = { correct: 0, total: 0 };
            }
            newStats.genreStats[genre] = {
                correct: newStats.genreStats[genre].correct + (wasCorrect ? 1 : 0),
                total: newStats.genreStats[genre].total + 1,
            };

            // Update decade stats
            newStats.decadeStats = { ...prev.decadeStats };
            if (!newStats.decadeStats[decade]) {
                newStats.decadeStats[decade] = { correct: 0, total: 0 };
            }
            newStats.decadeStats[decade] = {
                correct: newStats.decadeStats[decade].correct + (wasCorrect ? 1 : 0),
                total: newStats.decadeStats[decade].total + 1,
            };

            return newStats;
        });
    }, []);

    const resetStats = useCallback(() => {
        setStats(INITIAL_STATS);
    }, []);

    // Calculate derived stats
    const totalGames = stats.totalCorrect + stats.totalIncorrect;
    const winRate = totalGames > 0 ? (stats.totalCorrect / totalGames) * 100 : 0;

    const totalGuesses = stats.guessDistribution.reduce((sum, count, idx) => sum + count * (idx + 1), 0);
    const averageGuesses = stats.totalCorrect > 0 ? totalGuesses / stats.totalCorrect : 0;

    return {
        stats,
        recordResult,
        resetStats,
        // Derived stats
        totalGames,
        winRate,
        averageGuesses,
    };
};
