import React, { useState, useEffect, useRef } from 'react';
import './CipherSprint.css';

const decryptChar = (char, shift) => {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 - shift + 26) % 26 + 26) % 26 + 65);
  }
  return char;
};

export default function CipherSprint({ levelData, tier, onVerifySubmit, onBackToStages, onReplayNewQuestion }) {
  // Target shifts and masked indices (supporting multi-word levels in hard tier)
  const maskedIndices = [];
  levelData.masks.forEach((wordMask, segmentIdx) => {
    wordMask.forEach((m, charIdx) => {
      if (!m) {
        // Calculate global character index in levelData.plaintext
        const prefixWords = levelData.plaintext.split(' ').slice(0, segmentIdx);
        const spaceCount = segmentIdx;
        const prefixLen = prefixWords.reduce((sum, w) => sum + w.length, 0);
        const globalIdx = prefixLen + spaceCount + charIdx;
        maskedIndices.push(globalIdx);
      }
    });
  });

  // State
  const [sprintStep, setSprintStep] = useState('ready'); // 'ready' | 'running' | 'explanation' | 'gameover' | 'finished'
  const [currentMaskIndex, setCurrentMaskIndex] = useState(0); // index inside maskedIndices
  const [runnerLane, setRunnerLane] = useState(1); // 0 = Top, 1 = Middle, 2 = Bottom
  const [collectedKey, setCollectedKey] = useState(null); // collected plaintext character
  const [coins, setCoins] = useState([]);
  const [gateX, setGateX] = useState(140);
  const [isCrashing, setIsCrashing] = useState(false);
  const [crashMessage, setCrashMessage] = useState('');
  const [lives, setLives] = useState(5);
  
  // Refs and animations
  const collisionHandledRef = useRef(false);
  const prevLaneRef = useRef(1);
  const [laneChangeEffect, setLaneChangeEffect] = useState(null); // 'moving-up' | 'moving-down' | null

  // Parallax speed lines
  const [speedLines, setSpeedLines] = useState([]);

  // Stats for the final recap
  const [attempts, setAttempts] = useState([]);
  const [firstTryForCurrent, setFirstTryForCurrent] = useState(true);

  // FX States
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#facc15');
  const [feedbackY, setFeedbackY] = useState(50);
  const [trackShake, setTrackShake] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);

  // Animation Frame Ref
  const requestRef = useRef();

  const currentIdx = maskedIndices[currentMaskIndex] ?? 0;
  const currentBatonLetter = levelData.ciphertext[currentIdx] ?? '';
  const currentTargetChar = levelData.plaintext[currentIdx] ?? '';

  // Get active shift key for this character's word segment
  let segmentIdx = 0;
  const words = levelData.plaintext.split(' ');
  let accumulated = 0;
  for (let i = 0; i < words.length; i++) {
    if (currentIdx < accumulated + words[i].length + (i > 0 ? 1 : 0)) {
      segmentIdx = i;
      break;
    }
    accumulated += words[i].length + 1;
  }
  const currentShiftKey = levelData.targetShifts[segmentIdx % levelData.targetShifts.length];

  // Initialize speed lines
  useEffect(() => {
    const list = [];
    for (let i = 0; i < 22; i++) {
      list.push({
        id: i,
        x: Math.random() * 110 - 5,
        y: Math.random() * 100,
        speed: 0.8 + Math.random() * 1.6,
        width: 15 + Math.random() * 25
      });
    }
    setSpeedLines(list);
  }, []);

  // Generate Coins for the current letter
  const spawnCoinsAndGate = () => {
    collisionHandledRef.current = false;
    const tempIdx = maskedIndices[currentMaskIndex] ?? 0;
    const tempTargetChar = levelData.plaintext[tempIdx] ?? '';

    // Generate 3 choices: 1 correct target letter, 2 decoy letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const decoyOptions = alphabet.filter(ch => ch !== tempTargetChar);

    // Select 2 unique decoys
    const decoy1 = decoyOptions[Math.floor(Math.random() * decoyOptions.length)];
    const decoyOptions2 = decoyOptions.filter(ch => ch !== decoy1);
    const decoy2 = decoyOptions2[Math.floor(Math.random() * decoyOptions2.length)];

    // Place the correct letter in correctLane = currentMaskIndex % 3, and decoys in others
    const correctLane = currentMaskIndex % 3;
    const decoyLanes = [0, 1, 2].filter(l => l !== correctLane);

    const newCoins = [
      { id: 1, lane: correctLane, char: tempTargetChar, x: 85, eaten: false },
      { id: 2, lane: decoyLanes[0], char: decoy1, x: 85, eaten: false },
      { id: 3, lane: decoyLanes[1], char: decoy2, x: 85, eaten: false }
    ];
    setCoins(newCoins);
    setGateX(135);
    setCollectedKey(null);
    setIsCrashing(false);
  };

  // Start Sprint
  const handleStartSprint = () => {
    setSprintStep('running');
    setCurrentMaskIndex(0);
    setAttempts([]);
    setLives(5);
    setFirstTryForCurrent(true);
    spawnCoinsAndGate();
  };

  // Keyboard steer
  useEffect(() => {
    if (sprintStep !== 'running' || isCrashing) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setRunnerLane((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setRunnerLane((prev) => Math.min(2, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sprintStep, isCrashing]);

  // Handle lane change transition tilt effect
  useEffect(() => {
    if (runnerLane !== prevLaneRef.current) {
      const dir = runnerLane < prevLaneRef.current ? 'moving-up' : 'moving-down';
      setLaneChangeEffect(dir);
      prevLaneRef.current = runnerLane;
      
      const timer = setTimeout(() => {
        setLaneChangeEffect(null);
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [runnerLane]);

  // Main game tick (scrolling and collision)
  useEffect(() => {
    if (sprintStep !== 'running' || isCrashing) return;

    const updatePhysics = () => {
      const speed = isBoosting ? 1.5 : 0.22;

      // Update background speed lines
      setSpeedLines((prevLines) =>
        prevLines.map((line) => {
          const lineSpeed = isBoosting ? line.speed * 4 : line.speed;
          let nextX = line.x - lineSpeed * 0.4;
          if (nextX < -15) {
            nextX = 115;
          }
          return { ...line, x: nextX };
        })
      );

      setCoins((prevCoins) => {
        return prevCoins.map((coin) => {
          if (coin.eaten) return coin;
          const nextX = coin.x - speed;
          
          if (nextX <= 22 && nextX >= 10 && coin.lane === runnerLane) {
            setCollectedKey(coin.char);
            setIsSpinning(true);
            setTimeout(() => setIsSpinning(false), 500);

            const isCorrect = coin.char === currentTargetChar;

            setFeedbackText(`🪙 Letter ${coin.char} Collected!`);
            setFeedbackColor(isCorrect ? '#22c55e' : '#f87171');
            setFeedbackY(20 + coin.lane * 30 - 8);

            setTimeout(() => {
              setFeedbackText('');
            }, 900);

            return { ...coin, eaten: true, x: nextX };
          }
          return { ...coin, x: nextX };
        });
      });

      setGateX((prevGateX) => {
        const nextGateX = prevGateX - speed;

        if (nextGateX <= 18) {
          if (!collisionHandledRef.current) {
            collisionHandledRef.current = true;
            cancelAnimationFrame(requestRef.current);
            setTimeout(() => {
              handleGateCollision();
            }, 0);
          }
          return 18;
        }

        return nextGateX;
      });

      requestRef.current = requestAnimationFrame(updatePhysics);
    };

    requestRef.current = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(requestRef.current);
  }, [sprintStep, runnerLane, isCrashing, coins, gateX, collectedKey, isBoosting, currentTargetChar]);

  useEffect(() => {
    setSprintStep('ready');
    setCurrentMaskIndex(0);
    setAttempts([]);
    setLives(5);
    setFirstTryForCurrent(true);
    setCoins([]);
  }, [levelData]);

  const handleGateCollision = () => {
    const charUsed = collectedKey;
    const isCorrect = charUsed === currentTargetChar;

    setAttempts((prev) => [
      ...prev,
      {
        index: currentIdx,
        cipherChar: currentBatonLetter,
        keyCollected: charUsed || 'None',
        correct: isCorrect,
        firstTry: firstTryForCurrent
      }
    ]);

    if (isCorrect) {
      setIsBoosting(true);
      setFeedbackText('⚡ Checkpoint Cleared! BOOST!');
      setFeedbackColor('#22c55e');
      setFeedbackY(10);
      setTimeout(() => setFeedbackText(''), 1100);

      setTimeout(() => {
        setIsBoosting(false);
        if (currentMaskIndex + 1 < maskedIndices.length) {
          collisionHandledRef.current = false;
          setCurrentMaskIndex((prev) => prev + 1);
          setFirstTryForCurrent(true);
          
          const nextIndex = currentMaskIndex + 1;
          const tempIdx = maskedIndices[nextIndex] ?? 0;
          const tempTargetChar = levelData.plaintext[tempIdx] ?? '';

          const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
          const decoyOptions = alphabet.filter(ch => ch !== tempTargetChar);

          const decoy1 = decoyOptions[Math.floor(Math.random() * decoyOptions.length)];
          const decoyOptions2 = decoyOptions.filter(ch => ch !== decoy1);
          const decoy2 = decoyOptions2[Math.floor(Math.random() * decoyOptions2.length)];

          // Place the correct letter in nextCorrectLane = (currentMaskIndex + 1) % 3, and decoys in others
          const nextCorrectLane = (nextIndex) % 3;
          const nextDecoyLanes = [0, 1, 2].filter(l => l !== nextCorrectLane);

          const newCoins = [
            { id: 1, lane: nextCorrectLane, char: tempTargetChar, x: 85, eaten: false },
            { id: 2, lane: nextDecoyLanes[0], char: decoy1, x: 85, eaten: false },
            { id: 3, lane: nextDecoyLanes[1], char: decoy2, x: 85, eaten: false }
          ];
          setCoins(newCoins);
          setGateX(135);
          setCollectedKey(null);
          setIsCrashing(false);
        } else {
          setSprintStep('finished');
        }
      }, 1200);
    } else {
      setTrackShake(true);
      setTimeout(() => setTrackShake(false), 500);

      setIsCrashing(true);
      setFirstTryForCurrent(false);
      
      setLives((prevLives) => {
        const nextLives = prevLives - 1;
        if (nextLives <= 0) {
          setSprintStep('gameover');
        } else {
          const reason = charUsed 
            ? `Wrong Letter! Cipher '${currentBatonLetter}' with shift -${currentShiftKey} decrypts to '${currentTargetChar}'. You collected decoy letter '${charUsed}'.`
            : `Gate Shut! You didn't collect any letter coin to unlock the checkpoint gate. The correct decrypted letter was '${currentTargetChar}'.`;
          setCrashMessage(reason);
          setSprintStep('explanation');
        }
        return nextLives;
      });
    }
  };

  const handleContinueAfterCrash = () => {
    setIsCrashing(false);
    setSprintStep('running');
    spawnCoinsAndGate();
  };

  return (
    <div className="sprint-container">
      {/* HUD Header */}
      <header className="fg-header relative-header">
        <button className="fg-btn-back-nav" onClick={onBackToStages}>
          <span className="material-symbols-outlined">arrow_back</span>
          Exit to Stages
        </button>
        <div className="fg-header-title">
          Cipher Sprint — Stage {levelData.level} ({tier.toUpperCase()})
        </div>
      </header>

      {sprintStep === 'ready' ? (
        <div className="sprint-ready-card">
          <h2>🏃‍♂️ Cipher Sprint Relay</h2>
          <p className="sprint-ready-desc">
            Baton relay decryption challenge! Steer the runner into the lane carrying the correct plaintext letter to decrypt checkpoints.
          </p>
          <div className="sprint-ready-instruction">
            <strong>🎮 Controls:</strong> Use <strong>Arrow UP/DOWN</strong> or <strong>W/S</strong> keys to switch lanes. Collect the correct plaintext letter based on the Caesar Shift Key clue!
          </div>
          <button className="sprint-btn-primary" onClick={handleStartSprint}>
            🚀 Start Relay Run
          </button>
        </div>
      ) : (
        <div className="sprint-widescreen">
          <aside className="sprint-sidebar">
            {/* Stats Card */}
            <div className="sidebar-stats-card">
              <div className="stats-header">OPERATIVE HUD</div>
              <div className="stats-content">
                <div className="stat-row">
                  <span className="stat-label">LIVES:</span>
                  <span className="stat-value hearts-glow">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="material-symbols-outlined" style={{ color: i < lives ? '#ff007f' : 'rgba(255,255,255,0.15)', fontVariationSettings: "'FILL' 1", fontSize: '1.1rem', marginRight: '2px' }}>
                        favorite
                      </span>
                    ))}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">CAESAR CLUE:</span>
                  <span className="stat-value clue-glow" style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>
                    Plain = Cipher - {currentShiftKey}
                  </span>
                </div>
              </div>
            </div>

            {/* Success / Alert / Objectives card */}
            <div className="sidebar-action-hud">
              {sprintStep === 'finished' ? (
                <div className="fg-success-panel">
                  <h3>✅ SECURED!</h3>
                  <p>All checkpoints cleared successfully.</p>
                  <button className="fg-btn fg-btn-primary" onClick={onVerifySubmit} style={{ width: '100%', background: 'var(--neon-green)', color: '#030914', marginTop: '10px' }}>
                    🚀 Verify & Submit
                  </button>
                  <button className="fg-btn fg-btn-secondary" onClick={onReplayNewQuestion} style={{ width: '100%', marginTop: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                    🔄 Play Again
                  </button>
                </div>
              ) : sprintStep === 'gameover' ? (
                <div className="fg-alert-panel" style={{ borderColor: 'var(--neon-red)', background: 'rgba(255, 0, 127, 0.08)' }}>
                  <strong style={{ color: 'var(--neon-red)' }}>💀 SYSTEM FAILURE!</strong>
                  <p style={{ fontSize: '0.74rem', lineHeight: '1.4', color: '#fda4af', margin: '8px 0' }}>
                    Runner crashed too many times and ran out of lives.
                  </p>
                  <button className="fg-btn" onClick={handleStartSprint} style={{ width: '100%', background: 'var(--neon-red)', color: '#fff', border: 'none', marginTop: '10px' }}>
                    🔄 Try Again
                  </button>
                </div>
              ) : sprintStep === 'explanation' ? (
                <div className="fg-alert-panel" style={{ borderColor: 'var(--neon-red)', background: 'rgba(255, 0, 127, 0.05)' }}>
                  <strong style={{ color: 'var(--neon-red)' }}>💥 CRASH! Gate Stayed Shut</strong>
                  <p style={{ fontSize: '0.72rem', lineHeight: '1.45', color: '#cbd5e1', marginTop: '6px' }}>
                    {crashMessage}
                  </p>
                  <button className="fg-btn fg-btn-secondary" onClick={handleContinueAfterCrash} style={{ width: '100%', marginTop: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                    🔄 Try Checkpoint Again
                  </button>
                </div>
              ) : (
                <div className="fg-alert-panel default-alert">
                  <strong>📝 Objectives:</strong>
                  <div style={{ fontSize: '0.72rem', lineHeight: '1.45', color: '#cbd5e1' }}>
                    • Read the active Caesar Shift Key clue: <code>Plain = Cipher - {currentShiftKey}</code>.<br />
                    • Calculate the correct plaintext letter for <code>{currentBatonLetter}</code>.<br />
                    • Steer the runner into the lane matching that correct letter.<br />
                    • Avoid decoy letters to prevent crashing into the checkpoint gate!
                  </div>
                </div>
              )}
            </div>
          </aside>

          <main className="sprint-main">
            {/* Baton display */}
            <div className="sprint-baton-hud" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <div className="baton-tag">APPROACHING GATE:</div>
              <div className="baton-letter" style={{ background: 'var(--neon-cyan)', color: '#030914', boxShadow: '0 0 15px rgba(0, 229, 255, 0.4)' }}>
                {sprintStep === 'finished' ? '🏁' : currentBatonLetter}
              </div>
              <div className="baton-desc">
                {sprintStep === 'finished'
                  ? 'Relay run completed! Verify decryption in the sidebar.'
                  : `Decrypt '${currentBatonLetter}' using Shift -${currentShiftKey}!`
                }
              </div>
            </div>

            {/* Running Track container */}
            <div className={`sprint-track-container ${trackShake ? 'shake-track' : ''}`} style={{ background: 'rgba(10, 18, 40, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {/* Speed Lines */}
              {speedLines.map((line) => (
                <div
                  key={line.id}
                  className="sprint-speed-line"
                  style={{
                    left: `${line.x}%`,
                    top: `${line.y}%`,
                    width: `${line.width}px`
                  }}
                />
              ))}

              {/* Lanes */}
              <div className={`sprint-lane lane-0 ${runnerLane === 0 ? 'highlighted' : ''}`} onClick={() => { if (sprintStep === 'running') setRunnerLane(0); }}>
                <span className="lane-number-badge">Top</span>
              </div>
              <div className={`sprint-lane lane-1 ${runnerLane === 1 ? 'highlighted' : ''}`} onClick={() => { if (sprintStep === 'running') setRunnerLane(1); }}>
                <span className="lane-number-badge">Middle</span>
              </div>
              <div className={`sprint-lane lane-2 ${runnerLane === 2 ? 'highlighted' : ''}`} onClick={() => { if (sprintStep === 'running') setRunnerLane(2); }}>
                <span className="lane-number-badge">Bottom</span>
              </div>

              {/* Runner */}
              <div
                className={`sprint-runner-sprite ${isCrashing ? 'crash' : ''} ${isSpinning ? 'spin-effect' : ''} ${isBoosting ? 'boost-trail' : ''} ${laneChangeEffect || ''}`}
                style={{
                  top: `${20 + runnerLane * 30}%`
                }}
              >
                <span className="sprint-runner-char">🏃‍♂️</span>
                <div className="runner-baton-glow" style={{ background: 'var(--neon-cyan)', color: '#000' }}>
                  {sprintStep === 'finished' ? '✓' : currentBatonLetter}
                </div>
              </div>

              {/* Coins (Letters) */}
              {sprintStep === 'running' && coins.map((coin) => (
                !coin.eaten && (
                  <div
                    key={coin.id}
                    className="sprint-coin-sprite"
                    style={{
                      left: `${coin.x}%`,
                      top: `${20 + coin.lane * 30}%`
                    }}
                  >
                    🪙
                    <span className="coin-value" style={{ border: '1px solid var(--neon-cyan)', background: '#0b1228' }}>{coin.char}</span>
                  </div>
                )
              ))}

              {/* Checkpoint Gate */}
              <div
                className={`sprint-checkpoint-gate ${isBoosting || sprintStep === 'finished' ? 'gate-cleared' : ''}`}
                style={{
                  left: `${sprintStep === 'finished' ? 15 : gateX}%`
                }}
              >
                <div className="gate-beam"></div>
                <div className="gate-pillar left"></div>
                <div className="gate-pillar right"></div>
                <div className="gate-badge">CHECKPOINT</div>
              </div>

              {/* Floating XP / Feedback overlay */}
              {feedbackText && (
                <div
                  className="sprint-floating-feedback"
                  style={{
                    top: `${feedbackY}%`,
                    color: feedbackColor
                  }}
                >
                  {feedbackText}
                </div>
              )}
            </div>

            {/* Word Decryption Progress */}
            <div className="sprint-word-progress-card" style={{ marginTop: '20px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px 20px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Word Decryption Progress:</h3>
              <div className="sprint-letters-row">
                {levelData.plaintext.split('').map((char, idx) => {
                  const isMasked = !levelData.masks[0][idx];
                  const isSolved = isMasked && (maskedIndices.indexOf(idx) < currentMaskIndex || sprintStep === 'finished');
                  const displayChar = !isMasked ? char : (isSolved ? char : '_');
                  const cipherChar = levelData.ciphertext[idx];

                  return (
                    <div key={idx} className={`sprint-letter-box ${isSolved ? 'solved' : ''} ${isMasked && idx === currentIdx && sprintStep === 'running' ? 'active' : ''}`}>
                      <span className="sprint-box-cipher">{cipherChar}</span>
                      <span className="sprint-box-plain">{displayChar}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
