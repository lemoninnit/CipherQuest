/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { facingTransform, makeSwimProps, randomVisualFrames, tickFish } from '../../core/engine/fishPhysics';
import { fishingSound } from '../../core/engine/fishingSound';

const normalizePair = (value) => String(value || '').replace(/[^A-Z]/g, '').slice(0, 2);

const makeBubbles = () => Array.from({ length: 16 }, (_, index) => ({
  id: index,
  x: Math.random() * 100,
  size: 3 + Math.random() * 7,
  delay: Math.random() * 6,
  duration: 5 + Math.random() * 5,
}));

function makeDecoyPairs(correctPair, matrix, count) {
  const letters = matrix.flat();
  const decoys = new Set();
  const [a, b] = correctPair;

  decoys.add(`${b}${a}`);
  decoys.add(`${a}${letters[(letters.indexOf(b) + 1) % letters.length]}`);
  decoys.add(`${letters[(letters.indexOf(a) + 4) % letters.length]}${b}`);

  while (decoys.size < count) {
    const first = letters[Math.floor(Math.random() * letters.length)];
    const second = letters[Math.floor(Math.random() * letters.length)];
    if (first !== second) decoys.add(`${first}${second}`);
  }

  decoys.delete(correctPair);
  return [...decoys].slice(0, count);
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
      ...randomVisualFrames(),
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
  onVerifySubmit,
  onBackToStages,
  onReplayNewQuestion,
}) {
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

  const [phase, setPhase] = useState('ready');
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [solvedPairs, setSolvedPairs] = useState([]);
  const [misses, setMisses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [fishList, setFishList] = useState([]);
  const [bubbles, setBubbles] = useState([]);
  const [isCasting, setIsCasting] = useState(false);
  const [caughtFish, setCaughtFish] = useState(null);
  const [castTarget, setCastTarget] = useState({ x: 0, y: 0 });
  const [castProgress, setCastProgress] = useState(0);
  const [splash, setSplash] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [levelSolved, setLevelSolved] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(15);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

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

  const toggleSound = () => {
    const muted = fishingSound.toggleMute();
    setIsMuted(muted);
  };

  const handleVerifySubmit = () => {
    if (onVerifySubmit) onVerifySubmit();
  };

  const handleReplay = () => {
    setLevelSolved(false);
    onReplayNewQuestion && onReplayNewQuestion();
  };

  const soundToggleButton = (
    <button
      className="fg-btn-icon"
      onClick={toggleSound}
      title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '8px',
        color: '#fff',
        padding: '4px 8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        fontSize: '1rem',
      }}
    >
      {isMuted ? String.fromCodePoint(0x1F507) : String.fromCodePoint(0x1F50A)}
    </button>
  );

  const animationRef = useRef(null);
  const feedbackTimer = useRef(null);
  const rodFrameRef = useRef(null);
  const pondRef = useRef(null);
  const [pondHeight, setPondHeight] = useState(500);

  const ROD_TOTAL_FRAMES = 8;
  const [rodFrame, setRodFrame] = useState(0);
  const [rodFacingRight, setRodFacingRight] = useState(false);

  const activePair = pairData[activeIndex];
  const solvedCount = solvedPairs.filter(Boolean).length;
  const progress = pairData.length ? solvedCount / pairData.length : 0;
  const currentRuleHint = activePair ? describePlayfairRule(activePair.rule, 'decrypt') : '';
  const revealRule = tier === 'easy' || misses >= 2;

  const startGame = () => {
    fishingSound.unlockAudio();
    fishingSound.playBgm();
    setPhase('playing');
    setActiveIndex(0);
    setSolvedPairs(Array(pairData.length).fill(null));
    setMisses(0);
    setStreak(0);
    setLevelSolved(false);
    setShowExplanation(false);
    setAttemptsLeft(15);
    setBubbles(makeBubbles());
    setFishList(makeFishForPair(pairData[0].plainPair, matrix, tier));
  };

  useEffect(() => {
    setPhase('ready');
    setActiveIndex(0);
    setSolvedPairs(Array(pairData.length).fill(null));
    setMisses(0);
    setStreak(0);
    setLevelSolved(false);
    setShowExplanation(false);
    setAttemptsLeft(15);
    setIsMenuOpen(false);
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
      setStreak((value) => value + 1);
      showFeedback(`${candidate} is correct. ${currentRuleHint}`, 'success');
      if (activeIndex >= pairData.length - 1) {
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
    setStreak(0);
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

    let castFrameIndex = 2;
    const castFrameInterval = setInterval(() => {
      setRodFrame((prev) => (prev < 4 ? prev + 1 : 4));
      castFrameIndex++;
      if (castFrameIndex > 4) clearInterval(castFrameInterval);
    }, 90);
    rodFrameRef.current = castFrameInterval;

    let start = null;
    const castOut = (timestamp) => {
      if (!start) start = timestamp;
      const progressValue = Math.min((timestamp - start) / 320, 1);
      setCastProgress(progressValue);
      if (progressValue < 1) { requestAnimationFrame(castOut); return; }
      setSplash({ x: fish.x, y: fish.y });
      setTimeout(() => setSplash(null), 450);
      setTimeout(() => {
        let reelFrameIndex = 5;
        const reelFrameInterval = setInterval(() => {
          setRodFrame(reelFrameIndex);
          reelFrameIndex++;
          if (reelFrameIndex > 7) clearInterval(reelFrameInterval);
        }, 90);
        let reelStart = null;
        const reelIn = (reelTimestamp) => {
          if (!reelStart) reelStart = reelTimestamp;
          const reelProgress = Math.min((reelTimestamp - reelStart) / 380, 1);
          setCastProgress(1 - reelProgress);
          if (reelProgress < 1) { requestAnimationFrame(reelIn); return; }
          setRodFrame(0);
          setIsCasting(false);
          setCaughtFish(null);
          handleCatch(fish);
        };
        requestAnimationFrame(reelIn);
      }, 60);
    };
    requestAnimationFrame(castOut);
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
          onLoadingComplete={() => { setIsOperationLoading(false); startGame(); }}
        />
      );
    }
    return (
      <div className="pf-root">
        <GameHudBar title="Playfair Fishing" stage={levelData.level} tier={tier} isReady={true} onBackToStages={onBackToStages} customRightContent={soundToggleButton} />
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
    <div className="fg-root caesar-fishing-fullscreen pf-fishing-fullscreen">
      {showExplanation && (<CryptographicRecap cipherType="playfair" levelData={levelData} onUnlockNext={onVerifySubmit} />)}
      <GameHudBar title="Playfair Fishing" stage={levelData.level} tier={tier} isReady={false} onOpenMenu={() => setIsMenuOpen(true)} attempts={attemptsLeft} customRightContent={soundToggleButton} />
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
                <img className="fg-fish-sprite-img pf-fish-img" src={fish.imgSrc} alt="fish" draggable={false} />
              </div>
              <div className="pf-fish-badge" title={`${fish.pair} - ${currentRuleHint}`}>{fish.pair}</div>
            </div>
          ))}
          {caughtFish && (
            <div className="fg-fish-entity" style={{ left: `${(hookX / pondWidth) * 100}%`, top: `${(hookY / 260) * pondHeight - 20}px`, transform: 'scale(1.2)', pointerEvents: 'none' }}>
              <div className="fg-fish-facing" style={{ transform: facingTransform(caughtFish.facing) }}>
                <img className="fg-fish-sprite-img pf-fish-img" src={caughtFish.imgSrc} alt="fish" draggable={false} />
              </div>
              <div className="pf-fish-badge">{caughtFish.pair}</div>
            </div>
          )}
          <div className={`pf-fishing-rod${rodFacingRight ? ' facing-right' : ''}`} style={{ '--rod-frame': rodFrame, '--rod-total': ROD_TOTAL_FRAMES }} aria-hidden="true" />
          <svg className="fg-pond-svg" viewBox={`0 0 ${pondWidth} 260`} preserveAspectRatio="none">
            {caughtFish && <line x1={rodTipX} y1={rodTipY} x2={hookX} y2={hookY} className="fg-fishing-line" />}
          </svg>
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
                <strong>{pair.plainPair}</strong>
              </button>
            ))}
          </div>
          <div className="caesar-floating-hint">Hint: &quot;{levelData.hint}&quot;</div>
        </div>

        {/* 2. Top-Left Key Matrix */}
        <div className="caesar-floating-cheat-sheet">
          <div className="caesar-cheat-header">
            <span className="caesar-cheat-title">Playfair Key Matrix</span>
            <span className="caesar-cheat-badge caesar-cheat-badge-playfair">5x5 no J</span>
          </div>
          <div className="caesar-cheat-body">
            <div className="pf-cheat-matrix-grid">
              {matrix.map((row, rowIndex) =>
                row.map((letter, colIndex) => {
                  const key = `${rowIndex}-${colIndex}`;
                  const isHighlighted = cipherHighlight.has(key);
                  return (
                    <span key={`${rowIndex}-${colIndex}`} className={`pf-cheat-cell${isHighlighted ? ' pf-cheat-cell-cipher' : ''}`}>{letter}</span>
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
                <span className="pf-cheat-plain-val">{activePair.plainPair}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Bottom-Left Guide */}
        <div className="caesar-floating-guide">
          <h3 className="caesar-guide-title">Playfair Guide</h3>
          <p className="caesar-guide-desc">Playfair encrypts letter pairs (bigrams) via a 5x5 key matrix. I and J share one cell.</p>
          <p className="caesar-guide-tip">Row: move left. Col: move up. Rectangle: swap columns.</p>
        </div>

        {/* 4. Bottom-Right Stats */}
        <div className="pf-floating-stats-panel">
          <div className="pf-floating-stats-header">
            <span className="pf-floating-stats-title">Active Digraph</span>
            <span className="pf-floating-stats-count">{solvedCount}/{pairData.length} Solved</span>
          </div>
          <div className="pf-floating-active-digraph">
            <span className="pf-floating-cipher-pair">{activePair.cipherPair}</span>
            <span className="pf-floating-catch-label">catch pair #{activeIndex + 1}</span>
          </div>
          <div className="vg-progress-bar" style={{ margin: '8px 0' }}>
            <div className="vg-progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="pf-floating-stat-row">
            <span>Streak</span>
            <strong style={{ color: streak > 0 ? 'var(--neon-yellow)' : 'var(--text-muted)' }}>{streak > 0 ? `${streak}` : streak}</strong>
          </div>
          <div className="pf-floating-rule-section">
            <span className="pf-floating-rule-label">Rule Scanner</span>
            <div className={`pf-rule-pill ${revealRule ? 'revealed' : ''}`}>{revealRule ? activePair.rule : 'hidden'}</div>
            <p className="pf-sidebar-note" style={{ margin: '4px 0 0' }}>{revealRule ? currentRuleHint : '2 misses reveal the rule.'}</p>
          </div>
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

      <PauseMenu
        open={isMenuOpen}
        onResume={() => setIsMenuOpen(false)}
        onTutorial={() => { setIsMenuOpen(false); setPhase('ready'); }}
        onExit={onBackToStages}
      />
    </div>
  );
}
