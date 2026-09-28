import { useState, useEffect, useRef, useCallback } from 'react';
import type { Game } from '../types';
import { clsx } from 'clsx';
import { ArrowRight, MousePointerClick } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

interface BonusRoundProps {
    games: Game[];
    targetId: number;
    onGuess: (gameId: number) => void;
}

export function BonusRound({ games, targetId, onGuess }: BonusRoundProps) {
    const { settings } = useSettings();
    const [selectedId, setSelectedId] = useState<number | null>(games[0]?.id || null);
    const [viewState, setViewState] = useState<'selecting' | 'processing' | 'result'>('selecting');
    const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const targetGame = games.find(g => g.id === targetId);
    const selectedGame = games.find(g => g.id === selectedId);
    const isCorrect = selectedId === targetId;

    const clearTimers = useCallback(() => {
        if (resolveTimerRef.current) {
            clearTimeout(resolveTimerRef.current);
            resolveTimerRef.current = null;
        }
        if (confettiTimerRef.current) {
            clearTimeout(confettiTimerRef.current);
            confettiTimerRef.current = null;
        }
    }, []);

    const handleSelect = (id: number) => {
        if (viewState !== 'selecting') return;
        if (selectedId === id) return;
        setSelectedId(id);
    };

    const handleFinalConfirm = () => {
        if (!selectedId) return;
        setViewState('processing');
        clearTimers();

        // 3 second delay for suspense
        resolveTimerRef.current = setTimeout(() => {
            const isCorrect = selectedId === targetId;
            setViewState('result');

            // Trigger Confetti if correct
            if (isCorrect) {
                import('canvas-confetti').then(({ default: confetti }) => {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#FFD700', '#FFA500', '#FFFFFF', '#00FF00'],
                        zIndex: 2000
                    });
                    // Second burst
                    confettiTimerRef.current = setTimeout(() => {
                        confetti({
                            particleCount: 80,
                            spread: 100,
                            origin: { y: 0.6 },
                            startVelocity: 45,
                            zIndex: 2000
                        });
                    }, 300);
                });
            }

        }, 3000);
    };

    const handleNextLevel = useCallback(() => {
        if (selectedId) {
            onGuess(selectedId);
        }
    }, [onGuess, selectedId]);

    // Handle "Next Level on Enter"
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && viewState === 'result' && settings.nextLevelOnEnter) {
                handleNextLevel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNextLevel, settings.nextLevelOnEnter, viewState]);

    useEffect(() => clearTimers, [clearTimers]);

    if (!targetGame) return null;

    return (
        <div className="relative w-full max-w-6xl mx-auto p-4 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">

            {/* Header / Instructions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 glass-panel-soft p-3 rounded-xl w-full">
                <h2 className="text-xl sm:text-2xl font-bold text-accent tracking-wider uppercase mb-0">
                    Bonus round
                </h2>
                <div className="hidden sm:block w-px h-8 bg-white/20"></div>
                <div className="text-base sm:text-lg text-text font-medium">
                    Find <span className="font-bold text-warning text-xl px-1">{targetGame.name}</span>
                </div>
            </div>

            {/* Main Stage (Large Preview) */}
            <div className={clsx(
                "w-full aspect-video max-h-[50vh] rounded-xl overflow-hidden border-2 shadow-2xl relative flex items-center justify-center group transition-colors duration-500",
                viewState === 'result'
                    ? (isCorrect ? "border-success ring-4 ring-success/30" : "border-error ring-4 ring-error/30")
                    : "border-white/10 bg-black/60"
            )}>
                {selectedGame && selectedGame.screenshots?.[0] ? (
                    <>
                        <img
                            src={`/api/image-proxy?url=${encodeURIComponent(selectedGame.screenshots[0])}`}
                            alt={`Option ${games.findIndex(g => g.id === selectedId) + 1}`}
                            className="w-full h-full object-contain animate-in fade-in duration-300"
                        />


                        {/* Selection Badge / Number */}
                        <div className="absolute bottom-4 left-4 bg-black/80 text-white px-4 py-2 rounded-lg font-bold text-lg border border-white/20 shadow-lg tabular-nums">
                            Option #{games.findIndex(g => g.id === selectedId) + 1}
                        </div>

                        {/* Result Overlay Text */}
                        {viewState === 'result' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300">
                                <div className={clsx(
                                    "font-display text-4xl sm:text-6xl font-bold uppercase tracking-widest shadow-2xl border-4 border-white px-8 sm:px-12 py-3 sm:py-4 rounded-2xl -rotate-3 animate-in zoom-in duration-300",
                                    isCorrect ? "bg-success text-black" : "bg-error text-white"
                                )}>
                                    {isCorrect ? 'Correct' : 'Wrong'}
                                </div>
                            </div>
                        )}

                        {/* Top Left SELECT Button (Replaces Skip) */}
                        <div className="absolute top-4 left-4 z-30">
                            {viewState === 'selecting' && (
                                <button
                                    onClick={handleFinalConfirm}
                                    className="bg-primary text-onPrimary px-6 py-2 rounded-lg font-bold uppercase tracking-wider shadow-lg ui-pressable ui-focus-ring"
                                >
                                    Select
                                </button>
                            )}
                            {viewState === 'processing' && (
                                <button
                                    disabled
                                    className="bg-primary/50 text-onPrimary px-6 py-2 rounded-lg font-bold uppercase tracking-wider shadow-lg animate-pulse cursor-wait"
                                >
                                    Select
                                </button>
                            )}
                        </div>

                    </>
                ) : (
                    <div className="text-center space-y-4 p-8">
                        <MousePointerClick size={48} className="mx-auto text-muted" aria-hidden="true" />
                        <p className="text-xl text-muted font-medium">Pick a screenshot below</p>
                    </div>
                )}
            </div>

            {/* Thumbnails Grid */}
            <div className="grid grid-cols-5 gap-2 sm:gap-4 w-full px-2">
                {games.map((game, idx) => {
                    const isSelected = selectedId === game.id;
                    return (
                        <button
                            type="button"
                            key={game.id}
                            onClick={() => handleSelect(game.id)}
                            aria-label={`Option ${idx + 1}`}
                            aria-pressed={isSelected}
                            className={clsx(
                                "ui-focus-ring relative aspect-video cursor-pointer overflow-hidden rounded-lg border-2 transition-all duration-300 shadow-md bg-surface/60",
                                isSelected
                                    ? (viewState === 'selecting' || viewState === 'processing')
                                        ? "border-primary scale-105 z-10 ring-2 ring-primary/50 grayscale-0"
                                        : (isCorrect && viewState === 'result' ? "border-success ring-success" : "border-error ring-error")
                                    : "border-white/10 hover:border-white/40 hover:grayscale-0 grayscale opacity-70 hover:opacity-100",
                                viewState !== 'selecting' && !isSelected && "opacity-30 grayscale"
                            )}
                        >
                            {/* Number Badge (Small) */}
                            <div className={clsx(
                                "absolute top-1 left-1 bg-black/80 text-white w-6 h-6 flex items-center justify-center rounded text-xs font-bold z-20 backdrop-blur-sm",
                                isSelected ? "bg-primary" : "bg-black/60"
                            )}>
                                #{idx + 1}
                            </div>

                            {game.screenshots?.[0] ? (
                                <img
                                    src={`/api/image-proxy?url=${encodeURIComponent(game.screenshots[0].replace('t_1080p', 't_thumb'))}`}
                                    alt={`Thumbnail ${idx + 1}`}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-[10px] text-muted">
                                    No image
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Bottom Action Area (Next Level) */}
            <div className="h-20 flex items-center justify-center w-full">
                {viewState === 'result' && (
                    <button
                        onClick={handleNextLevel}
                        className="bg-primary text-onPrimary px-10 py-3 rounded-full font-bold text-lg shadow-xl ui-pressable ui-focus-ring flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in"
                    >
                        Next level <ArrowRight size={20} />
                    </button>
                )}
            </div>
        </div>
    );
}
