/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import '../../CipherGame.css';
import GameHudBar from '../../ui/GameHudBar';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import PauseMenu from '../../ui/PauseMenu';
import CryptographicRecap from '../../ui/CryptographicRecap';
import VictoryConfetti from '../../ui/VictoryConfetti';
import { facingTransform, makeSwimProps, randomVisualFrames, tickFish } from '../../core/engine/fishPhysics';
import { fishingSound } from '../../core/engine/fishingSound';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const charToIdx = (char) => char.charCodeAt(0) - 65;

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
  onVerifySubmit,
  onBackToStages,
  onReplayNewQuestion
}) {
  const words = useMemo(() => (levelData.plaintext || '').split(' '), [levelData.plaintext]);
  const cipherSegs = useMemo(() => (levelData.ciphertext || '').split(' '), [levelData.ciphertext]);
  const targetKey = levelData.targetKey || '';
  const keyLen = Math.max(1, targetKey.length);
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
    if (levelData.masks && Array.isArray(levelData.masks)) {
      return levelData.masks.map((row, wIdx) => {
        if (row && Array.isArray(row)) return [...row];
        return Array(words[wIdx]?.length || 0).fill(false);
      });
    }
    let count = 0;
    return words.map(w =>
      w.split('').map(() => {
        if (count < 2) {
          count++;
          return true;
        }
        return false;
      })
    );
  }, [levelData.masks, words]);

  const [phase, setPhase] = useState('ready');
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [revealedMasks, setRevealedMasks] = useState(getInitialRevealed);
  const [activeTargetIdx, setActiveTargetIdx] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(25);
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
  const [chumCount, setChumCount] = useState(3);
  const [hoveredFish, setHoveredFish] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showTabula, setShowTabula] = useState(false);
  const [isMuted, setIsMuted]       = useState(false);
  const animationRef = useRef(null);

  useEffect(() => {
    return () => {
      fishingSound.stopBgm();
    };
  }, []);

  useEffect(() => {
    if (phase === 'playing' && !isMenuOpen && !showExplanation) {
      fishingSound.playBgm();
    } else {
      fishingSound.pauseBgm();
    }
  }, [phase, isMenuOpen, showExplanation]);

  const toggleSound = () => {
    const muted = fishingSound.toggleMute();
    setIsMuted(muted);
  };

  const soundToggleButton = (
    <button
      className="fg-btn-icon"
      onClick={toggleSound}
      title={isMuted ? "Unmute Sound" : "Mute Sound"}
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: '#fff',
        padding: '4px 8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        fontSize: '1rem'
      }}
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
  );

<<<<<<< Poliquit4Games


