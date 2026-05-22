import "./CipherGame.css";

import { useGameFlow } from "./core/hooks/useGameFlow";

// UI selectors
import CategorySelector  from "./ui/CategorySelector";
import DifficultySelector from "./ui/DifficultySelector";
import StageRoadmap      from "./features/stages/StageRoadmap";

// Caesar games
import CaesarFishingGame from "./features/caesar/CaesarFishingGame";
import PacmanGame        from "./features/pacman/PacmanGame";
import CipherSprint      from "./features/sprint/CipherSprint";

// Vigenere game (its own fishing)
import VigenereGame      from "./features/vigenere/VigenereGame";

// Playfair game
import PlayfairFishingGame from "./features/playfair/PlayfairFishingGame";

export default function CipherGame() {
  const game = useGameFlow();
  const {
    category, difficulty, currentStage,
    progress,
    goToCategories, selectCategory, selectDifficulty,
    completeStage, backToStages, replayCurrentStage,
  } = game;

  /* ─── Active game renderer ─── */
  if (currentStage) {
    const { gameType, levelData, difficulty: tier } = currentStage;

    const sharedProps = {
      levelData,
      tier,
      onBackToStages: backToStages,
      onVerifySubmit: completeStage,
      onReplayNewQuestion: replayCurrentStage,
    };

    switch (gameType) {
      case 'FISHING':
        return <CaesarFishingGame {...sharedProps} />;
      case 'PACMAN':
        return <PacmanGame {...sharedProps} />;
      case 'SPRINT':
        return <CipherSprint {...sharedProps} />;
      case 'VIGENERE_FISHING':
        return <VigenereGame {...sharedProps} />;
      case 'PLAYFAIR_FISHING':
        return <PlayfairFishingGame {...sharedProps} />;
      default:
        return (
          <div className="cipher-container">
            <p style={{ color: '#f87171' }}>Unknown game type: {gameType}</p>
            <button onClick={backToStages}>Back</button>
          </div>
        );
    }
  }

  /* ─── Stage roadmap ─── */
  if (category && difficulty) {
    return (
      <div className="cipher-container">
        <StageRoadmap game={game} />
      </div>
    );
  }

  /* ─── Difficulty selector ─── */
  if (category) {
    return (
      <div className="cipher-container">
        <DifficultySelector
          activeCategory={category}
          completedLevels={progress}
          onSelectDifficulty={selectDifficulty}
          onBack={goToCategories}
        />
      </div>
    );
  }

  /* ─── Category selector (landing) ─── */
  return (
    <div className="cipher-container">
      <CategorySelector onSelectCategory={selectCategory} />
    </div>
  );
}
