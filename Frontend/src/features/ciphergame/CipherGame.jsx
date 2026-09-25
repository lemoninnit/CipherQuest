/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import "./CipherGame.css";

import { useAuth } from "../../context/AuthContext";
import { userApi } from "../../api/cipherQuestApi";
import { useGameFlow } from "./core/hooks/useGameFlow";
import { ScoringProvider } from "./core/hooks/ScoringContext";

// UI selectors
import DifficultySelector from "./ui/DifficultySelector";
import StageRoadmap      from "./features/stages/StageRoadmap";
import CompletionModal    from "./ui/CompletionModal";
import StageScoreModal    from "./ui/StageScoreModal";
import StageLeaderboard   from "./ui/StageLeaderboard";
import StageFailNotice    from "./ui/StageFailNotice";

// Caesar, Vigenere & Playfair tutorials
import CaesarTutorialModal from "./features/caesar/CaesarTutorialModal";
import VigenereTutorialModal from "./features/vigenere/VigenereTutorialModal";
import PlayfairTutorialModal from "./features/playfair/PlayfairTutorialModal";

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
  const location = useLocation();
  const [showCaesarTutorial, setShowCaesarTutorial] = useState(false);
  const [showVigenereTutorial, setShowVigenereTutorial] = useState(false);
  const [showPlayfairTutorial, setShowPlayfairTutorial] = useState(false);
  const handledCategorySelectionRef = useRef(null);

  // Auto-open strictly on category selection from Dashboard
  useEffect(() => {
    if (location.state?.showTutorial) {
      const activeCat = location.state?.category || game.category;
      if (!activeCat) return;

      const navKey = `${activeCat}-${location.key || location.search || 'entry'}`;
      if (handledCategorySelectionRef.current === navKey) {
        return;
      }
      handledCategorySelectionRef.current = navKey;

      // Clear the showTutorial flag from history state so it cannot re-trigger during in-cipher actions
      try {
        if (window.history?.replaceState) {
          const currentState = window.history.state || {};
          window.history.replaceState(
            {
              ...currentState,
              usr: { ...(currentState.usr || {}), category: activeCat, showTutorial: false },
            },
            ''
          );
        }
      } catch {
        // ignore history state write errors
      }

      let isCancelled = false;

      const checkAndTriggerTutorial = async () => {
        let isDismissed;
        try {
          if (user?.tutorialDismissed && typeof user.tutorialDismissed[activeCat] === 'boolean') {
            isDismissed = user.tutorialDismissed[activeCat];
          } else {
            const prefs = await userApi.getTutorialPreferences();
            isDismissed = Boolean(prefs?.[activeCat]);
          }
        } catch (err) {
          console.warn("Failed to fetch tutorial preference, falling back to showing tutorial:", err);
          isDismissed = false;
        }

        if (isCancelled) return;

        if (!isDismissed) {
          if (activeCat === 'caesar') setShowCaesarTutorial(true);
          else if (activeCat === 'vigenere') setShowVigenereTutorial(true);
          else if (activeCat === 'playfair') setShowPlayfairTutorial(true);
        }
      };

      checkAndTriggerTutorial();

      return () => {
        isCancelled = true;
      };
    }
  }, [location.key, location.state?.showTutorial, location.state?.category]);

  const handleOpenManual = (cat) => {
    const targetCat = cat || game.category;
    if (targetCat === 'caesar') setShowCaesarTutorial(true);
    else if (targetCat === 'vigenere') setShowVigenereTutorial(true);
    else if (targetCat === 'playfair') setShowPlayfairTutorial(true);
  };

  const {
    category, difficulty, currentStage,
    progress, completionModalData,
    goToCategories, selectDifficulty,
    startStage, startStageTimer,
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
    const stageIdx = stageResult?.stageIndex ?? currentStage?.stageIndex;

    dismissStageResult();

    if (typeof stageIdx === 'number' && stageIdx >= 0 && stageIdx < 4) {
      // Auto-advance directly to the next stage (Stage 1 -> 2 -> 3 -> 4 -> 5)
      startStage(cat, diff, stageIdx + 1);
    } else if (returnToRoadmap) {
      // Last stage of tier (stageIndex >= 4): route to roadmap with tier complete
      returnToRoadmap(cat, diff);
    } else {
      if (cat) game.selectCategory?.(cat);
      if (diff) selectDifficulty(diff);
      backToStages();
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
      onStartStageTimer: startStageTimer,
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
            onBack={() => returnToRoadmap(stageResult.category || category, stageResult.difficulty || difficulty)}
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
          <StageRoadmap game={game} onOpenTutorial={() => handleOpenManual(category)} />
        ) : (
          <DifficultySelector
            activeCategory={category}
            completedLevels={progress}
            onSelectDifficulty={selectDifficulty}
            onBack={goToCategories}
            onOpenTutorial={() => handleOpenManual(category)}
          />
        )}

        {/* Modal sequencing on selector screens */}
        {stageResult ? (
          <StageScoreModal
            result={stageResult}
            onContinue={handleContinueFromScore}
            onBack={() => returnToRoadmap(stageResult.category || category, stageResult.difficulty || difficulty)}
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

        {/* Caesar Tutorial Modal */}
        <CaesarTutorialModal
          isOpen={showCaesarTutorial}
          onClose={() => setShowCaesarTutorial(false)}
        />

        {/* Vigenere Tutorial Modal */}
        <VigenereTutorialModal
          isOpen={showVigenereTutorial}
          onClose={() => setShowVigenereTutorial(false)}
        />

        {/* Playfair Tutorial Modal */}
        <PlayfairTutorialModal
          isOpen={showPlayfairTutorial}
          onClose={() => setShowPlayfairTutorial(false)}
        />
      </div>
    );
  }

  /* ─── Fallback redirect to dashboard when no category selected ─── */
  return <Navigate to="/dashboard" replace />;
}
