import { useState } from 'react';
import { Layout } from './components/Layout';
import { GameArea } from './components/GameArea';
import { EndlessGameArea } from './components/EndlessGameArea';
import { HighScoreModal } from './components/HighScoreModal';
import { useGameState } from './hooks/useGameState';
import { useEndlessState } from './hooks/useEndlessState';
import type { GameMode } from './types';

function App() {
  const [mode, setMode] = useState<GameMode>('standard');
  const [showHighScoreModal, setShowHighScoreModal] = useState(false);

  const gameState = useGameState();
  const { currentGame, currentProgress, games, submitGuess, nextLevel, isLoading, error } = gameState;

  const endlessState = useEndlessState(games);

  const handleModeSwitch = (newMode: GameMode) => {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-white">
        <div className="animate-pulse text-xl">Loading game data...</div>
      </div>
    );
  }

  if (error) {
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
      gameState={gameState}
      currentMode={mode}
      onModeSwitch={handleModeSwitch}
    >

      {mode === 'standard' ? (
        currentGame && (
          <GameArea
            game={currentGame}
            allGames={games}
            guesses={currentProgress.guesses}
            status={currentProgress.status}
            allProgress={gameState.allProgress}
            onGuess={submitGuess}
            onSkip={gameState.skipGuess}
            onNextLevel={nextLevel}
          />
        )
      ) : (
        endlessState.currentGame && (
          <EndlessGameArea
            game={endlessState.currentGame}
            allGames={games}
            state={endlessState.state}
            onGuess={endlessState.submitGuess}
            onSkip={endlessState.skipGuess}
            onNextLevel={endlessState.nextLevel}
            onUseLifeline={endlessState.useLifeline}
            onBuyShopItem={endlessState.buyShopItem}
            onRequestHighScore={handleRequestHighScore}
            isHighScoreModalOpen={showHighScoreModal}
          />
        )
      )}

      {showHighScoreModal && (
        <HighScoreModal
          score={endlessState.state.score}
          onPlayAgain={handlePlayAgain}
          onClose={handleModalClose}
        />
      )}
    </Layout>
  );
}

export default App;
