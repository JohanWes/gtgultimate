import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/PageTransition';
import { Layout } from './components/Layout';
import { GameArea } from './components/GameArea';
import { EndlessGameArea } from './components/EndlessGameArea';
import { HighScoreModal } from './components/HighScoreModal';
import { TutorialModal } from './components/TutorialModal';
import { useGameState } from './hooks/useGameState';
import { useEndlessState } from './hooks/useEndlessState';
import { useEndlessStats } from './hooks/useEndlessStats';
import { useSettings } from './hooks/useSettings';
import { useFullscreen } from './hooks/useFullscreen';
import { useHorseGameState } from './hooks/useHorseGameState';
import type { Game, GameMode } from './types';

import { RunSummary } from './components/RunSummary';

function App() {
  const [mode, setMode] = useState<GameMode>('standard');
  const [showHighScoreModal, setShowHighScoreModal] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isHorseMode, setIsHorseMode] = useState(false);
  const [isHorseLoading, setIsHorseLoading] = useState(false);
  const [horseGames, setHorseGames] = useState<Game[]>([]);
  const [horseSessionKey, setHorseSessionKey] = useState(0);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const gameState = useGameState();
  const { games, isLoading, error } = gameState;
  const horseGameState = useHorseGameState(horseGames, horseSessionKey);

  const endlessState = useEndlessState(games);
  const endlessStats = useEndlessStats();

  // Track stats when endless history changes
  const prevHistoryLength = useRef(endlessState.state.history.length);
  useEffect(() => {
    const history = endlessState.state.history;
    if (history.length > prevHistoryLength.current) {
      // New entry added
      const lastEntry = history[history.length - 1];
      const game = games.find(g => g.id === lastEntry.gameId);
      if (game) {
        const wasCorrect = lastEntry.status === 'won';
        // Guess count: for 'won', it's the score divided by points (approximation)
        // Better: count guesses from the result. For skipped/lost, we don't count guess distribution.
        // The score tells us: 5pts= 1 guess, 4= 2, 3= 3, 2= 4, 1= 5
        // But with hot streak it doubles. Let's just use a rough estimate.
        // Actually, let's find the guess count from the current state's guesses at time of win.
        // Since the history entry is added at the moment of result, we can approximate:
        // Score 5 = guess 1, 4 = guess 2, 3 = guess 3, 2 = guess 4, 1 = guess 5 (ignoring hot streak)
        let guessCount = 5;
        if (wasCorrect && lastEntry.score > 0) {
          const baseScore = lastEntry.score <= 5 ? lastEntry.score : Math.ceil(lastEntry.score / 2);
          guessCount = Math.max(1, 6 - baseScore);
        }
        endlessStats.recordResult(game, wasCorrect, guessCount);
      }
    }
    prevHistoryLength.current = history.length;
  }, [endlessState.state.history, games, endlessStats]);

  // Tutorial state from settings context
  const { isTutorialOpen, setIsTutorialOpen, markTutorialSeen, settings } = useSettings();

  // Apply theme
  useEffect(() => {
    document.body.dataset.theme = settings.theme;
  }, [settings.theme]);

  const activateHorseMode = async () => {
    if (isHorseLoading) return;

    const confirmed = window.confirm('Are you sure? This will end the round');
    if (!confirmed) return;

    try {
      setIsHorseLoading(true);
      const response = await fetch('/api/games?pool=horse');
      if (!response.ok) {
        throw new Error('Failed to load horse games');
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No horse games found');
      }

      setHorseGames(data as Game[]);
      setHorseSessionKey(prev => prev + 1);
      setMode('standard');
      setIsHorseMode(true);
      setIsStatsOpen(false);
      setShowHighScoreModal(false);
    } catch (err) {
      console.error('Failed to activate horse mode:', err);
      alert('Horse mode is unavailable right now.');
    } finally {
      setIsHorseLoading(false);
    }
  };

  const handleModeSwitch = (newMode: GameMode) => {
    if (isHorseMode) {
      setIsHorseMode(false);
      setMode(newMode);
      return;
    }

    if (mode === newMode) return;
    setMode(newMode);
  };

  const handleModalClose = () => {
    setShowHighScoreModal(false);
  };

  const handlePlayAgain = () => {
    setShowHighScoreModal(false);
    endlessState.nextLevel();
  };

  const handleRequestHighScore = () => {
    // Only show the modal if it hasn't been shown yet for this game over
    if (!endlessState.state.highScoreModalShown) {
      setShowHighScoreModal(true);
      endlessState.markHighScoreModalShown();
    } else {
      // If already shown, just restart the game
      endlessState.nextLevel();
    }
  };

  // URL Routing for Share Page
  // Simple check for path: /share/[id]
  const [shareId, setShareId] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      // Extract ID
      const id = path.split('/share/')[1];
      if (id) {
        setShareId(id);
      }
    }
  }, []);

  const handleExitShareMode = () => {
    // Clear URL and return to standard mode
    window.history.pushState({}, '', '/');
    setShareId(null);
    setMode('standard'); // Or endless if preferred, but standard is default landing
  };

  const previousHorseStatusRef = useRef<'playing' | 'won' | 'lost'>('playing');
  useEffect(() => {
    if (!isHorseMode) {
      previousHorseStatusRef.current = 'playing';
      return;
    }

    const status = horseGameState.currentProgress?.status ?? 'playing';
    if (status === 'won' && previousHorseStatusRef.current !== 'won') {
      const audio = new Audio('/sounds/horse-neighing-sound-effect.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => null);
    }
    previousHorseStatusRef.current = status;
  }, [isHorseMode, horseGameState.currentProgress?.status]);

  const activeStandardState = isHorseMode ? horseGameState : gameState;
  const activeStandardLoading = isHorseMode
    ? (isHorseLoading || horseGameState.totalLevels === 0)
    : isLoading;

  if (shareId) {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-white">
          <div className="animate-pulse text-xl">Loading...</div>
        </div>
      );
    }
    return <RunSummary runId={shareId} allGames={games} onPlay={handleExitShareMode} />;
  }

  // Removed global loading check to allow inline loading
  // if (isLoading) { ... }

  if (!isHorseMode && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-error">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Error Loading Data</h1>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout
      gameState={activeStandardState}
      currentMode={mode}
      onModeSwitch={handleModeSwitch}
      isHorseMode={isHorseMode}
      isFullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
      isStatsOpen={isStatsOpen}
      onStatsOpenChange={setIsStatsOpen}
      endlessStats={{
        stats: endlessStats.stats,
        totalGames: endlessStats.totalGames,
        winRate: endlessStats.winRate,
        averageGuesses: endlessStats.averageGuesses,
        resetStats: endlessStats.resetStats,
      }}
    >

      <AnimatePresence mode="wait">
        {mode === 'standard' ? (
          (activeStandardState.currentGame || activeStandardLoading) && (
            <PageTransition key="standard" className="h-full">
              <GameArea
                game={activeStandardState.currentGame || null}
                allGames={activeStandardState.games}
                guesses={activeStandardState.currentProgress?.guesses || []}
                status={activeStandardState.currentProgress?.status || 'playing'}
                allProgress={activeStandardState.allProgress}
                onGuess={activeStandardState.submitGuess}
                onSkip={activeStandardState.skipGuess}
                onNextLevel={activeStandardState.nextLevel}
                onHorseTrigger={isHorseMode ? undefined : activateHorseMode}
                isLoading={activeStandardLoading}
                isFullscreen={isFullscreen}
              />
            </PageTransition>
          )
        ) : (
          (endlessState.currentGame || isLoading) && (
            <PageTransition key="endless" className="h-full">
              <EndlessGameArea
                game={endlessState.currentGame || null}
                allGames={games}
                state={endlessState.state}
                onGuess={endlessState.submitGuess}
                onSkip={endlessState.skipGuess}
                onNextLevel={endlessState.nextLevel}
                onUseLifeline={endlessState.useLifeline}
                onBuyShopItem={endlessState.buyShopItem}
                onBonusGuess={endlessState.submitBonusGuess}
                onRequestHighScore={handleRequestHighScore}
                isHighScoreModalOpen={showHighScoreModal}
                onMarkShopVisited={endlessState.markShopVisited}
                isStatsOpen={isStatsOpen}
                onHorseTrigger={activateHorseMode}
                isLoading={isLoading}
                isFullscreen={isFullscreen}
              />
            </PageTransition>
          )
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHighScoreModal && (
          <HighScoreModal
            score={endlessState.state.score}
            onPlayAgain={handlePlayAgain}
            onClose={handleModalClose}
            runData={{
              history: endlessState.state.history,
              totalScore: endlessState.state.score,
              totalGames: endlessState.state.history.length
            }}
          />
        )}
      </AnimatePresence>

      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => {
          setIsTutorialOpen(false);
          markTutorialSeen();
        }}
        onComplete={markTutorialSeen}
      />
    </Layout>
  );
}

export default App;
