import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './PacmanGame.css';
import '../../CipherGame.css';

const CQS_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
import GameHudBar from '../../ui/GameHudBar';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import { pacmanSound } from './pacmanSound';
import PauseMenu from '../../ui/PauseMenu';
import StageLostScreen from '../../ui/StageLostScreen';
import CryptographicRecap from '../../ui/CryptographicRecap';
import VictoryConfetti from '../../ui/VictoryConfetti';
import { facingFromDir } from './pacmanWorld';
import { useFullscreen } from '../../core/hooks/useFullscreen';
import { useGameShortcuts } from '../../core/hooks/useGameShortcuts';
import { useStageSnapshotAutoSaver } from '../../core/engine/gameSnapshot';
import { describePlayfairRule, transformPlayfairPair } from '../playfair/PlayfairHelpers';

const EASY_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const DIR_VECTORS = {
  UP: { r: -1, c: 0 },
  DOWN: { r: 1, c: 0 },
  LEFT: { r: 0, c: -1 },
  RIGHT: { r: 0, c: 1 },
  NONE: { r: 0, c: 0 }
};

const charToIdx = (ch) => ch.charCodeAt(0) - 65;
const idxToChar = (n) => String.fromCharCode((((n % 26) + 26) % 26) + 65);

const tabulaRow = (keyLetter) => {
  const k = charToIdx(keyLetter);
  return Array.from({ length: 26 }, (_, i) => idxToChar(i + k));
};



const caesarShiftChar = (char, shift) => {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 + shift) % 26 + 26) % 26 + 65);
  }
  return char;
};

// Medium Grid: 11 rows x 23 columns (Authentic Courtyard Labyrinth with T-Junctions, Ghost Box, and Staggered Pillars)
const MEDIUM_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Hard Grid: 13 rows x 25 columns (High-Complexity Fortress Labyrinth with Winding Alleys & Guarded Central Chamber)
const HARD_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const getMazeGrid = (tier) => {
  const t = String(tier || 'easy').toLowerCase();
  if (t === 'hard') return HARD_GRID;
  if (t === 'medium') return MEDIUM_GRID;
  return EASY_GRID;
};

const getGhostStartPositions = (tier) => {
  const t = String(tier || 'easy').toLowerCase();
  if (t === 'hard') {
    return [
      { row: 11, col: 1, dir: { r: 0, c: 1 } },
      { row: 11, col: 23, dir: { r: 0, c: -1 } },
      { row: 1, col: 12, dir: { r: 1, c: 0 } },
      { row: 5, col: 11, dir: { r: 0, c: 1 } },
      { row: 1, col: 23, dir: { r: 0, c: -1 } },
      { row: 7, col: 12, dir: { r: 0, c: 1 } },
      { row: 5, col: 19, dir: { r: 0, c: -1 } },
      { row: 3, col: 5, dir: { r: 1, c: 0 } }
    ];
  }
  if (t === 'medium') {
    return [
      { row: 9, col: 1, dir: { r: 0, c: 1 } },
      { row: 9, col: 21, dir: { r: 0, c: -1 } },
      { row: 1, col: 11, dir: { r: 1, c: 0 } },
      { row: 5, col: 11, dir: { r: 0, c: 1 } },
      { row: 1, col: 21, dir: { r: 0, c: -1 } },
      { row: 7, col: 11, dir: { r: 0, c: 1 } },
      { row: 5, col: 17, dir: { r: 0, c: -1 } },
      { row: 3, col: 5, dir: { r: 1, c: 0 } }
    ];
  }
  return [
    { row: 7, col: 1, dir: { r: 0, c: 1 } },
    { row: 7, col: 19, dir: { r: 0, c: -1 } },
    { row: 1, col: 9, dir: { r: 1, c: 0 } },
    { row: 5, col: 4, dir: { r: 0, c: 1 } },
    { row: 1, col: 19, dir: { r: 0, c: -1 } },
    { row: 3, col: 9, dir: { r: 0, c: 1 } },
    { row: 5, col: 16, dir: { r: 0, c: -1 } },
    { row: 1, col: 5, dir: { r: 1, c: 0 } }
  ];
};

const MAX_ACTIVE_TARGET_GHOSTS = { easy: 8, medium: 8, hard: 8 };
// Decoy ghost count also scales gently with tier for a bit more challenge.
const DECOY_GHOST_COUNT = { easy: 2, medium: 2, hard: 2 };

// Pure utility to dynamically spawn pellets randomly on paths (mazeGrid[r][c] === 0)
// and never on walls or initial sprite positions, ensuring variety on resets.
const generateRandomPellets = (mazeGrid, ghostList, pacmanPos) => {
  const openSpaces = [];
  for (let r = 1; r < mazeGrid.length - 1; r++) {
    for (let c = 1; c < mazeGrid[r].length - 1; c++) {
      if (mazeGrid[r][c] === 0) {
        const isPacman = pacmanPos.row === r && pacmanPos.col === c;
        const isGhost = ghostList.some(g => g.row === r && g.col === c);
        if (!isPacman && !isGhost) {
          openSpaces.push({ row: r, col: c });
        }
      }
    }
  }

  // Shuffle candidate path spaces
  const shuffled = [...openSpaces].sort(() => Math.random() - 0.5);

  const initialPellets = [];

  // Spawn exactly one yellow skill pellet, NO normal yellow score dots
  if (shuffled[0]) {
    initialPellets.push({
      id: `skill-${Date.now()}-${Math.random()}`,
      value: 0,
      row: shuffled[0].row,
      col: shuffled[0].col,
      eaten: false,
      isSkill: true
    });
  }

  return initialPellets;
};

const getMask = (levelData, idx) => {
  if (!levelData) return true;
  if (levelData.fullMask && levelData.fullMask[idx] !== undefined) {
    return levelData.fullMask[idx];
  }
  let wordStart = 0;
  const words = (levelData.plaintext || '').split(' ');
  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    if (idx >= wordStart && idx < wordStart + word.length) {
      return levelData.masks?.[w]?.[idx - wordStart] ?? true;
    }
    wordStart += word.length + 1;
  }
  return true;
};

// Helper to extract all required target items for levelData
const getRequiredTargetItems = (levelData, tier) => {
  if (!levelData) return [];
  const isPlayfair = !!levelData.matrix;
  const normTier = String(tier || levelData.difficulty || 'easy').toLowerCase();
  if (isPlayfair) {
    const pairs = levelData.pairs || [];
    const maskedPairs = [];
    pairs.forEach((plainPair, i) => {
      const isHint = normTier !== 'hard' && (getMask(levelData, i * 2) || getMask(levelData, i * 2 + 1));
      if (!isHint) {
        maskedPairs.push({
          index: i,
          char: plainPair,
          id: `ghost-target-${i}`
        });
      }
    });
    if (maskedPairs.length === 0 && pairs.length > 0) {
      maskedPairs.push({
        index: pairs.length - 1,
        char: pairs[pairs.length - 1],
        id: `ghost-target-${pairs.length - 1}`
      });
    }
    return maskedPairs;
  }

  const maskedIndices = [];
  if (levelData && levelData.plaintext) {
    for (let i = 0; i < levelData.plaintext.length; i++) {
      const ch = levelData.plaintext[i];
      if (ch >= 'A' && ch <= 'Z') {
        if (!getMask(levelData, i)) {
          maskedIndices.push(i);
        }
      }
    }
  }

  return maskedIndices.map((idx) => ({
    index: idx,
    char: levelData.plaintext ? levelData.plaintext[idx] : '',
    id: `ghost-target-${idx}`
  }));
};

// Dynamically configure ghosts: capped active target letters + queue system + decoys.
const generateCaesarShiftCandidates = (trueShift, tier = 'easy', count = 4) => {
  const normTier = String(tier || 'easy').toLowerCase();
  const maxLimit = normTier === 'easy' ? 7 : normTier === 'medium' ? 14 : 24;
  const radius = normTier === 'easy' ? 4 : normTier === 'medium' ? 5 : 6;

  const correctVal = trueShift;
  const correctStr = correctVal > 0 ? `+${correctVal}` : `${correctVal}`;
  const correctNorm = ((correctVal % 26) + 26) % 26 || 1;

  const usedSigned = new Set([correctVal]);
  const candidates = [
    {
      signedVal: correctVal,
      shiftValue: correctNorm,
      char: correctStr,
      isCorrect: true,
    }
  ];

  // 1. Decoy with opposite sign if within limit
  const oppositeVal = -correctVal;
  if (!usedSigned.has(oppositeVal) && Math.abs(oppositeVal) <= maxLimit) {
    usedSigned.add(oppositeVal);
    candidates.push({
      signedVal: oppositeVal,
      shiftValue: Math.abs(oppositeVal),
      char: oppositeVal > 0 ? `+${oppositeVal}` : `${oppositeVal}`,
      isCorrect: false,
    });
  }

  // 2. Neighboring shift window around correctVal (e.g. ±1, ±2, ±3, ±4), clamped to maxLimit
  const neighborPool = [];
  for (let offset = 1; offset <= radius; offset++) {
    const valPlus = correctVal + offset;
    const valMinus = correctVal - offset;
    if (valPlus !== 0 && Math.abs(valPlus) <= maxLimit && !usedSigned.has(valPlus)) {
      neighborPool.push(valPlus);
    }
    if (valMinus !== 0 && Math.abs(valMinus) <= maxLimit && !usedSigned.has(valMinus)) {
      neighborPool.push(valMinus);
    }
    if (-valPlus !== 0 && Math.abs(-valPlus) <= maxLimit && !usedSigned.has(-valPlus)) {
      neighborPool.push(-valPlus);
    }
    if (-valMinus !== 0 && Math.abs(-valMinus) <= maxLimit && !usedSigned.has(-valMinus)) {
      neighborPool.push(-valMinus);
    }
  }

  const shuffledNeighbors = neighborPool.sort(() => Math.random() - 0.5);
  for (const val of shuffledNeighbors) {
    if (candidates.length >= count) break;
    if (!usedSigned.has(val)) {
      usedSigned.add(val);
      candidates.push({
        signedVal: val,
        shiftValue: Math.abs(val),
        char: val > 0 ? `+${val}` : `${val}`,
        isCorrect: false,
      });
    }
  }

  // Fallback within [-maxLimit, +maxLimit]
  let fb = 1;
  while (candidates.length < count && fb <= maxLimit) {
    for (const val of [fb, -fb]) {
      if (candidates.length >= count) break;
      if (!usedSigned.has(val) && val !== 0) {
        usedSigned.add(val);
        candidates.push({
          signedVal: val,
          shiftValue: Math.abs(val),
          char: val > 0 ? `+${val}` : `${val}`,
          isCorrect: false,
        });
      }
    }
    fb++;
  }

  return candidates.sort(() => Math.random() - 0.5);
};

const generateInitialGhosts = (levelData, tier) => {
  const normTier = String(tier || levelData?.tier || 'easy').toLowerCase();
  const startPositions = getGhostStartPositions(normTier);
  const isPlayfair = !!levelData.matrix;
  const isVigenere = !!levelData.targetKey;
  const isCaesar = !isPlayfair && !isVigenere;

  if (isCaesar) {
    // ── Caesar Shift Goblins (Mixed +/- candidate shift decision) ──
    const caesarTrueShift = levelData.targetShifts?.[0] ?? levelData.shift ?? levelData.targetShift ?? 1;
    const candidateCount = normTier === 'hard' ? 5 : 4;
    const candidates = generateCaesarShiftCandidates(caesarTrueShift, normTier, candidateCount);

    const ghosts = candidates.map((cand, i) => {
      const pos = startPositions[i % startPositions.length];
      return {
        id: `ghost-caesar-${cand.signedVal}-${i}`,
        char: cand.char,
        signedVal: cand.signedVal,
        shiftValue: cand.shiftValue,
        isCorrect: cand.isCorrect,
        index: cand.isCorrect ? 0 : -1,
        row: pos.row,
        col: pos.col,
        eaten: false,
        dying: false,
        dir: pos.dir || { r: 0, c: 1 }
      };
    });

    return { ghosts, queue: [] };
  }

  const maxActive = MAX_ACTIVE_TARGET_GHOSTS[normTier] || 8;
  const decoyCount = DECOY_GHOST_COUNT[normTier] || 2;
  const requiredTargets = getRequiredTargetItems(levelData, normTier);
  const activeTargets = requiredTargets.slice(0, maxActive);
  const queue = requiredTargets.slice(maxActive);

  const ghosts = activeTargets.map((item, i) => {
    const pos = startPositions[i % startPositions.length];
    return {
      ...item,
      row: pos.row,
      col: pos.col,
      eaten: false,
      dying: false,
      dir: pos.dir
    };
  });

  // ── Vigenère / Playfair: clustered decoy generation ──
  const alphabet = isPlayfair ? 'ABCDEFGHIKLMNOPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const targetLetters = requiredTargets.map(t => t.char);
  const ciphertextLetters = levelData?.ciphertext ? levelData.ciphertext.split('') : [];
  const plaintextLetters = levelData?.plaintext ? levelData.plaintext.split('') : [];
  const avoidLetters = new Set([...targetLetters, ...ciphertextLetters, ...plaintextLetters]);
  
  for (let i = 0; i < decoyCount; i++) {
    let decoyChar;
    if (isPlayfair) {
      const pairs = levelData?.pairs || [];
      const matrix = levelData?.matrix || [];
      const basePair = pairs[i % pairs.length] || 'AB';
      const decoys = [];
      const [a, b] = basePair;
      let posA = { r: 0, c: 0 }, posB = { r: 0, c: 0 };
      if (matrix.length === 5) {
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            if (matrix[r][c] === a) posA = { r, c };
            if (matrix[r][c] === b) posB = { r, c };
          }
        }
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1]]) {
          const nA = matrix[(posA.r + dr + 5) % 5][(posA.c + dc + 5) % 5];
          const nB = matrix[(posB.r + dr + 5) % 5][(posB.c + dc + 5) % 5];
          if (nA !== b) decoys.push(`${nA}${b}`);
          if (nB !== a) decoys.push(`${a}${nB}`);
          if (nA !== nB) decoys.push(`${nA}${nB}`);
        }
      }
      const validDecoys = decoys.filter(d => !pairs.includes(d));
      decoyChar = validDecoys[Math.floor(Math.random() * validDecoys.length)] || `${b}${a}`;
    } else {
      const primaryTarget = targetLetters[i % targetLetters.length] || 'A';
      const targetIdx = primaryTarget.charCodeAt(0) - 65;
      const radius = normTier === 'easy' ? 4 : normTier === 'medium' ? 5 : 6;
      const nearbyLetters = [];
      for (let offset = 1; offset <= radius; offset++) {
        nearbyLetters.push(alphabet[(targetIdx + offset) % 26]);
        nearbyLetters.push(alphabet[(targetIdx - offset + 26) % 26]);
      }
      const filtered = nearbyLetters.filter(ch => !avoidLetters.has(ch) && !targetLetters.includes(ch));
      decoyChar = filtered.length > 0
        ? filtered[Math.floor(Math.random() * filtered.length)]
        : alphabet[(targetIdx + 3) % 26];
    }

    const posIdx = activeTargets.length + i;
    const pos = startPositions[posIdx % startPositions.length];

    ghosts.push({
      id: `ghost-decoy-${i + 1}`,
      char: decoyChar,
      index: -1, // Decoy indicator
      row: pos.row,
      col: pos.col,
      eaten: false,
      dying: false,
      dir: pos.dir
    });
  }

  return { ghosts, queue };
};
/**
 * Caesar Cheat Sheet — Decryption Guide (Bottom-Left Floating Panel)
 * Rebuilt on Vigenère Decryption Arithmetic pattern:
 * Shows live working for active letter being solved, value grid, and 3-step hint line.
 */
