
import { Calendar, Monitor, Tag, Star } from 'lucide-react';
import { clsx } from 'clsx';
import type { Game } from '../types';

interface InfoPanelProps {
    game: Game;
    guessesMade: number; // 0 to 5
    status: 'playing' | 'won' | 'lost';
}

export function InfoPanel({ game, guessesMade, status }: InfoPanelProps) {
    const showAll = status !== 'playing';

    const hints = [
        {
            label: 'Release Year',
            value: game.year,
            icon: Calendar,
            revealed: showAll || guessesMade >= 1,
            color: 'text-blue-400'
        },
        {
            label: 'Platform',
            value: game.platform,
            icon: Monitor,
            revealed: showAll || guessesMade >= 2,
            color: 'text-slate-400'
        },
        {
            label: 'Genre',
            value: game.genre,
            icon: Tag,
            revealed: showAll || guessesMade >= 3,
            color: 'text-pink-400'
        },
        {
            label: 'Rating (IGDB)',
            value: `${game.rating}%`,
            icon: Star,
            revealed: showAll || guessesMade >= 4,
            color: 'text-yellow-400'
        },
    ];

    return (
        <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-col h-auto sm:h-full w-full">
            {hints.map((hint) => (
                <div
                    key={hint.label}
                    className={clsx(
                        "glass-panel p-1.5 sm:p-2.5 rounded-lg flex flex-col items-center justify-center text-center transition-all duration-500 flex-1",
                        hint.revealed ? "opacity-100 transform translate-y-0" : "opacity-50 blur-sm transform translate-y-2"
                    )}
                >
                    <hint.icon className={clsx("mb-1 sm:mb-1.5 w-3 h-3 sm:w-[18px] sm:h-[18px]", hint.revealed ? hint.color : "text-muted")} />
                    <div className="text-[6px] sm:text-[8px] text-muted uppercase tracking-wider font-semibold mb-0.5 whitespace-nowrap">{hint.label}</div>
                    <div className={clsx("font-bold text-xs sm:text-sm leading-tight", hint.revealed ? "text-white" : "text-transparent bg-white/10 rounded px-1 sm:px-2 py-0.5")}>
                        {hint.revealed ? hint.value : "???"}
                    </div>
                </div>
            ))}
        </div>
    );
}
