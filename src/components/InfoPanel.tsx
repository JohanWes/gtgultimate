
import { Calendar, Monitor, Tag, Star, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import type { Game } from '../types';

interface InfoPanelProps {
    game: Game | null;
    guessesMade: number; // 0 to 5
    status: 'playing' | 'won' | 'lost';
    isLoading?: boolean;
}

export function InfoPanel({ game, guessesMade, status, isLoading = false }: InfoPanelProps) {
    const showAll = status !== 'playing';

    if (isLoading || !game) {
        return (
            <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-col h-auto sm:h-full w-full">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="glass-panel p-1.5 sm:p-2.5 rounded-lg flex flex-col items-center justify-center text-center flex-1 animate-pulse"
                    >
                        <div className="w-4 h-4 rounded-full bg-white/10 mb-1.5" />
                        <div className="h-2 w-12 bg-white/10 rounded mb-1" />
                        <div className="h-3 w-16 bg-white/10 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    const hints = [
        {
            label: 'Release Year',
            value: game.year,
            icon: Calendar,
            revealed: showAll || guessesMade >= 1,
            unlocksAfter: 1,
        },
        {
            label: 'Platform',
            value: game.platform,
            icon: Monitor,
            revealed: showAll || guessesMade >= 2,
            unlocksAfter: 2,
        },
        {
            label: 'Genre',
            value: game.genre,
            icon: Tag,
            revealed: showAll || guessesMade >= 3,
            unlocksAfter: 3,
        },
        {
            label: 'Rating',
            value: `${game.rating}%`,
            icon: Star,
            revealed: showAll || guessesMade >= 4,
            unlocksAfter: 4,
        },
    ];

    return (
        <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-col h-auto sm:h-full w-full">
            {hints.map((hint) => (
                <div
                    key={hint.label}
                    className={clsx(
                        "glass-panel min-w-0 p-1.5 sm:p-2.5 rounded-lg flex flex-col items-center justify-center text-center transition-all duration-500 flex-1",
                        !hint.revealed && "opacity-60"
                    )}
                >
                    {hint.revealed
                        ? <hint.icon aria-hidden="true" className="mb-1 sm:mb-1.5 w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-primary" />
                        : <Lock aria-hidden="true" className="mb-1 sm:mb-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted" />}
                    <div className="text-[10px] sm:text-[11px] text-muted uppercase tracking-wider font-semibold mb-0.5 leading-tight">{hint.label}</div>
                    {hint.revealed ? (
                        <div className="font-bold text-xs sm:text-sm leading-tight text-text break-words line-clamp-3 max-w-full" title={String(hint.value)}>
                            {hint.value}
                        </div>
                    ) : (
                        <div className="text-[10px] sm:text-xs leading-tight text-muted">
                            After guess {hint.unlocksAfter}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
