/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import GameHudBar from '../../ui/GameHudBar';
import './PlayfairGame.css';
import '../../CipherGame.css';
import PauseMenu from '../../ui/PauseMenu';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import CryptographicRecap from '../../ui/CryptographicRecap';
import VictoryConfetti from '../../ui/VictoryConfetti';
import {
  describePlayfairRule,
  transformPlayfairPair,
} from './PlayfairHelpers';
import { facingTransform, isLargeFish, makeSwimProps, onFishImgError, randomFishSprite, tickFish } from '../../core/engine/fishPhysics';
import { fishingSound } from '../../core/engine/fishingSound';
import { useFullscreen } from '../../core/hooks/useFullscreen';
import { useGameShortcuts } from '../../core/hooks/useGameShortcuts';
import { useStageSnapshotAutoSaver } from '../../core/engine/gameSnapshot';

const normalizePair = (value) => String(value || '').replace(/[^A-Z]/g, '').slice(0, 2);

const makeBubbles = () => Array.from({ length: 16 }, (_, index) => ({
  id: index,
  x: Math.random() * 100,
  size: 3 + Math.random() * 7,
  delay: Math.random() * 6,
  duration: 5 + Math.random() * 5,
}));

function makeDecoyPairs(correctPair, matrix, count) {
  const [a, b] = correctPair;
  let posA = { r: 0, c: 0 }, posB = { r: 0, c: 0 };
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (matrix[r][c] === a) posA = { r, c };
      if (matrix[r][c] === b) posB = { r, c };
    }
  }

  const decoys = new Set();
  
  // 1. Inverted pair
  if (b !== a) decoys.add(`${b}${a}`);
  
  // 2. Offsets around position A and B in 5x5 grid (±1, ±2)
  const offsets = [
    [0, 1], [0, -1], [1, 0], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
    [0, 2], [0, -2], [2, 0], [-2, 0]
  ];
  
  for (const [dr, dc] of offsets) {
    const nearA = matrix[(posA.r + dr + 5) % 5][(posA.c + dc + 5) % 5];
    const nearB = matrix[(posB.r + dr + 5) % 5][(posB.c + dc + 5) % 5];
    if (nearA !== b) decoys.add(`${nearA}${b}`);
    if (nearB !== a) decoys.add(`${a}${nearB}`);
    if (nearA !== nearB) decoys.add(`${nearA}${nearB}`);
    if (decoys.size >= count + 5) break;
  }
  
  decoys.delete(correctPair);
  const candidateArray = Array.from(decoys).filter(p => p !== correctPair);
  return candidateArray.sort(() => Math.random() - 0.5).slice(0, count);
}

function makeFishForPair(pair, matrix, tier) {
  const decoyCount = tier === 'easy' ? 7 : tier === 'medium' ? 8 : 9;
  const choices = [pair, ...makeDecoyPairs(pair, matrix, decoyCount)]
    .sort(() => Math.random() - 0.5);

  const usedY = [];
  return choices.map((candidate, index) => {
    let y;
    let attempts = 0;
    do {
      y = 30 + Math.random() * 200;
      attempts++;
    } while (usedY.some(uy => Math.abs(uy - y) < 26) && attempts < 20);
    usedY.push(y);
    return {
      id: `${Date.now()}-${index}-${candidate}`,
      pair: candidate,
      x: 2 + Math.random() * 94,
      y,
      speed: 0.11 + Math.random() * 0.18,
      ...randomFishSprite(),
      ...makeSwimProps(),
    };
  });
}

function positionKey(pos) {
  return `${pos.row}-${pos.col}`;
}