function CaesarCheatSheet({
  tier,
  activeShift,
  ciphertext,
  plaintext,
  levelSolved,
  levelData,
}) {
  const isEasy = tier === 'easy';
  const normShift = ((activeShift % 26) + 26) % 26;

  /* Calculate all letter positions and solve states */
  const letterPositions = useMemo(() => {
    const list = [];
    let count = 0;
    for (let i = 0; i < plaintext.length; i++) {
      const p = plaintext[i];
      if (p >= 'A' && p <= 'Z') {
        const mask = getMask(levelData, i);
        list.push({
          globalIdx: count++,
          charIdx: i,
          plainChar: p,
          cipherChar: ciphertext[i] || '',
          isHint: Boolean(mask),
        });
      }
    }
    return list;
  }, [plaintext, ciphertext, levelData]);

  const [selectedGlobalIdx, setSelectedGlobalIdx] = useState(null);

  const isLetterSolved = (p) => {
    if (p.isHint) return true;
    if (levelSolved && activeShift !== 0) return true;
    if (activeShift !== 0 && ((charToIdx(p.cipherChar) - normShift + 26) % 26) === charToIdx(p.plainChar)) {
      return true;
    }
    return false;
  };

  const totalLetters = letterPositions.length;
  const solvedLettersCount = letterPositions.filter(p => isLetterSolved(p)).length;
  const unsolvedPositions = letterPositions.filter(p => !isLetterSolved(p));

  const activeViewingTarget = (selectedGlobalIdx !== null && unsolvedPositions.find(p => p.globalIdx === selectedGlobalIdx))
    || unsolvedPositions[0]
    || letterPositions[0]
    || {
      globalIdx: 0,
      charIdx: 0,
      plainChar: 'A',
      cipherChar: 'A',
    };

  const handlePrevPos = (e) => {
    e?.stopPropagation?.();
    if (unsolvedPositions.length <= 1) return;
    const currentUnsolvedIdx = unsolvedPositions.findIndex(p => p.globalIdx === activeViewingTarget.globalIdx);
    const prevIdx = (currentUnsolvedIdx - 1 + unsolvedPositions.length) % unsolvedPositions.length;
    setSelectedGlobalIdx(unsolvedPositions[prevIdx].globalIdx);
  };

  const handleNextPos = (e) => {
    e?.stopPropagation?.();
    if (unsolvedPositions.length <= 1) return;
    const currentUnsolvedIdx = unsolvedPositions.findIndex(p => p.globalIdx === activeViewingTarget.globalIdx);
    const nextIdx = (currentUnsolvedIdx + 1) % unsolvedPositions.length;
    setSelectedGlobalIdx(unsolvedPositions[nextIdx].globalIdx);
  };

  const viewingCipherChar = activeViewingTarget.cipherChar;
  const viewingCipherVal = charToIdx(viewingCipherChar);
  const viewingPlainChar = activeViewingTarget.plainChar;
  const viewingPlainVal = charToIdx(viewingPlainChar);
  const isViewingSolved = isLetterSolved(activeViewingTarget);

  return (
    <div className="caesar-floating-cheat-sheet caesar-pacman-cheat-sheet vg-fishing-az-panel">
      <div className="vg-floating-current-slot">
        <div className="vg-arithmetic-title">
          Decryption Arithmetic
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!isEasy && (
            <span className="caesar-cheat-badge mystery" style={{ fontSize: '0.74rem', padding: '2px 6px' }}>
              Shift: ??
            </span>
          )}
          <div className="vg-slot-badge-lg" style={{ fontSize: '0.82rem', padding: '2px 8px' }}>
            {Math.min(solvedLettersCount, totalLetters)}/{totalLetters} Solved
          </div>
        </div>
      </div>

      {/* Active calculation card */}
      <div className="vg-fishing-calc-card">
        <div className="vg-calc-top-row">
          <span className="vg-calc-label">Active Letter Decryption:</span>
          <span className="vg-calc-badge vg-pos-stepper">
            <button
              type="button"
              className="vg-pos-stepper-btn"
              onClick={handlePrevPos}
              disabled={unsolvedPositions.length <= 1}
              aria-label="Previous unsolved position"
            >
              ‹
            </button>
            <span className="vg-pos-stepper-label">Pos #{activeViewingTarget.globalIdx + 1}</span>
            <button
              type="button"
              className="vg-pos-stepper-btn"
              onClick={handleNextPos}
              disabled={unsolvedPositions.length <= 1}
              aria-label="Next unsolved position"
            >
              ›
            </button>
          </span>
        </div>
        <div className="vg-calc-formula-row">
          <div className="vg-calc-item cipher">
            <span className="lbl">Cipher</span>
            <strong>{viewingCipherChar}</strong>
            <span className="val">{viewingCipherVal}</span>
          </div>
          <span className="vg-calc-op">−</span>
          <div className="vg-calc-item key">
            <span className="lbl">Shift</span>
            <strong>{activeShift}</strong>
            <span className="val">{normShift}</span>
          </div>
          <span className="vg-calc-op">=</span>
          <div className={`vg-calc-item plain ${isViewingSolved ? 'is-solved' : ''}`}>
            <span className="lbl">Target</span>
            <strong style={{ color: isViewingSolved ? 'var(--neon-green)' : '#ffffff' }}>
              {isViewingSolved ? viewingPlainChar : '?'}
            </strong>
            <span
              className="val"
              style={{ visibility: isViewingSolved ? 'visible' : 'hidden' }}
            >
              {viewingPlainVal}
            </span>
          </div>
        </div>

        {/* Smart Calculation Guidance */}
        <div className="vg-calc-help-row">
          {!isViewingSolved ? (
            (viewingCipherVal - normShift < 0) ? (
              <span className="vg-calc-help-text wrap-around">
                ⚠️ Wrap-Around: Calculate ({viewingCipherVal} − {normShift} + 26) = <strong>?</strong>
              </span>
            ) : (
              <span className="vg-calc-help-text normal">
                💡 Calculate: {viewingCipherVal} − {normShift} = <strong>?</strong>
              </span>
            )
          ) : (
            <span className="vg-calc-help-text solved">
              ✅ Solved: {viewingCipherChar} ({viewingCipherVal}) − {normShift} {viewingCipherVal - normShift < 0 ? '+ 26 ' : ''}= {viewingPlainChar} ({viewingPlainVal})
            </span>
          )}
        </div>
      </div>

      {/* 2-row x 13-col Alphabet grid */}
      <div className="vg-sprint-alphabet-grid">
        <div className="vg-alphabet-row">
          {CQS_ALPHABET.slice(0, 13).map((ch, i) => {
            const isCipher = ch === viewingCipherChar;
            const isKey = i === normShift;
            const isTarget = isViewingSolved && ch === viewingPlainChar;
            let cellClass = "vg-alphabet-cell";
            if (isCipher) cellClass += " is-cipher";
            if (isKey) cellClass += " is-key";
            if (isTarget) cellClass += " is-target";
            return (
              <div key={ch} className={cellClass} title={`${ch} = ${i}`}>
                <span className="vg-alpha-char">{ch}</span>
                <span className="vg-alpha-val">{i}</span>
              </div>
            );
          })}
        </div>
        <div className="vg-alphabet-row">
          {CQS_ALPHABET.slice(13, 26).map((ch, i) => {
            const val = i + 13;
            const isCipher = ch === viewingCipherChar;
            const isKey = val === normShift;
            const isTarget = isViewingSolved && ch === viewingPlainChar;
            let cellClass = "vg-alphabet-cell";
            if (isCipher) cellClass += " is-cipher";
            if (isKey) cellClass += " is-key";
            if (isTarget) cellClass += " is-target";
            return (
              <div key={ch} className={cellClass} title={`${ch} = ${val}`}>
                <span className="vg-alpha-char">{ch}</span>
                <span className="vg-alpha-val">{val}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PacmanGame({
  levelData,
  tier,
  snapshot,
  onVerifySubmit,
  onBackToStages,
  onReplayNewQuestion,
  onStartStageTimer,
  onSaveSnapshot,
  onClearSnapshot,
  onStageFail,
  // Authoritative post-loss heart state, so the losing screen shows the
  // server's answer rather than the profile value still in flight.
  stageLoss,
}) {
  const { containerRef, isFullscreen, toggleFullscreen } = useFullscreen();

  const isVigenere = !!levelData?.targetKey;
  const isPlayfair = !!levelData.matrix;
  const isCaesar = !isVigenere && !isPlayfair;
  const cleanHint = levelData?.hint ? levelData.hint.trim() : '';
  const targetShift = isVigenere ? 0 : (levelData.targetShifts?.[0] ?? levelData.shift ?? levelData.targetShift ?? 0);
  const currentTier = String(tier || levelData?.tier || 'easy').toLowerCase();
  const activeMazeGrid = getMazeGrid(currentTier);
  const activeMazeGridRef = useRef(activeMazeGrid);
  useEffect(() => {
    activeMazeGridRef.current = activeMazeGrid;
  }, [activeMazeGrid]);

  // Initial Coordinates
  const initialPacman = { row: 1, col: 1 };
  
  const initialGhostsData = generateInitialGhosts(levelData, currentTier);
  const targetQueueRef = useRef(initialGhostsData.queue);
  const initialGhosts = initialGhostsData.ghosts;

  const maskedIndices = useMemo(() => {
    const indices = [];
    if (!levelData) return indices;
    const isPf = !!levelData.matrix;
    const normTier = String(currentTier || levelData.difficulty || 'easy').toLowerCase();
    if (isPf) {
      const pairs = levelData.pairs || [];
      pairs.forEach((_, i) => {
        const isHint = normTier !== 'hard' && (getMask(levelData, i * 2) || getMask(levelData, i * 2 + 1));
        if (!isHint) {
          indices.push(i);
        }
      });
      if (indices.length === 0 && pairs.length > 0) {
        indices.push(pairs.length - 1);
      }
      return indices;
    }
    if (!levelData.plaintext) return indices;
    for (let i = 0; i < levelData.plaintext.length; i++) {
      const ch = levelData.plaintext[i];
      if (ch >= 'A' && ch <= 'Z') {
        if (!getMask(levelData, i)) {
          indices.push(i);
        }
      }
    }
    return indices;
  }, [levelData, currentTier]);

  const hasSnapshot = Boolean(snapshot?.gameState && snapshot.gameState.phase === 'playing');

  const [phase, setPhase] = useState(() => (hasSnapshot ? 'playing' : 'ready'));
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showTabula, setShowTabula] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(() => (hasSnapshot ? true : false));

  const [pacman, setPacman] = useState(() => (hasSnapshot && snapshot.gameState.pacman ? snapshot.gameState.pacman : initialPacman));
  const [pacmanDir, setPacmanDir] = useState('NONE');
  const [bufferedDir, setBufferedDir] = useState('NONE');
  const [knightAttacking, setKnightAttacking] = useState(false);
  const [eatenGhosts, setEatenGhosts] = useState(() => (hasSnapshot && Array.isArray(snapshot.gameState.eatenGhosts) ? snapshot.gameState.eatenGhosts : []));
  const [lives, setLives] = useState(() => (hasSnapshot && typeof snapshot.gameState.lives === 'number' ? snapshot.gameState.lives : 5));
  const [flashError, setFlashError] = useState(false);
  const [ruleViolation, setRuleViolation] = useState(null);
  const [levelSolved, setLevelSolved] = useState(false);
  const [activeShiftValue, setActiveShiftValue] = useState(() => (hasSnapshot && typeof snapshot.gameState.activeShiftValue === 'number' ? snapshot.gameState.activeShiftValue : 0));
  const [gameOver, setGameOver] = useState(false);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [isInvulnerable, setIsInvulnerable] = useState(false);

  // Skill states
  const [hasSkillCharge, setHasSkillCharge] = useState(() => (hasSnapshot ? Boolean(snapshot.gameState.hasSkillCharge) : false));
  const [skillActive, setSkillActive] = useState(() => (hasSnapshot ? Boolean(snapshot.gameState.skillActive) : false));
  const [skillTimeLeft, setSkillTimeLeft] = useState(() => (hasSnapshot ? (snapshot.gameState.skillTimeLeft || 0) : 0));

  // Ghosts
  const [ghosts, setGhosts] = useState(initialGhosts);

  // Dynamic non-wall non-stacking pellet arrays on load
  const [pellets, setPellets] = useState(() => generateRandomPellets(activeMazeGrid, initialGhosts, initialPacman));

  const pacmanRef = useRef(pacman);
  const ghostsRef = useRef(ghosts);
  const pelletsRef = useRef(pellets);
  const pacmanDirRef = useRef(pacmanDir);
  const bufferedDirRef = useRef(bufferedDir);
  const skillActiveRef = useRef(skillActive);
  const isInvulnerableRef = useRef(isInvulnerable);
  const knightAttackingRef = useRef(false);
  const invulnerabilityTimerRef = useRef(null);
  const autoRecapShownRef = useRef(false);

  const isRunning = phase === 'playing' && !gameOver && !levelSolved;
  useStageSnapshotAutoSaver(
    onSaveSnapshot,
    useCallback(() => ({
      phase: 'playing',
      pacman,
      lives,
      eatenGhosts,
      activeShiftValue,
      hasSkillCharge,
      skillActive,
      skillTimeLeft,
    }), [pacman, lives, eatenGhosts, activeShiftValue, hasSkillCharge, skillActive, skillTimeLeft]),
    isRunning
  );

  /* Report the loss exactly once. Focus is StageLostScreen's own job. */
  const stageFailReportedRef = useRef(false);
  useEffect(() => {
    if (!gameOver) {
      // A fresh run may lose again, so allow one report per game over.
      stageFailReportedRef.current = false;
      return;
    }
    if (stageFailReportedRef.current) return;
    stageFailReportedRef.current = true;
    // Reports the stage loss: streak reset + exactly one server session
    // heart spent. Pac-Man's in-game lives never reach the server.
    onStageFail?.({ showNotice: false });
  }, [gameOver, onStageFail]);

  useEffect(() => { pacmanRef.current = pacman; }, [pacman]);
  useEffect(() => { ghostsRef.current = ghosts; }, [ghosts]);
  useEffect(() => { pelletsRef.current = pellets; }, [pellets]);
  useEffect(() => { pacmanDirRef.current = pacmanDir; }, [pacmanDir]);
  useEffect(() => { bufferedDirRef.current = bufferedDir; }, [bufferedDir]);
  useEffect(() => { skillActiveRef.current = skillActive; }, [skillActive]);
  useEffect(() => { isInvulnerableRef.current = isInvulnerable; }, [isInvulnerable]);
  useEffect(() => { knightAttackingRef.current = knightAttacking; }, [knightAttacking]);

  const activeSolvingIndex = useMemo(() => {
    if (isCaesar) {
      return maskedIndices[0] ?? 0;
    }
    if (!levelData || !levelData.plaintext) return -1;
    for (let i = 0; i < levelData.plaintext.length; i++) {
      const ch = levelData.plaintext[i];
      if (ch >= 'A' && ch <= 'Z' && !getMask(levelData, i) && !eatenGhosts.includes(i)) {
        return i;
      }
    }
    return -1;
  }, [levelData, eatenGhosts, isCaesar, maskedIndices]);

  const [selectedVgGlobalIdx, setSelectedVgGlobalIdx] = useState(null);

  const vigenereAlignmentItems = useMemo(() => {
    if (!isVigenere || !levelData.plaintext) return [];
    const items = [];
    let letterCounter = 0;
    const targetKey = levelData.targetKey || '';
    for (let i = 0; i < levelData.plaintext.length; i++) {
      const pChar = levelData.plaintext[i];
      const cChar = levelData.ciphertext ? levelData.ciphertext[i] : '';
      if (pChar === ' ') {
        items.push({ isSpace: true, id: `space-${i}` });
      } else {
        const slot = letterCounter % targetKey.length;
        const keyChar = targetKey[slot] || 'A';
        const shiftVal = charToIdx(keyChar);
        const isSolved = eatenGhosts.includes(i) || Boolean(getMask(levelData, i));
        const isActive = i === activeSolvingIndex;
        items.push({
          id: `item-${i}`,
          globalIdx: letterCounter,
          index: i,
          cipherChar: cChar,
          plainChar: pChar,
          keyChar,
          shiftVal,
          isActive,
          isSolved,
        });
        letterCounter++;
      }
    }
    return items;
  }, [isVigenere, levelData, eatenGhosts, activeSolvingIndex]);

  const activeSolvingItem = useMemo(() => {
    return vigenereAlignmentItems.find((item) => item.isActive) || null;
  }, [vigenereAlignmentItems]);

  const unsolvedVgItems = useMemo(() => {
    return vigenereAlignmentItems.filter(item => !item.isSpace && !item.isSolved);
  }, [vigenereAlignmentItems]);

  const activeViewingVgItem = useMemo(() => {
    if (selectedVgGlobalIdx !== null) {
      const found = unsolvedVgItems.find(item => item.globalIdx === selectedVgGlobalIdx);
      if (found) return found;
    }
    return unsolvedVgItems[0] || activeSolvingItem || vigenereAlignmentItems.find(item => !item.isSpace) || null;
  }, [selectedVgGlobalIdx, unsolvedVgItems, activeSolvingItem, vigenereAlignmentItems]);

  const handlePrevVgPos = (e) => {
    e?.stopPropagation?.();
    if (unsolvedVgItems.length <= 1) return;
    const currentUnsolvedIdx = unsolvedVgItems.findIndex(p => p.globalIdx === activeViewingVgItem?.globalIdx);
    const prevIdx = (currentUnsolvedIdx - 1 + unsolvedVgItems.length) % unsolvedVgItems.length;
    setSelectedVgGlobalIdx(unsolvedVgItems[prevIdx].globalIdx);
  };

  const handleNextVgPos = (e) => {
    e?.stopPropagation?.();
    if (unsolvedVgItems.length <= 1) return;
    const currentUnsolvedIdx = unsolvedVgItems.findIndex(p => p.globalIdx === activeViewingVgItem?.globalIdx);
    const nextIdx = (currentUnsolvedIdx + 1) % unsolvedVgItems.length;
    setSelectedVgGlobalIdx(unsolvedVgItems[nextIdx].globalIdx);
  };

  const playfairPairsData = useMemo(() => {
    if (!isPlayfair || !levelData.matrix || !levelData.pairs) return [];
    return levelData.pairs.map((plainPair, idx) => {
      const cipherPair = levelData.cipherPairs ? levelData.cipherPairs[idx] : '';
      const transformed = transformPlayfairPair(cipherPair, levelData.matrix, 'decrypt');
      const isPrefilled = currentTier !== 'hard' && (getMask(levelData, idx * 2) || getMask(levelData, idx * 2 + 1));
      const isSolved = Boolean(isPrefilled || eatenGhosts.includes(idx));
      return {
        idx,
        plainPair,
        cipherPair,
        rule: transformed?.rule || (levelData.rules ? levelData.rules[idx] : 'RULE'),
        isSolved,
      };
    });
  }, [isPlayfair, levelData, eatenGhosts, currentTier]);

  const [selectedPfViewingIdx, setSelectedPfViewingIdx] = useState(null);

  const unsolvedPfIndices = useMemo(() => {
    return playfairPairsData
      .map((_, idx) => idx)
      .filter((idx) => !playfairPairsData[idx]?.isSolved);
  }, [playfairPairsData]);

  const isAllSolved = useMemo(() => {
    if (isCaesar) return levelSolved;
    if (isPlayfair) {
      return playfairPairsData.length > 0 && playfairPairsData.every((p) => p.isSolved);
    }
    if (isVigenere) {
      return maskedIndices.length > 0 && maskedIndices.every((idx) => eatenGhosts.includes(idx));
    }
    return false;
  }, [isCaesar, levelSolved, isPlayfair, playfairPairsData, isVigenere, maskedIndices, eatenGhosts]);

  useEffect(() => {
    if (isAllSolved && !levelSolved && phase === 'playing') {
      onClearSnapshot?.();
      setLevelSolved(true);
      pacmanSound.stopBgm();
      pacmanSound.playSfx('win');
    }
  }, [isAllSolved, levelSolved, phase, onClearSnapshot]);

  const activePfSolvingIdx = useMemo(() => {
    const found = playfairPairsData.findIndex(p => !p.isSolved);
    return found !== -1 ? found : 0;
  }, [playfairPairsData]);

  const viewingPfIndex = (selectedPfViewingIdx !== null && unsolvedPfIndices.includes(selectedPfViewingIdx))
    ? selectedPfViewingIdx
    : (unsolvedPfIndices.includes(activePfSolvingIdx) ? activePfSolvingIdx : (unsolvedPfIndices[0] ?? activePfSolvingIdx));

  const viewingPfPair = playfairPairsData[viewingPfIndex] || playfairPairsData[0] || {
    idx: 0,
    cipherPair: '',
    plainPair: '',
    rule: 'RULE',
    isSolved: false,
  };

  const handlePrevPfPair = (e) => {
    e?.stopPropagation?.();
    if (unsolvedPfIndices.length <= 1) return;
    const currentPos = unsolvedPfIndices.indexOf(viewingPfIndex);
    const prevPos = (currentPos - 1 + unsolvedPfIndices.length) % unsolvedPfIndices.length;
    setSelectedPfViewingIdx(unsolvedPfIndices[prevPos]);
  };

  const handleNextPfPair = (e) => {
    e?.stopPropagation?.();
    if (unsolvedPfIndices.length <= 1) return;
    const currentPos = unsolvedPfIndices.indexOf(viewingPfIndex);
    const nextPos = (currentPos + 1) % unsolvedPfIndices.length;
    setSelectedPfViewingIdx(unsolvedPfIndices[nextPos]);
  };

  const viewingPfCipherPair = viewingPfPair.cipherPair || '';
  const pfMatrixLookup = useMemo(() => {
    const lookup = {};
    if (levelData?.matrix && Array.isArray(levelData.matrix)) {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const letter = levelData.matrix[r]?.[c];
          if (letter) {
            lookup[letter] = { r, c };
            if (letter === 'I') lookup['J'] = { r, c };
          }
        }
      }
    }
    return lookup;
  }, [levelData?.matrix]);

  const viewingPfC1 = viewingPfPair?.cipherPair?.[0] || '';
  const viewingPfC2 = viewingPfPair?.cipherPair?.[1] || '';
  const viewingPfPosA = viewingPfC1 ? pfMatrixLookup[viewingPfC1] : null;
  const viewingPfPosB = viewingPfC2 ? pfMatrixLookup[viewingPfC2] : null;

  let viewingPfEffectiveRule = (viewingPfPair?.rule || '').toLowerCase();
  if (viewingPfPosA && viewingPfPosB) {
    if (viewingPfPosA.r === viewingPfPosB.r) viewingPfEffectiveRule = 'row';
    else if (viewingPfPosA.c === viewingPfPosB.c) viewingPfEffectiveRule = 'column';
    else viewingPfEffectiveRule = 'rectangle';
  }

  let viewingPfTargetPosA = null;
  let viewingPfTargetPosB = null;
  if (viewingPfPosA && viewingPfPosB) {
    if (viewingPfEffectiveRule === 'row') {
      viewingPfTargetPosA = { r: viewingPfPosA.r, c: (viewingPfPosA.c + 4) % 5 };
      viewingPfTargetPosB = { r: viewingPfPosB.r, c: (viewingPfPosB.c + 4) % 5 };
    } else if (viewingPfEffectiveRule === 'column') {
      viewingPfTargetPosA = { r: (viewingPfPosA.r + 4) % 5, c: viewingPfPosA.c };
      viewingPfTargetPosB = { r: (viewingPfPosB.r + 4) % 5, c: viewingPfPosB.c };
    } else {
      viewingPfTargetPosA = { r: viewingPfPosA.r, c: viewingPfPosB.c };
      viewingPfTargetPosB = { r: viewingPfPosB.r, c: viewingPfPosA.c };
    }
  }

  const viewingPfT1Actual = viewingPfTargetPosA && levelData?.matrix ? (levelData.matrix[viewingPfTargetPosA.r]?.[viewingPfTargetPosA.c] || viewingPfPair?.plainPair?.[0] || '?') : (viewingPfPair?.plainPair?.[0] || '?');
  const viewingPfT2Actual = viewingPfTargetPosB && levelData?.matrix ? (levelData.matrix[viewingPfTargetPosB.r]?.[viewingPfTargetPosB.c] || viewingPfPair?.plainPair?.[1] || '?') : (viewingPfPair?.plainPair?.[1] || '?');

  const viewingPfHasHint0 = Boolean(levelData?.fullMask?.[viewingPfIndex * 2]);
  const viewingPfHasHint1 = Boolean(levelData?.fullMask?.[viewingPfIndex * 2 + 1]);

  const viewingPfT1Disp = (viewingPfPair.isSolved || viewingPfHasHint0) ? viewingPfT1Actual : '?';
  const viewingPfT2Disp = (viewingPfPair.isSolved || viewingPfHasHint1) ? viewingPfT2Actual : '?';

  let viewingPfRuleChipText = '⇄ RECTANGLE';
  if (viewingPfEffectiveRule === 'row') viewingPfRuleChipText = '← SAME ROW';
  else if (viewingPfEffectiveRule === 'column') viewingPfRuleChipText = '↑ SAME COLUMN';

  const isPfLetterHighlighted = (letter) => {
    if (!viewingPfCipherPair) return false;
    return (
      viewingPfCipherPair.includes(letter) ||
      (letter === 'I' && viewingPfCipherPair.includes('J')) ||
      (letter === 'J' && viewingPfCipherPair.includes('I'))
    );
  };

  const prevLevelIdRef = useRef(levelData?.id || `${levelData?.plaintext || ''}-${levelData?.ciphertext || ''}`);
  useEffect(() => {
    const curId = levelData?.id || `${levelData?.plaintext || ''}-${levelData?.ciphertext || ''}`;
    if (prevLevelIdRef.current && prevLevelIdRef.current !== curId) {
      prevLevelIdRef.current = curId;
      const normTier = String(tier || levelData?.tier || 'easy').toLowerCase();
      const grid = getMazeGrid(normTier);
      activeMazeGridRef.current = grid;
      const { ghosts: initG, queue: initQ } = generateInitialGhosts(levelData, normTier);
      targetQueueRef.current = initQ;
      setPacman(initialPacman);
      setPacmanDir('NONE');
      setBufferedDir('NONE');
      setKnightAttacking(false);
      setEatenGhosts([]);
      setLives(5);
      setFlashError(false);
      setRuleViolation(null);
      setLevelSolved(false);
      setActiveShiftValue(0);
      setGameOver(false);
      setHasSkillCharge(false);
      setSkillActive(false);
      setSkillTimeLeft(0);
      setGhosts(initG);
      setPellets(generateRandomPellets(grid, initG, initialPacman));
      setPhase('ready');
      setShowExplanation(false);
      setIsMenuOpen(false);
      autoRecapShownRef.current = false;
      if (invulnerabilityTimerRef.current) {
        clearTimeout(invulnerabilityTimerRef.current);
        invulnerabilityTimerRef.current = null;
      }
      setIsInvulnerable(false);
      isInvulnerableRef.current = false;
      pacmanSound.pauseBgm();
    }
  }, [levelData, tier]);

  // Target Ghost Enforcement & Self-Healing loop:
  // Guarantees that every unsolved target index ALWAYS has an active ghost on the maze board.
  useEffect(() => {
    if (phase === 'ready' || gameOver || levelSolved) return;
    if (!levelData) return;
    if (isCaesar) return;

    const requiredTargets = getRequiredTargetItems(levelData, currentTier);
    const unsolvedTargets = requiredTargets.filter(item => !eatenGhosts.includes(item.index));

    if (unsolvedTargets.length === 0) return;

    setGhosts((prevGhosts) => {
      const activeGhostIndices = new Set(
        prevGhosts
          .filter(g => !g.eaten && !g.dying && g.index !== -1)
          .map(g => g.index)
      );

      const missingTargets = unsolvedTargets.filter(t => !activeGhostIndices.has(t.index));
      if (missingTargets.length === 0) return prevGhosts;

      const currentGrid = activeMazeGridRef.current;
      const spawnPositions = getGhostStartPositions(currentTier);
      let updatedGhosts = [...prevGhosts];

      missingTargets.forEach((targetItem, mIdx) => {
        let spawnPos = null;
        for (const pos of spawnPositions) {
          const hasPacman = pacmanRef.current.row === pos.row && pacmanRef.current.col === pos.col;
          const hasGhost = updatedGhosts.some(g => !g.eaten && !g.dying && g.row === pos.row && g.col === pos.col);
          if (!hasPacman && !hasGhost && currentGrid[pos.row] && currentGrid[pos.row][pos.col] === 0) {
            spawnPos = pos;
            break;
          }
        }

        if (!spawnPos) {
          const openSpaces = [];
          for (let r = 1; r < currentGrid.length - 1; r++) {
            for (let c = 1; c < currentGrid[r].length - 1; c++) {
              if (currentGrid[r][c] === 0) {
                const hasPacman = pacmanRef.current.row === r && pacmanRef.current.col === c;
                const hasGhost = updatedGhosts.some(g => !g.eaten && !g.dying && g.row === r && g.col === c);
                if (!hasPacman && !hasGhost) {
                  openSpaces.push({ row: r, col: c, dir: { r: 0, c: 1 } });
                }
              }
            }
          }
          if (openSpaces.length > 0) {
            spawnPos = openSpaces[Math.floor(Math.random() * openSpaces.length)];
          } else {
            spawnPos = spawnPositions[mIdx % spawnPositions.length];
          }
        }

        updatedGhosts.push({
          id: `ghost-target-${targetItem.index}-${Date.now()}-${Math.random()}`,
          char: isCaesar ? `−${targetShift}` : targetItem.char,
          shiftValue: isCaesar ? targetShift : undefined,
          index: targetItem.index,
          row: spawnPos.row,
          col: spawnPos.col,
          eaten: false,
          dying: false,
          dir: spawnPos.dir || { r: 0, c: 1 }
        });
      });

      return updatedGhosts;
    });
  }, [eatenGhosts, phase, gameOver, levelSolved, levelData, currentTier]);

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    return () => {
      pacmanSound.stopBgm();
    };
  }, []);

  useEffect(() => {
    if (phase === 'playing' && !isMenuOpen && !gameOver && !levelSolved && !showExplanation) {
      pacmanSound.playBgm();
    } else {
      pacmanSound.pauseBgm();
    }
  }, [phase, isMenuOpen, gameOver, levelSolved, showExplanation]);

  const toggleSound = useCallback(() => {
    const muted = pacmanSound.toggleMute();
    setIsMuted(muted);
  }, []);

  useGameShortcuts({
    onToggleFullscreen: toggleFullscreen,
    onToggleMute: toggleSound,
  });

  const gameLoopRef = useRef(null);

  // ghostMoveTick toggle to limit ghost speed to exactly 0.5x of Pac-man's speed
  const ghostMoveTickRef = useRef(false);

  const triggerInvulnerability = (duration = 1200) => {
    if (invulnerabilityTimerRef.current) {
      clearTimeout(invulnerabilityTimerRef.current);
    }
    setIsInvulnerable(true);
    isInvulnerableRef.current = true;
    invulnerabilityTimerRef.current = setTimeout(() => {
      setIsInvulnerable(false);
      isInvulnerableRef.current = false;
      invulnerabilityTimerRef.current = null;
    }, duration);
  };

  const handleLoseHeart = (message) => {
    if (isInvulnerableRef.current || levelSolved) return;

    pacmanSound.playSfx('hit');
    triggerInvulnerability(1200); // 1.2s invulnerability window

    setFlashError(true);
    setTimeout(() => setFlashError(false), 300);
    setRuleViolation(message);
    setLives((prev) => {
      const nextLives = prev - 1;
      if (nextLives <= 0) {
        setGameOver(true);
        pacmanSound.stopBgm();
        pacmanSound.playSfx('lose');
      }
      return nextLives;
    });
  };

  const activateSkill = () => {
    if (!hasSkillCharge || skillActive || gameOver || levelSolved) return;
    setSkillActive(true);
    setHasSkillCharge(false);
    setSkillTimeLeft(6);
    pacmanSound.playSfx('powerup');
  };

  // Steering control to set buffer direction only
  const triggerSteer = (dirName) => {
    pacmanSound.unlockAudio();
    if (gameOver || levelSolved) return;
    setBufferedDir(dirName);
  };

  // Key hooks
  useEffect(() => {
    const handleKeyDown = (e) => {
      pacmanSound.unlockAudio();
      // ESC key toggle for pause menu (active playing state only)
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (phase === 'playing' && !gameOver && !levelSolved) {
          e.preventDefault();
          setIsMenuOpen((prev) => !prev);
        }
        return;
      }

      // Block controls when menu is open
      if (isMenuOpen) return;

      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        triggerSteer('UP');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        triggerSteer('DOWN');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        triggerSteer('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        triggerSteer('RIGHT');
      } else if (e.code === 'Space') {
        e.preventDefault();
        activateSkill();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, levelSolved, hasSkillCharge, skillActive, isMenuOpen, phase]);

  useEffect(() => {
    if (!skillActive || isMenuOpen || phase === 'ready') return;
    const interval = setInterval(() => {
      setSkillTimeLeft((prev) => {
        if (prev <= 1) {
          setSkillActive(false);
          skillActiveRef.current = false;
          triggerInvulnerability(1000); // Grace period on skill freeze natural expiration to absorb lingering overlap
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [skillActive, isMenuOpen, phase]);

  // Main automatic tick loop (180ms loop) using Refs to prevent coordinate change stutter
  useEffect(() => {
    if (gameOver || levelSolved || isMenuOpen || showExplanation || phase === 'ready') return undefined;

    const gameTick = () => {
      if (knightAttackingRef.current) {
        gameLoopRef.current = setTimeout(gameTick, 180);
        return;
      }

      const currentPacman = pacmanRef.current;
      const currentPacmanDir = pacmanDirRef.current;
      const currentBufferedDir = bufferedDirRef.current;
      const currentSkillActive = skillActiveRef.current;
      const currentIsInvulnerable = isInvulnerableRef.current;

      // 1. Process Buffered Input
      const currentGrid = activeMazeGridRef.current;
      let activeDir = currentPacmanDir;
      if (currentBufferedDir !== 'NONE') {
        const testVec = DIR_VECTORS[currentBufferedDir];
        const testRow = currentPacman.row + testVec.r;
        const testCol = currentPacman.col + testVec.c;
        if (currentGrid[testRow] && currentGrid[testRow][testCol] === 0) {
          activeDir = currentBufferedDir;
          setPacmanDir(currentBufferedDir);
          setBufferedDir('NONE');
        }
      }

      // 2. Pacman auto-run movement step
      let pRow = currentPacman.row;
      let pCol = currentPacman.col;
      if (activeDir !== 'NONE') {
        const vec = DIR_VECTORS[activeDir];
        const nextRow = currentPacman.row + vec.r;
        const nextCol = currentPacman.col + vec.c;

        const currentGhosts = ghostsRef.current;
        const targetGhostAhead = currentGhosts.find(
          (g) => !g.eaten && !g.dying && g.row === nextRow && g.col === nextCol && (isCaesar ? true : g.index !== -1)
        );

        if (targetGhostAhead && currentSkillActive) {
          // Freeze skill active & approaching goblin: Stop 1 tile short and execute attack animation!
          setPacmanDir('NONE');
          setBufferedDir('NONE');
          setSkillActive(false);
          setSkillTimeLeft(0);
          skillActiveRef.current = false;
          setKnightAttacking(true);
          knightAttackingRef.current = true;

          const isCorrect = isCaesar ? targetGhostAhead.isCorrect : true;

          // Ghost disappears on hit frame (~240ms)
          setTimeout(() => {
            if (isCorrect) {
              pacmanSound.playSfx('gold');
            } else {
              pacmanSound.playSfx('hit');
            }
            setGhosts((prev) => prev.map((g) => (g.id === targetGhostAhead.id ? { ...g, dying: true } : g)));
          }, 240);

          // Complete swing at ~480ms: remove ghost, credit decryption / damage, grant grace period, resume
          setTimeout(() => {
            if (isCaesar) {
              if (isCorrect) {
                onClearSnapshot?.();
                setActiveShiftValue(targetGhostAhead.signedVal ?? targetShift);
                setLevelSolved(true);
                setEatenGhosts(maskedIndices);
                pacmanSound.stopBgm();
                pacmanSound.playSfx('win');
                setGhosts((prev) => prev.map((g) => ({ ...g, eaten: true })));
              } else {
                // Wrong candidate goblin! Despawn it, lose a life, explain why, continue hunt
                setGhosts((prev) => prev.map((g) => (g.id === targetGhostAhead.id ? { ...g, eaten: true } : g)));
                const testIdx = maskedIndices[0] ?? 0;
                const cipherCh = levelData.ciphertext?.[testIdx] ?? '';
                const correctPlainCh = levelData.plaintext?.[testIdx] ?? '';
                const testShift = targetGhostAhead.signedVal ?? -targetGhostAhead.shiftValue;
                const wrongPlainCh = cipherCh ? caesarShiftChar(cipherCh, -testShift) : '?';
                setIsScreenShaking(true);
                setTimeout(() => setIsScreenShaking(false), 450);
                const opStr = targetGhostAhead.char?.startsWith('+') ? `+ ${targetGhostAhead.char.slice(1)}` : `− ${targetGhostAhead.char?.replace(/^[−-]/, '')}`;
                handleLoseHeart(
                  `Wrong shift! '${cipherCh}' ${opStr} = '${wrongPlainCh}', which does not match '${correctPlainCh}'. Check the Decryption Guide!`
                );
              }
            } else {
              setGhosts((prev) => {
                const nextG = prev.map((g) => (g.id === targetGhostAhead.id ? { ...g, eaten: true } : g));
                if (targetQueueRef.current && targetQueueRef.current.length > 0) {
                  const nextTarget = targetQueueRef.current.shift();
                  const spawnPositions = getGhostStartPositions(currentTier);
                  const pos = spawnPositions[Math.floor(Math.random() * spawnPositions.length)];
                  nextG.push({
                    id: `ghost-queued-${Date.now()}-${Math.random()}`,
                    char: nextTarget.char,
                    shiftValue: undefined,
                    index: nextTarget.index,
                    row: pos.row,
                    col: pos.col,
                    eaten: false,
                    dir: pos.dir,
                  });
                }
                return nextG;
              });

              setEatenGhosts((prevEaten) => {
                const nextEaten = prevEaten.includes(targetGhostAhead.index)
                  ? prevEaten
                  : [...prevEaten, targetGhostAhead.index];
                const allDone = isPlayfair
                  ? (maskedIndices.length > 0 && maskedIndices.every((idx) => nextEaten.includes(idx)))
                  : nextEaten.length === maskedIndices.length;
                if (allDone) {
                  onClearSnapshot?.();
                  setLevelSolved(true);
                  pacmanSound.stopBgm();
                  pacmanSound.playSfx('win');
                }
                return nextEaten;
              });
            }

            setKnightAttacking(false);
            knightAttackingRef.current = false;
            triggerInvulnerability(1200);
          }, 480);

          gameLoopRef.current = setTimeout(gameTick, 180);
          return;
        }

        if (currentGrid[nextRow] && currentGrid[nextRow][nextCol] === 0) {
          pRow = nextRow;
          pCol = nextCol;
          setPacman({ row: nextRow, col: nextCol });
        } else {
          setPacmanDir('NONE');
        }
      }

      // 3. Pacman eats pellets
      setPellets((prevPellets) =>
        prevPellets.map((pellet) => {
          if (!pellet.eaten && pellet.row === pRow && pellet.col === pCol) {
            if (pellet.isSkill) {
              setHasSkillCharge(true);
              pacmanSound.playSfx('powerup');
            } else {
              setRuleViolation(null);
              pacmanSound.playSfx('waka');
            }
            return { ...pellet, eaten: true };
          }
          return pellet;
        })
      );

      // 4. Move Ghosts only on ALTERNATE ticks (0.5x speed limit)
      ghostMoveTickRef.current = !ghostMoveTickRef.current;
      const shouldMoveGhosts = ghostMoveTickRef.current && !currentSkillActive;

      if (shouldMoveGhosts) {
        setGhosts((prevGhosts) => {
          const updated = [];
          for (let i = 0; i < prevGhosts.length; i++) {
            const ghost = prevGhosts[i];
            if (ghost.eaten || ghost.dying) {
              updated.push(ghost);
              continue;
            }

            let gRow = ghost.row;
            let gCol = ghost.col;
            let gDir = ghost.dir || { r: 0, c: 1 };

            // Helper to check if a tile is occupied by another active ghost
            const isTileOccupiedByOtherGhost = (r, c) => {
              const inUpdated = updated.some(ug => !ug.eaten && !ug.dying && ug.row === r && ug.col === c);
              if (inUpdated) return true;
              for (let j = i + 1; j < prevGhosts.length; j++) {
                const pg = prevGhosts[j];
                if (!pg.eaten && !pg.dying && pg.row === r && pg.col === c) return true;
              }
              return false;
            };

            const nextRow = gRow + gDir.r;
            const nextCol = gCol + gDir.c;

            const isNextTileOpen = currentGrid[nextRow] && currentGrid[nextRow][nextCol] === 0;
            const isNextOccupied = isTileOccupiedByOtherGhost(nextRow, nextCol);

            if (isNextTileOpen && !isNextOccupied) {
              updated.push({ ...ghost, row: nextRow, col: nextCol, moving: true });
            } else {
              // Wall collision OR other ghost in the way! Choose new direction
              const directions = [
                { r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }
              ];
              
              const validMoves = directions.filter((d) => {
                const nr = gRow + d.r;
                const nc = gCol + d.c;
                const isOpen = currentGrid[nr] && currentGrid[nr][nc] === 0;
                const isOccupied = isTileOccupiedByOtherGhost(nr, nc);
                const isOpposite = (d.r === -gDir.r && d.r !== 0) || (d.c === -gDir.c && d.c !== 0);
                return isOpen && !isOccupied && !isOpposite;
              });

              const fallbackMoves = validMoves.length > 0 ? validMoves : directions.filter((d) => {
                const nr = gRow + d.r;
                const nc = gCol + d.c;
                const isOpen = currentGrid[nr] && currentGrid[nr][nc] === 0;
                const isOccupied = isTileOccupiedByOtherGhost(nr, nc);
                return isOpen && !isOccupied;
              });

              if (fallbackMoves.length > 0) {
                const chosenDir = fallbackMoves[Math.floor(Math.random() * fallbackMoves.length)];
                updated.push({
                  ...ghost,
                  row: gRow + chosenDir.r,
                  col: gCol + chosenDir.c,
                  dir: chosenDir,
                  moving: true
                });
              } else {
                updated.push({ ...ghost, moving: false }); // Stand still if blocked
              }
            }
          }
          return updated;
        });
      }

      // 5. Ghost Collisions with Pacman (Hurt, Sequence Validation, & Rebound System)
      setGhosts((prevGhosts) => {
        let hurtTriggered = false;
        let skillDisabledThisTick = false;
        let correctGhostEatenThisTick = false;
        const tickSkillActive = currentSkillActive; // Locked skill state at start of tick

        const nextGhosts = prevGhosts.map((ghost) => {
          if (ghost.eaten || ghost.dying) return ghost;

          if (ghost.row === pRow && ghost.col === pCol) {
            // Collision detected!
            if (tickSkillActive) {
              // Skill pellet can be used only once per pickup; immediately disable on touch.
              if (!skillDisabledThisTick) {
                skillDisabledThisTick = true;
                setSkillActive(false);
                setSkillTimeLeft(0);
                skillActiveRef.current = false;
              }

              if (isCaesar) {
                const isCorrect = ghost.isCorrect;
                if (isCorrect) {
                  onClearSnapshot?.();
                  correctGhostEatenThisTick = true;
                  pacmanSound.playSfx('gold');
                  setActiveShiftValue(ghost.signedVal ?? targetShift);
                  setLevelSolved(true);
                  setEatenGhosts(maskedIndices);
                  pacmanSound.stopBgm();
                  pacmanSound.playSfx('win');
                  setKnightAttacking(true);
                  setTimeout(() => {
                    setGhosts((prev) => prev.map((g) => ({ ...g, eaten: true })));
                    setKnightAttacking(false);
                  }, 520);
                  return { ...ghost, dying: true };
                } else {
                  // Decoy / wrong candidate goblin!
                  if (!currentIsInvulnerable && !hurtTriggered) {
                    hurtTriggered = true;
                    setIsScreenShaking(true);
                    setTimeout(() => setIsScreenShaking(false), 450);
                    const testIdx = maskedIndices[0] ?? 0;
                    const cipherCh = levelData.ciphertext?.[testIdx] ?? '';
                    const correctPlainCh = levelData.plaintext?.[testIdx] ?? '';
                    const testShift = ghost.signedVal ?? -ghost.shiftValue;
                    const wrongPlainCh = cipherCh ? caesarShiftChar(cipherCh, -testShift) : '?';
                    const opStr = ghost.char?.startsWith('+') ? `+ ${ghost.char.slice(1)}` : `− ${ghost.char?.replace(/^[−-]/, '')}`;
                    handleLoseHeart(
                      `Wrong shift! '${cipherCh}' ${opStr} = '${wrongPlainCh}', which does not match '${correctPlainCh}'. Check the Decryption Guide!`
                    );
                  }
                  // Despawn this wrong ghost
                  setTimeout(() => {
                    setGhosts((prev) => prev.map((g) => g.id === ghost.id ? { ...g, eaten: true } : g));
                  }, 520);
                  return { ...ghost, dying: true };
                }
              }

              if (ghost.index !== -1) {
                // Correct ghost letter: trigger death animation then remove
                correctGhostEatenThisTick = true;
                pacmanSound.playSfx('gold');
                setEatenGhosts((prevEaten) => {
                  const nextEaten = prevEaten.includes(ghost.index)
                    ? prevEaten
                    : [...prevEaten, ghost.index];
                  const allDone = isPlayfair
                    ? (maskedIndices.length > 0 && maskedIndices.every((idx) => nextEaten.includes(idx)))
                    : nextEaten.length === maskedIndices.length;
                  if (allDone) {
                    onClearSnapshot?.();
                    setLevelSolved(true);
                    pacmanSound.stopBgm();
                    pacmanSound.playSfx('win');
                  }
                  return nextEaten;
                });

                // start dying animation for this ghost
                setKnightAttacking(true);
                // Remove ghost after animation (480ms matches CSS animation) & replenish from queue
                setTimeout(() => {
                  setGhosts((prev) => {
                    const nextG = prev.map((g) => g.id === ghost.id ? { ...g, eaten: true } : g);
                    if (targetQueueRef.current && targetQueueRef.current.length > 0) {
                      const nextTarget = targetQueueRef.current.shift();
                      const spawnPositions = getGhostStartPositions(currentTier);
                      const pos = spawnPositions[Math.floor(Math.random() * spawnPositions.length)];
                      nextG.push({
                        id: `ghost-queued-${Date.now()}-${Math.random()}`,
                        char: nextTarget.char,
                        index: nextTarget.index,
                        row: pos.row,
                        col: pos.col,
                        eaten: false,
                        dir: pos.dir
                      });
                    }
                    return nextG;
                  });
                  setKnightAttacking(false);
                }, 520);
                return { ...ghost, dying: true }; // Atomically mark dying in the returned array
              } else {
                // Decoy ghost! Lose heart, trigger screen shake, rebound ghost
                if (!currentIsInvulnerable && !hurtTriggered) {
                  hurtTriggered = true;
                  setIsScreenShaking(true);
                  setTimeout(() => setIsScreenShaking(false), 450);
                  handleLoseHeart(
                    isPlayfair
                      ? `Ouch! You ate Decoy Ghost '${ghost.char}' which is not part of the correct plaintext pairs. Use the Playfair matrix!`
                      : `Ouch! You ate Decoy Ghost '${ghost.char}' which does not belong to the target blanks. Use the Shift Clue!`
                  );
                }

                const gDir = ghost.dir || { r: 0, c: 1 };
                const oppositeDir = { r: -gDir.r, c: -gDir.c };
                const rbRow = ghost.row + oppositeDir.r;
                const rbCol = ghost.col + oppositeDir.c;
                const canRebound = currentGrid[rbRow] && currentGrid[rbRow][rbCol] === 0;
                return {
                  ...ghost,
                  dir: oppositeDir,
                  row: canRebound ? rbRow : ghost.row,
                  col: canRebound ? rbCol : ghost.col,
                  moving: true
                };
              }
            } else {
              // Skill not active! Pacman gets caught! Lose heart, trigger screen shake, rebound ghost
              if (!currentIsInvulnerable && !hurtTriggered) {
                hurtTriggered = true;
                setIsScreenShaking(true);
                setTimeout(() => setIsScreenShaking(false), 450);
                handleLoseHeart(
                  `Ghost captured Pac-Man! Eat a yellow pellet and press SPACEBAR to activate Decryption Mode first.`
                );
              }

              const gDir = ghost.dir || { r: 0, c: 1 };
              const oppositeDir = { r: -gDir.r, c: -gDir.c };
              const rbRow = ghost.row + oppositeDir.r;
              const rbCol = ghost.col + oppositeDir.c;
              const canRebound = currentGrid[rbRow] && currentGrid[rbRow][rbCol] === 0;
              return {
                ...ghost,
                dir: oppositeDir,
                row: canRebound ? rbRow : ghost.row,
                col: canRebound ? rbCol : ghost.col,
                moving: true
              };
            }
          }
          return ghost;
        });

        // If a correct ghost was eaten and no decoy damage was taken this tick, grant invulnerability grace period
        if (correctGhostEatenThisTick && !hurtTriggered) {
          triggerInvulnerability(1200);
        }

        return nextGhosts;
      });

      // Chain next game tick loop (180ms constant interval)
      gameLoopRef.current = setTimeout(gameTick, 180);
    };

    gameLoopRef.current = setTimeout(gameTick, 180);
    return () => clearTimeout(gameLoopRef.current);
  }, [gameOver, levelSolved, isMenuOpen, phase]);

  // Non-stacking, non-wall dynamic pellet spawner using Refs to prevent interval clear loops
  useEffect(() => {
    if (gameOver || levelSolved || isMenuOpen || phase === 'ready') return;

    const spawnTimer = setInterval(() => {
      const currentPellets = pelletsRef.current;
      const currentPacman = pacmanRef.current;
      const currentGhosts = ghostsRef.current;

      const hasActiveSkillPellet = currentPellets.some(p => !p.eaten && p.isSkill);
      const needsSkill = !hasActiveSkillPellet;

      if (needsSkill) {
        // Collect candidate spawn tiles
        const openSpaces = [];
        const grid = activeMazeGridRef.current;
        for (let r = 1; r < grid.length - 1; r++) {
          for (let c = 1; c < grid[r].length - 1; c++) {
            if (grid[r][c] === 0) {
              const hasPacman = currentPacman.row === r && currentPacman.col === c;
              const hasGhost = currentGhosts.some(g => !g.eaten && g.row === r && g.col === c);
              const hasActivePellet = currentPellets.some(p => !p.eaten && p.row === r && p.col === c);

              if (!hasPacman && !hasGhost && !hasActivePellet) {
                openSpaces.push({ row: r, col: c });
              }
            }
          }
        }

        if (openSpaces.length > 0) {
          // Shuffle spaces
          const shuffledSpaces = [...openSpaces].sort(() => Math.random() - 0.5);
          const newPellets = [];

          if (shuffledSpaces[0]) {
            newPellets.push({
              id: `skill-${Date.now()}-${Math.random()}`,
              value: 0,
              row: shuffledSpaces[0].row,
              col: shuffledSpaces[0].col,
              eaten: false,
              isSkill: true
            });
          }

          if (newPellets.length > 0) {
            setPellets((prev) => [...prev.filter(p => !p.eaten), ...newPellets]);
          }
        }
      }
    }, 1500); // 1.5 seconds short delay

    return () => clearInterval(spawnTimer);
  }, [gameOver, levelSolved, isMenuOpen, phase]);

  const beginExplanation = () => {
    pacmanSound.stopBgm();
    autoRecapShownRef.current = true;
    setShowExplanation(true);
  };

  const handleVerifySubmit = () => {
    if (!levelSolved) return;
    beginExplanation();
  };

  const handleCloseExplanation = () => {
    onVerifySubmit();
  };

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  if (phase === 'ready') {
    if (isOperationLoading) {
      return (
        <StageLoadingScreen
          category={isPlayfair ? 'playfair' : isVigenere ? 'vigenere' : 'caesar'}
          difficulty={tier}
          stageIndex={(levelData.level || 1) - 1}
          onLoadingComplete={() => {
            setIsOperationLoading(false);
            onStartStageTimer?.();
            setPhase('playing');
          }}
        />
      );
    }

    const stageCode = `OP-${String(levelData.level || 1).padStart(2, '0')}`;
    const gameTitle = isPlayfair ? "Playfair Pac-Man" : (isVigenere ? "Vigenère Pac-Man" : "Caesar Pac-Man");
    return (
      <div className="pacman-container fg-root" ref={containerRef}>
        <GameHudBar
          title={gameTitle}
          stage={levelData.level}
          tier={tier}
          isReady={true}
          onBackToStages={onBackToStages}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          isMuted={isMuted}
          onToggleMute={toggleSound}
        />
        <div className="cq-brief-screen">
          <img
            className="cq-bg-img"
            src="/assets/fish/lobbybg/lobbybg.png"
            alt="Lobby Background"
            aria-hidden="true"
          />
          <div className="cq-lobby-scrim" />
          <div className="cq-dossier-card">
            {/* Left Column: Sprite Frame & Stage Code */}
            <div className="cq-dossier-left-col">
              <div className="cq-dossier-sprite-frame">
                <div className="cq-dossier-sprite cq-dossier-sprite-pacman" aria-hidden="true" />
              </div>
              <div className="cq-dossier-stage-code">{stageCode}</div>
            </div>

            {/* Right Column: Briefing Content */}
            <div className="cq-dossier-right-col">
              <div className="cq-dossier-tag">MISSION BRIEF</div>
              <h2 className="cq-dossier-title">{gameTitle}</h2>
              <p className="cq-dossier-subtitle">
                {isPlayfair
                  ? "Navigate the maze, eat skill freeze charges to slow down decoys, and eat the correct ghosts to decrypt the Playfair digraph pairs using the key matrix!"
                  : (isVigenere 
                    ? "Navigate the maze, eat skill freeze charges to slow down decoys, and eat the correct ghosts to decrypt the Vigenère cipher. Use the repeating keyword to find the shifts!"
                    : "Navigate the maze, eat skill freeze charges to slow down decoys, and eat the correct ghosts to decrypt the ciphertext under Caesar decryption.")}
              </p>
              <hr className="cq-dossier-divider" />
              <div className="cq-dossier-data">
                <div className="cq-dossier-row">
                  <span className="cq-dossier-label">CIPHERTEXT</span>
                  <span className="cq-dossier-value cyan-mono">{levelData.ciphertext}</span>
                </div>
                {isVigenere && (
                  <div className="cq-dossier-row">
                    <span className="cq-dossier-label">KEYWORD</span>
                    <span className="cq-dossier-value yellow-mono">{levelData.targetKey}</span>
                  </div>
                )}
                {isPlayfair && (
                  <div className="cq-dossier-row">
                    <span className="cq-dossier-label">KEYWORD</span>
                    <span className="cq-dossier-value yellow-mono">{levelData.key}</span>
                  </div>
                )}
                {cleanHint && (
                  <div className="cq-dossier-row">
                    <span className="cq-dossier-label">HINT</span>
                    <span className="cq-dossier-value hint-text">{cleanHint}</span>
                  </div>
                )}
              </div>
              <p className="cq-dossier-how-it-works">
                <strong>How it works:</strong>{' '}
                {isCaesar && currentTier !== 'easy'
                  ? 'Find the shift by comparing revealed letters with their cipher letters (cipher − plain). Then eat a yellow Skill Pellet, press SPACEBAR for Decryption Mode, and eat the ghost carrying the CORRECT shift — wrong shift ghosts will hurt you!'
                  : 'Eat a yellow Skill Pellet, then press SPACEBAR to activate Decryption Mode. While active, eat the ghost carrying the correct shift value to decrypt the letter!'}
              </p>
              <button
                className="cq-dossier-action-btn"
                onClick={() => {
                  pacmanSound.unlockAudio();
                  pacmanSound.playBgm();
                  setIsOperationLoading(true);
                }}
              >
                Begin operation
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1. Find the first unsolved digraph index for active highlight
  let activeIndex = -1;
  if (isPlayfair && levelData.pairs) {
    activeIndex = levelData.pairs.findIndex((_, idx) => !eatenGhosts.includes(idx));
  }
  const cipherPair = (isPlayfair && levelData.cipherPairs && activeIndex !== -1) ? levelData.cipherPairs[activeIndex] : null;

  // 2. Build matrix letter position lookup
  const lookup = {};
  if (isPlayfair && levelData.matrix) {
    levelData.matrix.forEach((row, rowIndex) => {
      row.forEach((letter, colIndex) => {
        lookup[letter] = { row: rowIndex, col: colIndex };
      });
    });
  }

  // 3. Highlight positions for active cipher pair
  const cipherHighlight = new Set();
  if (cipherPair) {
    const [a, b] = cipherPair.split('');
    if (lookup[a]) cipherHighlight.add(`${lookup[a].row}-${lookup[a].col}`);
    if (lookup[b]) cipherHighlight.add(`${lookup[b].row}-${lookup[b].col}`);
  }

  const renderMazeBoard = () => {
    const mazeGrid = activeMazeGrid;
    const numRows = mazeGrid.length;
    const numCols = mazeGrid[0].length;
    const cellSize = currentTier === 'hard' ? 36 : currentTier === 'medium' ? 40 : 46;

    return (
      <div 
        className={`maze-grid size-larger tier-${currentTier} ${flashError ? 'flash-error' : ''} ${isScreenShaking ? 'screen-shake' : ''}`}
        style={{
          '--pacman-cell-size': `${cellSize}px`,
          gridTemplateColumns: `repeat(${numCols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${numRows}, ${cellSize}px)`,
          width: `${numCols * cellSize}px`,
          height: `${numRows * cellSize}px`
        }}
      >
        {/* Static grid board paths and walls */}
        {mazeGrid.map((rowArr, rIdx) =>
          rowArr.map((cellVal, cIdx) => {
            let cellClass = "maze-cell";
            if (cellVal === 1) cellClass += " wall";
            else cellClass += " path";
            return <div key={`bg-${rIdx}-${cIdx}`} className={cellClass} style={{ width: `${cellSize}px`, height: `${cellSize}px` }}></div>;
          })
        )}

      {/* Absolute 30fps gliding Pac-Man sprite (No delay) */}
      <div 
        className={`pacman-sprite-absolute ${isInvulnerable ? 'invulnerable-blink' : ''}`}
        style={{
          width: `${cellSize}px`,
          height: `${cellSize}px`,
          left: `${pacman.col * cellSize}px`,
          top: `${pacman.row * cellSize}px`
        }}
      >
        <div className="knight-actor">
          {(() => {
            const facing = facingFromDir(pacmanDir);
            const faceClass = facing === 'LEFT' ? 'face-left' : (facing === 'UP' ? 'face-up' : (facing === 'DOWN' ? 'face-down' : ''));
            const movementClass = (pacmanDir && pacmanDir !== 'NONE') ? 'run' : 'idle';
            const attackClass = knightAttacking ? 'attack' : '';
            return <div className={`knight-sheet ${faceClass} ${movementClass} ${attackClass}`} />;
          })()}
        </div>
      </div>

      {/* Slower gliding Ghosts (0.5x speed) */}
      {ghosts.map((ghost) => {
        if (ghost.eaten) return null;
        const isVulnerable = skillActive;
        const facing = facingFromDir(null, ghost.dir);
        const faceClass = facing === 'LEFT' ? 'face-left' : (facing === 'UP' ? 'face-up' : (facing === 'DOWN' ? 'face-down' : ''));
        const movementClass = ghost.moving ? 'run' : 'idle';
        const dyingClass = ghost.dying ? 'attack' : '';
        return (
          <div
            key={ghost.id}
            className={`ghost-sprite-absolute ${isVulnerable ? 'vulnerable' : ''}`}
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              left: `${ghost.col * cellSize}px`,
              top: `${ghost.row * cellSize}px`
            }}
          >
              <div className="goblin-actor">
                <div className={`goblin-sheet ${faceClass} ${movementClass} ${dyingClass}`} />
                <span className="ghost-inner-letter">{ghost.char}</span>
              </div>
          </div>
        );
      })}

      {/* Absolute Pellet positions (Non-stacking) */}
      {pellets.map((pellet) => {
        if (pellet.eaten) return null;
        return (
          <div
            key={pellet.id}
            className="pellet-entity"
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              left: `${pellet.col * cellSize}px`,
              top: `${pellet.row * cellSize}px`
            }}
          >
            {pellet.isSkill ? (
              <div className="gold-pellet-sheet" />
            ) : (
              <div className="circle-pellet-badge score-dot" />
            )}
          </div>
        );
      })}
    </div>
  );
};

  return (
    <div className="pacman-container fg-root" ref={containerRef}>
      {showExplanation && (
        <CryptographicRecap
          cipherType={isPlayfair ? 'playfair' : (isVigenere ? 'vigenere' : 'caesar')}
          levelData={levelData}
          onUnlockNext={handleCloseExplanation}
        />
      )}

      {/* Header UI */}
      <GameHudBar
        title={isPlayfair ? "Playfair Pac-Man" : (isVigenere ? "Vigenère Pac-Man" : "Caesar Pac-Man")}
        stage={levelData.level}
        tier={tier}
        isReady={false}
        onOpenMenu={() => setIsMenuOpen(true)}
        lives={lives}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        isMuted={isMuted}
        onToggleMute={toggleSound}
      />

      <div className={`pacman-layout caesar-pacman-fullscreen tier-${currentTier} ${isVigenere ? 'vg-pacman-fullscreen' : ''} ${isPlayfair ? 'pf-pacman-fullscreen' : ''}`}>
        <div className="pacman-fullscreen-stage">
          {/* 1. Centered Maze Board Area */}
          <div className="pacman-fullscreen-board-area">
            {renderMazeBoard()}
          </div>

          {/* 2. Top-Center Floating Word Panel */}
          <section className="caesar-pacman-floating-word-panel">
            {isPlayfair ? (
              <div className="fg-word-segments-row">
                <div className="fg-word-segment-card">
                  <div className="fg-letter-cells">
                    {playfairPairsData.map((pair, idx) => {
                      const isActive = idx === activePfSolvingIdx;
                      let cellClass = "fg-letter-cell pf-digraph-cell";
                      if (pair.isSolved) {
                        cellClass += " correct-plain";
                      } else if (isActive) {
                        cellClass += " active-target";
                      }

                      return (
                        <div
                          key={idx}
                          className={cellClass}
                          title={`Cipher: ${pair.cipherPair} → Plain: ${pair.isSolved ? pair.plainPair : '??'}`}
                        >
                          <span className="fg-cell-ciphertext">{pair.cipherPair}</span>
                          <span className="fg-cell-plaintext">{pair.isSolved ? pair.plainPair : '__'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : isVigenere ? (
              <div className="fg-word-segments-row">
                <div className="fg-word-segment-card">
                  <div className="fg-letter-cells">
                    {(levelData.plaintext || '').split('').map((char, idx) => {
                      const mask = getMask(levelData, idx);
                      const isGhostIndex = !mask;
                      const isEaten = eatenGhosts.includes(idx);
                      const displayChar = mask ? char : (isGhostIndex && isEaten ? char : '_');
                      const isActive = idx === activeSolvingIndex;

                      let cellClass = "fg-letter-cell";
                      if (mask) {
                        cellClass += " correct-plain";
                      } else if (isGhostIndex) {
                        cellClass += isEaten ? " correct-plain" : (isActive ? " active-slot masked" : " masked");
                      }

                      return (
                        <div key={idx} className={cellClass}>
                          <span className="fg-cell-ciphertext">{levelData.ciphertext ? levelData.ciphertext[idx] : ''}</span>
                          <span className="fg-cell-plaintext">{displayChar}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="caesar-pacman-word-card">
                <div className="caesar-pacman-word-top-row">
                  <span className="caesar-pacman-shift-label">Active Shift:</span>
                  <span className="caesar-pacman-shift-badge">
                    {activeShiftValue === 0 ? '0' : (activeShiftValue > 0 ? `+${activeShiftValue}` : `${activeShiftValue}`)}
                  </span>
                </div>

                <div className="fg-letter-cells">
                  {(levelData.plaintext || '').split('').map((char, idx) => {
                    const mask = getMask(levelData, idx);
                    const isGhostIndex = !mask;
                    const isSolved = isCaesar ? (levelSolved && activeShiftValue !== 0) : eatenGhosts.includes(idx);
                    const displayChar = mask ? char : (isSolved ? char : '_');

                    let cellClass = "fg-letter-cell";
                    if (mask) {
                      cellClass += " correct-plain";
                    } else if (isGhostIndex) {
                      cellClass += isSolved ? " correct-plain" : " masked";
                    }

                    return (
                      <div key={idx} className={cellClass}>
                        <span className="fg-cell-ciphertext">{levelData.ciphertext ? levelData.ciphertext[idx] : ''}</span>
                        <span className="fg-cell-plaintext">{displayChar}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {isPlayfair ? (
              levelData.hint ? (
                <div className="caesar-pacman-clue-banner">
                  💡 Hint: <strong>"{levelData.hint}"</strong>
                </div>
              ) : null
            ) : isVigenere ? (
              cleanHint ? (
                <div className="caesar-pacman-clue-banner">
                  💡 Hint: <strong>"{cleanHint}"</strong>
                </div>
              ) : null
            ) : (
              <div className="caesar-pacman-clue-banner">
                💡 Clue Context: <strong>"{levelData.hint}"</strong>
              </div>
            )}
          </section>

          {/* 3. Bottom-Left Floating Reference Panel */}
          {isCaesar ? (
            <CaesarCheatSheet
              tier={currentTier}
              targetShift={targetShift}
              activeShift={activeShiftValue}
              ciphertext={levelData.ciphertext || ''}
              plaintext={levelData.plaintext || ''}
              levelSolved={levelSolved}
              levelData={levelData}
            />
          ) : isVigenere ? (
            <div className="vg-floating-key-panel vg-fishing-az-panel vg-pacman-az-panel">
              <div className="vg-floating-current-slot">
                <div className="vg-arithmetic-title-stacked">
                  <span className="vg-arithmetic-title-line">DECRYPTION</span>
                  <span className="vg-arithmetic-title-line">ARITHMETIC</span>
                </div>
                <button
                  type="button"
                  className="vg-tabula-modal-btn vg-tabula-btn-compact"
                  onClick={() => setShowTabula(true)}
                  title="Open Interactive Tabula Recta"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>grid_on</span>
                  <span>Tabula Recta</span>
                </button>
              </div>

              {/* Dedicated active calculation card */}
              <div className="vg-fishing-calc-card">
                <div className="vg-calc-top-row">
                  <span className="vg-calc-label">ACTIVE LETTER DECRYPTION</span>
                  <span className="vg-calc-badge vg-pos-stepper">
                    <button
                      type="button"
                      className="vg-pos-stepper-btn"
                      onClick={handlePrevVgPos}
                      disabled={unsolvedVgItems.length <= 1}
                      aria-label="Previous unsolved position"
                    >
                      ‹
                    </button>
                    <span className="vg-pos-stepper-label">Pos #{(activeViewingVgItem?.globalIdx ?? 0) + 1}</span>
                    <button
                      type="button"
                      className="vg-pos-stepper-btn"
                      onClick={handleNextVgPos}
                      disabled={unsolvedVgItems.length <= 1}
                      aria-label="Next unsolved position"
                    >
                      ›
                    </button>
                  </span>
                </div>
                <div className="vg-calc-formula-row">
                  <div className="vg-calc-item cipher">
                    <span className="lbl">Cipher</span>
                    <strong>{activeViewingVgItem ? activeViewingVgItem.cipherChar : '-'}</strong>
                    <span className="val">{activeViewingVgItem ? charToIdx(activeViewingVgItem.cipherChar) : 0}</span>
                  </div>
                  <span className="vg-calc-op">−</span>
                  <div className="vg-calc-item key">
                    <span className="lbl">Key</span>
                    <strong>{activeViewingVgItem ? activeViewingVgItem.keyChar : '-'}</strong>
                    <span className="val">{activeViewingVgItem ? activeViewingVgItem.shiftVal : 0}</span>
                  </div>
                  <span className="vg-calc-op">=</span>
                  <div className={`vg-calc-item plain ${activeViewingVgItem && activeViewingVgItem.isSolved ? 'is-solved' : ''}`}>
                    <span className="lbl">Target</span>
                    <strong style={{ color: activeViewingVgItem && activeViewingVgItem.isSolved ? 'var(--neon-green)' : '#ffffff' }}>
                      {activeViewingVgItem && activeViewingVgItem.isSolved ? activeViewingVgItem.plainChar : '?'}
                    </strong>
                    <span
                      className="val"
                      style={{ visibility: activeViewingVgItem && activeViewingVgItem.isSolved ? 'visible' : 'hidden' }}
                    >
                      {activeViewingVgItem ? (charToIdx(activeViewingVgItem.cipherChar) - activeViewingVgItem.shiftVal + 26) % 26 : 0}
                    </span>
                  </div>
                </div>

                {/* Calculate prompt line */}
                <div className="vg-calc-help-row">
                  {activeViewingVgItem && activeViewingVgItem.isSolved ? (
                    <span className="vg-calc-help-text solved">
                      ✅ Solved: {activeViewingVgItem.cipherChar} ({charToIdx(activeViewingVgItem.cipherChar)}) − {activeViewingVgItem.keyChar} ({activeViewingVgItem.shiftVal}) {charToIdx(activeViewingVgItem.cipherChar) - activeViewingVgItem.shiftVal < 0 ? '+ 26 ' : ''}= {activeViewingVgItem.plainChar} ({(charToIdx(activeViewingVgItem.cipherChar) - activeViewingVgItem.shiftVal + 26) % 26})
                    </span>
                  ) : activeViewingVgItem && (charToIdx(activeViewingVgItem.cipherChar) - activeViewingVgItem.shiftVal < 0) ? (
                    <span className="vg-calc-help-text wrap-around">
                      ⚠️ Wrap-Around: Calculate ({charToIdx(activeViewingVgItem.cipherChar)} − {activeViewingVgItem.shiftVal} + 26) = <strong>?</strong>
                    </span>
                  ) : (
                    <span className="vg-calc-help-text normal">
                      💡 Calculate: {activeViewingVgItem ? charToIdx(activeViewingVgItem.cipherChar) : 0} − {activeViewingVgItem ? activeViewingVgItem.shiftVal : 0} = <strong>?</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* 2-row x 13-col Alphabet grid */}
              <div className="vg-sprint-alphabet-grid">
                <div className="vg-alphabet-row">
                  {alphabet.slice(0, 13).map((ch, i) => {
                    const isCipher = activeViewingVgItem && ch === activeViewingVgItem.cipherChar;
                    const isKey = activeViewingVgItem && ch === activeViewingVgItem.keyChar;
                    const isTarget = activeViewingVgItem && activeViewingVgItem.isSolved && ch === activeViewingVgItem.plainChar;
                    let cellClass = "vg-alphabet-cell";
                    if (isCipher) cellClass += " is-cipher";
                    if (isKey) cellClass += " is-key";
                    if (isTarget) cellClass += " is-target";
                    return (
                      <div key={ch} className={cellClass} title={`${ch} = ${i}`}>
                        <span className="vg-alpha-char">{ch}</span>
                        <span className="vg-alpha-val">{i}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="vg-alphabet-row">
                  {alphabet.slice(13, 26).map((ch, i) => {
                    const val = i + 13;
                    const isCipher = activeViewingVgItem && ch === activeViewingVgItem.cipherChar;
                    const isKey = activeViewingVgItem && ch === activeViewingVgItem.keyChar;
                    const isTarget = activeViewingVgItem && activeViewingVgItem.isSolved && ch === activeViewingVgItem.plainChar;
                    let cellClass = "vg-alphabet-cell";
                    if (isCipher) cellClass += " is-cipher";
                    if (isKey) cellClass += " is-key";
                    if (isTarget) cellClass += " is-target";
                    return (
                      <div key={ch} className={cellClass} title={`${ch} = ${val}`}>
                        <span className="vg-alpha-char">{ch}</span>
                        <span className="vg-alpha-val">{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="pf-bottom-left-group">
              {/* 1. 5×5 Matrix (Left) */}
              <div className="caesar-floating-cheat-sheet playfair-matrix-card pf-matrix-panel">
                <div className="vg-floating-current-slot" style={{ marginBottom: '6px' }}>
                  <div className="vg-arithmetic-title-stacked">
                    <span className="vg-arithmetic-title-line">PLAYFAIR</span>
                    <span className="vg-arithmetic-title-line">5×5 MATRIX</span>
                  </div>
                  <span className="vg-calc-badge">Key: {levelData.key || 'KEY'}</span>
                </div>
                <div className="caesar-cheat-body playfair-cheat-body">
                  <div className="pf-template-matrix-grid">
                    {(levelData.matrix || []).map((row, rowIndex) =>
                      row.map((letter, colIndex) => {
                        const isCipherActive = (viewingPfPosA && viewingPfPosA.r === rowIndex && viewingPfPosA.c === colIndex) || (viewingPfPosB && viewingPfPosB.r === rowIndex && viewingPfPosB.c === colIndex);
                        const isTargetAActive = (viewingPfPair.isSolved || viewingPfHasHint0) && viewingPfTargetPosA && viewingPfTargetPosA.r === rowIndex && viewingPfTargetPosA.c === colIndex;
                        const isTargetBActive = (viewingPfPair.isSolved || viewingPfHasHint1) && viewingPfTargetPosB && viewingPfTargetPosB.r === rowIndex && viewingPfTargetPosB.c === colIndex;
                        const isTargetActive = isTargetAActive || isTargetBActive;
                        const displayLetter = letter === 'I' ? 'I/J' : letter;
                        let cellClass = 'pf-template-cell';
                        if (isCipherActive) cellClass += ' cipher-active active';
                        else if (isTargetActive) cellClass += ' target-active';

                        return (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className={cellClass}
                          >
                            {displayLetter}
                          </div>
                        );
                      })
                    )}
                    {(viewingPfEffectiveRule === 'row' || viewingPfEffectiveRule === 'column') && viewingPfPosA && viewingPfPosB && (
                      <svg
                        className="pf-matrix-lines-overlay"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <marker
                            id="pf-arrow-amber-pacman"
                            viewBox="0 0 6 6"
                            refX="5"
                            refY="3"
                            markerWidth="4"
                            markerHeight="4"
                            orient="auto-start-reverse"
                          >
                            <path d="M 0 0 L 6 3 L 0 6 z" fill="#ffc146" />
                          </marker>
                        </defs>
                        {viewingPfEffectiveRule === 'row' && (
                          <>
                            {viewingPfPosA.c > 0 ? (
                              <line
                                x1={(viewingPfPosA.c + 0.5) * 20}
                                y1={(viewingPfPosA.r + 0.5) * 20}
                                x2={(viewingPfPosA.c - 1 + 0.5) * 20}
                                y2={(viewingPfPosA.r + 0.5) * 20}
                                stroke="#ffc146"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                markerEnd="url(#pf-arrow-amber-pacman)"
                              />
                            ) : (
                              <>
                                <line
                                  x1={(viewingPfPosA.c + 0.5) * 20}
                                  y1={(viewingPfPosA.r + 0.5) * 20}
                                  x2="0"
                                  y2={(viewingPfPosA.r + 0.5) * 20}
                                  stroke="#ffc146"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                />
                                <line
                                  x1="100"
                                  y1={(viewingPfPosA.r + 0.5) * 20}
                                  x2={(4 + 0.5) * 20}
                                  y2={(viewingPfPosA.r + 0.5) * 20}
                                  stroke="#ffc146"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  markerEnd="url(#pf-arrow-amber-pacman)"
                                />
                              </>
                            )}
                            {viewingPfPosB.c > 0 ? (
                              <line
                                x1={(viewingPfPosB.c + 0.5) * 20}
                                y1={(viewingPfPosB.r + 0.5) * 20}
                                x2={(viewingPfPosB.c - 1 + 0.5) * 20}
                                y2={(viewingPfPosB.r + 0.5) * 20}
                                stroke="#ffc146"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                markerEnd="url(#pf-arrow-amber-pacman)"
                              />
                            ) : (
                              <>
                                <line
                                  x1={(viewingPfPosB.c + 0.5) * 20}
                                  y1={(viewingPfPosB.r + 0.5) * 20}
                                  x2="0"
                                  y2={(viewingPfPosB.r + 0.5) * 20}
                                  stroke="#ffc146"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                />
                                <line
                                  x1="100"
                                  y1={(viewingPfPosB.r + 0.5) * 20}
                                  x2={(4 + 0.5) * 20}
                                  y2={(viewingPfPosB.r + 0.5) * 20}
                                  stroke="#ffc146"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  markerEnd="url(#pf-arrow-amber-pacman)"
                                />
                              </>
                            )}
                          </>
                        )}
                        {viewingPfEffectiveRule === 'column' && (
                          <>
                            {viewingPfPosA.r > 0 ? (
                              <line
                                x1={(viewingPfPosA.c + 0.5) * 20}
                                y1={(viewingPfPosA.r + 0.5) * 20}
                                x2={(viewingPfPosA.c + 0.5) * 20}
                                y2={(viewingPfPosA.r - 1 + 0.5) * 20}
                                stroke="#ffc146"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                markerEnd="url(#pf-arrow-amber-pacman)"
                              />
                            ) : (
                              <>
                                <line
                                  x1={(viewingPfPosA.c + 0.5) * 20}
                                  y1={(viewingPfPosA.r + 0.5) * 20}
                                  x2={(viewingPfPosA.c + 0.5) * 20}
                                  y2="0"
                                  stroke="#ffc146"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                />
                                <line
                                  x1={(viewingPfPosA.c + 0.5) * 20}
                                  y1="100"
                                  x2={(viewingPfPosA.c + 0.5) * 20}
                                  y2={(4 + 0.5) * 20}
                                  stroke="#ffc146"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  markerEnd="url(#pf-arrow-amber-pacman)"
                                />
                              </>
                            )}
                            {viewingPfPosB.r > 0 ? (
                              <line
                                x1={(viewingPfPosB.c + 0.5) * 20}
                                y1={(viewingPfPosB.r + 0.5) * 20}
                                x2={(viewingPfPosB.c + 0.5) * 20}
                                y2={(viewingPfPosB.r - 1 + 0.5) * 20}
                                stroke="#ffc146"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                markerEnd="url(#pf-arrow-amber-pacman)"
                              />
                            ) : (
                              <>
                                <line
                                  x1={(viewingPfPosB.c + 0.5) * 20}
                                  y1={(viewingPfPosB.r + 0.5) * 20}
                                  x2={(viewingPfPosB.c + 0.5) * 20}
                                  y2="0"
                                  stroke="#ffc146"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                />
                                <line
                                  x1="100"
                                  y1={(viewingPfPosB.r + 0.5) * 20}
                                  x2={(4 + 0.5) * 20}
                                  y2={(viewingPfPosB.r + 0.5) * 20}
                                  stroke="#ffc146"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  markerEnd="url(#pf-arrow-amber-pacman)"
                                />
                              </>
                            )}
                          </>
                        )}
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Active Digraph Decryption (Right) */}
              {viewingPfPair && (
                <div className="caesar-floating-cheat-sheet pf-digraph-panel">
                  <div className="vg-fishing-calc-card">
                    <div className="vg-calc-top-row">
                      <span className="vg-calc-label">ACTIVE DIGRAPH DECRYPTION</span>
                      <span className="vg-calc-badge vg-pos-stepper">
                        <button
                          type="button"
                          className="vg-pos-stepper-btn"
                          onClick={handlePrevPfPair}
                          disabled={unsolvedPfIndices.length <= 1}
                          aria-label="Previous unsolved pair"
                        >
                          ‹
                        </button>
                        <span className="vg-pos-stepper-label">Pair #{viewingPfIndex + 1}</span>
                        <button
                          type="button"
                          className="vg-pos-stepper-btn"
                          onClick={handleNextPfPair}
                          disabled={unsolvedPfIndices.length <= 1}
                          aria-label="Next unsolved pair"
                        >
                          ›
                        </button>
                      </span>
                    </div>
                    <div className="pf-calc-formula-row">
                      <div className="pf-calc-box cipher">
                        <span className="lbl">CIPHER</span>
                        <strong className="val">{viewingPfPair.cipherPair}</strong>
                      </div>
                      <div className="pf-calc-box rule-chip">
                        <span className="lbl">RULE</span>
                        <strong className="val">{viewingPfRuleChipText}</strong>
                      </div>
                      <div className={`pf-calc-box target ${viewingPfPair.isSolved ? 'is-solved' : ''}`}>
                        <span className="lbl">TARGET</span>
                        <strong className="val">
                          {viewingPfPair.isSolved ? (
                            viewingPfPair.plainPair
                          ) : (
                            <>
                              {viewingPfHasHint0 ? (
                                <span className="pf-hint-char">{viewingPfPair.plainPair[0]}</span>
                              ) : (
                                '?'
                              )}
                              {viewingPfHasHint1 ? (
                                <span className="pf-hint-char">{viewingPfPair.plainPair[1]}</span>
                              ) : (
                                '?'
                              )}
                            </>
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="pf-trace-block">
                      <div className="pf-trace-line cipher-line">
                        {viewingPfPosA && viewingPfPosB
                          ? `${viewingPfC1} r${viewingPfPosA.r} c${viewingPfPosA.c}   ${viewingPfC2} r${viewingPfPosB.r} c${viewingPfPosB.c}`
                          : `${viewingPfPair.cipherPair}`}
                      </div>
                      <div className="pf-trace-line rule-line">
                        {viewingPfEffectiveRule === 'row'
                          ? `same row (r${viewingPfPosA?.r ?? 0})`
                          : viewingPfEffectiveRule === 'column'
                          ? `same column (c${viewingPfPosA?.c ?? 0})`
                          : 'different row + column'}
                      </div>
                      <div className="pf-trace-line rule-line">
                        {viewingPfEffectiveRule === 'row'
                          ? 'same row → wrap around'
                          : viewingPfEffectiveRule === 'column'
                          ? 'same column ↓ wrap around'
                          : 'rectangle ⇄ swap'}
                      </div>
                      <div className="pf-trace-line target-line">
                        {viewingPfTargetPosA && viewingPfTargetPosB
                          ? `${viewingPfT1Disp} r${viewingPfTargetPosA.r} c${viewingPfTargetPosA.c}   ${viewingPfT2Disp} r${viewingPfTargetPosB.r} c${viewingPfTargetPosB.c}`
                          : `${viewingPfT1Disp}${viewingPfT2Disp}`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Bottom-Center Floating Keyword Pill (Vigenère) / Key Clue (Caesar & Playfair) */}
          {isVigenere ? (
            <div className="vg-fishing-bottom-keyword" title={`Repeating Keyword: ${levelData.targetKey}`}>
              <span className="vg-pill-lbl">KEYWORD</span>
              <span className="vg-pill-val">{levelData.targetKey}</span>
            </div>
          ) : (
            <div className="caesar-floating-basket-card caesar-pacman-clue-card">
              <div className="caesar-basket-icon">🔑</div>
              {isPlayfair ? (
                <>
                  <div className="caesar-basket-badge" style={{ fontSize: '1.1rem', letterSpacing: '1px', color: 'var(--neon-yellow)' }}>
                    {levelData.key}
                  </div>
                  <span className="caesar-basket-label">Playfair Key Clue</span>
                </>
              ) : (
                <>
                  <div className="caesar-basket-badge">
                    {(isCaesar && currentTier !== 'easy') ? '??' : `+${targetShift}`}
                  </div>
                  <span className="caesar-basket-label">
                    {(isCaesar && currentTier !== 'easy') ? 'Shift Unknown — Derive It!' : 'Caesar Shift Key Clue'}
                  </span>
                </>
              )}
            </div>
          )}

          {/* 5. Bottom-Right Floating Skill Freeze Charge */}
          <div className={`skill-charge-card caesar-pacman-skill-card ${hasSkillCharge ? 'charged' : ''} ${skillActive ? 'active' : ''}`}>
            <div className="skill-charge-title">Skill Freeze Charge</div>
            <div className="skill-pellet-icon-wrapper">
              <span className="material-symbols-outlined skill-bolt">flash_on</span>
            </div>
            {skillActive ? (
              <div className="skill-timer-badge">FREEZE ACTIVE: {skillTimeLeft}s</div>
            ) : hasSkillCharge ? (
              <button className="activate-skill-btn" onClick={activateSkill}>Press SPACEBAR</button>
            ) : (
              <div className="skill-hint-label">Eat yellow pellet to charge</div>
            )}
          </div>

          {/* 6. Non-disruptive Floating Alert Message (Top-Left) */}
          {ruleViolation && (
            <div className="caesar-floating-rule-violation caesar-pacman-floating-alert">
              <div className="caesar-violation-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>warning</span>
                Alert
              </div>
              <p className="caesar-violation-body">{ruleViolation}</p>
            </div>
          )}

          {/* 7. Floating Secured Victory Panel when level solved */}
          {levelSolved && <VictoryConfetti isPaused={isMenuOpen} />}
          {levelSolved && (
            <div className="caesar-floating-victory-panel caesar-pacman-victory-panel">
              <h3 className="caesar-victory-title">STAGE SECURED!</h3>
              <p className="caesar-victory-desc">All segments decrypted successfully.</p>
              <button
                className="fg-btn fg-btn-primary"
                onClick={handleVerifySubmit}
              >
                Verify & Submit
              </button>
              {onReplayNewQuestion && (
                <button
                  className="fg-btn fg-btn-secondary"
                  onClick={onReplayNewQuestion}
                >
                  Play Again
                </button>
              )}
            </div>
          )}

          {/* 8. Tabula Recta Modal for Vigenère Mode */}
          {showTabula && isVigenere && (
            <div className="vg-modal-overlay" onClick={() => setShowTabula(false)}>
              <div className="vg-modal-card tabula-modal" onClick={e => e.stopPropagation()}>
                <div className="vg-modal-header">
                  <h3>📊 Interactive Tabula Recta</h3>
                  <button className="vg-modal-close" onClick={() => setShowTabula(false)}>×</button>
                </div>
                <div className="vg-modal-body">
                  <p className="vg-modal-instructions">
                    The Tabula Recta is a 26×26 grid of shifted alphabets. Find the column of your <strong>Cipher letter (C)</strong>,
                    then look at the row of your <strong>Key letter (K)</strong> to find the intersection, which is the <strong>Plain letter (P)</strong>!
                    <br />
                    <span style={{ color: 'var(--neon-yellow)' }}>★ Gold Rows: rows containing key letters for this level's key ("{levelData.targetKey}") are highlighted.</span>
                  </p>
                  <div className="vg-tabula-scroll-wrapper">
                    <table className="vg-tabula-full-grid">
                      <thead>
                        <tr>
                          <th className="corner-cell">K \ P</th>
                          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(ch => (
                            <th key={ch} className="col-header">{ch}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((kChar) => {
                          const isCorrectKey = levelData.targetKey ? levelData.targetKey.includes(kChar) : false;
                          const rowLetters = tabulaRow(kChar);
                          return (
                            <tr key={kChar} className={isCorrectKey ? 'correct-key-row' : ''}>
                              <td className="row-header">{kChar}</td>
                              {rowLetters.map((cChar, cIdx) => {
                                const plainLetter = idxToChar(cIdx);
                                return (
                                  <td 
                                    key={cIdx} 
                                    className="cell"
                                    title={`Key: ${kChar}, Plain: ${plainLetter} → Cipher: ${cChar}`}
                                  >
                                    {cChar}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game Over modal overlay - no retry: losing the stage is final and
          costs one server session heart (reported via onStageFail). */}
      {gameOver && (
        <StageLostScreen
          open
          reason="You ran out of lives in the maze."
          heartsLeft={stageLoss?.heartsLeft ?? null}
          maxHearts={stageLoss?.maxHearts ?? 3}
          lockedOut={stageLoss?.lockedOut ?? false}
          cooldownEndTime={stageLoss?.cooldownEndTime ?? null}
          totalScore={stageLoss?.totalScore ?? null}
          onExit={() => {
            onClearSnapshot?.();
            onBackToStages();
          }}
        />
      )}

      {/* Tabula Recta Modal for Vigenère Mode */}
      {showTabula && isVigenere && (
        <div className="vg-modal-overlay" onClick={() => setShowTabula(false)}>
          <div className="vg-modal-card tabula-modal" onClick={e => e.stopPropagation()}>
            <div className="vg-modal-header">
              <h3>📊 Interactive Tabula Recta</h3>
              <button className="vg-modal-close" onClick={() => setShowTabula(false)}>×</button>
            </div>
            <div className="vg-modal-body">
              <p className="vg-modal-instructions">
                The Tabula Recta is a 26×26 grid of shifted alphabets. Find the column of your <strong>Cipher letter (C)</strong>,
                then look at the row of your <strong>Key letter (K)</strong> to find the intersection, which is the <strong>Plain letter (P)</strong>!
                <br />
                <span style={{ color: 'var(--neon-yellow)' }}>★ Gold Rows: rows containing key letters for this level's key ("{levelData.targetKey}") are highlighted.</span>
              </p>
              <div className="vg-tabula-scroll-wrapper">
                <table className="vg-tabula-full-grid">
                  <thead>
                    <tr>
                      <th className="corner-cell">K \ P</th>
                      {alphabet.map(ch => (
                        <th key={ch} className="col-header">{ch}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alphabet.map((kChar) => {
                      const isCorrectKey = levelData.targetKey ? levelData.targetKey.includes(kChar) : false;
                      const rowLetters = tabulaRow(kChar);
                      return (
                        <tr key={kChar} className={isCorrectKey ? 'correct-key-row' : ''}>
                          <td className="row-header">{kChar}</td>
                          {rowLetters.map((cChar, cIdx) => {
                            const plainLetter = idxToChar(cIdx);
                            return (
                              <td 
                                key={cIdx} 
                                className="cell"
                                title={`Key: ${kChar}, Plain: ${plainLetter} → Cipher: ${cChar}`}
                              >
                                {cChar}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared Pause Menu */}
      <PauseMenu
        open={isMenuOpen}
        onResume={() => setIsMenuOpen(false)}
        onTutorial={() => {
          onClearSnapshot?.();
          setIsMenuOpen(false);
          setPhase('ready');
        }}
        onExit={() => {
          onClearSnapshot?.();
          onBackToStages();
        }}
      />
    </div>
  );
}
