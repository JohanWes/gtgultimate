import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SkipForward, Shuffle, HelpCircle, Gamepad2, ZoomOut, Eye, FileText, type LucideIcon } from 'lucide-react';
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

// Same icons the tutorial uses for each lifeline
const LIFELINE_ICONS: Record<LifelineType, { icon: LucideIcon; label: string }> = {
    skip: { icon: SkipForward, label: 'Skip' },
    anagram: { icon: Shuffle, label: 'Anagram' },
    consultant: { icon: HelpCircle, label: 'Consultant' },
    double_trouble: { icon: Gamepad2, label: 'Double Trouble' },
    zoom_out: { icon: ZoomOut, label: 'Zoom Out' },
    cover_peek: { icon: Eye, label: 'Cover Peek' },
    synopsis: { icon: FileText, label: 'Synopsis' },
};

const LifelineIcon = ({ type }: { type: LifelineType }) => {
    const { icon: Icon, label } = LIFELINE_ICONS[type];
    return <Icon size={16} className="text-accent" aria-label={label} />;
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
            <div className="min-h-screen flex items-center justify-center bg-background text-muted">
                <div className="animate-pulse text-xl">Loading run…</div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-error gap-4">
                <h1 className="text-2xl font-bold">Couldn't load this run</h1>
                <p>{error}</p>
                <button
                    onClick={onPlay}
                    className="px-6 py-2 bg-primary text-onPrimary font-bold rounded-lg ui-pressable ui-focus-ring"
                >
                    Play Endless mode
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-text p-4 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="text-center space-y-2 mt-8">
                    <h1 className="text-4xl font-bold text-text">
                        Endless run summary
                    </h1>
                    <div className="text-2xl text-muted tabular-nums">
                        Score <span className="text-warning font-bold">{data.totalScore}</span>
                        <span className="mx-3 text-white/20" aria-hidden="true">/</span>
                        Games <span className="text-text font-bold">{data.totalGames}</span>
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-center">
                    <button
                        onClick={onPlay}
                        className="px-8 py-3 bg-primary text-onPrimary font-bold text-lg rounded-xl shadow-lg ui-pressable ui-focus-ring"
                    >
                        Try to beat this score
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
                                className={`bg-surface/50 border border-white/10 rounded-xl p-4 overflow-hidden relative ${item.status === 'lost' ? 'border-error/50 bg-error/5' : ''
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row gap-4 items-start">

                                    {/* Game Cover (Small) */}
                                    <div className="w-24 h-32 flex-shrink-0 bg-black rounded-lg overflow-hidden shadow-lg border border-white/10">
                                        {coverUrl ? (
                                            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-muted">No image</div>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-grow space-y-2 w-full">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-xl font-bold truncate pr-2">{index + 1}. {gameName}</h3>
                                            <div className={`text-sm font-bold px-2 py-1 rounded ${item.status === 'won' ? 'bg-success/20 text-success' :
                                                item.status === 'skipped' ? 'bg-warning/20 text-warning' :
                                                    'bg-error/20 text-error'
                                                }`}>
                                                +{item.score} pts
                                            </div>
                                        </div>

                                        {/* Guesses */}
                                        <div className="text-sm bg-black/30 p-2 rounded-lg">
                                            <div className="text-muted text-xs mb-1 uppercase tracking-wider font-semibold">Guesses ({item.guesses.length}/5)</div>
                                            <div className="flex flex-wrap gap-2">
                                                {item.guesses.map((g, i) => (
                                                    <div key={i} className={`px-2 py-0.5 rounded text-xs border ${g.result === 'correct' ? 'border-success/50 bg-success/10 text-success' :
                                                        g.result === 'skipped' ? 'border-white/15 bg-white/5 text-muted' :
                                                            g.result === 'similar-name' ? 'border-warning/50 bg-warning/10 text-warning' :
                                                                'border-error/50 bg-error/10 text-error line-through'
                                                        }`}>
                                                        {g.name}
                                                    </div>
                                                ))}
                                                {item.guesses.length === 0 && <span className="text-muted italic">No guesses made</span>}
                                            </div>
                                        </div>

                                        {/* Lifelines Used */}
                                        {item.lifelinesUsed && item.lifelinesUsed.length > 0 && (
                                            <div className="flex gap-2 items-center text-sm">
                                                <span className="text-muted text-xs uppercase tracking-wider font-semibold">Lifelines</span>
                                                <div className="flex gap-1">
                                                    {item.lifelinesUsed.map((type, i) => (
                                                        <div key={i} className="bg-surface p-1 rounded border border-white/10" title={LIFELINE_ICONS[type].label}>
                                                            <LifelineIcon type={type} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Screenshots Grid (Miniatures) */}
                                        <div className="w-full mt-4 bg-black/20 p-2 rounded-lg">
                                            <div className="text-muted text-xs mb-2 uppercase tracking-wider font-semibold">Screenshots</div>
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
                                                            <div key={screenIdx} className="aspect-video relative rounded-md overflow-hidden border border-white/10 bg-surface">
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
                                                                        const centerX = position.x; // Use the used position
                                                                        const centerY = position.y;

                                                                        const viewLeft = centerX - (visiblePortion / 2);
                                                                        const viewTop = centerY - (visiblePortion / 2);

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
                                                    <div className="col-span-5 text-center text-muted text-xs py-2">No screenshots available</div>
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
                        className="px-8 py-3 bg-primary text-onPrimary font-bold text-lg rounded-xl shadow-lg ui-pressable ui-focus-ring"
                    >
                        Start your own run
                    </button>
                </div>

            </div>
        </div>
    );
}
