import { clsx } from 'clsx';
import type { Game, EndlessState, LifelineType, ConsultantOption } from '../types';
import synopsisData from '../assets/synopsis.json';

interface LifelinesProps {
    state: EndlessState;
    game: Game | undefined;
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
    const buttonBaseClass = "w-full py-3 px-4 rounded-xl font-bold transition-all duration-200 border flex items-center justify-between ui-focus-ring";
    const enabledBaseClass = "glass-panel-soft border-white/10 text-text hover:brightness-110";
    const disabledBaseClass = "bg-surface/30 border-white/5 text-muted/50 cursor-not-allowed";
    const disabledBadgeClass = "bg-surface/60 text-muted/60 border border-white/10";

    const accentStyles = {
        cover_peek: {
            button: "text-purple-300 border-purple-400/35 hover:bg-purple-500/10 hover:border-purple-300/60 hover:shadow-lg hover:shadow-purple-500/10",
            badge: "bg-purple-500/20 text-purple-200 border border-purple-400/30"
        },
        skip: {
            button: "text-red-300 border-red-400/35 hover:bg-red-500/10 hover:border-red-300/60 hover:shadow-lg hover:shadow-red-500/10",
            badge: "bg-red-500/20 text-red-200 border border-red-400/30"
        },
        anagram: {
            button: "text-blue-300 border-blue-400/35 hover:bg-blue-500/10 hover:border-blue-300/60 hover:shadow-lg hover:shadow-blue-500/10",
            badge: "bg-blue-500/20 text-blue-200 border border-blue-400/30"
        },
        consultant: {
            button: "text-slate-300 border-slate-400/35 hover:bg-slate-500/10 hover:border-slate-300/60 hover:shadow-lg hover:shadow-slate-500/10",
            badge: "bg-slate-500/20 text-slate-200 border border-slate-400/30"
        },
        double_trouble: {
            button: "text-orange-300 border-orange-400/35 hover:bg-orange-500/10 hover:border-orange-300/60 hover:shadow-lg hover:shadow-orange-500/10",
            badge: "bg-orange-500/20 text-orange-200 border border-orange-400/30"
        },
        zoom_out: {
            button: "text-cyan-300 border-cyan-400/35 hover:bg-cyan-500/10 hover:border-cyan-300/60 hover:shadow-lg hover:shadow-cyan-500/10",
            badge: "bg-cyan-500/20 text-cyan-200 border border-cyan-400/30"
        },
        synopsis: {
            button: "text-green-300 border-green-400/35 hover:bg-green-500/10 hover:border-green-300/60 hover:shadow-lg hover:shadow-green-500/10",
            badge: "bg-green-500/20 text-green-200 border border-green-400/30"
        }
    } as const;

