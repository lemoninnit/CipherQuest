/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef } from 'react';
import './PacmanGame.css';
import '../../CipherGame.css';
import GameHudBar from '../../ui/GameHudBar';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import { pacmanSound } from './pacmanSound';
import PauseMenu from '../../ui/PauseMenu';
import CryptographicRecap from '../../ui/CryptographicRecap';
import VictoryConfetti from '../../ui/VictoryConfetti';
import { facingFromDir } from './pacmanWorld';

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

const describePlayfairRule = (rule) => {
  if (rule === 'row') return `Same row: move one column left for both letters.`;
  if (rule === 'column') return `Same column: move one row upward for both letters.`;
  return 'Rectangle: keep each row, swap to the other letter column.';
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
const getRequiredTargetItems = (levelData) => {
  if (!levelData) return [];
  const isPlayfair = !!levelData.matrix;
  if (isPlayfair) {
    const pairs = levelData.pairs || [];
    return pairs.map((plainPair, i) => ({
      index: i,
      char: plainPair,
      id: `ghost-target-${i}`
    }));
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
const generateInitialGhosts = (levelData, tier) => {
  const normTier = String(tier || levelData?.tier || 'easy').toLowerCase();
  const maxActive = MAX_ACTIVE_TARGET_GHOSTS[normTier] || 8;
  const decoyCount = DECOY_GHOST_COUNT[normTier] || 2;
  const startPositions = getGhostStartPositions(normTier);

  const isPlayfair = !!levelData.matrix;
  const requiredTargets = getRequiredTargetItems(levelData);
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

  // Add decoy ghosts for distraction/challenge
  const alphabet = isPlayfair ? 'ABCDEFGHIKLMNOPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const targetLetters = requiredTargets.map(t => t.char);
  const ciphertextLetters = levelData?.ciphertext ? levelData.ciphertext.split('') : [];
  const plaintextLetters = levelData?.plaintext ? levelData.plaintext.split('') : [];
  const avoidLetters = new Set([...targetLetters, ...ciphertextLetters, ...plaintextLetters]);
  
  for (let i = 0; i < decoyCount; i++) {
    let decoyChar;
    if (isPlayfair) {
      const pairs = levelData?.pairs || [];
      let attempts = 0;
      do {
        const c1 = alphabet[Math.floor(Math.random() * 25)];
        const c2 = alphabet[Math.floor(Math.random() * 25)];
        decoyChar = c1 + c2;
        attempts++;
      } while (pairs.includes(decoyChar) && attempts < 100);
    } else {
      let attempts = 0;
      do {
        decoyChar = alphabet[Math.floor(Math.random() * 26)];
        attempts++;
      } while ((avoidLetters.has(decoyChar) || targetLetters.includes(decoyChar)) && attempts < 100);
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

export default function PacmanGame({ levelData, tier, onVerifySubmit, onBackToStages, onReplayNewQuestion }) {
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

  const maskedIndices = React.useMemo(() => {
    const indices = [];
    if (!levelData || !levelData.plaintext) return indices;
    for (let i = 0; i < levelData.plaintext.length; i++) {
      const ch = levelData.plaintext[i];
      if (ch >= 'A' && ch <= 'Z') {
        if (!getMask(levelData, i)) {
          indices.push(i);
        }
      }
    }
    return indices;
  }, [levelData]);

  const [phase, setPhase] = useState('ready');
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showTabula, setShowTabula] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [pacman, setPacman] = useState(initialPacman);
  const [pacmanDir, setPacmanDir] = useState('NONE');
  const [bufferedDir, setBufferedDir] = useState('NONE');
  const [knightAttacking, setKnightAttacking] = useState(false);
  const [eatenGhosts, setEatenGhosts] = useState([]); // indices of eaten target letters
  const [lives, setLives] = useState(5); // 5 hearts
  const [flashError, setFlashError] = useState(false);
  const [ruleViolation, setRuleViolation] = useState(null);
  const [levelSolved, setLevelSolved] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [isInvulnerable, setIsInvulnerable] = useState(false);

  // Skill states
  const [hasSkillCharge, setHasSkillCharge] = useState(false);
  const [skillActive, setSkillActive] = useState(false);
  const [skillTimeLeft, setSkillTimeLeft] = useState(0);

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
  const retryBtnRef = useRef(null);
  const autoRecapShownRef = useRef(false);
  /* ── Focus management for game over modal ── */
  useEffect(() => {
    if (gameOver) {
      setTimeout(() => retryBtnRef.current?.focus(), 50);
    }
  }, [gameOver]);

  useEffect(() => { pacmanRef.current = pacman; }, [pacman]);
  useEffect(() => { ghostsRef.current = ghosts; }, [ghosts]);
  useEffect(() => { pelletsRef.current = pellets; }, [pellets]);
  useEffect(() => { pacmanDirRef.current = pacmanDir; }, [pacmanDir]);
  useEffect(() => { bufferedDirRef.current = bufferedDir; }, [bufferedDir]);
  useEffect(() => { skillActiveRef.current = skillActive; }, [skillActive]);
  useEffect(() => { isInvulnerableRef.current = isInvulnerable; }, [isInvulnerable]);
  useEffect(() => { knightAttackingRef.current = knightAttacking; }, [knightAttacking]);

  const activeSolvingIndex = React.useMemo(() => {
    if (!levelData || !levelData.plaintext) return -1;
    for (let i = 0; i < levelData.plaintext.length; i++) {
      const ch = levelData.plaintext[i];
      if (ch >= 'A' && ch <= 'Z' && !getMask(levelData, i) && !eatenGhosts.includes(i)) {
        return i;
      }
    }
    return -1;
  }, [levelData, eatenGhosts]);

  const vigenereAlignmentItems = React.useMemo(() => {
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
        const isSolved = eatenGhosts.includes(i) || getMask(levelData, i);
        const isActive = i === activeSolvingIndex;
        items.push({
          id: `item-${i}`,
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
  }, [isVigenere, levelData.plaintext, levelData.ciphertext, levelData.targetKey, eatenGhosts, activeSolvingIndex, levelData]);

  const activeSolvingItem = React.useMemo(() => {
    return vigenereAlignmentItems.find((item) => item.isActive) || null;
  }, [vigenereAlignmentItems]);

  useEffect(() => {
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
  }, [levelData, tier]);

  // Target Ghost Enforcement & Self-Healing loop:
  // Guarantees that every unsolved target index ALWAYS has an active ghost on the maze board.
  useEffect(() => {
    if (phase === 'ready' || gameOver || levelSolved) return;
    if (!levelData) return;

    const requiredTargets = getRequiredTargetItems(levelData);
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
          char: targetItem.char,
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

  const toggleSound = () => {
    const muted = pacmanSound.toggleMute();
    setIsMuted(muted);
  };

  const soundToggleButton = (
    <button
      className="fg-btn-icon"
      onClick={toggleSound}
      title={isMuted ? "Unmute Sound" : "Mute Sound"}
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: '#fff',
        padding: '4px 8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        fontSize: '1rem'
      }}
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
  );

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
          (g) => !g.eaten && !g.dying && g.row === nextRow && g.col === nextCol && g.index !== -1
        );

        if (targetGhostAhead && currentSkillActive) {
          // Freeze skill active & approaching correct ghost: Stop 1 tile short and execute attack animation!
          setPacmanDir('NONE');
          setBufferedDir('NONE');
          setSkillActive(false);
          setSkillTimeLeft(0);
          skillActiveRef.current = false;
          setKnightAttacking(true);
          knightAttackingRef.current = true;

          // Ghost disappears on hit frame (~240ms)
          setTimeout(() => {
            pacmanSound.playSfx('gold');
            setGhosts((prev) => prev.map((g) => (g.id === targetGhostAhead.id ? { ...g, dying: true } : g)));
          }, 240);

          // Complete swing at ~480ms: remove ghost, credit decryption, grant grace period, resume
          setTimeout(() => {
            setGhosts((prev) => {
              const nextG = prev.map((g) => (g.id === targetGhostAhead.id ? { ...g, eaten: true } : g));
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
                  dir: pos.dir,
                });
              }
              return nextG;
            });

            setEatenGhosts((prevEaten) => {
              const nextEaten = prevEaten.includes(targetGhostAhead.index)
                ? prevEaten
                : [...prevEaten, targetGhostAhead.index];
              const totalTargets = isPlayfair ? levelData.pairs.length : maskedIndices.length;
              if (nextEaten.length === totalTargets) {
                setLevelSolved(true);
                pacmanSound.stopBgm();
                pacmanSound.playSfx('win');
              }
              return nextEaten;
            });

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

              if (ghost.index !== -1) {
                // Correct ghost letter: trigger death animation then remove
                correctGhostEatenThisTick = true;
                pacmanSound.playSfx('gold');
                setEatenGhosts((prevEaten) => {
                  const nextEaten = prevEaten.includes(ghost.index)
                    ? prevEaten
                    : [...prevEaten, ghost.index];
                  const totalTargets = isPlayfair ? levelData.pairs.length : maskedIndices.length;
                  if (nextEaten.length === totalTargets) {
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

  const handleResetGame = () => {
    pacmanSound.stopBgm();
    pacmanSound.unlockAudio();
    pacmanSound.playBgm();
    const normTier = String(tier || levelData?.tier || 'easy').toLowerCase();
    const grid = getMazeGrid(normTier);
    activeMazeGridRef.current = grid;
    const { ghosts: resetG, queue: resetQ } = generateInitialGhosts(levelData, normTier);
    targetQueueRef.current = resetQ;
    setPacman(initialPacman);
    setPacmanDir('NONE');
    setBufferedDir('NONE');
    setKnightAttacking(false);
    setEatenGhosts([]);
    setLives(5);
    setGameOver(false);
    setLevelSolved(false);
    setHasSkillCharge(false);
    setSkillActive(false);
    setSkillTimeLeft(0);
    setRuleViolation(null);
    setGhosts(resetG);
    setIsScreenShaking(false);
    setIsInvulnerable(false);
    isInvulnerableRef.current = false;
    autoRecapShownRef.current = false;
    setPellets(generateRandomPellets(grid, resetG, initialPacman));
  };

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
            setPhase('playing');
          }}
        />
      );
    }

    const stageCode = `OP-${String(levelData.level || 1).padStart(2, '0')}`;
    const gameTitle = isPlayfair ? "Playfair Pac-Man" : (isVigenere ? "Vigenère Pac-Man" : "Caesar Pac-Man");
    return (
      <div className="pacman-container fg-root">
        <GameHudBar
          title={gameTitle}
          stage={levelData.level}
          tier={tier}
          isReady={true}
          onBackToStages={onBackToStages}
          customRightContent={soundToggleButton}
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
                Eat a yellow Skill Pellet, then press SPACEBAR to activate Decryption Mode. While active, eat the ghost carrying the correct plaintext letter!
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

    return (
      <div 
        className={`maze-grid size-larger ${flashError ? 'flash-error' : ''} ${isScreenShaking ? 'screen-shake' : ''}`}
        style={{
          gridTemplateColumns: `repeat(${numCols}, 46px)`,
          gridTemplateRows: `repeat(${numRows}, 46px)`,
          width: `${numCols * 46}px`,
          height: `${numRows * 46}px`
        }}
      >
        {/* Static grid board paths and walls */}
        {mazeGrid.map((rowArr, rIdx) =>
          rowArr.map((cellVal, cIdx) => {
            let cellClass = "maze-cell";
            if (cellVal === 1) cellClass += " wall";
            else cellClass += " path";
            return <div key={`bg-${rIdx}-${cIdx}`} className={cellClass}></div>;
          })
        )}

      {/* Absolute 30fps gliding Pac-Man sprite (No delay) */}
      <div 
        className={`pacman-sprite-absolute ${isInvulnerable ? 'invulnerable-blink' : ''}`}
        style={{
          left: `${pacman.col * 46}px`,
          top: `${pacman.row * 46}px`
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
              left: `${ghost.col * 46}px`,
              top: `${ghost.row * 46}px`
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
              left: `${pellet.col * 46}px`,
              top: `${pellet.row * 46}px`
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
    <div className="pacman-container fg-root">
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
        customRightContent={soundToggleButton}
      />

      <div className={`pacman-layout caesar-pacman-fullscreen ${isVigenere ? 'vg-pacman-fullscreen' : ''}`}>
        <div className="pacman-fullscreen-stage">
          {/* 1. Centered Maze Board Area */}
          <div className="pacman-fullscreen-board-area">
            {renderMazeBoard()}
          </div>

          {/* 2. Top-Center Floating Word Panel */}
          <section className="caesar-pacman-floating-word-panel">
            {isVigenere ? (
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
                  {isPlayfair ? (
                    <>
                      <span className="caesar-pacman-shift-label">Key:</span>
                      <span className="caesar-pacman-shift-badge" style={{ letterSpacing: '1px', color: 'var(--neon-yellow)' }}>{levelData.key}</span>
                      {cipherPair && (
                        <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginLeft: '6px' }}>
                          Target: <strong style={{ color: 'var(--neon-yellow)' }}>{cipherPair}</strong>
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="caesar-pacman-shift-label">Active Shift:</span>
                      <span className="caesar-pacman-shift-badge">+{targetShift}</span>
                    </>
                  )}
                </div>

                {isPlayfair ? (
                  <div className="pf-pair-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', margin: '4px 0' }}>
                    {(levelData.pairs || []).map((plainPair, idx) => {
                      const cPair = levelData.cipherPairs ? levelData.cipherPairs[idx] : '';
                      const isSolved = eatenGhosts.includes(idx);
                      const isActive = activeIndex === idx;

                      return (
                        <div
                          key={idx}
                          className={`pf-pair-card playfair-digraph-cell ${isSolved ? 'solved' : ''} ${isActive ? 'active' : ''}`}
                          style={{
                            minWidth: '64px',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: 'var(--text-primary)',
                            padding: '4px 8px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            fontFamily: 'JetBrains Mono, monospace'
                          }}
                        >
                          <span className="pf-cipher" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{cPair}</span>
                          <span className="pf-arrow" style={{ color: 'rgba(255, 255, 255, 0.26)', fontSize: '0.6rem' }}>↓</span>
                          <strong style={{ color: isSolved ? 'var(--neon-green)' : 'var(--neon-yellow)', fontSize: '0.95rem' }}>
                            {isSolved ? plainPair : '__'}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="fg-letter-cells">
                    {(levelData.plaintext || '').split('').map((char, idx) => {
                      const mask = getMask(levelData, idx);
                      const isGhostIndex = !mask;
                      const isEaten = eatenGhosts.includes(idx);
                      const displayChar = mask ? char : (isGhostIndex && isEaten ? char : '_');

                      let cellClass = "fg-letter-cell";
                      if (mask) {
                        cellClass += " correct-plain";
                      } else if (isGhostIndex) {
                        cellClass += isEaten ? " correct-plain" : " masked";
                      }

                      return (
                        <div key={idx} className={cellClass}>
                          <span className="fg-cell-ciphertext">{levelData.ciphertext ? levelData.ciphertext[idx] : ''}</span>
                          <span className="fg-cell-plaintext">{displayChar}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {isVigenere ? (
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
            <div className="caesar-floating-cheat-sheet caesar-pacman-cheat-sheet">
              <div className="caesar-cheat-header">
                <span className="caesar-cheat-title">Cipher Cheat Sheet</span>
                <span className="caesar-cheat-badge">Shift +{targetShift}</span>
              </div>
              <div className="caesar-cheat-body">
                <div className="caesar-cheat-labels">
                  <span className="caesar-cheat-label-plain">PLAIN</span>
                  <span className="caesar-cheat-label-shift">SHIFT</span>
                </div>
                <div className="caesar-cheat-columns">
                  {alphabet.map((ch) => (
                    <div key={ch} className="caesar-cheat-col">
                      <span className="caesar-cheat-plain">{ch}</span>
                      <span className="caesar-cheat-shifted">{caesarShiftChar(ch, targetShift)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : isVigenere ? (
            <div className="vg-floating-ref-panel vg-pacman-ref-panel">
              <div className="vg-floating-ref-title">Vigenère Alignment</div>
              <div className="vg-formula-badge">Plain = (Cipher − Key + 26) mod 26</div>
              <button
                type="button"
                className="vg-tabula-modal-btn vg-tabula-btn-compact"
                onClick={() => setShowTabula(true)}
                title="Open Interactive Tabula Recta"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>grid_on</span>
                <span>Tabula Recta</span>
              </button>

              <div className="vg-alignment-body">
                <div className="vg-alignment-labels">
                  <div>CIPHER</div>
                  <div>KEY</div>
                  <div style={{ color: 'var(--neon-green)' }}>PLAIN</div>
                </div>
                <div className="vg-alignment-container">
                  {vigenereAlignmentItems.map((item) => {
                    if (item.isSpace) {
                      return <div key={item.id} className="vg-alignment-space" />;
                    }
                    return (
                      <div
                        key={item.id}
                        className={`vg-alignment-col ${item.isActive ? 'active-slot' : ''}`}
                        title={`Pos #${item.index + 1}: ${item.cipherChar} (${charToIdx(item.cipherChar)}) − ${item.keyChar} (${charToIdx(item.keyChar)}) = ${item.isSolved ? item.plainChar : '?'}`}
                      >
                        <span className="vg-align-cipher">{item.cipherChar}</span>
                        <span className="vg-align-key">{item.keyChar}</span>
                        <span
                          className="vg-align-plain"
                          style={{
                            color: item.isSolved
                              ? 'var(--neon-green)'
                              : item.isActive
                              ? 'var(--neon-yellow)'
                              : '#64748b'
                          }}
                        >
                          {item.isSolved ? item.plainChar : (item.isActive ? '?' : '_')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="pf-floating-matrix-hud pf-floating-ref-panel" style={{ position: 'absolute', bottom: '16px', left: '24px', zIndex: 20, maxWidth: 300, background: 'rgba(3, 14, 28, 0.88)', border: '1.5px solid rgba(0, 229, 255, 0.4)', borderRadius: '16px', padding: '12px 16px', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
              <div className="pf-matrix-title" style={{ fontSize: '0.82rem', color: 'var(--neon-cyan)', marginBottom: '8px', fontWeight: 'bold', textAlign: 'center' }}>🔲 Key Matrix</div>
              <div className="pf-matrix" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', maxWidth: '170px', margin: '0 auto' }}>
                {(levelData.matrix || []).map((row, rowIndex) => row.map((letter, colIndex) => {
                  const key = `${rowIndex}-${colIndex}`;
                  const isHighlighted = cipherHighlight.has(key);
                  return (
                    <span key={letter} className={isHighlighted ? 'cipher-cell' : ''} style={{ fontSize: '0.8rem', padding: '4px 0', border: isHighlighted ? '1px solid var(--neon-yellow)' : '1px solid rgba(0, 229, 255, 0.1)', background: isHighlighted ? 'rgba(255, 215, 0, 0.15)' : 'rgba(0, 229, 255, 0.03)', color: isHighlighted ? 'var(--neon-yellow)' : '#fff', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                      {letter}
                    </span>
                  );
                }))}
              </div>
              {cipherPair && (
                <div style={{ marginTop: '8px', textAlign: 'center' }}>
                  <div className="pf-rule-pill revealed" style={{ margin: '0 auto', fontSize: '0.72rem', fontWeight: 'bold', display: 'inline-block' }}>
                    {levelData.rules ? levelData.rules[activeIndex] : ''}
                  </div>
                  <p className="pf-matrix-note" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.3' }}>
                    {describePlayfairRule(levelData.rules ? levelData.rules[activeIndex] : '', 'decrypt')}
                  </p>
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
                  <div className="caesar-basket-badge">+{targetShift}</div>
                  <span className="caesar-basket-label">Caesar Shift Key Clue</span>
                </>
              )}
            </div>
          )}

          {/* 4b. Bottom-Right Vigenère A-Z Reference Panel */}
          {isVigenere && (
            <div className="vg-floating-key-panel vg-fishing-az-panel vg-pacman-az-panel">
              <div className="vg-floating-current-slot">
                <div className="vg-arithmetic-title">
                  Decryption Arithmetic
                </div>
                <div className="vg-slot-badge-lg" style={{ fontSize: '0.82rem', padding: '2px 8px' }}>
                  {vigenereAlignmentItems.filter(item => !item.isSpace && item.isSolved).length}/{vigenereAlignmentItems.filter(item => !item.isSpace).length} Solved
                </div>
              </div>

              {/* Dedicated active calculation card */}
              <div className="vg-fishing-calc-card">
                <div className="vg-calc-top-row">
                  <span className="vg-calc-label">Active Letter Decryption:</span>
                  <span className="vg-calc-badge">Pos #{activeSolvingItem ? activeSolvingItem.index + 1 : 1}</span>
                </div>
                <div className="vg-calc-formula-row">
                  <div className="vg-calc-item cipher">
                    <span className="lbl">Cipher</span>
                    <strong>{activeSolvingItem ? activeSolvingItem.cipherChar : '-'}</strong>
                    <span className="val">{activeSolvingItem ? charToIdx(activeSolvingItem.cipherChar) : 0}</span>
                  </div>
                  <span className="vg-calc-op">−</span>
                  <div className="vg-calc-item key">
                    <span className="lbl">Key</span>
                    <strong>{activeSolvingItem ? activeSolvingItem.keyChar : '-'}</strong>
                    <span className="val">{activeSolvingItem ? activeSolvingItem.shiftVal : 0}</span>
                  </div>
                  <span className="vg-calc-op">=</span>
                  <div className="vg-calc-item plain">
                    <span className="lbl">Target</span>
                    <strong style={{ color: 'var(--neon-green)' }}>
                      {activeSolvingItem && activeSolvingItem.isSolved ? activeSolvingItem.plainChar : '?'}
                    </strong>
                    <span
                      className="val"
                      style={{ visibility: activeSolvingItem && activeSolvingItem.isSolved ? 'visible' : 'hidden' }}
                    >
                      {activeSolvingItem ? (charToIdx(activeSolvingItem.cipherChar) - activeSolvingItem.shiftVal + 26) % 26 : 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2-row x 13-col Alphabet grid */}
              <div className="vg-sprint-alphabet-grid">
                <div className="vg-alphabet-row">
                  {alphabet.slice(0, 13).map((ch, i) => {
                    const isCipher = activeSolvingItem && ch === activeSolvingItem.cipherChar;
                    const isKey = activeSolvingItem && ch === activeSolvingItem.keyChar;
                    let cellClass = "vg-alphabet-cell";
                    if (isCipher) cellClass += " is-cipher";
                    if (isKey) cellClass += " is-key";
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
                    const isCipher = activeSolvingItem && ch === activeSolvingItem.cipherChar;
                    const isKey = activeSolvingItem && ch === activeSolvingItem.keyChar;
                    let cellClass = "vg-alphabet-cell";
                    if (isCipher) cellClass += " is-cipher";
                    if (isKey) cellClass += " is-key";
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
          )}

          {/* 5. Bottom-Right Floating Skill Freeze Charge */}
          <div className={`skill-charge-card caesar-pacman-skill-card ${isVigenere ? 'vg-pacman-skill-card' : ''} ${hasSkillCharge ? 'charged' : ''} ${skillActive ? 'active' : ''}`}>
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

      {/* Game Over modal overlay */}
      {gameOver && (
        <div
          className="caesar-pause-overlay pacman-gameover-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pacman-gameover-title"
        >
          <div className="caesar-pause-card pacman-gameover-card">
            <h2 id="pacman-gameover-title" className="caesar-pause-title">GAME OVER</h2>
            <p className="pacman-gameover-text">Pac-Man has run out of cryptographic operational hearts.</p>
            <button
              ref={retryBtnRef}
              className="caesar-pause-btn caesar-pause-btn-resume"
              onClick={handleResetGame}
            >
              <span className="material-symbols-outlined">restart_alt</span>
              <span>Retry Level</span>
            </button>
            <button
              className="caesar-pause-btn caesar-pause-btn-exit"
              onClick={onBackToStages}
            >
              <span className="material-symbols-outlined">logout</span>
              <span>Exit Stage</span>
            </button>
          </div>
        </div>
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
          setIsMenuOpen(false);
          setPhase('ready');
        }}
        onExit={onBackToStages}
      />
    </div>
  );
}