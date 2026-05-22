import { useState, useEffect } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { userApi } from "../../../../api/cipherQuestApi";
import {
  getCaesarLevelData, getCaesarGameType,
  getVigenereLevelData, getVigenereGameType,
  getPlayfairLevelData, getPlayfairGameType,
} from "../engine/levelData";

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
  const [progress, setProgress] = useState(defaultProgress());

  const [category,   setCategory]   = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [currentStage, setCurrentStage] = useState(null);

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
      gameType  = getVigenereGameType();
    } else {
      levelData = getPlayfairLevelData(diff, stageIndex);
      gameType  = getPlayfairGameType();
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
  };

  const replayCurrentStage = () => {
    if (!currentStage) return;
    const { category: cat, difficulty: diff, stageIndex } = currentStage;
    startStage(cat, diff, stageIndex);
  };

  const goToCategories   = () => { setCategory(null); setDifficulty(null); setCurrentStage(null); };
  const selectCategory   = (cat)  => { setCategory(cat); setDifficulty(null); };
  const selectDifficulty = (diff) => setDifficulty(diff);
  const backToDifficulty = () => { setDifficulty(null); setCurrentStage(null); };
  const backToStages     = () => setCurrentStage(null);

  return {
    progress,
    category, difficulty, currentStage,
    isUnlocked, isStageCompleted,
    startStage, completeStage, replayCurrentStage,
    goToCategories, selectCategory, selectDifficulty,
    backToDifficulty, backToStages,
  };
}