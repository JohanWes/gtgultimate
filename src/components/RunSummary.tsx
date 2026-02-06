import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getProxyImageUrl } from '../utils/api';
import type { Game, LifelineType, GuessWithResult } from '../types';

interface RunData {
    _id: string;
    history: Array<{
        gameId: number;
        score: number;
        status: 'won' | 'skipped' | 'lost';
        guesses: GuessWithResult[];
        lifelinesUsed: LifelineType[];
        correctAnswer: string;
        cropPositions?: Array<{ x: number; y: number }>;
    }>;
    totalScore: number;
    totalGames: number;
    createdAt: string;
}

interface RunSummaryProps {
    runId: string;
    allGames: Game[];
    onPlay: () => void;
}

const LifelineIcon = ({ type }: { type: LifelineType }) => {
    const icons: Record<LifelineType, string> = {
        skip: '⏭️',
        anagram: '🔠',
        consultant: '🧙‍♂️',
        double_trouble: '👯',
        zoom_out: '🔍',
        cover_peek: '🫣',
        synopsis: '📝'
    };
    return <span title={type} className="text-lg">{icons[type]}</span>;
};

export function RunSummary({ runId, allGames, onPlay }: RunSummaryProps) {
    const [data, setData] = useState<RunData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/run/${runId}`)
            .then(res => {
                if (!res.ok) throw new Error('Run not found');
                return res.json();
            })
            .then(setData)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [runId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-white">
                <div className="animate-pulse text-xl">Loading run details...</div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-error gap-4">
                <h1 className="text-2xl font-bold">Error Loading Run</h1>
                <p>{error}</p>
                <button
                    onClick={onPlay}
                    className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary-hover"
                >
                    Play Endless Mode
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-white p-4 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="text-center space-y-2 mt-8">
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                        ENDLESS RUN SUMMARY
                    </h1>
                    <div className="text-2xl text-gray-400">
                        Score: <span className="text-white font-bold">{data.totalScore}</span> •
                        Games: <span className="text-white font-bold">{data.totalGames}</span>
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-center">
                    <button
                        onClick={onPlay}
                        className="px-8 py-3 bg-primary text-black font-bold text-lg rounded-xl shadow-lg hover:scale-105 transition-transform"
                    >
                        Try to Beat This Score!
                    </button>
                </div>

                {/* History List */}
                <div className="space-y-4">
                    {data.history.map((item, index) => {
                        const game = allGames.find(g => g.id === item.gameId);
                        // Fallback if game not found (shouldn't happen often)
                        const gameName = game ? game.name : item.correctAnswer;
                        const coverUrl = game?.cover ? getProxyImageUrl(game.cover) : null;

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`bg-gray-900/50 border border-gray-800 rounded-xl p-4 overflow-hidden relative ${item.status === 'lost' ? 'border-red-500/50 bg-red-900/10' : ''
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row gap-4 items-start">

                                    {/* Game Cover (Small) */}
                                    <div className="w-24 h-32 flex-shrink-0 bg-black rounded-lg overflow-hidden shadow-lg border border-gray-700">
                                        {coverUrl ? (
                                            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">No Image</div>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-grow space-y-2 w-full">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-xl font-bold truncate pr-2">{index + 1}. {gameName}</h3>
                                            <div className={`text-sm font-bold px-2 py-1 rounded ${item.status === 'won' ? 'bg-green-500/20 text-green-400' :
                                                item.status === 'skipped' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                +{item.score} pts
                                            </div>
                                        </div>

                                        {/* Guesses */}
                                        <div className="text-sm bg-black/30 p-2 rounded-lg">
                                            <div className="text-gray-400 text-xs mb-1">GUESSES ({item.guesses.length}/5)</div>
                                            <div className="flex flex-wrap gap-2">
                                                {item.guesses.map((g, i) => (
                                                    <div key={i} className={`px-2 py-0.5 rounded text-xs border ${g.result === 'correct' ? 'border-green-500/50 bg-green-500/10 text-green-300' :
                                                        g.result === 'skipped' ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300' :
                                                            g.result === 'similar-name' ? 'border-orange-500/50 bg-orange-500/10 text-orange-300' :
                                                                'border-red-500/50 bg-red-500/10 text-red-300 line-through'
                                                        }`}>
                                                        {g.name}
                                                    </div>
                                                ))}
                                                {item.guesses.length === 0 && <span className="text-gray-600 italic">No guesses made</span>}
                                            </div>
                                        </div>

                                        {/* Lifelines Used */}
                                        {item.lifelinesUsed && item.lifelinesUsed.length > 0 && (
                                            <div className="flex gap-2 items-center text-sm">
                                                <span className="text-gray-400 text-xs">LIFELINES:</span>
                                                <div className="flex gap-1">
                                                    {item.lifelinesUsed.map((type, i) => (
                                                        <div key={i} className="bg-gray-800 p-1 rounded border border-gray-700" title={type}>
                                                            <LifelineIcon type={type} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Screenshots Grid (Miniatures) */}
                                        <div className="w-full mt-4 bg-black/20 p-2 rounded-lg">
                                            <div className="text-gray-400 text-xs mb-2 uppercase tracking-wider font-semibold">Screenshots</div>
                                            <div className="grid grid-cols-5 gap-2">
                                                {game && game.screenshots ? (
                                                    game.screenshots.map((screenData, screenIdx) => {
                                                        // Determine zoom level (mimicking ScreenshotViewer logic)
                                                        // Base zoom: 500, 400, 300, 200, 100
                                                        // Difficulty bonus: +10% every 5 levels (streak logic) or 10 levels?
                                                        // endlessUtils says: Math.floor(levelIndex / 5) * 10;
                                                        // Here 'index' is the level index in the run (0-based)
                                                        const difficultyBonus = Math.floor(index / 5) * 10;

                                                        let zoom = 100;
                                                        switch (screenIdx) {
                                                            case 0: zoom = 500; break;
                                                            case 1: zoom = 400; break;
                                                            case 2: zoom = 300; break;
                                                            case 3: zoom = 200; break;
                                                            default: zoom = 100; break;
                                                        }
                                                        zoom += difficultyBonus;

                                                        // Get crop position
                                                        // Prefer saved history crops, fallback to DB crops, then default center
                                                        const position = item.cropPositions?.[screenIdx] ||
                                                            game.cropPositions?.[screenIdx] ||
                                                            { x: 50, y: 50 };

                                                        // Construct Proxy URL
                                                        // Use full URL from DB (replacing with 't_screenshot_med' handled by regex in server? 
                                                        // No, server expects full URL. We should use high-res for cropping if possible?
                                                        // Actually, 't_720p' or 't_1080p' is better for cropping than 't_screenshot_med' (which is small).
                                                        // But let's stick to what we have. If screenData is usually 't_720p', we use that.
                                                        // The previous edit replaced 't_720p' with 't_screenshot_med', I should UNDO that if I want good crops?
                                                        // Actually, for a small thumbnail grid, maybe t_screenshot_med is fine?
                                                        // BUT, we are zooming in 500%. t_screenshot_med is tiny. We need the 720p or 1080p source.
                                                        // DB usually has 't_720p'. Let's use that directly.

                                                        const params = new URLSearchParams({
                                                            url: screenData, // Use original 720p URL for better crop quality
                                                            x: position.x.toString(),
                                                            y: position.y.toString(),
                                                            zoom: zoom.toString()
                                                        });

                                                        const screenUrl = `/api/image-proxy?${params.toString()}`;

                                                        return (
                                                            <div key={screenIdx} className="aspect-video relative rounded-md overflow-hidden border border-gray-700/50 bg-gray-800">
                                                                <img
                                                                    src={screenUrl}
                                                                    alt={`Screenshot ${screenIdx + 1}`}
                                                                    className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                                                                />
                                                                <div className="absolute bottom-0 right-1 text-[10px] font-bold text-white drop-shadow-md">
                                                                    {screenIdx + 1}
                                                                </div>
                                                                {/* Redaction Overlay */}
                                                                {game?.redactedRegions?.[screenIdx] && game.redactedRegions[screenIdx].map((region, rIdx) => {
                                                                    // Calculate styles (inline logic similar to ScreenshotViewer)
                                                                    // Note: RunSummary uses 'zoom' which is roughly equivalent to getZoomScale returns
                                                                    // If zoom <= 100, purely % based.
                                                                    // If zoom > 100, project coordinates.

                                                                    let style: React.CSSProperties = {};

                                                                    if (zoom <= 100) {
                                                                        style = {
                                                                            left: `${region.x}%`,
                                                                            top: `${region.y}%`,
                                                                            width: `${region.width}%`,
                                                                            height: `${region.height}%`
                                                                        };
                                                                    } else {
                                                                        const zoomFactor = zoom / 100;
                                                                        const visiblePortion = 100 / zoomFactor;
                                                                        const maxOffset = 100 - visiblePortion;

                                                                        const viewLeft = maxOffset * (position.x / 100);
                                                                        const viewTop = maxOffset * (position.y / 100);

                                                                        style = {
                                                                            left: `${(region.x - viewLeft) * zoomFactor}%`,
                                                                            top: `${(region.y - viewTop) * zoomFactor}%`,
                                                                            width: `${region.width * zoomFactor}%`,
                                                                            height: `${region.height * zoomFactor}%`
                                                                        };
                                                                    }

                                                                    return (
                                                                        <div
                                                                            key={`r-${rIdx}`}
                                                                            className="absolute bg-black pointer-events-none"
                                                                            style={style}
                                                                        />
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="col-span-5 text-center text-gray-500 text-xs py-2">No screenshots available</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Footer Play Button */}
                <div className="flex justify-center pt-8">
                    <button
                        onClick={onPlay}
                        className="px-8 py-3 bg-primary text-black font-bold text-lg rounded-xl shadow-lg hover:scale-105 transition-transform"
                    >
                        Start Your Own Run
                    </button>
                </div>

            </div>
        </div>
    );
}
