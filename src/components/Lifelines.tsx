import { clsx } from 'clsx';
import type { Game, EndlessState, LifelineType, ConsultantOption } from '../types';
import synopsisData from '../assets/synopsis.json';

interface LifelinesProps {
    state: EndlessState;
    game: Game;
    onUseLifeline: (type: LifelineType) => void;
    animatingButton: LifelineType | null;
    doubleTroubleGame: Game | null;
    consultantOptions: ConsultantOption[] | null;
    isShopOpen?: boolean;
}

export function Lifelines({
    state,
    game,
    onUseLifeline,
    animatingButton,
    doubleTroubleGame,
    consultantOptions,
    isShopOpen = false
}: LifelinesProps) {
    return (
        <div className="space-y-2 mt-2">
            <div className="grid grid-cols-1 gap-2">
                <button
                    onClick={() => onUseLifeline('cover_peek')}
                    disabled={isShopOpen || state.lifelines.cover_peek <= 0 || state.status !== 'playing' || !game.cover}
                    className={clsx(
                        "w-full py-3 px-4 rounded-lg font-bold transition-all border flex items-center justify-between group",
                        state.lifelines.cover_peek > 0 && state.status === 'playing' && game.cover
                            ? 'bg-gray-800 border-purple-500/30 text-purple-400 hover:bg-gray-750 hover:border-purple-500/50'
                            : 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed',
                        animatingButton === 'cover_peek' && 'animate-lifeline-pop'
                    )}
                >
                    <span className="text-sm">Cover Peek</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${state.lifelines.cover_peek > 0 ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-800 text-gray-600'}`}>
                        {state.lifelines.cover_peek}
                    </span>
                </button>

                <button
                    onClick={() => onUseLifeline('skip')}
                    disabled={isShopOpen || state.lifelines.skip <= 0 || state.status !== 'playing'}
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
                    onClick={() => onUseLifeline('anagram')}
                    disabled={isShopOpen || state.lifelines.anagram <= 0 || state.status !== 'playing' || !!doubleTroubleGame}
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
                    onClick={() => onUseLifeline('consultant')}
                    disabled={isShopOpen || state.lifelines.consultant <= 0 || state.status !== 'playing' || !!doubleTroubleGame}
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
                    onClick={() => onUseLifeline('double_trouble')}
                    disabled={isShopOpen || state.lifelines.double_trouble <= 0 || state.status !== 'playing' || !!consultantOptions}
                    className={clsx(
                        "w-full py-3 px-4 rounded-lg font-bold transition-all border flex items-center justify-between group",
                        state.lifelines.double_trouble > 0 && state.status === 'playing' && !consultantOptions
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
                    onClick={() => onUseLifeline('zoom_out')}
                    disabled={isShopOpen || state.lifelines.zoom_out <= 0 || state.status !== 'playing'}
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

                <button
                    onClick={() => onUseLifeline('synopsis')}
                    disabled={isShopOpen || state.lifelines.synopsis <= 0 || state.status !== 'playing' || !synopsisData[game.id.toString() as keyof typeof synopsisData]}
                    className={clsx(
                        "w-full py-3 px-4 rounded-lg font-bold transition-all border flex items-center justify-between group",
                        state.lifelines.synopsis > 0 && state.status === 'playing' && synopsisData[game.id.toString() as keyof typeof synopsisData]
                            ? 'bg-gray-800 border-green-500/30 text-green-400 hover:bg-gray-750 hover:border-green-500/50'
                            : 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed',
                        animatingButton === 'synopsis' && 'animate-lifeline-pop'
                    )}
                >
                    <span className="text-sm">Synopsis</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${state.lifelines.synopsis > 0 ? 'bg-green-500/20 text-green-300' : 'bg-gray-800 text-gray-600'}`}>
                        {state.lifelines.synopsis}
                    </span>
                </button>
            </div>
        </div>
    );
}
