/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Game, EndlessState, LifelineType, ConsultantOption } from '../types';
import { generateAnagram } from '../utils/endlessUtils';

import { ShopModal } from './ShopModal';
import { SearchInput } from './SearchInput';
import { ScreenshotViewer } from './ScreenshotViewer';
import { InfoPanel } from './InfoPanel';
import { ConsultantOptions } from './ConsultantOptions';
import { Lifelines } from './Lifelines';
import type { ConsultantOptionsHandle } from '../types';
import { TopScoresTicker } from './TopScoresTicker';
import { AdminGameEditor } from './AdminGameEditor';
import { clsx } from 'clsx';
import { AlertCircle, X, ArrowRight, Flame } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

interface EndlessGameAreaProps {
    game: Game;
    allGames: Game[];
    state: EndlessState;
    onGuess: (game: Game, isFatal?: boolean) => void;
    onSkip: () => void;
    onNextLevel: () => void;
    onUseLifeline: (type: LifelineType) => void;
    onBuyShopItem: (itemId: string) => void;
    onRequestHighScore: () => void;
    isHighScoreModalOpen: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export function EndlessGameArea({
    game,
    allGames,
    state,
    onGuess,
    onSkip,
    onNextLevel,
    onUseLifeline,
    onBuyShopItem,
    onRequestHighScore,
    isHighScoreModalOpen
}: EndlessGameAreaProps) {
    const [showShop, setShowShop] = useState(false);
    const [anagramHint, setAnagramHint] = useState<string | null>(null);
    const [consultantOptions, setConsultantOptions] = useState<ConsultantOption[] | null>(null);
    const [doubleTroubleGame, setDoubleTroubleGame] = useState<Game | null>(null);
    const consultantRef = useRef<ConsultantOptionsHandle>(null);

    // Animation states
    const [animatingButton, setAnimatingButton] = useState<LifelineType | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [similarNameMessage, setSimilarNameMessage] = useState<boolean>(false);

    const [showFireEffect, setShowFireEffect] = useState(false);

    // Cover Peek State
    const [showCoverPeek, setShowCoverPeek] = useState(false);
    const [coverPeekTimeLeft, setCoverPeekTimeLeft] = useState(5);

    // Admin Mode State
    const [adminModalOpen, setAdminModalOpen] = useState(false);
    const [, setBackspaceCount] = useState(0);
    const [displayGameName, setDisplayGameName] = useState(game.name);

    useEffect(() => {
        setDisplayGameName(game.name);
    }, [game.name]);

    // Admin Access Listener
    useEffect(() => {
        if (state.status === 'playing') {
            setBackspaceCount(0);
            return;
        }

        const handleKeyDown = async (e: KeyboardEvent) => {
            if (e.key === 'Backspace') {
                setBackspaceCount(prev => {
                    const newCount = prev + 1;
                    if (newCount === 5) {
                        // Verify admin key before opening
                        if (!settings.adminKey) {
                            console.log('No admin key configured');
                            return 0;
                        }

                        fetch('/api/admin/verify', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-admin-key': settings.adminKey
                            }
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.success) {
                                    setAdminModalOpen(true);
                                } else {
                                    console.log('Invalid admin key');
                                }
                            })
                            .catch(err => console.error('Admin verification failed', err));

                        return 0;
                    }
                    return newCount;
                });
            } else {
                setBackspaceCount(0);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.status]);

    // Handle Fire Effect Pulse
    useEffect(() => {
        if (state.isHotStreakActive) {
            setShowFireEffect(true);
            const timer = setTimeout(() => setShowFireEffect(false), 2100);
            return () => clearTimeout(timer);
        } else {
            setShowFireEffect(false);
        }
    }, [state.isHotStreakActive]);

    // Handle Cover Peek Timer
    useEffect(() => {
        if (showCoverPeek && coverPeekTimeLeft > 0) {
            const timer = setInterval(() => {
                setCoverPeekTimeLeft(prev => {
                    if (prev <= 0.1) {
                        setShowCoverPeek(false);
                        return 5;
                    }
                    return prev - 0.1;
                });
            }, 100);
            return () => clearInterval(timer);
        }
    }, [showCoverPeek, coverPeekTimeLeft]);

