import React, { useState, useEffect, useRef } from 'react';
import '../sprint/CipherSprint.css';
import '../../CipherGame.css';

const decryptChar = (char, shift) => {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 - shift + 26) % 26 + 26) % 26 + 65);
  }
  return char;
};

export default function PlayfairSprint({ levelData, tier, onVerifySubmit, onBackToStages, onReplayNewQuestion }) {
  const hintIndices = new Set();
  if (tier === 'easy' || tier === 'medium') {
    const numHints = tier === 'easy' ? 2 : 14;
    let hintsFound = 0;
    for (let i = 0; i < levelData.plaintext.length; i++) {
      if (levelData.plaintext[i] !== ' ' && levelData.masks && levelData.masks[0][i]) {
        hintIndices.add(i);
        hintsFound++;
        if (hintsFound >= numHints) break;
      }
    }
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

  const maskedIndices = [];
  for (let i = 0; i < levelData.plaintext.length; i++) {
    if (levelData.plaintext[i] !== ' ' && !hintIndices.has(i)) {
      maskedIndices.push(i);
    }
  }

  const [sprintStep, setSprintStep] = useState('ready');
  const [currentMaskIndex, setCurrentMaskIndex] = useState(0);
  const [runnerLane, setRunnerLane] = useState(1);
  const [collectedKey, setCollectedKey] = useState(null);
  const [coins, setCoins] = useState([]);
  const [gateX, setGateX] = useState(140);
  const [isCrashing, setIsCrashing] = useState(false);
  const [crashMessage, setCrashMessage] = useState('');
  const [lives, setLives] = useState(5);

  const collisionHandledRef = useRef(false);
  const prevLaneRef = useRef(1);
  const [laneChangeEffect, setLaneChangeEffect] = useState(null);

  const [speedLines, setSpeedLines] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [firstTryForCurrent, setFirstTryForCurrent] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationStep, setExplanationStep] = useState(-1);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#facc15');
  const [feedbackY, setFeedbackY] = useState(50);
  const [trackShake, setTrackShake] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const requestRef = useRef();

  const currentIdx = maskedIndices[currentMaskIndex] ?? 0;
  const currentBatonLetter = levelData.ciphertext[currentIdx] ?? '';
  const currentTargetChar = levelData.plaintext[currentIdx] ?? '';

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

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

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

  const spawnCoinsAndGate = () => {
    collisionHandledRef.current = false;
    const tempIdx = maskedIndices[currentMaskIndex] ?? 0;
    const tempTargetChar = levelData.plaintext[tempIdx] ?? '';
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const decoyOptions = alphabet.filter(ch => ch !== tempTargetChar);
    const decoy1 = decoyOptions[Math.floor(Math.random() * decoyOptions.length)];
    const decoyOptions2 = decoyOptions.filter(ch => ch !== decoy1);
    const decoy2 = decoyOptions2[Math.floor(Math.random() * decoyOptions2.length)];
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

  const handleStartSprint = () => {
    setSprintStep('running');
    setCurrentMaskIndex(0);
    setAttempts([]);
    setLives(5);
    setFirstTryForCurrent(true);
    setIsPaused(false);
    setIsMenuOpen(false);
    spawnCoinsAndGate();
  };

  const handleRetryFromCheckpoint = () => {
    setSprintStep('running');
    setLives(5);
    setFirstTryForCurrent(true);
    setIsCrashing(false);
    setIsPaused(false);
    setIsMenuOpen(false);
    spawnCoinsAndGate();
  };

  useEffect(() => {
    if (sprintStep !== 'running' || isCrashing || isMenuOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      }

      if (isPaused) return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setRunnerLane((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setRunnerLane((prev) => Math.min(2, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sprintStep, isCrashing, isPaused, isMenuOpen]);

  useEffect(() => {
    if (runnerLane !== prevLaneRef.current) {
      const dir = runnerLane < prevLaneRef.current ? 'moving-up' : 'moving-down';
      setLaneChangeEffect(dir);
      prevLaneRef.current = runnerLane;
      const timer = setTimeout(() => setLaneChangeEffect(null), 180);
      return () => clearTimeout(timer);
    }
  }, [runnerLane]);

  useEffect(() => {
    if (sprintStep !== 'running' || isCrashing || isPaused || isMenuOpen) return;

    const updatePhysics = () => {
      const speed = isBoosting ? 1.5 : 0.22;

      setSpeedLines((prevLines) =>
        prevLines.map((line) => {
          const lineSpeed = isBoosting ? line.speed * 4 : line.speed;
          let nextX = line.x - lineSpeed * 0.4;
          if (nextX < -15) nextX = 115;
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
            setTimeout(() => setFeedbackText(''), 900);
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
            setTimeout(() => handleGateCollision(), 0);
          }
          return 18;
        }
        return nextGateX;
      });

      requestRef.current = requestAnimationFrame(updatePhysics);
    };

    requestRef.current = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(requestRef.current);
  }, [sprintStep, runnerLane, isCrashing, isPaused, isMenuOpen, coins, gateX, collectedKey, isBoosting, currentTargetChar]);

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
          const nextCorrectLane = nextIndex % 3;
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
            <h2 className="fg-recap-title">🔬 Playfair Cipher Recap</h2>
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
              💡 <strong>Playfair Cipher Recap:</strong> The Playfair cipher uses a 5x5 matrix!
              <div style={{ marginTop: 16, background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700, color: 'var(--neon-cyan)', marginBottom: 8, fontSize: '0.82rem' }}>
                  🔑 Playfair 5x5 Key Matrix
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <table style={{ borderCollapse: 'collapse', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem' }}>
                    <tbody>
                      {levelData.matrix.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td key={`${rIdx}-${cIdx}`} style={{
                              width: '40px',
                              height: '40px',
                              border: '1px solid rgba(0, 229, 255, 0.3)',
                              background: 'rgba(0, 0, 0, 0.3)',
                              color: '#fff',
                              fontWeight: 'bold'
                            }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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

      <header className="fg-header relative-header">
        {sprintStep === 'ready' ? (
          <button className="fg-btn-back-nav" onClick={onBackToStages}>
            <span className="material-symbols-outlined">arrow_back</span>
            Exit to Stages
          </button>
        ) : (
          <button className="fg-btn-back-nav" onClick={() => setIsMenuOpen(true)}>
            <span className="material-symbols-outlined">menu</span>
            Menu
          </button>
        )}
        <div className="fg-header-title">
          Playfair Sprint — Stage {levelData.level} ({tier.toUpperCase()})
        </div>
      </header>

      {sprintStep === 'ready' ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', width: '100%' }}>
          <div className="vg-ready-card" style={{ maxWidth: 540 }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏃♂️</div>
            <h2 style={{ color: 'var(--neon-cyan)', margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800 }}>Playfair Sprint Relay</h2>
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
              Use <strong>Arrow UP/DOWN</strong> or <strong>W/S</strong> keys to switch lanes. Collect the correct plaintext letter!
            </p>
            <button className="vg-start-btn" onClick={handleStartSprint}>🚀 Start Relay Run</button>
          </div>
        </div>
      ) : (
        <div className="sprint-widescreen">
          <aside className="sprint-sidebar">
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
                  <span className="stat-label">PLAYFAIR CLUE:</span>
                  <span className="stat-value clue-glow" style={{ fontSize: '0.9rem', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>
                    Plain = Cipher - {currentShiftKey}
                  </span>
                </div>
              </div>
            </div>

            {/* Playfair 5x5 Table */}
            <div className="sidebar-stats-card" style={{ padding: '12px' }}>
              <div className="stats-header" style={{ fontSize: '0.8rem', marginBottom: '8px' }}>🗂️ PLAYFAIR MATRIX</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <table style={{ borderCollapse: 'collapse', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', width: '100%' }}>
                  <tbody>
                    {levelData.matrix.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={`${rIdx}-${cIdx}`} style={{
                            width: '36px',
                            height: '36px',
                            border: '1px solid rgba(0, 229, 255, 0.3)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: '#fff',
                            fontWeight: 'bold'
                          }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="sidebar-stats-card" style={{ padding: '12px', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => setIsPaused(p => !p)}
                style={{
                  background: isPaused ? 'var(--neon-green)' : 'rgba(255,255,255,0.08)',
                  color: isPaused ? '#000' : '#fff',
                  border: isPaused ? 'none' : '1px solid rgba(255,255,255,0.15)',
                  padding: '10px 16px',
                  borderRadius: '24px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  width: '100%',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {isPaused ? '▶ Resume (Space)' : '⏸ Pause (Space)'}
              </button>
            </div>

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
                <div className="fg-alert-panel" style={{ borderColor: 'var(--neon-red)', background: 'rgba(255, 0, 127, 0.08)', textAlign: 'center' }}>
                  <strong style={{ color: 'var(--neon-red)', fontSize: '1rem' }}>💀 SYSTEM FAILURE!</strong>
                  <p style={{ fontSize: '0.88rem', lineHeight: '1.5', color: '#fda4af', margin: '12px 0' }}>
                    Runner crashed too many times and ran out of lives.
                  </p>
                  <button className="fg-btn" onClick={handleRetryFromCheckpoint} style={{ width: '100%', background: 'var(--neon-red)', color: '#fff', border: 'none', marginTop: 'auto', fontSize: '0.9rem', padding: '12px' }}>
                    🔄 Try Again
                  </button>
                </div>
              ) : sprintStep === 'explanation' ? (
                <div className="fg-alert-panel" style={{ borderColor: 'var(--neon-red)', background: 'rgba(255, 0, 127, 0.05)', textAlign: 'center' }}>
                  <strong style={{ color: 'var(--neon-red)', fontSize: '1rem' }}>💥 CRASH! GATE STAYED SHUT</strong>
                  <p style={{ fontSize: '0.88rem', lineHeight: '1.5', color: '#cbd5e1', marginTop: '12px', marginBottom: '12px' }}>
                    {crashMessage}
                  </p>
                  <button className="fg-btn fg-btn-secondary" onClick={handleContinueAfterCrash} style={{ width: '100%', marginTop: '10%', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', padding: '12px' }}>
                    🔄 Try Checkpoint Again
                  </button>
                </div>
              ) : (
                <div className="sidebar-stats-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, overflowY: 'auto', textAlign: 'center', justifyContent: 'center' }}>
                  <div className="stats-header" style={{ color: 'var(--neon-cyan)', fontSize: '0.9rem' }}>📝 OBJECTIVES & GUIDE</div>
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#cbd5e1' }}>
                    • Solve the cipher letter to find the matching lane.<br />
                    • Avoid decoy letters to prevent crashing!
                  </div>
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(0, 229, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                      Current Letter Decryption
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px 14px', borderRadius: '8px', minWidth: '55px' }}>
                        <span style={{ fontSize: '1.4rem', color: '#fff', fontFamily: 'monospace' }}>{currentBatonLetter}</span>
                        <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '4px' }}>CIPHER</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--neon-cyan)' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Shift -{currentShiftKey}</span>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.4rem', margin: '4px 0' }}>arrow_forward</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.3)', padding: '8px 14px', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,229,255,0.1) inset', minWidth: '55px' }}>
                        <span style={{ fontSize: '1.4rem', color: 'var(--neon-green)', fontFamily: 'monospace', fontWeight: 'bold' }}>?</span>
                        <span style={{ fontSize: '0.55rem', color: 'var(--neon-cyan)', marginTop: '4px' }}>PLAIN</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>

          <main className="sprint-main">
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

            <div className={`sprint-track-container ${trackShake ? 'shake-track' : ''}`} style={{ background: 'rgba(10, 18, 40, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
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

              <div className={`sprint-lane lane-0 ${runnerLane === 0 ? 'highlighted' : ''}`} onClick={() => { if (sprintStep === 'running') setRunnerLane(0); }}>
                <span className="lane-number-badge">Top</span>
              </div>
              <div className={`sprint-lane lane-1 ${runnerLane === 1 ? 'highlighted' : ''}`} onClick={() => { if (sprintStep === 'running') setRunnerLane(1); }}>
                <span className="lane-number-badge">Middle</span>
              </div>
              <div className={`sprint-lane lane-2 ${runnerLane === 2 ? 'highlighted' : ''}`} onClick={() => { if (sprintStep === 'running') setRunnerLane(2); }}>
                <span className="lane-number-badge">Bottom</span>
              </div>

              <div
                className={`sprint-runner-sprite ${isCrashing ? 'crash' : ''} ${isSpinning ? 'spin-effect' : ''} ${isBoosting ? 'boost-trail' : ''} ${laneChangeEffect || ''}`}
                style={{
                  top: `${20 + runnerLane * 30}%`
                }}
              >
                <span className="sprint-runner-char">🏃</span>
                <div className="runner-baton-glow" style={{ background: 'var(--neon-cyan)', color: '#000' }}>
                  {sprintStep === 'finished' ? '✓' : currentBatonLetter}
                </div>
              </div>

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

      {isMenuOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #020617)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minWidth: '320px',
            boxShadow: '0 0 30px rgba(0,0,0,0.8)'
          }}>
            <h2 style={{ color: 'var(--neon-cyan)', margin: 0, textAlign: 'center', fontSize: '1.6rem', marginBottom: '8px', letterSpacing: '2px' }}>PAUSED</h2>
            <button className="fg-btn fg-btn-primary" onClick={() => setIsMenuOpen(false)} style={{ padding: '14px', fontSize: '1.1rem', background: 'var(--neon-green)', color: '#000', fontWeight: 'bold' }}>
              ▶ Resume
            </button>
            <button className="fg-btn fg-btn-secondary" onClick={() => { setIsMenuOpen(false); setSprintStep('ready'); }} style={{ padding: '14px', fontSize: '1.1rem', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
              📖 Tutorial
            </button>
            <button className="fg-btn" onClick={onBackToStages} style={{ padding: '14px', fontSize: '1.1rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', marginTop: '8px' }}>
              🚪 Exit Stage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
