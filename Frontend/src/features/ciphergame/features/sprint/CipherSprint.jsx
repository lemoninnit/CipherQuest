import React, { useState, useEffect, useRef } from 'react';
import './CipherSprint.css';
import '../../CipherGame.css';

const decryptChar = (char, shift) => {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 - shift + 26) % 26 + 26) % 26 + 65);
  }
  return char;
};

export default function CipherSprint({ levelData, tier, onVerifySubmit, onBackToStages, onReplayNewQuestion }) {
  // Calculate hints for EASY and MEDIUM tiers
  const hintIndices = new Set();
  if (tier === 'easy' || tier === 'medium') {
    const numHints = tier === 'easy' ? 2 : 14; // 2 hints for easy, 4 hints for medium (since it's a long sentence)
    let hintsFound = 0;
    for (let i = 0; i < levelData.plaintext.length; i++) {
      if (levelData.plaintext[i] !== ' ' && levelData.masks && levelData.masks[0][i]) {
        hintIndices.add(i);
        hintsFound++;
        if (hintsFound >= numHints) break;
      }
    }
    // Fallback if masks didn't provide enough
    if (hintsFound < numHints) {
      for (let i = 0; i < levelData.plaintext.length; i++) {
        if (levelData.plaintext[i] !== ' ' && !hintIndices.has(i)) {
          hintIndices.add(i);
          hintsFound++;
          if (hintsFound >= numHints) break;
        }
      }
    }
  }

  // Force characters to be masked (required to solve), except hints in easy tier
  const maskedIndices = [];
  for (let i = 0; i < levelData.plaintext.length; i++) {
    if (levelData.plaintext[i] !== ' ' && !hintIndices.has(i)) {
      maskedIndices.push(i);
    }
  }

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
  const [isPaused, setIsPaused] = useState(false);

  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationStep, setExplanationStep] = useState(-1);

  const handleVerifySubmit = () => {
    setShowExplanation(true);
    setExplanationStep(-1);
    const total = levelData.plaintext.replace(/\s+/g, '').length;
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
    setIsPaused(false);
    spawnCoinsAndGate();
  };

  // Retry from Checkpoint (Game Over)
  const handleRetryFromCheckpoint = () => {
    setSprintStep('running');
    setLives(5); // Refill lives
    setFirstTryForCurrent(true);
    setIsCrashing(false);
    setIsPaused(false);
    spawnCoinsAndGate(); // Spawns coins for the CURRENT currentMaskIndex
  };

  // Keyboard steer
  useEffect(() => {
    if (sprintStep !== 'running' || isCrashing) return;

    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      }

      if (isPaused) return; // Prevent steering while paused

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setRunnerLane((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setRunnerLane((prev) => Math.min(2, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sprintStep, isCrashing, isPaused]);

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
    if (sprintStep !== 'running' || isCrashing || isPaused) return;

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
  }, [sprintStep, runnerLane, isCrashing, isPaused, coins, gateX, collectedKey, isBoosting, currentTargetChar]);

  useEffect(() => {
    setSprintStep('ready');
    setCurrentMaskIndex(0);
    setAttempts([]);
    setLives(5);
    setFirstTryForCurrent(true);
    setCoins([]);
    setShowExplanation(false);
    setExplanationStep(-1);
    setIsPaused(false);
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
            ? `Wrong Letter! You collected decoy letter '${charUsed}'. Try again to decrypt cipher '${currentBatonLetter}'!`
            : `Gate Shut! You didn't collect any letter coin to unlock the checkpoint gate. Try again to decrypt cipher '${currentBatonLetter}'!`;
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
    <div className="sprint-container fg-root">
      {showExplanation && (
        <div className="fg-recap-overlay" style={{ overflowY: 'auto', padding: '30px 10px', zIndex: 9999 }}>
          <div className="fg-recap-card" style={{ maxWidth: '1100px', width: '95%', padding: '24px 32px' }}>
            <h2 className="fg-recap-title">🔬 Cryptographic Recap</h2>
            <p className="fg-recap-subtitle">Why Did This Work?</p>
            <div className="fg-recap-animation-box" style={{ minHeight: 'auto', padding: '16px', marginBottom: '16px' }}>
              <div className="fg-recap-letter-row">
                {levelData.plaintext.replace(/\s+/g, '').split('').map((plainCh, idx) => {
                  const cipherCh = levelData.ciphertext.replace(/\s+/g, '')[idx];
                  let wi = 0, acc = 0;
                  for (let i = 0; i < words.length; i++) {
                    if (idx < acc + words[i].length) { wi = i; break; }
                    acc += words[i].length;
                  }
                  const seg = levelData.targetShifts[wi];
                  return (
                    <div key={idx} className={`fg-recap-node ${explanationStep >= idx ? 'active' : 'waiting'}`}>
                      <span className="fg-recap-char-cipher">{cipherCh}</span>
                      <span className="fg-recap-math">-{seg}</span>
                      <span className="fg-recap-arrow">↓</span>
                      <span className="fg-recap-char-plain">{plainCh}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="fg-recap-explanation" style={{ background: 'rgba(255,255,255,0.015)' }}>
              💡 <strong>Caesar Cipher Decryption:</strong> Each ciphertext letter is shifted backward by the key value.
              By steer-racing the runner into correct lanes, you matched the secret Caesar shift.{' '}
              <code>Plain = (Cipher − Key) mod 26</code> maps every letter back uniformly.
              {levelData.targetShifts && levelData.targetShifts.map((shiftVal, sIdx) => {
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
              })}
            </div>
            <div className="fg-recap-actions" style={{ marginTop: 16 }}>
              <button
                className="fg-btn fg-btn-primary"
                onClick={handleCloseExplanation}
                disabled={explanationStep < levelData.plaintext.replace(/\s+/g, '').length - 1}
                style={{ background: 'var(--neon-green)', color: '#030914' }}
              >
                Unlock Next Objective ➔
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', width: '100%' }}>
          <div className="vg-ready-card" style={{ maxWidth: 540 }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏃♂️</div>
            <h2 style={{ color: 'var(--neon-cyan)', margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800 }}>Cipher Sprint Relay</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
              Baton relay decryption challenge! Steer the runner into the lane carrying the correct plaintext letter to decrypt checkpoints.
            </p>

            <div style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ciphertext</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--neon-cyan)' }}>{levelData.ciphertext}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Hint</span>
                <span style={{ color: '#a0c4d8', fontStyle: 'italic' }}>{levelData.hint}</span>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '20px', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--neon-green)' }}>How it works:</strong>{' '}
              Use <strong>Arrow UP/DOWN</strong> or <strong>W/S</strong> keys to switch lanes. Collect the correct plaintext letter based on the Caesar Shift Key clue to clear the checkpoint gate. Decoy letters will cause a crash!
            </p>
            <button className="vg-start-btn" onClick={handleStartSprint}>🚀 Start Relay Run</button>
          </div>
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
                {/* Pause Button */}
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => setIsPaused(p => !p)}
                    style={{
                      background: isPaused ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)',
                      color: isPaused ? '#000' : '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isPaused ? '▶ Resume (Space)' : '⏸ Pause & Think (Space)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Success / Alert / Objectives card */}
            <div className="sidebar-action-hud">
              {sprintStep === 'finished' ? (
                <div className="fg-success-panel">
                  <h3>✅ SECURED!</h3>
                  <p>All checkpoints cleared successfully.</p>
                  <button className="fg-btn fg-btn-primary" onClick={handleVerifySubmit} style={{ width: '100%', background: 'var(--neon-green)', color: '#030914', marginTop: '10px' }}>
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
                  <button className="fg-btn" onClick={handleRetryFromCheckpoint} style={{ width: '100%', background: 'var(--neon-red)', color: '#fff', border: 'none', marginTop: '10px' }}>
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
                <div className="fg-alert-panel default-alert" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <strong style={{ color: 'var(--neon-cyan)', marginBottom: '4px' }}>📝 OBJECTIVES & GUIDE:</strong>
                  <div style={{ fontSize: '0.72rem', lineHeight: '1.45', color: '#cbd5e1' }}>
                    • Solve the cipher letter to find the matching lane.<br />
                    • Avoid decoy letters to prevent crashing!
                  </div>
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(0, 229, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Current Letter Decryption
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '1.2rem', color: '#fff', fontFamily: 'monospace' }}>{currentBatonLetter}</span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>CIPHER</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--neon-cyan)' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Shift -{currentShiftKey}</span>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>arrow_forward</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.3)', padding: '6px 12px', borderRadius: '6px', boxShadow: '0 0 10px rgba(0,229,255,0.1) inset' }}>
                        <span style={{ fontSize: '1.2rem', color: 'var(--neon-green)', fontFamily: 'monospace', fontWeight: 'bold' }}>?</span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--neon-cyan)' }}>PLAIN</span>
                      </div>
                    </div>
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
                <span className="sprint-runner-char">🏃♂️</span>
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
                  const isMasked = char !== ' ' && !hintIndices.has(idx);
                  const isSolved = isMasked && (maskedIndices.indexOf(idx) < currentMaskIndex || sprintStep === 'finished');
                  const displayChar = !isMasked ? char : (isSolved ? char : '_');
                  const cipherChar = levelData.ciphertext[idx] !== ' ' ? levelData.ciphertext[idx] : ' ';

                  return (
                    <div key={idx} className={`sprint-letter-box ${isSolved ? 'solved' : ''} ${isMasked && idx === currentIdx && sprintStep === 'running' ? 'active' : ''}`} style={char === ' ' ? { visibility: 'hidden', width: '20px' } : {}}>
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