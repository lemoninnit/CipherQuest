import React, { useState, useEffect, useRef } from 'react';
import './PacmanGame.css';

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
  const pelletValues = [6, 3, -2, 5, -4, 8, -6]; // exactly 7 values

  for (let i = 0; i < 7; i++) {
    if (shuffled[i]) {
      initialPellets.push({
        id: `p-${i}-${Date.now()}-${Math.random()}`,
        value: pelletValues[i],
        row: shuffled[i].row,
        col: shuffled[i].col,
        eaten: false,
        isSkill: false
      });
    }
  }

  // The 8th shuffled space becomes the yellow skill pellet
  if (shuffled[7]) {
    initialPellets.push({
      id: `skill-${Date.now()}-${Math.random()}`,
      value: 0,
      row: shuffled[7].row,
      col: shuffled[7].col,
      eaten: false,
      isSkill: true
    });
  }

  return initialPellets;
};

export default function PacmanGame({ levelData, tier, onVerifySubmit, onBackToStages }) {
  const targetShift = levelData.targetShifts[0]; // 6 for WATER

  // Initial Coordinates
  const initialPacman = { row: 1, col: 1 };
  
  // Limited to exactly 4 ghosts (2 targets, 2 decoys) for easy mode
  const initialGhosts = [
    { id: 'ghost-1', char: 'F', index: 1, row: 7, col: 1, eaten: false, dir: { r: 0, c: 1 } },
    { id: 'ghost-2', char: 'J', index: 3, row: 7, col: 19, eaten: false, dir: { r: 0, c: -1 } },
    { id: 'ghost-3', char: 'B', index: -1, row: 1, col: 9, eaten: false, dir: { r: 1, c: 0 } },
    { id: 'ghost-4', char: 'K', index: -1, row: 5, col: 4, eaten: false, dir: { r: 0, c: 1 } }
  ];

  const [pacman, setPacman] = useState(initialPacman);
  const [pacmanDir, setPacmanDir] = useState('NONE');
  const [bufferedDir, setBufferedDir] = useState('NONE');

  const [activeShift, setActiveShift] = useState(levelData.startShifts[0]); // starts at 2
  const [eatenGhosts, setEatenGhosts] = useState([]); // indices of eaten target letters [1, 3]
  const [lives, setLives] = useState(3); // 3 hearts
  const [flashError, setFlashError] = useState(false);
  const [ruleViolation, setRuleViolation] = useState(null);
  const [levelSolved, setLevelSolved] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Skill states
  const [hasSkillCharge, setHasSkillCharge] = useState(false);
  const [skillActive, setSkillActive] = useState(false);
  const [skillTimeLeft, setSkillTimeLeft] = useState(0);

  // Ghosts
  const [ghosts, setGhosts] = useState(initialGhosts);

  // Dynamic non-wall non-stacking pellet arrays on load
  const [pellets, setPellets] = useState(() => generateRandomPellets(initialGhosts, initialPacman));

  const isPoweredUp = activeShift === targetShift;
  const gameLoopRef = useRef(null);

  // ghostMoveTick toggle to limit ghost speed to exactly 0.5x of Pac-man's speed
  const ghostMoveTickRef = useRef(false);

  const handleLoseHeart = (message) => {
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

  // Instant responsive steering coordinates to eliminate keypress lag
  const triggerSteer = (dirName) => {
    if (gameOver || levelSolved) return;
    setBufferedDir(dirName);

    const vec = DIR_VECTORS[dirName];
    const nextRow = pacman.row + vec.r;
    const nextCol = pacman.col + vec.c;
    if (MAZE_GRID[nextRow] && MAZE_GRID[nextRow][nextCol] === 0) {
      setPacman({ row: nextRow, col: nextCol });
      setPacmanDir(dirName);
      setBufferedDir('NONE');
    }
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
  }, [pacman, gameOver, levelSolved, hasSkillCharge, skillActive]);

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

  // Main automatic tick loop (180ms loop)
  useEffect(() => {
    if (gameOver || levelSolved) return;

    const gameTick = () => {
      // 1. Process Buffered Input
      let activeDir = pacmanDir;
      if (bufferedDir !== 'NONE') {
        const testVec = DIR_VECTORS[bufferedDir];
        const testRow = pacman.row + testVec.r;
        const testCol = pacman.col + testVec.c;
        if (MAZE_GRID[testRow] && MAZE_GRID[testRow][testCol] === 0) {
          activeDir = bufferedDir;
          setPacmanDir(bufferedDir);
          setBufferedDir('NONE');
        }
      }

      // 2. Pacman auto-run movement step
      let pRow = pacman.row;
      let pCol = pacman.col;
      if (activeDir !== 'NONE') {
        const vec = DIR_VECTORS[activeDir];
        const nextRow = pacman.row + vec.r;
        const nextCol = pacman.col + vec.c;

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
              setActiveShift(pellet.value);
              setRuleViolation(null);
            }
            return { ...pellet, eaten: true };
          }
          return pellet;
        })
      );

      // 4. Move Ghosts only on ALTERNATE ticks (0.5x speed limit)
      ghostMoveTickRef.current = !ghostMoveTickRef.current;
      const shouldMoveGhosts = ghostMoveTickRef.current && !skillActive;

      if (shouldMoveGhosts) {
        setGhosts((prevGhosts) =>
          prevGhosts.map((ghost) => {
            if (ghost.eaten) return ghost;

            let gRow = ghost.row;
            let gCol = ghost.col;
            let gDir = ghost.dir || { r: 0, c: 1 };

            const nextRow = gRow + gDir.r;
            const nextCol = gCol + gDir.c;

            if (MAZE_GRID[nextRow] && MAZE_GRID[nextRow][nextCol] === 0) {
              return { ...ghost, row: nextRow, col: nextCol };
            } else {
              // Wall collision! Choose new direction (excluding reverse path to prevent back-turns)
              const directions = [
                { r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }
              ];
              
              const validMoves = directions.filter((d) => {
                const nr = gRow + d.r;
                const nc = gCol + d.c;
                const isOpen = MAZE_GRID[nr] && MAZE_GRID[nr][nc] === 0;
                const isOpposite = (d.r === -gDir.r && d.r !== 0) || (d.c === -gDir.c && d.c !== 0);
                return isOpen && !isOpposite;
              });

              const fallbackMoves = validMoves.length > 0 ? validMoves : directions.filter((d) => {
                const nr = gRow + d.r;
                const nc = gCol + d.c;
                return MAZE_GRID[nr] && MAZE_GRID[nr][nc] === 0;
              });

              if (fallbackMoves.length > 0) {
                const chosenDir = fallbackMoves[Math.floor(Math.random() * fallbackMoves.length)];
                return {
                  ...ghost,
                  row: gRow + chosenDir.r,
                  col: gCol + chosenDir.c,
                  dir: chosenDir
                };
              }
            }
            return ghost;
          })
        );
      }

      // 5. Ghost Collisions
      setGhosts((prevGhosts) =>
        prevGhosts.map((ghost) => {
          if (!ghost.eaten && ghost.row === pRow && ghost.col === pCol) {
            if (skillActive) {
              if (ghost.index !== -1) {
                if (isPoweredUp) {
                  setEatenGhosts((prevEaten) => {
                    const nextEaten = [...prevEaten, ghost.index];
                    if (nextEaten.length === 2) {
                      setLevelSolved(true);
                    }
                    return nextEaten;
                  });
                  return { ...ghost, eaten: true };
                } else {
                  handleLoseHeart(
                    `Active shift +${activeShift} decrypted Ciphertext '${ghost.char}' into '${caesarDecryptChar(ghost.char, activeShift)}', violating Caesar logic. Find correct shift first!`
                  );
                }
              } else {
                handleLoseHeart(
                  `Ouch! You ate Decoy Ghost '${ghost.char}' which does not belong to the target blanks. Avoid decoy ghosts!`
                );
              }
            } else {
              handleLoseHeart(
                `Ghost captured Pac-Man! You must eat the yellow pellet and press SPACEBAR to freeze them before colliding.`
              );
            }
          }
          return ghost;
        })
      );
    };

    gameLoopRef.current = setTimeout(gameTick, 180);
    return () => clearTimeout(gameLoopRef.current);
  }, [pacman, pacmanDir, bufferedDir, pellets, ghosts, skillActive, activeShift, gameOver, levelSolved]);

  // Non-stacking, non-wall dynamic pellet spawner
  useEffect(() => {
    if (gameOver || levelSolved) return;

    const spawnTimer = setInterval(() => {
      const activeShiftsCount = pellets.filter(p => !p.eaten && !p.isSkill).length;
      const hasActiveSkillPellet = pellets.some(p => !p.eaten && p.isSkill);

      const needsShift = activeShiftsCount < 7;
      const needsSkill = !hasActiveSkillPellet;

      if (needsShift || needsSkill) {
        const openSpaces = [];
        for (let r = 1; r < MAZE_GRID.length - 1; r++) {
          for (let c = 1; c < MAZE_GRID[r].length - 1; c++) {
            // Strictly check that the tile is a path (value 0)
            if (MAZE_GRID[r][c] === 0) {
              const hasPacman = pacman.row === r && pacman.col === c;
              const hasGhost = ghosts.some(g => !g.eaten && g.row === r && g.col === c);
              const hasActivePellet = pellets.some(p => !p.eaten && p.row === r && p.col === c);

              if (!hasPacman && !hasGhost && !hasActivePellet) {
                openSpaces.push({ row: r, col: c });
              }
            }
          }
        }

        if (openSpaces.length > 0) {
          const spawnLoc = openSpaces[Math.floor(Math.random() * openSpaces.length)];
          const spawnSkill = needsSkill && (Math.random() < 0.35);

          if (spawnSkill) {
            setPellets((prev) => [
              ...prev,
              { id: `skill-${Date.now()}`, value: 0, row: spawnLoc.row, col: spawnLoc.col, eaten: false, isSkill: true }
            ]);
          } else if (needsShift) {
            const possibleShifts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, -2, -3, -5, -6, -8];
            const randShift = possibleShifts[Math.floor(Math.random() * possibleShifts.length)];

            setPellets((prev) => [
              ...prev,
              { id: `p-${Date.now()}`, value: randShift, row: spawnLoc.row, col: spawnLoc.col, eaten: false, isSkill: false }
            ]);
          }
        }
      }
    }, 3000);

    return () => clearInterval(spawnTimer);
  }, [pellets, pacman, ghosts, gameOver, levelSolved]);

  const handleResetGame = () => {
    setPacman(initialPacman);
    setPacmanDir('NONE');
    setBufferedDir('NONE');
    setActiveShift(levelData.startShifts[0]);
    setEatenGhosts([]);
    setLives(3);
    setGameOver(false);
    setLevelSolved(false);
    setHasSkillCharge(false);
    setSkillActive(false);
    setRuleViolation(null);
    setGhosts(initialGhosts);
    
    // Regenerate unique and completely randomized pellet locations on restart
    setPellets(generateRandomPellets(initialGhosts, initialPacman));
  };

  return (
    <div className="pacman-container">
      {/* Header UI (Green Highlighted fixes) */}
      <header className="fg-header relative-header">
        <button className="exit-stage-absolute" onClick={onBackToStages}>
          <span className="material-symbols-outlined">arrow_back</span>
          Exit to Stages
        </button>
        <div className="fg-header-category indent-header-title">Caesar in Cipher Pac-Man</div>
        <div className="fg-header-stage" style={{ flex: 1, textAlign: 'center' }}>
          {tier.toUpperCase()} Mode — Level {levelData.level}
        </div>
        <div className="pacman-hearts-display">
          {Array.from({ length: 3 }).map((_, i) => (
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
          <div className="fg-basket-card">
            <div className="fg-basket-container" style={{ fontSize: '2.2rem' }}>😮</div>
            <div className="fg-basket-shift-value">+{activeShift}</div>
            <span className="fg-basket-label">Active Shift Power</span>
          </div>

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
            {ruleViolation ? (
              <div className="fg-alert-panel">
                <strong>⚠️ Alert Warning:</strong>
                <p style={{ fontSize: '0.74rem', lineHeight: '1.4', color: '#fda4af' }}>{ruleViolation}</p>
              </div>
            ) : (
              <div className="fg-alert-panel default-alert">
                <strong>📝 Objectives:</strong>
                <div style={{ fontSize: '0.74rem', lineHeight: '1.45', color: '#cbd5e1' }}>
                  • Determine the target shift using standard Caesar formulas.<br />
                  • Catch the matching shift pellet in the corridors.<br />
                  • Secure a yellow pellet 🟡, then press **SPACEBAR** to freeze.<br />
                  • Target the correct cipher letters to decipher blanks!
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Widescreen Board Area */}
        <main className="pacman-main">
          {/* Header Letters panel */}
          <section className="fg-word-panel">
            <div className="fg-letter-cells" style={{ justifyContent: 'center' }}>
              {levelData.plaintext.split('').map((char, idx) => {
                const mask = levelData.masks[0][idx];
                const isGhostIndex = idx === 1 || idx === 3;
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
                    <span className="fg-cell-ciphertext">{levelData.ciphertext[idx]}</span>
                    <span className="fg-cell-plaintext">{displayChar}</span>
                  </div>
                );
              })}
            </div>
            <div className="fg-clue-banner" style={{ marginTop: '8px' }}>
              💡 Clue Context: <strong>"{levelData.hint}"</strong>
            </div>
          </section>

          {/* Red Highlighted: Wider, taller board container */}
          <section className="pacman-board-wrapper bigger-board">
            <div className={`maze-grid size-larger ${flashError ? 'flash-error' : ''}`}>
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
                className="pacman-sprite-absolute"
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
                const isVulnerable = skillActive && isPoweredUp;
                return (
                  <div
                    key={ghost.id}
                    className={`ghost-sprite-absolute ${isVulnerable && ghost.index !== -1 ? 'vulnerable' : ''}`}
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
                      <div className={`circle-pellet-badge ${pellet.value === 6 ? 'correct' : ''}`}>
                        {pellet.value > 0 ? `+${pellet.value}` : pellet.value}
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

            {/* Level Solved verify overlay */}
            {levelSolved && (
              <div className="game-over-overlay">
                <div className="game-over-card glass-card solution-card">
                  <h2 className="solution-title text-green">🎯 SECURED DECIPHER!</h2>
                  <p className="game-over-text">All missing ciphertext letters successfully resolved.</p>
                  <button className="fg-btn fg-btn-primary play-again-btn solution-btn" onClick={onVerifySubmit}>
                    <span className="material-symbols-outlined">check_circle</span>
                    <span>Verify & Submit</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
