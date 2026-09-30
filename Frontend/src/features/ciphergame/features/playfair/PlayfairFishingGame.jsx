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
import { useFishingStageFail } from '../../core/hooks/useFishingStageFail';
import FishingGameOverOverlay from '../../ui/FishingGameOverOverlay';

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
  onStageFail,
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
      activeIndex,
      solvedPairs,
      misses,
      streak,
      attemptsLeft,
      chumCount,
    }), [activeIndex, solvedPairs, misses, streak, attemptsLeft, chumCount]),
    // A lost stage must not be resurrected from a stale snapshot, so stop
    // persisting as soon as the failure overlay is up.
    isRunning && !gameOver
  );

  useEffect(() => {
    return () => { fishingSound.stopBgm(); };
  }, []);

  useEffect(() => {
    if (phase === 'playing' && !isMenuOpen && !gameOver) {
      fishingSound.playBgm();
    } else {
      fishingSound.pauseBgm();
    }
  }, [phase, isMenuOpen, gameOver]);

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

  const [selectedViewingIndex, setSelectedViewingIndex] = useState(null);

  const unsolvedIndices = useMemo(() => {
    return pairData
      .map((_, idx) => idx)
      .filter((idx) => !solvedPairs[idx]);
  }, [pairData, solvedPairs]);

  const viewingIndex = (selectedViewingIndex !== null && unsolvedIndices.includes(selectedViewingIndex))
    ? selectedViewingIndex
    : (unsolvedIndices.includes(activeIndex) ? activeIndex : (unsolvedIndices[0] ?? activeIndex));

  const viewingPair = pairData[viewingIndex] || pairData[0] || {
    index: 0,
    cipherPair: '',
    plainPair: '',
    rule: 'RULE',
    cipherPositions: [],
  };

  const isViewingSolved = Boolean(solvedPairs[viewingIndex]);
  const viewingRuleHint = viewingPair ? describePlayfairRule(viewingPair.rule, 'decrypt') : '';

  const handlePrevViewingPair = (e) => {
    e?.stopPropagation?.();
    if (unsolvedIndices.length <= 1) return;
    const currentPos = unsolvedIndices.indexOf(viewingIndex);
    const prevPos = (currentPos - 1 + unsolvedIndices.length) % unsolvedIndices.length;
    setSelectedViewingIndex(unsolvedIndices[prevPos]);
  };

  const handleNextViewingPair = (e) => {
    e?.stopPropagation?.();
    if (unsolvedIndices.length <= 1) return;
    const currentPos = unsolvedIndices.indexOf(viewingIndex);
    const nextPos = (currentPos + 1) % unsolvedIndices.length;
    setSelectedViewingIndex(unsolvedIndices[nextPos]);
  };

  const viewingCipherPair = viewingPair.cipherPair || '';
  const pfMatrixLookup = useMemo(() => {
    const lookup = {};
    if (Array.isArray(matrix)) {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const letter = matrix[r]?.[c];
          if (letter) {
            lookup[letter] = { r, c };
            if (letter === 'I') lookup['J'] = { r, c };
          }
        }
      }
    }
    return lookup;
  }, [matrix]);

  const viewingC1 = viewingPair?.cipherPair?.[0] || '';
  const viewingC2 = viewingPair?.cipherPair?.[1] || '';
  const viewingPosA = viewingC1 ? pfMatrixLookup[viewingC1] : null;
  const viewingPosB = viewingC2 ? pfMatrixLookup[viewingC2] : null;

  let viewingEffectiveRule = (viewingPair?.rule || '').toLowerCase();
  if (viewingPosA && viewingPosB) {
    if (viewingPosA.r === viewingPosB.r) viewingEffectiveRule = 'row';
    else if (viewingPosA.c === viewingPosB.c) viewingEffectiveRule = 'column';
    else viewingEffectiveRule = 'rectangle';
  }

  let viewingTargetPosA = null;
  let viewingTargetPosB = null;
  if (viewingPosA && viewingPosB) {
    if (viewingEffectiveRule === 'row') {
      viewingTargetPosA = { r: viewingPosA.r, c: (viewingPosA.c + 4) % 5 };
      viewingTargetPosB = { r: viewingPosB.r, c: (viewingPosB.c + 4) % 5 };
    } else if (viewingEffectiveRule === 'column') {
      viewingTargetPosA = { r: (viewingPosA.r + 4) % 5, c: viewingPosA.c };
      viewingTargetPosB = { r: (viewingPosB.r + 4) % 5, c: viewingPosB.c };
    } else {
      viewingTargetPosA = { r: viewingPosA.r, c: viewingPosB.c };
      viewingTargetPosB = { r: viewingPosB.r, c: viewingPosA.c };
    }
  }

  const viewingT1Actual = viewingTargetPosA ? (matrix[viewingTargetPosA.r]?.[viewingTargetPosA.c] || viewingPair?.plainPair?.[0] || '?') : (viewingPair?.plainPair?.[0] || '?');
  const viewingT2Actual = viewingTargetPosB ? (matrix[viewingTargetPosB.r]?.[viewingTargetPosB.c] || viewingPair?.plainPair?.[1] || '?') : (viewingPair?.plainPair?.[1] || '?');

  const viewingHasHint0 = Boolean(levelData.fullMask?.[viewingIndex * 2]);
  const viewingHasHint1 = Boolean(levelData.fullMask?.[viewingIndex * 2 + 1]);

  const viewingT1Disp = (isViewingSolved || viewingHasHint0) ? viewingT1Actual : '?';
  const viewingT2Disp = (isViewingSolved || viewingHasHint1) ? viewingT2Actual : '?';

  let viewingRuleChipText = '⇄ RECTANGLE';
  if (viewingEffectiveRule === 'row') viewingRuleChipText = '← SAME ROW';
  else if (viewingEffectiveRule === 'column') viewingRuleChipText = '↑ SAME COLUMN';

  const isLetterHighlighted = (letter) => {
    if (!viewingCipherPair) return false;
    return (
      viewingCipherPair.includes(letter) ||
      (letter === 'I' && viewingCipherPair.includes('J')) ||
      (letter === 'J' && viewingCipherPair.includes('I'))
    );
  };

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
    resetStageFail();
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
    if (phase !== 'playing' || isMenuOpen || levelSolved || gameOver) return undefined;
    const tick = () => {
      setFishList((prev) => prev.map((fish) => tickFish(fish, { minY: 28, maxY: 196 })));
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [phase, isMenuOpen, levelSolved, gameOver]);

  const handleCatch = (fish) => {
    const candidate = normalizePair(fish.pair);
    if (candidate === activePair.plainPair) {
      fishingSound.playSfx('catch');
      const nextSolved = [...solvedPairs];
      nextSolved[activeIndex] = activePair.plainPair;
      setSolvedPairs(nextSolved);
      setMisses(0);
      showFeedback(`${candidate} is correct. ${currentRuleHint}`, 'success');
      const isAllSolved = nextSolved.every(Boolean);
      if (isAllSolved) {
        onClearSnapshot?.();
        fishingSound.stopBgm();
        fishingSound.playSfx('win');
        setLevelSolved(true);
      } else {
        const nextIndex = nextSolved.findIndex((val) => !val);
        const targetIndex = nextIndex !== -1 ? nextIndex : (activeIndex + 1) % pairData.length;
        setTimeout(() => {
          setActiveIndex(targetIndex);
          setFishList(makeFishForPair(pairData[targetIndex].plainPair, matrix, tier));
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
    if (isCasting || phase !== 'playing' || levelSolved || attemptsLeft <= 0 || gameOver) return;
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
    if (chumCount <= 0 || isCasting || phase !== 'playing' || levelSolved || gameOver || !activePair) return;
    fishingSound.unlockAudio();
    fishingSound.playSfx('chum');
    setChumCount((prev) => prev - 1);
    setFishList(makeFishForPair(activePair.plainPair, matrix, tier));
    setSplash({ x: 50, y: 120 });
    setTimeout(() => setSplash(null), 600);
  };

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

        {/* 1. Top-Center Word Progress Header */}
        <div className="caesar-floating-word-panel">
          <div className="caesar-floating-segment-card is-active">
            <div className="fg-letter-cells">
              {pairData.map((pair, index) => {
                const isSolved = Boolean(solvedPairs[index]);
                const isActive = index === activeIndex;
                const hasHint0 = !isSolved && Boolean(levelData.fullMask?.[index * 2]);
                const hasHint1 = !isSolved && Boolean(levelData.fullMask?.[index * 2 + 1]);

                let cellClass = 'fg-letter-cell pf-digraph-cell';
                if (isSolved) {
                  cellClass += ' correct-plain';
                } else if (isActive) {
                  cellClass += ' active-target';
                }

                return (
                  <button
                    key={`${pair.cipherPair}-${index}`}
                    className={cellClass}
                    type="button"
                    onClick={() => {
                      if (!isSolved && !isCasting) {
                        setActiveIndex(index);
                        setMisses(0);
                        setFishList(makeFishForPair(pairData[index].plainPair, matrix, tier));
                      }
                    }}
                    title={`Cipher: ${pair.cipherPair} → ${isSolved ? pair.plainPair : '??'}`}
                  >
                    <span className="fg-cell-ciphertext">{pair.cipherPair}</span>
                    <span className="fg-cell-plaintext">
                      {isSolved ? (
                        pair.plainPair
                      ) : (
                        <>
                          {hasHint0 ? <span className="pf-hint-char">{pair.plainPair[0]}</span> : '_'}
                          {hasHint1 ? <span className="pf-hint-char">{pair.plainPair[1]}</span> : '_'}
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {levelData.hint && (
            <div className="caesar-floating-hint">
              💡 Hint: <strong>"{levelData.hint}"</strong>
            </div>
          )}
        </div>

        {/* Bottom-Left Group: 5×5 Matrix (left) + Active Digraph Decryption (right) */}
        <div className="pf-bottom-left-group">
          {/* 1. 5×5 Matrix (Left) */}
          <div className="caesar-floating-cheat-sheet playfair-matrix-card pf-matrix-panel">
            <div className="vg-floating-current-slot" style={{ marginBottom: '6px' }}>
              <div className="vg-arithmetic-title-stacked">
                <span className="vg-arithmetic-title-line">PLAYFAIR</span>
                <span className="vg-arithmetic-title-line">5×5 MATRIX</span>
              </div>
              <span className="vg-calc-badge">Key: {levelData.key || 'KEY'}</span>
            </div>
            <div className="playfair-cheat-body">
              <div className="pf-template-matrix-grid">
                {matrix.map((row, rowIndex) =>
                  row.map((letter, colIndex) => {
                    const isCipherActive = (viewingPosA && viewingPosA.r === rowIndex && viewingPosA.c === colIndex) || (viewingPosB && viewingPosB.r === rowIndex && viewingPosB.c === colIndex);
                    const isTargetAActive = (isViewingSolved || viewingHasHint0) && viewingTargetPosA && viewingTargetPosA.r === rowIndex && viewingTargetPosA.c === colIndex;
                    const isTargetBActive = (isViewingSolved || viewingHasHint1) && viewingTargetPosB && viewingTargetPosB.r === rowIndex && viewingTargetPosB.c === colIndex;
                    const isTargetActive = isTargetAActive || isTargetBActive;
                    const displayLetter = letter === 'I' ? 'I/J' : letter;
                    let cellClass = 'pf-template-cell';
                    if (isCipherActive) cellClass += ' cipher-active active';
                    else if (isTargetActive) cellClass += ' target-active';

                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={cellClass}
                      >
                        {displayLetter}
                      </div>
                    );
                  })
                )}
                {(viewingEffectiveRule === 'row' || viewingEffectiveRule === 'column') && viewingPosA && viewingPosB && (
                  <svg
                    className="pf-matrix-lines-overlay"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <marker
                        id="pf-arrow-amber-fishing"
                        viewBox="0 0 6 6"
                        refX="5"
                        refY="3"
                        markerWidth="4"
                        markerHeight="4"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 0 L 6 3 L 0 6 z" fill="#ffc146" />
                      </marker>
                    </defs>
                    {viewingEffectiveRule === 'row' && (
                      <>
                        {viewingPosA.c > 0 ? (
                          <line
                            x1={(viewingPosA.c + 0.5) * 20}
                            y1={(viewingPosA.r + 0.5) * 20}
                            x2={(viewingPosA.c - 1 + 0.5) * 20}
                            y2={(viewingPosA.r + 0.5) * 20}
                            stroke="#ffc146"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            markerEnd="url(#pf-arrow-amber-fishing)"
                          />
                        ) : (
                          <>
                            <line
                              x1={(viewingPosA.c + 0.5) * 20}
                              y1={(viewingPosA.r + 0.5) * 20}
                              x2="0"
                              y2={(viewingPosA.r + 0.5) * 20}
                              stroke="#ffc146"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            <line
                              x1="100"
                              y1={(viewingPosA.r + 0.5) * 20}
                              x2={(4 + 0.5) * 20}
                              y2={(viewingPosA.r + 0.5) * 20}
                              stroke="#ffc146"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              markerEnd="url(#pf-arrow-amber-fishing)"
                            />
                          </>
                        )}
                        {viewingPosB.c > 0 ? (
                          <line
                            x1={(viewingPosB.c + 0.5) * 20}
                            y1={(viewingPosB.r + 0.5) * 20}
                            x2={(viewingPosB.c - 1 + 0.5) * 20}
                            y2={(viewingPosB.r + 0.5) * 20}
                            stroke="#ffc146"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            markerEnd="url(#pf-arrow-amber-fishing)"
                          />
                        ) : (
                          <>
                            <line
                              x1={(viewingPosB.c + 0.5) * 20}
                              y1={(viewingPosB.r + 0.5) * 20}
                              x2="0"
                              y2={(viewingPosB.r + 0.5) * 20}
                              stroke="#ffc146"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            <line
                              x1="100"
                              y1={(viewingPosB.r + 0.5) * 20}
                              x2={(4 + 0.5) * 20}
                              y2={(viewingPosB.r + 0.5) * 20}
                              stroke="#ffc146"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              markerEnd="url(#pf-arrow-amber-fishing)"
                            />
                          </>
                        )}
                      </>
                    )}
                    {viewingEffectiveRule === 'column' && (
                      <>
                        {viewingPosA.r > 0 ? (
                          <line
                            x1={(viewingPosA.c + 0.5) * 20}
                            y1={(viewingPosA.r + 0.5) * 20}
                            x2={(viewingPosA.c + 0.5) * 20}
                            y2={(viewingPosA.r - 1 + 0.5) * 20}
                            stroke="#ffc146"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            markerEnd="url(#pf-arrow-amber-fishing)"
                          />
                        ) : (
                          <>
                            <line
                              x1={(viewingPosA.c + 0.5) * 20}
                              y1={(viewingPosA.r + 0.5) * 20}
                              x2={(viewingPosA.c + 0.5) * 20}
                              y2="0"
                              stroke="#ffc146"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            <line
                              x1={(viewingPosA.c + 0.5) * 20}
                              y1="100"
                              x2={(viewingPosA.c + 0.5) * 20}
                              y2={(4 + 0.5) * 20}
                              stroke="#ffc146"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              markerEnd="url(#pf-arrow-amber-fishing)"
                            />
                          </>
                        )}
                        {viewingPosB.r > 0 ? (
                          <line
                            x1={(viewingPosB.c + 0.5) * 20}
                            y1={(viewingPosB.r + 0.5) * 20}
                            x2={(viewingPosB.c + 0.5) * 20}
                            y2={(viewingPosB.r - 1 + 0.5) * 20}
                            stroke="#ffc146"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            markerEnd="url(#pf-arrow-amber-fishing)"
                          />
                        ) : (
                          <>
                            <line
                              x1={(viewingPosB.c + 0.5) * 20}
                              y1={(viewingPosB.r + 0.5) * 20}
                              x2={(viewingPosB.c + 0.5) * 20}
                              y2="0"
                              stroke="#ffc146"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            <line
                              x1={(viewingPosB.c + 0.5) * 20}
                              y1="100"
                              x2={(viewingPosB.c + 0.5) * 20}
                              y2={(4 + 0.5) * 20}
                              stroke="#ffc146"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              markerEnd="url(#pf-arrow-amber-fishing)"
                            />
                          </>
                        )}
                      </>
                    )}
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* 2. Active Digraph Decryption (Right) */}
          {viewingPair && (
            <div className="caesar-floating-cheat-sheet pf-digraph-panel">
              <div className="vg-fishing-calc-card">
                <div className="vg-calc-top-row">
                  <span className="vg-calc-label">ACTIVE DIGRAPH DECRYPTION</span>
                  <span className="vg-calc-badge vg-pos-stepper">
                    <button
                      type="button"
                      className="vg-pos-stepper-btn"
                      onClick={handlePrevViewingPair}
                      disabled={unsolvedIndices.length <= 1}
                      aria-label="Previous unsolved pair"
                    >
                      ‹
                    </button>
                    <span className="vg-pos-stepper-label">Pair #{viewingIndex + 1}</span>
                    <button
                      type="button"
                      className="vg-pos-stepper-btn"
                      onClick={handleNextViewingPair}
                      disabled={unsolvedIndices.length <= 1}
                      aria-label="Next unsolved pair"
                    >
                      ›
                    </button>
                  </span>
                </div>
                <div className="pf-calc-formula-row">
                  <div className="pf-calc-box cipher">
                    <span className="lbl">CIPHER</span>
                    <strong className="val">{viewingPair.cipherPair}</strong>
                  </div>
                  <div className="pf-calc-box rule-chip">
                    <span className="lbl">RULE</span>
                    <strong className="val">{viewingRuleChipText}</strong>
                  </div>
                  <div className={`pf-calc-box target ${isViewingSolved ? 'is-solved' : ''}`}>
                    <span className="lbl">TARGET</span>
                    <strong className="val">
                      {isViewingSolved ? (
                        viewingPair.plainPair
                      ) : (
                        <>
                          {viewingHasHint0 ? (
                            <span className="pf-hint-char">{viewingPair.plainPair[0]}</span>
                          ) : (
                            '?'
                          )}
                          {viewingHasHint1 ? (
                            <span className="pf-hint-char">{viewingPair.plainPair[1]}</span>
                          ) : (
                            '?'
                          )}
                        </>
                      )}
                    </strong>
                  </div>
                </div>

                <div className="pf-trace-block">
                  <div className="pf-trace-line cipher-line">
                    {viewingPosA && viewingPosB
                      ? `${viewingC1} r${viewingPosA.r} c${viewingPosA.c}   ${viewingC2} r${viewingPosB.r} c${viewingPosB.c}`
                      : `${viewingPair.cipherPair}`}
                  </div>
                  <div className="pf-trace-line rule-line">
                    {viewingEffectiveRule === 'row'
                      ? `same row (r${viewingPosA?.r ?? 0})`
                      : viewingEffectiveRule === 'column'
                      ? `same column (c${viewingPosA?.c ?? 0})`
                      : 'different row + column'}
                  </div>
                  <div className="pf-trace-line rule-line">
                    {viewingEffectiveRule === 'row'
                      ? 'same row → wrap around'
                      : viewingEffectiveRule === 'column'
                      ? 'same column ↓ wrap around'
                      : 'rectangle ⇄ swap'}
                  </div>
                  <div className="pf-trace-line target-line">
                    {viewingTargetPosA && viewingTargetPosB
                      ? `${viewingT1Disp} r${viewingTargetPosA.r} c${viewingTargetPosA.c}   ${viewingT2Disp} r${viewingTargetPosB.r} c${viewingTargetPosB.c}`
                      : `${viewingT1Disp}${viewingT2Disp}`}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Bottom-Center Floating Keyword Pill */}
        <div className="vg-fishing-bottom-keyword" title={`Keyword: ${levelData.key || levelData.keyword || 'BEACH'}`}>
          <span className="vg-pill-lbl">KEYWORD</span>
          <span className="vg-pill-val">{levelData.key || levelData.keyword || 'BEACH'}</span>
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
              {isCasting ? 'Chumming...' : `Scatter Pairs (${chumCount} Left)`}
            </button>
          ) : (
            <div className="skill-hint-label">No chum bait left</div>
          )}
        </div>

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

      <FishingGameOverOverlay
        open={gameOver}
        onRetry={startGame}
        onExit={onBackToStages}
      />

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
