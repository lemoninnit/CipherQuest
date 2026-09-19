import { useState, useEffect, useMemo, useRef } from 'react';
import './CryptographicRecap.css';
import './StageLoadingScreen.css';
import {
  generatePlayfairMatrix,
  transformPlayfairPair,
  describePlayfairRule,
} from '../core/engine/playfair';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Helper to convert character to 0-based or 1-based index
const charTo1Idx = (char) => {
  const code = (char || '').toUpperCase().charCodeAt(0);
  return code >= 65 && code <= 90 ? code - 64 : 0;
};
const charTo0Idx = (char) => {
  const code = (char || '').toUpperCase().charCodeAt(0);
  return code >= 65 && code <= 90 ? code - 65 : 0;
};
const idxToChar = (idx) => ALPHABET[((idx % 26) + 26) % 26];

export default function CryptographicRecap({
  cipherType = 'caesar', // 'caesar' | 'vigenere' | 'playfair'
  levelData = {},
  plaintext: overridePlaintext,
  ciphertext: overrideCiphertext,
  onUnlockNext,
}) {
  const plaintext = overridePlaintext || levelData.plaintext || levelData.displayPlaintext || '';
  const ciphertext = overrideCiphertext || levelData.ciphertext || '';

  const [explanationStep, setExplanationStep] = useState(-1);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [isExiting, setIsExiting] = useState(false);
  const [exitProgress, setExitProgress] = useState(0);
  const [exitStatusMsg, setExitStatusMsg] = useState('SYNCING OPERATION CLEARANCE...');
  const intervalRef = useRef(null);
  const bodyScrollRef = useRef(null);

  // Reset scroll to top on mount
  useEffect(() => {
    if (bodyScrollRef.current) {
      bodyScrollRef.current.scrollTop = 0;
    }
  }, []);

  // Staged reveal auto-scroll
  useEffect(() => {
    if (explanationStep < 0 || !bodyScrollRef.current) return;
    const activeEl = bodyScrollRef.current.querySelector(
      '.fg-recap-node.active:last-of-type, .cq-calc-chain-item.revealed:last-of-type, .cq-playfair-pair-chip.active'
    );
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [explanationStep]);

  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  const tierName = capitalize(levelData.tier || levelData.difficulty || 'Easy');
  const cipherCategoryName =
    cipherType === 'vigenere'
      ? 'Vigenère'
      : cipherType === 'playfair'
      ? 'Playfair'
      : 'Caesar';
  const stagesTitle = `${cipherCategoryName} — ${tierName} Stages`;

  /* ───────────────────────────────────────────────
     1. CAESAR DATA PREPARATION
     ─────────────────────────────────────────────── */
  const caesarData = useMemo(() => {
    if (cipherType !== 'caesar') return null;

    const words = plaintext.split(' ');
    const cipherWords = ciphertext.split(' ');
    const cleanPlain = plaintext.replace(/\s+/g, '');
    const cleanCipher = ciphertext.replace(/\s+/g, '');

    const targetShifts = levelData.targetShifts || [levelData.targetShift || levelData.shift || 0];
    const getShiftForIndex = (idx) => {
      let acc = 0;
      for (let w = 0; w < words.length; w++) {
        if (idx < acc + words[w].length) {
          const raw = targetShifts[w] ?? targetShifts[0] ?? 0;
          return ((raw % 26) + 26) % 26;
        }
        acc += words[w].length;
      }
      return ((targetShifts[0] % 26) + 26) % 26;
    };

    const letters = [];
    for (let i = 0; i < cleanPlain.length; i++) {
      const cCh = cleanCipher[i] || '';
      const pCh = cleanPlain[i] || '';
      const shift = getShiftForIndex(i);
      const cVal = charTo1Idx(cCh);
      const pVal = charTo1Idx(pCh);
      const rawSum = cVal + shift;
      const wrapped = rawSum > 26;
      const wrapCalc = wrapped
        ? `${cCh} (${cVal}) + ${shift} = ${rawSum} → ${rawSum} − 26 = ${pVal} → ${pCh}`
        : `${cCh} (${cVal}) + ${shift} = ${rawSum} → ${pCh}`;

      letters.push({
        index: i,
        cipherChar: cCh,
        plainChar: pCh,
        shift,
        cVal,
        pVal,
        rawSum,
        wrapped,
        wrapCalc,
      });
    }

    // Build shift tables for unique shifts
    const uniqueShifts = Array.from(new Set(letters.map((l) => l.shift)));
    const shiftTables = uniqueShifts.map((shiftVal) => {
      const plainRow = ALPHABET.map((_, idx) => idxToChar(idx + shiftVal));
      return {
        shiftVal,
        cipherRow: ALPHABET,
        plainRow,
      };
    });

    return {
      words,
      cipherWords,
      letters,
      shiftTables,
      totalSteps: letters.length,
    };
  }, [cipherType, plaintext, ciphertext, levelData]);

  /* ───────────────────────────────────────────────
     2. VIGENÈRE DATA PREPARATION
     ─────────────────────────────────────────────── */
  const vigenereData = useMemo(() => {
    if (cipherType !== 'vigenere') return null;

    const targetKey = (levelData.targetKey || levelData.keyword || 'KEY').toUpperCase();

    const columns = [];
    let keyIdx = 0;

    for (let i = 0; i < ciphertext.length; i++) {
      const cCh = ciphertext[i];
      const pCh = plaintext[i] || '';

      if (cCh === ' ') {
        columns.push({ isSpace: true, index: i });
        continue;
      }

      const kCh = targetKey[keyIdx % targetKey.length];
      keyIdx++;

      const cVal = charTo0Idx(cCh);
      const kVal = charTo0Idx(kCh);
      const pVal = charTo0Idx(pCh);
      const rawDiff = cVal - kVal;
      const wrapped = rawDiff < 0;
      const wrapCalc = wrapped
        ? `${cCh} (${cVal}) − ${kCh} (${kVal}) = ${rawDiff} → ${rawDiff} + 26 = ${pVal} → ${pCh}`
        : `${cCh} (${cVal}) − ${kCh} (${kVal}) = ${rawDiff} → ${pCh}`;

      columns.push({
        isSpace: false,
        index: columns.filter((c) => !c.isSpace).length,
        cipherChar: cCh,
        plainChar: pCh,
        keyChar: kCh,
        keyShift: kVal,
        cVal,
        kVal,
        pVal,
        rawDiff,
        wrapped,
        wrapCalc,
      });
    }

    const validColumns = columns.filter((c) => !c.isSpace);

    // Unique keyword shift tables
    const uniqueKeyLetters = Array.from(new Set(targetKey.split('')));
    const shiftTables = uniqueKeyLetters.map((kCh) => {
      const shiftVal = charTo0Idx(kCh);
      const plainRow = ALPHABET.map((_, idx) => idxToChar(idx - shiftVal));
      return {
        keyChar: kCh,
        shiftVal,
        cipherRow: ALPHABET,
        plainRow,
      };
    });

    return {
      targetKey,
      columns,
      validColumns,
      shiftTables,
      totalSteps: validColumns.length,
    };
  }, [cipherType, plaintext, ciphertext, levelData]);

  /* ───────────────────────────────────────────────
     3. PLAYFAIR DATA PREPARATION
     ─────────────────────────────────────────────── */
  const playfairData = useMemo(() => {
    if (cipherType !== 'playfair') return null;

    const key = (levelData.key || levelData.keyword || 'CIPHER').toUpperCase();
    const matrix = levelData.matrix || generatePlayfairMatrix(key);

    const cipherPairs =
      levelData.cipherPairs ||
      (ciphertext ? ciphertext.replace(/[^A-Z]/g, '').match(/.{1,2}/g) : []) ||
      [];

    const pairs = cipherPairs.map((cPair, index) => {
      try {
        const transformed = transformPlayfairPair(cPair, matrix, 'decrypt');
        return {
          index,
          cipherPair: cPair,
          plainPair: transformed.result,
          rule: transformed.rule,
          positions: transformed.positions,
        };
      } catch {
        return {
          index,
          cipherPair: cPair,
          plainPair: levelData.pairs?.[index] || '??',
          rule: levelData.rules?.[index] || 'rectangle',
          positions: [],
        };
      }
    });

    return {
      key,
      matrix,
      pairs,
      totalSteps: pairs.length,
    };
  }, [cipherType, ciphertext, levelData]);

  const totalSteps =
    cipherType === 'caesar'
      ? caesarData?.totalSteps || 0
      : cipherType === 'vigenere'
      ? vigenereData?.totalSteps || 0
      : playfairData?.totalSteps || 0;

  /* ───────────────────────────────────────────────
     STAGED REVEAL TIMING
     ─────────────────────────────────────────────── */
  useEffect(() => {
    let current = -1;
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      current++;
      setExplanationStep(current);
      if (current >= totalSteps - 1) {
        clearInterval(intervalRef.current);
      }
    }, 450);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [totalSteps]);

  const isFullyRevealed = explanationStep >= totalSteps - 1;

  const handleUnlockClick = () => {
    if (!isFullyRevealed || isExiting) return;
    setIsExiting(true);
  };

  /* ───────────────────────────────────────────────
     EXIT LOADING SEQUENCE (Image 2 stage-loading style)
     ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!isExiting) return;

    const duration = 1800; // 1.8s smooth exit loading sequence
    const intervalTime = 25;
    const increment = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setExitProgress((prev) => {
        const next = Math.min(prev + increment, 100);

        if (next < 35) {
          setExitStatusMsg('SYNCING OPERATION CLEARANCE & LOGGING PROTOCOLS...');
        } else if (next < 70) {
          setExitStatusMsg('UPDATING OPERATIVE CLEARANCE CREDENTIALS...');
        } else if (next < 99) {
          setExitStatusMsg('LOADING STAGE MAP & FINALIZING OBJECTIVES...');
        } else {
          setExitStatusMsg('OPERATIVE CLEARANCE VERIFIED. RETURNING TO STAGE MAP...');
        }

        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            if (onUnlockNext) onUnlockNext();
          }, 120);
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isExiting, onUnlockNext]);

  // Determine active item for Playfair highlight
  const activePlayfairIndex = hoveredIdx !== null ? hoveredIdx : Math.max(0, explanationStep);
  const activePlayfairPair = playfairData?.pairs?.[activePlayfairIndex];
  const highlightedCells = useMemo(() => {
    if (!activePlayfairPair?.positions) return new Set();
    return new Set(activePlayfairPair.positions.map((p) => `${p.row}-${p.col}`));
  }, [activePlayfairPair]);

  return (
    <div className="fg-recap-overlay cq-recap-root">
      {isExiting && (
        <div className="cq-recap-veil">
          <div className="cq-loading-screen" style={{ position: 'fixed', inset: 0, zIndex: 100000 }}>
            {/* 21:9 Full-bleed Loading Screen Background */}
            <img
              className="cq-loading-bg-img"
              src="/assets/ui/loading_screen_bg.png"
              alt="Loading Background"
              aria-hidden="true"
            />

            {/* Legibility Scrim Overlay */}
            <div className="cq-loading-scrim" />

            {/* Main HUD Loading Container */}
            <div className="cq-loading-content">
              {/* Top Operative HUD Header */}
              <div className="cq-loading-header">
                <div className="cq-loading-sub-badge">
                  <span className="material-symbols-outlined cq-pulse-icon">shield</span>
                  <span>CIPHER OPERATION DEPLOYMENT &bull; SECURE LINK</span>
                </div>
                <h1 className="cq-loading-title">{stagesTitle}</h1>
              </div>

              {/* Center Cybernetic Radar Spinner */}
              <div className="cq-loading-spinner-wrapper">
                <div className="cq-loading-ring cq-ring-outer" />
                <div className="cq-loading-ring cq-ring-inner" />
                <span className="material-symbols-outlined cq-loading-center-icon">lock</span>
              </div>

              {/* Bottom Progress Bar & Operative Status */}
              <div className="cq-loading-bar-section">
                <div className="cq-loading-status-row">
                  <span className="cq-loading-status-text">{exitStatusMsg}</span>
                  <span className="cq-loading-percent">{Math.round(exitProgress)}%</span>
                </div>
                <div className="cq-loading-track">
                  <div
                    className="cq-loading-fill"
                    style={{ width: `${exitProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="fg-recap-card cq-recap-card-expanded">
        <div className="cq-recap-header">
          <h2 className="fg-recap-title">Cryptographic Recap</h2>
          <p className="fg-recap-subtitle">Why Did This Work?</p>
        </div>

        {/* ═══════════ SCROLLABLE RECAP BODY ═══════════ */}
        <div className="cq-recap-scrollable-body" ref={bodyScrollRef}>
          {/* ═══════════ TOP ANIMATION / NODE ROW ═══════════ */}
          <div className="fg-recap-animation-box cq-recap-animation-box">
          {cipherType === 'caesar' && caesarData && (
            <div className="fg-recap-letter-row">
              {caesarData.letters.map((node) => {
                const isRevealed = explanationStep >= node.index;
                return (
                  <div
                    key={node.index}
                    className={`fg-recap-node ${isRevealed ? 'active' : 'waiting'}`}
                    onMouseEnter={() => setHoveredIdx(node.index)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <span className="fg-recap-char-cipher">{node.cipherChar}</span>
                    <span className="fg-recap-math">+{node.shift}</span>
                    <span className="fg-recap-arrow">↓</span>
                    <span className="fg-recap-char-plain">{isRevealed ? node.plainChar : '_'}</span>
                  </div>
                );
              })}
            </div>
          )}

          {cipherType === 'vigenere' && vigenereData && (
            <div className="fg-recap-letter-row cq-vigenere-recap-row">
              {vigenereData.columns.map((col, idx) => {
                if (col.isSpace) {
                  return <div key={`sp-${idx}`} className="cq-recap-space-gap" />;
                }
                const isRevealed = explanationStep >= col.index;
                return (
                  <div
                    key={idx}
                    className={`fg-recap-node ${isRevealed ? 'active' : 'waiting'}`}
                    onMouseEnter={() => setHoveredIdx(col.index)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <span className="fg-recap-char-cipher">{col.cipherChar}</span>
                    <span className="fg-recap-math">-{col.keyChar}</span>
                    <span className="fg-recap-arrow">↓</span>
                    <span className="fg-recap-char-plain">{isRevealed ? col.plainChar : '_'}</span>
                  </div>
                );
              })}
            </div>
          )}

          {cipherType === 'playfair' && playfairData && (
            <div className="fg-recap-letter-row cq-playfair-recap-row">
              {playfairData.pairs.map((pair, idx) => {
                const isRevealed = explanationStep >= idx;
                const isCurrent = activePlayfairIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`fg-recap-node cq-playfair-node ${
                      isRevealed ? 'active' : 'waiting'
                    } ${isCurrent ? 'selected-pair' : ''}`}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <span className="fg-recap-char-cipher">{pair.cipherPair}</span>
                    <span className="fg-recap-math">({pair.rule})</span>
                    <span className="fg-recap-arrow">↓</span>
                    <span className="fg-recap-char-plain">{isRevealed ? pair.plainPair : '__'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══════════ DETAILED WORKED EXPLANATION ═══════════ */}
        <div className="fg-recap-explanation cq-recap-explanation-box">
          {/* CAESAR EXPLANATION */}
          {cipherType === 'caesar' && caesarData && (
            <div className="cq-recap-body">
              <div className="cq-recap-lead">
                <strong>Caesar Cipher Decryption:</strong> Each ciphertext letter is decoded by
                applying the Caesar shift key. With <code>A = 1 … Z = 26</code>, the formula{' '}
                <code>Plain = (Cipher + Key) mod 26</code> shifts each letter back uniformly.
              </div>

              {/* Step-by-step arithmetic chain */}
              <div className="cq-recap-calc-card">
                <div className="cq-calc-card-title">Detailed Step-by-Step Arithmetic:</div>
                <div className="cq-calc-chain-grid">
                  {caesarData.letters.map((node) => (
                    <div
                      key={node.index}
                      className={`cq-calc-chain-item ${
                        explanationStep >= node.index ? 'revealed' : 'dim'
                      }`}
                    >
                      <span className="cq-calc-chain-bullet">#{node.index + 1}:</span>
                      <code>{node.wrapCalc}</code>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full Alphabet Shift Table */}
              {caesarData.shiftTables.map((table, tIdx) => (
                <div key={tIdx} className="cq-shift-table-wrap">
                  <div className="cq-shift-table-title">
                    Caesar Alphabet Shift Table {caesarData.shiftTables.length > 1 ? `— Segment #${tIdx + 1}` : ''}{' '}
                    (Shift: +{table.shiftVal})
                  </div>
                  <div className="cq-table-scroll">
                    <table className="cq-alphabet-shift-table">
                      <thead>
                        <tr>
                          <th className="cq-table-lbl">Cipher:</th>
                          {table.cipherRow.map((ch, i) => (
                            <td key={i} className="cq-cell-cipher">
                              <div className="cq-cell-char">{ch}</div>
                              <div className="cq-cell-num">{i + 1}</div>
                            </td>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th className="cq-table-lbl">Plain:</th>
                          {table.plainRow.map((ch, i) => (
                            <td key={i} className="cq-cell-plain">
                              <div className="cq-cell-char">{ch}</div>
                              <div className="cq-cell-num">{charTo1Idx(ch)}</div>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VIGENÈRE EXPLANATION */}
          {cipherType === 'vigenere' && vigenereData && (
            <div className="cq-recap-body">
              <div className="cq-recap-lead">
                <strong>Vigenère Cipher Decryption:</strong> Decryption shifts each character backward
                by the shift value of the repeating keyword <code>{vigenereData.targetKey}</code>.
                With <code>A = 0 … Z = 25</code>, the formula is{' '}
                <code>Plain[i] = (Cipher[i] − Key[i] + 26) mod 26</code>.
              </div>

              <div className="cq-recap-note-callout">
                Because the shift key changes with each letter position, identical ciphertext letters
                map to different plaintext letters, preventing single-shift frequency analysis.
              </div>

              {/* Step-by-step arithmetic chain */}
              <div className="cq-recap-calc-card">
                <div className="cq-calc-card-title">Aligned Keyword Column Calculations:</div>
                <div className="cq-calc-chain-grid">
                  {vigenereData.validColumns.map((col) => (
                    <div
                      key={col.index}
                      className={`cq-calc-chain-item ${
                        explanationStep >= col.index ? 'revealed' : 'dim'
                      }`}
                    >
                      <span className="cq-calc-chain-bullet">Col #{col.index + 1}:</span>
                      <code>{col.wrapCalc}</code>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vigenère Keyword Alphabet Shift Tables */}
              {vigenereData.shiftTables.map((table, tIdx) => (
                <div key={tIdx} className="cq-shift-table-wrap">
                  <div className="cq-shift-table-title">
                    Vigenère Row for Keyword Letter: <strong>'{table.keyChar}'</strong> (Shift: -{table.shiftVal})
                  </div>
                  <div className="cq-table-scroll">
                    <table className="cq-alphabet-shift-table">
                      <thead>
                        <tr>
                          <th className="cq-table-lbl">Cipher:</th>
                          {table.cipherRow.map((ch, i) => (
                            <td key={i} className="cq-cell-cipher">
                              <div className="cq-cell-char">{ch}</div>
                              <div className="cq-cell-num">{i}</div>
                            </td>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th className="cq-table-lbl">Plain:</th>
                          {table.plainRow.map((ch, i) => (
                            <td key={i} className="cq-cell-plain">
                              <div className="cq-cell-char">{ch}</div>
                              <div className="cq-cell-num">{charTo0Idx(ch)}</div>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PLAYFAIR EXPLANATION */}
          {cipherType === 'playfair' && playfairData && (
            <div className="cq-recap-body">
              <div className="cq-recap-lead">
                <strong>Playfair Cipher Decryption:</strong> Digraphs (2-letter pairs) are decrypted
                using a 5×5 key matrix built from keyword <code>{playfairData.key}</code> (I and J
                merged into one cell). Plaintext was formatted into pairs with 'X' padding for double
                letters and odd lengths.
              </div>

              {/* Matrix + Rule Breakdown Row */}
              <div className="cq-playfair-breakdown-row">
                {/* 5x5 Key Matrix with Highlight */}
                <div className="cq-playfair-matrix-card">
                  <div className="cq-matrix-card-title">
                    5×5 Key Matrix (Key: {playfairData.key})
                  </div>
                  <div className="cq-playfair-grid">
                    {playfairData.matrix.map((row, rIdx) =>
                      row.map((letter, cIdx) => {
                        const cellKey = `${rIdx}-${cIdx}`;
                        const isHighlighted = highlightedCells.has(cellKey);
                        return (
                          <div
                            key={cellKey}
                            className={`cq-playfair-cell ${isHighlighted ? 'highlighted' : ''}`}
                          >
                            {letter}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="cq-matrix-hint-caption">
                    Highlighted cells show active pair #{activePlayfairIndex + 1} ({activePlayfairPair?.cipherPair} → {activePlayfairPair?.plainPair})
                  </div>
                </div>

                {/* Geometry Rule Summary */}
                <div className="cq-playfair-rules-card">
                  <div className="cq-rules-card-title">Digraph Geometry Rules:</div>
                  <ul className="cq-rules-list">
                    <li>
                      <strong>Same Row:</strong> Shift <strong>left</strong> 1 column (wrap around
                      to right edge).
                    </li>
                    <li>
                      <strong>Same Column:</strong> Shift <strong>up</strong> 1 row (wrap around to
                      bottom edge).
                    </li>
                    <li>
                      <strong>Rectangle:</strong> Swap columns while preserving rows (take horizontal
                      opposite corners).
                    </li>
                  </ul>

                  {activePlayfairPair && (
                    <div className="cq-active-rule-box">
                      <div className="cq-active-rule-header">
                        Active Pair #{activePlayfairIndex + 1}: <strong>{activePlayfairPair.cipherPair}</strong> → <strong>{activePlayfairPair.plainPair}</strong>
                      </div>
                      <div className="cq-active-rule-desc">
                        Rule applied: <em>{activePlayfairPair.rule.toUpperCase()}</em> — {describePlayfairRule(activePlayfairPair.rule, 'decrypt')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Digraph table summary */}
              <div className="cq-playfair-pairs-summary">
                <div className="cq-calc-card-title">All Digraph Transformations:</div>
                <div className="cq-playfair-pairs-grid">
                  {playfairData.pairs.map((p, idx) => (
                    <div
                      key={idx}
                      className={`cq-playfair-pair-chip ${
                        idx === activePlayfairIndex ? 'active' : ''
                      }`}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      <span className="cq-chip-num">#{idx + 1}</span>
                      <span className="cq-chip-cipher">{p.cipherPair}</span>
                      <span className="cq-chip-arrow">→</span>
                      <span className="cq-chip-plain">{p.plainPair}</span>
                      <span className="cq-chip-rule">({p.rule})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* ═══════════ FIXED FOOTER ACTION BUTTON ═══════════ */}
        <div className="fg-recap-actions cq-recap-footer">
          <button
            className="fg-btn fg-btn-primary cq-unlock-btn"
            onClick={handleUnlockClick}
            disabled={!isFullyRevealed || isExiting}
          >
            {isExiting ? 'Loading Next Stage...' : 'Unlock Next Objective →'}
          </button>
        </div>
      </div>
    </div>
  );
}