    return (
        <div className="space-y-2 mt-2">
            <div className="grid grid-cols-1 gap-2">
                <button
                    onClick={() => onUseLifeline('cover_peek')}
                    disabled={isShopOpen || state.lifelines.cover_peek <= 0 || state.status !== 'playing' || !game?.cover}
                    className={clsx(
                        buttonBaseClass,
                        state.lifelines.cover_peek > 0 && state.status === 'playing' && game?.cover
                            ? `${enabledBaseClass} ${accentStyles.cover_peek.button}`
                            : disabledBaseClass,
                        animatingButton === 'cover_peek' && 'animate-lifeline-pop'
                    )}
                >
                    <span className="text-sm">Cover Peek</span>
                    <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded",
                        state.lifelines.cover_peek > 0 ? accentStyles.cover_peek.badge : disabledBadgeClass
                    )}>
                        {state.lifelines.cover_peek}
                    </span>
                </button>

                <button
                    onClick={() => onUseLifeline('skip')}
                    disabled={isShopOpen || state.lifelines.skip <= 0 || state.status !== 'playing'}
                    className={clsx(
                        buttonBaseClass,
                        state.lifelines.skip > 0 && state.status === 'playing'
                            ? `${enabledBaseClass} ${accentStyles.skip.button}`
                            : disabledBaseClass,
                        animatingButton === 'skip' && 'animate-lifeline-slide'
                    )}
                >
                    <span className="text-sm">Skip Level</span>
                    <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded",
                        state.lifelines.skip > 0 ? accentStyles.skip.badge : disabledBadgeClass
                    )}>
                        {state.lifelines.skip}
                    </span>
                </button>

                <button
                    onClick={() => onUseLifeline('anagram')}
                    disabled={isShopOpen || state.lifelines.anagram <= 0 || state.status !== 'playing' || !!doubleTroubleGame}
                    className={clsx(
                        buttonBaseClass,
                        state.lifelines.anagram > 0 && state.status === 'playing' && !doubleTroubleGame
                            ? `${enabledBaseClass} ${accentStyles.anagram.button}`
                            : disabledBaseClass,
                        animatingButton === 'anagram' && 'animate-lifeline-shake'
                    )}
                >
                    <span className="text-sm">Anagram</span>
                    <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded",
                        state.lifelines.anagram > 0 ? accentStyles.anagram.badge : disabledBadgeClass
                    )}>
                        {state.lifelines.anagram}
                    </span>
                </button>

                <button
                    onClick={() => onUseLifeline('consultant')}
                    disabled={isShopOpen || state.lifelines.consultant <= 0 || state.status !== 'playing' || !!doubleTroubleGame}
                    className={clsx(
                        buttonBaseClass,
                        state.lifelines.consultant > 0 && state.status === 'playing' && !doubleTroubleGame
                            ? `${enabledBaseClass} ${accentStyles.consultant.button}`
                            : disabledBaseClass,
                        animatingButton === 'consultant' && 'animate-lifeline-pop'
                    )}
                >
                    <span className="text-sm">Consultant</span>
                    <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded",
                        state.lifelines.consultant > 0 ? accentStyles.consultant.badge : disabledBadgeClass
                    )}>
                        {state.lifelines.consultant}
                    </span>
                </button>

                <button
                    onClick={() => onUseLifeline('double_trouble')}
                    disabled={isShopOpen || state.lifelines.double_trouble <= 0 || state.status !== 'playing' || !!consultantOptions}
                    className={clsx(
                        buttonBaseClass,
                        state.lifelines.double_trouble > 0 && state.status === 'playing' && !consultantOptions
                            ? `${enabledBaseClass} ${accentStyles.double_trouble.button}`
                            : disabledBaseClass,
                        animatingButton === 'double_trouble' && 'animate-lifeline-shake'
                    )}
                >
                    <span className="text-sm">Double Trouble</span>
                    <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded",
                        state.lifelines.double_trouble > 0 ? accentStyles.double_trouble.badge : disabledBadgeClass
                    )}>
                        {state.lifelines.double_trouble}
                    </span>
                </button>

                <button
                    onClick={() => onUseLifeline('zoom_out')}
                    disabled={isShopOpen || state.lifelines.zoom_out <= 0 || state.status !== 'playing'}
                    className={clsx(
                        buttonBaseClass,
                        state.lifelines.zoom_out > 0 && state.status === 'playing'
                            ? `${enabledBaseClass} ${accentStyles.zoom_out.button}`
                            : disabledBaseClass,
                        animatingButton === 'zoom_out' && 'animate-lifeline-shake'
                    )}
                >
                    <span className="text-sm">Zoom Out</span>
                    <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded",
                        state.lifelines.zoom_out > 0 ? accentStyles.zoom_out.badge : disabledBadgeClass
                    )}>
                        {state.lifelines.zoom_out}
                    </span>
                </button>

                <button
                    onClick={() => onUseLifeline('synopsis')}
                    disabled={isShopOpen || state.lifelines.synopsis <= 0 || state.status !== 'playing' || !game || (!game.synopsis && !synopsisData[game.id.toString() as keyof typeof synopsisData])}
                    className={clsx(
                        buttonBaseClass,
                        state.lifelines.synopsis > 0 && state.status === 'playing' && game && (game.synopsis || synopsisData[game.id.toString() as keyof typeof synopsisData])
                            ? `${enabledBaseClass} ${accentStyles.synopsis.button}`
                            : disabledBaseClass,
                        animatingButton === 'synopsis' && 'animate-lifeline-pop'
                    )}
                >
                    <span className="text-sm">Synopsis</span>
                    <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded",
                        state.lifelines.synopsis > 0 ? accentStyles.synopsis.badge : disabledBadgeClass
                    )}>
                        {state.lifelines.synopsis}
                    </span>
                </button>
            </div>
        </div>
    );
}