    // Detect similar name guess
    // eslint-disable-next-line
    useEffect(() => {
        if (state.guesses.length > 0) {
            const lastGuess = state.guesses[state.guesses.length - 1];
            if (lastGuess.result === 'similar-name') {
                setSimilarNameMessage(true);
                setTimeout(() => setSimilarNameMessage(false), 2000);
            }
        }
    }, [state.guesses]);

    // Use persisted crop positions from state
    const cropPositions = state.cropPositions;

    // Show shop every 10 levels
    useEffect(() => {
        if (state.streak > 0 && state.streak % 5 === 0 && state.status === 'playing' && state.guesses.length === 0) {
            setShowShop(true);
        }
    }, [state.streak, state.status, state.guesses.length]);

    const handleUseLifeline = (type: LifelineType) => {
        setAnimatingButton(type);
        setTimeout(() => setAnimatingButton(null), 500); // Reset animation state

        if (type === 'cover_peek') {
            setShowCoverPeek(true);
            setCoverPeekTimeLeft(5);
        } else if (type === 'anagram') {
            setAnagramHint(generateAnagram(game.name));
        } else if (type === 'consultant') {
            // Play sound
            const audio = new Audio('/sounds/let-s-play.mp3');
            audio.volume = 0.1;
            audio.play().catch(() => console.log('Could not play sound'));

            // Create the correct answer option
            const correctOption: ConsultantOption = game;

            // Pick 3 random real games from the database (not the current game)
            // We use 3 wrong options + 1 correct option = 4 total
            const otherRealGames = allGames
                .filter(g => g.id !== game.id)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);

            const wrongOptions: ConsultantOption[] = otherRealGames;
            const options = [correctOption, ...wrongOptions].sort(() => 0.5 - Math.random());
            setConsultantOptions(options);
        } else if (type === 'double_trouble') {
            // Pick a random game that is NOT the current game
            const otherGames = allGames.filter(g => g.id !== game.id);
            const randomGame = otherGames[Math.floor(Math.random() * otherGames.length)];
            setDoubleTroubleGame(randomGame);
        }
        onUseLifeline(type);
    };

    const handleSearchInputGuess = (name: string) => {
        const guessedGame = allGames.find(g => g.name === name);
        if (guessedGame) {
            // Check if already guessed (won) in history
            const alreadyWon = state.history.some(h => h.gameId === guessedGame.id && h.status === 'won');
            if (alreadyWon) {
                setErrorMessage(`Already guessed: ${guessedGame.name}`);
                setTimeout(() => setErrorMessage(null), 3000);
                return;
            }

            // Check if it matches EITHER the main game OR the double trouble game
            if (doubleTroubleGame && guessedGame.id === doubleTroubleGame.id) {
                // If they guessed the double trouble game, we treat it as a win!
                // We pass the MAIN game to onGuess so the system registers it as a win for the current level
                onGuess(game);
            } else {
                onGuess(guessedGame);
            }
        } else {
            // If not found in allGames, it might be a partial match or typo, but we don't have bait games anymore.
            // Just treat it as a wrong guess with a placeholder if needed, or better yet, SearchInput shouldn't allow selecting it if it's not in the list.
            // But SearchInput allows free text? If so, we create a dummy game.
            const dummyGame: Game = {
                id: -1,
                name: name,
                year: 0,
                platform: '',
                genre: '',
                rating: 0,
                screenshots: [],
                cover: null,
                cropPositions: []
            };
            onGuess(dummyGame);
        }
    };

    // Reset local state on new level
    useEffect(() => {
        setAnagramHint(null);
        setConsultantOptions(null);
        setDoubleTroubleGame(null);
        setShowCoverPeek(false);
        setCoverPeekTimeLeft(5);
    }, [game.id]);

    const { settings, isSettingsOpen } = useSettings();

    // Handle Enter key for Next Level / Try Again
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Disable all keyboard shortcuts when Cover Peek is active
            if (showCoverPeek) return;

            if (adminModalOpen || isSettingsOpen) return;

            // Next Level on Enter
            if (state.status !== 'playing' && e.key === 'Enter') {
                // If high score modal is open, do nothing (let the modal handle Enter for form submission)
                if (isHighScoreModalOpen) return;

                if (settings.nextLevelOnEnter) {
                    e.preventDefault();
                    consultantRef.current?.stopSounds();
                    if (state.isGameOver) {
                        onRequestHighScore();
                    } else {
                        onNextLevel();
                    }
                }
            }

            // Skip on Esc
            if (state.status === 'playing' && e.key === 'Escape') {
                if (settings.skipOnEsc) {
                    e.preventDefault();
                    onSkip();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.status, state.isGameOver, onNextLevel, onRequestHighScore, onSkip, settings, isHighScoreModalOpen, showCoverPeek, adminModalOpen, isSettingsOpen]);

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (showShop) {
        return (
            <ShopModal
                score={state.score}
                onBuy={onBuyShopItem}
                onContinue={() => setShowShop(false)}
            />
        );
    }



    const revealedCount = state.status === 'playing' ? state.guesses.length + 1 : 5;

    return (
        <div className="max-w-6xl mx-auto pb-8 px-4">
            <AdminGameEditor
                isOpen={adminModalOpen}
                onClose={() => setAdminModalOpen(false)}
                game={game}
                onUpdate={(newName) => {
                    setDisplayGameName(newName);
                    // We don't mutate game.name directly here as it's a prop
                    // The parent component or global state should handle the update if needed
                    // But for display purposes in this component, setDisplayGameName is sufficient
                }}
                onDelete={() => {
                    onSkip();
                }}
            />
            <div className="flex flex-col lg:flex-row gap-4 items-start">
                {/* Left Column: Game Area */}
                <div className="flex-1 w-full space-y-4 min-w-0">
                    {/* Screenshot Viewer */}
                    <div className={clsx(
                        "relative rounded-xl transition-all duration-500",
                        showFireEffect && state.guesses.length < 2 && "animate-pulse-fire border-2 border-orange-500/50"
                    )}>
                        <ScreenshotViewer
                            screenshots={game.screenshots}
                            revealedCount={revealedCount}
                            status={state.status}
                            cropPositions={cropPositions}
                            doubleTroubleGame={doubleTroubleGame || undefined}
                            currentLevelIndex={state.currentLevelIndex}
                            zoomOutActive={state.zoomOutActive}
                        />

                        {state.status === 'playing' && (
                            <button
                                onClick={onSkip}
                                className="absolute top-4 left-4 bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg backdrop-blur-sm transition-all hover:scale-105 z-20 active:animate-lifeline-slide"
                            >
                                SKIP
                            </button>
                        )}

                        {/* Anagram Hint Overlay */}
                        {anagramHint && state.status === 'playing' && (
                            <div className="absolute top-4 left-28 right-4 flex justify-start pointer-events-none z-20">
                                <div className="bg-black/30 text-yellow-300 px-4 py-2 rounded-xl text-base font-mono tracking-wider border border-yellow-500/30 shadow-lg backdrop-blur-sm animate-lifeline-shake break-words whitespace-normal leading-tight text-left">
                                    {anagramHint}
                                </div>
                            </div>
                        )}

                        {/* Similar Name Popup */}
                        {similarNameMessage && (
                            <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none z-50">
                                <div className="bg-yellow-500 text-black px-4 py-2 rounded-full shadow-lg font-bold animate-in fade-in slide-in-from-bottom-2 border border-yellow-400 flex items-center gap-2">
                                    <AlertCircle size={18} />
                                    <span>Similar Name!</span>
                                </div>
                            </div>
                        )}

                        {/* Cover Peek Overlay */}
                        {showCoverPeek && game.cover && state.status === 'playing' && (
                            <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-sm rounded-xl overflow-hidden animate-in fade-in duration-300 flex items-center justify-center">
                                {/* Blurred Cover Art */}
                                <img
                                    src={game.cover}
                                    alt="Cover art"
                                    className="h-full w-auto object-contain"
                                    style={{
                                        filter: 'blur(9px)',
                                        transform: 'scale(1.1)'
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Cover Peek Timer Bar - Below Screenshot Viewer */}
                    {showCoverPeek && state.status === 'playing' && (
                        <div className="w-full max-w-md mx-auto animate-in fade-in duration-300">
                            <div className="bg-black/60 rounded-full p-1 backdrop-blur-sm border border-white/10">
                                <div
                                    className="h-3 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full transition-all duration-100 ease-linear"
                                    style={{ width: `${(coverPeekTimeLeft / 5) * 100}%` }}
                                />
                            </div>
                            <div className="text-center text-white font-bold mt-2 text-sm">
                                {coverPeekTimeLeft.toFixed(1)}s remaining
                            </div>
                        </div>
                    )}

                    {/* Game Over / Win Message */}
                    {state.status !== 'playing' && (
                        <div className={clsx(
                            "p-4 rounded-xl border text-center animate-in zoom-in duration-300",
                            state.status === 'won' ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
                        )}>
                            <h2 className={clsx(
                                "text-2xl font-bold mb-2",
                                state.status === 'won' ? "text-green-400" : "text-red-500"
                            )}>
                                {state.status === 'won' ? "LEVEL CLEARED" : "GAME OVER"}
                            </h2>
                            <p className="text-base text-white mb-4">
                                {doubleTroubleGame ? (
                                    <>The games were <span className="font-bold">{displayGameName}</span> / <span className="font-bold">{doubleTroubleGame.name}</span></>
                                ) : (
                                    <>The game was <span className="font-bold">{displayGameName}</span></>
                                )}
                            </p>
                            <button
                                onClick={() => {
                                    consultantRef.current?.stopSounds();
                                    if (state.isGameOver) {
                                        onRequestHighScore();
                                    } else {
                                        onNextLevel();
                                    }
                                }}
                                className="inline-flex items-center gap-2 px-5 py-2 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform text-sm"
                            >
                                {state.isGameOver ? 'Try Again' : 'Next Level'} <ArrowRight size={20} />
                            </button>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className={clsx("transition-opacity duration-500 relative z-30", state.status !== 'playing' && "opacity-50 pointer-events-none")}>
                        {errorMessage && (
                            <div className="absolute -top-12 left-0 right-0 flex justify-center pointer-events-none z-50">
                                <div className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg font-bold animate-in fade-in slide-in-from-bottom-2 border border-red-400">
                                    {errorMessage}
                                </div>
                            </div>
                        )}
                        {consultantOptions ? (
                            <ConsultantOptions
                                ref={consultantRef}
                                options={consultantOptions}
                                correctGameId={game.id}
                                onGuess={(guessedGame) => {
                                    if (guessedGame.id === game.id) {
                                        onGuess(guessedGame);
                                    } else {
                                        // Wrong guess via Consultant = Instant Game Over
                                        onGuess(guessedGame, true);
                                    }
                                }}
                            />
                        ) : (
                            <SearchInput
                                games={allGames}
                                onGuess={handleSearchInputGuess}
                                disabled={state.status !== 'playing'}
                                autoFocus={true}
                                correctAnswers={doubleTroubleGame ? [game.name, doubleTroubleGame.name] : [game.name]}
                                hideResults={showCoverPeek}
                            />
                        )}
                    </div>

                    {/* Previous Guesses */}
                    {state.guesses.filter(guess => guess.result !== 'correct').length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Previous Guesses</h3>
                            <div className="space-y-2">
                                {state.guesses
                                    .filter(guess => guess.result !== 'correct')
                                    .slice() // Create a copy before reversing
                                    .reverse()
                                    .map((guess, idx, arr) => {
                                        const originalIdx = arr.length - 1 - idx;
                                        const isSimilar = guess.result === 'similar-name';
                                        const isSkipped = guess.result === 'skipped';

                                        const colorClass = isSimilar
                                            ? 'text-warning'
                                            : 'text-error';

                                        const label = isSimilar
                                            ? 'Similar Name'
                                            : isSkipped
                                                ? `SKIPPED ${originalIdx + 1}`
                                                : 'Wrong';

                                        const icon = isSimilar
                                            ? <AlertCircle size={16} />
                                            : <X size={16} />;

                                        const borderClass = isSimilar
                                            ? 'border-warning'
                                            : 'border-white/5';

                                        return (
                                            <div
                                                key={idx}
                                                className={`flex items-center justify-between p-2.5 rounded-lg bg-gray-800/30 border ${borderClass} text-gray-300 animate-in slide-in-from-bottom-2 fade-in text-sm`}
                                                style={{ animationDelay: `${idx * 100}ms` }}
                                            >
                                                <span className="font-medium text-white">{guess.name}</span>
                                                <div className={`flex items-center gap-2 ${colorClass}`}>
                                                    <span className="text-[10px] uppercase font-bold">{label}</span>
                                                    {icon}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Sidebar (HUD + Info + Lifelines) */}
                <div className="lg:w-72 w-full flex-shrink-0 flex flex-col gap-3">
                    {/* Top Scores Ticker */}
                    <TopScoresTicker />

                    {/* HUD Card */}
                    <div className="bg-gray-800/50 p-4 rounded-xl backdrop-blur-sm border border-gray-700 shadow-lg">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Score</span>
                                <span className={clsx(
                                    "text-xl font-bold transition-all duration-300",
                                    state.score >= state.highScore && state.score > 0
                                        ? "text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 animate-flame-flicker"
                                        : "text-yellow-400"
                                )}>
                                    {state.score >= state.highScore && state.score > 0 && "🔥 "}{state.score}{state.score >= state.highScore && state.score > 0 && " "}
                                </span>
                            </div>
                            <div className="flex flex-col border-x border-white/5">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Streak</span>
                                <span className="text-xl font-black text-white">{state.streak}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Best</span>
                                <span className="text-xl font-bold text-gray-300">{state.highScore}</span>
                            </div>
                        </div>
                    </div>

                    {/* Hot Streak Indicator */}
                    {state.isHotStreakActive && state.guesses.length < 2 && (
                        <div className="bg-gradient-to-r from-red-600 to-orange-500 p-0.5 rounded-xl shadow-lg animate-in slide-in-from-right fade-in duration-500">
                            <div className="bg-gray-900/90 backdrop-blur-sm rounded-[10px] p-3 flex items-center justify-center gap-3">
                                <Flame className="text-orange-500 animate-pulse" size={24} fill="currentColor" />
                                <div className="flex flex-col">
                                    <span className="text-orange-500 font-black text-lg tracking-wider leading-none">HOT STREAK</span>
                                    <span className="text-orange-300/80 text-[10px] font-bold uppercase tracking-widest">2x Score Multiplier Active!</span>
                                </div>
                                <Flame className="text-orange-500 animate-pulse" size={24} fill="currentColor" />
                            </div>
                        </div>
                    )}

                    {/* Info Panel */}
                    <InfoPanel game={{ ...game, name: displayGameName }} guessesMade={state.guesses.length} status={state.status} />

                    {/* Lifelines - Rendered via Portal to Sidebar */}
                    {mounted && document.getElementById('sidebar-lifelines-portal') && createPortal(
                        <Lifelines
                            state={state}
                            game={game}
                            onUseLifeline={handleUseLifeline}
                            animatingButton={animatingButton}
                            doubleTroubleGame={doubleTroubleGame}
                            consultantOptions={consultantOptions}
                        />,
                        document.getElementById('sidebar-lifelines-portal')!
                    )}
                </div>
            </div >
        </div >
    );
};
