import React, { useState, useEffect, useRef, useMemo } from 'react';
import '../../CipherGame.css';
import GameHudBar from '../../ui/GameHudBar';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import PauseMenu from '../../ui/PauseMenu';
import { facingTransform, makeSwimProps, randomVisualFrames, tickFish } from '../../core/engine/fishPhysics';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const normalizeShift = (shift = 0) => ((shift % 26) + 26) % 26;
const charToIdx = (char) => char.charCodeAt(0) - 65;
const idxToChar = (idx) => String.fromCharCode(normalizeShift(idx) + 65);
const formatShift = (shift) => `+${normalizeShift(shift)}`;

const caesarDecryptChar = (char, shift) => {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return idxToChar(code - 65 - shift);
  }
  return char;
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

const buildActiveSlotSamples = (ciphertext, plaintext, slotMap, activeSlot, activeShifts) => {
  const cipherSegs = ciphertext.split(' ');
  const words = plaintext.split(' ');
  const rows = [];

  cipherSegs.forEach((segment, wordIdx) => {
    segment.split('').forEach((cipherChar, charIdx) => {
      const slot = slotMap[wordIdx]?.[charIdx];
      if (slot !== activeSlot) return;
      rows.push({
        cipherChar,
        plainChar: caesarDecryptChar(cipherChar, activeShifts[slot] ?? 0),
        targetPlain: words[wordIdx]?.[charIdx] ?? '',
        wordIdx,
        charIdx
      });
    });
  });

  return rows;
};

