import { useState, useEffect } from 'react';
import type { Game } from '../types';
import { clsx } from 'clsx';
import { ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
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

    const targetGame = games.find(g => g.id === targetId);
    if (!targetGame) return null;

    const selectedGame = games.find(g => g.id === selectedId);

    const handleSelect = (id: number) => {
        if (viewState !== 'selecting') return;
        if (selectedId === id) return;
        setSelectedId(id);
    };

    const handleFinalConfirm = () => {
        if (!selectedId) return;
        setViewState('processing');

        // 3 second delay for suspense
        setTimeout(() => {
            const isCorrect = selectedId === targetId;
            setViewState('result');

            // Trigger Confetti if correct
            if (isCorrect) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#FFA500', '#FFFFFF', '#00FF00'],
                    zIndex: 2000
                });
                // Second burst
                setTimeout(() => {
                    confetti({
                        particleCount: 80,
                        spread: 100,
                        origin: { y: 0.6 },
                        startVelocity: 45,
                        zIndex: 2000
                    });
                }, 300);
            }

        }, 3000);
    };

    const handleNextLevel = () => {
        if (selectedId) {
            onGuess(selectedId);
        }
    };

    // Handle "Next Level on Enter"
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && viewState === 'result' && settings.nextLevelOnEnter) {
                handleNextLevel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewState, settings.nextLevelOnEnter, selectedId]);

    const isCorrect = selectedId === targetId;

    return (
        <div className="relative w-full max-w-6xl mx-auto p-4 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">

            {/* Header / Instructions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 bg-black/40 p-3 rounded-xl backdrop-blur-md border border-white/10 shadow-lg w-full">
                <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 tracking-wider uppercase drop-shadow-sm mb-0">
                    BONUS ROUND
                </h2>
                <div className="hidden sm:block w-px h-8 bg-white/20"></div>
                <div className="text-base sm:text-lg text-gray-200 font-medium">
                    Select <span className="font-bold text-yellow-400 text-xl px-2 underline decoration-wavy decoration-yellow-500/50">{targetGame.name}</span>
                </div>
            </div>

            {/* Main Stage (Large Preview) */}
            <div className={clsx(
                "w-full aspect-video max-h-[50vh] rounded-xl overflow-hidden border-2 shadow-2xl relative flex items-center justify-center group transition-colors duration-500",
                viewState === 'result'
                    ? (isCorrect ? "border-green-500 ring-4 ring-green-500/30" : "border-red-500 ring-4 ring-red-500/30")
                    : "border-white/10 bg-black/60"
            )}>
                {selectedGame && selectedGame.screenshots?.[0] ? (
                    <>
                        <img
                            src={`/api/image-proxy?url=${encodeURIComponent(selectedGame.screenshots[0])}`}
                            alt="Selected Option"
                            className="w-full h-full object-contain animate-in fade-in duration-300"
                        />


                        {/* Selection Badge / Number */}
                        <div className="absolute bottom-4 left-4 bg-black/80 text-white px-4 py-2 rounded-lg font-bold text-xl border border-white/20 backdrop-blur-md shadow-lg">
                            Option #{games.findIndex(g => g.id === selectedId) + 1}
                        </div>

                        {/* Result Overlay Text */}
                        {viewState === 'result' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300">
                                <div className={clsx(
                                    "text-6xl font-black uppercase tracking-widest drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] border-4 border-white px-12 py-4 rounded-2xl transform rotate-[-5deg]",
                                    isCorrect ? "bg-green-600 text-white" : "bg-red-600 text-white"
                                )}>
                                    {isCorrect ? 'CORRECT!' : 'WRONG!'}
                                </div>
                            </div>
                        )}

                        {/* Top Left SELECT Button (Replaces Skip) */}
                        <div className="absolute top-4 left-4 z-30">
                            {viewState === 'selecting' && (
                                <button
                                    onClick={handleFinalConfirm}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:shadow-blue-500/50 transition-all hover:-translate-y-1 active:translate-y-0"
                                >
                                    SELECT
                                </button>
                            )}
                            {viewState === 'processing' && (
                                <button
                                    disabled
                                    className="bg-blue-600/50 text-white px-6 py-2 rounded-lg font-bold shadow-lg animate-pulse cursor-wait"
                                >
                                    SELECT
                                </button>
                            )}
                        </div>

                    </>
                ) : (
                    <div className="text-center space-y-4 p-8">
                        <div className="text-6xl animate-bounce">👆</div>
                        <p className="text-xl text-gray-400 font-medium">Select an image from below</p>
                    </div>
                )}
            </div>

            {/* Thumbnails Grid */}
            <div className="grid grid-cols-5 gap-2 sm:gap-4 w-full px-2">
                {games.map((game, idx) => {
                    const isSelected = selectedId === game.id;
                    return (
                        <div
                            key={game.id}
                            onClick={() => handleSelect(game.id)}
                            className={clsx(
                                "relative aspect-video cursor-pointer overflow-hidden rounded-lg border-2 transition-all duration-300 shadow-md bg-gray-900",
                                isSelected
                                    ? (viewState === 'selecting' || viewState === 'processing')
                                        ? "border-blue-500 scale-105 z-10 ring-2 ring-blue-500/50 grayscale-0"
                                        : (isCorrect && viewState === 'result' ? "border-green-500 ring-green-500" : "border-red-500 ring-red-500")
                                    : "border-white/10 hover:border-white/40 hover:scale-102 hover:grayscale-0 grayscale opacity-70 hover:opacity-100",
                                viewState !== 'selecting' && !isSelected && "opacity-30 grayscale"
                            )}
                        >
                            {/* Number Badge (Small) */}
                            <div className={clsx(
                                "absolute top-1 left-1 bg-black/80 text-white w-6 h-6 flex items-center justify-center rounded text-xs font-bold z-20 backdrop-blur-sm",
                                isSelected ? "bg-blue-600" : "bg-black/60"
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
                                <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-500">
                                    No Img
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom Action Area (Next Level) */}
            <div className="h-20 flex items-center justify-center w-full">
                {viewState === 'result' && (
                    <button
                        onClick={handleNextLevel}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-12 py-3 rounded-full font-bold text-xl shadow-xl hover:shadow-purple-500/50 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in"
                    >
                        Next Level <ArrowRight />
                    </button>
                )}
            </div>
        </div>
    );
}
