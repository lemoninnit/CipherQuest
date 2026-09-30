/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import '../../CipherGame.css';
import GameHudBar from '../../ui/GameHudBar';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import PauseMenu from '../../ui/PauseMenu';
import CryptographicRecap from '../../ui/CryptographicRecap';
import VictoryConfetti from '../../ui/VictoryConfetti';
import { facingTransform, isLargeFish, makeSwimProps, onFishImgError, randomFishSprite, tickFish } from '../../core/engine/fishPhysics';
import { fishingSound } from '../../core/engine/fishingSound';
import { useFullscreen } from '../../core/hooks/useFullscreen';
import { useGameShortcuts } from '../../core/hooks/useGameShortcuts';
import { useStageSnapshotAutoSaver } from '../../core/engine/gameSnapshot';
import { useFishingStageFail } from '../../core/hooks/useFishingStageFail';
import FishingGameOverOverlay from '../../ui/FishingGameOverOverlay';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const charToIdx = (char) => char.charCodeAt(0) - 65;

const generateVigenereCandidateLetters = (targetLetter, difficulty = 'easy', totalCount = 9) => {
  const target = (targetLetter || 'A').toUpperCase();
  const targetIdx = target.charCodeAt(0) - 65;
  const radius = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6;
  
  const pool = new Set();
  pool.add(target);
  
  for (let offset = 1; offset <= radius; offset++) {
    const fIdx = (targetIdx + offset) % 26;
    const bIdx = (targetIdx - offset + 26) % 26;
    pool.add(ALPHABET[fIdx]);
    pool.add(ALPHABET[bIdx]);
  }
  
  let extra = 1;
  while (pool.size < totalCount) {
    const fIdx = (targetIdx + radius + extra) % 26;
    const bIdx = (targetIdx - radius - extra + 26) % 26;
    pool.add(ALPHABET[fIdx]);
    if (pool.size < totalCount) pool.add(ALPHABET[bIdx]);
    extra++;
  }
  
  const candidates = Array.from(pool);
  const result = [target];
  const decoys = candidates.filter(c => c !== target).sort(() => Math.random() - 0.5);
  for (const d of decoys) {
    if (result.length >= totalCount) break;
    result.push(d);
  }
  return result.sort(() => Math.random() - 0.5);
};

const tabulaRow = (keyLetter) => {
  const shift = charToIdx(keyLetter);
  const row = [];
  for (let i = 0; i < 26; i++) {
    const cipherIdx = (i + shift) % 26;
    row.push(ALPHABET[cipherIdx]);
  }
  return row;
};

const buildSlotMap = (segments, keyLen) => {
  let alphaIndex = 0;
  return segments.map((segment) =>
    segment.split('').map((char) => {
      if (char < 'A' || char > 'Z') return -1;
      const slot = alphaIndex % keyLen;
      alphaIndex++;
      return slot;
    })
  );
};

