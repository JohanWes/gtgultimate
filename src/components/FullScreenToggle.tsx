import { Maximize, Minimize } from 'lucide-react';
import clsx from 'clsx';

interface FullScreenToggleProps {
    className?: string;
    isFullscreen: boolean;
    onToggle: () => void;
}

export function FullScreenToggle({ className, isFullscreen, onToggle }: FullScreenToggleProps) {
    return (
        <button
            onClick={onToggle}
            className={clsx(
                "p-2 glass-panel-soft border border-white/10 rounded-lg transition-all hover:scale-105 shadow-lg text-muted hover:text-white ui-focus-ring",
                className
            )}
            title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
        >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
    );
}
