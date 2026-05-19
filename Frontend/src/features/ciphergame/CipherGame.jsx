import React, { useState, useEffect, useRef } from 'react';
import { fishingApi, userApi } from '../../shared/api/cipherQuestApi';
import CategorySelector from './categories/CategorySelector';
import DifficultySelector from './difficulties/DifficultySelector';
import StageRoadmap from './stages/StageRoadmap';
import StageCompletedRecap from './stages/StageCompletedRecap';
import PacmanGame from './pacman/PacmanGame';
import './CipherGame.css';

/* ─── Handcrafted levels for Caesar Cipher Mastery ─────────────────── */
const HANDCRAFTED_LEVELS = {
  easy: [
    {
      level: 1,
      plaintext: "HELLO",
      ciphertext: "KHOOR",
      targetShifts: [3],
      masks: [[false, true, true, true, false]], // Reveal H and O (H # # # O)
      hint: "A friendly greeting used worldwide",
      startShifts: [1],
      clue: "A standard greeting"
    },
    {
      level: 2,
      plaintext: "WATER",
      ciphertext: "CGZKX",
      targetShifts: [6],
      masks: [[false, true, false, true, false]], // Reveal W, T, R (W # T # R)
      hint: "Essential liquid for all living things",
      startShifts: [2],
      clue: "Essential for life"
    },
    {
      level: 3,
      plaintext: "SHARK",
      ciphertext: "WLEVO",
      targetShifts: [4],
      masks: [[false, true, false, true, false]], // Reveal S, A, K (S # A # K)
      hint: "A fearsome ocean predator with sharp teeth",
      startShifts: [1],
      clue: "Ocean predator"
    },
    {
      level: 4,
      plaintext: "CIPHER",
      ciphertext: "EKRJGT",
      targetShifts: [2],
      masks: [[false, true, false, true, true, false]], // Reveal C, P, R (C # P # # R)
      hint: "A secret or disguised way of writing",
      startShifts: [0],
      clue: "Secret writing"
    },
    {
      level: 5,
      plaintext: "OCEAN",
      ciphertext: "SGIEB",
      targetShifts: [4],
      masks: [[false, true, true, false, false]], // Reveal O, A, N (O # # A N)
      hint: "A very large expanse of sea",
      startShifts: [1],
      clue: "Large expanse of salt water"
    }
  ],
  medium: [
    {
      level: 1,
      plaintext: "SALMON",
      ciphertext: "VDOPRQ",
      targetShifts: [3],
      masks: [[false, true, true, true, false, false]], // Masked ciphertext: V # # # R Q
      hint: "Pink-fleshed fish that swims upstream to spawn",
      startShifts: [1],
      clue: "Swims upstream"
    },
    {
      level: 2,
      plaintext: "ANCHOR",
      ciphertext: "HUJVVY",
      targetShifts: [7],
      masks: [[false, true, true, true, false, false]], // Masked ciphertext: H # # # V Y
      hint: "Heavy metal object used to moor a ship",
      startShifts: [2],
      clue: "Moors a ship"
    },
    {
      level: 3,
      plaintext: "PIRATE",
      ciphertext: "XQZIBM",
      targetShifts: [8],
      masks: [[false, true, false, true, true, false]], // Masked ciphertext: X # # I # M
      hint: "A person who attacks and robs ships at sea",
      startShifts: [3],
      clue: "Ocean outlaw"
    },
    {
      level: 4,
      plaintext: "SECRET",
      ciphertext: "XJHWJY",
      targetShifts: [5],
      masks: [[false, true, true, false, true, false]], // Masked ciphertext: X # # W # Y
      hint: "Not meant to be known or seen by others",
      startShifts: [0],
      clue: "Kept hidden"
    },
    {
      level: 5,
      plaintext: "TREASURE",
      ciphertext: "YWJFXZWJ",
      targetShifts: [5],
      masks: [[false, true, false, true, false, true, false, false]], // Masked ciphertext: Y # J # X # W J
      hint: "A quantity of precious metals, gems, or other values",
      startShifts: [2],
      clue: "Sunken wealth"
    }
  ],
  hard: [
    {
      level: 1,
      plaintext: "OCEAN BLUE",
      ciphertext: "RFHDQ GQJI",
      targetShifts: [3, 5],
      masks: [
        [false, true, false, true, false], // OCEAN -> R # H # Q
        [false, true, false, false]        // BLUE  -> G # J I
      ],
      hint: "A deep water scene",
      startShifts: [0, 0],
      clue: "Deep water scene"
    },
    {
      level: 2,
      plaintext: "DEEP REEF",
      ciphertext: "IJJU UHHI",
      targetShifts: [5, 3],
      masks: [
        [false, true, false, false],       // DEEP -> I # J U
        [false, true, false, false]        // REEF -> U # H I
      ],
      hint: "Marine ecosystem full of life",
      startShifts: [0, 0],
      clue: "Marine ecosystem"
    },
    {
      level: 3,
      plaintext: "GOLD COIN",
      ciphertext: "MUTJ GSMR",
      targetShifts: [6, 4],
      masks: [
        [false, true, false, false],       // GOLD -> M # T J
        [false, true, false, false]        // COIN -> G # M R
      ],
      hint: "Sunken pirate treasure",
      startShifts: [0, 0],
      clue: "Pirate currency"
    },
    {
      level: 4,
      plaintext: "FIND KEY",
      ciphertext: "JMRH MGA",
      targetShifts: [4, 2],
      masks: [
        [false, true, false, false],       // FIND -> J # R H
        [false, true, false]               // KEY  -> M # A
      ],
      hint: "Cryptographic objective",
      startShifts: [0, 0],
      clue: "Unlock the code"
    },
    {
      level: 5,
      plaintext: "CATCH MORE FISH",
      ciphertext: "ECVEJ QSVI LOYN",
      targetShifts: [2, 4, 6],
      masks: [
        [false, true, false, true, false], // CATCH -> E # V # J
        [false, true, false, false],       // MORE  -> Q # V I
        [false, true, false, false]        // FISH  -> L # Y N
      ],
      hint: "The fisherman's ultimate motto",
      startShifts: [0, 0, 0],
      clue: "Angler's objective"
    }
  ]
};