=======
>>>>>>> main
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
  const currentCipherChar = currentTarget.cipherChar;
  const currentKeyChar = currentTarget.keyChar;
  const currentKeyShift = currentTarget.keyShift;

  const totalLetters = flatLetterPositions.length;
  const totalBlanks = flatLetterPositions.filter(
    p => !levelData.masks?.[p.wordIdx]?.[p.charIdx]
  ).length || Math.max(1, totalLetters - 2);
  const solvedBlanks = flatLetterPositions.filter(
    p => !levelData.masks?.[p.wordIdx]?.[p.charIdx] && revealedMasks[p.wordIdx]?.[p.charIdx]
  ).length;
  const allCorrect = flatLetterPositions.length > 0 && flatLetterPositions.every(
    p => revealedMasks[p.wordIdx]?.[p.charIdx]
  );

  const alignmentItems = useMemo(() => {
    const items = [];
    cipherSegs.forEach((cWord, wIdx) => {
      if (wIdx > 0) {
        items.push({ isSpace: true, id: `space-${wIdx}` });
      }
      cWord.split('').forEach((cipherCh, cIdx) => {
        const slot = slotMap[wIdx]?.[cIdx] ?? 0;
        const keyCh = targetKey[slot] || 'A';
        const shiftVal = targetShifts[slot] ?? 0;
        const plainCh = words[wIdx]?.[cIdx] ?? '';
        const globalPos = flatLetterPositions.find(
          p => p.wordIdx === wIdx && p.charIdx === cIdx
        );
        const globalIdx = globalPos ? globalPos.globalIdx : 0;
        const isSolved = revealedMasks[wIdx]?.[cIdx] === true;
        const isActive = globalIdx === currentTarget.globalIdx;

        items.push({
          id: `${wIdx}-${cIdx}`,
          cipherCh,
          keyCh,
          shiftVal,
          plainCh,
          wordIdx: wIdx,
          charIdx: cIdx,
          globalIdx,
          isSolved,
          isActive,
        });
      });
    });
    return items;
  }, [cipherSegs, slotMap, targetKey, targetShifts, words, flatLetterPositions, revealedMasks, currentTarget.globalIdx]);

  const spawnFish = useCallback(() => {
    const correctLetter = currentTargetPlain || ALPHABET[0];
    const letters = new Set([correctLetter]);

    // Add letters from other unsolved positions for realistic variety
    flatLetterPositions.forEach(p => {
      if (!revealedMasks[p.wordIdx]?.[p.charIdx] && letters.size < 6) {
        letters.add(p.plainChar);
      }
    });

    while (letters.size < 9) {
      letters.add(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
    }

    const shuffled = [...letters].sort(() => Math.random() - 0.5);
    const usedY = [];
    const list = shuffled.map((letter, i) => {
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
        ...randomVisualFrames(),
        ...makeSwimProps(),
      };
    });
    setFishList(list);
  }, [currentTargetPlain, flatLetterPositions, revealedMasks]);

  const spawnBubbles = () => {
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
    fishingSound.unlockAudio();
    fishingSound.playBgm();
    resetRound();
    setPhase('playing');
    spawnFish();
    spawnBubbles();
  };

  useEffect(() => {
    setPhase('ready');
    setIsMenuOpen(false);
    resetRound();
  }, [levelData, resetRound]);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (allCorrect && !levelSolved) {
      setLevelSolved(true);
      fishingSound.stopBgm();
      fishingSound.playSfx('win');
    }
    if (!allCorrect && levelSolved) setLevelSolved(false);
  }, [phase, allCorrect, levelSolved]);

  useEffect(() => {
    if (phase !== 'playing' || isMenuOpen || levelSolved) return;
    const tick = () => {
      setFishList(prev => prev.map(fish => tickFish(fish)));
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [phase, isMenuOpen, levelSolved]);

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
    if (chumCount <= 0 || isCasting) return;
    fishingSound.playSfx('chum');
    setChumCount(prev => prev - 1);
    spawnFish();
    setSplash({ show: true, x: 50, y: 120 });
    setTimeout(() => setSplash({ show: false, x: 0, y: 0 }), 600);
  };

  const castLineToFish = (fish) => {
    if (isCasting || levelSolved) return;
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
              let letter = currentTargetPlain;
              if (usedLetters.has(letter) || Math.random() > 0.45) {
                do {
                  letter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
                } while (usedLetters.has(letter));
              }
              return [...prev, {
                id: Date.now(),
                letter,
                value: charToIdx(letter),
                x: Math.random() > 0.5 ? 90 : 10,
                y: 60 + Math.random() * 140,
                speed: 0.3 + Math.random() * 0.4,
                ...randomVisualFrames(),
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
    setShowExplanation(true);
    setFloatingXp({ amount: 100, x: 80, y: 80 });
    setTimeout(() => setFloatingXp(null), 1200);
  };

  const handleCloseExplanation = () => {
    setShowExplanation(false);
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
            startGame();
          }}
        />
      );
    }

    return (
      <div className="fg-root">
        <GameHudBar
          title="Vigenère Fishing"
          stage={levelData.level}
          tier={tier}
          isReady={true}
          onBackToStages={onBackToStages}
          customRightContent={soundToggleButton}
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
                <div className="cq-dossier-row">
                  <span className="cq-dossier-label">KEYWORD CLUE</span>
                  <span className="cq-dossier-value yellow-mono">{levelData.keyClue}</span>
                </div>
                <div className="cq-dossier-row">
                  <span className="cq-dossier-label">HINT</span>
                  <span className="cq-dossier-value hint-text">{levelData.hint}</span>
                </div>
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
    <div className="fg-root caesar-fishing-fullscreen vigenere-fishing-fullscreen">
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
        customRightContent={soundToggleButton}
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
                    className="fg-fish-sprite-img"
                    src={fish.imgSrc}
                    alt="fish"
                    draggable={false}
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
                  className="fg-fish-sprite-img"
                  src={caughtFish.imgSrc}
                  alt="fish"
                  draggable={false}
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
        {/* 1. Top-Center Word Segment Panel + Keyword & Hint */}
        <div className="caesar-floating-word-panel">
          <div className="vg-cipher-main-row">
            {/* Keyword Badge beside cipher letters */}
            <div className="vg-cipher-key-pill" title={`Repeating Keyword: ${targetKey}`}>
              <span className="vg-pill-lbl">KEYWORD</span>
              <span className="vg-pill-val">{targetKey}</span>
            </div>

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

            {/* Solving Status Badge right beside cipher letters */}
            <div className="vg-cipher-solving-pill" title={`Active Target: Position #${currentTarget.globalIdx + 1}`}>
              <span className="vg-pill-lbl">SOLVING</span>
              <span className="vg-pill-pos">Pos #{currentTarget.globalIdx + 1}</span>
              <span className="vg-pill-keychar">(Key '{currentKeyChar}')</span>
            </div>
          </div>
          <div className="caesar-floating-hint">
            <span>💡 Keyword clue: <strong>"{levelData.keyClue}"</strong></span>
            <span style={{ margin: '0 8px', opacity: 0.4 }}>|</span>
            <span>Hint: <strong>"{levelData.hint}"</strong></span>
          </div>
        </div>

        {/* 2. Floating Reference Panel 1: Alignment (Bottom-Left) */}
        <div className="vg-floating-ref-panel">
          <div className="vg-floating-ref-header">
            <span className="vg-floating-ref-title">📖 Vigenère Alignment</span>
          </div>

          <div className="vg-pacman-title-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div className="vg-formula-prominent" style={{ margin: 0 }}>
              Formula: <strong>Plain = (Cipher − Key + 26) mod 26</strong>
            </div>
            <button
              type="button"
              className="vg-tabula-modal-btn vg-tabula-btn-compact"
              onClick={() => setShowTabula(true)}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                borderRadius: '6px',
                background: 'rgba(0, 229, 255, 0.15)',
                border: '1px solid var(--neon-cyan)',
                color: '#fff',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>grid_on</span>
              <span>Tabula Recta</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="vg-alignment-labels">
              <div>CIPHER</div>
              <div>KEY</div>
              <div>SHIFT</div>
              <div style={{ color: 'var(--neon-green)' }}>PLAIN</div>
            </div>
            <div className="vg-alignment-container">
              {alignmentItems.map(item => {
                if (item.isSpace) {
                  return <div key={item.id} style={{ width: 10, flexShrink: 0 }} />;
                }
                const isRevealed = revealedMasks[item.wordIdx]?.[item.charIdx];
                const isActive = item.globalIdx === currentTarget.globalIdx;

                return (
                  <div
                    key={item.id}
                    className={`vg-alignment-col ${isActive ? 'active-slot' : ''}`}
                    onClick={() => { if (!isCasting) setActiveTargetIdx(item.globalIdx); }}
                    title={`Pos #${item.globalIdx + 1}: ${item.cipherCh} (${charToIdx(item.cipherCh)}) − ${item.keyCh} (${item.shiftVal}) = ${isRevealed ? item.plainCh : '?'}`}
                  >
                    <span className="vg-align-cipher">{item.cipherCh}</span>
                    <span className="vg-align-key">{item.keyCh}</span>
                    <span className="vg-align-shift">-{item.shiftVal}</span>
                    <span
                      className="vg-align-plain"
                      style={{ color: isRevealed ? 'var(--neon-green)' : (isActive && hoveredFish ? 'var(--neon-cyan)' : 'var(--neon-yellow)') }}
                    >
                      {isRevealed ? item.plainCh : (isActive && hoveredFish ? hoveredFish.letter : '_')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="vg-samples-section">
            <div className="vg-samples-title">
              <span>Target Position #{currentTarget.globalIdx + 1}</span>
              <span style={{ color: 'var(--neon-cyan)', fontFamily: 'JetBrains Mono, monospace' }}>
                Key: '{currentKeyChar}' (-{currentKeyShift})
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#cbd5e1', lineHeight: '1.4' }}>
              Cipher <strong>'{currentCipherChar}'</strong> ({charToIdx(currentCipherChar)}) − Key <strong>'{currentKeyChar}'</strong> ({currentKeyShift}) = Catch fish <strong>'{revealedMasks[currentTarget.wordIdx]?.[currentTarget.charIdx] ? currentTargetPlain : '?'}'</strong>
            </div>
          </div>
        </div>

        {/* 3. Floating Chum the Waters Button (Bottom-Right, above A-Z Panel) */}
        <button
          className="vigenere-floating-chum-btn"
          onClick={handleChumWaters}
          disabled={chumCount <= 0 || isCasting}
          aria-label={`Chum the Waters, ${chumCount} left`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>waves</span>
          Chum the Waters ({chumCount} left)
        </button>

        {/* 4. Floating Reference Panel 2: A-Z Value Table & Decryption Helper (Bottom-Right) */}
        <div className={`vg-floating-key-panel vg-fishing-az-panel ${basketShake ? 'shake' : ''}`}>
          <div className="vg-floating-current-slot">
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                A–Z Value Reference
              </div>
              <div style={{ fontSize: '0.84rem', color: '#fff', fontWeight: 700 }}>
                Decryption Arithmetic
              </div>
            </div>
            <div className="vg-slot-badge-lg" style={{ fontSize: '0.9rem', padding: '2px 10px' }}>
              {solvedBlanks}/{totalBlanks} Solved
            </div>
          </div>

          {/* Active calculation card */}
          <div className="vg-fishing-calc-card">
            <div className="vg-calc-top-row">
              <span className="vg-calc-label">Active Letter Decryption:</span>
              <span className="vg-calc-badge">Pos #{currentTarget.globalIdx + 1}</span>
            </div>
            <div className="vg-calc-formula-row">
              <div className="vg-calc-item cipher">
                <span className="lbl">Cipher</span>
                <strong>{currentCipherChar}</strong>
                <span className="val">{charToIdx(currentCipherChar)}</span>
              </div>
              <span className="vg-calc-op">−</span>
              <div className="vg-calc-item key">
                <span className="lbl">Key</span>
                <strong>{currentKeyChar}</strong>
                <span className="val">{currentKeyShift}</span>
              </div>
              <span className="vg-calc-op">=</span>
              <div className="vg-calc-item plain">
                <span className="lbl">Target</span>
                <strong style={{ color: 'var(--neon-green)' }}>
                  {revealedMasks[currentTarget.wordIdx]?.[currentTarget.charIdx] ? currentTargetPlain : '?'}
                </strong>
                <span className="val">
                  {(charToIdx(currentCipherChar) - currentKeyShift + 26) % 26}
                </span>
              </div>
            </div>
          </div>

          {/* 2-row x 13-col Alphabet grid showing all 26 letters */}
          <div className="vg-sprint-alphabet-grid" style={{ marginTop: '2px' }}>
            <div className="vg-alphabet-row">
              {ALPHABET.slice(0, 13).map((ch, i) => {
                const isCipher = ch === currentCipherChar;
                const isKey = ch === currentKeyChar;
                let cellClass = "vg-alphabet-cell";
                if (isCipher) cellClass += " is-cipher";
                if (isKey) cellClass += " is-key";
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
                const isCipher = ch === currentCipherChar;
                const isKey = ch === currentKeyChar;
                let cellClass = "vg-alphabet-cell";
                if (isCipher) cellClass += " is-cipher";
                if (isKey) cellClass += " is-key";
                return (
                  <div key={ch} className={cellClass} title={`${ch} = ${val}`}>
                    <span className="vg-alpha-char">{ch}</span>
                    <span className="vg-alpha-val">{val}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <span>Attempts Remaining:</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: attemptsLeft <= 5 ? '#f87171' : 'var(--neon-green)', fontWeight: 'bold' }}>
              {attemptsLeft}
            </span>
          </div>

          {floatingXp && (
            <div className="fg-xp-pop-indicator" style={{ left: `${floatingXp.x}%`, top: `${floatingXp.y}%` }}>
              +{floatingXp.amount} XP
            </div>
          )}
        </div>

        {/* 5. Floating Secured Victory Panel when level solved */}
        {levelSolved && <VictoryConfetti isPaused={isMenuOpen} />}
        {levelSolved && (
          <div className="caesar-floating-victory-panel">
            <h3 className="caesar-victory-title">SECURED!</h3>
            <p className="caesar-victory-desc">All segments decrypted successfully.</p>
            <button
              className="fg-btn fg-btn-primary"
              onClick={handleVerifySubmit}
              style={{ width: '100%', background: 'var(--neon-green)', color: '#030914', marginTop: 10 }}
            >
              Verify & Submit
            </button>
            {onReplayNewQuestion && (
              <button
                className="fg-btn fg-btn-secondary"
                onClick={onReplayNewQuestion}
                style={{ width: '100%', marginTop: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
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
                    {ALPHABET.map((kChar, rIdx) => {
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

      {/* Shared Pause Menu */}
      <PauseMenu
        open={isMenuOpen}
        onResume={() => setIsMenuOpen(false)}
        onTutorial={() => {
          setIsMenuOpen(false);
          setPhase('ready');
        }}
        onExit={onBackToStages}
      />
    </div>
  );
}



