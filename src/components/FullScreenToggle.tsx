import { useState, useEffect } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import clsx from 'clsx';

interface FullScreenToggleProps {
    className?: string;
}

export function FullScreenToggle({ className }: FullScreenToggleProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error('Error toggling fullscreen:', err);
        }
    };

    return (
        <button
            onClick={toggleFullscreen}
            className={clsx(
                "p-2 bg-surface/50 hover:bg-surface border border-white/10 rounded-lg transition-all hover:scale-105 backdrop-blur-sm shadow-lg text-gray-400 hover:text-white",
                className
            )}
            title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
        >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
    );
}
