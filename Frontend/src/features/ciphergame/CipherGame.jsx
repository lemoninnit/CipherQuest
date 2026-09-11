import { Navigate } from "react-router-dom";
import "./CipherGame.css";

import { useGameFlow } from "./core/hooks/useGameFlow";

// UI selectors
// CategorySelector kept in codebase for potential future use
// import CategorySelector  from "./ui/CategorySelector";
import DifficultySelector from "./ui/DifficultySelector";
import StageRoadmap      from "./features/stages/StageRoadmap";
import StageLoadingScreen from "./ui/StageLoadingScreen";

// Caesar games
import CaesarFishingGame from "./features/caesar/CaesarFishingGame";
import PacmanGame        from "./features/pacman/PacmanGame";
import CipherSprint      from "./features/sprint/CipherSprint";

// Vigenere games
import VigenereFishingGame from "./features/vigenere/VigenereFishingGame";
import VigenereSprint      from "./features/vigenere/VigenereSprint";

// Playfair games
import PlayfairFishingGame from "./features/playfair/PlayfairFishingGame";
import PlayfairSprint      from "./features/playfair/PlayfairSprint";

export default function CipherGame() {
  const game = useGameFlow();
  const {
    category, difficulty, currentStage,
    progress,
    goToCategories, selectDifficulty,
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

    let gameComponent = null;
    switch (gameType) {
      case 'FISHING':
        if (category === 'caesar') {
          gameComponent = <CaesarFishingGame {...sharedProps} />;
        } else if (category === 'vigenere') {
          gameComponent = <VigenereFishingGame {...sharedProps} />;
        } else if (category === 'playfair') {
          gameComponent = <PlayfairFishingGame {...sharedProps} />;
        }
        break;
      case 'PACMAN':
        gameComponent = <PacmanGame {...sharedProps} />;
        break;
      case 'SPRINT':
        if (category === 'caesar') {
          gameComponent = <CipherSprint {...sharedProps} />;
        } else if (category === 'vigenere') {
          gameComponent = <VigenereSprint {...sharedProps} />;
        } else if (category === 'playfair') {
          gameComponent = <PlayfairSprint {...sharedProps} />;
        }
        break;
      case 'PLAYFAIR_FISHING':
        gameComponent = <PlayfairFishingGame {...sharedProps} />;
        break;
      default:
        gameComponent = (
          <div className="cipher-container">
            <p style={{ color: '#f87171' }}>Unknown game type: {gameType}</p>
            <button onClick={backToStages}>Back</button>
          </div>
        );
    }

    return <div className="cq-page-fade-in">{gameComponent}</div>;
  }

  /* ─── Selector Screens (Difficulty & Stage Roadmap) ─── */
  if (category) {
    return (
      <div className="cipher-container">
        {/* 21:9 Ratio Background Image */}
        <img
          className="cq-bg-img"
          src="/assets/fish/lobbybg/lobbybg.png"
          alt="Lobby Background"
          aria-hidden="true"
        />

        {difficulty ? (
          <StageRoadmap game={game} />
        ) : (
          <DifficultySelector
            activeCategory={category}
            completedLevels={progress}
            onSelectDifficulty={selectDifficulty}
            onBack={goToCategories}
          />
        )}
      </div>
    );
  }

  /* ─── Fallback redirect to dashboard when no category selected ─── */
  return <Navigate to="/dashboard" replace />;
}
