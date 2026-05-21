import React, { useState, useEffect, useRef } from 'react';
import { fishingApi, userApi } from '../../shared/api/cipherQuestApi';
import CategorySelector from './categories/CategorySelector';
import DifficultySelector from './difficulties/DifficultySelector';
import StageRoadmap from './stages/StageRoadmap';
import StageCompletedRecap from './stages/StageCompletedRecap';
import PacmanGame from './pacman/PacmanGame';
import CipherSprint from './sprint/CipherSprint';
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

/* ─── Pools of alternative questions for replaying completed stages ─── */
const ALTERNATIVE_LEVEL_POOLS = {
  easy: [
    // Level 1: HELLO (5 letters)
    [
      { plaintext: "WORLD", hint: "Our planet Earth", clue: "Planet name" },
      { plaintext: "HAPPY", hint: "Feeling or showing pleasure or contentment", clue: "Positive emotion" },
      { plaintext: "SMILE", hint: "Form one's features into a pleased expression", clue: "Facial expression" },
      { plaintext: "ABOUT", hint: "On the subject of; concerning", clue: "Subject reference" }
    ],
    // Level 2: WATER (5 letters)
    [
      { plaintext: "RIVER", hint: "A large natural stream of water flowing in a channel", clue: "Flowing stream" },
      { plaintext: "DRINK", hint: "Take liquid into the mouth and swallow", clue: "Liquid consumption" },
      { plaintext: "FLOOD", hint: "An overflowing of a large amount of water", clue: "Water overflow" },
      { plaintext: "BEACH", hint: "A pebbly or sandy shore by the ocean", clue: "Sandy shore" }
    ],
    // Level 3: SHARK (5 letters)
    [
      { plaintext: "WHALE", hint: "A very large marine mammal with a blowhole", clue: "Large marine mammal" },
      { plaintext: "CORAL", hint: "Marine invertebrates forming reefs", clue: "Reef builder" },
      { plaintext: "SHELL", hint: "The hard protective outer case of a marine animal", clue: "Protective shell" },
      { plaintext: "STING", hint: "A sharp wound or pain caused by sea creatures", clue: "Painful barb" }
    ],
    // Level 4: CIPHER (6 letters)
    [
      { plaintext: "SECRET", hint: "Kept hidden or private from others", clue: "Hidden fact" },
      { plaintext: "ENCODE", hint: "Convert information into a coded form", clue: "Write cipher" },
      { plaintext: "DECODE", hint: "Convert coded message back into plain text", clue: "Read cipher" },
      { plaintext: "PUZZLE", hint: "A game or toy designed to test ingenuity", clue: "Ingenuity test" }
    ],
    // Level 5: OCEAN (5 letters)
    [
      { plaintext: "COAST", hint: "The part of the land near the sea", clue: "Land near sea" },
      { plaintext: "WAVES", hint: "Ripples on the sea surface", clue: "Sea ripples" },
      { plaintext: "DEPTH", hint: "The distance from the top or surface to the bottom", clue: "Deep measurement" },
      { plaintext: "BAYOU", hint: "A marshy outlet of a lake or river", clue: "Marshy water" }
    ]
  ],
  medium: [
    // Level 1: SALMON (6 letters)
    [
      { plaintext: "TROUTS", hint: "Freshwater fish related to salmon", clue: "Freshwater fish" },
      { plaintext: "MARINE", hint: "Relating to or found in the sea", clue: "Sea environment" },
      { plaintext: "FISHER", hint: "A person who catches fish", clue: "One who angles" },
      { plaintext: "CODING", hint: "The process of writing computer programs", clue: "Software design" }
    ],
    // Level 2: ANCHOR (6 letters)
    [
      { plaintext: "VESSEL", hint: "A ship or large boat", clue: "Large boat" },
      { plaintext: "SAILOR", hint: "A person who works as a member of the crew on a ship", clue: "Crew member" },
      { plaintext: "HARBOR", hint: "A place on the coast where vessels may find shelter", clue: "Sheltered port" },
      { plaintext: "CRUISE", hint: "A voyage on a ship taken for pleasure", clue: "Pleasure voyage" }
    ],
    // Level 3: PIRATE (6 letters)
    [
      { plaintext: "ROBBER", hint: "A person who steals from others", clue: "One who steals" },
      { plaintext: "MUTINY", hint: "An open rebellion against the proper authorities", clue: "Rebellion at sea" },
      { plaintext: "LEGEND", hint: "A traditional story sometimes popularly regarded as historical", clue: "Famous tale" },
      { plaintext: "SHADOW", hint: "A dark area or shape produced by a body", clue: "Dark profile" }
    ],
    // Level 4: SECRET (6 letters)
    [
      { plaintext: "HIDDEN", hint: "Kept out of sight; concealed", clue: "Concealed" },
      { plaintext: "MYSTIC", hint: "Inspiring a sense of spiritual mystery", clue: "Spiritual mystery" },
      { plaintext: "COVERT", hint: "Not openly acknowledged or displayed", clue: "Stealthy" },
      { plaintext: "SHIELDS", hint: "Broad pieces of metal used as protection", clue: "Protective plate" }
    ],
    // Level 5: TREASURE (8 letters)
    [
      { plaintext: "GOLDDUST", hint: "Fine particles of gold found in placer deposits", clue: "Precious dust" },
      { plaintext: "DIAMONDS", hint: "Precious stones consisting of a clear crystalline form of carbon", clue: "Sparkling gems" },
      { plaintext: "FORTUNES", hint: "Large amounts of money or assets", clue: "Great wealth" },
      { plaintext: "PLATINUM", hint: "A precious silvery-white metal", clue: "Precious metal" }
    ]
  ],
  hard: [
    // Level 1: OCEAN BLUE (5, 4 letters)
    [
      { plaintext: "RIVER FLOW", hint: "The movement of a freshwater stream", clue: "Water motion" },
      { plaintext: "BEACH SAND", hint: "Grainy particles on the shoreline", clue: "Shoreline ground" },
      { plaintext: "WATER DRIP", hint: "Slow leakage of liquid drops", clue: "Liquid drop" }
    ],
    // Level 2: DEEP REEF (4, 4 letters)
    [
      { plaintext: "FISH SWIM", hint: "How aquatic creatures move", clue: "Marine movement" },
      { plaintext: "BOAT SAIL", hint: "Vessel cruising on water", clue: "Sailing vessel" },
      { plaintext: "COAST LINE", hint: "The outline of a coast", clue: "Coast boundary" }
    ],
    // Level 3: GOLD COIN (4, 4 letters)
    [
      { plaintext: "RICH LOOT", hint: "Valuable spoils of a pirate heist", clue: "Stolen wealth" },
      { plaintext: "FIND CLUE", hint: "Discover a hint to solve a riddle", clue: "Riddle guidance" },
      { plaintext: "LOST SHIP", hint: "Sunken vessel at the ocean floor", clue: "Ghost vessel" }
    ],
    // Level 4: FIND KEY (4, 3 letters)
    [
      { plaintext: "SEEK MAP", hint: "Look for navigation charts to find treasure", clue: "Search chart" },
      { plaintext: "OPEN BOX", hint: "Unlock a container holding secrets", clue: "Unlock container" },
      { plaintext: "LOST BOY", hint: "A child who has wandered away", clue: "Wandering child" }
    ],
    // Level 5: CATCH MORE FISH (5, 4, 4 letters)
    [
      { plaintext: "WRITE SOME CODE", hint: "What engineers do all day", clue: "Create programs" },
      { plaintext: "SOLVE MORE CODE", hint: "Debugging and finishing tasks", clue: "Debug programs" },
      { plaintext: "BUILD MORE APPS", hint: "Creating software for users", clue: "Software building" }
    ]
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

const generateRandomizedLevel = (tier, levelIndex, currentPlaintext) => {
  const baseLevel = HANDCRAFTED_LEVELS[tier]?.[levelIndex] || HANDCRAFTED_LEVELS.easy[0];
  const pool = ALTERNATIVE_LEVEL_POOLS[tier]?.[levelIndex] || [];
  const allOptions = [
    { plaintext: baseLevel.plaintext, hint: baseLevel.hint, clue: baseLevel.clue },
    ...pool
  ];

  // Filter out current active plaintext if possible to ensure we get a different question
  const filteredOptions = allOptions.filter(opt => opt.plaintext !== currentPlaintext);
  const optionsToUse = filteredOptions.length > 0 ? filteredOptions : allOptions;
  const chosenOption = optionsToUse[Math.floor(Math.random() * optionsToUse.length)];

  // Generate random shift keys:
  // Random shift between 1 and 9 for easy mode, and 1 to 15 for medium/hard mode.
  const targetShifts = baseLevel.targetShifts.map(() => {
    const maxShift = tier === 'easy' ? 9 : 15;
    return Math.floor(Math.random() * maxShift) + 1;
  });

  // Encrypt the chosen plaintext using the randomized targetShifts
  const cipherWords = chosenOption.plaintext.split(' ').map((word, idx) => {
    const shift = targetShifts[idx % targetShifts.length];
    return word.split('').map(ch => {
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 + shift) % 26 + 26) % 26 + 65);
      }
      return ch;
    }).join('');
  });
  const newCiphertext = cipherWords.join(' ');

  // Generate startShifts that do NOT match the target shifts to prevent starting already solved.
  const startShifts = targetShifts.map((targetShift) => {
    let startShift;
    do {
      startShift = Math.floor(Math.random() * 5); // 0 to 4
    } while (startShift === targetShift);
    return startShift;
  });

  return {
    ...baseLevel,
    plaintext: chosenOption.plaintext,
    ciphertext: newCiphertext,
    hint: chosenOption.hint,
    clue: chosenOption.clue,
    targetShifts,
    startShifts
  };
};

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
  
  const [activeLevelData, setActiveLevelData] = useState(null);
  const levelData = activeLevelData || HANDCRAFTED_LEVELS[tier][levelIndex] || HANDCRAFTED_LEVELS.easy[0];

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

    // Generate a fully randomized level (different word and different shift key) on every load/replay
    const loadedLevel = generateRandomizedLevel(tier, levelIndex, activeLevelData?.plaintext);

    setActiveLevelData(loadedLevel);
    setActiveShifts([...loadedLevel.startShifts]);
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

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
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

  const handleReplayNewQuestion = () => {
    const baseLevel = HANDCRAFTED_LEVELS[tier][levelIndex] || HANDCRAFTED_LEVELS.easy[0];
    const pool = ALTERNATIVE_LEVEL_POOLS[tier]?.[levelIndex];
    if (pool && pool.length > 0) {
      const activePlain = activeLevelData?.plaintext;
      const availableOptions = pool.filter(item => item.plaintext !== activePlain && item.plaintext !== baseLevel.plaintext);
      const optionsToUse = availableOptions.length > 0 ? availableOptions : pool;
      const randomAlt = optionsToUse[Math.floor(Math.random() * optionsToUse.length)];

      const targetShifts = baseLevel.targetShifts;
      const cipherWords = randomAlt.plaintext.split(' ').map((w, idx) => {
        const shift = targetShifts[idx % targetShifts.length];
        return w.split('').map(ch => {
          const code = ch.charCodeAt(0);
          if (code >= 65 && code <= 90) {
            return String.fromCharCode(((code - 65 + shift) % 26 + 26) % 26 + 65);
          }
          return ch;
        }).join('');
      });
      const newCiphertext = cipherWords.join(' ');

      const loadedLevel = {
        ...baseLevel,
        plaintext: randomAlt.plaintext,
        ciphertext: newCiphertext,
        hint: randomAlt.hint,
        clue: randomAlt.clue
      };

      setActiveLevelData(loadedLevel);
      setActiveShifts([...loadedLevel.startShifts]);
      setTargetSegmentIndex(0);
      setAttemptsLeft(10);
      setLevelSolved(false);
      
      generatePondFish();
      generatePondBubbles();
    }
  };

  const stagesData = [
    { id: 1, playable: true, completed: completedLevels[tier].includes(0), secretKey: 3 },
    { id: 2, playable: true, completed: completedLevels[tier].includes(1), secretKey: 6 },
    { id: 3, playable: true, completed: completedLevels[tier].includes(2), secretKey: 4 },
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
          onPlayAgain={(id) => {
            setLevelIndex(id - 1);
            setGameFlowStep('game');
          }}
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
            onReplayNewQuestion={handleReplayNewQuestion}
          />
        ) : tier === 'easy' && levelIndex === 2 ? (
          <CipherSprint
            levelData={levelData}
            tier={tier}
            onVerifySubmit={() => handleVerifySubmit(true)}
            onBackToStages={() => setGameFlowStep('stage')}
            onReplayNewQuestion={handleReplayNewQuestion}
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
                      {completedLevels[tier]?.includes(levelIndex) && (
                        <button className="fg-btn fg-btn-secondary" onClick={handleReplayNewQuestion} style={{ width: '100%', marginTop: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                          🔄 Play Again
                        </button>
                      )}
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
              <div className="fg-recap-overlay" style={{ overflowY: 'auto', padding: '30px 10px' }}>
                <div className="fg-recap-card" style={{ maxWidth: '1100px', width: '95%', padding: '24px 32px' }}>
                  <h2 className="fg-recap-title">🔬 Cryptographic Recap</h2>
                  <p className="fg-recap-subtitle">Why Did This Work?</p>

                  <div className="fg-recap-animation-box" style={{ minHeight: 'auto', padding: '16px', marginBottom: '16px' }}>
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

                  <div className="fg-recap-explanation" style={{ background: 'rgba(255, 255, 255, 0.015)' }}>
                    💡 <strong>Caesar Cipher Decryption Mechanics:</strong> <br />
                    A Caesar Cipher is a uniform substitution cipher. Each letter in the ciphertext was shifted forward in the alphabet by a fixed shift value.
                    {levelIndex === 0 && (
                      <span> By catching fish carrying operators, you configured the decryption basket shift value to exactly match the key. </span>
                    )}
                    {levelIndex === 1 && (
                      <span> By using the Shift Key Clue, you decrypted the empty letter cells and collected the ghosts carrying the correct plaintext letters. </span>
                    )}
                    {levelIndex === 2 && (
                      <span> By matching the encrypted baton letters with correct shift key coins, you guided the runner safely through the checkpoint gates. </span>
                    )}
                    Applying the subtraction shift (<code>Plain = Cipher - Key</code>) maps <strong>all letters</strong> uniformly back to their correct plaintext representation.

                    <div className="fg-recap-visual-layout" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* Caesar Alphabet Shift Tables */}
                      {levelData.targetShifts && levelData.targetShifts.map((shiftVal, sIdx) => {
                        const sAlphabet = alphabet.map((ch, idx) => alphabet[(idx + shiftVal) % 26]);
                        return (
                          <div key={sIdx} style={{
                            background: 'rgba(0, 229, 255, 0.05)',
                            border: '1px solid rgba(0, 229, 255, 0.2)',
                            borderRadius: '12px',
                            padding: '12px'
                          }}>
                            <div style={{ fontWeight: '700', color: 'var(--neon-cyan)', marginBottom: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left' }}>
                              🔑 Caesar Alphabet Shift Table {levelData.targetShifts.length > 1 ? `for Word Segment #${sIdx + 1}` : ''} (Key: +{shiftVal})
                            </div>
                            
                            <div style={{ overflowX: 'auto', width: '100%' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', minWidth: '850px' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    <th style={{ padding: '4px 2px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Plain:</th>
                                    {alphabet.map((ch, idx) => (
                                      <td key={idx} style={{ padding: '4px 2px', color: '#fff', background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontWeight: 'bold' }}>{ch}</div>
                                        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{idx + 1}</div>
                                      </td>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <th style={{ padding: '4px 2px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Cipher:</th>
                                    {sAlphabet.map((ch, idx) => {
                                      const codeVal = ch.charCodeAt(0) - 65 + 1;
                                      return (
                                        <td key={idx} style={{ padding: '4px 2px', color: 'var(--neon-cyan)', background: 'rgba(0, 229, 255, 0.02)', borderRight: '1px solid rgba(0, 229, 255, 0.03)' }}>
                                          <div style={{ fontWeight: 'bold' }}>{ch}</div>
                                          <div style={{ fontSize: '0.55rem', color: 'rgba(0, 229, 255, 0.6)' }}>{codeVal}</div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}

                      {/* Step-by-Step letter decryption breakdown */}
                      <div style={{
                        background: 'rgba(57, 255, 20, 0.03)',
                        border: '1px solid rgba(57, 255, 20, 0.15)',
                        borderRadius: '12px',
                        padding: '12px'
                      }}>
                        <div style={{ fontWeight: '700', color: 'var(--neon-green)', marginBottom: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left' }}>
                          📝 Step-by-Step Decryption Solution
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                          {levelData.plaintext.replace(/\s+/g, '').split('').map((plainCh, idx) => {
                            const cipherCh = levelData.ciphertext.replace(/\s+/g, '')[idx];
                            if (!plainCh || !cipherCh) return null;
                            
                            // Calculate which word segment/shift this letter belongs to
                            let wordIndex = 0;
                            const originalSegments = levelData.plaintext.split(' ');
                            let accumulatedLen = 0;
                            for (let i = 0; i < originalSegments.length; i++) {
                              const wordLen = originalSegments[i].replace(/\s+/g, '').length;
                              if (idx < accumulatedLen + wordLen) {
                                wordIndex = i;
                                break;
                              }
                              accumulatedLen += wordLen;
                            }
                            
                            const charShift = levelData.targetShifts ? (levelData.targetShifts[wordIndex] ?? levelData.targetShifts[0]) : 0;
                            
                            const pVal = plainCh.charCodeAt(0) - 65 + 1;
                            const cVal = cipherCh.charCodeAt(0) - 65 + 1;
                            
                            return (
                              <div key={idx} style={{
                                background: 'rgba(3, 9, 20, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '8px',
                                padding: '6px 8px',
                                textAlign: 'center',
                                fontFamily: 'JetBrains Mono, monospace'
                              }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{idx + 1}</div>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px', fontSize: '0.85rem' }}>
                                  <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>{cipherCh}</span>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({cVal})</span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>-{charShift} steps</div>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px', fontSize: '0.85rem', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '2px', marginTop: '2px' }}>
                                  <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>{plainCh}</span>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({pVal})</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="fg-recap-actions" style={{ marginTop: '16px' }}>
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
