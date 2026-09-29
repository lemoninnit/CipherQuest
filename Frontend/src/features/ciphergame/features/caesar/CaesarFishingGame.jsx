/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from 'react';
import '../../CipherGame.css';
import GameHudBar from '../../ui/GameHudBar';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import PauseMenu from '../../ui/PauseMenu';
import CryptographicRecap from '../../ui/CryptographicRecap';
import VictoryConfetti from '../../ui/VictoryConfetti';
import { facingTransform, isLargeFish, makeSwimProps, onFishImgError, spriteForFishValue, tickFish } from '../../core/engine/fishPhysics';
import { fishingSound } from '../../core/engine/fishingSound';
import { caesarDecryptChar } from '../../core/engine/caesar';
import { useFullscreen } from '../../core/hooks/useFullscreen';
import { useGameShortcuts } from '../../core/hooks/useGameShortcuts';
import { useStageSnapshotAutoSaver } from '../../core/engine/gameSnapshot';
import { useFishingStageFail } from '../../core/hooks/useFishingStageFail';
import FishingGameOverOverlay from '../../ui/FishingGameOverOverlay';

/* ─── Caesar math ─── */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const charToIdx = (char) => (char && char.charCodeAt(0) >= 65 && char.charCodeAt(0) <= 90 ? char.charCodeAt(0) - 65 : 0);

const normalizeShift = (shift = 0) => ((shift % 26) + 26) % 26;

const applyShiftDelta = (curr, delta) => {
  return normalizeShift(curr + delta);
};

const formatShift = (shift) => {
  const norm = normalizeShift(shift);
  if (norm === 0) return '0';
  const dist = norm > 13 ? norm - 26 : norm;
  return dist > 0 ? `+${dist}` : `${dist}`;
};

const generateCaesarFishValues = (targetShift, currentShift, difficulty = 'easy', totalCount = 9) => {
  const diffNorm = normalizeShift(targetShift - currentShift);
  const signedDist = diffNorm > 13 ? diffNorm - 26 : diffNorm;
  
  const maxLimit = difficulty === 'easy' ? 7 : difficulty === 'medium' ? 14 : 24;
  const radius = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6;
  
  const pool = new Set();
  
  // Direct solver if within limit
  if (signedDist !== 0 && Math.abs(signedDist) <= maxLimit) {
    pool.add(signedDist);
  }
  
  // Two-step decomposition
  if (signedDist !== 0) {
    const p1 = Math.trunc(signedDist / 2);
    const p2 = signedDist - p1;
    if (p1 !== 0 && Math.abs(p1) <= maxLimit) pool.add(p1);
    if (p2 !== 0 && Math.abs(p2) <= maxLimit) pool.add(p2);
  }
  
  // Offset window around signedDist (or around 1 if signedDist is 0)
  const center = signedDist === 0 ? 1 : signedDist;
  const minVal = Math.max(-maxLimit, center - radius);
  const maxVal = Math.min(maxLimit, center + radius);
  
  for (let v = minVal; v <= maxVal; v++) {
    if (v !== 0) pool.add(v);
  }
  
  // Ensure mixed signs
  const hasPos = Array.from(pool).some(v => v > 0);
  const hasNeg = Array.from(pool).some(v => v < 0);
  if (!hasPos) {
    for (let v = 1; v <= Math.min(3, maxLimit); v++) pool.add(v);
  }
  if (!hasNeg) {
    for (let v = -1; v >= Math.max(-3, -maxLimit); v--) pool.add(v);
  }
  
  const candidates = Array.from(pool);
  const result = [];
  
  // Guarantee direct solver or decomposed parts first
  if (signedDist !== 0 && Math.abs(signedDist) <= maxLimit) {
    result.push(signedDist);
  }
  
  const remainingCandidates = candidates.filter(c => !result.includes(c)).sort(() => Math.random() - 0.5);
  for (const c of remainingCandidates) {
    if (result.length >= totalCount) break;
    result.push(c);
  }
  
  while (result.length < totalCount) {
    const fallback = candidates[Math.floor(Math.random() * candidates.length)] || 1;
    result.push(fallback);
  }
  
  return result.sort(() => Math.random() - 0.5);
};