export default function VigenereFishingGame({
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
  // Authoritative post-loss heart state, so the losing screen shows the
  // server's answer rather than the profile value still in flight.
  stageLoss,
}) {
  const { containerRef, isFullscreen, toggleFullscreen } = useFullscreen();

  const words = useMemo(() => (levelData.plaintext || '').split(' '), [levelData.plaintext]);
  const cipherSegs = useMemo(() => (levelData.ciphertext || '').split(' '), [levelData.ciphertext]);
  const targetKey = levelData.targetKey || '';
  const keyLen = Math.max(1, targetKey.length);
  const cleanHint = levelData?.hint ? levelData.hint.trim() : '';
  const targetShifts = useMemo(() => targetKey.split('').map(charToIdx), [targetKey]);
  const slotMap = useMemo(() => buildSlotMap(cipherSegs, keyLen), [cipherSegs, keyLen]);

  const flatLetterPositions = useMemo(() => {
    const list = [];
    let globalIdx = 0;
    words.forEach((word, wordIdx) => {
      const cipherWord = cipherSegs[wordIdx] || '';
      word.split('').forEach((plainChar, charIdx) => {
        const cipherChar = cipherWord[charIdx] || '';
        const slot = slotMap[wordIdx]?.[charIdx] ?? 0;
        const keyChar = targetKey[slot] || 'A';
        const keyShift = targetShifts[slot] ?? 0;
        list.push({
          wordIdx,
          charIdx,
          globalIdx,
          plainChar,
          cipherChar,
          slot,
          keyChar,
          keyShift,
        });
        globalIdx++;
      });
    });
    return list;
  }, [words, cipherSegs, slotMap, targetKey, targetShifts]);

  const getInitialRevealed = useCallback(() => {
    const normTier = String(tier || levelData.difficulty || 'easy').toLowerCase();
    if (normTier === 'hard') {
      return words.map(w => Array(w.length).fill(false));
    }
    if (levelData.masks && Array.isArray(levelData.masks)) {
      return levelData.masks.map((row, wIdx) => {
        if (row && Array.isArray(row)) return [...row];
        return Array(words[wIdx]?.length || 0).fill(false);
      });
    }
    return words.map(w => Array(w.length).fill(false));
  }, [levelData.masks, levelData.difficulty, tier, words]);

  const hasSnapshot = Boolean(snapshot?.gameState && snapshot.gameState.phase === 'playing');

  const [phase, setPhase] = useState(() => (hasSnapshot ? 'playing' : 'ready'));
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [revealedMasks, setRevealedMasks] = useState(() => (hasSnapshot && Array.isArray(snapshot.gameState.revealedMasks) ? snapshot.gameState.revealedMasks : getInitialRevealed()));
  const [activeTargetIdx, setActiveTargetIdx] = useState(() => (hasSnapshot && typeof snapshot.gameState.activeTargetIdx === 'number' ? snapshot.gameState.activeTargetIdx : 0));
  const [attemptsLeft, setAttemptsLeft] = useState(() => (hasSnapshot && typeof snapshot.gameState.attemptsLeft === 'number' ? snapshot.gameState.attemptsLeft : 25));
  const [levelSolved, setLevelSolved] = useState(false);
  const [basketShake, setBasketShake] = useState(false);
  const [floatingXp, setFloatingXp] = useState(null);
  const [fishList, setFishList] = useState([]);
  const [bubbles, setBubbles] = useState([]);
  const [isCasting, setIsCasting] = useState(false);
  const [castProgress, setCastProgress] = useState(0);
  const [castTarget, setCastTarget] = useState({ x: 0, y: 0 });
  const [caughtFish, setCaughtFish] = useState(null);
  const [splash, setSplash] = useState({ show: false, x: 0, y: 0 });
  const [showExplanation, setShowExplanation] = useState(false);
  const [chumCount, setChumCount] = useState(() => (hasSnapshot && typeof snapshot.gameState.chumCount === 'number' ? snapshot.gameState.chumCount : 3));
  const [hoveredFish, setHoveredFish] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(() => (hasSnapshot ? true : false));
  const [showTabula, setShowTabula] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const animationRef = useRef(null);
  const prevLevelIdRef = useRef(levelData.id || `${levelData.plaintext}-${levelData.ciphertext}`);

  const [selectedGlobalIdx, setSelectedGlobalIdx] = useState(null);

  const currentTarget = flatLetterPositions[activeTargetIdx] || flatLetterPositions[0] || {
    wordIdx: 0,
    charIdx: 0,
    globalIdx: 0,
    plainChar: 'A',
    cipherChar: 'A',
    slot: 0,
    keyChar: 'A',
    keyShift: 0,
  };
  const currentTargetPlain = currentTarget.plainChar;

  const isPositionSolved = (p) => Boolean(revealedMasks[p.wordIdx]?.[p.charIdx]);
  const unsolvedPositions = flatLetterPositions.filter(p => !isPositionSolved(p));

  const activeViewingTarget = (selectedGlobalIdx !== null && unsolvedPositions.find(p => p.globalIdx === selectedGlobalIdx))
    || unsolvedPositions[0]
    || currentTarget
    || flatLetterPositions[0];

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
  const viewingKeyChar = activeViewingTarget.keyChar;
  const viewingKeyShift = activeViewingTarget.keyShift;
  const viewingPlainChar = activeViewingTarget.plainChar;
  const viewingPlainVal = charToIdx(viewingPlainChar);
  const isViewingSolved = isPositionSolved(activeViewingTarget);

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
      revealedMasks,
      activeTargetIdx,
      attemptsLeft,
      chumCount,
    }), [revealedMasks, activeTargetIdx, attemptsLeft, chumCount]),
    // A lost stage must not be resurrected from a stale snapshot, so stop
    // persisting as soon as the failure overlay is up.
    isRunning && !gameOver
  );

  const spawnFish = useCallback(() => {
    const letters = generateVigenereCandidateLetters(currentTargetPlain, tier, 9);
    const usedY = [];
    const list = letters.map((letter, i) => {
      let y;
      let attempts = 0;
      do {
        y = 30 + Math.random() * 200;
        attempts++;
      } while (usedY.some(uy => Math.abs(uy - y) < 26) && attempts < 20);
      usedY.push(y);
      return {
        id: i,
        letter,
        value: charToIdx(letter),
        x: 2 + Math.random() * 94,
        y,
        speed: 0.3 + Math.random() * 0.5,
        ...randomFishSprite(),
        ...makeSwimProps(),
      };
    });
    setFishList(list);
  }, [currentTargetPlain, tier]);

  const spawnBubbles = useCallback(() => {
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
  }, []);

  /* ── reset on levelData change ── */
  useEffect(() => {
    const curId = levelData.id || `${levelData.plaintext}-${levelData.ciphertext}`;
    if (prevLevelIdRef.current !== curId) {
      prevLevelIdRef.current = curId;
      setPhase('ready');
      setIsMenuOpen(false);
      setRevealedMasks(getInitialRevealed());
      setActiveTargetIdx(0);
    }
  }, [levelData, getInitialRevealed]);

  /* ── spawn fish when resuming or starting ── */
  useEffect(() => {
    if (phase === 'playing' && !isMenuOpen && fishList.length === 0) {
      spawnFish();
      spawnBubbles();
    }
  }, [phase, isMenuOpen, fishList.length, spawnFish, spawnBubbles]);

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
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (phase === 'playing' && !showExplanation && !levelSolved && attemptsLeft > 0) {
          e.preventDefault();
          setIsMenuOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, showExplanation, levelSolved, attemptsLeft]);

  const allCorrect = flatLetterPositions.length > 0 && flatLetterPositions.every(
    p => revealedMasks[p.wordIdx]?.[p.charIdx]
  );
  const resetRound = useCallback(() => {
    const initialRevealed = getInitialRevealed();
    setRevealedMasks(initialRevealed);
    const firstUnsolved = flatLetterPositions.findIndex(
      pos => !initialRevealed[pos.wordIdx]?.[pos.charIdx]
    );
    setActiveTargetIdx(firstUnsolved !== -1 ? firstUnsolved : 0);
    const blanksCount = flatLetterPositions.filter(
      p => !initialRevealed[p.wordIdx]?.[p.charIdx]
    ).length;
    setAttemptsLeft(Math.max(20, blanksCount * 3));
    setChumCount(3);
    setLevelSolved(false);
    setShowExplanation(false);
    setHoveredFish(null);
    setIsCasting(false);
    setCaughtFish(null);
    setFloatingXp(null);
  }, [getInitialRevealed, flatLetterPositions]);

  const startGame = () => {
    onClearSnapshot?.();
    fishingSound.unlockAudio();
    fishingSound.playBgm();
    resetRound();
    setPhase('playing');
    resetStageFail();
    spawnFish();
    spawnBubbles();
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    if (allCorrect && !levelSolved) {
      onClearSnapshot?.();
      setLevelSolved(true);
      fishingSound.stopBgm();
      fishingSound.playSfx('win');
    }
    if (!allCorrect && levelSolved) setLevelSolved(false);
  }, [phase, allCorrect, levelSolved, onClearSnapshot]);

  useEffect(() => {
    if (phase !== 'playing' || isMenuOpen || levelSolved || gameOver) return;
    const tick = () => {
      setFishList(prev => prev.map(fish => tickFish(fish)));
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [phase, isMenuOpen, levelSolved, gameOver]);

  // Ensure current target plaintext letter is always swimming in the pond
  useEffect(() => {
    if (phase !== 'playing' || isCasting) return;
    setFishList(prev => {
      if (prev.length === 0) return prev;
      const hasTarget = prev.some(f => f.letter === currentTargetPlain);
      if (hasTarget) return prev;
      const copy = [...prev];
      const replaceIdx = Math.floor(Math.random() * copy.length);
      copy[replaceIdx] = {
        ...copy[replaceIdx],
        letter: currentTargetPlain,
        value: charToIdx(currentTargetPlain),
      };
      return copy;
    });
  }, [currentTargetPlain, phase, isCasting]);

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
    setHoveredFish(null);
    setCastTarget({ x: (fish.x / 100) * 500, y: fish.y });

    let startTime = null;
    const castOut = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / 350, 1);
      setCastProgress(progress);
      if (progress < 1) {
        requestAnimationFrame(castOut);
        return;
      }

      setSplash({ show: true, x: fish.x, y: fish.y });
      setTimeout(() => setSplash({ show: false, x: 0, y: 0 }), 500);
      setFishList(prev => prev.filter(item => item.id !== fish.id));

      setTimeout(() => {
        let reelStart = null;
        const reelIn = (reelTimestamp) => {
          if (!reelStart) reelStart = reelTimestamp;
          const reelProgress = Math.min((reelTimestamp - reelStart) / 450, 1);
          setCastProgress(1 - reelProgress);
          if (reelProgress < 1) {
            requestAnimationFrame(reelIn);
            return;
          }

          setIsCasting(false);
          setCaughtFish(null);
          fishingSound.playSfx('catch');

          const isCorrect = fish.letter === currentTargetPlain;

          if (isCorrect) {
            const updatedRevealed = revealedMasks.map((row, wI) =>
              row.map((val, cI) => (wI === currentTarget.wordIdx && cI === currentTarget.charIdx ? true : val))
            );
            setRevealedMasks(updatedRevealed);
            setFloatingXp({ amount: 50, x: 50, y: 40 });
            setTimeout(() => setFloatingXp(null), 1200);

            // Auto-advance to next unsolved position
            const nextIdx = flatLetterPositions.findIndex((p, idx) => {
              if (idx <= activeTargetIdx) return false;
              return !updatedRevealed[p.wordIdx]?.[p.charIdx];
            });
            if (nextIdx !== -1) {
              setActiveTargetIdx(nextIdx);
            } else {
              const wrapIdx = flatLetterPositions.findIndex(
                p => !updatedRevealed[p.wordIdx]?.[p.charIdx]
              );
              if (wrapIdx !== -1) {
                setActiveTargetIdx(wrapIdx);
              }
            }
          } else {
            setBasketShake(true);
            setTimeout(() => setBasketShake(false), 400);
            setAttemptsLeft(prev => Math.max(0, prev - 1));
          }

          // Respawn a replacement fish
          setTimeout(() => {
            setFishList(prev => {
              const usedLetters = new Set(prev.map(item => item.letter));
              const candidates = generateVigenereCandidateLetters(currentTargetPlain, tier, 9);
              let letter = currentTargetPlain;
              if (usedLetters.has(letter) || Math.random() > 0.45) {
                const available = candidates.filter(c => !usedLetters.has(c));
                letter = available.length > 0
                  ? available[Math.floor(Math.random() * available.length)]
                  : candidates[Math.floor(Math.random() * candidates.length)];
              }
              return [...prev, {
                id: Date.now(),
                letter,
                value: charToIdx(letter),
                x: Math.random() > 0.5 ? 90 : 10,
                y: 60 + Math.random() * 140,
                speed: 0.3 + Math.random() * 0.4,
                ...randomFishSprite(),
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

  const handleVerifySubmit = () => {
    if (!levelSolved) return;
    fishingSound.stopBgm();
    setShowExplanation(true);
    setFloatingXp({ amount: 100, x: 80, y: 80 });
    setTimeout(() => setFloatingXp(null), 1200);
  };

  const handleCloseExplanation = () => {
    onVerifySubmit();
  };

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
    if (len > 0) {
      rodTipX = rodBaseX + (dx / len) * 50;
      rodTipY = rodBaseY + (dy / len) * 50;
    }
    if (castProgress <= 1 && caughtFish) {
      hookX = rodTipX + (castTarget.x - rodTipX) * castProgress;
      hookY = rodTipY + (castTarget.y - rodTipY) * castProgress;
    }
  }

  if (phase === 'ready') {
    if (isOperationLoading) {
      return (
        <StageLoadingScreen
          category="vigenere"
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

    return (
      <div className="fg-root" ref={containerRef}>
        <GameHudBar
          title="Vigenère Fishing"
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
              <div className="cq-dossier-stage-code">
                {`OP-${String(levelData.level || 1).padStart(2, '0')}`}
              </div>
            </div>

            {/* Right Column: Briefing Content */}
            <div className="cq-dossier-right-col">
              <div className="cq-dossier-tag">MISSION BRIEF</div>
              <h2 className="cq-dossier-title">Vigenère Fishing</h2>
              <p className="cq-dossier-subtitle">
                Decrypt the ciphertext into plaintext using the known keyword: <code>Plain = (Cipher − Key + 26) mod 26</code>. Catch fish carrying the matching plaintext letters!
              </p>
              <hr className="cq-dossier-divider" />
              <div className="cq-dossier-data">
                <div className="cq-dossier-row">
                  <span className="cq-dossier-label">CIPHERTEXT</span>
                  <span className="cq-dossier-value cyan-mono">{levelData.ciphertext}</span>
                </div>
                <div className="cq-dossier-row">
                  <span className="cq-dossier-label">KEYWORD</span>
                  <span className="cq-dossier-value yellow-mono">{levelData.targetKey}</span>
                </div>
                {cleanHint && (
                  <div className="cq-dossier-row">
                    <span className="cq-dossier-label">HINT</span>
                    <span className="cq-dossier-value hint-text">{cleanHint}</span>
                  </div>
                )}
              </div>
              <p className="cq-dossier-how-it-works">
                <strong>How it works:</strong>{' '}
                Look at the active blank position's cipher letter and matching key letter. Subtract the key letter's value from the cipher letter's value to find the plaintext letter, then catch that fish!
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

  return (
    <div className="fg-root caesar-fishing-fullscreen vigenere-fishing-fullscreen" ref={containerRef}>
      {/* Recap & Learning Overlay */}
      {showExplanation && (
        <CryptographicRecap
          cipherType="vigenere"
          levelData={levelData}
          onUnlockNext={handleCloseExplanation}
        />
      )}

      <GameHudBar
        title="Vigenère Fishing"
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
        {bubbles.map(bubble => (
          <div key={bubble.id} className="fg-bubble" style={{ left: `${bubble.x}%`, width: `${bubble.size}px`, height: `${bubble.size}px`, animationDelay: `${bubble.delay}s`, animationDuration: `${bubble.duration}s` }} />
        ))}

        {/* Fish Swim Lane & Rod */}
        <div className="caesar-fish-swim-lane">
          {fishList.map(fish => {
            const badgeText = fish.letter;
            const badgeClass = 'fg-fish-badge positive';
            return (
              <div
                key={fish.id}
                className="fg-fish-entity"
                style={{ left: `${fish.x}%`, top: `${fish.y}px` }}
                onMouseEnter={() => { if (!isCasting) setHoveredFish(fish); }}
                onMouseLeave={() => setHoveredFish(null)}
                onClick={() => castLineToFish(fish)}
              >
                <div className="fg-fish-facing" style={{ transform: facingTransform(fish.facing) }}>
                  <img
                    className={`fg-fish-sprite-img${isLargeFish(fish.imgSrc) ? ' fg-large-fish' : ''}`}
                    src={fish.imgSrc}
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
          {isCasting && caughtFish && castProgress < 1 && (
            <div className="fg-fish-entity" style={{ left: `${(hookX / 500) * 100}%`, top: `${hookY - 20}px`, transform: 'scale(1.2)' }}>
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
          <svg className="fg-pond-svg" viewBox="0 0 500 260" preserveAspectRatio="none">
            <line x1={rodBaseX} y1={rodBaseY} x2={rodTipX} y2={rodTipY} className="fg-fishing-rod-line" />
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
            {words.map((word, wordIdx) => {
              const cipherWord = cipherSegs[wordIdx];

              return (
                <div key={wordIdx} className="fg-word-segment-card">
                  <div className="fg-letter-cells">
                    {cipherWord.split('').map((cipherCh, charIdx) => {
                      const slot = slotMap[wordIdx]?.[charIdx] ?? 0;
                      const keyCh = targetKey[slot] || 'A';
                      const isRevealed = revealedMasks[wordIdx]?.[charIdx] === true;
                      const isActive = currentTarget.wordIdx === wordIdx && currentTarget.charIdx === charIdx;
                      const isHovered = isActive && hoveredFish;
                      const letterToShow = isRevealed
                        ? word[charIdx]
                        : (isHovered ? hoveredFish.letter : '_');

                      let cellClass = 'fg-letter-cell';
                      if (isRevealed) {
                        cellClass += ' correct-plain';
                      } else if (isActive) {
                        cellClass += ' active-slot';
                      }

                      return (
                        <div
                          key={charIdx}
                          className={cellClass}
                          onClick={() => {
                            if (!isCasting) {
                              const targetPos = flatLetterPositions.find(
                                p => p.wordIdx === wordIdx && p.charIdx === charIdx
                              );
                              if (targetPos) setActiveTargetIdx(targetPos.globalIdx);
                            }
                          }}
                          title={`Cipher: ${cipherCh}, Key: ${keyCh} → ${isRevealed ? word[charIdx] : '?'}`}
                        >
                          <span className="fg-cell-ciphertext">{cipherCh}</span>
                          <span className="fg-cell-plaintext">{letterToShow}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {cleanHint && (
            <div className="caesar-floating-hint">
              💡 Hint: <strong>"{cleanHint}"</strong>
            </div>
          )}
        </div>

        {/* 2. Floating Reference Panel: Decryption Arithmetic & A-Z Reference (Bottom-Left) */}
        <div className={`vg-floating-key-panel vg-fishing-az-panel ${basketShake ? 'shake' : ''}`}>
          <div className="vg-floating-current-slot">
            <div className="vg-arithmetic-title-stacked">
              <span className="vg-arithmetic-title-line">DECRYPTION</span>
              <span className="vg-arithmetic-title-line">ARITHMETIC</span>
            </div>
            <button
              type="button"
              className="vg-tabula-modal-btn vg-tabula-btn-compact"
              onClick={() => setShowTabula(true)}
              title="Open Interactive Tabula Recta"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>grid_on</span>
              <span>Tabula Recta</span>
            </button>
          </div>

          {/* Active calculation card */}
          <div className="vg-fishing-calc-card">
            <div className="vg-calc-top-row">
              <span className="vg-calc-label">ACTIVE LETTER DECRYPTION</span>
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
                <span className="lbl">Key</span>
                <strong>{viewingKeyChar}</strong>
                <span className="val">{viewingKeyShift}</span>
              </div>
              <span className="vg-calc-op">=</span>
              <div className={`vg-calc-item plain ${isViewingSolved ? 'is-solved' : ''}`}>
                <span className="lbl">Target</span>
                <strong style={{ color: isViewingSolved ? 'var(--neon-green)' : (hoveredFish && activeViewingTarget.globalIdx === currentTarget.globalIdx ? 'var(--neon-cyan)' : '#ffffff') }}>
                  {isViewingSolved
                    ? viewingPlainChar
                    : (hoveredFish && activeViewingTarget.globalIdx === currentTarget.globalIdx ? hoveredFish.letter : '?')}
                </strong>
                <span
                  className="val"
                  style={{
                    visibility: (isViewingSolved || (hoveredFish && activeViewingTarget.globalIdx === currentTarget.globalIdx)) ? 'visible' : 'hidden',
                    color: isViewingSolved ? 'var(--neon-green)' : 'var(--neon-cyan)'
                  }}
                >
                  {isViewingSolved
                    ? (viewingCipherVal - viewingKeyShift + 26) % 26
                    : (hoveredFish && activeViewingTarget.globalIdx === currentTarget.globalIdx ? charToIdx(hoveredFish.letter) : '?')}
                </span>
              </div>
            </div>

            {/* Smart Calculation Guidance */}
            <div className="vg-calc-help-row">
              {!isViewingSolved ? (
                (viewingCipherVal - viewingKeyShift < 0) ? (
                  <span className="vg-calc-help-text wrap-around">
                    ⚠️ Wrap-Around: Calculate ({viewingCipherVal} − {viewingKeyShift} + 26) = <strong>?</strong>
                  </span>
                ) : (
                  <span className="vg-calc-help-text normal">
                    💡 Calculate: {viewingCipherVal} − {viewingKeyShift} = <strong>?</strong>
                  </span>
                )
              ) : (
                <span className="vg-calc-help-text solved">
                  ✅ Solved: {viewingCipherChar} ({viewingCipherVal}) − {viewingKeyChar} ({viewingKeyShift}) {viewingCipherVal - viewingKeyShift < 0 ? '+ 26 ' : ''}= {viewingPlainChar} ({viewingPlainVal})
                </span>
              )}
            </div>
          </div>

          {/* 2-row x 13-col Alphabet grid showing all 26 letters */}
          <div className="vg-sprint-alphabet-grid">
            <div className="vg-alphabet-row">
              {ALPHABET.slice(0, 13).map((ch, i) => {
                const isCipher = ch === viewingCipherChar;
                const isKey = ch === viewingKeyChar;
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
                const isKey = ch === viewingKeyChar;
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

          {floatingXp && (
            <div className="fg-xp-pop-indicator" style={{ left: `${floatingXp.x}%`, top: `${floatingXp.y}%` }}>
              +{floatingXp.amount} XP
            </div>
          )}
        </div>

        {/* 3. Bottom-Center Floating Keyword Pill */}
        <div className="vg-fishing-bottom-keyword" title={`Repeating Keyword: ${targetKey}`}>
          <span className="vg-pill-lbl">KEYWORD</span>
          <span className="vg-pill-val">{targetKey}</span>
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

      {/* Tabula Recta Modal for Vigenère Mode */}
      {showTabula && (
        <div className="vg-modal-overlay" onClick={() => setShowTabula(false)}>
          <div className="vg-modal-card tabula-modal" onClick={e => e.stopPropagation()}>
            <div className="vg-modal-header">
              <h3>📊 Interactive Tabula Recta</h3>
              <button className="vg-modal-close" onClick={() => setShowTabula(false)}>×</button>
            </div>
            <div className="vg-modal-body">
              <p className="vg-modal-instructions">
                The Tabula Recta is a 26×26 grid of shifted alphabets. Find the column of your <strong>Cipher letter (C)</strong>,
                then look at the row of your <strong>Key letter (K)</strong> to find the intersection, which is the <strong>Plain letter (P)</strong>!
                <br />
                <span style={{ color: 'var(--neon-yellow)' }}>★ Gold Rows: rows containing key letters for this level's key ("{targetKey}") are highlighted.</span>
              </p>
              <div className="vg-tabula-scroll-wrapper">
                <table className="vg-tabula-full-grid">
                  <thead>
                    <tr>
                      <th className="corner-cell">K \ P</th>
                      {ALPHABET.map(ch => (
                        <th key={ch} className="col-header">{ch}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ALPHABET.map((kChar) => {
                      const isCorrectKey = targetKey ? targetKey.includes(kChar) : false;
                      const rowLetters = tabulaRow(kChar);
                      return (
                        <tr key={kChar} className={isCorrectKey ? 'correct-key-row' : ''}>
                          <td className="row-header">{kChar}</td>
                          {rowLetters.map((cChar, cIdx) => {
                            const plainLetter = ALPHABET[cIdx];
                            return (
                              <td
                                key={cIdx}
                                className="cell"
                                title={`Key: ${kChar}, Plain: ${plainLetter} → Cipher: ${cChar}`}
                              >
                                {cChar}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Running out of attempts loses the stage + one session heart */}
      {/* Running out of IN-GAME attempts loses the stage and costs one
          server session heart. No retry: the stage attempt is final. */}
      <FishingGameOverOverlay
        open={gameOver}
        stageLoss={stageLoss}
        onExit={onBackToStages}
      />

      {/* Shared Pause Menu */}
      <PauseMenu
        open={isMenuOpen}
        cipherType="vigenere"
        gameType="fishing"
        onResume={() => setIsMenuOpen(false)}
        onExit={() => {
          onClearSnapshot?.();
          onBackToStages();
        }}
      />
    </div>
  );
}
