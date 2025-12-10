import React, { useState, useEffect } from 'react';
import { type HighScore, fetchHighScores, submitHighScore } from '../utils/api';
import { Trophy, RotateCcw, Send, X, Play } from 'lucide-react';
import { clsx } from 'clsx';
import { useIsMobile } from '../hooks/useIsMobile';
import type { GuessWithResult, LifelineType } from '../types';

interface HighScoreModalProps {
    score: number;
    onPlayAgain: () => void;
    onClose: () => void;
    runData?: {
        history: Array<{
            gameId: number;
            score: number;
            status: 'won' | 'skipped' | 'lost';
            guesses: GuessWithResult[];
            lifelinesUsed: LifelineType[];
            correctAnswer: string;
            cropPositions: Array<{ x: number; y: number }>;
        }>;
        totalScore: number;
        totalGames: number;
    };
}

export const HighScoreModal: React.FC<HighScoreModalProps> = ({ score, onPlayAgain, onClose, runData }) => {
    const [highScores, setHighScores] = useState<HighScore[]>([]);
    const [name, setName] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const isMobile = useIsMobile();

    useEffect(() => {
        loadHighScores();
    }, []);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const loadHighScores = async () => {
        setLoading(true);
        const scores = await fetchHighScores();
        setHighScores(scores);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || submitting) return;

        setSubmitting(true);
        let runId: string | undefined = undefined;

        // Ensure we save the run first if data is available
        if (runData) {
            try {
                const response = await fetch('/api/run/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(runData)
                });

                if (response.ok) {
                    const data = await response.json();
                    runId = data.id;
                }
            } catch (err) {
                console.error("Failed to save run:", err);
            }
        }

        await submitHighScore(name, score, runId);
        setSubmitted(true);
        await loadHighScores();
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10 p-1 hover:bg-white/10 rounded-full"
                >
                    <X size={24} />
                </button>

                {/* Header */}
                <div className="p-6 bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-b border-white/10 text-center">
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">GAME OVER</h2>
                    <div className="flex flex-col items-center justify-center gap-1">
                        <span className="text-gray-400 text-sm uppercase tracking-widest font-bold">Final Score</span>
                        <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-lg">
                            {score}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    {!submitted ? (
                        <form onSubmit={handleSubmit} className="mb-8">
                            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">
                                Enter your name
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={15}
                                    placeholder="Player Name"
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
                                    autoFocus={!isMobile}
                                />
                                <button
                                    type="submit"
                                    disabled={!name.trim() || submitting}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center justify-center"
                                >
                                    {submitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Send size={20} />
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center animate-in zoom-in duration-300">
                            <p className="text-green-400 font-bold">Score Submitted!</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Trophy className="text-yellow-400" size={20} />
                                Global Leaderboard
                            </h3>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                            </div>
                        ) : highScores.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 italic">
                                No scores yet. Be the first!
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {highScores.map((s, idx) => (
                                    <div
                                        key={idx}
                                        className={clsx(
                                            "flex items-center justify-between p-3 rounded-lg border",
                                            s.name === name && submitted ? "bg-blue-500/20 border-blue-500/50" : "bg-gray-800/50 border-white/5"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={clsx(
                                                "font-mono font-bold w-6 text-right",
                                                idx === 0 ? "text-yellow-400" :
                                                    idx === 1 ? "text-gray-300" :
                                                        idx === 2 ? "text-orange-400" : "text-gray-600"
                                            )}>
                                                {idx + 1}
                                            </span>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-200 truncate max-w-[120px]">
                                                        {s.name}
                                                    </span>
                                                    {s.runId && (
                                                        <a
                                                            href={`/share/${s.runId}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-white/40 hover:text-blue-400 transition-colors"
                                                            title="Watch Run"
                                                        >
                                                            <Play size={12} fill="currentColor" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="font-mono font-bold text-yellow-500">
                                            {s.score}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-800/80 border-t border-white/5 backdrop-blur-sm">
                    <button
                        onClick={onPlayAgain}
                        className="w-full bg-white text-black hover:bg-gray-200 py-3 rounded-xl font-black text-lg uppercase tracking-wide transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={20} />
                        Play Again
                    </button>
                </div>
            </div>
        </div>
    );
};

