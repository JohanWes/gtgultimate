import { CheckCircle, XCircle, Circle, Trophy } from 'lucide-react';
import { clsx } from 'clsx';
import gtgLogo from '../assets/gtgultimate.jpg';
import type { LevelProgress, GameMode } from '../types';

interface SidebarProps {
    totalLevels: number;
    currentLevel: number;
    progress: Record<number, LevelProgress>;
    onSelectLevel: (level: number) => void;
    isOpen: boolean;
    onClose: () => void;
    currentMode: GameMode;
    onModeSwitch: (mode: GameMode) => void;
}

export function Sidebar({ totalLevels, currentLevel, progress, onSelectLevel, isOpen, onClose, currentMode, onModeSwitch }: SidebarProps) {
    const levels = Array.from({ length: totalLevels }, (_, i) => i + 1);

    const completedCount = Object.values(progress).filter(p => p.status === 'won').length;

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div className={clsx(
                "fixed md:sticky md:top-0 md:h-screen inset-y-0 left-0 z-50 w-64 bg-surface border-r border-white/10 transform transition-transform duration-300 ease-in-out md:transform-none flex flex-col",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="px-4 py-3 border-b border-white/10 flex-shrink-0 flex flex-col gap-3">
                    <img src={gtgLogo} alt="GuessTheGame" className="w-full h-auto rounded-md" />

                    {/* Game Mode Toggles */}
                    <div className="flex bg-black/20 p-1 rounded-lg">
                        <button
                            onClick={() => onModeSwitch('standard')}
                            className={clsx(
                                "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
                                currentMode === 'standard'
                                    ? "bg-primary text-white shadow-sm"
                                    : "text-muted hover:text-white hover:bg-white/5"
                            )}
                        >
                            Standard
                        </button>
                        <button
                            onClick={() => onModeSwitch('endless')}
                            className={clsx(
                                "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
                                currentMode === 'endless'
                                    ? "bg-orange-600 text-white shadow-sm"
                                    : "text-muted hover:text-white hover:bg-white/5"
                            )}
                        >
                            Endless
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted">
                        <Trophy size={14} className="text-yellow-500" />
                        <span>{completedCount} / {totalLevels} Completed</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 pt-2 space-y-1 custom-scrollbar" style={{ maxHeight: 'calc(min(150vh, 100vh + 800px) - 88px)' }}>
                    {levels.map((level, index) => {
                        const levelStatus = progress[level]?.status || 'playing';
                        const isCurrent = currentLevel === level;
                        const isLast = index === levels.length - 1;

                        return (
                            <button
                                key={level}
                                onClick={() => {
                                    onSelectLevel(level);
                                    if (window.innerWidth < 768) onClose();
                                }}
                                className={clsx(
                                    "w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-all",
                                    isCurrent
                                        ? "bg-primary/20 border border-primary/50 text-white"
                                        : "hover:bg-white/5 text-muted hover:text-white",
                                    isLast && "pb-2"
                                )}
                            >
                                <span className="font-medium">Level {level}</span>
                                {levelStatus === 'won' && <CheckCircle size={18} className="text-success" />}
                                {levelStatus === 'lost' && <XCircle size={18} className="text-error" />}
                                {levelStatus === 'playing' && progress[level]?.guesses.length > 0 && (
                                    <Circle size={18} className="text-yellow-500 fill-yellow-500/20" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
