import { useState } from 'react';
import { InfoPanel } from './InfoPanel';
import { SearchInput } from './SearchInput';
import { ScreenshotViewer } from './ScreenshotViewer';
import type { Game, GameStatus, GuessWithResult, LevelProgress } from '../types';
import { clsx } from 'clsx';
import { X, ArrowRight, AlertCircle } from 'lucide-react';

interface GameAreaProps {
    game: Game;
    allGames: Game[];
    guesses: GuessWithResult[];
    status: GameStatus;
    allProgress: Record<number, LevelProgress>;
    onGuess: (name: string) => void;
    onSkip: () => void;
    onNextLevel: () => void;
}

export function GameArea({ game, allGames, guesses, status, allProgress, onGuess, onSkip, onNextLevel }: GameAreaProps) {
    const revealedCount = status === 'playing' ? guesses.length + 1 : 5;
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleGuess = (name: string) => {
        const guessedGame = allGames.find(g => g.name === name);
        if (guessedGame) {
            // Check if this game was already WON in any level
            const alreadyWon = Object.values(allProgress).some(level =>
                level.status === 'won' &&
                level.guesses.some(g => g.result === 'correct' && g.name === guessedGame.name)
            );

            if (alreadyWon) {
                setErrorMessage(`Already guessed: ${guessedGame.name}`);
                setTimeout(() => setErrorMessage(null), 3000);
                return;
            }
        }
        // Always call onGuess, even if it's a bait game (not found in allGames)
        // The hook will handle it as a wrong guess
        onGuess(name);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-2 pb-8">
            {/* Main Layout: Image + Metadata Side by Side */}
            <div className="flex flex-col lg:flex-row gap-3">
                {/* Left: Screenshot Viewer */}
                <div className="flex-1 space-y-2">
                    <div className="relative">
                        <ScreenshotViewer
                            screenshots={game.screenshots}
                            revealedCount={revealedCount}
                            status={status}
                            cropPositions={game.cropPositions}
                        />
                        {status === 'playing' && (
                            <button
                                onClick={onSkip}
                                className="absolute top-4 left-4 z-20 bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg backdrop-blur-sm transition-all hover:scale-105 text-sm active:animate-lifeline-slide"
                            >
                                SKIP
                            </button>
                        )}
                    </div>
                </div>

                {/* Right: Metadata Cards */}
                <div className="lg:w-40 flex-shrink-0">
                    <InfoPanel game={game} guessesMade={guesses.length} status={status} />
                </div>
            </div>

            {/* Game Over / Win Message */}
            {status !== 'playing' && (
                <div className={clsx(
                    "p-4 rounded-xl border text-center animate-in zoom-in duration-300",
                    status === 'won' ? "bg-success/10 border-success/20" : "bg-error/10 border-error/20"
                )}>
                    <h2 className={clsx(
                        "text-2xl font-bold mb-2",
                        status === 'won' ? "text-success" : "text-error"
                    )}>
                        {status === 'won' ? "You Got It!" : "Game Over"}
                    </h2>
                    <p className="text-base text-white mb-4">
                        The game was <span className="font-bold">{game.name}</span>
                    </p>
                    <button
                        onClick={onNextLevel}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform text-sm"
                    >
                        Next Level <ArrowRight size={20} />
                    </button>
                </div>
            )}

            {/* Search Input */}
            <div className={clsx("transition-opacity duration-500 relative z-30", status !== 'playing' && "opacity-50 pointer-events-none")}>
                {errorMessage && (
                    <div className="absolute -top-12 left-0 right-0 flex justify-center pointer-events-none z-50">
                        <div className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg font-bold animate-in fade-in slide-in-from-bottom-2 border border-red-400">
                            {errorMessage}
                        </div>
                    </div>
                )}
                <SearchInput
                    games={allGames}
                    onGuess={handleGuess}
                    disabled={status !== 'playing'}
                />
            </div>

            {/* Previous Guesses */}
            {guesses.filter(guess => guess.result !== 'correct').length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Previous Guesses</h3>
                    <div className="space-y-2">
                        {guesses
                            .filter(guess => guess.result !== 'correct')
                            .map((guess, idx) => {
                                const colorClass = guess.result === 'same-series'
                                    ? 'text-warning'
                                    : guess.result === 'skipped'
                                        ? 'text-error'
                                        : 'text-error';
                                const label = guess.result === 'same-series'
                                    ? 'Same Series'
                                    : guess.result === 'skipped'
                                        ? `SKIPPED ${idx + 1}`
                                        : 'Wrong';
                                const icon = guess.result === 'same-series'
                                    ? <AlertCircle size={18} />
                                    : <X size={18} />;

                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-2 rounded-lg bg-surface/50 border border-white/5 text-muted animate-in slide-in-from-bottom-2 fade-in text-sm"
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        <span className="font-medium">{guess.name}</span>
                                        <div className={`flex items-center gap-2 ${colorClass}`}>
                                            <span className="text-xs uppercase font-bold">{label}</span>
                                            {icon}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    );
}
