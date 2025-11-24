import { useState } from 'react';
import { Layout } from './components/Layout';
import { GameArea } from './components/GameArea';
import { ArcadeGameArea } from './components/ArcadeGameArea';
import { useGameState } from './hooks/useGameState';
import { useArcadeState } from './hooks/useArcadeState';

type GameMode = 'standard' | 'arcade';

function App() {
  const [mode, setMode] = useState<GameMode>('standard');
  const gameState = useGameState();
  const { currentGame, currentProgress, games, submitGuess, nextLevel } = gameState;

  const arcadeState = useArcadeState(games);

  if (!currentGame && mode === 'standard') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-white">
        <div className="animate-pulse">Loading game data...</div>
      </div>
    );
  }

  return (
    <Layout gameState={gameState}>
      <div className="flex justify-center mb-4">
        <div className="bg-gray-800 p-1 rounded-lg flex gap-1">
          <button
            onClick={() => setMode('standard')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${mode === 'standard' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
          >
            Standard
          </button>
          <button
            onClick={() => setMode('arcade')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${mode === 'arcade' ? 'bg-slate-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
          >
            Endless
          </button>
        </div>
      </div>

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
          />
        )
      )}
    </Layout>
  );
}

export default App;
