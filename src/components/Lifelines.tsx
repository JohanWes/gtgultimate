import { clsx } from 'clsx';
import type { Game, EndlessState, LifelineType, ConsultantOption } from '../types';

interface LifelinesProps {
    state: EndlessState;
    game: Game | undefined;
    onUseLifeline: (type: LifelineType) => void;
    animatingButton: LifelineType | null;
    doubleTroubleGame: Game | null;
    consultantOptions: ConsultantOption[] | null;
    isShopOpen?: boolean;
    hasSynopsis?: boolean;
    anagramActive?: boolean;
    isConsultantPending?: boolean;
}

export function Lifelines({
    state,
    game,
    onUseLifeline,
    animatingButton,
    doubleTroubleGame,
    consultantOptions,
    isShopOpen = false,
    hasSynopsis = false,
    anagramActive = false,
    isConsultantPending = false
}: LifelinesProps) {
    const buttonBaseClass = "w-full py-3 px-4 rounded-xl font-bold transition-all duration-200 border flex items-center justify-between ui-focus-ring";
    const enabledBaseClass = "glass-panel-soft border-white/10 text-text hover:brightness-110";
    const disabledBaseClass = "bg-surface/30 border-white/5 text-muted/50 cursor-not-allowed";
    const disabledBadgeClass = "bg-surface/60 text-muted/60 border border-white/10";

    const availableButtonClass = "hover:bg-accent/10 hover:border-accent/50";
    const availableBadgeClass = "bg-accent/15 text-accent border border-accent/30 tabular-nums";

    return (
        <div className="space-y-2 mt-2">
            <div className="grid grid-cols-1 gap-2">
                <button
                    onClick={() => onUseLifeline('cover_peek')}
                    disabled={isShopOpen || state.lifelines.cover_peek <= 0 || state.status !== 'playing' || !game?.cover}
                    className={clsx(
                        buttonBaseClass,
                        state.lifelines.cover_peek > 0 && state.status === 'playing' && game?.cover
                            ? `${enabledBaseClass} ${availableButtonClass}`
                            : disabledBaseClass,
                        animatingButton === 'cover_peek' && 'animate-lifeline-pop'
                    )}
                >
                    <span className="text-sm">Cover Peek</span>
                    <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded",
                        state.lifelines.cover_peek > 0 ? availableBadgeClass : disabledBadgeClass
                    )}>
                        {state.lifelines.cover_peek}
                    </span>
                </button>

                <button
                    onClick={() => onUseLifeline('skip')}
                    disabled={isShopOpen || isConsultantPending || state.lifelines.skip <= 0 || state.status !== 'playing'}
                    className={clsx(
                        buttonBaseClass,
                        state.lifelines.skip > 0 && state.status === 'playing' && !isConsultantPending
                            ? `${enabledBaseClass} ${availableButtonClass}`
                            : disabledBaseClass,
                        animatingButton === 'skip' && 'animate-lifeline-slide'
                    )}
                >
                    <span className="text-sm">Skip Level</span>
                    <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded",
                        state.lifelines.skip > 0 ? availableBadgeClass : disabledBadgeClass
                    )}>
                        {state.lifelines.skip}
                    </span>
                </button>

                <button
                    onClick={() => onUseLifeline('anagram')}
                    disabled={isShopOpen || anagramActive || state.lifelines.anagram <= 0 || state.status !== 'playing' || !!doubleTroubleGame}
                    className={clsx(
                        buttonBaseClass,
                        state.lifelines.anagram > 0 && state.status === 'playing' && !doubleTroubleGame && !anagramActive
                            ? `${enabledBaseClass} ${availableButtonClass}`
                            : disabledBaseClass,
                        animatingButton === 'anagram' && 'animate-lifeline-shake'
                    )}
                >
                    <span className="text-sm">Anagram</span>
                    <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded",
                        state.lifelines.anagram > 0 ? availableBadgeClass : disabledBadgeClass
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
                            ? `${enabledBaseClass} ${availableButtonClass}`
                            : disabledBaseClass,
                        animatingButton === 'consultant' && 'animate-lifeline-pop'
                    )}
                >
                    <span className="text-sm">Consultant</span>
                    <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded",
                        state.lifelines.consultant > 0 ? availableBadgeClass : disabledBadgeClass
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
                            ? `${enabledBaseClass} ${availableButtonClass}`
                            : disabledBaseClass,
                        animatingButton === 'double_trouble' && 'animate-lifeline-shake'
                    )}
                >
                    <span className="text-sm">Double Trouble</span>
                    <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded",
                        state.lifelines.double_trouble > 0 ? availableBadgeClass : disabledBadgeClass
                    )}>
                        {state.lifelines.double_trouble}
                    </span>
                </button>

                <button
                    onClick={() => onUseLifeline('zoom_out')}
                    disabled={isShopOpen || state.zoomOutActive || state.lifelines.zoom_out <= 0 || state.status !== 'playing'}
                    className={clsx(
                        buttonBaseClass,
                        state.lifelines.zoom_out > 0 && state.status === 'playing' && !state.zoomOutActive
                            ? `${enabledBaseClass} ${availableButtonClass}`
                            : disabledBaseClass,
                        animatingButton === 'zoom_out' && 'animate-lifeline-shake'
                    )}
                >
                    <span className="text-sm">Zoom Out</span>
                    <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded",
                        state.lifelines.zoom_out > 0 ? availableBadgeClass : disabledBadgeClass
                    )}>
                        {state.lifelines.zoom_out}
                    </span>
                </button>

                <button
                    onClick={() => onUseLifeline('synopsis')}
                    disabled={isShopOpen || state.lifelines.synopsis <= 0 || state.status !== 'playing' || !hasSynopsis}
                    className={clsx(
                        buttonBaseClass,
                        state.lifelines.synopsis > 0 && state.status === 'playing' && hasSynopsis
                            ? `${enabledBaseClass} ${availableButtonClass}`
                            : disabledBaseClass,
                        animatingButton === 'synopsis' && 'animate-lifeline-pop'
                    )}
                >
                    <span className="text-sm">Synopsis</span>
                    <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded",
                        state.lifelines.synopsis > 0 ? availableBadgeClass : disabledBadgeClass
                    )}>
                        {state.lifelines.synopsis}
                    </span>
                </button>
            </div>
        </div>
    );
}
