/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useRef } from 'react';
import type { Game, EndlessState, LifelineType, ConsultantOption } from '../types';
import { generateAnagram } from '../utils/endlessUtils';
import baitGamesData from '../data/bait_games.json';
import { ShopModal } from './ShopModal';
import { SearchInput } from './SearchInput';
import { ScreenshotViewer } from './ScreenshotViewer';
import { InfoPanel } from './InfoPanel';
import { ConsultantOptions } from './ConsultantOptions';
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
    onGuess: (game: Game) => void;
    onSkip: () => void;
    onNextLevel: () => void;
    onUseLifeline: (type: LifelineType) => void;
    onBuyShopItem: (itemId: string) => void;
    onRequestHighScore: () => void;
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
    onRequestHighScore
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
        if (state.streak > 0 && state.streak % 10 === 0 && state.status === 'playing' && state.guesses.length === 0) {
            setShowShop(true);
        }
    }, [state.streak, state.status, state.guesses.length]);

    const handleUseLifeline = (type: LifelineType) => {
        setAnimatingButton(type);
        setTimeout(() => setAnimatingButton(null), 500); // Reset animation state

        if (type === 'anagram') {
            setAnagramHint(generateAnagram(game.name));
        } else if (type === 'consultant') {
            // Play sound
            const audio = new Audio('/sounds/let-s-play.mp3');
            audio.volume = 0.2;
            audio.play().catch(() => console.log('Could not play sound'));

            // Create the correct answer option
            const correctOption: ConsultantOption = game;

            // Pick 1-2 random real games from the database (not the current game)
            const otherRealGames = allGames
                .filter(g => g.id !== game.id)
                .sort(() => 0.5 - Math.random())
                .slice(0, 2);

            // Pick 1-2 random bait games to fill remaining slots (need 3 total wrong options)
            const neededBaitCount = 3 - otherRealGames.length;
            const shuffledBaitGames = [...baitGamesData.baitGames]
                .sort(() => 0.5 - Math.random())
                .slice(0, neededBaitCount)
                .map((name, index) => ({
                    id: `bait_${index}`,
                    name,
                    isBait: true as const
                }));

            // Mix them together and shuffle
            const wrongOptions: ConsultantOption[] = [...otherRealGames, ...shuffledBaitGames];
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
            // It's a bait game - create a fake Game object just for this wrong guess
            // We need a Game object because submitGuess expects one
            const baitGame: Game = {
                id: -1, // Negative ID to ensure it never matches the current game
                name: name,
                year: 0,
                platform: '',
                genre: '',
                rating: 0,
                screenshots: [],
                cover: null,
                cropPositions: []
            };
            onGuess(baitGame);
        }
    };

    // Reset local state on new level
    useEffect(() => {
        setAnagramHint(null);
        setConsultantOptions(null);
        setDoubleTroubleGame(null);
    }, [game.id]);

    const { settings } = useSettings();

    // Handle Enter key for Next Level / Try Again
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Next Level on Enter
            if (state.status !== 'playing' && e.key === 'Enter') {
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
    }, [state.status, state.isGameOver, onNextLevel, onRequestHighScore, onSkip, settings]);

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
                            <div className="absolute top-4 left-0 right-0 text-center pointer-events-none z-20">
                                <span className="bg-black/70 text-yellow-300 px-4 py-2 rounded-full text-lg font-mono tracking-widest border border-yellow-500/30 shadow-lg backdrop-blur-sm animate-lifeline-shake">
                                    {anagramHint}
                                </span>
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
                    </div>

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
                                onGuess={onGuess}
                            />
                        ) : (
                            <SearchInput
                                games={allGames}
                                onGuess={handleSearchInputGuess}
                                disabled={state.status !== 'playing'}
                                autoFocus={true}
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
                                        const colorClass = guess.result === 'similar-name'
                                            ? 'text-yellow-500'
                                            : 'text-red-500';
                                        const label = guess.result === 'similar-name'
                                            ? 'Similar Name'
                                            : guess.result === 'skipped'
                                                ? `SKIPPED ${originalIdx + 1}`
                                                : 'Wrong';
                                        const icon = guess.result === 'similar-name'
                                            ? <AlertCircle size={16} />
                                            : <X size={16} />;
                                        const borderClass = guess.result === 'similar-name'
                                            ? 'border-yellow-500'
                                            : 'border-white/5';

                                        return (
                                            <div
                                                key={idx}
                                                className={`flex items-center justify-between p-2.5 rounded-lg bg-gray-800/30 border ${borderClass} text-gray-300 animate-in slide-in-from-bottom-2 fade-in text-sm`}
                                                style={{ animationDelay: `${idx * 100}ms` }}
                                            >
                                                <span className="font-medium">{guess.name}</span>
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

                    {/* Lifelines */}
                    <div className="space-y-2 mt-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Lifelines</h3>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                onClick={() => handleUseLifeline('skip')}
                                disabled={state.lifelines.skip <= 0 || state.status !== 'playing'}
                                className={clsx(
                                    "w-full py-3 px-4 rounded-lg font-bold transition-all border flex items-center justify-between group",
                                    state.lifelines.skip > 0 && state.status === 'playing'
                                        ? 'bg-gray-800 border-red-500/30 text-red-400 hover:bg-gray-750 hover:border-red-500/50'
                                        : 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed',
                                    animatingButton === 'skip' && 'animate-lifeline-slide'
                                )}
                            >
                                <span className="text-sm">Skip Level</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${state.lifelines.skip > 0 ? 'bg-red-500/20 text-red-300' : 'bg-gray-800 text-gray-600'}`}>
                                    {state.lifelines.skip}
                                </span>
                            </button>

                            <button
                                onClick={() => handleUseLifeline('anagram')}
                                disabled={state.lifelines.anagram <= 0 || state.status !== 'playing' || !!doubleTroubleGame}
                                className={clsx(
                                    "w-full py-3 px-4 rounded-lg font-bold transition-all border flex items-center justify-between group",
                                    state.lifelines.anagram > 0 && state.status === 'playing' && !doubleTroubleGame
                                        ? 'bg-gray-800 border-blue-500/30 text-blue-400 hover:bg-gray-750 hover:border-blue-500/50'
                                        : 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed',
                                    animatingButton === 'anagram' && 'animate-lifeline-shake'
                                )}
                            >
                                <span className="text-sm">Anagram</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${state.lifelines.anagram > 0 ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-800 text-gray-600'}`}>
                                    {state.lifelines.anagram}
                                </span>
                            </button>

                            <button
                                onClick={() => handleUseLifeline('consultant')}
                                disabled={state.lifelines.consultant <= 0 || state.status !== 'playing' || !!doubleTroubleGame}
                                className={clsx(
                                    "w-full py-3 px-4 rounded-lg font-bold transition-all border flex items-center justify-between group",
                                    state.lifelines.consultant > 0 && state.status === 'playing' && !doubleTroubleGame
                                        ? 'bg-gray-800 border-slate-500/30 text-slate-400 hover:bg-gray-750 hover:border-slate-500/50'
                                        : 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed',
                                    animatingButton === 'consultant' && 'animate-lifeline-pop'
                                )}
                            >
                                <span className="text-sm">Consultant</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${state.lifelines.consultant > 0 ? 'bg-slate-500/20 text-slate-300' : 'bg-gray-800 text-gray-600'}`}>
                                    {state.lifelines.consultant}
                                </span>
                            </button>

                            <button
                                onClick={() => handleUseLifeline('double_trouble')}
                                disabled={state.lifelines.double_trouble <= 0 || state.status !== 'playing'}
                                className={clsx(
                                    "w-full py-3 px-4 rounded-lg font-bold transition-all border flex items-center justify-between group",
                                    state.lifelines.double_trouble > 0 && state.status === 'playing'
                                        ? 'bg-gray-800 border-orange-500/30 text-orange-400 hover:bg-gray-750 hover:border-orange-500/50'
                                        : 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed',
                                    animatingButton === 'double_trouble' && 'animate-lifeline-shake'
                                )}
                            >
                                <span className="text-sm">Double Trouble</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${state.lifelines.double_trouble > 0 ? 'bg-orange-500/20 text-orange-300' : 'bg-gray-800 text-gray-600'}`}>
                                    {state.lifelines.double_trouble}
                                </span>
                            </button>

                            <button
                                onClick={() => handleUseLifeline('zoom_out')}
                                disabled={state.lifelines.zoom_out <= 0 || state.status !== 'playing'}
                                className={clsx(
                                    "w-full py-3 px-4 rounded-lg font-bold transition-all border flex items-center justify-between group",
                                    state.lifelines.zoom_out > 0 && state.status === 'playing'
                                        ? 'bg-gray-800 border-cyan-500/30 text-cyan-400 hover:bg-gray-750 hover:border-cyan-500/50'
                                        : 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed',
                                    animatingButton === 'zoom_out' && 'animate-lifeline-shake'
                                )}
                            >
                                <span className="text-sm">Zoom Out</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${state.lifelines.zoom_out > 0 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gray-800 text-gray-600'}`}>
                                    {state.lifelines.zoom_out}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};
