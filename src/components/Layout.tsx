import React, { useState } from 'react';
import { Menu, Settings, BarChart2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { StatsModal } from './StatsModal';
import { useGameState } from '../hooks/useGameState';
import { useSettings } from '../hooks/useSettings';
import { SettingsModal } from './SettingsModal';
import { useIsMobile } from '../hooks/useIsMobile';
import type { GameMode } from '../types';
import type { EndlessStats } from '../hooks/useEndlessStats';
import { FullScreenToggle } from './FullScreenToggle';

interface LayoutProps {
    children: React.ReactNode;
    gameState: ReturnType<typeof useGameState>;
    currentMode: GameMode;
    onModeSwitch: (mode: GameMode) => void;
    isHorseMode?: boolean;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    // Stats props (optional, only needed for endless mode)
    endlessStats?: {
        stats: EndlessStats;
        totalGames: number;
        winRate: number;
        averageGuesses: number;
        resetStats: () => void;
    };
    isStatsOpen?: boolean;
    onStatsOpenChange?: (isOpen: boolean) => void;
}

export function Layout({ children, gameState, currentMode, onModeSwitch, isHorseMode = false, isFullscreen, onToggleFullscreen, endlessStats, isStatsOpen, onStatsOpenChange }: LayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { isSettingsOpen, setIsSettingsOpen } = useSettings();
    const isMobile = useIsMobile();
    const isSidebarCollapsed = isFullscreen && !isMobile;

    const showStatsButton = currentMode === 'endless' && endlessStats;

    return (
        <div className="min-h-screen bg-background text-text flex">
            <Sidebar
                totalLevels={gameState.totalLevels}
                currentLevel={gameState.currentLevel}
                progress={gameState.allProgress}
                onSelectLevel={gameState.goToLevel}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                currentMode={currentMode}
                onModeSwitch={onModeSwitch}
                isHorseMode={isHorseMode}
                collapsed={isSidebarCollapsed}
            />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="md:hidden p-4 border-b border-white/10 flex items-center justify-between glass-panel-soft sticky top-0 z-30 rounded-none">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 hover:bg-white/8 rounded-lg transition-colors ui-focus-ring"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-lg font-display">Level {gameState.currentLevel}</span>
                    <div className="flex items-center gap-1">
                        {showStatsButton && (
                            <button
                                onClick={() => onStatsOpenChange?.(true)}
                                className="p-2 hover:bg-white/8 rounded-lg transition-colors ui-focus-ring"
                            >
                                <BarChart2 size={24} />
                            </button>
                        )}
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 -mr-2 hover:bg-white/8 rounded-lg transition-colors ui-focus-ring"
                        >
                            <Settings size={24} />
                        </button>
                    </div>
                </header>

                {/* Desktop Menu Trigger (Fullscreen Collapsed Sidebar) */}
                {isSidebarCollapsed && (
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="hidden md:flex absolute top-4 left-4 z-40 p-2 glass-panel-soft hover:border-white/20 rounded-lg transition-all hover:scale-105 shadow-lg text-muted hover:text-text ui-focus-ring"
                        title="Open sidebar"
                    >
                        <Menu size={20} />
                    </button>
                )}

                {/* Desktop Buttons (Absolute positioned) */}
                <div className="hidden md:flex absolute top-4 right-4 z-40 gap-2">
                    {showStatsButton && (
                        <button
                            onClick={() => onStatsOpenChange?.(true)}
                            className="p-2 glass-panel-soft hover:border-white/20 rounded-lg transition-all hover:scale-105 shadow-lg text-muted hover:text-text ui-focus-ring"
                            title="Statistics"
                        >
                            <BarChart2 size={20} />
                        </button>
                    )}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 glass-panel-soft hover:border-white/20 rounded-lg transition-all hover:scale-105 shadow-lg text-muted hover:text-text ui-focus-ring"
                        title="Settings"
                    >
                        <Settings size={20} />
                    </button>
                </div>

                <main className="flex-1 p-0 sm:p-2 md:p-3 overflow-y-auto custom-scrollbar stable-scrollbar-gutter relative">
                    {children}
                </main>
            </div>

            <AnimatePresence>
                {isSettingsOpen && (
                    <SettingsModal onClose={() => setIsSettingsOpen(false)} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isStatsOpen && endlessStats && (
                    <StatsModal
                        stats={endlessStats.stats}
                        totalGames={endlessStats.totalGames}
                        winRate={endlessStats.winRate}
                        averageGuesses={endlessStats.averageGuesses}
                        onReset={endlessStats.resetStats}
                        onClose={() => onStatsOpenChange?.(false)}
                    />
                )}
            </AnimatePresence>

            <FullScreenToggle
                className="fixed bottom-4 right-4 z-50"
                isFullscreen={isFullscreen}
                onToggle={onToggleFullscreen}
            />
        </div>
    );
}
