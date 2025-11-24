
import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useGameState } from '../hooks/useGameState';

interface LayoutProps {
    children: React.ReactNode;
    gameState: ReturnType<typeof useGameState>;
}

export function Layout({ children, gameState }: LayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background text-text flex">
            <Sidebar
                totalLevels={gameState.totalLevels}
                currentLevel={gameState.currentLevel}
                progress={gameState.allProgress}
                onSelectLevel={gameState.goToLevel}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
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
                    <div className="w-8" /> {/* Spacer for centering */}
                </header>

                <main className="flex-1 p-2 md:p-3 overflow-y-auto custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    );
}