export default function PlayfairFishingGame({
  levelData,
  tier,
  snapshot,
  onVerifySubmit,
  onBackToStages,
  onReplayNewQuestion,
  onStartStageTimer,
  onSaveSnapshot,
  onClearSnapshot,
}) {
  const { containerRef, isFullscreen, toggleFullscreen } = useFullscreen();

  const matrix = levelData.matrix;
  const pairData = useMemo(() => levelData.cipherPairs.map((cipherPair, index) => {
    const transformed = transformPlayfairPair(cipherPair, matrix, 'decrypt');
    return {
      index,
      cipherPair,
      plainPair: transformed.result,
      rule: transformed.rule,
      cipherPositions: transformed.positions,
    };
  }), [levelData.cipherPairs, matrix]);

  const hasSnapshot = Boolean(snapshot?.gameState && snapshot.gameState.phase === 'playing');

  const [phase, setPhase] = useState(() => (hasSnapshot ? 'playing' : 'ready'));
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => (hasSnapshot && typeof snapshot.gameState.activeIndex === 'number' ? snapshot.gameState.activeIndex : 0));
  const [solvedPairs, setSolvedPairs] = useState(() => (hasSnapshot && Array.isArray(snapshot.gameState.solvedPairs) ? snapshot.gameState.solvedPairs : Array(pairData.length).fill(null)));
  const [misses, setMisses] = useState(() => (hasSnapshot && typeof snapshot.gameState.misses === 'number' ? snapshot.gameState.misses : 0));
  const [streak, setStreak] = useState(() => (hasSnapshot && typeof snapshot.gameState.streak === 'number' ? snapshot.gameState.streak : 0));
  const [fishList, setFishList] = useState([]);
  const [bubbles, setBubbles] = useState(() => makeBubbles());
  const [isCasting, setIsCasting] = useState(false);
  const [caughtFish, setCaughtFish] = useState(null);
  const [castTarget, setCastTarget] = useState({ x: 0, y: 0 });
  const [castProgress, setCastProgress] = useState(0);
  const [splash, setSplash] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [levelSolved, setLevelSolved] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(() => (hasSnapshot && typeof snapshot.gameState.attemptsLeft === 'number' ? snapshot.gameState.attemptsLeft : 15));
  const [chumCount, setChumCount] = useState(() => (hasSnapshot && typeof snapshot.gameState.chumCount === 'number' ? snapshot.gameState.chumCount : 3));
  const [showExplanation, setShowExplanation] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(() => (hasSnapshot ? true : false));
  const [isMuted, setIsMuted] = useState(false);

  const isRunning = phase === 'playing' && !levelSolved;
  useStageSnapshotAutoSaver(
    onSaveSnapshot,
    useCallback(() => ({
      phase: 'playing',
      activeIndex,
      solvedPairs,
      misses,
      streak,
      attemptsLeft,
      chumCount,
    }), [activeIndex, solvedPairs, misses, streak, attemptsLeft, chumCount]),
    isRunning
  );

  useEffect(() => {
    return () => { fishingSound.stopBgm(); };
  }, []);

  useEffect(() => {
    if (phase === 'playing' && !isMenuOpen) {
      fishingSound.playBgm();
    } else {
      fishingSound.pauseBgm();
    }
  }, [phase, isMenuOpen]);

  /* ── spawn fish when resuming or starting ── */
  useEffect(() => {
    if (phase === 'playing' && !isMenuOpen && fishList.length === 0 && pairData[activeIndex]) {
      setBubbles(makeBubbles());
      setFishList(makeFishForPair(pairData[activeIndex].plainPair, matrix, tier));
    }
  }, [phase, isMenuOpen, fishList.length, activeIndex, pairData, matrix, tier]);

  const toggleSound = useCallback(() => {
    const muted = fishingSound.toggleMute();
    setIsMuted(muted);
  }, []);

  useGameShortcuts({
    onToggleFullscreen: toggleFullscreen,
    onToggleMute: toggleSound,
  });

  const handleVerifySubmit = () => {
    if (onVerifySubmit) onVerifySubmit();
  };

  const handleReplay = () => {
    onClearSnapshot?.();
    setLevelSolved(false);
    onReplayNewQuestion && onReplayNewQuestion();
  };

  const animationRef = useRef(null);
  const feedbackTimer = useRef(null);
  const pondRef = useRef(null);
  const [pondHeight, setPondHeight] = useState(500);

  const [rodFacingRight, setRodFacingRight] = useState(false);

  const activePair = pairData[activeIndex];
  const currentRuleHint = activePair ? describePlayfairRule(activePair.rule, 'decrypt') : '';

  const startGame = () => {
    onClearSnapshot?.();
    fishingSound.unlockAudio();
    fishingSound.playBgm();
    setPhase('playing');
    setActiveIndex(0);
    setSolvedPairs(Array(pairData.length).fill(null));
    setMisses(0);
    setLevelSolved(false);
    setShowExplanation(false);
    setAttemptsLeft(15);
    setChumCount(3);
    setBubbles(makeBubbles());
    setFishList(makeFishForPair(pairData[0].plainPair, matrix, tier));
  };

  const prevLevelIdRef = useRef(levelData.id || `${levelData.plaintext || ''}-${levelData.pairCiphertext || ''}`);
  useEffect(() => {
    const curId = levelData.id || `${levelData.plaintext || ''}-${levelData.pairCiphertext || ''}`;
    if (prevLevelIdRef.current && prevLevelIdRef.current !== curId) {
      prevLevelIdRef.current = curId;
      setPhase('ready');
      setActiveIndex(0);
      setSolvedPairs(Array(pairData.length).fill(null));
      setMisses(0);
      setStreak(0);
      setLevelSolved(false);
      setShowExplanation(false);
      setAttemptsLeft(15);
      setChumCount(3);
      setIsMenuOpen(false);
    }
  }, [levelData, pairData.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (phase === 'playing') {
          e.preventDefault();
          setIsMenuOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  const showFeedback = (message, tone = 'info') => {
    clearTimeout(feedbackTimer.current);
    setFeedback({ message, tone });
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2600);
  };

  useEffect(() => {
    if (phase !== 'playing' || isMenuOpen || levelSolved) return undefined;
    const tick = () => {
      setFishList((prev) => prev.map((fish) => tickFish(fish, { minY: 28, maxY: 196 })));
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [phase, isMenuOpen, levelSolved]);

  const handleCatch = (fish) => {
    const candidate = normalizePair(fish.pair);
    if (candidate === activePair.plainPair) {
      fishingSound.playSfx('catch');
      const nextSolved = [...solvedPairs];
      nextSolved[activeIndex] = activePair.plainPair;
      setSolvedPairs(nextSolved);
      setMisses(0);
      showFeedback(`${candidate} is correct. ${currentRuleHint}`, 'success');
      if (activeIndex >= pairData.length - 1) {
        onClearSnapshot?.();
        fishingSound.stopBgm();
        fishingSound.playSfx('win');
        setLevelSolved(true);
      } else {
        const nextIndex = activeIndex + 1;
        setTimeout(() => {
          setActiveIndex(nextIndex);
          setFishList(makeFishForPair(pairData[nextIndex].plainPair, matrix, tier));
        }, 500);
      }
      return;
    }
    fishingSound.playSfx('lose');
    const nextMisses = misses + 1;
    setMisses(nextMisses);
    showFeedback(`${candidate} does not fit. ${currentRuleHint}`, 'error');
    setAttemptsLeft((prev) => {
      const next = Math.max(0, prev - 1);
      if (next <= 0) showFeedback('No attempts left! Try a different pair.', 'error');
      return next;
    });
    setTimeout(() => {
      setFishList((prev) => [
        ...prev,
        { ...fish, id: `${Date.now()}-${fish.pair}`, x: Math.random() > 0.5 ? 94 : 2, y: 30 + Math.random() * 200 },
      ]);
    }, 500);
  };

  const castAt = (fish) => {
    if (isCasting || phase !== 'playing' || levelSolved || attemptsLeft <= 0) return;
    fishingSound.unlockAudio();
    fishingSound.playSfx('cast');
    setIsCasting(true);
    setCaughtFish(fish);
    setFishList((prev) => prev.filter((item) => item.id !== fish.id));

    const currentPondHeight = pondRef.current?.offsetHeight || 500;
    setPondHeight(currentPondHeight);
    const tx = (fish.x / 100) * 500;
    const ty = (fish.y / currentPondHeight) * 260;
    setCastTarget({ x: tx, y: ty });
    setRodFacingRight(tx > 250);

    let start = null;
    const castOut = (timestamp) => {
      if (!start) start = timestamp;
      const progressValue = Math.min((timestamp - start) / 320, 1);
      setCastProgress(progressValue);
      if (progressValue < 1) { requestAnimationFrame(castOut); return; }
      setSplash({ x: fish.x, y: fish.y });
      setTimeout(() => setSplash(null), 450);
      setTimeout(() => {
        let reelStart = null;
        const reelIn = (reelTimestamp) => {
          if (!reelStart) reelStart = reelTimestamp;
          const reelProgress = Math.min((reelTimestamp - reelStart) / 380, 1);
          setCastProgress(1 - reelProgress);
          if (reelProgress < 1) { requestAnimationFrame(reelIn); return; }
          setIsCasting(false);
          setCaughtFish(null);
          handleCatch(fish);
        };
        requestAnimationFrame(reelIn);
      }, 60);
    };
    requestAnimationFrame(castOut);
  };

  /* Chum the Waters — same behaviour as Caesar fishing: scatters a fresh shoal
   * of candidate fish for the pair the player is currently working on. */
  const handleChumWaters = () => {
    if (chumCount <= 0 || isCasting || phase !== 'playing' || levelSolved || !activePair) return;
    fishingSound.unlockAudio();
    fishingSound.playSfx('chum');
    setChumCount((prev) => prev - 1);
    setFishList(makeFishForPair(activePair.plainPair, matrix, tier));
    setSplash({ x: 50, y: 120 });
    setTimeout(() => setSplash(null), 600);
  };

  const cipherHighlight = new Set(activePair?.cipherPositions.map(positionKey) || []);
  const pondWidth = 500;
  const rodTipX = rodFacingRight ? 390 : 110;
  const rodTipY = 60;
  const hookX = caughtFish ? rodTipX + (castTarget.x - rodTipX) * castProgress : rodTipX;
  const hookY = caughtFish ? rodTipY + (castTarget.y - rodTipY) * castProgress : rodTipY;

  if (phase === 'ready') {
    if (isOperationLoading) {
      return (
        <StageLoadingScreen
          category="playfair"
          difficulty={tier}
          stageIndex={(levelData.level || 1) - 1}
          onLoadingComplete={() => { setIsOperationLoading(false); onStartStageTimer?.(); startGame(); }}
        />
      );
    }
    return (
      <div className="pf-root" ref={containerRef}>
        <GameHudBar
          title="Playfair Fishing"
          stage={levelData.level}
          tier={tier}
          isReady={true}
          onBackToStages={onBackToStages}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          isMuted={isMuted}
          onToggleMute={toggleSound}
        />
        <main className="cq-brief-screen">
          <img className="cq-bg-img" src="/assets/fish/lobbybg/lobbybg.png" alt="Lobby Background" aria-hidden="true" />
          <div className="cq-lobby-scrim" />
          <div className="cq-dossier-card">
            <div className="cq-dossier-left-col">
              <div className="cq-dossier-sprite-frame">
                <div className="cq-dossier-sprite cq-dossier-sprite-fish" aria-hidden="true" />
              </div>
              <div className="cq-dossier-stage-code">{`OP-${String(levelData.level || 1).padStart(2, '00')}`}</div>
            </div>
            <div className="cq-dossier-right-col">
              <div className="cq-dossier-tag">MISSION BRIEF</div>
              <h2 className="cq-dossier-title">Playfair Fishing</h2>
              <p className="cq-dossier-subtitle">Playfair encrypts letter pairs through a 5x5 matrix. Use row, column, and rectangle rules to recover candidate plaintext pairs.</p>
              <hr className="cq-dossier-divider" />
              <div className="cq-dossier-data">
                <div className="cq-dossier-row"><span className="cq-dossier-label">CIPHERTEXT</span><span className="cq-dossier-value cyan-mono">{levelData.pairCiphertext}</span></div>
                <div className="cq-dossier-row"><span className="cq-dossier-label">KEYWORD</span><span className="cq-dossier-value yellow-mono">{levelData.key}</span></div>
                <div className="cq-dossier-row"><span className="cq-dossier-label">HINT</span><span className="cq-dossier-value hint-text">{levelData.hint}</span></div>
                {levelData.keyClue && (<div className="cq-dossier-row"><span className="cq-dossier-label">KEY CLUE</span><span className="cq-dossier-value yellow-mono">{levelData.keyClue}</span></div>)}
              </div>
              <div className="pf-matrix-preview" aria-label="Playfair key matrix" style={{ margin: '8px auto 16px' }}>
                {matrix.flat().map((letter) => (<span key={letter}>{letter}</span>))}
              </div>
              <p className="cq-dossier-how-it-works"><strong>Fishing rule:</strong> each fish carries a two-letter plaintext candidate. Correct catches fill the message.</p>
              <button className="cq-dossier-action-btn" onClick={() => { fishingSound.unlockAudio(); fishingSound.playBgm(); setIsOperationLoading(true); }}>Begin operation</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="fg-root caesar-fishing-fullscreen pf-fishing-fullscreen" ref={containerRef}>
      {showExplanation && (<CryptographicRecap cipherType="playfair" levelData={levelData} onUnlockNext={onVerifySubmit} />)}
      <GameHudBar
        title="Playfair Fishing"
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
        <video className="fg-pond-video" src="/assets/fish/ocean_bg.mp4" autoPlay loop muted playsInline />
        <div className="fg-pond-overlay" />
        <div className="fg-wave" />
        {bubbles.map((bubble) => (
          <div key={bubble.id} className="fg-bubble" style={{ left: `${bubble.x}%`, width: `${bubble.size}px`, height: `${bubble.size}px`, animationDelay: `${bubble.delay}s`, animationDuration: `${bubble.duration}s` }} />
        ))}
        <div className="caesar-fish-swim-lane" ref={pondRef}>
          {fishList.map((fish) => (
            <div key={fish.id} className="fg-fish-entity" style={{ left: `${fish.x}%`, top: `${fish.y}px` }} onClick={() => castAt(fish)}>
              <div className="fg-fish-facing" style={{ transform: facingTransform(fish.facing) }}>
                <img className={`fg-fish-sprite-img pf-fish-img${isLargeFish(fish.imgSrc) ? ' fg-large-fish' : ''}`} src={fish.imgSrc} alt="fish" draggable={false} onError={onFishImgError} />
              </div>
              <div className="pf-fish-badge" title={`${fish.pair} - ${currentRuleHint}`}>{fish.pair}</div>
            </div>
          ))}
          {caughtFish && (
            <div className="fg-fish-entity" style={{ left: `${(hookX / pondWidth) * 100}%`, top: `${(hookY / 260) * pondHeight - 20}px`, transform: 'scale(1.2)', pointerEvents: 'none' }}>
              <div className="fg-fish-facing" style={{ transform: facingTransform(caughtFish.facing) }}>
                <img className={`fg-fish-sprite-img pf-fish-img${isLargeFish(caughtFish.imgSrc) ? ' fg-large-fish' : ''}`} src={caughtFish.imgSrc} alt="fish" draggable={false} onError={onFishImgError} />
              </div>
              <div className="pf-fish-badge">{caughtFish.pair}</div>
            </div>
          )}
          {splash && <div className="fg-splash-effect" style={{ left: `${splash.x}%`, top: `${splash.y}px` }}>💦</div>}
        </div>

        {/* 1. Top-Center Word Panel */}
        <div className="caesar-floating-word-panel">
          <div className="vg-word-panel-title">Recovered Message</div>
          <div className="pf-pair-row">
            {pairData.map((pair, index) => (
              <button
                key={`${pair.cipherPair}-${index}`}
                className={`pf-pair-card ${index === activeIndex ? 'active' : ''} ${solvedPairs[index] ? 'solved' : ''}`}
                type="button"
                onClick={() => { if (!solvedPairs[index] && !isCasting) { setActiveIndex(index); setMisses(0); setFishList(makeFishForPair(pairData[index].plainPair, matrix, tier)); } }}
              >
                <span className="pf-cipher">{pair.cipherPair}</span>
                <span className="pf-arrow">to</span>
                <strong>{solvedPairs[index] ? pair.plainPair : '??'}</strong>
              </button>
            ))}
          </div>
          <div className="caesar-floating-hint">Hint: &quot;{levelData.hint}&quot;</div>
        </div>

        {/* Key Matrix (Bottom-Left) */}
        <div className="caesar-floating-cheat-sheet playfair-matrix-card pf-matrix-bottom-left">
          <div className="playfair-cheat-header">
            <span className="playfair-cheat-title">PLAYFAIR 5×5 MATRIX</span>
          </div>
          <div className="playfair-cheat-body">
            <div className="pf-template-matrix-grid">
              {matrix.map((row, rowIndex) =>
                row.map((letter, colIndex) => {
                  const key = `${rowIndex}-${colIndex}`;
                  const isHighlighted = cipherHighlight.has(key);
                  const displayLetter = letter === 'I' ? 'I/J' : letter;
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`pf-template-cell${isHighlighted ? ' active' : ''}`}
                    >
                      {displayLetter}
                    </div>
                  );
                })
              )}
            </div>
            {activePair && (
              <div className="pf-cheat-active-pair">
                <span className="pf-cheat-cipher-lbl">CIPHER</span>
                <span className="pf-cheat-cipher-val">{activePair.cipherPair}</span>
                <span className="pf-cheat-arrow">to</span>
                <span className="pf-cheat-plain-lbl">PLAIN</span>
                <span className="pf-cheat-plain-val">{solvedPairs[activeIndex] ? activePair.plainPair : '??'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Keyword Card (Bottom-Right) */}
        <div className="caesar-floating-cheat-sheet pf-keyword-card pf-keyword-bottom-right">
          <div className="playfair-cheat-header">
            <span className="playfair-cheat-title">KEYWORD</span>
          </div>
          <div className="pf-keyword-value">
            {levelData.key || levelData.keyword || 'BEACH'}
          </div>
        </div>

        {/* Floating Chum the Waters Button (Bottom-Right, above the Keyword Card) */}
        <button
          type="button"
          className="caesar-floating-chum-btn"
          onClick={handleChumWaters}
          disabled={chumCount <= 0 || isCasting}
          aria-label={`Chum the Waters, ${chumCount} left`}
          title="Scatter a fresh shoal of candidate pairs"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>waves</span>
          Chum the Waters ({chumCount} left)
        </button>

        {feedback && <div className={`pf-feedback ${feedback.tone}`}>{feedback.message}</div>}

        {levelSolved && <VictoryConfetti isPaused={isMenuOpen} />}
        {levelSolved && (
          <div className="caesar-floating-victory-panel">
            <h3 className="caesar-victory-title">STAGE SECURED!</h3>
            <p className="caesar-victory-desc">All pairs decrypted successfully.</p>
            <button className="fg-btn fg-btn-primary" onClick={handleVerifySubmit}>Verify &amp; Submit</button>
            {onReplayNewQuestion && (
              <button className="fg-btn fg-btn-secondary" onClick={handleReplay}>Play Again</button>
            )}
          </div>
        )}
      </div>

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
