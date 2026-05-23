import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../pacman/PacmanGame.css';
import '../../CipherGame.css';
import './VigenereGame.css';

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

const GHOST_STARTS = [
  { row: 7, col: 1, dir: { r: 0, c: 1 } },
  { row: 7, col: 19, dir: { r: 0, c: -1 } },
  { row: 1, col: 9, dir: { r: 1, c: 0 } },
  { row: 5, col: 4, dir: { r: 0, c: 1 } },
  { row: 1, col: 19, dir: { r: 0, c: -1 } },
  { row: 3, col: 9, dir: { r: 0, c: 1 } }
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ALPHABET_VALUE_PAIRS = ALPHABET.split('').map((letter, index) => ({
  letter,
  value: index
}));

const charToIdx = (char) => char.charCodeAt(0) - 65;
const idxToChar = (value) => String.fromCharCode((((value % 26) + 26) % 26) + 65);

const getSlotPositions = (text, keyLen) => {
  const positions = Array.from({ length: keyLen }, () => []);
  let alphaIndex = 0;

  text.split('').forEach((char, textIndex) => {
    if (char < 'A' || char > 'Z') return;
    positions[alphaIndex % keyLen].push(textIndex);
    alphaIndex++;
  });

  return positions;
};

const buildLetterMeta = (ciphertext, plaintext, recoveredKey, keyLen) => {
  let alphaIndex = 0;

  return ciphertext.split('').map((cipherChar, textIndex) => {
    if (cipherChar < 'A' || cipherChar > 'Z') {
      return { type: 'space', textIndex, cipherChar };
    }

    const slot = alphaIndex % keyLen;
    const keyLetter = recoveredKey[slot];
    const plainChar = keyLetter
      ? idxToChar(charToIdx(cipherChar) - charToIdx(keyLetter))
      : '_';
    const actualPlain = plaintext[textIndex];
    const solved = keyLetter ? plainChar === actualPlain : false;

    alphaIndex++;

    return {
      type: 'letter',
      textIndex,
      cipherChar,
      slot,
      cycleIndex: alphaIndex,
      keyLetter,
      plainChar,
      actualPlain,
      solved
    };
  });
};

const buildRecapRows = (ciphertext, plaintext, targetKey) => {
  const rows = [];
  let alphaIndex = 0;

  ciphertext.split('').forEach((cipherChar, textIndex) => {
    if (cipherChar < 'A' || cipherChar > 'Z') return;

    const keyLetter = targetKey[alphaIndex % targetKey.length];
    const keyShift = charToIdx(keyLetter);
    rows.push({
      index: alphaIndex,
      textIndex,
      cipher: cipherChar,
      keyLetter,
      keyShift,
      plain: plaintext[textIndex]
    });

    alphaIndex++;
  });

  return rows;
};

const buildSampleMappings = (ciphertext, slotPositions, guessLetter) =>
  slotPositions.slice(0, 3).map((textIndex) => {
    const cipherChar = ciphertext[textIndex];
    return `${cipherChar}->${idxToChar(charToIdx(cipherChar) - charToIdx(guessLetter))}`;
  });

const generateRandomPellets = (ghostList, pacmanPos) => {
  const openSpaces = [];

  for (let r = 1; r < MAZE_GRID.length - 1; r++) {
    for (let c = 1; c < MAZE_GRID[r].length - 1; c++) {
      if (MAZE_GRID[r][c] !== 0) continue;
      const blockedByPacman = pacmanPos.row === r && pacmanPos.col === c;
      const blockedByGhost = ghostList.some((ghost) => ghost.row === r && ghost.col === c);

      if (!blockedByPacman && !blockedByGhost) {
        openSpaces.push({ row: r, col: c });
      }
    }
  }

  const shuffled = [...openSpaces].sort(() => Math.random() - 0.5);
  if (!shuffled[0]) return [];

  return [{
    id: `skill-${Date.now()}-${Math.random()}`,
    row: shuffled[0].row,
    col: shuffled[0].col,
    eaten: false,
    isSkill: true
  }];
};

const generateGhostsForSlot = (targetKey, activeSlot) => {
  const correctLetter = targetKey[activeSlot];
  const distractorPool = new Set([correctLetter]);

  while (distractorPool.size < GHOST_STARTS.length) {
    const randomLetter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    distractorPool.add(randomLetter);
  }

  return [...distractorPool]
    .sort(() => Math.random() - 0.5)
    .map((char, index) => {
      const start = GHOST_STARTS[index % GHOST_STARTS.length];
      return {
        id: `ghost-${activeSlot}-${index}-${char}`,
        char,
        isCorrect: char === correctLetter,
        row: start.row,
        col: start.col,
        eaten: false,
        dir: start.dir
      };
    });
};

export default function VigenereGame({
  levelData,
  tier,
  onVerifySubmit,
  onBackToStages,
  onReplayNewQuestion
}) {
  const targetKey = levelData.targetKey;
  const keyLen = targetKey.length;
  const initialPacman = { row: 1, col: 1 };

  const [phase, setPhase] = useState('ready');
  const [pacman, setPacman] = useState(initialPacman);
  const [pacmanDir, setPacmanDir] = useState('NONE');
  const [bufferedDir, setBufferedDir] = useState('NONE');
  const [ghosts, setGhosts] = useState([]);
  const [pellets, setPellets] = useState([]);
  const [lives, setLives] = useState(5);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationStep, setExplanationStep] = useState(-1);
  const [flashError, setFlashError] = useState(false);
  const [ruleViolation, setRuleViolation] = useState(null);
  const [levelSolved, setLevelSolved] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [isInvulnerable, setIsInvulnerable] = useState(false);
  const [hasSkillCharge, setHasSkillCharge] = useState(false);
  const [skillActive, setSkillActive] = useState(false);
  const [skillTimeLeft, setSkillTimeLeft] = useState(0);
  const [recoveredKey, setRecoveredKey] = useState(Array(keyLen).fill(''));
  const [activeSlot, setActiveSlot] = useState(0);
  const [mistakesThisSlot, setMistakesThisSlot] = useState(0);

  const pacmanRef = useRef(pacman);
  const ghostsRef = useRef(ghosts);
  const pelletsRef = useRef(pellets);
  const pacmanDirRef = useRef(pacmanDir);
  const bufferedDirRef = useRef(bufferedDir);
  const skillActiveRef = useRef(skillActive);
  const isInvulnerableRef = useRef(isInvulnerable);
  const activeSlotRef = useRef(activeSlot);
  const mistakesRef = useRef(mistakesThisSlot);
  const gameLoopRef = useRef(null);
  const ghostMoveTickRef = useRef(false);

  useEffect(() => { pacmanRef.current = pacman; }, [pacman]);
  useEffect(() => { ghostsRef.current = ghosts; }, [ghosts]);
  useEffect(() => { pelletsRef.current = pellets; }, [pellets]);
  useEffect(() => { pacmanDirRef.current = pacmanDir; }, [pacmanDir]);
  useEffect(() => { bufferedDirRef.current = bufferedDir; }, [bufferedDir]);
  useEffect(() => { skillActiveRef.current = skillActive; }, [skillActive]);
  useEffect(() => { isInvulnerableRef.current = isInvulnerable; }, [isInvulnerable]);
  useEffect(() => { activeSlotRef.current = activeSlot; }, [activeSlot]);
  useEffect(() => { mistakesRef.current = mistakesThisSlot; }, [mistakesThisSlot]);

  const slotPositions = useMemo(
    () => getSlotPositions(levelData.ciphertext, keyLen),
    [levelData.ciphertext, keyLen]
  );
  const letterMeta = useMemo(
    () => buildLetterMeta(levelData.ciphertext, levelData.plaintext, recoveredKey, keyLen),
    [levelData.ciphertext, levelData.plaintext, recoveredKey, keyLen]
  );
  const recapRows = useMemo(
    () => buildRecapRows(levelData.ciphertext, levelData.plaintext, targetKey),
    [levelData.ciphertext, levelData.plaintext, targetKey]
  );

  const hintStage = mistakesThisSlot >= 2 ? 2 : mistakesThisSlot >= 1 ? 1 : 0;
  const currentSlotPositions = slotPositions[activeSlot] || [];
  const currentKeyLetter = targetKey[activeSlot] || '';
  const currentShift = currentKeyLetter ? charToIdx(currentKeyLetter) : 0;
  const currentPositionLabel = currentSlotPositions.map((position) => position + 1).join(', ');
  const solvedKeyCount = recoveredKey.filter(Boolean).length;

  const resetRound = () => {
    const initialGhosts = generateGhostsForSlot(targetKey, 0);
    setPacman(initialPacman);
    setPacmanDir('NONE');
    setBufferedDir('NONE');
    setLives(5);
    setShowExplanation(false);
    setExplanationStep(-1);
    setFlashError(false);
    setRuleViolation(null);
    setLevelSolved(false);
    setGameOver(false);
    setIsScreenShaking(false);
    setIsInvulnerable(false);
    isInvulnerableRef.current = false;
    setHasSkillCharge(false);
    setSkillActive(false);
    setSkillTimeLeft(0);
    setRecoveredKey(Array(keyLen).fill(''));
    setActiveSlot(0);
    setMistakesThisSlot(0);
    setGhosts(initialGhosts);
    setPellets(generateRandomPellets(initialGhosts, initialPacman));
  };

  useEffect(() => {
    setPhase('ready');
    resetRound();
  }, [levelData]);

  useEffect(() => {
    if (phase !== 'playing' || gameOver || levelSolved) return;
    const nextGhosts = generateGhostsForSlot(targetKey, activeSlot);
    setGhosts(nextGhosts);
    ghostsRef.current = nextGhosts;
  }, [activeSlot, phase, gameOver, levelSolved, targetKey]);

  const triggerSteer = (dirName) => {
    if (gameOver || levelSolved || phase !== 'playing') return;
    setBufferedDir(dirName);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (['ArrowUp', 'KeyW'].includes(event.code)) {
        event.preventDefault();
        triggerSteer('UP');
      } else if (['ArrowDown', 'KeyS'].includes(event.code)) {
        event.preventDefault();
        triggerSteer('DOWN');
      } else if (['ArrowLeft', 'KeyA'].includes(event.code)) {
        event.preventDefault();
        triggerSteer('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(event.code)) {
        event.preventDefault();
        triggerSteer('RIGHT');
      } else if (event.code === 'Space') {
        event.preventDefault();
        if (hasSkillCharge && !skillActive && !gameOver && !levelSolved && phase === 'playing') {
          setSkillActive(true);
          setHasSkillCharge(false);
          setSkillTimeLeft(7);
          setRuleViolation(`Decode Window active. Hunt key slot ${activeSlotRef.current + 1}: "${targetKey[activeSlotRef.current]}".`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, hasSkillCharge, levelSolved, phase, skillActive, targetKey]);

  useEffect(() => {
    if (!skillActive) return;

    const interval = setInterval(() => {
      setSkillTimeLeft((prev) => {
        if (prev <= 1) {
          setSkillActive(false);
          skillActiveRef.current = false;
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [skillActive]);

  const handleLoseHeart = (message) => {
    if (isInvulnerableRef.current) return;

    setIsInvulnerable(true);
    isInvulnerableRef.current = true;
    setTimeout(() => {
      setIsInvulnerable(false);
      isInvulnerableRef.current = false;
    }, 1200);

    setFlashError(true);
    setTimeout(() => setFlashError(false), 300);
    setRuleViolation(message);

    setLives((prev) => {
      const nextLives = prev - 1;
      if (nextLives <= 0) setGameOver(true);
      return nextLives;
    });
  };

  const advanceAfterCorrectCatch = (capturedLetter) => {
    const slotJustSolved = activeSlotRef.current;
    const nextRecovered = [...recoveredKey];
    nextRecovered[slotJustSolved] = capturedLetter;
    setRecoveredKey(nextRecovered);
    setMistakesThisSlot(0);

    if (slotJustSolved >= keyLen - 1) {
      setLevelSolved(true);
      setSkillActive(false);
      setSkillTimeLeft(0);
      skillActiveRef.current = false;
      setRuleViolation(`Keyword complete: ${nextRecovered.join('')}. Every repeating shift is now locked in.`);
      return;
    }

    const nextSlot = slotJustSolved + 1;
    setActiveSlot(nextSlot);
    setRuleViolation(
      `Keyword slot ${slotJustSolved + 1} solved with "${capturedLetter}" (+${charToIdx(capturedLetter)}). Now chase slot ${nextSlot + 1}.`
    );
  };

  const registerWrongCatch = (ghostChar) => {
    const nextMistakes = mistakesRef.current + 1;
    setMistakesThisSlot(nextMistakes);

    const samples = buildSampleMappings(levelData.ciphertext, currentSlotPositions, ghostChar).join(', ');
    if (nextMistakes >= 2) {
      setRuleViolation(
        `Decoy "${ghostChar}" is wrong for slot ${activeSlotRef.current + 1}. Hint unlocked: the real key letter is "${currentKeyLetter}" and its shift is +${currentShift}.`
      );
    } else {
      setRuleViolation(
        `Decoy "${ghostChar}" would decrypt this slot as ${samples}. Try the repeating-key shift +${currentShift} instead.`
      );
    }
  };

  useEffect(() => {
    if (phase !== 'playing' || gameOver || levelSolved) return;

    const gameTick = () => {
      const currentPacman = pacmanRef.current;
      const currentPacmanDir = pacmanDirRef.current;
      const currentBufferedDir = bufferedDirRef.current;
      const currentSkillActive = skillActiveRef.current;
      const currentInvulnerable = isInvulnerableRef.current;

      let activeDirection = currentPacmanDir;
      if (currentBufferedDir !== 'NONE') {
        const test = DIR_VECTORS[currentBufferedDir];
        const testRow = currentPacman.row + test.r;
        const testCol = currentPacman.col + test.c;
        if (MAZE_GRID[testRow] && MAZE_GRID[testRow][testCol] === 0) {
          activeDirection = currentBufferedDir;
          setPacmanDir(currentBufferedDir);
          setBufferedDir('NONE');
        }
      }

      let nextRow = currentPacman.row;
      let nextCol = currentPacman.col;
      if (activeDirection !== 'NONE') {
        const vector = DIR_VECTORS[activeDirection];
        const candidateRow = currentPacman.row + vector.r;
        const candidateCol = currentPacman.col + vector.c;

        if (MAZE_GRID[candidateRow] && MAZE_GRID[candidateRow][candidateCol] === 0) {
          nextRow = candidateRow;
          nextCol = candidateCol;
          setPacman({ row: candidateRow, col: candidateCol });
        } else {
          setPacmanDir('NONE');
        }
      }

      setPellets((prevPellets) =>
        prevPellets.map((pellet) => {
          if (!pellet.eaten && pellet.row === nextRow && pellet.col === nextCol) {
            setHasSkillCharge(true);
            setRuleViolation('Decode Pulse charged. Press SPACEBAR, then chase the ghost carrying the next key letter.');
            return { ...pellet, eaten: true };
          }
          return pellet;
        })
      );

      ghostMoveTickRef.current = !ghostMoveTickRef.current;
      const shouldMoveGhosts = ghostMoveTickRef.current && !currentSkillActive;

      if (shouldMoveGhosts) {
        setGhosts((prevGhosts) => {
          const movedGhosts = [];

          for (let index = 0; index < prevGhosts.length; index++) {
            const ghost = prevGhosts[index];
            if (ghost.eaten) {
              movedGhosts.push(ghost);
              continue;
            }

            const isOccupied = (row, col) => {
              const alreadyMoved = movedGhosts.some((item) => !item.eaten && item.row === row && item.col === col);
              if (alreadyMoved) return true;

              for (let check = index + 1; check < prevGhosts.length; check++) {
                const other = prevGhosts[check];
                if (!other.eaten && other.row === row && other.col === col) return true;
              }

              return false;
            };

            const nextGhostRow = ghost.row + ghost.dir.r;
            const nextGhostCol = ghost.col + ghost.dir.c;
            const canKeepGoing =
              MAZE_GRID[nextGhostRow] &&
              MAZE_GRID[nextGhostRow][nextGhostCol] === 0 &&
              !isOccupied(nextGhostRow, nextGhostCol);

            if (canKeepGoing) {
              movedGhosts.push({ ...ghost, row: nextGhostRow, col: nextGhostCol });
              continue;
            }

            const directions = [
              { r: -1, c: 0 },
              { r: 1, c: 0 },
              { r: 0, c: -1 },
              { r: 0, c: 1 }
            ];

            const validMoves = directions.filter((dir) => {
              const row = ghost.row + dir.r;
              const col = ghost.col + dir.c;
              const open = MAZE_GRID[row] && MAZE_GRID[row][col] === 0;
              const opposite = (dir.r === -ghost.dir.r && dir.r !== 0) || (dir.c === -ghost.dir.c && dir.c !== 0);
              return open && !isOccupied(row, col) && !opposite;
            });

            const options = validMoves.length > 0 ? validMoves : directions.filter((dir) => {
              const row = ghost.row + dir.r;
              const col = ghost.col + dir.c;
              return MAZE_GRID[row] && MAZE_GRID[row][col] === 0 && !isOccupied(row, col);
            });

            if (options.length === 0) {
              movedGhosts.push(ghost);
              continue;
            }

            const chosen = options[Math.floor(Math.random() * options.length)];
            movedGhosts.push({
              ...ghost,
              row: ghost.row + chosen.r,
              col: ghost.col + chosen.c,
              dir: chosen
            });
          }

          return movedGhosts;
        });
      }

      setGhosts((prevGhosts) => {
        let hurtTriggered = false;

        return prevGhosts.map((ghost) => {
          if (ghost.eaten) return ghost;
          if (ghost.row !== nextRow || ghost.col !== nextCol) return ghost;

          if (currentSkillActive) {
            setSkillActive(false);
            setSkillTimeLeft(0);
            skillActiveRef.current = false;

            if (ghost.isCorrect) {
              advanceAfterCorrectCatch(ghost.char);
              return { ...ghost, eaten: true };
            }

            if (!currentInvulnerable && !hurtTriggered) {
              hurtTriggered = true;
              setIsScreenShaking(true);
              setTimeout(() => setIsScreenShaking(false), 450);
              registerWrongCatch(ghost.char);
              handleLoseHeart(
                `Wrong key ghost "${ghost.char}". In Vigenere, slot ${activeSlotRef.current + 1} must use the matching keyword letter.`
              );
            }
          } else if (!currentInvulnerable && !hurtTriggered) {
            hurtTriggered = true;
            setIsScreenShaking(true);
            setTimeout(() => setIsScreenShaking(false), 450);
            handleLoseHeart(
              'Ghost collision without Decode Window. Grab the yellow pulse pellet first, then press SPACEBAR before making a catch.'
            );
          }

          const reboundDir = { r: -ghost.dir.r, c: -ghost.dir.c };
          const reboundRow = ghost.row + reboundDir.r;
          const reboundCol = ghost.col + reboundDir.c;
          const canRebound = MAZE_GRID[reboundRow] && MAZE_GRID[reboundRow][reboundCol] === 0;

          return {
            ...ghost,
            dir: reboundDir,
            row: canRebound ? reboundRow : ghost.row,
            col: canRebound ? reboundCol : ghost.col
          };
        });
      });

      gameLoopRef.current = setTimeout(gameTick, 180);
    };

    gameLoopRef.current = setTimeout(gameTick, 180);
    return () => clearTimeout(gameLoopRef.current);
  }, [
    currentKeyLetter,
    currentShift,
    currentSlotPositions,
    gameOver,
    levelSolved,
    levelData.ciphertext,
    phase,
    recoveredKey,
    targetKey
  ]);

  useEffect(() => {
    if (phase !== 'playing' || gameOver || levelSolved) return;

    const spawnTimer = setInterval(() => {
      const currentPellets = pelletsRef.current;
      const currentPacman = pacmanRef.current;
      const currentGhosts = ghostsRef.current;
      const hasLiveSkillPellet = currentPellets.some((pellet) => !pellet.eaten && pellet.isSkill);

      if (hasLiveSkillPellet) return;

      const openSpaces = [];
      for (let r = 1; r < MAZE_GRID.length - 1; r++) {
        for (let c = 1; c < MAZE_GRID[r].length - 1; c++) {
          if (MAZE_GRID[r][c] !== 0) continue;
          const occupiedByPacman = currentPacman.row === r && currentPacman.col === c;
          const occupiedByGhost = currentGhosts.some((ghost) => !ghost.eaten && ghost.row === r && ghost.col === c);
          const occupiedByPellet = currentPellets.some((pellet) => !pellet.eaten && pellet.row === r && pellet.col === c);

          if (!occupiedByPacman && !occupiedByGhost && !occupiedByPellet) {
            openSpaces.push({ row: r, col: c });
          }
        }
      }

      if (!openSpaces.length) return;
      const nextSpawn = openSpaces[Math.floor(Math.random() * openSpaces.length)];
      setPellets((prev) => [
        ...prev.filter((pellet) => !pellet.eaten),
        {
          id: `skill-${Date.now()}-${Math.random()}`,
          row: nextSpawn.row,
          col: nextSpawn.col,
          eaten: false,
          isSkill: true
        }
      ]);
    }, 1800);

    return () => clearInterval(spawnTimer);
  }, [gameOver, levelSolved, phase]);

  const handleVerifySubmit = () => {
    if (!levelSolved) return;
    setShowExplanation(true);
    setExplanationStep(-1);

    let step = -1;
    const interval = setInterval(() => {
      step++;
      setExplanationStep(step);
      if (step >= recapRows.length - 1) clearInterval(interval);
    }, 500);
  };

  const liveWords = [];
  let currentWord = [];
  letterMeta.forEach((item) => {
    if (item.type === 'space') {
      if (currentWord.length) liveWords.push(currentWord);
      currentWord = [];
      return;
    }
    currentWord.push(item);
  });
  if (currentWord.length) liveWords.push(currentWord);

  const patternExamples = currentSlotPositions.slice(0, 4).map((textIndex) => {
    const cipher = levelData.ciphertext[textIndex];
    const plain = idxToChar(charToIdx(cipher) - currentShift);
    return { cipher, plain, order: textIndex + 1 };
  });

  if (phase === 'ready') {
    return (
      <div className="pacman-container fg-root">
        <header className="fg-header relative-header">
          <button className="exit-stage-absolute" onClick={onBackToStages}>
            <span className="material-symbols-outlined">arrow_back</span>
            Exit to Stages
          </button>
          <div className="fg-header-category indent-header-title">Vigenere Cipher</div>
          <div className="fg-header-stage" style={{ flex: 1, textAlign: 'center' }}>
            {tier.toUpperCase()} Mode - Stage {levelData.level}
          </div>
        </header>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', width: '100%' }}>
          <div className="vg-ready-card" style={{ maxWidth: 560 }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🧩</div>
            <h2 style={{ color: 'var(--neon-cyan)', margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800 }}>
              Vigenere in Cipher Pac-Man
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
              Same maze. New mission. Instead of one Caesar shift, you recover a repeating Vigenere keyword one letter at a time and watch whole position-patterns decrypt at once.
            </p>

            <div className="vg-ready-preview">
              <div className="vg-preview-row">
                <span className="vg-preview-label">Ciphertext</span>
                <span className="vg-preview-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
                  {levelData.ciphertext}
                </span>
              </div>
              <div className="vg-preview-row">
                <span className="vg-preview-label">Keyword Length</span>
                <span className="vg-preview-value">{keyLen} slots</span>
              </div>
              <div className="vg-preview-row">
                <span className="vg-preview-label">Message Hint</span>
                <span className="vg-preview-value" style={{ color: '#a0c4d8', fontStyle: 'italic', letterSpacing: 'normal' }}>
                  {levelData.hint}
                </span>
              </div>
              {levelData.keyClue && (
                <div className="vg-preview-row" style={{ borderTop: '1px solid rgba(255,215,0,0.2)', paddingTop: 8, marginTop: 4 }}>
                  <span className="vg-preview-label" style={{ color: '#ffd700' }}>Keyword Clue</span>
                  <span className="vg-preview-value" style={{ color: '#ffd700', fontStyle: 'italic', fontSize: '0.82rem', letterSpacing: 'normal' }}>
                    {levelData.keyClue}
                  </span>
                </div>
              )}
            </div>

            <div className="vg-how-it-works">
              <strong>How this maze works:</strong><br />
              Grab a yellow Decode Pulse, press <strong>SPACEBAR</strong>, then collide with the ghost carrying the correct keyword letter for the active slot.<br /><br />
              Every solved key slot decrypts all matching positions in the ciphertext pattern.<br /><br />
              Formula: <code style={{ color: 'var(--neon-green)', fontFamily: 'JetBrains Mono, monospace' }}>Plain[i] = Cipher[i] - Key[i mod |key|]</code>
            </div>

            <button className="vg-start-btn" onClick={() => { resetRound(); setPhase('playing'); }}>
              👾 Start Keyword Hunt
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pacman-container fg-root">
      {showExplanation && (
        <div className="fg-recap-overlay" style={{ overflowY: 'auto', padding: '30px 10px', zIndex: 9999 }}>
          <div className="fg-recap-card" style={{ maxWidth: '1100px', width: '95%', padding: '24px 32px' }}>
            <h2 className="fg-recap-title">Vigenere Keyword Recap</h2>
            <p className="fg-recap-subtitle">Recovered keyword: <span style={{ color: '#ffd700', letterSpacing: '0.16em' }}>{targetKey}</span></p>

            <div className="fg-recap-animation-box" style={{ minHeight: 'auto', padding: '16px', marginBottom: '16px' }}>
              <div className="fg-recap-letter-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
                {recapRows.map((row, index) => (
                  <div key={row.index} className={`fg-recap-node ${explanationStep >= index ? 'active' : 'waiting'}`}>
                    <span className="fg-recap-char-cipher">{row.cipher}</span>
                    <span className="fg-recap-math">-{row.keyLetter}</span>
                    <span className="fg-recap-arrow">↓</span>
                    <span className="fg-recap-char-plain">{row.plain}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="vg-recap-table-wrap" style={{ marginBottom: 16 }}>
              <table className="vg-recap-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cipher</th>
                    <th>Key Slot</th>
                    <th>Shift</th>
                    <th>Formula</th>
                    <th>Plain</th>
                  </tr>
                </thead>
                <tbody>
                  {recapRows.map((row, index) => {
                    const lit = explanationStep >= index;
                    return (
                      <tr key={row.index} style={{ opacity: lit ? 1 : 0.2, transition: 'opacity 0.3s' }}>
                        <td>{index + 1}</td>
                        <td className={lit ? 'lit' : ''}>{row.cipher}</td>
                        <td style={{ color: '#ffd700' }}>{row.keyLetter}</td>
                        <td style={{ color: 'rgba(255,255,255,0.45)' }}>-{row.keyShift}</td>
                        <td style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem' }}>
                          ({charToIdx(row.cipher)} - {row.keyShift} + 26) mod 26 = {charToIdx(row.plain)}
                        </td>
                        <td className={lit ? 'result-cell' : ''}>{row.plain}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="vg-recap-explanation">
              <strong>Why this feels different from Caesar:</strong><br />
              Caesar uses one shift for every letter. Vigenere repeats a keyword, so slot 1, slot 2, slot 3, and so on can all use different shifts before the pattern repeats.
              <br /><br />
              {levelData.keyInfo && (
                <span>
                  <strong>Keyword insight:</strong> {levelData.keyInfo}
                  <br /><br />
                </span>
              )}
              <code>Plain[i] = (Cipher[i] - Key[i mod |key|] + 26) mod 26</code>
            </div>

            <div className="fg-recap-actions" style={{ marginTop: 16 }}>
              <button
                className="fg-btn fg-btn-primary"
                onClick={() => {
                  setShowExplanation(false);
                  onVerifySubmit();
                }}
                disabled={explanationStep < recapRows.length - 1}
                style={{ background: 'var(--neon-green)', color: '#030914' }}
              >
                Unlock Next Objective
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="fg-header relative-header">
        <button className="exit-stage-absolute" onClick={onBackToStages}>
          <span className="material-symbols-outlined">arrow_back</span>
          Exit to Stages
        </button>
        <div className="fg-header-category indent-header-title">Vigenere in Cipher Pac-Man</div>
        <div className="fg-header-stage" style={{ flex: 1, textAlign: 'center' }}>
          {tier.toUpperCase()} Mode - Level {levelData.level}
        </div>
        <div className="pacman-hearts-display">
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={index} className={`material-symbols-outlined heart-icon ${index < lives ? 'active-heart' : 'lost-heart'}`}>
              favorite
            </span>
          ))}
        </div>
      </header>

      <div className="pacman-layout">
        <aside className="fg-sidebar">
          <div className="fg-basket-card">
            <div className="fg-basket-container" style={{ fontSize: '2rem' }}>🔐</div>
            <div className="fg-basket-shift-value" style={{ color: 'var(--neon-green)', fontSize: '1.3rem' }}>
              {recoveredKey.map((char, index) => char || (index === activeSlot ? '?' : '_')).join(' ')}
            </div>
            <span className="fg-basket-label">Recovered Keyword</span>
            <span style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Slot {activeSlot + 1} of {keyLen} · Shift +{currentShift}
            </span>
          </div>

          <div className={`skill-charge-card ${hasSkillCharge ? 'charged' : ''} ${skillActive ? 'active' : ''}`}>
            <div className="skill-charge-title">Decode Pulse</div>
            <div className="skill-pellet-icon-wrapper">
              <span className="material-symbols-outlined skill-bolt">flash_on</span>
            </div>
            {skillActive ? (
              <div className="skill-timer-badge">WINDOW OPEN: {skillTimeLeft}s</div>
            ) : hasSkillCharge ? (
              <button
                className="activate-skill-btn"
                onClick={() => {
                  setSkillActive(true);
                  setHasSkillCharge(false);
                  setSkillTimeLeft(7);
                  setRuleViolation(`Decode Window active. Hunt key slot ${activeSlot + 1}.`);
                }}
              >
                Press SPACEBAR
              </button>
            ) : (
              <div className="skill-hint-label">Eat yellow pellet to charge</div>
            )}
          </div>

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

          <div className="sidebar-action-hud">
            {levelSolved ? (
              <div className="fg-success-panel">
                <h3>KEYWORD SECURED</h3>
                <p>All repeating shifts are solved.</p>
                <button
                  className="fg-btn fg-btn-primary"
                  onClick={handleVerifySubmit}
                  style={{ width: '100%', background: 'var(--neon-green)', color: '#030914', marginTop: '10px' }}
                >
                  Verify and Submit
                </button>
                <button
                  className="fg-btn fg-btn-secondary"
                  onClick={onReplayNewQuestion}
                  style={{ width: '100%', marginTop: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                >
                  Play Again
                </button>
              </div>
            ) : ruleViolation ? (
              <div className="fg-alert-panel">
                <strong>Keyword Guidance</strong>
                <p style={{ fontSize: '0.74rem', lineHeight: '1.4', color: '#f8fafc' }}>{ruleViolation}</p>
              </div>
            ) : (
              <div className="fg-alert-panel default-alert">
                <strong>Objectives</strong>
                <div style={{ fontSize: '0.74rem', lineHeight: '1.45', color: '#cbd5e1' }}>
                  Use the keyword clue and repeating pattern to solve the active slot.<br />
                  Eat a yellow Decode Pulse, then press SPACEBAR to open a safe catch window.<br />
                  Catch the ghost carrying the correct keyword letter for the current slot.<br />
                  Every solved slot decrypts its repeating positions across the message.
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="pacman-main">
          <section className="fg-word-panel">
            <div className="fg-letter-cells" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: '10px 6px' }}>
              {letterMeta.map((cell) => {
                if (cell.type === 'space') {
                  return <div key={`space-${cell.textIndex}`} style={{ width: 12 }} />;
                }

                const isActivePattern = cell.slot === activeSlot;
                const borderColor = cell.solved
                  ? 'rgba(57,255,20,0.45)'
                  : isActivePattern
                    ? 'rgba(255,215,0,0.55)'
                    : 'rgba(0,229,255,0.16)';

                const background = cell.solved
                  ? 'rgba(57,255,20,0.08)'
                  : isActivePattern
                    ? 'rgba(255,215,0,0.08)'
                    : 'rgba(2,6,23,0.7)';

                return (
                  <div key={cell.textIndex} className="fg-letter-cell" style={{ borderColor, background }}>
                    <span className="fg-cell-ciphertext">{cell.cipherChar}</span>
                    <span style={{ fontSize: '0.62rem', color: isActivePattern ? '#ffd700' : 'rgba(255,255,255,0.45)' }}>
                      K{cell.slot + 1}
                    </span>
                    <span className="fg-cell-plaintext" style={{ color: cell.solved ? 'var(--neon-green)' : '#f8fafc' }}>
                      {cell.keyLetter ? cell.plainChar : '_'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="fg-clue-banner" style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span>Message Hint: <strong>"{levelData.hint}"</strong></span>
              <span>Slot {activeSlot + 1} hits positions: <strong>{currentPositionLabel}</strong></span>
            </div>
          </section>

          <section className="fg-word-panel" style={{ padding: '12px 18px' }}>
            <div className="vg-word-panel-title">Live Vigenere Decryption</div>
            <div className="vg-segments-row">
              {liveWords.map((word, wordIndex) => {
                const solvedWord = word.every((cell) => cell.solved);
                return (
                  <div key={wordIndex} className={`vg-segment-card ${solvedWord ? 'is-solved' : ''}`} style={{ cursor: 'default' }}>
                    <div className="vg-letter-row">
                      {word.map((cell) => (
                        <div key={cell.textIndex} className="vg-letter-cell">
                          <span className="vg-cell-cipher">{cell.cipherChar}</span>
                          <span className="vg-cell-key">
                            {cell.keyLetter || (cell.slot === activeSlot ? '?' : '_')}
                          </span>
                          <span className="vg-cell-arrow">↓</span>
                          <span className={`vg-cell-plain ${!cell.keyLetter ? 'pending' : cell.solved ? 'correct' : 'wrong'}`}>
                            {cell.keyLetter ? cell.plainChar : '?'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="vg-segment-label">
                      {solvedWord ? 'Solved Word' : `Pattern slot focus: ${activeSlot + 1}`}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="vg-decrypt-indicator" style={{ marginTop: 8 }}>
              <span>🎯</span>
              <span>
                Current target: key slot {activeSlot + 1} = shift +{currentShift}. This slot affects positions {currentPositionLabel}.
              </span>
            </div>
            <div className="vg-value-reference">
              <div className="vg-value-reference-title">Letter Value Reference</div>
              <div className="vg-value-reference-grid">
                {ALPHABET_VALUE_PAIRS.map((entry) => (
                  <span key={entry.letter} className="vg-value-pill">
                    {entry.letter}({entry.value})
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="pacman-board-wrapper bigger-board">
            <div style={{ position: 'absolute', top: 14, left: 18, zIndex: 35, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(2,8,20,0.92)', border: '1px solid rgba(255,215,0,0.35)', borderRadius: 12, padding: '8px 12px', maxWidth: 270 }}>
                <div style={{ fontSize: '0.72rem', color: '#ffd700', fontWeight: 700, marginBottom: 4 }}>Active Slot Pattern</div>
                <div style={{ fontSize: '0.75rem', color: '#e2e8f0', lineHeight: 1.45 }}>
                  Slot {activeSlot + 1} uses key letter <strong>{hintStage >= 2 ? currentKeyLetter : '?'}</strong> and repeats on positions {currentPositionLabel}.
                </div>
              </div>

              <div style={{ background: 'rgba(2,8,20,0.92)', border: '1px solid rgba(0,229,255,0.25)', borderRadius: 12, padding: '8px 12px', maxWidth: 320 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--neon-cyan)', fontWeight: 700, marginBottom: 4 }}>Example Decryptions</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {patternExamples.map((sample) => (
                    <span key={sample.order} style={{ fontSize: '0.72rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', borderRadius: 999, padding: '4px 8px' }}>
                      #{sample.order}: {sample.cipher} {'->'} {hintStage >= 1 ? sample.plain : '?'}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className={`maze-grid size-larger ${flashError ? 'flash-error' : ''} ${isScreenShaking ? 'screen-shake' : ''}`} style={{ marginTop: 32 }}>
              {MAZE_GRID.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const className = cell === 1 ? 'maze-cell wall' : 'maze-cell path';
                  return <div key={`cell-${rowIndex}-${colIndex}`} className={className}></div>;
                })
              )}

              <div
                className={`pacman-sprite-absolute ${isInvulnerable ? 'invulnerable-blink' : ''}`}
                style={{ left: `${pacman.col * 46}px`, top: `${pacman.row * 46}px` }}
              >
                😮
              </div>

              {ghosts.map((ghost) => {
                if (ghost.eaten) return null;
                const revealCorrectGhost = hintStage >= 2 && ghost.isCorrect;

                return (
                  <div
                    key={ghost.id}
                    className={`ghost-sprite-absolute ${skillActive ? 'vulnerable' : ''}`}
                    style={{
                      left: `${ghost.col * 46}px`,
                      top: `${ghost.row * 46}px`,
                      filter: revealCorrectGhost ? 'drop-shadow(0 0 12px #ffd700)' : undefined
                    }}
                  >
                    <div className="ghost-sprite-body">
                      {revealCorrectGhost ? '👑' : '👻'}
                      <span
                        className="ghost-inner-letter"
                        style={revealCorrectGhost ? { borderColor: '#ffd700', color: '#ffd700' } : undefined}
                      >
                        {ghost.char}
                      </span>
                    </div>
                  </div>
                );
              })}

              {pellets.map((pellet) => {
                if (pellet.eaten) return null;
                return (
                  <div
                    key={pellet.id}
                    className="pellet-entity"
                    style={{ left: `${pellet.col * 46}px`, top: `${pellet.row * 46}px` }}
                  >
                    <div className="circle-pellet-badge skill animate-pulse">⚡</div>
                  </div>
                );
              })}
            </div>

            {gameOver && (
              <div className="game-over-overlay">
                <div className="game-over-card glass-card">
                  <h2 className="game-over-title">GAME OVER</h2>
                  <p className="game-over-text">The keyword trail went cold. Re-enter the maze and rebuild the repeating pattern.</p>
                  <button className="fg-btn fg-btn-primary play-again-btn" onClick={resetRound}>
                    <span className="material-symbols-outlined">restart_alt</span>
                    <span>Retry Level</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="fg-word-panel" style={{ padding: '12px 18px' }}>
            <div className="vg-word-panel-title">Keyword Intel</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.18)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--neon-cyan)', fontWeight: 700, marginBottom: 6 }}>Keyword Clue</div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>{levelData.keyClue}</div>
              </div>
              <div style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.22)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: '0.72rem', color: '#ffd700', fontWeight: 700, marginBottom: 6 }}>Hint Ladder</div>
                <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                  {hintStage === 0 && `No misses yet. Focus on slot ${activeSlot + 1}.`}
                  {hintStage === 1 && `Hint 1: the slot shift is +${currentShift}. Example decryptions are now visible.`}
                  {hintStage === 2 && `Hint 2: the key letter is "${currentKeyLetter}" and the golden ghost marks it.`}
                </div>
              </div>
              <div style={{ background: 'rgba(57,255,20,0.05)', border: '1px solid rgba(57,255,20,0.18)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--neon-green)', fontWeight: 700, marginBottom: 6 }}>Progress</div>
                <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                  {solvedKeyCount}/{keyLen} keyword slots solved.<br />
                  Repeating slots make Vigenere stronger than Caesar because different positions use different shifts.
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
