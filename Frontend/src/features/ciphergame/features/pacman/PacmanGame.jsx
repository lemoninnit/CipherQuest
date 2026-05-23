import React, { useState, useEffect, useRef } from 'react';
import './PacmanGame.css';
import '../../CipherGame.css';

const MAZE_GRID = [
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

const getOrigIndex = (plaintext, charIndexWithoutSpaces) => {
  let letterCount = 0;
  for (let i = 0; i < plaintext.length; i++) {
    if (plaintext[i] !== ' ') {
      if (letterCount === charIndexWithoutSpaces) {
        return i;
      }
      letterCount++;
    }
  }
  return charIndexWithoutSpaces;
};

const caesarDecryptChar = (char, shift) => {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 - shift + 26) % 26 + 26) % 26 + 65);
  }
  return char;
};

// Pure utility to dynamically spawn pellets randomly on paths (MAZE_GRID[r][c] === 0)
// and never on walls or initial sprite positions, ensuring variety on resets.
const generateRandomPellets = (ghostList, pacmanPos) => {
  const openSpaces = [];
  for (let r = 1; r < MAZE_GRID.length - 1; r++) {
    for (let c = 1; c < MAZE_GRID[r].length - 1; c++) {
      if (MAZE_GRID[r][c] === 0) {
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

const describePlayfairRule = (rule, mode = 'decrypt') => {
  const direction = mode === 'decrypt' ? 'back' : 'forward';
  if (rule === 'row') return `Same row: move one column left for both letters.`;
  if (rule === 'column') return `Same column: move one row upward for both letters.`;
  return 'Rectangle: keep each row, swap to the other letter column.';
};

// Dynamically configure ghosts: correct letters at ALL masked indices, plus distractors.
const generateInitialGhosts = (levelData) => {
  const isPlayfair = !!levelData.matrix;
  if (isPlayfair) {
    const ghosts = [];
    const startPositions = [
      { row: 7, col: 1, dir: { r: 0, c: 1 } },
      { row: 7, col: 19, dir: { r: 0, c: -1 } },
      { row: 1, col: 9, dir: { r: 1, c: 0 } },
      { row: 5, col: 4, dir: { r: 0, c: 1 } },
      { row: 1, col: 19, dir: { r: 0, c: -1 } },
      { row: 3, col: 9, dir: { r: 0, c: 1 } },
      { row: 5, col: 16, dir: { r: 0, c: -1 } },
      { row: 1, col: 5, dir: { r: 1, c: 0 } }
    ];

    const pairs = levelData.pairs || [];
    // 1. Assign correct target ghosts for ALL digraph pairs
    for (let i = 0; i < pairs.length; i++) {
      const plainPair = pairs[i];
      const pos = startPositions[i % startPositions.length];
      ghosts.push({
        id: `ghost-${i + 1}`,
        char: plainPair,
        index: i,
        row: pos.row,
        col: pos.col,
        eaten: false,
        dir: pos.dir
      });
    }

    // 2. Add exactly 2 decoy ghosts for distraction/challenge
    const alphabet = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 2; i++) {
      let decoyPair = '';
      do {
        const c1 = alphabet[Math.floor(Math.random() * 25)];
        const c2 = alphabet[Math.floor(Math.random() * 25)];
        decoyPair = c1 + c2;
      } while (pairs.includes(decoyPair));

      const posIdx = pairs.length + i;
      const pos = startPositions[posIdx % startPositions.length];

      ghosts.push({
        id: `ghost-decoy-${i + 1}`,
        char: decoyPair,
        index: -1, // Decoy indicator
        row: pos.row,
        col: pos.col,
        eaten: false,
        dir: pos.dir
      });
    }

    return ghosts;
  }

  const maskedIndices = [];
  if (levelData && levelData.masks && levelData.masks[0]) {
    levelData.masks[0].forEach((m, idx) => {
      if (!m) {
        maskedIndices.push(idx);
      }
    });
  }

  const ghosts = [];
  const startPositions = [
    { row: 7, col: 1, dir: { r: 0, c: 1 } },
    { row: 7, col: 19, dir: { r: 0, c: -1 } },
    { row: 1, col: 9, dir: { r: 1, c: 0 } },
    { row: 5, col: 4, dir: { r: 0, c: 1 } },
    { row: 1, col: 19, dir: { r: 0, c: -1 } },
    { row: 3, col: 9, dir: { r: 0, c: 1 } },
    { row: 5, col: 16, dir: { r: 0, c: -1 } },
    { row: 1, col: 5, dir: { r: 1, c: 0 } }
  ];

  // 1. Assign correct target ghosts for ALL masked indices (guarantees completion)
  for (let i = 0; i < maskedIndices.length; i++) {
    const idx = maskedIndices[i];
    const plainChar = levelData.plaintext ? levelData.plaintext[idx] : '';
    const pos = startPositions[i % startPositions.length];
    ghosts.push({
      id: `ghost-${i + 1}`,
      char: plainChar,
      index: idx,
      row: pos.row,
      col: pos.col,
      eaten: false,
      dir: pos.dir
    });
  }

  // 2. Add exactly 2 decoy ghosts for distraction/challenge
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const targetLetters = levelData.plaintext ? maskedIndices.map(idx => levelData.plaintext[idx]) : [];
  
  for (let i = 0; i < 2; i++) {
    let decoyChar = '';
    do {
      decoyChar = alphabet[Math.floor(Math.random() * 26)];
    } while (targetLetters.includes(decoyChar));

    const posIdx = maskedIndices.length + i;
    const pos = startPositions[posIdx % startPositions.length];

    ghosts.push({
      id: `ghost-decoy-${i + 1}`,
      char: decoyChar,
      index: -1, // Decoy indicator
      row: pos.row,
      col: pos.col,
      eaten: false,
      dir: pos.dir
    });
  }

  return ghosts;
};

export default function PacmanGame({ levelData, tier, onVerifySubmit, onBackToStages, onReplayNewQuestion }) {
  if (!levelData) {
    return (
      <div className="cipher-container">
        <p style={{ color: '#f87171' }}>Loading game data...</p>
        <button onClick={onBackToStages}>Back to Stages</button>
      </div>
    );
  }

  const isVigenere = !!levelData.targetKey;
  const isPlayfair = !!levelData.matrix;
  const targetShift = isVigenere ? 0 : (levelData.targetShifts && levelData.targetShifts[0] ? levelData.targetShifts[0] : 0);

  // Initial Coordinates
  const initialPacman = { row: 1, col: 1 };
  
  const initialGhosts = generateInitialGhosts(levelData);

  const maskedIndices = [];
  if (levelData.masks && levelData.masks[0]) {
    levelData.masks[0].forEach((m, idx) => {
      if (!m) maskedIndices.push(idx);
    });
  }

  const [phase, setPhase] = useState('ready');
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationStep, setExplanationStep] = useState(-1);
  const [showTabula, setShowTabula] = useState(false);

  const [pacman, setPacman] = useState(initialPacman);
  const [pacmanDir, setPacmanDir] = useState('NONE');
  const [bufferedDir, setBufferedDir] = useState('NONE');

  const [activeShift, setActiveShift] = useState(0); // starts at 0
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
  const [pellets, setPellets] = useState(() => generateRandomPellets(initialGhosts, initialPacman));

  const isPoweredUp = true;

  const pacmanRef = useRef(pacman);
  const ghostsRef = useRef(ghosts);
  const pelletsRef = useRef(pellets);
  const pacmanDirRef = useRef(pacmanDir);
  const bufferedDirRef = useRef(bufferedDir);
  const activeShiftRef = useRef(activeShift);
  const skillActiveRef = useRef(skillActive);
  const isPoweredUpRef = useRef(isPoweredUp);
  const isInvulnerableRef = useRef(isInvulnerable);

  useEffect(() => { pacmanRef.current = pacman; }, [pacman]);
  useEffect(() => { ghostsRef.current = ghosts; }, [ghosts]);
  useEffect(() => { pelletsRef.current = pellets; }, [pellets]);
  useEffect(() => { pacmanDirRef.current = pacmanDir; }, [pacmanDir]);
  useEffect(() => { bufferedDirRef.current = bufferedDir; }, [bufferedDir]);
  useEffect(() => { activeShiftRef.current = activeShift; }, [activeShift]);
  useEffect(() => { skillActiveRef.current = skillActive; }, [skillActive]);
  useEffect(() => { isPoweredUpRef.current = isPoweredUp; }, [isPoweredUp]);
  useEffect(() => { isInvulnerableRef.current = isInvulnerable; }, [isInvulnerable]);

  useEffect(() => {
    const initialGhosts = generateInitialGhosts(levelData);
    setPacman(initialPacman);
    setPacmanDir('NONE');
    setBufferedDir('NONE');
    setActiveShift(0);
    setEatenGhosts([]);
    setLives(5);
    setFlashError(false);
    setRuleViolation(null);
    setLevelSolved(false);
    setGameOver(false);
    setHasSkillCharge(false);
    setSkillActive(false);
    setSkillTimeLeft(0);
    setGhosts(initialGhosts);
    setPellets(generateRandomPellets(initialGhosts, initialPacman));
    setPhase('ready');
    setShowExplanation(false);
    setExplanationStep(-1);
  }, [levelData]);

  const gameLoopRef = useRef(null);

  // ghostMoveTick toggle to limit ghost speed to exactly 0.5x of Pac-man's speed
  const ghostMoveTickRef = useRef(false);

  const handleLoseHeart = (message) => {
    if (isInvulnerableRef.current) return;

    setIsInvulnerable(true);
    isInvulnerableRef.current = true;
    setTimeout(() => {
      setIsInvulnerable(false);
      isInvulnerableRef.current = false;
    }, 1200); // 1.2s invulnerability window

    setFlashError(true);
    setTimeout(() => setFlashError(false), 300);
    setRuleViolation(message);
    setLives((prev) => {
      const nextLives = prev - 1;
      if (nextLives <= 0) {
        setGameOver(true);
      }
      return nextLives;
    });
  };

  // Steering control to set buffer direction only
  const triggerSteer = (dirName) => {
    if (gameOver || levelSolved) return;
    setBufferedDir(dirName);
  };

  // Key hooks
  useEffect(() => {
    const handleKeyDown = (e) => {
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
  }, [gameOver, levelSolved, hasSkillCharge, skillActive]);

  const activateSkill = () => {
    if (!hasSkillCharge || skillActive || gameOver || levelSolved) return;
    setSkillActive(true);
    setHasSkillCharge(false);
    setSkillTimeLeft(6);
  };

  useEffect(() => {
    if (!skillActive) return;
    const interval = setInterval(() => {
      setSkillTimeLeft((prev) => {
        if (prev <= 1) {
          setSkillActive(false);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [skillActive]);

  // Main automatic tick loop (180ms loop) using Refs to prevent coordinate change stutter
  useEffect(() => {
    if (gameOver || levelSolved) return;

    const gameTick = () => {
      const currentPacman = pacmanRef.current;
      const currentPacmanDir = pacmanDirRef.current;
      const currentBufferedDir = bufferedDirRef.current;
      const currentActiveShift = activeShiftRef.current;
      const currentSkillActive = skillActiveRef.current;
      const currentIsPoweredUp = isPoweredUpRef.current;
      const currentIsInvulnerable = isInvulnerableRef.current;

      // 1. Process Buffered Input
      let activeDir = currentPacmanDir;
      if (currentBufferedDir !== 'NONE') {
        const testVec = DIR_VECTORS[currentBufferedDir];
        const testRow = currentPacman.row + testVec.r;
        const testCol = currentPacman.col + testVec.c;
        if (MAZE_GRID[testRow] && MAZE_GRID[testRow][testCol] === 0) {
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

        if (MAZE_GRID[nextRow] && MAZE_GRID[nextRow][nextCol] === 0) {
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
            } else {
              setRuleViolation(null);
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
            if (ghost.eaten) {
              updated.push(ghost);
              continue;
            }

            let gRow = ghost.row;
            let gCol = ghost.col;
            let gDir = ghost.dir || { r: 0, c: 1 };

            // Helper to check if a tile is occupied by another active ghost
            const isTileOccupiedByOtherGhost = (r, c) => {
              const inUpdated = updated.some(ug => !ug.eaten && ug.row === r && ug.col === c);
              if (inUpdated) return true;
              for (let j = i + 1; j < prevGhosts.length; j++) {
                const pg = prevGhosts[j];
                if (!pg.eaten && pg.row === r && pg.col === c) return true;
              }
              return false;
            };

            const nextRow = gRow + gDir.r;
            const nextCol = gCol + gDir.c;

            const isNextTileOpen = MAZE_GRID[nextRow] && MAZE_GRID[nextRow][nextCol] === 0;
            const isNextOccupied = isTileOccupiedByOtherGhost(nextRow, nextCol);

            if (isNextTileOpen && !isNextOccupied) {
              updated.push({ ...ghost, row: nextRow, col: nextCol });
            } else {
              // Wall collision OR other ghost in the way! Choose new direction
              const directions = [
                { r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }
              ];
              
              const validMoves = directions.filter((d) => {
                const nr = gRow + d.r;
                const nc = gCol + d.c;
                const isOpen = MAZE_GRID[nr] && MAZE_GRID[nr][nc] === 0;
                const isOccupied = isTileOccupiedByOtherGhost(nr, nc);
                const isOpposite = (d.r === -gDir.r && d.r !== 0) || (d.c === -gDir.c && d.c !== 0);
                return isOpen && !isOccupied && !isOpposite;
              });

              const fallbackMoves = validMoves.length > 0 ? validMoves : directions.filter((d) => {
                const nr = gRow + d.r;
                const nc = gCol + d.c;
                const isOpen = MAZE_GRID[nr] && MAZE_GRID[nr][nc] === 0;
                const isOccupied = isTileOccupiedByOtherGhost(nr, nc);
                return isOpen && !isOccupied;
              });

              if (fallbackMoves.length > 0) {
                const chosenDir = fallbackMoves[Math.floor(Math.random() * fallbackMoves.length)];
                updated.push({
                  ...ghost,
                  row: gRow + chosenDir.r,
                  col: gCol + chosenDir.c,
                  dir: chosenDir
                });
              } else {
                updated.push(ghost); // Stand still if blocked
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

        return prevGhosts.map((ghost) => {
          if (ghost.eaten) return ghost;

          if (ghost.row === pRow && ghost.col === pCol) {
            // Collision detected!
            if (currentSkillActive) {
              // Skill pellet can be used only once per pickup; immediately disable on touch.
              if (!skillDisabledThisTick) {
                skillDisabledThisTick = true;
                setSkillActive(false);
                setSkillTimeLeft(0);
                skillActiveRef.current = false;
              }

              if (ghost.index !== -1) {
                // Correct ghost letter is safe and updates progress
                setEatenGhosts((prevEaten) => {
                  const nextEaten = prevEaten.includes(ghost.index)
                    ? prevEaten
                    : [...prevEaten, ghost.index];
                  const totalTargets = isPlayfair ? levelData.pairs.length : maskedIndices.length;
                  if (nextEaten.length === totalTargets) {
                    setLevelSolved(true);
                  }
                  return nextEaten;
                });
                return { ...ghost, eaten: true };
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
                const canRebound = MAZE_GRID[rbRow] && MAZE_GRID[rbRow][rbCol] === 0;
                return {
                  ...ghost,
                  dir: oppositeDir,
                  row: canRebound ? rbRow : ghost.row,
                  col: canRebound ? rbCol : ghost.col
                };
              }
            } else {
              // Skill not active! Pacman gets caught! Lose heart, trigger screen shake, rebound ghost
              if (!currentIsInvulnerable && !hurtTriggered) {
                hurtTriggered = true;
                setIsScreenShaking(true);
                setTimeout(() => setIsScreenShaking(false), 450);
                handleLoseHeart(
                  `Ghost captured Pac-Man! Eat a yellow pellet 🟡 and press SPACEBAR to activate Decryption Mode first.`
                );
              }

              const gDir = ghost.dir || { r: 0, c: 1 };
              const oppositeDir = { r: -gDir.r, c: -gDir.c };
              const rbRow = ghost.row + oppositeDir.r;
              const rbCol = ghost.col + oppositeDir.c;
              const canRebound = MAZE_GRID[rbRow] && MAZE_GRID[rbRow][rbCol] === 0;
              return {
                ...ghost,
                dir: oppositeDir,
                row: canRebound ? rbRow : ghost.row,
                col: canRebound ? rbCol : ghost.col
              };
            }
          }
          return ghost;
        });
      });

      // Chain next game tick loop (180ms constant interval)
      gameLoopRef.current = setTimeout(gameTick, 180);
    };

    gameLoopRef.current = setTimeout(gameTick, 180);
    return () => clearTimeout(gameLoopRef.current);
  }, [gameOver, levelSolved]);

  // Non-stacking, non-wall dynamic pellet spawner using Refs to prevent interval clear loops
  useEffect(() => {
    if (gameOver || levelSolved) return;

    const spawnTimer = setInterval(() => {
      const currentPellets = pelletsRef.current;
      const currentPacman = pacmanRef.current;
      const currentGhosts = ghostsRef.current;

      const hasActiveSkillPellet = currentPellets.some(p => !p.eaten && p.isSkill);
      const needsSkill = !hasActiveSkillPellet;

      if (needsSkill) {
        // Collect candidate spawn tiles
        const openSpaces = [];
        for (let r = 1; r < MAZE_GRID.length - 1; r++) {
          for (let c = 1; c < MAZE_GRID[r].length - 1; c++) {
            if (MAZE_GRID[r][c] === 0) {
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
  }, [gameOver, levelSolved]);

  const handleResetGame = () => {
    setPacman(initialPacman);
    setPacmanDir('NONE');
    setBufferedDir('NONE');
    setActiveShift(0);
    setEatenGhosts([]);
    setLives(5);
    setGameOver(false);
    setLevelSolved(false);
    setHasSkillCharge(false);
    setSkillActive(false);
    setRuleViolation(null);
    setGhosts(initialGhosts);
    setIsScreenShaking(false);
    setIsInvulnerable(false);
    isInvulnerableRef.current = false;
    setPellets(generateRandomPellets(initialGhosts, initialPacman));
  };

  const handleVerifySubmit = () => {
    if (!levelSolved) return;
    setShowExplanation(true);
    setExplanationStep(-1);
    const total = isPlayfair 
      ? (levelData.pairs ? levelData.pairs.length : 0)
      : (levelData.plaintext ? levelData.plaintext.replace(/\s+/g, '').length : 0);
    let step = -1;
    const iv = setInterval(() => {
      step++;
      setExplanationStep(step);
      if (step >= total - 1) clearInterval(iv);
    }, 600);
  };

  const handleCloseExplanation = () => {
    setShowExplanation(false);
    onVerifySubmit();
  };

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  if (phase === 'ready') return (
    <div className="pacman-container fg-root">
      <header className="fg-header relative-header">
        <button className="exit-stage-absolute" onClick={onBackToStages}>
          <span className="material-symbols-outlined">arrow_back</span>
          Exit to Stages
        </button>
        <div className="fg-header-category indent-header-title">
          {isPlayfair ? "Playfair Cipher" : (isVigenere ? "Vigenère Cipher" : "Caesar Cipher")}
        </div>
        <div className="fg-header-stage" style={{ flex: 1, textAlign: 'center' }}>
          {tier.toUpperCase()} Mode — Stage {levelData.level}
        </div>
      </header>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', width: '100%' }}>
        <div className="vg-ready-card" style={{ maxWidth: 540 }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>👾</div>
          <h2 style={{ color: 'var(--neon-cyan)', margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800 }}>
            {isPlayfair ? "Playfair Pac-Man" : (isVigenere ? "Vigenère Pac-Man" : "Caesar Pac-Man")}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
            {isPlayfair
              ? "Navigate the maze, eat skill freeze charges to slow down decoys, and eat the correct ghosts to decrypt the Playfair digraph pairs using the key matrix!"
              : (isVigenere 
                ? "Navigate the maze, eat skill freeze charges to slow down decoys, and eat the correct ghosts to decrypt the Vigenère cipher. Use the repeating keyword to find the shifts!"
                : "Navigate the maze, eat skill freeze charges to slow down decoys, and eat the correct ghosts to decrypt the ciphertext under Caesar decryption.")}
          </p>
          <div style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Ciphertext</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--neon-cyan)', letterSpacing: '1px' }}>{levelData.ciphertext}</span>
            </div>
            {isPlayfair ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Keyword</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--neon-yellow)' }}>{levelData.key}</span>
              </div>
            ) : null}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Hint</span>
              <span style={{ color: '#a0c4d8', fontStyle: 'italic' }}>{levelData.hint}</span>
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '20px', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--neon-green)' }}>How it works:</strong>{' '}
            {isPlayfair
              ? "Use the 5x5 key matrix on the side to visually decrypt the active ciphertext digraph. Work out the plaintext letter pair, eat a yellow Skill Pellet ⚡, then press SPACEBAR to activate Decryption Mode and eat the matching ghost! Avoid decoys."
              : (isVigenere 
                ? "Use the keyword clue and the Interactive Tabula Recta tool. Work out the plaintext letter for each blank index, eat a yellow Skill Pellet ⚡, then press SPACEBAR to activate Decryption Mode and eat the matching ghost! Avoid decoys."
                : "Eat a yellow Skill Pellet ⚡, then press SPACEBAR to activate Decryption Mode. While Decryption Mode is active, eat the ghost carrying the correct plaintext letter. Avoid decoy ghosts and do not touch ghosts when Decryption Mode is inactive!")}
          </p>
          <button className="vg-start-btn" onClick={() => setPhase('playing')}>👾 Start Pac-Man</button>
        </div>
      </div>
    </div>
  );

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

  return (
    <div className="pacman-container fg-root">
      {showExplanation && (
        <div className="fg-recap-overlay" style={{ overflowY: 'auto', padding: '30px 10px', zIndex: 9999 }}>
          <div className="fg-recap-card" style={{ maxWidth: '1100px', width: '95%', padding: '24px 32px' }}>
            <h2 className="fg-recap-title">🔬 Cryptographic Recap</h2>
            <p className="fg-recap-subtitle">Why Did This Work?</p>
            <div className="fg-recap-animation-box" style={{ minHeight: 'auto', padding: '16px', marginBottom: '16px' }}>
              {isPlayfair ? (
                <div className="fg-recap-letter-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                  {(levelData.pairs || []).map((plainPair, idx) => {
                    const cipherPair = levelData.cipherPairs ? levelData.cipherPairs[idx] : '';
                    const rule = levelData.rules ? levelData.rules[idx] : '';
                    return (
                      <div key={idx} className={`fg-recap-node ${explanationStep >= idx ? 'active' : 'waiting'}`} style={{ minWidth: '110px', padding: '12px 16px' }}>
                        <span className="fg-recap-char-cipher" style={{ fontSize: '1.25rem' }}>{cipherPair}</span>
                        <span className="fg-recap-math" style={{ fontSize: '0.7rem', color: 'var(--neon-yellow)' }}>({rule})</span>
                        <span className="fg-recap-arrow">↓</span>
                        <span className="fg-recap-char-plain" style={{ fontSize: '1.25rem' }}>{explanationStep >= idx ? plainPair : '__'}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="fg-recap-letter-row">
                  {(levelData.plaintext || '').replace(/\s+/g, '').split('').map((plainCh, idx) => {
                    const cipherCh = levelData.ciphertext ? levelData.ciphertext.replace(/\s+/g, '')[idx] : '';
                    let mathDisplay = "";
                    if (isVigenere) {
                      const origIdx = getOrigIndex(levelData.plaintext || '', idx);
                      const keyChar = levelData.targetKey ? levelData.targetKey[origIdx % levelData.targetKey.length] : '';
                      const shiftVal = keyChar ? charToIdx(keyChar) : 0;
                      mathDisplay = keyChar ? `-${keyChar} (${shiftVal})` : '';
                    } else {
                      let wi = 0, acc = 0;
                      for (let i = 0; i < words.length; i++) {
                        if (idx < acc + words[i].length) { wi = i; break; }
                        acc += words[i].length;
                      }
                      const seg = levelData.targetShifts ? levelData.targetShifts[wi] : 0;
                      mathDisplay = `-${seg}`;
                    }
                    return (
                      <div key={idx} className={`fg-recap-node ${explanationStep >= idx ? 'active' : 'waiting'}`}>
                        <span className="fg-recap-char-cipher">{cipherCh}</span>
                        <span className="fg-recap-math">{mathDisplay}</span>
                        <span className="fg-recap-arrow">↓</span>
                        <span className="fg-recap-char-plain">{plainCh}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="fg-recap-explanation" style={{ background: 'rgba(255,255,255,0.015)' }}>
              💡 {isPlayfair ? (
                <>
                  <strong>Playfair Cipher Decryption:</strong> digraph pairs are decrypted using a 5x5 key matrix.
                  Depending on their geometric alignment in the grid, the letters move left (same row), move up (same column), or swap columns (rectangle).
                  <br /><br />
                  <strong>Why this worked:</strong> You successfully navigated the maze to eat the ghosts matching each plaintext pair, demonstrating how symmetric coordinates in the grid map to letters.
                  <br /><br />
                  <span style={{ color: 'var(--neon-cyan)', fontSize: '0.85rem' }}>Lesson context: {levelData.lesson}</span>
                </>
              ) : isVigenere ? (
                <>
                  <strong>Vigenère Cipher Decryption:</strong> Each ciphertext letter is shifted backward by the corresponding letter of the repeating keyword.
                  By eating the correct ghosts in the maze, you solved the keyword alignment.
                  <code>Plain[i] = (Cipher[i] - Key[i mod keyLen]) mod 26</code> maps every letter back.
                </>
              ) : (
                <>
                  <strong>Caesar Cipher Decryption:</strong> Each ciphertext letter is shifted backward by the key value.
                  By eating the correct ghosts, you resolved the shifted characters.
                  <code>Plain = (Cipher - Key) mod 26</code> maps every letter back uniformly.
                </>
              )}
              {!isPlayfair && (isVigenere ? (
                (() => {
                  const uniqueKeyLetters = Array.from(new Set((levelData.targetKey || '').split('')));
                  return uniqueKeyLetters.map((kChar, sIdx) => {
                    const shiftVal = charToIdx(kChar);
                    const sAlph = alphabet.map((_, i) => alphabet[(i + shiftVal) % 26]);
                    return (
                      <div key={sIdx} style={{ marginTop: 16, background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontWeight: 700, color: 'var(--neon-cyan)', marginBottom: 8, fontSize: '0.82rem' }}>
                          🔑 Vigenère Row for Key Letter: <strong>{kChar}</strong> (Shift: +{shiftVal})
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ borderCollapse: 'collapse', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', minWidth: 850 }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <th style={{ padding: '4px 2px', textAlign: 'left', color: 'var(--text-muted)' }}>Plain:</th>
                                {alphabet.map((ch, i) => (
                                  <td key={i} style={{ padding: '4px 2px', color: '#fff', background: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ fontWeight: 'bold' }}>{ch}</div>
                                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{i + 1}</div>
                                  </td>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <th style={{ padding: '4px 2px', textAlign: 'left', color: 'var(--text-muted)' }}>Cipher:</th>
                                {sAlph.map((ch, i) => (
                                  <td key={i} style={{ padding: '4px 2px', color: 'var(--neon-cyan)', background: 'rgba(0,229,255,0.02)' }}>
                                    <div style={{ fontWeight: 'bold' }}>{ch}</div>
                                    <div style={{ fontSize: '0.55rem', color: 'rgba(0,229,255,0.6)' }}>{ch.charCodeAt(0) - 64}</div>
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                levelData.targetShifts && levelData.targetShifts.map((shiftVal, sIdx) => {
                  const sAlph = alphabet.map((_, i) => alphabet[(i + shiftVal) % 26]);
                  return (
                    <div key={sIdx} style={{ marginTop: 16, background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontWeight: 700, color: 'var(--neon-cyan)', marginBottom: 8, fontSize: '0.82rem' }}>
                        🔑 Caesar Alphabet Shift Table {levelData.targetShifts.length > 1 ? `— Segment #${sIdx + 1}` : ''} (Key: +{shiftVal})
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', minWidth: 850 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                              <th style={{ padding: '4px 2px', textAlign: 'left', color: 'var(--text-muted)' }}>Plain:</th>
                              {alphabet.map((ch, i) => (
                                <td key={i} style={{ padding: '4px 2px', color: '#fff', background: 'rgba(255,255,255,0.02)' }}>
                                  <div style={{ fontWeight: 'bold' }}>{ch}</div>
                                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{i + 1}</div>
                                </td>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <th style={{ padding: '4px 2px', textAlign: 'left', color: 'var(--text-muted)' }}>Cipher:</th>
                              {sAlph.map((ch, i) => (
                                <td key={i} style={{ padding: '4px 2px', color: 'var(--neon-cyan)', background: 'rgba(0,229,255,0.02)' }}>
                                  <div style={{ fontWeight: 'bold' }}>{ch}</div>
                                  <div style={{ fontSize: '0.55rem', color: 'rgba(0,229,255,0.6)' }}>{ch.charCodeAt(0) - 64}</div>
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              ))}
            </div>
            <div className="fg-recap-actions" style={{ marginTop: 16 }}>
              <button
                className="fg-btn fg-btn-primary"
                onClick={handleCloseExplanation}
                disabled={
                  isPlayfair 
                    ? explanationStep < (levelData.pairs ? levelData.pairs.length - 1 : 0)
                    : explanationStep < (levelData.plaintext ? levelData.plaintext.replace(/\s+/g, '').length - 1 : 0)
                }
                style={{ background: 'var(--neon-green)', color: '#030914' }}
              >
                Unlock Next Objective ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header UI (Green Highlighted fixes) */}
      <header className="fg-header relative-header">
        <button className="exit-stage-absolute" onClick={onBackToStages}>
          <span className="material-symbols-outlined">arrow_back</span>
          Exit to Stages
        </button>
        <div className="fg-header-category indent-header-title">
          {isPlayfair ? "Playfair in Cipher Pac-Man" : (isVigenere ? "Vigenère in Cipher Pac-Man" : "Caesar in Cipher Pac-Man")}
        </div>
        <div className="fg-header-stage" style={{ flex: 1, textAlign: 'center' }}>
          {tier.toUpperCase()} Mode — Level {levelData.level}
        </div>
        <div className="pacman-hearts-display">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`material-symbols-outlined heart-icon ${i < lives ? 'active-heart' : 'lost-heart'}`}>
              favorite
            </span>
          ))}
        </div>
      </header>

      <div className="pacman-layout">
        {/* Sidebar Cards */}
        <aside className="fg-sidebar">
          {/* Active Shift Card */}
          {isPlayfair ? (
            <div className="fg-basket-card">
              <div className="fg-basket-container" style={{ fontSize: '2.2rem' }}>🔲</div>
              <div className="fg-basket-shift-value" style={{ color: 'var(--neon-yellow)', fontSize: '1.3rem', letterSpacing: '1px' }}>{levelData.key}</div>
              <span className="fg-basket-label">Playfair Key Clue</span>
            </div>
          ) : isVigenere ? (
            <div className="fg-basket-card">
              <div className="fg-basket-container" style={{ fontSize: '2.2rem' }}>🔑</div>
              <div className="fg-basket-shift-value" style={{ color: 'var(--neon-green)', fontSize: '1.4rem' }}>{levelData.targetKey}</div>
              <span className="fg-basket-label">{levelData.keyClue || "Vigenère Key"}</span>
            </div>
          ) : (
            <div className="fg-basket-card">
              <div className="fg-basket-container" style={{ fontSize: '2.2rem' }}>🔑</div>
              <div className="fg-basket-shift-value" style={{ color: 'var(--neon-green)' }}>+{targetShift}</div>
              <span className="fg-basket-label">Caesar Shift Key Clue</span>
            </div>
          )}

          {isVigenere && (
            <button className="vg-tabula-modal-btn" onClick={() => setShowTabula(true)} style={{ marginTop: '4px', marginBottom: '4px' }}>
              <span className="material-symbols-outlined">grid_on</span>
              <span>View Tabula Recta</span>
            </button>
          )}

          {/* Playfair 5x5 Matrix Guide */}
          {isPlayfair && (
            <div className="sidebar-matrix-hud vg-sidebar-card" style={{ width: '100%', background: 'rgba(6,19,36,0.5)', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: '12px', padding: '12px' }}>
              <div className="vg-sidebar-title" style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)', marginBottom: '8px', fontWeight: 'bold', textAlign: 'center' }}>🔲 Key Matrix</div>
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
              
              <div className="vg-active-pair-info" style={{ marginTop: '12px', textAlign: 'center', fontSize: '0.78rem', background: 'rgba(255, 255, 255, 0.03)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div>Active Ciphertext: <strong style={{ color: 'var(--neon-yellow)', fontSize: '0.95rem', letterSpacing: '1px' }}>{cipherPair || 'N/A'}</strong></div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Find highlighted letters in matrix above & decrypt!</div>
              </div>
            </div>
          )}

          {/* Playfair Active Rule Clue Card */}
          {isPlayfair && cipherPair && (
            <div className="sidebar-matrix-hud vg-sidebar-card" style={{ width: '100%', background: 'rgba(6,19,36,0.5)', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: '12px', padding: '12px' }}>
              <div className="vg-sidebar-title" style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)', marginBottom: '8px', fontWeight: 'bold', textAlign: 'center' }}>🔬 Geometry Rule</div>
              <div className="pf-rule-pill revealed" style={{ margin: '0 auto', fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>
                {levelData.rules ? levelData.rules[activeIndex] : ''}
              </div>
              <p className="pf-sidebar-note" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px', lineHeight: '1.4' }}>
                {describePlayfairRule(levelData.rules ? levelData.rules[activeIndex] : '', 'decrypt')}
              </p>
            </div>
          )}

          {/* Skill Charge */}
          <div className={`skill-charge-card ${hasSkillCharge ? 'charged' : ''} ${skillActive ? 'active' : ''}`}>
            <div className="skill-charge-title">Skill Freeze Charge</div>
            <div className="skill-pellet-icon-wrapper">
              <span className="material-symbols-outlined skill-bolt">flash_on</span>
            </div>
            {skillActive ? (
              <div className="skill-timer-badge">FREEZE ACTIVE: {skillTimeLeft}s</div>
            ) : hasSkillCharge ? (
              <button className="activate-skill-btn" onClick={activateSkill}>Press SPACEBAR</button>
            ) : (
              <div className="skill-hint-label">Eat yellow pellet 🟡 to charge</div>
            )}
          </div>

          {/* Steer controls */}
          <div className="joystick-panel">
            <span className="fg-ref-title" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Steering Console</span>
            <div className="joystick-controls">
              <button className="joystick-btn" onClick={() => triggerSteer('UP')}>
                <span className="material-symbols-outlined">keyboard_arrow_up</span>
              </button>
              <div className="joystick-row">
                <button className="joystick-btn" onClick={() => triggerSteer('LEFT')}>
                  <span className="material-symbols-outlined">keyboard_arrow_left</span>
                </button>
                <button className="joystick-btn" onClick={() => triggerSteer('DOWN')}>
                  <span className="material-symbols-outlined">keyboard_arrow_down</span>
                </button>
                <button className="joystick-btn" onClick={() => triggerSteer('RIGHT')}>
                  <span className="material-symbols-outlined">keyboard_arrow_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* Yellow Highlighted: Educational Clues (No direct answers) */}
          <div className="sidebar-action-hud">
            {levelSolved ? (
              <div className="fg-success-panel">
                <h3>✅ SECURED!</h3>
                <p>All segments decrypted successfully.</p>
                <button className="fg-btn fg-btn-primary" onClick={handleVerifySubmit} style={{ width: '100%', background: 'var(--neon-green)', color: '#030914', marginTop: '10px' }}>
                  🚀 Verify & Submit
                </button>
                <button className="fg-btn fg-btn-secondary" onClick={onReplayNewQuestion} style={{ width: '100%', marginTop: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                  🔄 Play Again
                </button>
              </div>
            ) : ruleViolation ? (
              <div className="fg-alert-panel">
                <strong>⚠️ Alert Warning:</strong>
                <p style={{ fontSize: '0.74rem', lineHeight: '1.4', color: '#fda4af' }}>{ruleViolation}</p>
              </div>
            ) : (
              <div className="fg-alert-panel default-alert">
                <strong>📝 Objectives:</strong>
                <div style={{ fontSize: '0.74rem', lineHeight: '1.45', color: '#cbd5e1' }}>
                  {isPlayfair ? (
                    <>• Use the 5x5 key matrix on the left and the active geometry rule to decrypt digraphs.<br /></>
                  ) : isVigenere ? (
                    <>• Use the Vigenère keyword clue and Tabula Recta to decrypt empty letters.<br /></>
                  ) : (
                    <>• Use the Caesar Shift Key clue to decrypt empty letters.<br /></>
                  )}
                  • Eat a yellow Skill Pellet ⚡, then press **SPACEBAR** to activate Decryption Mode.<br />
                  • While Decryption Mode is active, eat the ghost carrying the correct plaintext letter/pair.<br />
                  • Avoid decoy ghosts and do not touch ghosts when Decryption Mode is inactive!
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Widescreen Board Area */}
        <main className="pacman-main">
          {/* Header Letters panel */}
          <section className="fg-word-panel">
            {isPlayfair ? (
              <div className="pf-pair-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', margin: '10px 0' }}>
                {(levelData.pairs || []).map((plainPair, idx) => {
                  const cipherPair = levelData.cipherPairs ? levelData.cipherPairs[idx] : '';
                  const isSolved = eatenGhosts.includes(idx);
                  const isActive = activeIndex === idx;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`pf-pair-card playfair-digraph-cell ${isSolved ? 'solved' : ''} ${isActive ? 'active' : ''}`}
                      style={{
                        minWidth: '74px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '9px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: 'var(--text-primary)',
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        fontFamily: 'JetBrains Mono, monospace',
                        transition: 'transform 0.16s, border-color 0.16s, box-shadow 0.16s'
                      }}
                    >
                      <span className="pf-cipher" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{cipherPair}</span>
                      <span className="pf-arrow" style={{ color: 'rgba(255, 255, 255, 0.26)', fontSize: '0.62rem', textTransform: 'uppercase' }}>↓</span>
                      <strong style={{ color: isSolved ? 'var(--neon-green)' : 'var(--neon-yellow)', fontSize: '1rem' }}>{isSolved ? plainPair : '__'}</strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="fg-letter-cells" style={{ justifyContent: 'center' }}>
                {(levelData.plaintext || '').split('').map((char, idx) => {
                  const mask = (levelData.masks && levelData.masks[0]) ? levelData.masks[0][idx] : true;
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
            <div className="fg-clue-banner" style={{ marginTop: '8px' }}>
              💡 Clue Context: <strong>"{levelData.hint}"</strong>
            </div>
          </section>

          {/* Red Highlighted: Wider, taller board container */}
          <section className="pacman-board-wrapper bigger-board">
            <div className={`maze-grid size-larger ${flashError ? 'flash-error' : ''} ${isScreenShaking ? 'screen-shake' : ''}`}>
              {/* Static grid board paths and walls */}
              {MAZE_GRID.map((rowArr, rIdx) =>
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
                😮
              </div>

              {/* Slower gliding Ghosts (0.5x speed) */}
              {ghosts.map((ghost) => {
                if (ghost.eaten) return null;
                const isVulnerable = skillActive;
                return (
                  <div
                    key={ghost.id}
                    className={`ghost-sprite-absolute ${isVulnerable ? 'vulnerable' : ''}`}
                    style={{
                      left: `${ghost.col * 46}px`,
                      top: `${ghost.row * 46}px`
                    }}
                  >
                    <div className="ghost-sprite-body">
                      👻
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
                      <div className="circle-pellet-badge skill animate-pulse">
                        ⚡
                      </div>
                    ) : (
                      <div className="circle-pellet-badge score-dot">
                        •
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Game Over modal overlay */}
            {gameOver && (
              <div className="game-over-overlay">
                <div className="game-over-card glass-card">
                  <h2 className="game-over-title">💔 GAME OVER</h2>
                  <p className="game-over-text">Pacman has run out of cryptographic operational hearts.</p>
                  <button className="fg-btn fg-btn-primary play-again-btn" onClick={handleResetGame}>
                    <span className="material-symbols-outlined">restart_alt</span>
                    <span>Retry Level</span>
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
                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(ch => (
                              <th key={ch} className="col-header">{ch}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((kChar, rIdx) => {
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
          </section>
        </main>
      </div>
    </div>
  );
}
