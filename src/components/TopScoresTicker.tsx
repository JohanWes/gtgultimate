import React, { useState, useEffect } from 'react';
import { type HighScore, fetchHighScores } from '../utils/api';
import { Trophy } from 'lucide-react';
import { clsx } from 'clsx';

export const TopScoresTicker: React.FC = () => {
    const [topScores, setTopScores] = useState<HighScore[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadScores = async () => {
            try {
                const scores = await fetchHighScores();
                setTopScores(scores.slice(0, 3));
            } catch (error) {
                console.error('Failed to load top scores', error);
            } finally {
                setLoading(false);
            }
        };

        loadScores();

        // Refresh every 30 seconds
        const interval = setInterval(loadScores, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading || topScores.length === 0) return null;

    return (
        <div className="bg-gray-800/50 rounded-xl backdrop-blur-sm border border-gray-700 shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gray-900/50 px-4 py-2 border-b border-white/5 flex items-center justify-center gap-2">
                <Trophy className="text-yellow-500" size={14} />
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Top 3</span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-2 p-4 text-center">
                {topScores.map((score, idx) => (
                    <div key={idx} className="flex flex-col">
                        <div className={clsx(
                            "w-6 h-6 mx-auto mb-1.5 flex items-center justify-center rounded-full text-[11px] font-bold",
                            idx === 0 ? "bg-yellow-500/20 text-yellow-400" :
                                idx === 1 ? "bg-gray-400/20 text-gray-300" :
                                    "bg-orange-500/20 text-orange-400"
                        )}>
                            {idx + 1}
                        </div>
                        <span className="text-gray-300 text-xs font-medium truncate" title={score.name}>
                            {score.name}
                        </span>
                        <span className="text-white font-mono text-sm font-bold mt-0.5">
                            {score.score}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
