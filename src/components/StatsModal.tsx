import { X, RotateCcw, Trophy, Target, TrendingUp } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { EndlessStats } from '../hooks/useEndlessStats';
import { buildTransition, motionDurations } from '../utils/motion';

interface StatsModalProps {
    stats: EndlessStats;
    totalGames: number;
    winRate: number;
    averageGuesses: number;
    onReset: () => void;
    onClose: () => void;
}

// Colors for the charts
const GENRE_COLORS = [
    '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#a3e635'
];

const DECADE_COLORS: Record<string, string> = {
    '1980s': '#8b5cf6',
    '1990s': '#3b82f6',
    '2000s': '#22c55e',
    '2010s': '#f97316',
    '2020s': '#f43f5e',
};

export function StatsModal({ stats, totalGames, winRate, averageGuesses, onReset, onClose }: StatsModalProps) {
    const shouldReduceMotion = useReducedMotion();
    const overlayTransition = buildTransition(motionDurations.standard, !!shouldReduceMotion);
    const panelTransition = buildTransition(motionDurations.standard, !!shouldReduceMotion);

    // Sort genres by total games played
    const sortedGenres = Object.entries(stats.genreStats)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 8); // Top 8 genres

    // Sort decades chronologically
    const sortedDecades = Object.entries(stats.decadeStats)
        .sort((a, b) => a[0].localeCompare(b[0]));

    // Calculate total for pie chart percentages
    const genreTotal = sortedGenres.reduce((sum, [, data]) => sum + data.total, 0);

    // Generate pie chart CSS gradient
    let cumulativePercent = 0;
    const pieSegments = sortedGenres.map(([, data], idx) => {
        const percent = genreTotal > 0 ? (data.total / genreTotal) * 100 : 0;
        const start = cumulativePercent;
        cumulativePercent += percent;
        return `${GENRE_COLORS[idx % GENRE_COLORS.length]} ${start}% ${cumulativePercent}%`;
    });
    const pieGradient = pieSegments.length > 0
        ? `conic-gradient(${pieSegments.join(', ')})`
        : 'conic-gradient(#374151 0% 100%)';

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
        >
            <motion.div
                className="glass-panel-strong rounded-xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
                initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.97, y: shouldReduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.985, y: shouldReduceMotion ? 0 : 6 }}
                transition={panelTransition}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted hover:text-text transition-colors ui-focus-ring rounded-md"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold mb-6 text-text flex items-center gap-2 font-display">
                    📊 Your Statistics
                </h2>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="glass-panel-soft rounded-lg p-3 text-center border border-white/10">
                        <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-white">{stats.totalCorrect}</div>
                        <div className="text-xs text-muted">Correct Guesses</div>
                    </div>
                    <div className="glass-panel-soft rounded-lg p-3 text-center border border-white/10">
                        <Target className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-white">{winRate.toFixed(0)}%</div>
                        <div className="text-xs text-muted">Guess Accuracy</div>
                    </div>
                    <div className="glass-panel-soft rounded-lg p-3 text-center border border-white/10">
                        <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-white">{averageGuesses.toFixed(1)}</div>
                        <div className="text-xs text-muted">Avg Guesses</div>
                    </div>
                </div>



                {/* Genre Breakdown */}
                {sortedGenres.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Genre Breakdown - Your best genres</h3>
                        <div className="flex gap-4">
                            {/* Pie Chart */}
                            <div
                                className="w-24 h-24 rounded-full flex-shrink-0"
                                style={{ background: pieGradient }}
                            />
                            {/* Legend */}
                            <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                {sortedGenres.map(([genre, data], idx) => (
                                    <div key={genre} className="flex items-center gap-1.5 truncate">
                                        <div
                                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                                            style={{ backgroundColor: GENRE_COLORS[idx % GENRE_COLORS.length] }}
                                        />
                                        <span className="text-text truncate opacity-90">{genre}</span>
                                        <span className="text-muted ml-auto">{((data.total / genreTotal) * 100).toFixed(0)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Decade Breakdown */}
                {sortedDecades.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Decade Performance - Your best decades</h3>
                        <div className="space-y-2">
                            {sortedDecades.map(([decade, data]) => {
                                const successRate = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                                return (
                                    <div key={decade} className="flex items-center gap-2">
                                        <span className="text-xs text-muted w-12">{decade}</span>
                                        <div className="flex-1 bg-white/10 rounded-full h-4 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${successRate}%`,
                                                    backgroundColor: DECADE_COLORS[decade] || '#6b7280',
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs text-muted w-10 text-right">{successRate.toFixed(0)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {totalGames === 0 && (
                    <div className="text-center py-8 text-muted">
                        <p className="text-lg mb-2 font-display text-text">No games played yet!</p>
                        <p className="text-sm">Play some Endless Mode to see your stats here.</p>
                    </div>
                )}

                {/* Reset Button */}
                <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                    <button
                        onClick={() => {
                            if (window.confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
                                onReset();
                            }
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors ui-focus-ring"
                    >
                        <RotateCcw size={14} />
                        Reset Stats
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-text text-background font-bold rounded-lg hover:brightness-110 transition-colors ui-focus-ring"
                    >
                        Done
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
