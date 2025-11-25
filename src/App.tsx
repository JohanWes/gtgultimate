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
  const { currentGame, currentProgress, games, submitGuess, nextLevel } = gameState;

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

  if (!currentGame && mode === 'standard') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-white">
        <div className="animate-pulse">Loading game data...</div>
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
