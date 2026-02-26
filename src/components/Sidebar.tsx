import { XCircle, Circle, Trophy } from 'lucide-react';
import { clsx } from 'clsx';
import gtgLogo from '../assets/gtgultimate.jpg';
import retroLogo from '../assets/logo-retro.png';
import midnightBlackLogo from '../assets/midnightblack.jpg';
import horseLogo from '../assets/gtghorse.png';
import type { LevelProgress, GameMode } from '../types';
import { useSettings } from '../hooks/useSettings';

interface SidebarProps {
    totalLevels: number;
    currentLevel: number;
    progress: Record<number, LevelProgress>;
    onSelectLevel: (level: number) => void;
    isOpen: boolean;
    onClose: () => void;
    currentMode: GameMode;
    onModeSwitch: (mode: GameMode) => void;
    isHorseMode?: boolean;
    collapsed?: boolean;
}

export function Sidebar({ totalLevels, currentLevel, progress, onSelectLevel, isOpen, onClose, currentMode, onModeSwitch, isHorseMode = false, collapsed = false }: SidebarProps) {
    const { settings } = useSettings();
    const logoSrc =
        isHorseMode
            ? horseLogo
            : settings.theme === 'retro'
            ? retroLogo
            : settings.theme === 'midnight-black'
                ? midnightBlackLogo
                : gtgLogo;

    const levels = Array.from({ length: totalLevels }, (_, i) => i + 1);

    const completedCount = Object.values(progress).filter(p => p.status === 'won').length;

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/50 z-40 transition-opacity",
                    !collapsed && "md:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div className={clsx(
                "fixed inset-y-0 left-0 z-50 bg-surface/90 supports-[backdrop-filter]:bg-surface/60 backdrop-blur-md border-r border-white/10 shadow-2xl transform transition-all duration-300 ease-in-out flex flex-col",
                !collapsed && "md:sticky md:top-0 md:h-screen md:transform-none",
                isOpen ? "translate-x-0" : collapsed ? "-translate-x-full" : "-translate-x-full md:translate-x-0",
                "w-64"
            )}>
                <div className="px-4 py-3 border-b border-white/10 flex-shrink-0 flex flex-col gap-3">
                    <img src={logoSrc} alt="GuessTheGame" className="w-full h-auto rounded-md" />

                    {/* Game Mode Toggles */}
                    <div className="flex bg-black/20 p-1 rounded-lg">
                        <button
                            onClick={() => {
                                onModeSwitch('standard');
                                if (collapsed) onClose();
                            }}
                            className={clsx(
                                "flex-1 py-1.5 text-xs font-bold rounded-md transition-all ui-focus-ring",
                                isHorseMode
                                    ? "text-gray-300 bg-white/5 hover:bg-white/10"
                                    : currentMode === 'standard'
                                    ? "bg-primary text-onPrimary shadow-sm"
                                    : "text-muted hover:text-white hover:bg-white/5"
                            )}
                        >
                            Standard
                        </button>
                        <button
                            onClick={() => {
                                onModeSwitch('endless');
                                if (collapsed) onClose();
                            }}
                            className={clsx(
                                "flex-1 py-1.5 text-xs font-bold rounded-md transition-all ui-focus-ring",
                                isHorseMode
                                    ? "text-gray-300 bg-white/5 hover:bg-white/10"
                                    : currentMode === 'endless'
                                    ? "bg-accent text-onAccent shadow-sm"
                                    : "text-muted hover:text-white hover:bg-white/5"
                            )}
                        >
                            Endless
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted">
                        {currentMode === 'standard' ? (
                            <>
                                {isHorseMode ? (
                                    <>
                                        <span className="text-sm leading-none" aria-hidden="true">🐎</span>
                                        <span>{completedCount} / {totalLevels} Completed</span>
                                    </>
                                ) : (
                                    <>
                                        <Trophy size={14} className="text-yellow-500" />
                                        <span>{completedCount} / {totalLevels} Completed</span>
                                    </>
                                )}
                            </>
                        ) : (
                            <span className="font-bold uppercase tracking-wider text-accent">Lifelines</span>
                        )}
                    </div>
                </div>

                <div className={clsx(
                    "flex-1 px-3 pt-2 space-y-1",
                    currentMode === 'standard' ? "overflow-y-auto custom-scrollbar" : "overflow-hidden"
                )} style={{ maxHeight: 'calc(min(150vh, 100vh + 800px) - 88px)' }}>
                    {currentMode === 'standard' ? (
                        levels.map((level, index) => {
                            const levelStatus = progress[level]?.status || 'playing';
                            const isCurrent = currentLevel === level;
                            const isLast = index === levels.length - 1;

                            return (
                                <button
                                    key={level}
                                    onClick={() => {
                                        onSelectLevel(level);
                                        if (window.innerWidth < 768 || collapsed) onClose();
                                    }}
                                    className={clsx(
                                        "w-full flex items-center justify-between px-3 py-2 rounded border border-transparent text-sm transition-all ui-focus-ring",
                                        isCurrent
                                            ? "bg-primary/20 border-primary/50 text-white"
                                            : "hover:bg-white/8 text-muted hover:text-white",
                                        isLast && "pb-2"
                                    )}
                                >
                                    <span className="font-medium">Level {level}</span>
                                    {levelStatus === 'won' && (
                                        <span className="text-success font-bold text-xs border border-success/30 px-1.5 py-0.5 rounded-md bg-success/10 min-w-[32px] text-center">
                                            {progress[level].guesses.length}/5
                                        </span>
                                    )}
                                    {levelStatus === 'lost' && <XCircle size={18} className="text-error" />}
                                    {levelStatus === 'playing' && progress[level]?.guesses.length > 0 && (
                                        <Circle size={18} className="text-yellow-500 fill-yellow-500/20" />
                                    )}
                                </button>
                            );
                        })
                    ) : (
                        <div id="sidebar-lifelines-portal" className="h-full" />
                    )}
                </div>
            </div>
        </>
    );
}
