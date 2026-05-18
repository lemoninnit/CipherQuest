/* src/pages/FishingGame.jsx */
import React, { useState, useEffect, useRef } from 'react';
import { fishingApi } from '../api/cipherQuestApi';
import './FishingGame.css';

/* ─── Caesar helper (mirrored client-side for instant feedback) ─── */
const caesarDecrypt = (text, shift) =>
  text.replace(/[A-Za-z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base - shift + 26) % 26) + base);
  });

/* ─── Fish types for visual variety ─────────────────────────────── */
const FISH_EMOJIS = ['🐟', '🐠', '🐡', '🦈', '🐙', '🦑', '🐳', '🦐', '🦞', '🦀'];
const randomFish = () => FISH_EMOJIS[Math.floor(Math.random() * FISH_EMOJIS.length)];

/* ═══════════════════════════════════════════════════════════════════ */

export default function FishingGame() {
  /* Session state */
  const [phase, setPhase]             = useState('idle');   // idle | fishing | casting | answering | summary
  const [session, setSession]         = useState(null);     // { sessionId, shiftKey, maxAttempts }
  const [castData, setCastData]       = useState(null);     // { encryptedWord, hint, attemptNumber, … }
  const [summary, setSummary]         = useState(null);

  /* Game UI state */
  const [answer, setAnswer]           = useState('');
  const [lastResult, setLastResult]   = useState(null);     // { correct, feedback, xpEarned }
  const [score, setScore]             = useState(0);
  const [xp, setXp]                   = useState(0);
  const [fish, setFish]               = useState('🐟');
  const [bobbing, setBobbing]         = useState(false);
  const [castAnim, setCastAnim]       = useState(false);
  const [splash, setSplash]           = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  /* Leaderboard */
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const inputRef = useRef(null);

  /* ── Derived ─────────────────────────────────────────────────── */
  const attemptsLeft = session
    ? session.maxAttempts - (castData?.attemptNumber ?? 0) + (phase === 'answering' ? 1 : 0)
    : 0;

  /* ── Actions ─────────────────────────────────────────────────── */
  const startGame = async () => {
    setLoading(true); setError('');
    try {
      const data = await fishingApi.startSession();
      setSession({ sessionId: data.sessionId, shiftKey: data.shiftKey, maxAttempts: data.maxAttempts });
      setScore(0); setXp(0); setLastResult(null); setCastData(null); setSummary(null);
      setPhase('fishing');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const castLine = async () => {
    setLoading(true); setError(''); setCastAnim(true);
    setTimeout(() => setCastAnim(false), 800);

    try {
      const data = await fishingApi.cast(session.sessionId);
      setCastData(data);
      setFish(randomFish());
      setAnswer('');
      setLastResult(null);

      /* simulate "fish on the line" bob animation */
      setTimeout(() => { setBobbing(true); setSplash(true); }, 900);
      setTimeout(() => { setSplash(false); setPhase('answering'); }, 1400);

      setTimeout(() => inputRef.current?.focus(), 1500);
    } catch (e) {
      setError(e.message);
      if (e.message.includes('No attempts')) finishGame();
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    setLoading(true); setError('');
    try {
      const data = await fishingApi.submitAnswer(session.sessionId, answer);
      setLastResult({ correct: data.correct, feedback: data.feedback, xpEarned: data.xpEarned });
      setScore(data.totalScore);
      setXp(prev => prev + data.xpEarned);
      setBobbing(false);

      if (data.sessionEnded) {
        const sumData = await fishingApi.getSummary(session.sessionId);
        setSummary(sumData);
        setPhase('summary');
      } else {
        setPhase('fishing');
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const finishGame = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await fishingApi.endSession(session.sessionId);
      setSummary(data);
      setPhase('summary');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadLeaderboard = async () => {
    try {
      const data = await fishingApi.getLeaderboard();
      setLeaderboard(data);
      setShowLeaderboard(true);
    } catch (e) { setError(e.message); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') submitAnswer();
  };

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <div className="fg-root">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="fg-header">
        <div className="fg-header-left">
          <span className="fg-icon">🎣</span>
          <div>
            <h1 className="fg-title">Cipher Fishing</h1>
            <p className="fg-subtitle">Decode the catch. Reel in XP.</p>
          </div>
        </div>
        <button className="fg-btn fg-btn-ghost" onClick={loadLeaderboard}>
          🏆 Leaderboard
        </button>
      </header>

      {/* ── Error ──────────────────────────────────────────── */}
      {error && (
        <div className="fg-error" onClick={() => setError('')}>
          ⚠️ {error} <span className="fg-error-dismiss">×</span>
        </div>
      )}

      {/* ══ IDLE ════════════════════════════════════════════ */}
      {phase === 'idle' && (
        <div className="fg-idle-screen">
          <div className="fg-pond fg-pond-still">
            <div className="fg-water-ripple" />
            <div className="fg-fish-idle">🐟</div>
          </div>
          <div className="fg-idle-text">
            <h2>Welcome to the Cipher Pond</h2>
            <p>
              Cast your line and reel in an <strong>encrypted word</strong>.
              Decode it using the <strong>Caesar cipher</strong> and the shift key provided.
              Each correct answer earns XP — how many fish can you catch?
            </p>
            <div className="fg-rules">
              <div className="fg-rule">🔑 A random shift (1–25) is set per session</div>
              <div className="fg-rule">🎣 Cast → Decrypt → Catch</div>
              <div className="fg-rule">💡 Hint helps you identify the plaintext topic</div>
            </div>
          </div>
          <button className="fg-btn fg-btn-primary" onClick={startGame} disabled={loading}>
            {loading ? 'Starting…' : '🎣 Start Fishing'}
          </button>
        </div>
      )}

      {/* ══ FISHING + ANSWERING ═════════════════════════════ */}
      {(phase === 'fishing' || phase === 'answering') && session && (
        <div className="fg-game-layout">

          {/* Left – stats sidebar */}
          <aside className="fg-sidebar">
            <div className="fg-stat-card">
              <span className="fg-stat-label">Session Key</span>
              <span className="fg-stat-value fg-key">+{session.shiftKey}</span>
            </div>
            <div className="fg-stat-card">
              <span className="fg-stat-label">Score</span>
              <span className="fg-stat-value">{score} 🐟</span>
            </div>
            <div className="fg-stat-card">
              <span className="fg-stat-label">XP Earned</span>
              <span className="fg-stat-value fg-xp">+{xp}</span>
            </div>
            <div className="fg-stat-card">
              <span className="fg-stat-label">Attempts Left</span>
              <span className={`fg-stat-value ${attemptsLeft <= 3 ? 'fg-danger' : ''}`}>
                {attemptsLeft} / {session.maxAttempts}
              </span>
            </div>

            {/* Cipher reference table */}
            <div className="fg-cipher-ref">
              <p className="fg-ref-title">Caesar Shift = {session.shiftKey}</p>
              <p className="fg-ref-hint">A → {String.fromCharCode(65 + session.shiftKey > 90
                ? 65 + session.shiftKey - 26 : 65 + session.shiftKey)}</p>
              <p className="fg-ref-hint">B → {String.fromCharCode(66 + session.shiftKey > 90
                ? 66 + session.shiftKey - 26 : 66 + session.shiftKey)}</p>
              <p className="fg-ref-hint">Z → {String.fromCharCode(90 + session.shiftKey > 90
                ? 90 + session.shiftKey - 26 : 90 + session.shiftKey)}</p>
              <p className="fg-ref-formula">Plain[i] = (Cipher[i] – {session.shiftKey} + 26) mod 26</p>
            </div>

            <button className="fg-btn fg-btn-danger-sm" onClick={finishGame} disabled={loading}>
              End Session
            </button>
          </aside>

          {/* Centre – pond + action */}
          <main className="fg-main">

            {/* Pond animation */}
            <div className={`fg-pond ${bobbing ? 'fg-pond-active' : ''}`}>
              <div className="fg-water-surface" />
              <div className={`fg-line ${castAnim ? 'fg-line-cast' : ''} ${phase === 'answering' ? 'fg-line-taut' : ''}`} />
              {splash && <div className="fg-splash">💦</div>}
              {phase === 'answering' && castData && (
                <div className={`fg-caught-fish ${bobbing ? 'fg-bob' : ''}`}>
                  {fish}
                </div>
              )}
              {phase === 'fishing' && (
                <div className="fg-fish-school">
                  <span style={{ animationDelay: '0s' }}>🐟</span>
                  <span style={{ animationDelay: '.4s' }}>🐠</span>
                  <span style={{ animationDelay: '.8s' }}>🐡</span>
                </div>
              )}
            </div>

            {/* Last result banner */}
            {lastResult && (
              <div className={`fg-result-banner ${lastResult.correct ? 'fg-correct' : 'fg-wrong'}`}>
                {lastResult.feedback}
                {lastResult.correct && <span className="fg-xp-pop">+{lastResult.xpEarned} XP</span>}
              </div>
            )}

            {/* Cast button */}
            {phase === 'fishing' && (
              <button className="fg-btn fg-btn-cast" onClick={castLine} disabled={loading}>
                {loading ? '…' : '🎣 Cast Line'}
              </button>
            )}

            {/* Answer panel */}
            {phase === 'answering' && castData && (
              <div className="fg-answer-panel">
                <div className="fg-cipher-display">
                  <span className="fg-cipher-label">Encrypted Word</span>
                  <div className="fg-cipher-word">
                    {castData.encryptedWord.split('').map((ch, i) => (
                      <span key={i} className="fg-cipher-char">{ch}</span>
                    ))}
                  </div>
                  <span className="fg-hint">{castData.hint}</span>
                </div>

                {/* Live decode preview */}
                <div className="fg-preview">
                  <span className="fg-preview-label">Your decode (live preview):</span>
                  <div className="fg-preview-word">
                    {(answer
                      ? answer.toUpperCase()
                      : caesarDecrypt(castData.encryptedWord, session.shiftKey)
                    ).split('').map((ch, i) => (
                      <span key={i} className="fg-preview-char">{ch}</span>
                    ))}
                  </div>
                </div>

                <div className="fg-input-row">
                  <input
                    ref={inputRef}
                    className="fg-input"
                    type="text"
                    placeholder="Type the decrypted word…"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={20}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  <button
                    className="fg-btn fg-btn-submit"
                    onClick={submitAnswer}
                    disabled={loading || !answer.trim()}
                  >
                    {loading ? '…' : '✓ Submit'}
                  </button>
                </div>
                <p className="fg-attempt-info">
                  Attempt {castData.attemptNumber} / {castData.maxAttempts}
                </p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ══ SUMMARY ═════════════════════════════════════════ */}
      {phase === 'summary' && summary && (
        <div className="fg-summary">
          <div className="fg-summary-card">
            <div className="fg-summary-trophy">
              {summary.finalScore >= 8 ? '🏆' : summary.finalScore >= 5 ? '🥈' : '🎣'}
            </div>
            <h2 className="fg-summary-title">
              {summary.newBestScore ? '🎉 New Best Score!' : 'Session Complete!'}
            </h2>

            <div className="fg-summary-stats">
              <div className="fg-sum-stat">
                <span className="fg-sum-num">{summary.finalScore}</span>
                <span className="fg-sum-label">Fish Caught</span>
              </div>
              <div className="fg-sum-stat">
                <span className="fg-sum-num">+{summary.totalXpEarned}</span>
                <span className="fg-sum-label">XP Earned</span>
              </div>
              <div className="fg-sum-stat">
                <span className="fg-sum-num">
                  {summary.attemptsUsed}/{summary.maxAttempts}
                </span>
                <span className="fg-sum-label">Attempts Used</span>
              </div>
            </div>

            {/* Cast log */}
            <div className="fg-cast-log">
              <h3>Cast Log</h3>
              {summary.castLog.map((entry, i) => {
                const [num, plain, cipher, status] = entry.split('|');
                return (
                  <div key={i} className={`fg-log-entry ${status === 'CORRECT' ? 'fg-log-ok' : 'fg-log-miss'}`}>
                    <span className="fg-log-num">#{num}</span>
                    <span className="fg-log-cipher">{cipher}</span>
                    <span className="fg-log-arrow">→</span>
                    <span className="fg-log-plain">{plain}</span>
                    <span className="fg-log-status">{status === 'CORRECT' ? '✅' : '❌'}</span>
                  </div>
                );
              })}
            </div>

            <div className="fg-summary-actions">
              <button className="fg-btn fg-btn-primary" onClick={startGame} disabled={loading}>
                {loading ? '…' : '🎣 Play Again'}
              </button>
              <button className="fg-btn fg-btn-ghost" onClick={loadLeaderboard}>
                🏆 Leaderboard
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
              <h2>🏆 Top Fishers</h2>
              <button className="fg-modal-close" onClick={() => setShowLeaderboard(false)}>×</button>
            </div>
            {leaderboard.length === 0 ? (
              <p className="fg-empty">No scores yet. Be the first!</p>
            ) : (
              <ol className="fg-lb-list">
                {leaderboard.map((entry) => (
                  <li key={entry.rank} className={`fg-lb-entry ${entry.rank === 1 ? 'fg-lb-gold' : ''}`}>
                    <span className="fg-lb-rank">
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </span>
                    <span className="fg-lb-name">{entry.username}</span>
                    <span className="fg-lb-score">{entry.score} 🐟</span>
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