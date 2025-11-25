import React, { useState } from 'react';
import { Menu, Settings } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useGameState } from '../hooks/useGameState';
import { SettingsModal } from './SettingsModal';
import type { GameMode } from '../types';

interface LayoutProps {
    children: React.ReactNode;
    gameState: ReturnType<typeof useGameState>;
    currentMode: GameMode;
    onModeSwitch: (mode: GameMode) => void;
}

export function Layout({ children, gameState, currentMode, onModeSwitch }: LayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

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
                    <button
                        onClick={() => setShowSettingsModal(true)}
                        className="p-2 -mr-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <Settings size={24} />
                    </button>
                </header>

                {/* Desktop Settings Button (Absolute positioned) */}
                <div className="hidden md:block absolute top-4 right-4 z-40">
                    <button
                        onClick={() => setShowSettingsModal(true)}
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

            {showSettingsModal && (
                <SettingsModal onClose={() => setShowSettingsModal(false)} />
            )}
        </div>
    );
}