/* ─── Caesar Decrypt helper ───────────────────────────────────────── */
const caesarDecryptChar = (char, shift) => {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 - shift + 26) % 26 + 26) % 26 + 65);
  }
  return char;
};

const caesarDecryptWord = (word, shift) => {
  return word.split('').map(ch => caesarDecryptChar(ch, shift)).join('');
};

const FISH_EMOJIS = ['🐟', '🐠', '🐡', '🦈', '🐙', '🦑', '🦐'];

export default function CipherGame() {
  const [offline, setOffline] = useState(false);
  const [profile, setProfile] = useState({ username: "Agent", xp: 0, level: 1 });
  const [session, setSession] = useState(null);
  const [completedLevels, setCompletedLevels] = useState({ easy: [], medium: [], hard: [] });

  /* Navigation Flow State: 'category' | 'difficulty' | 'stage' | 'game' */
  const [gameFlowStep, setGameFlowStep] = useState('category');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [tier, setTier] = useState('easy');
  const [levelIndex, setLevelIndex] = useState(0);

  /* Gameplay State */
  const [activeShifts, setActiveShifts] = useState([1]);
  const [targetSegmentIndex, setTargetSegmentIndex] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(10);
  const [levelSolved, setLevelSolved] = useState(false);
  const [basketShake, setBasketShake] = useState(false);
  const [recapStageData, setRecapStageData] = useState(null);

  /* Splash & Score feedback */
  const [floatingXp, setFloatingXp] = useState(null);
  const [splash, setSplash] = useState({ show: false, x: 0, y: 0 });

  /* Recap overlay during solution checking */
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationStep, setExplanationStep] = useState(-1);

  /* Swimming fish & physics */
  const [fishList, setFishList] = useState([]);
  const [bubbles, setBubbles] = useState([]);
  const [isCasting, setIsCasting] = useState(false);
  const [castProgress, setCastProgress] = useState(0);
  const [castTarget, setCastTarget] = useState({ x: 0, y: 0 });
  const [caughtFish, setCaughtFish] = useState(null);

  const animationRef = useRef(null);
  const levelData = HANDCRAFTED_LEVELS[tier][levelIndex] || HANDCRAFTED_LEVELS.easy[0];

  useEffect(() => {
    async function loadProfile() {
      let username = 'Agent';
      try {
        const p = await userApi.getMyProfile();
        setProfile(p);
        username = p.username;
      } catch (err) {
        setOffline(true);
        const saved = localStorage.getItem('cq_offline_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          setProfile(parsed);
          username = parsed.username;
        }
      }
      const progress = localStorage.getItem(`cq_completed_levels_${username}`);
      if (progress) {
        setCompletedLevels(JSON.parse(progress));
      } else {
        setCompletedLevels({ easy: [], medium: [], hard: [] });
      }
    }
    loadProfile();
  }, []);

  useEffect(() => {
    if (gameFlowStep !== 'game') return;

    setActiveShifts([...levelData.startShifts]);
    setTargetSegmentIndex(0);
    setAttemptsLeft(10);
    setLevelSolved(false);

    generatePondFish();
    generatePondBubbles();
    startBackendSession();
  }, [gameFlowStep, levelIndex, tier]);

  const startBackendSession = async () => {
    if (offline) return;
    try {
      const data = await fishingApi.startSession();
      setSession(data);
    } catch (e) {
      console.warn("Could not start backend session", e.message);
    }
  };

  const generatePondFish = () => {
    const list = [];
    const values = [+1, -1, +2, -2, +3, -3, +5, -5];
    for (let i = 0; i < 5; i++) {
      list.push({
        id: i,
        value: values[Math.floor(Math.random() * values.length)],
        x: 10 + Math.random() * 80,
        y: 60 + Math.random() * 140,
        speed: 0.3 + Math.random() * 0.4,
        direction: Math.random() > 0.5 ? 1 : -1,
        emoji: FISH_EMOJIS[Math.floor(Math.random() * FISH_EMOJIS.length)],
        color: i % 2 === 0 ? 'var(--neon-cyan)' : 'var(--neon-green)'
      });
    }
    setFishList(list);
  };

  const generatePondBubbles = () => {
    const list = [];
    for (let i = 0; i < 15; i++) {
      list.push({
        id: i,
        x: Math.random() * 100,
        size: 3 + Math.random() * 8,
        delay: Math.random() * 6,
        duration: 5 + Math.random() * 5
      });
    }
    setBubbles(list);
  };

  useEffect(() => {
    if (gameFlowStep !== 'game') return;

    const updatePhysics = () => {
      setFishList((prev) =>
        prev.map((f) => {
          let nextX = f.x + f.speed * f.direction * 0.08;
          let nextDir = f.direction;
          let nextVal = f.value;

          if (nextX > 92) {
            nextX = 92;
            nextDir = -1;
            nextVal = [+1, -1, +2, -2, +3, -3, +5, -5][Math.floor(Math.random() * 8)];
          } else if (nextX < 8) {
            nextX = 8;
            nextDir = 1;
            nextVal = [+1, -1, +2, -2, +3, -3, +5, -5][Math.floor(Math.random() * 8)];
          }

          return { ...f, x: nextX, direction: nextDir, value: nextVal };
        })
      );
      animationRef.current = requestAnimationFrame(updatePhysics);
    };

    animationRef.current = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameFlowStep]);

  const applyShiftDelta = (curr, delta) => {
    let val = curr + delta;
    while (val < 0) val += 26;
    while (val > 25) val -= 26;
    return val;
  };

  const castLineToFish = (fish) => {
    if (isCasting || levelSolved) return;
    setIsCasting(true);
    setCaughtFish(fish);

    const targetX = (fish.x / 100) * 500;
    const targetY = fish.y;
    setCastTarget({ x: targetX, y: targetY });

    let startTime = null;
    const animateCastOut = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / 350, 1);
      setCastProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animateCastOut);
      } else {
        setSplash({ show: true, x: fish.x, y: fish.y });
        setTimeout(() => setSplash({ show: false, x: 0, y: 0 }), 500);

        setFishList((prev) => prev.filter((f) => f.id !== fish.id));

        setTimeout(() => {
          let reelStartTime = null;
          const animateReelIn = (reelTimestamp) => {
            if (!reelStartTime) reelStartTime = reelTimestamp;
            const reelProgress = Math.min((reelTimestamp - reelStartTime) / 450, 1);
            setCastProgress(1 - reelProgress);

            if (reelProgress < 1) {
              requestAnimationFrame(animateReelIn);
            } else {
              setIsCasting(false);
              setCaughtFish(null);

              setActiveShifts((prev) => {
                const next = [...prev];
                next[targetSegmentIndex] = applyShiftDelta(next[targetSegmentIndex], fish.value);
                return next;
              });

              setBasketShake(true);
              setTimeout(() => setBasketShake(false), 400);
              setAttemptsLeft((prev) => Math.max(0, prev - 1));

              setTimeout(() => {
                setFishList((prev) => [
                  ...prev,
                  {
                    id: Date.now(),
                    value: [+1, -1, +2, -2, +3, -3, +5, -5][Math.floor(Math.random() * 8)],
                    x: Math.random() > 0.5 ? 90 : 10,
                    y: 60 + Math.random() * 140,
                    speed: 0.3 + Math.random() * 0.4,
                    direction: Math.random() > 0.5 ? 1 : -1,
                    emoji: FISH_EMOJIS[Math.floor(Math.random() * FISH_EMOJIS.length)],
                    color: Math.random() > 0.5 ? 'var(--neon-pink)' : 'var(--neon-yellow)'
                  }
                ]);
              }, 600);
            }
          };
          requestAnimationFrame(animateReelIn);
        }, 50);
      }
    };
    requestAnimationFrame(animateCastOut);
  };

  const words = levelData.plaintext.split(' ');
  const ciphersegments = levelData.ciphertext.split(' ');

  const decryptedSegments = ciphersegments.map((seg, idx) => {
    const shift = activeShifts[idx] ?? 0;
    return caesarDecryptWord(seg, shift);
  });

  const allSegmentsCorrect = decryptedSegments.every((dec, idx) => dec === words[idx]);

  useEffect(() => {
    if (allSegmentsCorrect && !levelSolved) {
      setLevelSolved(true);
    } else if (!allSegmentsCorrect && levelSolved) {
      setLevelSolved(false);
    }
  }, [activeShifts, allSegmentsCorrect]);

  const getRuleViolationInfo = () => {
    const targetWord = words[targetSegmentIndex];
    const targetCipher = ciphersegments[targetSegmentIndex];
    const playerDecrypted = decryptedSegments[targetSegmentIndex];
    const playerShift = activeShifts[targetSegmentIndex] ?? 0;
    const targetShift = levelData.targetShifts[targetSegmentIndex];

    if (playerDecrypted === targetWord) return null;

    for (let i = 0; i < targetWord.length; i++) {
      if (playerDecrypted[i] !== targetWord[i]) {
        const cipherCh = targetCipher[i];
        const playerPlainCh = playerDecrypted[i];
        const correctPlainCh = targetWord[i];

        return {
          index: i,
          cipherCh,
          playerPlainCh,
          correctPlainCh,
          playerShift,
          correctShift: targetShift,
          rule: `Shift +${playerShift} turns '${cipherCh}' into '${playerPlainCh}', which violates the Caesar Cipher rule. The correct shift +${targetShift} is needed to decrypt '${cipherCh}' into '${correctPlainCh}' (since '${cipherCh}' is letter #${cipherCh.charCodeAt(0) - 64} and '${correctPlainCh}' is letter #${correctPlainCh.charCodeAt(0) - 64}).`
        };
      }
    }
    return null;
  };

  const ruleViolation = getRuleViolationInfo();

  const handleVerifySubmit = async (bypassCheck = false) => {
    if (!levelSolved && !bypassCheck) return;
    if (bypassCheck) setLevelSolved(true);

    setShowExplanation(true);
    setExplanationStep(-1);

    const fullTextLength = levelData.plaintext.replace(/\s+/g, '').length;
    let currentStep = -1;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < fullTextLength) {
        setExplanationStep(currentStep);
      } else {
        clearInterval(interval);
      }
    }, 600);

    const xpReward = 100;
    setFloatingXp({ amount: xpReward, x: 80, y: 80 });
    setTimeout(() => setFloatingXp(null), 1200);

    const updated = {
      ...profile,
      xp: profile.xp + xpReward,
      level: Math.floor((profile.xp + xpReward) / 1000) + 1
    };
    setProfile(updated);
    if (offline) localStorage.setItem('cq_offline_profile', JSON.stringify(updated));

    const nextCompleted = { ...completedLevels };
    if (!nextCompleted[tier].includes(levelIndex)) {
      nextCompleted[tier].push(levelIndex);
      setCompletedLevels(nextCompleted);
      localStorage.setItem(`cq_completed_levels_${profile.username || 'Agent'}`, JSON.stringify(nextCompleted));
    }

    if (session && !offline) {
      try {
        for (let i = 0; i < words.length; i++) {
          await fishingApi.submitAnswer(session.sessionId, words[i]);
        }
      } catch (err) {
        console.warn("Could not sync with backend", err.message);
      }
    }
  };

  const handleCloseExplanation = () => {
    setShowExplanation(false);
    setGameFlowStep('stage');
  };

  const stagesData = [
    { id: 1, playable: true, completed: completedLevels[tier].includes(0), secretKey: 3 },
    { id: 2, playable: completedLevels[tier].includes(0), completed: completedLevels[tier].includes(1), secretKey: 6 },
    { id: 3, playable: completedLevels[tier].includes(1), completed: completedLevels[tier].includes(2), secretKey: 4 },
    { id: 4, playable: completedLevels[tier].includes(2), completed: completedLevels[tier].includes(3), secretKey: 2 },
    { id: 5, playable: completedLevels[tier].includes(3), completed: completedLevels[tier].includes(4), secretKey: 4 }
  ];

  /* SVG Calculations */
  const rodBaseX = 250;
  const rodBaseY = 260;
  let rodTipX = 220;
  let rodTipY = 190;
  let hookX = rodTipX;
  let hookY = rodTipY;

  if (isCasting && castTarget) {
    const dx = castTarget.x - rodBaseX;
    const dy = castTarget.y - rodBaseY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const rodLen = 50;
    if (len > 0) {
      rodTipX = rodBaseX + (dx / len) * rodLen;
      rodTipY = rodBaseY + (dy / len) * rodLen;
    }
    if (castProgress <= 1 && caughtFish) {
      hookX = rodTipX + (castTarget.x - rodTipX) * castProgress;
      hookY = rodTipY + (castTarget.y - rodTipY) * castProgress;
    }
  }

  return (
    <div className="fg-root">
      {gameFlowStep === 'category' && (
        <CategorySelector
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setGameFlowStep('difficulty');
          }}
        />
      )}

      {gameFlowStep === 'difficulty' && (
        <DifficultySelector
          onSelectDifficulty={(diff) => {
            setTier(diff);
            setGameFlowStep('stage');
          }}
          onBack={() => setGameFlowStep('category')}
        />
      )}

      {gameFlowStep === 'stage' && (
        <StageRoadmap
          stages={stagesData}
          activeDifficulty={tier}
          onSelectStage={(id) => {
            setLevelIndex(id - 1);
            setGameFlowStep('game');
          }}
          onOpenRecap={(stageObj) => {
            setRecapStageData(stageObj);
          }}
          onBack={() => setGameFlowStep('difficulty')}
        />
      )}

      {/* Recap Modal Archive */}
      {recapStageData && (
        <StageCompletedRecap
          stage={recapStageData}
          onClose={() => setRecapStageData(null)}
        />
      )}

      {/* Interactive Active Game */}
      {gameFlowStep === 'game' && (
        tier === 'easy' && levelIndex === 1 ? (
          <PacmanGame
            levelData={levelData}
            tier={tier}
            onVerifySubmit={() => handleVerifySubmit(true)}
            onBackToStages={() => setGameFlowStep('stage')}
          />
        ) : (
          <>
            <header className="fg-header">
              <button className="fg-btn-back-nav" onClick={() => setGameFlowStep('stage')}>
                <span className="material-symbols-outlined">arrow_back</span>
                Exit to Stages
              </button>
              <div className="fg-header-category">Caesar Cipher</div>
              <div className="fg-header-stage" style={{ flex: 1, textAlign: 'center' }}>
                {tier.toUpperCase()} Mode — Stage {levelIndex + 1}
              </div>
              <div className={`fg-header-attempts ${attemptsLeft <= 3 ? 'low-attempts' : ''}`}>
                Attempts: {attemptsLeft}
              </div>
            </header>

            <div className="fg-game-layout">
              {/* Sidebar */}
              <aside className="fg-sidebar">
                {/* Basket Card */}
                <div className={`fg-basket-card ${levelSolved ? 'active-target' : ''} ${basketShake ? 'shake' : ''}`}>
                  <div className="fg-basket-container">🧺</div>
                  <div className="fg-basket-shift-value">
                    +{activeShifts[targetSegmentIndex] ?? 0}
                  </div>
                  <span className="fg-basket-label">Basket Shift (Segment #{targetSegmentIndex + 1})</span>

                  {floatingXp && (
                    <div className="fg-xp-pop-indicator" style={{ left: `${floatingXp.x}%`, top: `${floatingXp.y}%` }}>
                      +{floatingXp.amount} XP
                    </div>
                  )}
                </div>

                {/* Guide Card */}
                <div className="fg-cipher-ref">
                  <p className="fg-ref-title">Target Shift: Segment #{targetSegmentIndex + 1}</p>
                  <p className="fg-ref-hint">
                    <span>Active Shift:</span>
                    <span className="fg-key">+{activeShifts[targetSegmentIndex] ?? 0}</span>
                  </p>
                  <p className="fg-ref-hint">
                    <span>A →</span>
                    <span>{caesarDecryptChar('A', -(activeShifts[targetSegmentIndex] ?? 0))}</span>
                  </p>
                  <p className="fg-ref-hint">
                    <span>B →</span>
                    <span>{caesarDecryptChar('B', -(activeShifts[targetSegmentIndex] ?? 0))}</span>
                  </p>
                  <p className="fg-ref-hint">
                    <span>Z →</span>
                    <span>{caesarDecryptChar('Z', -(activeShifts[targetSegmentIndex] ?? 0))}</span>
                  </p>
                  <p className="fg-ref-formula">
                    Formula:<br />
                    Plain[i] = (Cipher[i] - BasketShift) mod 26
                  </p>
                </div>

                {/* Status Alert Card */}
                <div className="fg-sidebar-alerts">
                  {levelSolved ? (
                    <div className="fg-success-panel">
                      <h3>✅ SECURED!</h3>
                      <p>All segments decrypted successfully.</p>
                      <button className="fg-btn fg-btn-primary" onClick={handleVerifySubmit} style={{ width: '100%', background: 'var(--neon-green)', color: '#030914', marginTop: '10px' }}>
                        🚀 Verify & Submit
                      </button>
                    </div>
                  ) : ruleViolation ? (
                    <div className="fg-alert-panel">
                      <strong>⚠️ Rule Violation:</strong>
                      <p style={{ marginTop: '6px', fontSize: '0.82rem', lineHeight: '1.4' }}>{ruleViolation.rule}</p>
                    </div>
                  ) : (
                    <div className="fg-alert-panel default-alert">
                      <strong>🎣 Status Action:</strong>
                      <p style={{ marginTop: '6px', fontSize: '0.82rem', lineHeight: '1.4' }}>Select a cipher word, then catch a swimming fish with correct shift modifier!</p>
                    </div>
                  )}
                </div>
              </aside>

              {/* Central Game Board */}
              <main className="fg-main">
                <section className="fg-word-panel">
                  <div className="fg-word-segments-row">
                    {words.map((word, wordIdx) => {
                      const isTargeted = targetSegmentIndex === wordIdx;
                      const segmentShift = activeShifts[wordIdx] ?? 0;
                      const cipherWord = ciphersegments[wordIdx];
                      const decryptedWord = decryptedSegments[wordIdx];
                      const expectedWord = words[wordIdx];

                      return (
                        <div
                          key={wordIdx}
                          className={`fg-word-segment-card ${isTargeted ? 'targeted' : ''}`}
                          onClick={() => { if (!isCasting) setTargetSegmentIndex(wordIdx); }}
                        >
                          <div className="fg-letter-cells">
                            {cipherWord.split('').map((cipherCh, chIdx) => {
                              const maskRevealList = levelData.masks[wordIdx];
                              const shouldRevealCipher = tier === 'easy' ? true : maskRevealList[chIdx];

                              let letterToDisplay = decryptedWord[chIdx];
                              let cellClass = "fg-letter-cell";

                              if (tier === 'easy') {
                                const isPrefilledPlaintext = maskRevealList[chIdx];
                                if (isPrefilledPlaintext) {
                                  letterToDisplay = expectedWord[chIdx];
                                  cellClass += " correct-plain";
                                } else {
                                  const isCorrect = letterToDisplay === expectedWord[chIdx];
                                  cellClass += isCorrect ? " correct-plain" : " incorrect-plain";
                                }
                              } else {
                                const isCorrect = letterToDisplay === expectedWord[chIdx];
                                cellClass += isCorrect ? " correct-plain" : " incorrect-plain";
                              }

                              return (
                                <div key={chIdx} className={cellClass}>
                                  <span className="fg-cell-ciphertext">
                                    {shouldRevealCipher ? cipherCh : '#'}
                                  </span>
                                  <span className="fg-cell-plaintext">{letterToDisplay}</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="fg-segment-basket-badge">
                            Basket Shift: +{segmentShift}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="fg-clue-banner">
                    💡 Hint: <strong>"{levelData.hint}"</strong>
                  </div>
                </section>

                {/* Pond */}
                <section className="fg-pond-wrapper">
                  <div className="fg-pond-container">
                    <div className="fg-wave" />

                    {/* Bubbles */}
                    {bubbles.map((b) => (
                      <div
                        key={b.id}
                        className="fg-bubble"
                        style={{
                          left: `${b.x}%`,
                          width: `${b.size}px`,
                          height: `${b.size}px`,
                          animationDelay: `${b.delay}s`,
                          animationDuration: `${b.duration}s`
                        }}
                      />
                    ))}

                    {/* Swimming Fish */}
                    {fishList.map((f) => (
                      <div
                        key={f.id}
                        className="fg-fish-entity"
                        style={{
                          left: `${f.x}%`,
                          top: `${f.y}px`,
                          transform: `scaleX(${f.direction})`
                        }}
                        onClick={() => castLineToFish(f)}
                      >
                        <span className="fg-fish-sprite" style={{ color: f.color }}>
                          {f.emoji}
                        </span>
                        <div className={`fg-fish-badge ${f.value > 0 ? 'positive' : 'negative'}`} style={{ transform: `scaleX(${f.direction})` }}>
                          {f.value > 0 ? `+${f.value}` : f.value}
                        </div>
                      </div>
                    ))}

                    {/* Caught Fish being reeled in */}
                    {isCasting && caughtFish && castProgress < 1 && (
                      <div
                        className="fg-fish-entity"
                        style={{
                          left: `${(hookX / 500) * 100}%`,
                          top: `${hookY - 20}px`,
                          transform: 'scale(1.2)'
                        }}
                      >
                        <span className="fg-fish-sprite" style={{ color: caughtFish.color }}>
                          {caughtFish.emoji}
                        </span>
                      </div>
                    )}

                    {/* Rod Line SVG */}
                    <svg className="fg-pond-svg" viewBox="0 0 500 260">
                      <line x1={rodBaseX} y1={rodBaseY} x2={rodTipX} y2={rodTipY} className="fg-fishing-rod-line" />
                      {isCasting && (
                        <line x1={rodTipX} y1={rodTipY} x2={hookX} y2={hookY} className="fg-fishing-line" />
                      )}
                    </svg>

                    {/* Splash */}
                    {splash.show && (
                      <div className="fg-splash-effect" style={{ left: `${splash.x}%`, top: `${splash.y}px` }}>
                        💦
                      </div>
                    )}
                  </div>
                </section>
              </main>
            </div>
          </>
        )
      )}

            {/* Recap "Why did this work?" explanation overlay */}
            {showExplanation && (
              <div className="fg-recap-overlay">
                <div className="fg-recap-card">
                  <h2 className="fg-recap-title">🔬 Cryptographic Recap</h2>
                  <p className="fg-recap-subtitle">Why Did This Work?</p>

                  <div className="fg-recap-animation-box">
                    <div className="fg-recap-letter-row">
                      {levelData.plaintext.replace(/\s+/g, '').split('').map((plainCh, idx) => {
                        const cipherCh = levelData.ciphertext.replace(/\s+/g, '')[idx];

                        let wordCharIdx = idx;
                        let wordIndex = 0;
                        let accum = 0;
                        const wordSegmentsList = levelData.plaintext.split(' ');
                        for (let i = 0; i < wordSegmentsList.length; i++) {
                          if (wordCharIdx < accum + wordSegmentsList[i].length) {
                            wordIndex = i;
                            wordCharIdx = wordCharIdx - accum;
                            break;
                          }
                          accum += wordSegmentsList[i].length;
                        }

                        const segmentShift = levelData.targetShifts[wordIndex];
                        const isActive = explanationStep >= idx;
                        const isWaiting = explanationStep < idx;

                        return (
                          <div key={idx} className={`fg-recap-node ${isActive ? 'active' : ''} ${isWaiting ? 'waiting' : ''}`}>
                            <span className="fg-recap-char-cipher">{cipherCh}</span>
                            <span className="fg-recap-math">-{segmentShift}</span>
                            <span className="fg-recap-arrow">↓</span>
                            <span className="fg-recap-char-plain">{plainCh}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="fg-recap-explanation">
                    💡 <strong>Caesar Cipher Decryption Mechanics:</strong> <br />
                    A Caesar Cipher is a uniform substitution cipher. Each letter in the ciphertext was shifted forward in the alphabet by a fixed shift value.
                    By catching fish carrying operators, you configured the decryption basket shift value to exactly match the key.
                    Applying the subtraction shift (<code>Plain = Cipher - Key</code>) maps <strong>all letters</strong> uniformly back to their correct plaintext representation.
                  </div>

                  <div className="fg-recap-actions">
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
          </div>
      );
}
