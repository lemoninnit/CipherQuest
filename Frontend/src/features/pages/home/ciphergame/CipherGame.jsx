/* src/features/pages/home/ciphergame/CipherGame.jsx */
import React, { useState, useEffect, useRef } from 'react';
import { fishingApi, userApi } from '../../../../api/cipherQuestApi';
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

/* ─── Caesar Decrypt helper (handles wrap-around accurately) ────────── */
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

/* ─── Emojis for fish variety ─────────────────────────────────────── */
const FISH_EMOJIS = ['🐟', '🐠', '🐡', '🦈', '🐙', '🦑', '🦐'];

export default function CipherGame() {
  /* Connection & Session State */
  const [offline, setOffline]         = useState(false);
  const [profile, setProfile]         = useState({ username: "Agent", xp: 0, level: 1 });
  const [session, setSession]         = useState(null); // Backend session for XP saving
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  /* Caesar Mastery Progression State */
  const [tier, setTier]               = useState('easy'); // easy | medium | hard
  const [levelIndex, setLevelIndex]   = useState(0); // 0 to 4 (5 levels)
  const [completedLevels, setCompletedLevels] = useState({ easy: [], medium: [], hard: [] });

  /* Level Play State */
  const [activeShifts, setActiveShifts] = useState([1]);
  const [targetSegmentIndex, setTargetSegmentIndex] = useState(0);
  const [score, setScore]             = useState(0);
  const [xpEarned, setXpEarned]       = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(10);
  const [levelSolved, setLevelSolved] = useState(false);
  const [basketShake, setBasketShake] = useState(false);

  /* Game Selection Flow State */
  const [gameFlowStep, setGameFlowStep] = useState('category'); // 'category' | 'difficulty' | 'stage' | 'game' | 'stage_completed'
  const [selectedCategory, setSelectedCategory] = useState(null); // 'caesar' | 'vigenere' | 'playfair'
  const [showLockedAlert, setShowLockedAlert] = useState(false);
  const [lockedAlertMessage, setLockedAlertMessage] = useState("");
  const [selectedRecapStage, setSelectedRecapStage] = useState(1);

  const isStage1Finished = completedLevels.easy.includes(0);

  const categories = [
    {
      id: 'caesar',
      title: 'Caesar',
      icon: '🏛️',
      description: 'Shift letters using mathematical modular arithmetic key offsets.',
      xp: '+10 XP/level'
    },
    {
      id: 'vigenere',
      title: 'Vigenere',
      icon: '🔑',
      description: 'Decipher polyalphabetic substitutions using key cycle offsets.',
      xp: '+15 XP/level'
    },
    {
      id: 'playfair',
      title: 'Playfair',
      icon: '🔲',
      description: 'Decrypt 2-character digraph block pairings using a 5x5 coordinate matrix grid.',
      xp: '+20 XP/level'
    }
  ];

  /* Swimming Fish State */
  const [fishList, setFishList]       = useState([]);
  const [bubbles, setBubbles]         = useState([]);

  /* Casting Animation State */
  const [isCasting, setIsCasting]     = useState(false);
  const [castProgress, setCastProgress] = useState(0); // 0 to 1
  const [castTarget, setCastTarget]   = useState({ x: 0, y: 0 });
  const [caughtFish, setCaughtFish]   = useState(null);
  const [splash, setSplash]           = useState({ show: false, x: 0, y: 0 });
  const [floatingXp, setFloatingXp]   = useState(null); // { amount, x, y }

  /* Recap Modal State */
  const [showRecap, setShowRecap]     = useState(false);
  const [recapStep, setRecapStep]     = useState(-1);

  const animationRef = useRef(null);

  /* ── Get current level data ─────────────────────────────────────── */
  const levelData = HANDCRAFTED_LEVELS[tier][levelIndex];

  /* ── Fetch Profile & Initialise Leaderboard ──────────────────────── */
  useEffect(() => {
    async function loadInitialData() {
      try {
        const myProfile = await userApi.getMyProfile();
        setProfile(myProfile);
      } catch (err) {
        console.warn("Backend offline. Running in local sandbox mode.", err.message);
        setOffline(true);
        // Load offline profile from local storage if available
        const savedProfile = localStorage.getItem('cq_offline_profile');
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile));
        }
      }

      // Load completed levels progress
      const savedProgress = localStorage.getItem('cq_completed_levels');
      if (savedProgress) {
        setCompletedLevels(JSON.parse(savedProgress));
      }
    }
    loadInitialData();
  }, []);

  /* ── Initialise Level State & Shifts ────────────────────────────── */
  useEffect(() => {
    if (!levelData) return;
    setActiveShifts([...levelData.startShifts]);
    setTargetSegmentIndex(0);
    setAttemptsLeft(10);
    setLevelSolved(false);
    setShowRecap(false);
    setRecapStep(-1);
    setScore(0);

    // Initialise 5 swimming fish
    generatePondFish();
    generatePondBubbles();

    // Start a backend session if connected
    startBackendSession();
  }, [tier, levelIndex]);

  /* ── Start Backend Session in background ─────────────────────────── */
  const startBackendSession = async () => {
    if (offline) return;
    try {
      const data = await fishingApi.startSession();
      setSession(data);
    } catch (e) {
      console.warn("Could not start backend session", e.message);
    }
  };

  /* ── Generate Swimming Fish ──────────────────────────────────────── */
  const generatePondFish = () => {
    const freshFish = [];
    const values = [+1, -1, +2, -2, +3, -3, +5, -5];
    for (let i = 0; i < 5; i++) {
      freshFish.push({
        id: i,
        value: values[Math.floor(Math.random() * values.length)],
        x: 10 + Math.random() * 80, // % width
        y: 60 + Math.random() * 140, // px height (water depth)
        speed: 0.3 + Math.random() * 0.4,
        direction: Math.random() > 0.5 ? 1 : -1,
        emoji: FISH_EMOJIS[Math.floor(Math.random() * FISH_EMOJIS.length)],
        color: i % 2 === 0 ? 'var(--neon-cyan)' : 'var(--neon-green)'
      });
    }
    setFishList(freshFish);
  };

  const generatePondBubbles = () => {
    const freshBubbles = [];
    for (let i = 0; i < 15; i++) {
      freshBubbles.push({
        id: i,
        x: Math.random() * 100,
        size: 3 + Math.random() * 8,
        delay: Math.random() * 6,
        duration: 5 + Math.random() * 5
      });
    }
    setBubbles(freshBubbles);
  };

  /* ── Swimming Fish Game Loop ─────────────────────────────────────── */
  useEffect(() => {
    let lastTime = performance.now();
    const updatePhysics = (time) => {
      setFishList((prevFish) =>
        prevFish.map((f) => {
          let nextX = f.x + f.speed * f.direction * 0.08;
          let nextDirection = f.direction;
          let nextValue = f.value;

          // Wrap or bounce off screen edges
          if (nextX > 92) {
            nextX = 92;
            nextDirection = -1;
            // Roll new value
            const values = [+1, -1, +2, -2, +3, -3, +5, -5];
            nextValue = values[Math.floor(Math.random() * values.length)];
          } else if (nextX < 8) {
            nextX = 8;
            nextDirection = 1;
            const values = [+1, -1, +2, -2, +3, -3, +5, -5];
            nextValue = values[Math.floor(Math.random() * values.length)];
          }

          return { ...f, x: nextX, direction: nextDirection, value: nextValue };
        })
      );
      animationRef.current = requestAnimationFrame(updatePhysics);
    };

    animationRef.current = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  /* ── Shift Delta application (wrapping 0 to 25) ──────────────────── */
  const applyShiftDelta = (curr, delta) => {
    let val = curr + delta;
    while (val < 0) val += 26;
    while (val > 25) val -= 26;
    return val;
  };

  /* ── Cast & Hook Animation ───────────────────────────────────────── */
  const castLineToFish = (fish) => {
    if (isCasting || levelSolved) return;
    setIsCasting(true);
    setCaughtFish(fish);

    // Calculate coordinate target in SVG viewBox (500 width x 260 height)
    // Convert fish % x coordinate to viewBox coordinate
    const targetX = (fish.x / 100) * 500;
    const targetY = fish.y;
    setCastTarget({ x: targetX, y: targetY });

    // 1. Cast Out (0 to 350ms)
    let startTime = null;
    const animateCastOut = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / 350, 1);
      setCastProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animateCastOut);
      } else {
        // Hooked! Trigger Splash
        setSplash({ show: true, x: fish.x, y: fish.y });
        setTimeout(() => setSplash({ show: false, x: 0, y: 0 }), 500);

        // Remove fish from swimming list temporarily
        setFishList((prev) => prev.filter((f) => f.id !== fish.id));

        // 2. Reel In (350ms to 850ms)
        setTimeout(() => {
          let reelStartTime = null;
          const animateReelIn = (reelTimestamp) => {
            if (!reelStartTime) reelStartTime = reelTimestamp;
            const reelProgress = Math.min((reelTimestamp - reelStartTime) / 450, 1);
            // Reverse progress from 1 to 0 for returning
            setCastProgress(1 - reelProgress);

            if (reelProgress < 1) {
              requestAnimationFrame(animateReelIn);
            } else {
              // Reeled to Basket! Update shift
              setIsCasting(false);
              setCaughtFish(null);

              // Update the targeted segment's shift
              setActiveShifts((prev) => {
                const next = [...prev];
                next[targetSegmentIndex] = applyShiftDelta(next[targetSegmentIndex], fish.value);
                return next;
              });

              // Basket Shake Animation
              setBasketShake(true);
              setTimeout(() => setBasketShake(false), 400);

              // Deduct attempt
              setAttemptsLeft((prev) => Math.max(0, prev - 1));

              // Spawn replacement fish at edge
              setTimeout(() => {
                setFishList((prev) => {
                  const values = [+1, -1, +2, -2, +3, -3, +5, -5];
                  return [
                    ...prev,
                    {
                      id: Date.now(),
                      value: values[Math.floor(Math.random() * values.length)],
                      x: Math.random() > 0.5 ? 90 : 10,
                      y: 60 + Math.random() * 140,
                      speed: 0.3 + Math.random() * 0.4,
                      direction: Math.random() > 0.5 ? 1 : -1,
                      emoji: FISH_EMOJIS[Math.floor(Math.random() * FISH_EMOJIS.length)],
                      color: Math.random() > 0.5 ? 'var(--neon-pink)' : 'var(--neon-yellow)'
                    }
                  ];
                });
              }, 600);
            }
          };
          requestAnimationFrame(animateReelIn);
        }, 50);
      }
    };
    requestAnimationFrame(animateCastOut);
  };

  /* ── Check solution & broken letters ─────────────────────────────── */
  const words = levelData.plaintext.split(' ');
  const ciphersegments = levelData.ciphertext.split(' ');

  // Evaluate each segment status
  const decryptedSegments = ciphersegments.map((seg, idx) => {
    const shift = activeShifts[idx] ?? 0;
    return caesarDecryptWord(seg, shift);
  });

  const allSegmentsCorrect = decryptedSegments.every((dec, idx) => dec === words[idx]);

  // Real-time verification
  useEffect(() => {
    if (allSegmentsCorrect && !levelSolved) {
      setLevelSolved(true);
    } else if (!allSegmentsCorrect && levelSolved) {
      setLevelSolved(false);
    }
  }, [activeShifts, allSegmentsCorrect]);

  /* ── Find the first broken character rule for highlights ─────────── */
  const getRuleViolationInfo = () => {
    const targetWord = words[targetSegmentIndex];
    const targetCipher = ciphersegments[targetSegmentIndex];
    const playerDecrypted = decryptedSegments[targetSegmentIndex];
    const playerShift = activeShifts[targetSegmentIndex] ?? 0;
    const targetShift = levelData.targetShifts[targetSegmentIndex];

    if (playerDecrypted === targetWord) return null;

    // Find first mismatch index
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

  /* ── Verify & Submit Answer ──────────────────────────────────────── */
  const handleVerifySubmit = async () => {
    if (!levelSolved) return;

    // Trigger recap modal first
    setShowRecap(true);
    setRecapStep(-1);

    // Letter-by-letter step animation in recap
    const fullTextLength = levelData.plaintext.replace(/\s+/g, '').length;
    let currentStep = -1;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < fullTextLength) {
        setRecapStep(currentStep);
      } else {
        clearInterval(interval);
      }
    }, 600);

    // Award local XP and save progress
    const xpReward = 100 + (levelIndex + 1) * 30 + (tier === 'medium' ? 50 : tier === 'hard' ? 100 : 0);
    setXpEarned((prev) => prev + xpReward);

    const updatedProfile = {
      ...profile,
      xp: profile.xp + xpReward,
      level: Math.floor((profile.xp + xpReward) / 1000) + 1
    };
    setProfile(updatedProfile);

    // Trigger floating XP pop animation near basket
    setFloatingXp({ amount: xpReward, x: 80, y: 80 });
    setTimeout(() => setFloatingXp(null), 1200);

    // Save profile to local storage if offline
    if (offline) {
      localStorage.setItem('cq_offline_profile', JSON.stringify(updatedProfile));
    }

    // Save completed levels
    const nextCompleted = { ...completedLevels };
    if (!nextCompleted[tier].includes(levelIndex)) {
      nextCompleted[tier].push(levelIndex);
      setCompletedLevels(nextCompleted);
      localStorage.setItem('cq_completed_levels', JSON.stringify(nextCompleted));
    }

    // If backend session is active, submit correct answers to award actual backend database XP
    if (session && !offline) {
      try {
        // Submit each word sequentially to the backend to sync attempts & award XP
        for (let i = 0; i < words.length; i++) {
          await fishingApi.submitAnswer(session.sessionId, words[i]);
        }
      } catch (err) {
        console.warn("Could not sync solution with backend", err.message);
      }
    }
  };

  /* ── Load Leaderboard ────────────────────────────────────────────── */
  const loadLeaderboard = async () => {
    try {
      const data = await fishingApi.getLeaderboard();
      setLeaderboard(data);
      setShowLeaderboard(true);
    } catch (e) {
      console.warn("Could not load leaderboard", e.message);
      // Fallback local leaderboard
      setLeaderboard([
        { rank: 1, username: "Decryption_Master", score: 15, xpEarned: 1800 },
        { rank: 2, username: "Key_Fisherman", score: 12, xpEarned: 1400 },
        { rank: 3, username: "Caesar_Lord", score: 10, xpEarned: 1100 },
        { rank: 4, username: profile.username, score: completedLevels.easy.length + completedLevels.medium.length + completedLevels.hard.length, xpEarned: profile.xp }
      ]);
      setShowLeaderboard(true);
    }
  };

  /* ── Advance Level / Tier ────────────────────────────────────────── */
  const handleAdvanceLevel = () => {
    setShowRecap(false);
    // Return smoothly to the stage roadmap!
    setGameFlowStep('stage');
  };

  /* ── Helper values for SVG lines ────────────────────────────────── */
  // Rod Base at bottom center of viewBox (250, 260)
  const rodBaseX = 250;
  const rodBaseY = 260;

  // Basket coordinate (410, 230)
  const basketX = 410;
  const basketY = 230;

  // Cast rod tip calculation
  let rodTipX = 220;
  let rodTipY = 190;
  let hookX = rodTipX;
  let hookY = rodTipY;

  if (isCasting && castTarget) {
    // Vector pointing from base to target
    const dx = castTarget.x - rodBaseX;
    const dy = castTarget.y - rodBaseY;
    const len = Math.sqrt(dx * dx + dy * dy);

    // Dynamic rod tip pointing at fish (rod length is 60px)
    const rodLen = 50;
    if (len > 0) {
      rodTipX = rodBaseX + (dx / len) * rodLen;
      rodTipY = rodBaseY + (dy / len) * rodLen;
    }

    if (castProgress <= 1 && caughtFish) {
      // Casting out / Reeling in
      if (castProgress >= 0) {
        // Line extending to target
        hookX = rodTipX + (castTarget.x - rodTipX) * castProgress;
        hookY = rodTipY + (castTarget.y - rodTipY) * castProgress;
      }
    }
  }

  return (
    <div className="fg-root">
      {/* ── 1. CATEGORY CHOOSE SCREEN ─────────────────── */}
      {gameFlowStep === 'category' && (
        <div className="fg-selector-container">
          <div className="fg-selector-header">
            <h1 className="fg-selector-title">Choose a Learning Cipher Games</h1>
            <p className="fg-selector-subtitle">Select a game module to begin</p>
          </div>

          <div className="fg-selector-grid">
            {categories.map((cat) => (
              <div 
                key={cat.id} 
                className="fg-selector-card"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setGameFlowStep('difficulty');
                }}
              >
                <div className="fg-card-icon-wrapper">
                  <span className="fg-card-icon">{cat.icon}</span>
                </div>
                <h2 className="fg-card-title">{cat.title}</h2>
                <p className="fg-card-desc">{cat.description}</p>
                <div className="fg-card-footer">
                  <span className="fg-card-xp">{cat.xp}</span>
                  <button className="fg-card-play-btn">
                    <span className="material-symbols-outlined">play_arrow</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. DIFFICULTY CHOOSE SCREEN ───────────────── */}
      {gameFlowStep === 'difficulty' && (
        <div className="fg-selector-container">
          <button className="fg-btn-back-nav" onClick={() => setGameFlowStep('category')}>
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Categories
          </button>

          <div className="fg-selector-header" style={{ marginTop: '24px' }}>
            <h1 className="fg-selector-title">Select Difficulty</h1>
            <p className="fg-selector-subtitle">
              Choose a training difficulty tier for the <strong>{selectedCategory ? selectedCategory.toUpperCase() : ''}</strong> cipher
            </p>
          </div>

          <div className="fg-selector-grid">
            {/* Easy Card */}
            <div 
              className="fg-selector-card difficulty-card easy"
              onClick={() => {
                setTier('easy');
                setGameFlowStep('stage');
              }}
            >
              <div className="fg-card-icon-wrapper easy">
                <span className="fg-card-icon">🟢</span>
              </div>
              <h2 className="fg-card-title">Easy Mode</h2>
              <p className="fg-card-desc">Ideal for beginners. Simple character shift sets and real-time decoded previews.</p>
              <div className="fg-card-footer">
                <span className="fg-card-status-badge unlocked">UNLOCKED</span>
                <button className="fg-card-play-btn">
                  <span className="material-symbols-outlined">play_arrow</span>
                </button>
              </div>
            </div>

            {/* Medium Card (Locked) */}
            <div className="fg-selector-card difficulty-card medium locked">
              <div className="fg-card-lock-badge">
                <span className="material-symbols-outlined">lock</span>
              </div>
              <div className="fg-card-icon-wrapper medium">
                <span className="fg-card-icon">🟨</span>
              </div>
              <h2 className="fg-card-title">Medium Mode</h2>
              <p className="fg-card-desc">Requires Easy complete. Multi-word composite shifts and fewer hints.</p>
              <div className="fg-card-footer">
                <span className="fg-card-status-badge locked">LOCKED</span>
              </div>
            </div>

            {/* Hard Card (Locked) */}
            <div className="fg-selector-card difficulty-card hard locked">
              <div className="fg-card-lock-badge">
                <span className="material-symbols-outlined">lock</span>
              </div>
              <div className="fg-card-icon-wrapper hard">
                <span className="fg-card-icon">🟥</span>
              </div>
              <h2 className="fg-card-title">Hard Mode</h2>
              <p className="fg-card-desc">Requires Medium complete. Complex modular wrap-around and completely hidden plaintexts.</p>
              <div className="fg-card-footer">
                <span className="fg-card-status-badge locked">LOCKED</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. STAGES ROADMAP SCREEN (WIRE-FRAME NODE MAP) ─────── */}
      {gameFlowStep === 'stage' && (() => {
        const stage1Completed = completedLevels.easy.includes(0);
        const stage2Completed = completedLevels.easy.includes(1);
        const stage3Completed = completedLevels.easy.includes(2);
        const stage4Completed = completedLevels.easy.includes(3);
        const stage5Completed = completedLevels.easy.includes(4);

        return (
          <div className="fg-selector-container">
            <div className="fg-selector-top-row" style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="fg-btn-back-nav" onClick={() => setGameFlowStep('difficulty')}>
                <span className="material-symbols-outlined">arrow_back</span>
                Back to Difficulties
              </button>

              {/* Cheat Simulator Toggle for Testing */}
              <button 
                className="fg-btn-cheat-toggle" 
                onClick={() => {
                  if (completedLevels.easy.length > 0) {
                    const nextCompleted = { easy: [], medium: [], hard: [] };
                    setCompletedLevels(nextCompleted);
                    localStorage.setItem('cq_completed_levels', JSON.stringify(nextCompleted));
                  } else {
                    const nextCompleted = { easy: [0, 1, 2, 3], medium: [], hard: [] };
                    setCompletedLevels(nextCompleted);
                    localStorage.setItem('cq_completed_levels', JSON.stringify(nextCompleted));
                  }
                }}
                style={{
                  background: 'rgba(0, 243, 255, 0.05)',
                  border: '1px solid rgba(0, 243, 255, 0.2)',
                  borderRadius: '20px',
                  color: 'var(--neon-cyan)',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {completedLevels.easy.length > 0 ? 'lock_reset' : 'verified'}
                </span>
                {completedLevels.easy.length > 0 ? "Reset Stage Completions" : "Simulate Stages 1-4 Completed"}
              </button>
            </div>

            <div className="fg-selector-header" style={{ marginTop: '24px' }}>
              <h1 className="fg-selector-title">Select Stage</h1>
              <p className="fg-selector-subtitle">
                Complete each challenge sequentially to intercept Caesar communication nodes
              </p>
            </div>

            {/* Connected Circular Node Pathway */}
            <div className="fg-stage-roadmap">
              {/* Stage 1 Node */}
              <div className="fg-roadmap-node-wrapper">
                <div className={`fg-node-tag ${stage1Completed ? 'completed' : 'active'}`}>
                  STAGE 1
                </div>
                <button 
                  className={`fg-roadmap-node ${stage1Completed ? 'completed' : 'active'}`}
                  onClick={() => {
                    if (stage1Completed) {
                      setSelectedRecapStage(1);
                      setGameFlowStep('stage_completed');
                    } else {
                      setLevelIndex(0);
                      setAttemptsLeft(10);
                      setLevelSolved(false);
                      setGameFlowStep('game');
                    }
                  }}
                >
                  {stage1Completed ? (
                    <span className="material-symbols-outlined" style={{ color: 'var(--neon-green)' }}>check</span>
                  ) : (
                    <span className="material-symbols-outlined">play_arrow</span>
                  )}
                </button>
              </div>

              {/* Connection Line 1➔2 */}
              <div className={`fg-roadmap-line ${stage1Completed ? 'lit' : 'dim'}`} />

              {/* Stage 2 Node */}
              <div className="fg-roadmap-node-wrapper">
                <div className={`fg-node-tag ${stage2Completed ? 'completed' : (stage1Completed ? 'active lit' : 'dim')}`}>
                  STAGE 2
                </div>
                <button 
                  className={`fg-roadmap-node ${stage2Completed ? 'completed' : (stage1Completed ? 'lit active' : 'locked')}`}
                  onClick={() => {
                    if (!stage1Completed) {
                      setLockedAlertMessage("Stage 2 is locked! You must decrypt Stage 1 first to gain access.");
                      setShowLockedAlert(true);
                    } else if (stage2Completed) {
                      setSelectedRecapStage(2);
                      setGameFlowStep('stage_completed');
                    } else {
                      setLevelIndex(1);
                      setAttemptsLeft(10);
                      setLevelSolved(false);
                      setGameFlowStep('game');
                    }
                  }}
                >
                  {stage2Completed ? (
                    <span className="material-symbols-outlined" style={{ color: 'var(--neon-green)' }}>check</span>
                  ) : (!stage1Completed ? (
                    <span className="material-symbols-outlined">lock</span>
                  ) : (
                    <span className="material-symbols-outlined">play_arrow</span>
                  ))}
                </button>
              </div>

              {/* Connection Line 2➔3 */}
              <div className={`fg-roadmap-line ${stage2Completed ? 'lit' : 'dim'}`} />

              {/* Stage 3 Node */}
              <div className="fg-roadmap-node-wrapper">
                <div className={`fg-node-tag ${stage3Completed ? 'completed' : (stage2Completed ? 'active lit' : 'dim')}`}>
                  STAGE 3
                </div>
                <button 
                  className={`fg-roadmap-node ${stage3Completed ? 'completed' : (stage2Completed ? 'lit active' : 'locked')}`}
                  onClick={() => {
                    if (!stage2Completed) {
                      setLockedAlertMessage("Stage 3 is locked! Complete Stage 2 to decode this milestone.");
                      setShowLockedAlert(true);
                    } else if (stage3Completed) {
                      setSelectedRecapStage(3);
                      setGameFlowStep('stage_completed');
                    } else {
                      setLevelIndex(2);
                      setAttemptsLeft(10);
                      setLevelSolved(false);
                      setGameFlowStep('game');
                    }
                  }}
                >
                  {stage3Completed ? (
                    <span className="material-symbols-outlined" style={{ color: 'var(--neon-green)' }}>check</span>
                  ) : (!stage2Completed ? (
                    <span className="material-symbols-outlined">lock</span>
                  ) : (
                    <span className="material-symbols-outlined">play_arrow</span>
                  ))}
                </button>
              </div>

              {/* Connection Line 3➔4 */}
              <div className={`fg-roadmap-line ${stage3Completed ? 'lit' : 'dim'}`} />

              {/* Stage 4 Node */}
              <div className="fg-roadmap-node-wrapper">
                <div className={`fg-node-tag ${stage4Completed ? 'completed' : (stage3Completed ? 'active lit' : 'dim')}`}>
                  STAGE 4
                </div>
                <button 
                  className={`fg-roadmap-node ${stage4Completed ? 'completed' : (stage3Completed ? 'lit active' : 'locked')}`}
                  onClick={() => {
                    if (!stage3Completed) {
                      setLockedAlertMessage("Stage 4 is locked! Solve Stage 3 to gain cryptographic access.");
                      setShowLockedAlert(true);
                    } else if (stage4Completed) {
                      setSelectedRecapStage(4);
                      setGameFlowStep('stage_completed');
                    } else {
                      setLevelIndex(3);
                      setAttemptsLeft(10);
                      setLevelSolved(false);
                      setGameFlowStep('game');
                    }
                  }}
                >
                  {stage4Completed ? (
                    <span className="material-symbols-outlined" style={{ color: 'var(--neon-green)' }}>check</span>
                  ) : (!stage3Completed ? (
                    <span className="material-symbols-outlined">lock</span>
                  ) : (
                    <span className="material-symbols-outlined">play_arrow</span>
                  ))}
                </button>
              </div>

              {/* Connection Line 4➔5 */}
              <div className={`fg-roadmap-line ${stage4Completed ? 'lit' : 'dim'}`} />

              {/* Stage 5 Node */}
              <div className="fg-roadmap-node-wrapper">
                <div className={`fg-node-tag ${stage5Completed ? 'completed' : (stage4Completed ? 'active lit' : 'dim')}`}>
                  STAGE 5
                </div>
                <button 
                  className={`fg-roadmap-node ${stage5Completed ? 'completed' : (stage4Completed ? 'lit active' : 'locked')}`}
                  onClick={() => {
                    if (!stage4Completed) {
                      setLockedAlertMessage("Stage 5 is locked! Advance past Stage 4 to challenge the final boss node.");
                      setShowLockedAlert(true);
                    } else if (stage5Completed) {
                      setSelectedRecapStage(5);
                      setGameFlowStep('stage_completed');
                    } else {
                      setLevelIndex(4);
                      setAttemptsLeft(10);
                      setLevelSolved(false);
                      setGameFlowStep('game');
                    }
                  }}
                >
                  {stage5Completed ? (
                    <span className="material-symbols-outlined" style={{ color: 'var(--neon-green)' }}>check</span>
                  ) : (!stage4Completed ? (
                    <span className="material-symbols-outlined">lock</span>
                  ) : (
                    <span className="material-symbols-outlined">play_arrow</span>
                  ))}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 3.5 ANSWERS & FINISHED GAME RECAP SCREEN ──── */}
      {gameFlowStep === 'stage_completed' && (() => {
        const stageAnswers = {
          1: { level: 1, cipher: 'KHOOR', shift: '3 (A➔D)', plain: 'HELLO', clue: '"A word used for greetings"' },
          2: { level: 2, cipher: 'ZLJBYL', shift: '7 (A➔H)', plain: 'SECURE', clue: '"Free from danger or threat"' },
          3: { level: 3, cipher: 'OUBTQD', shift: '12 (A➔M)', plain: 'CIPHER', clue: '"A secret way of writing"' },
          4: { level: 4, cipher: 'VZjXY', shift: '5 (A➔F)', plain: 'QUEST', clue: '"An arduous search/journey"' },
          5: { level: 5, cipher: 'ERLCRah', shift: '9 (A➔J)', plain: 'VICTORY', clue: '"Act of defeating an enemy"' }
        };

        return (
          <div className="fg-selector-container">
            <button className="fg-btn-back-nav" onClick={() => setGameFlowStep('stage')}>
              <span className="material-symbols-outlined">arrow_back</span>
              Back to Stages
            </button>

            <div className="fg-selector-header" style={{ marginTop: '24px', textAlign: 'center' }}>
              <h1 className="fg-selector-title" style={{ color: 'var(--neon-green)', textShadow: '0 0 20px rgba(57, 255, 20, 0.4)' }}>
                🏆 Stage {selectedRecapStage} Interception Complete!
              </h1>
              <p className="fg-selector-subtitle">
                You have deciphered all communications for this Caesar substitution milestone.
              </p>
            </div>

            {/* Answers & Recovered Directory Card */}
            <div className="fg-completed-recap-card" style={{ width: '100%' }}>
              <h2 className="fg-recap-card-title">🔬 Cryptographic Decryption Directory</h2>
              <p className="fg-recap-card-subtitle">Below is the recovered shift key and decrypted plaintext for this node:</p>

              <div className="fg-recap-table">
                <div className="fg-recap-table-header">
                  <div>Stage</div>
                  <div>Intercepted Ciphertext</div>
                  <div>Key Shift</div>
                  <div>Recovered Plaintext</div>
                  <div>Context Clue</div>
                </div>
                <div className="fg-recap-table-row">
                  <div className="fg-recap-cell-level">Stage {selectedRecapStage}</div>
                  <div className="fg-recap-cell-cipher">{stageAnswers[selectedRecapStage].cipher}</div>
                  <div className="fg-recap-cell-shift">{stageAnswers[selectedRecapStage].shift}</div>
                  <div className="fg-recap-cell-plain">{stageAnswers[selectedRecapStage].plain}</div>
                  <div className="fg-recap-cell-clue">{stageAnswers[selectedRecapStage].clue}</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="fg-completed-actions" style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
              <button 
                className="fg-completed-btn replay"
                onClick={() => {
                  setLevelIndex(selectedRecapStage - 1);
                  setAttemptsLeft(10);
                  setLevelSolved(false);
                  setGameFlowStep('game');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 243, 255, 0.3)',
                  background: 'rgba(0, 243, 255, 0.1)',
                  color: 'var(--neon-cyan)',
                  fontFamily: 'inherit',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <span className="material-symbols-outlined">restart_alt</span>
                Replay Stage {selectedRecapStage}
              </button>
              <button 
                className="fg-completed-btn back"
                onClick={() => setGameFlowStep('stage')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(to right, var(--neon-cyan), #00a8ff)',
                  color: '#030914',
                  fontFamily: 'inherit',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <span className="material-symbols-outlined">explore</span>
                Back to Roadmap
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── 4. ACTIVE GAME SCREEN ─────────────────────── */}
      {gameFlowStep === 'game' && (
        <>
          {/* ── Wireframe Header ───────────────────────────────── */}
          <header className="fg-header">
            <button 
              className="fg-btn-back-nav" 
              onClick={() => setGameFlowStep('stage')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--neon-cyan)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600',
                fontFamily: 'inherit',
                marginRight: '16px'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
              Exit to Stages
            </button>
            <div className="fg-header-category">
              Caesar
              {offline && (
                <span className="fg-offline-badge-pill">Sandbox</span>
              )}
            </div>
            <div className="fg-header-stage" style={{ flex: 1, textAlign: 'center' }}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)} - Stage {levelIndex + 1}
            </div>
            <div className={`fg-header-attempts ${attemptsLeft <= 3 ? 'low-attempts' : ''}`}>
              Attempts left: {attemptsLeft}
            </div>
          </header>


      {/* ── Main Game Screen ────────────────────────────────── */}
      <div className="fg-game-layout">

        {/* Sidebar Panel: Stacked vertically */}
        <aside className="fg-sidebar">
          {/* 1. TOP: Basket Card */}
          <div className={`fg-basket-card ${levelSolved ? 'active-target' : ''} ${basketShake ? 'shake' : ''}`}>
            <div className="fg-basket-container">🧺</div>
            <div className="fg-basket-shift-value">
              +{activeShifts[targetSegmentIndex] ?? 0}
            </div>
            <span className="fg-basket-label">Basket Shift Key (Seg #{targetSegmentIndex + 1})</span>

            {/* Floating XP Gain Popup */}
            {floatingXp && (
              <div
                className="fg-xp-pop-indicator"
                style={{ left: `${floatingXp.x}%`, top: `${floatingXp.y}%` }}
              >
                +{floatingXp.amount} XP
              </div>
            )}
          </div>

          {/* 2. MIDDLE: Dynamic Cipher Reference Table */}
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
              Formula:<br/>
              Plain[i] = (Cipher[i] - BasketShift) mod 26
            </p>
          </div>

          {/* 3. BOTTOM: Decryption Status / Warnings / Rule Violations */}
          <div className="fg-sidebar-alerts">
            {levelSolved ? (
              <div className="fg-success-panel">
                <div className="fg-success-panel-info">
                  <h3>✅ DECRYPTION COMPLETE!</h3>
                  <p>
                    All cipher segments are aligned. Plaintext successfully recovered!
                  </p>
                </div>
                <button
                  className="fg-btn fg-btn-primary"
                  onClick={handleVerifySubmit}
                  style={{ background: 'var(--neon-green)', color: '#030914', width: '100%', marginTop: '4px' }}
                >
                  🚀 Verify & Submit Solution
                </button>
              </div>
            ) : ruleViolation ? (
              <div className="fg-alert-panel">
                <strong>⚠️ Rule Violated: </strong>
                {ruleViolation.rule}
              </div>
            ) : (
              <div className="fg-alert-panel default-alert">
                <strong>🎣 Action Required: </strong>
                Select a word segment above, then catch a swimming fish to adjust the shift key!
              </div>
            )}
          </div>
        </aside>

        {/* Center Game Deck: Word panel on top, Pond on bottom filling all space */}
        <main className="fg-main">

          {/* 1. Word Display Panel */}
          <section className="fg-word-panel">
            <span className="fg-word-label">Target Cipher Message Segment(s)</span>

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
                    {tier === 'hard' && isTargeted && (
                      <span className="fg-target-badge">Active Target</span>
                    )}

                    <div className="fg-letter-cells">
                      {cipherWord.split('').map((cipherCh, chIdx) => {
                        const maskRevealList = levelData.masks[wordIdx];
                        const shouldRevealCipher = tier === 'easy' ? true : maskRevealList[chIdx];
                        
                        let letterToDisplay = decryptedWord[chIdx];
                        let cellClass = "fg-letter-cell";

                        // Easy Tier: displays plaintext reveals in green immediately, others are decrypted dynamically
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
                          // Medium/Hard: displays decrypted letters based on current shift
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

          {/* 2. Interactive Pond: Now fills the entire rest of the layout space */}
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
                  <div
                    className={`fg-fish-badge ${f.value > 0 ? 'positive' : 'negative'}`}
                    style={{ transform: `scaleX(${f.direction})` }}
                  >
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

              {/* Rod Line SVG Overlay */}
              <svg className="fg-pond-svg" viewBox="0 0 500 260">
                {/* Rod Tip pointer line */}
                <line
                  x1={rodBaseX}
                  y1={rodBaseY}
                  x2={rodTipX}
                  y2={rodTipY}
                  className="fg-fishing-rod-line"
                />

                {/* Cast Line */}
                {isCasting && (
                  <line
                    x1={rodTipX}
                    y1={rodTipY}
                    x2={hookX}
                    y2={hookY}
                    className="fg-fishing-line"
                  />
                )}
              </svg>

              {/* Water Splash */}
              {splash.show && (
                <div
                  className="fg-splash-effect"
                  style={{ left: `${splash.x}%`, top: `${splash.y}px` }}
                >
                  💦
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
        </>
      )}

      {/* ── STAGE LOCKED WARNING MODAL ─────────────────── */}
      {showLockedAlert && (
        <div className="fg-recap-overlay" style={{ zIndex: 1000 }}>
          <div className="fg-recap-card" style={{ maxWidth: '450px', padding: '32px', textAlign: 'center' }}>
            <h2 className="fg-recap-title" style={{ fontSize: '1.8rem', color: '#ff2d55', textShadow: '0 0 10px rgba(255, 45, 85, 0.3)' }}>
              {isStage1Finished ? '🔒 Stage 2 Lock' : '🔒 Stage Access Denied'}
            </h2>
            <p className="fg-recap-subtitle" style={{ margin: '16px 0 24px 0', fontSize: '0.95rem', color: '#b0c4de', lineHeight: '1.6' }}>
              {lockedAlertMessage}
            </p>
            <button 
              className="fg-completed-btn back" 
              style={{ width: '100%', justifyContent: 'center', background: 'var(--neon-cyan)', color: '#030914', border: 'none' }}
              onClick={() => setShowLockedAlert(false)}
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* ══ "WHY DID THIS WORK?" RECAP MODAL ═════════════════ */}
      {showRecap && (
        <div className="fg-recap-overlay">
          <div className="fg-recap-card">
            <h2 className="fg-recap-title">🔬 Cryptographic Recap</h2>
            <p className="fg-recap-subtitle">Why Did This Work?</p>

            <div className="fg-recap-animation-box">
              <div className="fg-recap-letter-row">
                {levelData.plaintext.replace(/\s+/g, '').split('').map((plainCh, idx) => {
                  const cipherCh = levelData.ciphertext.replace(/\s+/g, '')[idx];
                  
                  // Find segment for this character index to resolve shift key
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
                  const isActive = recapStep >= idx;
                  const isWaiting = recapStep < idx;

                  return (
                    <div
                      key={idx}
                      className={`fg-recap-node ${isActive ? 'active' : ''} ${isWaiting ? 'waiting' : ''}`}
                    >
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
              💡 **Caesar Cipher Decryption Mechanics:** <br/>
              A Caesar Cipher is a uniform substitution cipher. Each letter in the ciphertext was shifted forward in the alphabet by a fixed shift value. 
              By catching fish carrying operators, you configured the decryption basket shift value to exactly match the key. 
              Applying the subtraction shift (`Plain = Cipher - Key`) maps **all letters** uniformly back to their correct plaintext representation. 
              This demonstrates that Caesar Ciphers have exactly 25 possible keys, which makes them highly vulnerable to brute-force decryption!
            </div>

            <div className="fg-recap-actions">
              <button
                className="fg-btn fg-btn-primary"
                onClick={handleAdvanceLevel}
                disabled={recapStep < levelData.plaintext.replace(/\s+/g, '').length - 1}
                style={{ background: 'var(--neon-green)', color: '#030914' }}
              >
                Unlock Next Objective ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ LEADERBOARD MODAL ═══════════════════════════════ */}
      {showLeaderboard && (
        <div className="fg-modal-backdrop" onClick={() => setShowLeaderboard(false)}>
          <div className="fg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fg-modal-header">
              <h2>🏆 CipherQuest Fishers Leaderboard</h2>
              <button className="fg-modal-close" onClick={() => setShowLeaderboard(false)}>×</button>
            </div>
            {leaderboard.length === 0 ? (
              <p className="fg-empty">No scores logged yet. Secure the first record!</p>
            ) : (
              <ol className="fg-lb-list">
                {leaderboard.map((entry, index) => (
                  <li key={index} className={`fg-lb-entry ${entry.rank === 1 ? 'fg-lb-gold' : ''}`}>
                    <span className="fg-lb-rank">
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </span>
                    <span className="fg-lb-name">{entry.username}</span>
                    <span className="fg-lb-score">{entry.score || entry.completedLevels || 0} Levels Solved</span>
                    <span className="fg-lb-xp">+{entry.xpEarned} XP</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
