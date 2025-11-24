
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
            color: 'text-purple-400'
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
        <div className="flex flex-col gap-2 h-full">
            {hints.map((hint) => (
                <div
                    key={hint.label}
                    className={clsx(
                        "glass-panel p-2.5 rounded-lg flex flex-col items-center justify-center text-center transition-all duration-500 flex-1 min-h-[64px]",
                        hint.revealed ? "opacity-100 transform translate-y-0" : "opacity-50 blur-sm transform translate-y-2"
                    )}
                >
                    <hint.icon className={clsx("mb-1.5", hint.revealed ? hint.color : "text-muted")} size={18} />
                    <div className="text-[8px] text-muted uppercase tracking-wider font-semibold mb-0.5">{hint.label}</div>
                    <div className={clsx("font-bold text-sm", hint.revealed ? "text-white" : "text-transparent bg-white/10 rounded px-2 py-0.5")}>
                        {hint.revealed ? hint.value : "???"}
                    </div>
                </div>
            ))}
        </div>
    );
}
