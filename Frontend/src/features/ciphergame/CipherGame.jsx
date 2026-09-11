import { Navigate } from "react-router-dom";
import "./CipherGame.css";

import { useGameFlow } from "./core/hooks/useGameFlow";

// UI selectors
// CategorySelector kept in codebase for potential future use
// import CategorySelector  from "./ui/CategorySelector";
import DifficultySelector from "./ui/DifficultySelector";
import StageRoadmap      from "./features/stages/StageRoadmap";

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

    switch (gameType) {
      case 'FISHING':
        if (category === 'caesar') {
          return <CaesarFishingGame {...sharedProps} />;
        } else if (category === 'vigenere') {
          return <VigenereFishingGame {...sharedProps} />;
        } else if (category === 'playfair') {
          return <PlayfairFishingGame {...sharedProps} />;
        }
        break;
      case 'PACMAN':
        return <PacmanGame {...sharedProps} />;
      case 'SPRINT':
        if (category === 'caesar') {
          return <CipherSprint {...sharedProps} />;
        } else if (category === 'vigenere') {
          return <VigenereSprint {...sharedProps} />;
        } else if (category === 'playfair') {
          return <PlayfairSprint {...sharedProps} />;
        }
        break;
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

  /* ─── Selector screens (Stage Roadmap / Difficulty / Category) ─── */
  let selectorContent = null;
  if (category && difficulty) {
    selectorContent = <StageRoadmap game={game} />;
  } else if (category) {
    selectorContent = (
      <DifficultySelector
        activeCategory={category}
        completedLevels={progress}
        onSelectDifficulty={selectDifficulty}
        onBack={goToCategories}
      />
    );
  }

  if (selectorContent) {
    return (
      <div className="cipher-container">
        {/* Background Looping Fog Video: Atmospheric blurred background fill for wide screens */}
        <video
          className="cq-bg-video cq-bg-video-blur"
          src="/assets/fish/lobbybg/lobby-bg.mp4"
          poster="/assets/fish/lobbybg/lobbybg.png"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        />

        {/* Foreground sharp video showing full uncropped frame */}
        <video
          className="cq-bg-video cq-bg-video-contain"
          src="/assets/fish/lobbybg/lobby-bg.mp4"
          poster="/assets/fish/lobbybg/lobbybg.png"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        />

        {selectorContent}
      </div>
    );
  }

  /* ─── Fallback redirect to dashboard when no category selected ─── */
  return <Navigate to="/dashboard" replace />;
}
