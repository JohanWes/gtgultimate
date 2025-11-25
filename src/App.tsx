import { useState } from 'react';
import { Layout } from './components/Layout';
import { GameArea } from './components/GameArea';
import { ArcadeGameArea } from './components/ArcadeGameArea';
import { HighScoreModal } from './components/HighScoreModal';
import { useGameState } from './hooks/useGameState';
import { useArcadeState } from './hooks/useArcadeState';
import type { GameMode } from './types';

function App() {
  const [mode, setMode] = useState<GameMode>('standard');
  const [showHighScoreModal, setShowHighScoreModal] = useState(false);

  const gameState = useGameState();
  const { currentGame, currentProgress, games, submitGuess, nextLevel } = gameState;

  const arcadeState = useArcadeState(games);

  const handleModeSwitch = (newMode: GameMode) => {
    if (mode === newMode) return;
    setMode(newMode);
  };

  const handleModalClose = () => {
    setShowHighScoreModal(false);
  };

  const handlePlayAgain = () => {
    setShowHighScoreModal(false);
    arcadeState.nextLevel();
  };

  const handleRequestHighScore = () => {
    // Only show the modal if it hasn't been shown yet for this game over
    if (!arcadeState.state.highScoreModalShown) {
      setShowHighScoreModal(true);
      arcadeState.markHighScoreModalShown();
    } else {
      // If already shown, just restart the game
      arcadeState.nextLevel();
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
        arcadeState.currentGame && (
          <ArcadeGameArea
            game={arcadeState.currentGame}
            allGames={games}
            state={arcadeState.state}
            onGuess={arcadeState.submitGuess}
            onSkip={arcadeState.skipGuess}
            onNextLevel={arcadeState.nextLevel}
            onUseLifeline={arcadeState.useLifeline}
            onBuyShopItem={arcadeState.buyShopItem}
            onRequestHighScore={handleRequestHighScore}
          />
        )
      )}

      {showHighScoreModal && (
        <HighScoreModal
          score={arcadeState.state.score}
          onPlayAgain={handlePlayAgain}
          onClose={handleModalClose}
        />
      )}
    </Layout>
  );
}

export default App;
