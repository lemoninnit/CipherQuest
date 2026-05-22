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
  // Target shifts and masked indices
  const targetShift = levelData.targetShifts[0]; // 4 for SHARK
  const maskedIndices = [];
  levelData.masks[0].forEach((m, idx) => {
    if (!m) maskedIndices.push(idx);
  });

  // State
  const [sprintStep, setSprintStep] = useState('ready'); // 'ready' | 'running' | 'explanation' | 'finished'
  const [currentMaskIndex, setCurrentMaskIndex] = useState(0); // index inside maskedIndices
  const [runnerLane, setRunnerLane] = useState(1); // 0 = Top, 1 = Middle, 2 = Bottom
  const [collectedKey, setCollectedKey] = useState(null);
  const [coins, setCoins] = useState([]);
  const [gateX, setGateX] = useState(140);
  const [isCrashing, setIsCrashing] = useState(false);
  const [crashMessage, setCrashMessage] = useState('');
  
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
    // Generate 3 keys: 1 correct targetShift, 2 decoy shifts
    const shiftsPool = [targetShift];
    while (shiftsPool.length < 3) {
      const randShift = Math.floor(Math.random() * 9) + 1;
      if (!shiftsPool.includes(randShift)) {
        shiftsPool.push(randShift);
      }
    }
    // Shuffle the shifts
    shiftsPool.sort(() => Math.random() - 0.5);

    const newCoins = [
      { id: 1, lane: 0, value: shiftsPool[0], x: 85, eaten: false },
      { id: 2, lane: 1, value: shiftsPool[1], x: 85, eaten: false },
      { id: 3, lane: 2, value: shiftsPool[2], x: 85, eaten: false }
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

  // Main game tick (scrolling and collision)
  useEffect(() => {
    if (sprintStep !== 'running' || isCrashing) return;

    const updatePhysics = () => {
      // Much slower, comfortable speed for user reading/reacting
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
          
          // Check collision with runner (runner is at x = 15)
          if (nextX <= 22 && nextX >= 10 && coin.lane === runnerLane) {
            setCollectedKey(coin.value);
            
            // Sparkle feedback
            setIsSpinning(true);
            setTimeout(() => setIsSpinning(false), 500);

            setFeedbackText(`🪙 Key +${coin.value} Collected!`);
            setFeedbackColor(coin.value === targetShift ? '#22c55e' : '#f87171');
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

        // Check gate collision at x = 15
        if (nextGateX <= 18) {
          // Gate reached!
          cancelAnimationFrame(requestRef.current);
          setTimeout(() => {
            handleGateCollision();
          }, 0);
          return 18;
        }

        return nextGateX;
      });

      requestRef.current = requestAnimationFrame(updatePhysics);
    };

    requestRef.current = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(requestRef.current);
  }, [sprintStep, runnerLane, isCrashing, coins, gateX, collectedKey, isBoosting]);

  useEffect(() => {
    setSprintStep('ready');
    setCurrentMaskIndex(0);
    setAttempts([]);
    setFirstTryForCurrent(true);
    setCoins([]);
  }, [levelData]);

  const handleGateCollision = () => {
    const keyUsed = collectedKey ?? 0;
    const isCorrect = keyUsed === targetShift;

    // Log attempt
    setAttempts((prev) => [
      ...prev,
      {
        index: currentIdx,
        cipherChar: currentBatonLetter,
        keyCollected: keyUsed,
        correct: isCorrect,
        firstTry: firstTryForCurrent
      }
    ]);

    if (isCorrect) {
      // Correct! Trigger screen flash and boost streak forward
      setIsBoosting(true);
      
      setFeedbackText('⚡ Checkpoint Cleared! BOOST!');
      setFeedbackColor('#22c55e');
      setFeedbackY(10);
      setTimeout(() => setFeedbackText(''), 1100);

      setTimeout(() => {
        setIsBoosting(false);
        if (currentMaskIndex + 1 < maskedIndices.length) {
          setCurrentMaskIndex((prev) => prev + 1);
          setFirstTryForCurrent(true);
          spawnCoinsAndGate();
        } else {
          setSprintStep('finished');
        }
      }, 1200);
    } else {
      // Crash! Trigger screen shake
      setTrackShake(true);
      setTimeout(() => setTrackShake(false), 500);

      setIsCrashing(true);
      setFirstTryForCurrent(false);
      
      const decodedChar = decryptChar(currentBatonLetter, keyUsed);
      setCrashMessage(
        `Wrong Key! Shift +${keyUsed} decrypted '${currentBatonLetter}' into '${decodedChar}', which violates Caesar Cipher logic.`
      );
      setSprintStep('explanation');
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
      <header className="sprint-header">
        <button className="sprint-btn-back" onClick={onBackToStages}>
          <span className="material-symbols-outlined">arrow_back</span>
          Exit to Stages
        </button>
        <div className="sprint-header-title">
          Cipher Sprint — Stage {levelData.level} ({tier.toUpperCase()})
        </div>
      </header>

      {sprintStep === 'ready' && (
        <div className="sprint-ready-card">
          <h2>🏃‍♂️ Cipher Sprint Relay</h2>
          <p className="sprint-ready-desc">
            Help our runner sprint across the checkpoints! Reason out the correct key code from the baton's encrypted letter, guide the runner to collect the matching key coin, and sprint cleanly through the checkpoint gates!
          </p>
          <div className="sprint-ready-instruction">
            <strong>🎮 Controls:</strong> Use <strong>Arrow UP/DOWN</strong> or <strong>W/S</strong> keys to switch lanes, or click/tap lanes directly.
          </div>
          <button className="sprint-btn-primary" onClick={handleStartSprint}>
            🚀 Start Relay Run
          </button>
        </div>
      )}

      {(sprintStep === 'running' || sprintStep === 'explanation') && (
        <div className="sprint-gameplay-area">
          {/* Baton display */}
          <div className="sprint-baton-hud">
            <div className="baton-tag">BATON LETTER:</div>
            <div className="baton-letter">{currentBatonLetter}</div>
            <div className="baton-desc">Decrypt using the correct Caesar shift coin!</div>
          </div>

          {/* Running Track container */}
          <div className={`sprint-track-container ${trackShake ? 'shake-track' : ''}`}>
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
            <div className={`sprint-lane lane-0 ${runnerLane === 0 ? 'highlighted' : ''}`} onClick={() => setRunnerLane(0)}>
              <span className="lane-number-badge">Top</span>
            </div>
            <div className={`sprint-lane lane-1 ${runnerLane === 1 ? 'highlighted' : ''}`} onClick={() => setRunnerLane(1)}>
              <span className="lane-number-badge">Middle</span>
            </div>
            <div className={`sprint-lane lane-2 ${runnerLane === 2 ? 'highlighted' : ''}`} onClick={() => setRunnerLane(2)}>
              <span className="lane-number-badge">Bottom</span>
            </div>

            {/* Runner */}
            <div
              className={`sprint-runner-sprite ${isCrashing ? 'crash' : ''} ${isSpinning ? 'spin-effect' : ''} ${isBoosting ? 'boost-trail' : ''}`}
              style={{
                top: `${20 + runnerLane * 30}%`
              }}
            >
              🏃‍♂️
              <div className="runner-baton-glow">{currentBatonLetter}</div>
              {collectedKey !== null && (
                <div className="runner-coin-carried">🪙 +{collectedKey}</div>
              )}
            </div>

            {/* Coins */}
            {coins.map((coin) => (
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
                  <span className="coin-value">+{coin.value}</span>
                </div>
              )
            ))}

            {/* Checkpoint Gate */}
            <div
              className={`sprint-checkpoint-gate ${isBoosting ? 'gate-cleared' : ''}`}
              style={{
                left: `${gateX}%`
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

          {/* Sidebar instructions */}
          <div className="sprint-side-hud">
            <div className="sprint-word-progress">
              <h3>Word Decryption Progress:</h3>
              <div className="sprint-letters-row">
                {levelData.plaintext.split('').map((char, idx) => {
                  const isMasked = !levelData.masks[0][idx];
                  const isSolved = isMasked && (maskedIndices.indexOf(idx) < currentMaskIndex);
                  const displayChar = !isMasked ? char : (isSolved ? char : '_');
                  const cipherChar = levelData.ciphertext[idx];

                  return (
                    <div key={idx} className={`sprint-letter-box ${isSolved ? 'solved' : ''} ${isMasked && idx === currentIdx ? 'active' : ''}`}>
                      <span className="sprint-box-cipher">{cipherChar}</span>
                      <span className="sprint-box-plain">{displayChar}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {sprintStep === 'explanation' && (
        <div className="sprint-explanation-overlay">
          <div className="sprint-explanation-card">
            <span className="sprint-crash-icon">💥</span>
            <h3>CRASH! Gate Stayed Shut</h3>
            <p className="sprint-explanation-text">{crashMessage}</p>
            <button className="sprint-btn-primary" onClick={handleContinueAfterCrash}>
              🔄 Try Checkpoint Again
            </button>
          </div>
        </div>
      )}

      {sprintStep === 'finished' && (
        <div className="sprint-finished-card">
          <h2>🏁 FINISH LINE CLEARED!</h2>
          <p className="sprint-finished-desc">
            The crowd cheers! You successfully decrypted all message letters!
          </p>

          <div className="sprint-finish-banner">
            <div className="sprint-letters-row justify-center">
              {levelData.plaintext.split('').map((char, idx) => (
                <div key={idx} className="sprint-letter-box solved">
                  <span className="sprint-box-cipher">{levelData.ciphertext[idx]}</span>
                  <span className="sprint-box-plain">{char}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sprint-recap-table-container">
            <h3>🔬 Relay Run Recap</h3>
            <table className="sprint-recap-table">
              <thead>
                <tr>
                  <th>Checkpoint</th>
                  <th>Cipher Letter</th>
                  <th>Plaintext Target</th>
                  <th>Key Coin Used</th>
                  <th>Result</th>
                  <th>First Attempt?</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((att, idx) => {
                  const targetPlain = levelData.plaintext[att.index];
                  return (
                    <tr key={idx} className={att.correct ? 'row-correct' : 'row-incorrect'}>
                      <td>#{idx + 1}</td>
                      <td>{att.cipherChar}</td>
                      <td>{targetPlain}</td>
                      <td>+{att.keyCollected}</td>
                      <td>{att.correct ? '✅ Clean Pass' : '❌ Crashed'}</td>
                      <td>{att.firstTry ? '⭐️ Yes' : 'No'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="sprint-action-row">
            <button className="sprint-btn-primary" onClick={onVerifySubmit}>
              🚀 Verify & Submit
            </button>
            <button className="sprint-btn-secondary" onClick={onReplayNewQuestion || handleStartSprint}>
              🔄 Run Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