export default function VigenereFishingGame({
  levelData,
  tier,
  onVerifySubmit,
  onBackToStages,
  onReplayNewQuestion
}) {
  const words = levelData.plaintext.split(' ');
  const cipherSegs = levelData.ciphertext.split(' ');
  const targetKey = levelData.targetKey || '';
  const keyLen = Math.max(1, targetKey.length);
  const targetShifts = targetKey.split('').map(charToIdx);
  const slotMap = buildSlotMap(cipherSegs, keyLen);

  const getInitialShifts = () =>
    Array.from({ length: keyLen }, (_, idx) =>
      normalizeShift(levelData.startShifts?.[idx] ?? 0)
    );

  const [phase, setPhase] = useState('ready');
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [activeShifts, setActiveShifts] = useState(getInitialShifts);
  const [activeSlot, setActiveSlot] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(Math.max(20, keyLen * 10));
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
  const [explanationStep, setExplanationStep] = useState(-1);
  const [chumCount, setChumCount] = useState(3);
  const [hoveredFish, setHoveredFish] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const animationRef = useRef(null);

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

  const activePreviewShifts = hoveredFish
    ? activeShifts.map((shift, idx) =>
        idx === activeSlot ? hoveredFish.value : shift
      )
    : activeShifts;

  const buildDecryptedSegments = (shifts) =>
    cipherSegs.map((segment, wordIdx) =>
      segment
        .split('')
        .map((cipherChar, charIdx) => {
          const slot = slotMap[wordIdx]?.[charIdx] ?? 0;
          return caesarDecryptChar(cipherChar, shifts[slot] ?? 0);
        })
        .join('')
    );

  const decryptedSegs = buildDecryptedSegments(activeShifts);
  const previewSegs = buildDecryptedSegments(activePreviewShifts);
  const activeSlotSamples = buildActiveSlotSamples(
    levelData.ciphertext,
    levelData.plaintext,
    slotMap,
    activeSlot,
    activeShifts
  );
  const allCorrect = decryptedSegs.every((segment, idx) => segment === words[idx]);
  const solvedSlots = activeShifts.filter((shift, idx) => shift === targetShifts[idx]).length;
  const currentShift = activeShifts[activeSlot] ?? 0;
  const currentKeyGuess = idxToChar(currentShift);
  const currentTargetShift = targetShifts[activeSlot] ?? 0;
  const currentTargetKey = targetKey[activeSlot] || '';

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
        const isSolved = activeShifts[slot] === targetShifts[slot];
        items.push({
          id: `${wIdx}-${cIdx}`,
          cipherCh,
          slot,
          keyCh,
          shiftVal,
          isSolved,
          isActive: slot === activeSlot,
        });
      });
    });
    return items;
  }, [cipherSegs, slotMap, targetKey, targetShifts, activeShifts, activeSlot]);

  const spawnFish = () => {
    const correctLetter = targetKey[activeSlot] || ALPHABET[0];
    const letters = new Set([correctLetter]);
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
  };

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

  const resetRound = () => {
    setActiveShifts(getInitialShifts());
    setActiveSlot(0);
    setAttemptsLeft(Math.max(20, keyLen * 10));
    setChumCount(3);
    setLevelSolved(false);
    setShowExplanation(false);
    setExplanationStep(-1);
    setHoveredFish(null);
    setIsCasting(false);
    setCaughtFish(null);
    setFloatingXp(null);
  };

  const startGame = () => {
    resetRound();
    setPhase('playing');
    spawnFish();
    spawnBubbles();
  };

  useEffect(() => {
    setPhase('ready');
    setIsMenuOpen(false);
    resetRound();
  }, [levelData]);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (allCorrect && !levelSolved) setLevelSolved(true);
    if (!allCorrect && levelSolved) setLevelSolved(false);
  }, [phase, allCorrect, levelSolved]);

  useEffect(() => {
    if (phase !== 'playing' || isMenuOpen) return;
    const tick = () => {
      setFishList(prev => prev.map(fish => tickFish(fish)));
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [phase, isMenuOpen]);

  useEffect(() => {
    if (phase !== 'playing' || isCasting) return;
    spawnFish();
  }, [activeSlot]);

  const handleChumWaters = () => {
    if (chumCount <= 0 || isCasting) return;
    setChumCount(prev => prev - 1);
    spawnFish();
    setSplash({ show: true, x: 50, y: 120 });
    setTimeout(() => setSplash({ show: false, x: 0, y: 0 }), 600);
  };

  const castLineToFish = (fish) => {
    if (isCasting || levelSolved) return;
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
          setActiveShifts(prev => {
            const next = [...prev];
            next[activeSlot] = fish.value;
            return next;
          });
          setBasketShake(true);
          setTimeout(() => setBasketShake(false), 400);
          setAttemptsLeft(prev => Math.max(0, prev - 1));

          setTimeout(() => {
            setFishList(prev => {
              const usedLetters = new Set(prev.map(item => item.letter));
              const targetLetter = targetKey[activeSlot] || ALPHABET[0];
              let letter = targetLetter;
              if (usedLetters.has(targetLetter) || Math.random() > 0.45) {
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
    setExplanationStep(-1);
    const total = levelData.plaintext.replace(/\s+/g, '').length;
    let step = -1;
    const interval = setInterval(() => {
      step++;
      setExplanationStep(step);
      if (step >= total - 1) clearInterval(interval);
    }, 600);

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
                Recover the repeating keyword one letter at a time. Slot #1 affects letters 1, {keyLen + 1}, {keyLen * 2 + 1}; slot #2 affects letters 2, {keyLen + 2}, and so on.
              </p>
              <hr className="cq-dossier-divider" />
              <div className="cq-dossier-data">
                <div className="cq-dossier-row">
                  <span className="cq-dossier-label">CIPHERTEXT</span>
                  <span className="cq-dossier-value cyan-mono">{levelData.ciphertext}</span>
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
                Catch letter fish to fill the active keyword slot. When every slot matches the keyword, the full Vigenère plaintext resolves.
              </p>
              <button className="cq-dossier-action-btn" onClick={() => setIsOperationLoading(true)}>
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
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; box-shadow: 0 0 4px rgba(0, 229, 255, 0.4); }
          100% { opacity: 1; box-shadow: 0 0 12px rgba(0, 229, 255, 0.8); }
        }
        .vg-key-slot-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
          gap: 8px;
          width: 100%;
        }
        .vg-key-slot-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 6px;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          font-family: inherit;
          transition: all 0.2s;
        }
        .vg-key-slot-btn:hover {
          background: rgba(0, 229, 255, 0.08);
          border-color: rgba(0, 229, 255, 0.3);
        }
        .vg-key-slot-btn.active {
          border-color: var(--neon-cyan);
          background: rgba(0, 229, 255, 0.15);
          color: #fff;
          box-shadow: 0 0 12px rgba(0, 229, 255, 0.2);
        }
        .vg-key-slot-btn.solved {
          border-color: var(--neon-green);
          color: var(--neon-green);
        }
        .vg-key-slot-btn div:first-child {
          font-size: 0.65rem;
          opacity: 0.7;
        }
        .vg-key-slot-btn strong {
          font-size: 1.1rem;
          color: #fff;
        }
        .vg-key-slot-btn.solved strong {
          color: var(--neon-green);
        }
        .vg-key-slot-btn div:last-child {
          font-size: 0.6rem;
          opacity: 0.5;
        }
      `}</style>

      {/* Recap & Learning Overlay */}
      {showExplanation && (
        <div className="fg-recap-overlay">
          <div className="fg-recap-modal" style={{ maxWidth: 840 }}>
            <div className="fg-recap-header">
              <span className="material-symbols-outlined fg-recap-icon" style={{ color: 'var(--neon-cyan)' }}>
                auto_stories
              </span>
              <h2 className="fg-recap-title">Keyword Decryption Recap</h2>
              <span className="fg-recap-badge">Vigenère Cipher</span>
            </div>
            <p className="fg-recap-subtitle">
              Every position was decrypted by its corresponding keyword letter shift!
            </p>
            <div className="fg-recap-segments-card">
              <div className="fg-recap-segments-grid">
                {words.map((word, wIdx) => {
                  const cipherWord = cipherSegs[wIdx];
                  const wordStartIdx = words.slice(0, wIdx).join('').length;

                  return (
                    <div key={wIdx} className="fg-recap-seg-box">
                      <div className="fg-recap-seg-label">Segment #{wIdx + 1}</div>
                      <div className="fg-recap-letters-row">
                        {cipherWord.split('').map((cipherCh, cIdx) => {
                          const globalIdx = wordStartIdx + cIdx;
                          const isRevealed = globalIdx <= explanationStep;
                          const slot = slotMap[wIdx]?.[cIdx] ?? 0;
                          const keyChar = targetKey[slot];
                          const plainCh = word[cIdx];

                          return (
                            <div
                              key={cIdx}
                              className={`fg-recap-letter-unit ${isRevealed ? 'revealed' : ''}`}
                              style={isRevealed ? { borderColor: 'var(--neon-green)', background: 'rgba(57,255,20,0.06)' } : {}}
                            >
                              <span className="fg-recap-cipher">{cipherCh}</span>
                              <span className="fg-recap-arrow">↓</span>
                              <span className="fg-recap-plain" style={{ color: isRevealed ? 'var(--neon-green)' : 'var(--text-muted)' }}>
                                {isRevealed ? plainCh : '?'}
                              </span>
                              <span className="fg-recap-shift-tag" style={{ fontSize: '0.6rem', color: 'var(--neon-cyan)' }}>
                                {keyChar}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="fg-recap-explanation" style={{ background: 'rgba(255,255,255,0.015)' }}>
              💡 <strong>Vigenère Cipher Decryption:</strong> The keyword <code>{levelData.keyword}</code> repeats continuously.
              Each letter of the keyword determines how far that column was shifted.{' '}
              <code>Plain = (Cipher - Key Letter) mod 26</code> reveals the original text.
            </div>
            <div className="fg-recap-actions" style={{ marginTop: 16 }}>
              <button
                className="fg-btn fg-btn-primary"
                onClick={handleCloseExplanation}
                disabled={explanationStep < levelData.plaintext.replace(/\s+/g, '').length - 1}
                style={{ background: 'var(--neon-green)', color: '#030914' }}
              >
                Unlock Next Objective →
              </button>
            </div>
          </div>
        </div>
      )}

      <GameHudBar
        title="Vigenère Fishing"
        stage={levelData.level}
        tier={tier}
        isReady={false}
        onOpenMenu={() => setIsMenuOpen(true)}
        attempts={attemptsLeft}
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
        {/* 1. Top-Center Word Segment Panel + Clue & Hint */}
        <div className="caesar-floating-word-panel">
          <div className="fg-word-segments-row">
            {words.map((word, wordIdx) => {
              const cipherWord = cipherSegs[wordIdx];
              const decWord = decryptedSegs[wordIdx];
              const prevWord = previewSegs[wordIdx];

              return (
                <div key={wordIdx} className="fg-word-segment-card">
                  <div className="fg-letter-cells">
                    {cipherWord.split('').map((cipherCh, charIdx) => {
                      const slot = slotMap[wordIdx]?.[charIdx] ?? 0;
                      const isActiveSlot = slot === activeSlot;
                      const maskList = levelData.masks[wordIdx];
                      const isPrefilled = tier === 'easy' && maskList?.[charIdx];
                      const isCorrect = decWord[charIdx] === word[charIdx];
                      const isHovered = tier === 'easy' && hoveredFish && isActiveSlot;
                      const letterToShow = (isPrefilled || isCorrect)
                        ? word[charIdx]
                        : (isHovered ? prevWord[charIdx] : '_');
                      const cellStyle = isActiveSlot ? {
                        borderColor: 'var(--neon-cyan)',
                        boxShadow: '0 0 12px rgba(0,229,255,0.18)'
                      } : {};
                      let cellClass = 'fg-letter-cell';
                      if (isPrefilled || isCorrect) cellClass = 'fg-letter-cell correct-plain';

                      return (
                        <div
                          key={charIdx}
                          className={cellClass}
                          style={cellStyle}
                          onClick={() => { if (!isCasting) setActiveSlot(slot); }}
                        >
                          <span className="fg-cell-ciphertext">{cipherCh}</span>
                          <span className="fg-cell-plaintext">{letterToShow}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="fg-segment-basket-badge">
                    Key pattern: {slotMap[wordIdx].map(slot => idxToChar(activeShifts[slot] ?? 0)).join('')}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="caesar-floating-hint">
            <span>💡 Keyword clue: <strong>"{levelData.keyClue}"</strong></span>
            <span style={{ margin: '0 8px', opacity: 0.4 }}>|</span>
            <span>Hint: <strong>"{levelData.hint}"</strong></span>
          </div>
        </div>

        {/* 2. Floating Reference Panel (Bottom-Left) */}
        <div className="vg-floating-ref-panel">
          <div className="vg-floating-ref-header">
            <span className="vg-floating-ref-title">📖 Vigenère Alignment</span>
            <span className="vg-floating-ref-slot-badge">
              Active: Slot #{activeSlot + 1} ({idxToChar(activeShifts[activeSlot] ?? 0)})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="vg-alignment-labels">
              <div>CIPHER</div>
              <div>KEY</div>
              <div>SHIFT</div>
            </div>
            <div className="vg-alignment-container">
              {alignmentItems.map(item => {
                if (item.isSpace) {
                  return <div key={item.id} style={{ width: 10, flexShrink: 0 }} />;
                }
                return (
                  <div
                    key={item.id}
                    className={`vg-alignment-col ${item.isActive ? 'active-slot' : ''}`}
                    onClick={() => { if (!isCasting) setActiveSlot(item.slot); }}
                    title={`Slot #${item.slot + 1} (${item.keyCh})`}
                  >
                    <span className="vg-align-cipher">{item.cipherCh}</span>
                    <span className="vg-align-key" style={{ color: item.isSolved ? 'var(--neon-green)' : 'var(--neon-cyan)' }}>
                      {item.keyCh}
                    </span>
                    <span className="vg-align-shift">+{item.shiftVal}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="vg-samples-section">
            <div className="vg-samples-title">
              <span>Slot #{activeSlot + 1} Decryptions</span>
              <span style={{ color: 'var(--neon-cyan)', fontFamily: 'JetBrains Mono, monospace' }}>
                Key: {currentKeyGuess} (-{currentShift})
              </span>
            </div>
            <div className="vg-samples-pills">
              {activeSlotSamples.slice(0, 8).map((sample, idx) => {
                const isSolved = sample.plainChar === sample.targetPlain;
                return (
                  <span key={`${sample.wordIdx}-${sample.charIdx}-${idx}`} className={`vg-sample-pill ${isSolved ? 'solved' : ''}`}>
                    <span style={{ color: 'var(--text-muted)' }}>{sample.cipherChar}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>➔</span>
                    <span style={{ color: isSolved ? 'var(--neon-green)' : 'var(--neon-yellow)', fontWeight: 'bold' }}>{sample.plainChar}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Floating Chum the Waters Button (Bottom-Right, above Key Panel) */}
        <button
          className="vigenere-floating-chum-btn"
          onClick={handleChumWaters}
          disabled={chumCount <= 0 || isCasting}
          aria-label={`Chum the Waters, ${chumCount} left`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>waves</span>
          Chum the Waters ({chumCount} left)
        </button>

        {/* 4. Floating Baskets & Key Panel (Bottom-Right) */}
        <div className={`vg-floating-key-panel ${basketShake ? 'shake' : ''}`}>
          <div className="vg-floating-current-slot">
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Keyword Slot #{activeSlot + 1}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 700 }}>
                Current Basket
              </div>
            </div>
            <div className="vg-slot-badge-lg">
              {currentKeyGuess}
            </div>
          </div>

          <div className="vg-key-slot-grid">
            {activeShifts.map((shift, idx) => {
              const solved = shift === targetShifts[idx];
              return (
                <button
                  key={idx}
                  type="button"
                  className={`vg-key-slot-btn ${idx === activeSlot ? 'active' : ''} ${solved ? 'solved' : ''}`}
                  onClick={() => { if (!isCasting) setActiveSlot(idx); }}
                >
                  <div>#{idx + 1}</div>
                  <strong>{idxToChar(shift)}</strong>
                  <div>Key Letter</div>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <span>Solved Slots:</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: solvedSlots === keyLen ? 'var(--neon-green)' : 'var(--neon-cyan)', fontWeight: 'bold' }}>
              {solvedSlots}/{keyLen}
            </span>
          </div>

          {floatingXp && (
            <div className="fg-xp-pop-indicator" style={{ left: `${floatingXp.x}%`, top: `${floatingXp.y}%` }}>
              +{floatingXp.amount} XP
            </div>
          )}
        </div>

        {/* 5. Floating Secured Victory Panel when level solved */}
        {levelSolved && (
          <div className="caesar-floating-victory-panel">
            <h3 className="caesar-victory-title">✅ SECURED!</h3>
            <p className="caesar-victory-desc">Keyword recovered and ciphertext decrypted.</p>
            <button
              className="fg-btn fg-btn-primary"
              onClick={handleVerifySubmit}
              style={{ width: '100%', background: 'var(--neon-green)', color: '#030914', marginTop: 10 }}
            >
              🚀 Verify & Submit
            </button>
            {onReplayNewQuestion && (
              <button
                className="fg-btn fg-btn-secondary"
                onClick={onReplayNewQuestion}
                style={{ width: '100%', marginTop: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              >
                🔄 Play Again
              </button>
            )}
          </div>
        )}
      </div>

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