export default function CaesarFishingGame({
  levelData,
  tier,
  snapshot,
  onVerifySubmit,
  onBackToStages,
  onReplayNewQuestion,
  onStartStageTimer,
  onSaveSnapshot,
  onClearSnapshot,
  onStageFail,
}) {
  const { containerRef, isFullscreen, toggleFullscreen } = useFullscreen();

  const words         = levelData.plaintext.split(' ');
  const cipherSegs    = levelData.ciphertext.split(' ');
  const getInitialShift = () => 0;

  const hasSnapshot = Boolean(snapshot?.gameState && snapshot.gameState.phase === 'playing');

  /* ── state ── */
  const [phase, setPhase]                     = useState(() => (hasSnapshot ? 'playing' : 'ready'));
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [activeShifts, setActiveShifts]       = useState(() => (hasSnapshot && Array.isArray(snapshot.gameState.activeShifts) ? snapshot.gameState.activeShifts : cipherSegs.map(() => getInitialShift())));
  const [targetSegIdx, setTargetSegIdx]       = useState(() => (hasSnapshot && typeof snapshot.gameState.targetSegIdx === 'number' ? snapshot.gameState.targetSegIdx : 0));
  const [attemptsLeft, setAttemptsLeft]       = useState(() => (hasSnapshot && typeof snapshot.gameState.attemptsLeft === 'number' ? snapshot.gameState.attemptsLeft : 15));
  const [levelSolved, setLevelSolved]         = useState(false);
  const [basketShake, setBasketShake]         = useState(false);
  const [floatingXp, setFloatingXp]           = useState(null);
  const [fishList, setFishList]               = useState([]);
  const [bubbles, setBubbles]                 = useState([]);
  const [isCasting, setIsCasting]             = useState(false);
  const [castProgress, setCastProgress]       = useState(0);
  const [castTarget, setCastTarget]           = useState({ x: 0, y: 0 });
  const [caughtFish, setCaughtFish]           = useState(null);
  const [splash, setSplash]                   = useState({ show: false, x: 0, y: 0 });
  const [showExplanation, setShowExplanation] = useState(false);
  const [chumCount, setChumCount]             = useState(() => (hasSnapshot && typeof snapshot.gameState.chumCount === 'number' ? snapshot.gameState.chumCount : 3));
  const [isMenuOpen, setIsMenuOpen]           = useState(() => (hasSnapshot ? true : false));
  const [rodFacingRight, setRodFacingRight]   = useState(false);
  const [isMuted, setIsMuted]                 = useState(false);
  const [rodTip, setRodTip]                   = useState({ x: 110, y: 55 });
  const [laneHeight, setLaneHeight]           = useState(500);
  const animationRef = useRef(null);
  const swimLaneRef = useRef(null);        // the swim-lane container div
  const prevLevelIdRef = useRef(levelData.id || `${levelData.plaintext}-${levelData.ciphertext}`);

  // Running out of attempts loses the stage and costs one session heart.
  // Declared BEFORE the snapshot saver so `gameOver` is in scope there.
  const { gameOver, resetStageFail } = useFishingStageFail({
    attemptsLeft,
    isSolved: levelSolved,
    onStageFail,
  });

  const isRunning = phase === 'playing' && !levelSolved;
  useStageSnapshotAutoSaver(
    onSaveSnapshot,
    useCallback(() => ({
      phase: 'playing',
      activeShifts,
      targetSegIdx,
      attemptsLeft,
      chumCount,
    }), [activeShifts, targetSegIdx, attemptsLeft, chumCount]),
    // A lost stage must not be resurrected from a stale snapshot, so stop
    // persisting as soon as the failure overlay is up.
    isRunning && !gameOver
  );

  useEffect(() => {
    return () => {
      fishingSound.stopBgm();
    };
  }, []);

  useEffect(() => {
    if (phase === 'playing' && !isMenuOpen && !showExplanation && !gameOver) {
      fishingSound.playBgm();
    } else {
      fishingSound.pauseBgm();
    }
  }, [phase, isMenuOpen, showExplanation, gameOver]);

  const toggleSound = useCallback(() => {
    const muted = fishingSound.toggleMute();
    setIsMuted(muted);
  }, []);

  useGameShortcuts({
    onToggleFullscreen: toggleFullscreen,
    onToggleMute: toggleSound,
  });

  /* ── ESC key to toggle pause menu ── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (phase === 'playing' && !showExplanation) {
          e.preventDefault();
          setIsMenuOpen(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, showExplanation]);

  /* ── derived ── */
  const basketShift = normalizeShift(activeShifts[0] ?? getInitialShift(0));
  const decryptedSegs = cipherSegs.map((seg, i) =>
    seg.split('').map(ch => caesarDecryptChar(ch, activeShifts[i] ?? 0)).join('')
  );

  const targetShift = normalizeShift(levelData.targetShifts?.[0] ?? 0);
  const allCorrect = basketShift === targetShift && decryptedSegs.every((dec, i) => dec === words[i]);

  const flatLetterPositions = [];
  let gIdx = 0;
  words.forEach((word, wIdx) => {
    for (let chIdx = 0; chIdx < word.length; chIdx++) {
      flatLetterPositions.push({
        globalIdx: gIdx++,
        wordIdx: wIdx,
        charIdx: chIdx,
        plainChar: word[chIdx],
        cipherChar: cipherSegs[wIdx]?.[chIdx] || '',
      });
    }
  });

  const normTier = String(tier || levelData?.difficulty || '').toLowerCase();
  const [selectedGlobalIdx, setSelectedGlobalIdx] = useState(null);

  const isLetterSolved = (p) => {
    const maskList = levelData.masks?.[p.wordIdx];
    const isPrefilled = normTier !== 'hard' && Boolean(maskList?.[p.charIdx]);
    const segShift = normalizeShift(activeShifts[p.wordIdx] ?? 0);
    const decChar = decryptedSegs[p.wordIdx]?.[p.charIdx];
    const isCorrect = segShift !== 0 && decChar === p.plainChar;
    return isPrefilled || isCorrect;
  };

  const unsolvedPositions = flatLetterPositions.filter(p => !isLetterSolved(p));
  const activeViewingTarget = (selectedGlobalIdx !== null && unsolvedPositions.find(p => p.globalIdx === selectedGlobalIdx))
    || unsolvedPositions[0]
    || flatLetterPositions[0]
    || {
      globalIdx: 0,
      wordIdx: 0,
      charIdx: 0,
      plainChar: 'A',
      cipherChar: 'A',
    };

  const handlePrevPos = (e) => {
    e?.stopPropagation?.();
    if (unsolvedPositions.length <= 1) return;
    const currentUnsolvedIdx = unsolvedPositions.findIndex(p => p.globalIdx === activeViewingTarget.globalIdx);
    const prevIdx = (currentUnsolvedIdx - 1 + unsolvedPositions.length) % unsolvedPositions.length;
    setSelectedGlobalIdx(unsolvedPositions[prevIdx].globalIdx);
  };

  const handleNextPos = (e) => {
    e?.stopPropagation?.();
    if (unsolvedPositions.length <= 1) return;
    const currentUnsolvedIdx = unsolvedPositions.findIndex(p => p.globalIdx === activeViewingTarget.globalIdx);
    const nextIdx = (currentUnsolvedIdx + 1) % unsolvedPositions.length;
    setSelectedGlobalIdx(unsolvedPositions[nextIdx].globalIdx);
  };

  const viewingCipherChar = activeViewingTarget.cipherChar;
  const viewingCipherVal = charToIdx(viewingCipherChar);
  const viewingShift = normalizeShift(activeShifts[activeViewingTarget.wordIdx] ?? basketShift);
  const viewingPlainChar = activeViewingTarget.plainChar;
  const viewingPlainVal = charToIdx(viewingPlainChar);
  const isViewingSolved = isLetterSolved(activeViewingTarget);

  /* ── fish physics ── */
  const spawnFish = useCallback(() => {
    const list = [];
    const targetShift = normalizeShift(levelData.targetShifts?.[0] ?? 0);
    const currentShift = basketShift;
    const valuePool = generateCaesarFishValues(targetShift, currentShift, tier, 9);

    const usedY = [];
    for (let i = 0; i < valuePool.length; i++) {
      const value = valuePool[i];

      // Spread fish vertically so they don't all cluster on the same row
      let y;
      let attempts = 0;
      do {
        y = 30 + Math.random() * 200;
        attempts++;
      } while (usedY.some(uy => Math.abs(uy - y) < 28) && attempts < 20);
      usedY.push(y);

      list.push({
        id: i,
        value,
        x: 2 + Math.random() * 94,
        y,
        speed: 0.3 + Math.random() * 0.5,
        ...spriteForFishValue(value),
        ...makeSwimProps(),
      });
    }
    setFishList(list);
  }, [basketShift, levelData.targetShifts, tier]);

  const spawnBubbles = useCallback(() => {
    const list = [];
    for (let i = 0; i < 15; i++) {
      list.push({
        id: i, x: Math.random() * 100,
        size: 3 + Math.random() * 8,
        delay: Math.random() * 6,
        duration: 5 + Math.random() * 5,
      });
    }
    setBubbles(list);
  }, []);

  /* ── start game ── */
  const startGame = () => {
    onClearSnapshot?.();
    resetStageFail();
    fishingSound.unlockAudio();
    fishingSound.playBgm();
    setActiveShifts(cipherSegs.map(() => getInitialShift()));
    setTargetSegIdx(0);
    setAttemptsLeft(15);
    setChumCount(3);
    setLevelSolved(false);
    setPhase('playing');
    spawnFish();
    spawnBubbles();
  };

  /* ── reset on levelData change ── */
  useEffect(() => {
    const curId = levelData.id || `${levelData.plaintext}-${levelData.ciphertext}`;
    if (prevLevelIdRef.current !== curId) {
      prevLevelIdRef.current = curId;
      setPhase('ready');
      setIsMenuOpen(false);
      setActiveShifts(cipherSegs.map(() => getInitialShift()));
    }
  }, [levelData, cipherSegs, getInitialShift]);

  /* ── spawn fish when resuming or starting ── */
  useEffect(() => {
    if (phase === 'playing' && !isMenuOpen && fishList.length === 0) {
      spawnFish();
      spawnBubbles();
    }
  }, [phase, isMenuOpen, fishList.length, spawnFish, spawnBubbles]);

  /* ── detect solve ── */
  useEffect(() => {
    if (phase !== 'playing') return;
    if (allCorrect && !levelSolved) {
      onClearSnapshot?.();
      setLevelSolved(true);
      fishingSound.stopBgm();
      fishingSound.playSfx('win');
    }
    if (!allCorrect && levelSolved) setLevelSolved(false);
  }, [activeShifts, allCorrect, levelSolved, onClearSnapshot, phase]);

  useEffect(() => {
    if (phase !== 'playing' || isMenuOpen || levelSolved || gameOver) return;
    const tick = () => {
      setFishList(prev => prev.map(f => tickFish(f)));
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [phase, isMenuOpen, levelSolved, gameOver]);

  /* ── casting ── */
  const handleChumWaters = () => {
    if (chumCount <= 0 || isCasting || gameOver) return;
    fishingSound.playSfx('chum');
    setChumCount(prev => prev - 1);
    spawnFish();
    setSplash({ show: true, x: 50, y: 120 });
    setTimeout(() => setSplash({ show: false, x: 0, y: 0 }), 600);
  };

  const castLineToFish = (fish) => {
    if (isCasting || levelSolved || gameOver) return;
    fishingSound.unlockAudio();
    fishingSound.playSfx('cast');
    setIsCasting(true);
    setCaughtFish(fish);
    // Remove from the swim list immediately so the fish doesn't appear in two places
    setFishList(prev => prev.filter(f => f.id !== fish.id));
    // x: fish.x is a % → map to SVG viewBox width (500)
    const tx = (fish.x / 100) * 500;
    // y: fish.y is DOM px → must convert to SVG viewBox height (260)
    const containerHeight = swimLaneRef.current?.offsetHeight || 500;
    const ty = (fish.y / containerHeight) * 260;
    setCastTarget({ x: tx, y: ty });
    // --- Determine facing direction & compute SVG tip coords ---
    const facingRight = tx > 250;
    setRodFacingRight(facingRight);
    {
      const SPRITE = 500;
      const HANDLE = SPRITE * 0.88; // 440
      const TIP    = SPRITE * 0.12; // 60
      const laneW  = swimLaneRef.current?.offsetWidth || 1024;
      const laneH  = containerHeight;
      const tipDomX = laneW / 2 + (facingRight ? (HANDLE - TIP) : -(HANDLE - TIP));
      const tipDomY = laneH - HANDLE; // sprite bottom = laneH, tip 12% from top = laneH - HANDLE
      setLaneHeight(containerHeight);
      setRodTip({
        x: (tipDomX / laneW) * 500,
        y: (tipDomY / laneH) * 260,
      });
    }

    let startTime = null;
    const castOut = (ts) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / 350, 1);
      setCastProgress(p);
      if (p < 1) { requestAnimationFrame(castOut); return; }

      setSplash({ show: true, x: fish.x, y: fish.y });
      setTimeout(() => setSplash({ show: false, x: 0, y: 0 }), 500);

      setTimeout(() => {
        let rs = null;
        const reelIn = (ts2) => {
          if (!rs) rs = ts2;
          const rp = Math.min((ts2 - rs) / 450, 1);
          setCastProgress(1 - rp);
          if (rp < 1) { requestAnimationFrame(reelIn); return; }

          setIsCasting(false);
          setCaughtFish(null);
          fishingSound.playSfx('catch');
          const nextShift = applyShiftDelta(activeShifts[0] ?? getInitialShift(0), fish.value);
          setActiveShifts(cipherSegs.map(() => nextShift));
          setBasketShake(true);
          setTimeout(() => setBasketShake(false), 400);
          setAttemptsLeft(prev => {
            const next = Math.max(0, prev - 1);
            if (next <= 0 && !allCorrect) {
              fishingSound.playSfx('lose');
            }
            return next;
          });
          
          setTimeout(() => {
            setFishList(prev => {
              const targetShift = normalizeShift(levelData.targetShifts?.[0] ?? 0);
              const currentShift = nextShift;
              const newPool = generateCaesarFishValues(targetShift, currentShift, tier, 5);
              const value = newPool[Math.floor(Math.random() * newPool.length)];
              return [...prev, {
                id: Date.now(),
                value,
                x: Math.random() > 0.5 ? 94 : 2,
                y: 30 + Math.random() * 200,
                speed: 0.3 + Math.random() * 0.5,
                ...spriteForFishValue(value),
                ...makeSwimProps(),
              }];
            });
          }, 600);
        };
        requestAnimationFrame(reelIn);
      }, 50);
    };
    requestAnimationFrame(castOut);
  };

  /* ── verify ── */
  const handleVerifySubmit = () => {
    if (!levelSolved) return;
    fishingSound.stopBgm();
    setShowExplanation(true);
    const xpReward = 100;
    setFloatingXp({ amount: xpReward, x: 80, y: 80 });
    setTimeout(() => setFloatingXp(null), 1200);
  };

  const handleCloseExplanation = () => {
    onVerifySubmit();
  };

  /* ── rod SVG coords ── */
  const rodTipX = rodTip.x;
  const rodTipY = rodTip.y;
  let hookX = rodTipX, hookY = rodTipY;
  if (isCasting && caughtFish && castTarget) {
    hookX = rodTipX + (castTarget.x - rodTipX) * castProgress;
    hookY = rodTipY + (castTarget.y - rodTipY) * castProgress;
  }

  /* ════ READY ════ */
  if (phase === 'ready') {
    if (isOperationLoading) {
      return (
        <StageLoadingScreen
          category="caesar"
          difficulty={tier}
          stageIndex={(levelData.level || 1) - 1}
          onLoadingComplete={() => {
            setIsOperationLoading(false);
            onStartStageTimer?.();
            startGame();
          }}
        />
      );
    }

    const stageCode = `OP-${String(levelData.level || 1).padStart(2, '0')}`;
    return (
      <div className="fg-root" ref={containerRef}>
        <GameHudBar
          title="Caesar Fishing"
          stage={levelData.level}
          tier={tier}
          isReady={true}
          onBackToStages={onBackToStages}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          isMuted={isMuted}
          onToggleMute={toggleSound}
        />
        <div className="cq-brief-screen">
          <img
            className="cq-bg-img"
            src="/assets/fish/lobbybg/lobbybg.png"
            alt="Lobby Background"
            aria-hidden="true"
          />
          <div className="cq-lobby-scrim" />
          <div className="cq-dossier-card">
            {/* Left Column: Sprite Frame & Stage Code */}
            <div className="cq-dossier-left-col">
              <div className="cq-dossier-sprite-frame">
                <div className="cq-dossier-sprite cq-dossier-sprite-fish" aria-hidden="true" />
              </div>
              <div className="cq-dossier-stage-code">{stageCode}</div>
            </div>

            {/* Right Column: Briefing Content */}
            <div className="cq-dossier-right-col">
              <div className="cq-dossier-tag">MISSION BRIEF</div>
              <h2 className="cq-dossier-title">Caesar Fishing</h2>
              <p className="cq-dossier-subtitle">
                Catch fish carrying shift modifiers to dial in the correct Caesar shift and decrypt the ciphertext.
              </p>
              <hr className="cq-dossier-divider" />
              <div className="cq-dossier-data">
                <div className="cq-dossier-row">
                  <span className="cq-dossier-label">CIPHERTEXT</span>
                  <span className="cq-dossier-value cyan-mono">{levelData.ciphertext}</span>
                </div>
                <div className="cq-dossier-row">
                  <span className="cq-dossier-label">HINT</span>
                  <span className="cq-dossier-value hint-text">{levelData.hint}</span>
                </div>
              </div>
              <p className="cq-dossier-how-it-works">
                <strong>How it works:</strong>{' '}
                Click fish carrying shift modifiers (<strong>+1, -1, +2, -2, +3, -3, +5, -5</strong>) to adjust the active shift key.
                When the decrypted text matches the plaintext, submit! Formula:{' '}
                <code>Plain = (Cipher - Basket Shift) mod 26</code>
              </p>
              <button
                className="cq-dossier-action-btn"
                onClick={() => {
                  fishingSound.unlockAudio();
                  fishingSound.playBgm();
                  setIsOperationLoading(true);
                }}
              >
                Begin operation
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ════ PLAYING ════ */
  const currentShift = basketShift;

  return (
    <div className="fg-root caesar-fishing-fullscreen" ref={containerRef}>
      <style>{`
        .golden-badge {
          background: #ffd700 !important;
          color: #000 !important;
          font-weight: 800 !important;
          box-shadow: 0 0 8px gold !important;
        }
        .scramble-badge {
          background: #ff007f !important;
          color: #fff !important;
          font-weight: 800 !important;
        }
      `}</style>

      {showExplanation && (
        <CryptographicRecap
          cipherType="caesar"
          levelData={levelData}
          onUnlockNext={handleCloseExplanation}
        />
      )}

      <GameHudBar
        title="Caesar Fishing"
        stage={levelData.level}
        tier={tier}
        isReady={false}
        onOpenMenu={() => setIsMenuOpen(true)}
        attempts={attemptsLeft}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        isMuted={isMuted}
        onToggleMute={toggleSound}
      />

      <div className="caesar-fullscreen-stage">
        {/* Fullscreen Ocean Background Video */}
        <video
          className="fg-pond-video"
          src="/assets/fish/ocean_bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="fg-pond-overlay" />
        <div className="fg-wave" />
        {bubbles.map(b => (
          <div key={b.id} className="fg-bubble" style={{ left: `${b.x}%`, width: `${b.size}px`, height: `${b.size}px`, animationDelay: `${b.delay}s`, animationDuration: `${b.duration}s` }} />
        ))}

        {/* Fish Swim Lane & Rod */}
        <div className="caesar-fish-swim-lane" ref={swimLaneRef}>
          {fishList.map(f => {
            const badgeText = f.value > 0 ? `+${f.value}` : `${f.value}`;
            const badgeClass = `fg-fish-badge ${f.value > 0 ? 'positive' : 'negative'}`;

            return (
              <div
                key={f.id}
                className="fg-fish-entity"
                style={{ left: `${f.x}%`, top: `${f.y}px` }}
                onClick={() => castLineToFish(f)}
              >
                <div className="fg-fish-facing" style={{ transform: facingTransform(f.facing) }}>
                  <img
                    className={`fg-fish-sprite-img${isLargeFish(f.imgSrc) ? ' fg-large-fish' : ''}`}
                    src={f.imgSrc}
                    alt=""
                    draggable={false}
                    onError={onFishImgError}
                  />
                </div>
                <div className={badgeClass}>
                  {badgeText}
                </div>
              </div>
            );
          })}
          {isCasting && caughtFish && (
            <div className="fg-fish-entity" style={{
              left: `${(hookX / 500) * 100}%`,
              // Convert SVG y back to DOM px so the fish tracks the line endpoint
              top: `${(hookY / 260) * laneHeight - 20}px`,
              transform: 'scale(1.2)',
              pointerEvents: 'none',
            }}>
              <div className="fg-fish-facing" style={{ transform: facingTransform(caughtFish.facing) }}>
                <img
                  className={`fg-fish-sprite-img${isLargeFish(caughtFish.imgSrc) ? ' fg-large-fish' : ''}`}
                  src={caughtFish.imgSrc}
                  alt=""
                  draggable={false}
                  onError={onFishImgError}
                />
              </div>
            </div>
          )}
          {/* Fishing rod sprite — flips toward the clicked fish */}
          <div
            className={`caesar-fishing-rod-sprite${rodFacingRight ? ' facing-right' : ''}`}
            aria-hidden="true"
          />
          <svg className="fg-pond-svg" viewBox="0 0 500 260" preserveAspectRatio="none">
            {isCasting && <line x1={rodTipX} y1={rodTipY} x2={hookX} y2={hookY} className="fg-fishing-line" />}
          </svg>
          {splash.show && (
            <div className="fg-splash-effect" style={{ left: `${splash.x}%`, top: `${splash.y}px` }}>💦</div>
          )}
        </div>

        {/* Floating Overlays */}
        {/* 1. Top-Center Word Segment Panel + Hint */}
        <div className="caesar-floating-word-panel">
          <div className="fg-word-segments-row">
            {words.map((word, wIdx) => {
              const isTargeted = targetSegIdx === wIdx;
              const segShift = normalizeShift(activeShifts[wIdx] ?? 0);
              const cipherWord = cipherSegs[wIdx];
              const decWord = decryptedSegs[wIdx];

              return (
                <div
                  key={wIdx}
                  className={`fg-word-segment-card ${isTargeted ? 'targeted' : ''}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`Segment ${wIdx + 1}`}
                  onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isCasting) setTargetSegIdx(wIdx); }}
                  onClick={() => { if (!isCasting) setTargetSegIdx(wIdx); }}
                >
                  <div className="caesar-segment-top-row">
                    <span className="caesar-active-shift-label">Active Shift:</span>
                    <span className="caesar-active-shift-badge">{formatShift(segShift)}</span>
                  </div>
                  <div className="fg-letter-cells">
                    {cipherWord.split('').map((cipherCh, chIdx) => {
                      const maskList = levelData.masks?.[wIdx];
                      const normTier = String(tier || levelData?.difficulty || '').toLowerCase();
                      const isPrefilled = normTier !== 'hard' && Boolean(maskList?.[chIdx]);
                      const isCorrect = segShift !== 0 && decWord[chIdx] === word[chIdx];
                      const letterToShow = isPrefilled ? word[chIdx] : (segShift === 0 ? '_' : decWord[chIdx]);

                      const cellClass = (isPrefilled || isCorrect)
                        ? 'fg-letter-cell correct-plain'
                        : (segShift === 0 ? 'fg-letter-cell masked' : 'fg-letter-cell unmatched-plain');

                      return (
                        <div key={chIdx} className={cellClass}>
                          <span className="fg-cell-ciphertext">{cipherCh}</span>
                          <span className="fg-cell-plaintext">{letterToShow}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="fg-segment-basket-badge">Basket Shift: {formatShift(segShift)}</div>
                </div>
              );
            })}
          </div>
          <div className="caesar-floating-hint">Hint: “{levelData.hint}”</div>
        </div>

        {/* 2. Floating Caesar Decryption Arithmetic & A-Z Reference (Bottom-Left) */}
        <div className="caesar-floating-cheat-sheet vg-fishing-az-panel">
          <div className="vg-floating-current-slot">
            <div className="vg-arithmetic-title">
              Decryption Arithmetic
            </div>
          </div>

          {/* Active calculation card */}
          <div className="vg-fishing-calc-card">
            <div className="vg-calc-top-row">
              <span className="vg-calc-label">Active Letter Decryption:</span>
              <span className="vg-calc-badge vg-pos-stepper">
                <button
                  type="button"
                  className="vg-pos-stepper-btn"
                  onClick={handlePrevPos}
                  disabled={unsolvedPositions.length <= 1}
                  aria-label="Previous unsolved position"
                >
                  ‹
                </button>
                <span className="vg-pos-stepper-label">Pos #{activeViewingTarget.globalIdx + 1}</span>
                <button
                  type="button"
                  className="vg-pos-stepper-btn"
                  onClick={handleNextPos}
                  disabled={unsolvedPositions.length <= 1}
                  aria-label="Next unsolved position"
                >
                  ›
                </button>
              </span>
            </div>
            <div className="vg-calc-formula-row">
              <div className="vg-calc-item cipher">
                <span className="lbl">Cipher</span>
                <strong>{viewingCipherChar}</strong>
                <span className="val">{viewingCipherVal}</span>
              </div>
              <span className="vg-calc-op">−</span>
              <div className="vg-calc-item key">
                <span className="lbl">Shift</span>
                <strong>{viewingShift}</strong>
                <span className="val">{viewingShift}</span>
              </div>
              <span className="vg-calc-op">=</span>
              <div className={`vg-calc-item plain ${isViewingSolved ? 'is-solved' : ''}`}>
                <span className="lbl">Target</span>
                <strong style={{ color: isViewingSolved ? 'var(--neon-green)' : '#ffffff' }}>
                  {isViewingSolved ? viewingPlainChar : '?'}
                </strong>
                <span
                  className="val"
                  style={{ visibility: isViewingSolved ? 'visible' : 'hidden' }}
                >
                  {viewingPlainVal}
                </span>
              </div>
            </div>

            {/* Smart Calculation Guidance */}
            <div className="vg-calc-help-row">
              {!isViewingSolved ? (
                (viewingCipherVal - viewingShift < 0) ? (
                  <span className="vg-calc-help-text wrap-around">
                    ⚠️ Wrap-Around: Calculate ({viewingCipherVal} − {viewingShift} + 26) = <strong>?</strong>
                  </span>
                ) : (
                  <span className="vg-calc-help-text normal">
                    💡 Calculate: {viewingCipherVal} − {viewingShift} = <strong>?</strong>
                  </span>
                )
              ) : (
                <span className="vg-calc-help-text solved">
                  ✅ Solved: {viewingCipherChar} ({viewingCipherVal}) − {viewingShift} {viewingCipherVal - viewingShift < 0 ? '+ 26 ' : ''}= {viewingPlainChar} ({viewingPlainVal})
                </span>
              )}
            </div>
          </div>

          {/* 2-row x 13-col Alphabet grid */}
          <div className="vg-sprint-alphabet-grid">
            <div className="vg-alphabet-row">
              {ALPHABET.slice(0, 13).map((ch, i) => {
                const isCipher = ch === viewingCipherChar;
                const isKey = i === viewingShift;
                const isTarget = isViewingSolved && ch === viewingPlainChar;
                let cellClass = "vg-alphabet-cell";
                if (isCipher) cellClass += " is-cipher";
                if (isKey) cellClass += " is-key";
                if (isTarget) cellClass += " is-target";
                return (
                  <div key={ch} className={cellClass} title={`${ch} = ${i}`}>
                    <span className="vg-alpha-char">{ch}</span>
                    <span className="vg-alpha-val">{i}</span>
                  </div>
                );
              })}
            </div>
            <div className="vg-alphabet-row">
              {ALPHABET.slice(13, 26).map((ch, i) => {
                const val = i + 13;
                const isCipher = ch === viewingCipherChar;
                const isKey = val === viewingShift;
                const isTarget = isViewingSolved && ch === viewingPlainChar;
                let cellClass = "vg-alphabet-cell";
                if (isCipher) cellClass += " is-cipher";
                if (isKey) cellClass += " is-key";
                if (isTarget) cellClass += " is-target";
                return (
                  <div key={ch} className={cellClass} title={`${ch} = ${val}`}>
                    <span className="vg-alpha-char">{ch}</span>
                    <span className="vg-alpha-val">{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Bottom-Center Floating Basket Shift Key Card */}
        <div className={`caesar-floating-basket-card ${basketShake ? 'shake' : ''}`}>
          <div className="caesar-basket-icon">🧺</div>
          <div className="caesar-basket-badge">{formatShift(currentShift)}</div>
          <div className="caesar-basket-label">BASKET SHIFT KEY</div>
          {floatingXp && (
            <div className="fg-xp-pop-indicator" style={{ left: `${floatingXp.x}%`, top: `${floatingXp.y}%` }}>
              +{floatingXp.amount} XP
            </div>
          )}
        </div>

        {/* 4. Bottom-Right Floating Chum Waters Skill Panel */}
        <div className={`skill-charge-card fishing-skill-card ${chumCount > 0 ? 'charged' : ''}`}>
          <div className="skill-charge-title">Chum the Waters</div>
          <div className="skill-pellet-icon-wrapper">
            <span className="material-symbols-outlined skill-bolt">waves</span>
          </div>
          {chumCount > 0 ? (
            <button
              type="button"
              className="activate-skill-btn"
              onClick={handleChumWaters}
              disabled={isCasting}
            >
              {isCasting ? 'Chumming...' : `Attract Letters (${chumCount} Left)`}
            </button>
          ) : (
            <div className="skill-hint-label">No chum bait left</div>
          )}
        </div>

        {/* 5. Floating Secured Victory Panel when level solved */}
        {levelSolved && <VictoryConfetti isPaused={isMenuOpen} />}
        {levelSolved && (
          <div className="caesar-floating-victory-panel">
            <h3 className="caesar-victory-title">STAGE SECURED!</h3>
            <p className="caesar-victory-desc">All segments decrypted successfully.</p>
            <button
              className="fg-btn fg-btn-primary"
              onClick={handleVerifySubmit}
            >
              Verify & Submit
            </button>
            {onReplayNewQuestion && (
              <button
                className="fg-btn fg-btn-secondary"
                onClick={onReplayNewQuestion}
              >
                Play Again
              </button>
            )}
          </div>
        )}
      </div>

      {/* Running out of attempts loses the stage + one session heart */}
      <FishingGameOverOverlay
        open={gameOver}
        onRetry={startGame}
        onExit={onBackToStages}
      />

      {/* Shared Pause Menu */}
      <PauseMenu
        open={isMenuOpen}
        onResume={() => setIsMenuOpen(false)}
        onTutorial={() => {
          onClearSnapshot?.();
          setIsMenuOpen(false);
          setPhase('ready');
        }}
        onExit={() => {
          onClearSnapshot?.();
          onBackToStages();
        }}
      />
    </div>
  );
}
