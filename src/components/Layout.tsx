import React, { useState } from 'react';
import { Menu, Settings, BarChart2 } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { StatsModal } from './StatsModal';
import { useGameState } from '../hooks/useGameState';
import { useSettings } from '../hooks/useSettings';
import { SettingsModal } from './SettingsModal';
import type { GameMode } from '../types';
import type { EndlessStats } from '../hooks/useEndlessStats';

interface LayoutProps {
    children: React.ReactNode;
    gameState: ReturnType<typeof useGameState>;
    currentMode: GameMode;
    onModeSwitch: (mode: GameMode) => void;
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

export function Layout({ children, gameState, currentMode, onModeSwitch, endlessStats, isStatsOpen, onStatsOpenChange }: LayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { isSettingsOpen, setIsSettingsOpen } = useSettings();

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
            />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="md:hidden p-4 border-b border-white/10 flex items-center justify-between bg-surface/80 backdrop-blur sticky top-0 z-30">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-lg">Level {gameState.currentLevel}</span>
                    <div className="flex items-center gap-1">
                        {showStatsButton && (
                            <button
                                onClick={() => onStatsOpenChange?.(true)}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <BarChart2 size={24} />
                            </button>
                        )}
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 -mr-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <Settings size={24} />
                        </button>
                    </div>
                </header>

                {/* Desktop Buttons (Absolute positioned) */}
                <div className="hidden md:flex absolute top-4 right-4 z-40 gap-2">
                    {showStatsButton && (
                        <button
                            onClick={() => onStatsOpenChange?.(true)}
                            className="p-2 bg-surface/50 hover:bg-surface border border-white/10 rounded-lg transition-all hover:scale-105 backdrop-blur-sm shadow-lg text-gray-400 hover:text-white"
                            title="Statistics"
                        >
                            <BarChart2 size={20} />
                        </button>
                    )}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 bg-surface/50 hover:bg-surface border border-white/10 rounded-lg transition-all hover:scale-105 backdrop-blur-sm shadow-lg text-gray-400 hover:text-white"
                        title="Settings"
                    >
                        <Settings size={20} />
                    </button>
                </div>

                <main className="flex-1 p-2 md:p-3 overflow-y-auto custom-scrollbar relative">
                    {children}
                </main>
            </div>

            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}

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
        </div>
    );
}
