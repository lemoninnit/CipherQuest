import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../../../context/AuthContext";
import { userApi } from "../../../../api/cipherQuestApi";
import {
  getCaesarLevelData, getCaesarGameType,
  getVigenereLevelData, getVigenereGameType,
  getPlayfairLevelData, getPlayfairGameType,
} from "../engine/levelData";

const VALID_CATEGORIES = ['caesar', 'vigenere', 'playfair'];

const defaultProgress = () => ({
  caesar:   { easy: [], medium: [], hard: [] },
  vigenere: { easy: [], medium: [], hard: [] },
  playfair: { easy: [], medium: [], hard: [] },
});

const convertBackendProgress = (backendMap) => {
  const result = defaultProgress();
  if (!backendMap) return result;
  
  for (const [cipher, diffMap] of Object.entries(backendMap)) {
    const frontendCipher = cipher.toLowerCase();
    if (!result[frontendCipher]) continue;
    
    for (const [diff, levels] of Object.entries(diffMap)) {
      const frontendDiff = diff.toLowerCase();
      if (!result[frontendCipher][frontendDiff]) continue;
      
      result[frontendCipher][frontendDiff] = levels.map(
        levelIndex => `${frontendCipher}-${frontendDiff}-${levelIndex}`
      );
    }
  }
  return result;
};

export function useGameFlow() {
  const { user, refreshProfile } = useAuth();
  const location = useLocation();
  const routeCategory = location.state?.category;
  const initialCategory = VALID_CATEGORIES.includes(routeCategory) ? routeCategory : null;

  const [progress, setProgress] = useState(defaultProgress());

  const [category,   setCategory]   = useState(initialCategory);
  const [difficulty, setDifficulty] = useState(null);
  const [currentStage, setCurrentStage] = useState(null);
  const [loadingTargetStage, setLoadingTargetStage] = useState(null);

  // Sync progress state when user or user progress map changes
  useEffect(() => {
    if (user) {
      const map = user.progress || user.progressMap;
      if (map) {
        setProgress(convertBackendProgress(map));
      }
    }
  }, [user]);

  const isUnlocked = (cat, diff) => {
    return true;
  };

  const isStageCompleted = (cat, diff, stageIndex) => {
    const stageId = `${cat}-${diff}-${stageIndex}`;
    return (progress[cat]?.[diff] ?? []).includes(stageId);
  };

  const startStage = (cat, diff, stageIndex) => {
    let levelData, gameType;
    if (cat === 'caesar') {
      levelData = getCaesarLevelData(diff, stageIndex);
      gameType  = getCaesarGameType(stageIndex);
    } else if (cat === 'vigenere') {
      levelData = getVigenereLevelData(diff, stageIndex);
      gameType  = getVigenereGameType(stageIndex);
    } else {
      levelData = getPlayfairLevelData(diff, stageIndex);
      gameType  = getPlayfairGameType(stageIndex);
    }
    setCurrentStage({
      id: `${cat}-${diff}-${stageIndex}`,
      category: cat,
      difficulty: diff,
      stageIndex,
      gameType,
      levelData,
    });
  };

  const finishLoadingStage = () => {
    if (loadingTargetStage) {
      setCurrentStage(loadingTargetStage);
      setLoadingTargetStage(null);
    }
  };

  const completeStage = async () => {
    if (!currentStage) return;
    const { category: cat, difficulty: diff, stageIndex, id } = currentStage;
    try {
      const response = await userApi.saveProgress(cat, diff, stageIndex);
      if (response && response.progressMap) {
        setProgress(convertBackendProgress(response.progressMap));
      }
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err) {
      console.error("Failed to save progress to backend:", err);
      // Fallback local update if API fails (offline mode)
      setProgress(prev => {
        const catProg = prev[cat] || { easy: [], medium: [], hard: [] };
        const diffArr = catProg[diff] || [];
        const next = {
          ...prev,
          [cat]: {
            ...catProg,
            [diff]: diffArr.includes(id) ? diffArr : [...diffArr, id],
          },
        };
        try { localStorage.setItem("cipher_progress_v2", JSON.stringify(next)); } catch {}
        return next;
      });
    }
    setCurrentStage(null);
    setLoadingTargetStage(null);
  };

  const replayCurrentStage = () => {
    if (!currentStage) return;
    const { category: cat, difficulty: diff, stageIndex } = currentStage;
    startStage(cat, diff, stageIndex);
  };

  const goToCategories   = () => { setCategory(null); setDifficulty(null); setCurrentStage(null); setLoadingTargetStage(null); };
  const selectCategory   = (cat)  => { setCategory(cat); setDifficulty(null); setLoadingTargetStage(null); };
  const selectDifficulty = (diff) => { setDifficulty(diff); setLoadingTargetStage(null); };
  const backToDifficulty = () => { setDifficulty(null); setCurrentStage(null); setLoadingTargetStage(null); };
  const backToStages     = () => { setCurrentStage(null); setLoadingTargetStage(null); };

  return {
    progress,
    category, difficulty, currentStage, loadingTargetStage,
    isUnlocked, isStageCompleted,
    startStage, finishLoadingStage, completeStage, replayCurrentStage,
    goToCategories, selectCategory, selectDifficulty,
    backToDifficulty, backToStages,
  };
}