import { Navigate } from "react-router-dom";
import "./CipherGame.css";

import { useAuth } from "../../context/AuthContext";
import { useGameFlow } from "./core/hooks/useGameFlow";
import { ScoringProvider } from "./core/hooks/ScoringContext";

// UI selectors
import DifficultySelector from "./ui/DifficultySelector";
import StageRoadmap      from "./features/stages/StageRoadmap";
import CompletionModal    from "./ui/CompletionModal";
import StageScoreModal    from "./ui/StageScoreModal";
import StageLeaderboard   from "./ui/StageLeaderboard";
import StageFailNotice    from "./ui/StageFailNotice";

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
  const { user } = useAuth();
  const {
    category, difficulty, currentStage,
    progress, completionModalData,
    goToCategories, selectDifficulty,
    startStage,
    completeStage, backToStages, replayCurrentStage,
    handleContinueNextDifficulty, handleCloseCompletionModal,
    returnToRoadmap,
    // SCORING SYSTEM
    stageStartedAt, stageResult, dismissStageResult, failStage,
    stageFailNotice, dismissStageFailNotice,
    leaderboardStage, openStageLeaderboard, closeStageLeaderboard,
  } = game;

  const handleContinueFromScore = () => {
    const cat = stageResult?.category || category;
    const diff = stageResult?.difficulty || difficulty;
    dismissStageResult();

    // If completion modal data is pending (e.g. tier finished), let CompletionModal show next
    if (!completionModalData) {
      if (returnToRoadmap) {
        returnToRoadmap(cat, diff);
      } else {
        if (cat) game.selectCategory?.(cat);
        if (diff) selectDifficulty(diff);
        backToStages();
      }
    }
  };

  /* ─── Active game renderer ─── */
  if (currentStage) {
    const { gameType, levelData, difficulty: tier } = currentStage;

    const sharedProps = {
      levelData,
      tier,
      onBackToStages: backToStages,
      onVerifySubmit: completeStage,
      onReplayNewQuestion: replayCurrentStage,
      // SCORING SYSTEM: games call this when the player fails (streak reset)
      onStageFail: failStage,
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

    return (
      <div className="cq-page-fade-in">
        <ScoringProvider
          stageStartedAt={stageStartedAt}
          totalScore={user?.totalScore ?? 0}
          streak={user?.gameStreak ?? 0}
        >
          {gameComponent}
        </ScoringProvider>
        
        {/* SCORING SYSTEM: StageScoreModal pops up FIRST before CompletionModal */}
        {stageResult ? (
          <StageScoreModal
            result={stageResult}
            onContinue={handleContinueFromScore}
            onViewLeaderboard={() => openStageLeaderboard(
              stageResult.category, stageResult.difficulty, stageResult.stageIndex)}
            onReplay={() => {
              const { category: cat, difficulty: diff, stageIndex } = stageResult;
              dismissStageResult();
              startStage(cat, diff, stageIndex);
            }}
          />
        ) : completionModalData ? (
          <CompletionModal
            modalData={completionModalData}
            onContinueNext={handleContinueNextDifficulty}
            onMainMenu={handleCloseCompletionModal}
          />
        ) : null}

        {/* SCORING SYSTEM: failure feedback (no score, streak reset) */}
        <StageFailNotice notice={stageFailNotice} onDismiss={dismissStageFailNotice} />

        {/* SCORING SYSTEM: per-stage HIGHEST SCORE / FASTEST TIME rankings */}
        {leaderboardStage && (
          <StageLeaderboard stage={leaderboardStage} onClose={closeStageLeaderboard} />
        )}
      </div>
    );
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

        {/* Modal sequencing on selector screens */}
        {stageResult ? (
          <StageScoreModal
            result={stageResult}
            onContinue={handleContinueFromScore}
            onViewLeaderboard={() => openStageLeaderboard(
              stageResult.category, stageResult.difficulty, stageResult.stageIndex)}
            onReplay={() => {
              const { category: cat, difficulty: diff, stageIndex } = stageResult;
              dismissStageResult();
              startStage(cat, diff, stageIndex);
            }}
          />
        ) : completionModalData ? (
          <CompletionModal
            modalData={completionModalData}
            onContinueNext={handleContinueNextDifficulty}
            onMainMenu={handleCloseCompletionModal}
          />
        ) : null}

        {/* SCORING SYSTEM: per-stage HIGHEST SCORE / FASTEST TIME rankings */}
        {leaderboardStage && (
          <StageLeaderboard stage={leaderboardStage} onClose={closeStageLeaderboard} />
        )}
      </div>
    );
  }

  /* ─── Fallback redirect to dashboard when no category selected ─── */
  return <Navigate to="/dashboard" replace />;
}
