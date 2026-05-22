import { useState } from "react";
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

export function useGameFlow() {
  const [progress, setProgress] = useState(() => {
    try {
      const saved = localStorage.getItem("cipher_progress_v2");
      return saved ? JSON.parse(saved) : defaultProgress();
    } catch { return defaultProgress(); }
  });

  const [category,   setCategory]   = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [currentStage, setCurrentStage] = useState(null);

  const isUnlocked = (cat, diff) => {
    const catProg = progress[cat] || { easy: [], medium: [], hard: [] };
    if (diff === "easy")   return true;
    if (diff === "medium") return catProg.easy.length >= 5;
    if (diff === "hard")   return catProg.medium.length >= 5;
    return false;
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

  const completeStage = () => {
    if (!currentStage) return;
    const { category: cat, difficulty: diff, id } = currentStage;
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
    setCurrentStage(null);
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
    startStage, completeStage,
    goToCategories, selectCategory, selectDifficulty,
    backToDifficulty, backToStages,
  };
}