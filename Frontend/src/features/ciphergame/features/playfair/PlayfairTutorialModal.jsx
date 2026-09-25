import React, { useState, useEffect } from 'react';
import './PlayfairTutorialModal.css';

/**
 * PLAYFAIR MATRIX CIPHER TUTORIAL STEPS METADATA
 * Refactored for HUD-style tactical intel cards & gamified micro-copy
 */
const TUTORIAL_STEPS = [
  {
    id: 1,
    title: 'Polygraphic Pair Substitution',
    subtitle: 'What is Playfair Matrix?',
    icon: 'grid_on',
    conceptTag: 'DIRECTIVE 01 // FOUNDATION',
    intel1: {
      tag: 'CORE MECHANIC',
      title: '5×5 Letter Matrix',
      text: (
        <>
          Unlike single-letter ciphers, Playfair encrypts <strong>pairs of letters (digraphs)</strong> using a 5×5 matrix created from a secret keyword.
        </>
      )
    },
    intel2: {
      tag: 'OPERATIVE RULE',
      title: 'I/J Cell Merging',
      text: (
        <>
          Because 5×5 holds 25 cells, letters <strong>I and J</strong> are combined into a single matrix position to accommodate all 26 alphabet characters.
        </>
      )
    }
  },
  {
    id: 2,
    title: 'Digraph Pairing & Preprocessing',
    subtitle: 'Preparing Message Digraphs',
    icon: 'tune',
    conceptTag: 'DIRECTIVE 02 // KEY MECHANICS',
    intel1: {
      tag: 'ALGORITHM',
      title: 'Pairing & Filler Insertion',
      text: (
        <>
          Split message into 2-letter blocks. If a pair contains duplicate letters (e.g. <strong>LL</strong>), insert an <strong>X</strong> filler (forming <strong>LX L</strong>).
        </>
      )
    },
    intel2: {
      tag: 'TRY IT NOW',
      title: 'Interactive Digraph Test',
      text: (
        <>
          Select a <strong>preset message</strong> below to observe how duplicate pairs split automatically and odd message lengths get padded with <strong>X</strong>.
        </>
      )
    }
  },
  {
    id: 3,
    title: 'Encrypting a Message',
    subtitle: 'Matrix Geometric Transformations',
    icon: 'lock',
    conceptTag: 'DIRECTIVE 03 // ENCRYPTION PIPELINE',
    intel1: {
      tag: 'OPERATION',
      title: '3 Geometric Rules',
      text: (
        <>
          1. <strong>Rectangle</strong>: Swap column corners.<br />
          2. <strong>Same Row</strong>: Shift 1 tile right.<br />
          3. <strong>Same Column</strong>: Shift 1 tile down.
        </>
      )
    },
    intel2: {
      tag: 'PROTOCOL',
      title: 'Matrix Wrap-Around',
      text: (
        <>
          When shifting off the edge of a row or column, wrap around continuously to the <strong>opposite side</strong> of the matrix.
        </>
      )
    }
  },
  {
    id: 4,
    title: 'Decrypting Intercepted Data',
    subtitle: 'Reversing Matrix Transformations',
    icon: 'lock_open',
    conceptTag: 'DIRECTIVE 04 // DECRYPTION PIPELINE',
    intel1: {
      tag: 'DECRYPTION',
      title: 'Inverse Direction Lookup',
      text: (
        <>
          To reverse encryption: Same Row shifts <strong>left</strong>, Same Column shifts <strong>up</strong>, and Rectangle swap remains <strong>identical</strong>.
        </>
      )
    },
    intel2: {
      tag: 'CLEANUP RULE',
      title: 'Filler Character Stripping',
      text: (
        <>
          Once decrypted, remove any operational <strong>X</strong> padding characters to recover the original readable plaintext message.
        </>
      )
    }
  },
  {
    id: 5,
    title: 'Cryptanalysis & Weaknesses',
    subtitle: 'Digraph Frequency Analysis',
    icon: 'warning',
    conceptTag: 'DIRECTIVE 05 // CRYPTANALYSIS',
    intel1: {
      tag: 'VULNERABILITY',
      title: 'Bi-Gram Pattern Analysis',
      text: (
        <>
          While single-letter frequency is destroyed, Playfair is vulnerable to frequency analysis across the <strong>676 possible digraph pairs</strong> ($26 \times 26$).
        </>
      )
    },
    intel2: {
      tag: 'MISSION READY',
      title: 'Operational Status',
      text: (
        <>
          Briefing complete! You are ready to crack matrix-encrypted dispatches in <strong>CipherQuest stages</strong>.
        </>
      )
    }
  }
];

// Matrix grid preset: Keyword "MONARCHY"
const MATRIX_GRID = [
  ['M', 'O', 'N', 'A', 'R'],
  ['C', 'H', 'Y', 'B', 'D'],
  ['E', 'F', 'G', 'I/J', 'K'],
  ['L', 'P', 'Q', 'S', 'T'],
  ['U', 'V', 'W', 'X', 'Z']
];

// Sample messages for Step 2
const DIGRAPH_PRESETS = [
  { label: 'BALLOON', raw: 'BALLOON', pairs: ['BA', 'LX', 'LO', 'ON'] },
  { label: 'SECRET', raw: 'SECRET', pairs: ['SE', 'CR', 'ET'] },
  { label: 'MEET ME', raw: 'MEETME', pairs: ['ME', 'EX', 'TM', 'EX'] },
  { label: 'ATTACK', raw: 'ATTACK', pairs: ['AT', 'TA', 'CK'] }
];

export default function PlayfairTutorialModal({ isOpen, onClose, onComplete, skipButtonText = 'Skip Tutorial' }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // Step 2 state: Selected digraph preset
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);

  // Step 3 animation state: Active Rule Tab (0: Rectangle, 1: Same Row, 2: Same Column)
  const [activeRuleIdx, setActiveRuleIdx] = useState(0);

  // Step 5 animation state: Bi-gram scanner
  const [scanPairIdx, setScanPairIdx] = useState(0);
  const [scannerFound, setScannerFound] = useState(false);

  const sampleDigraphScans = ['TH', 'HE', 'IN', 'ER', 'AN', 'RE', 'ND', 'AT', 'ON', 'NT'];

  // Reset states when changing step or reopening
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setCurrentStep(0);
      setSelectedPresetIdx(0);
      setActiveRuleIdx(0);
      setScanPairIdx(0);
      setScannerFound(false);
      setIsPlaying(true);
    }
  }, [isOpen]);

  // Smooth exit handler
  const triggerClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onClose) onClose();
    }, 220);
  };

  const triggerComplete = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onComplete) onComplete();
      if (onClose) onClose();
    }, 220);
  };

  // Keyboard navigation & Esc key handler
  useEffect(() => {
    if (!isOpen || isClosing) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        triggerClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing, currentStep]);

  // Loop Step 3 active geometric rule tab automatically
  useEffect(() => {
    if (!isOpen || currentStep !== 2 || !isPlaying || isClosing) return;
    const timer = setInterval(() => {
      setActiveRuleIdx((prev) => (prev + 1) % 3);
    }, 2400);
    return () => clearInterval(timer);
  }, [isOpen, currentStep, isPlaying, isClosing]);

  // Loop Step 5 Bi-gram pattern scanner
  useEffect(() => {
    if (!isOpen || currentStep !== 4 || !isPlaying || isClosing) return;
    const timer = setInterval(() => {
      setScanPairIdx((prev) => {
        const next = (prev + 1) % sampleDigraphScans.length;
        setScannerFound(next === 0); // 'TH' match found
        return next;
      });
    }, 850);
    return () => clearInterval(timer);
  }, [isOpen, currentStep, isPlaying, isClosing]);

  if (!isOpen) return null;

  const stepData = TUTORIAL_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      triggerComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     ANIMATION VIEWPORT RENDERER PER STEP
  ───────────────────────────────────────────────────────────── */
  const renderAnimationViewport = () => {
    switch (currentStep) {
      case 0: {
        // Step 1: 5x5 Key Matrix Visualizer
        const keywordChars = ['M', 'O', 'N', 'A', 'R', 'C', 'H', 'Y'];
        return (
          <div className="cq-tut-viewport cq-pf-step1-viewport">
            <div className="cq-tut-laser-scanline" />
            <div className="cq-pf-matrix-wrapper">
              <div className="cq-pf-matrix-title">KEYWORD MATRIX: MONARCHY</div>
              <div className="cq-pf-matrix-grid">
                {MATRIX_GRID.map((row, rIdx) => (
                  <div key={`row-${rIdx}`} className="cq-pf-grid-row">
                    {row.map((cell, cIdx) => {
                      const isKeyword = keywordChars.includes(cell);
                      const isMerged = cell === 'I/J';
                      return (
                        <div
                          key={`cell-${rIdx}-${cIdx}`}
                          className={`cq-pf-grid-cell ${isKeyword ? 'cq-pf-cell-key' : ''} ${isMerged ? 'cq-pf-cell-merged' : ''}`}
                        >
                          <span className="cq-pf-cell-coord">{rIdx},{cIdx}</span>
                          <span className="cq-pf-cell-char">{cell}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="cq-pf-matrix-caption">
              <span className="material-symbols-outlined">grid_on</span>
              <span>5&times;5 Matrix (25 Cells) &bull; I and J Share Cell (2,3)</span>
            </div>
          </div>
        );
      }

      case 1: {
        // Step 2: Interactive Digraph Splitter & X-Padding Simulator
        const activePreset = DIGRAPH_PRESETS[selectedPresetIdx];
        return (
          <div className="cq-tut-viewport cq-pf-step2-viewport">
            <div className="cq-pf-preset-controls">
              <span className="cq-pf-controls-label">SELECT MESSAGE PRESET:</span>
              {DIGRAPH_PRESETS.map((preset, pIdx) => (
                <button
                  key={preset.label}
                  className={`cq-pf-preset-btn ${selectedPresetIdx === pIdx ? 'active' : ''}`}
                  onClick={() => setSelectedPresetIdx(pIdx)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="cq-pf-digraph-pipeline">
              <div className="cq-pf-pipeline-raw">
                <span className="cq-pf-pipeline-label">RAW TEXT:</span>
                <span className="cq-pf-raw-text">{activePreset.raw}</span>
              </div>

              <div className="cq-pf-pipeline-arrow">
                <span className="material-symbols-outlined">south</span>
                <span>Split Digraphs &amp; Insert 'X' Fillers</span>
              </div>

              <div className="cq-pf-pipeline-pairs">
                <span className="cq-pf-pipeline-label">PREPARED DIGRAPHS:</span>
                <div className="cq-pf-pairs-row">
                  {activePreset.pairs.map((pair, idx) => {
                    const hasX = pair.includes('X');
                    return (
                      <div key={`pair-${idx}`} className={`cq-pf-pair-box ${hasX ? 'cq-pf-pair-has-x' : ''}`}>
                        {pair.split('').map((char, cIdx) => (
                          <span
                            key={`char-${idx}-${cIdx}`}
                            className={`cq-pf-pair-char ${char === 'X' ? 'cq-pf-char-x' : ''}`}
                          >
                            {char}
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 2: {
        // Step 3: Interactive Matrix Rule Stepper (Rectangle, Row, Col)
        const rules = [
          {
            name: 'RECTANGLE RULE',
            desc: 'Cross-corner swap: (0,3) & (2,1) -> Swap Columns',
            digraphIn: 'TH',
            digraphOut: 'RI',
            highlightsIn: [[0, 3], [2, 1]], // T & H
            highlightsOut: [[0, 1], [2, 3]] // R & I
          },
          {
            name: 'SAME ROW RULE',
            desc: 'Shift right (+1 col): M (0,0) & A (0,3) -> O (0,1) & R (0,4)',
            digraphIn: 'MA',
            digraphOut: 'OR',
            highlightsIn: [[0, 0], [0, 3]],
            highlightsOut: [[0, 1], [0, 4]]
          },
          {
            name: 'SAME COL RULE',
            desc: 'Shift down (+1 row): C (1,0) & E (2,0) -> E (2,0) & L (3,0)',
            digraphIn: 'CE',
            digraphOut: 'EL',
            highlightsIn: [[1, 0], [2, 0]],
            highlightsOut: [[2, 0], [3, 0]]
          }
        ];

        const activeRule = rules[activeRuleIdx];

        return (
          <div className="cq-tut-viewport cq-pf-step3-viewport">
            {/* Rule Selector Tabs */}
            <div className="cq-pf-rule-tabs">
              {rules.map((r, rIdx) => (
                <button
                  key={r.name}
                  className={`cq-pf-rule-tab ${activeRuleIdx === rIdx ? 'active' : ''}`}
                  onClick={() => setActiveRuleIdx(rIdx)}
                >
                  {r.name}
                </button>
              ))}
            </div>

            <div className="cq-pf-rule-display">
              {/* Matrix with glowing Rule Highlights */}
              <div className="cq-pf-mini-matrix">
                {MATRIX_GRID.map((row, rIdx) => (
                  <div key={`r3-row-${rIdx}`} className="cq-pf-grid-row">
                    {row.map((cell, cIdx) => {
                      const isIn = activeRule.highlightsIn.some(([r, c]) => r === rIdx && c === cIdx);
                      const isOut = activeRule.highlightsOut.some(([r, c]) => r === rIdx && c === cIdx);
                      return (
                        <div
                          key={`r3-cell-${rIdx}-${cIdx}`}
                          className={`cq-pf-grid-cell ${isIn ? 'cq-pf-cell-in' : ''} ${isOut ? 'cq-pf-cell-out' : ''}`}
                        >
                          <span className="cq-pf-cell-char">{cell}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Transformation Formula Banner */}
              <div className="cq-pf-rule-banner">
                <div className="cq-pf-banner-io">
                  <span className="cq-pf-io-tag plain-tag">{activeRule.digraphIn}</span>
                  <span className="material-symbols-outlined cq-pf-arrow-icon">arrow_forward</span>
                  <span className="cq-pf-io-tag cipher-tag">{activeRule.digraphOut}</span>
                </div>
                <div className="cq-pf-banner-desc">{activeRule.desc}</div>
              </div>
            </div>
          </div>
        );
      }

      case 3:
        // Step 4: Inverse Decryption Motion Graphic
        return (
          <div className="cq-tut-viewport cq-pf-step4-viewport">
            <div className="cq-tut-decrypt-row">
              <div className="cq-tut-decrypt-card cipher-card">
                <span className="cq-tut-card-tag">CIPHER DIGRAPH</span>
                <span className="cq-tut-card-text">R  I</span>
              </div>

              <div className="cq-tut-decrypt-action">
                <span className="material-symbols-outlined cq-tut-reverse-spin">grid_on</span>
                <span className="cq-tut-key-sub">Reverse Matrix Rules</span>
              </div>

              <div className="cq-tut-decrypt-card plain-card">
                <span className="cq-tut-card-tag">PLAINTEXT REVEAL</span>
                <span className="cq-tut-card-text text-glow">T  H</span>
              </div>
            </div>

            <div className="cq-pf-formula-banner">
              <code>Same Row: Shift Left (-1) | Same Col: Shift Up (-1) | Rectangle: Swap</code>
            </div>
          </div>
        );

      case 4: {
        // Step 5: Digraph Frequency Analysis Scanner
        const currentScanPair = sampleDigraphScans[scanPairIdx];
        return (
          <div className="cq-tut-viewport cq-pf-step5-viewport">
            <div className="cq-tut-scanner-panel">
              <div className="cq-tut-scanner-header">
                <span className="material-symbols-outlined text-warning">analytics</span>
                <span>PLAYFAIR DIGRAPH FREQUENCY SCANNER</span>
              </div>

              <div className="cq-tut-scanner-display">
                <div className="cq-tut-scan-key-col">
                  <span className="cq-tut-scan-label">Testing Bi-Gram Pair:</span>
                  <span className={`cq-tut-scan-key-val ${scannerFound ? 'found-key' : ''}`}>
                    {currentScanPair}
                  </span>
                </div>

                <div className="cq-tut-scan-output-col">
                  <span className="cq-tut-scan-label">Matrix Pattern Interval:</span>
                  <div className={`cq-tut-candidate-text ${scannerFound ? 'matched-text' : ''}`}>
                    {scannerFound ? 'HIGH FREQUENCY MATCH (6.8% OCCURRENCE)' : `SCANNING DIGRAPH COMBINATIONS (1 - 676)`}
                  </div>
                </div>
              </div>

              <div className={`cq-tut-scan-status ${scannerFound ? 'status-success' : 'status-scanning'}`}>
                {scannerFound ? "MATCH CONFIRMED: COMMON ENGLISH DIGRAPH 'TH' DETECTED" : 'ANALYZING MATRIX BI-GRAM FREQUENCIES...'}
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className={`cq-tut-backdrop ${isClosing ? 'cq-tut-closing' : ''}`} onClick={triggerClose}>
      <div className={`cq-tut-modal-container ${isClosing ? 'cq-tut-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="cq-tut-header">
          <div className="cq-tut-header-title">
            <span className="material-symbols-outlined cq-tut-header-icon">{stepData.icon}</span>
            <div>
              <span className="cq-tut-category-label">FIELD MANUAL: PLAYFAIR MATRIX</span>
              <h2>{stepData.subtitle}</h2>
            </div>
          </div>

          <button className="cq-tut-skip-btn" onClick={triggerClose} title={skipButtonText}>
            <span>{skipButtonText}</span>
          </button>
        </div>

        {/* MAIN BODY */}
        <div className="cq-tut-body">
          {/* HERO ANIMATION VIEWPORT */}
          <div className="cq-tut-animation-wrapper">
            <div className="cq-tut-viewport-header">
              <span className="cq-tut-badge">{stepData.conceptTag}</span>
              <div className="cq-tut-viewport-controls">
                <button
                  className="cq-tut-icon-btn"
                  onClick={() => setIsPlaying(!isPlaying)}
                  title={isPlaying ? 'Pause Loop' : 'Play Loop'}
                >
                  <span className="material-symbols-outlined">
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>
              </div>
            </div>

            {renderAnimationViewport()}
          </div>

          {/* DYNAMIC DUAL INTEL GRID */}
          <div className="cq-tut-intel-grid">
            <div className="cq-tut-intel-card core-card">
              <div className="cq-tut-intel-header">
                <span className="cq-tut-intel-tag tag-cyan">{stepData.intel1.tag}</span>
                <h4>{stepData.intel1.title}</h4>
              </div>
              <p className="cq-tut-intel-text">{stepData.intel1.text}</p>
            </div>

            <div className="cq-tut-intel-card tip-card">
              <div className="cq-tut-intel-header">
                <span className="cq-tut-intel-tag tag-amber">{stepData.intel2.tag}</span>
                <h4>{stepData.intel2.title}</h4>
              </div>
              <p className="cq-tut-intel-text">{stepData.intel2.text}</p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="cq-tut-footer">
          <button
            className="cq-tut-nav-btn prev-btn"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <span className="material-symbols-outlined">chevron_left</span>
            <span>Back</span>
          </button>

          {/* PROGRESS PILLS */}
          <div className="cq-tut-progress-pills">
            {TUTORIAL_STEPS.map((step, idx) => (
              <button
                key={`pill-${step.id}`}
                className={`cq-tut-pill ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
                onClick={() => setCurrentStep(idx)}
                title={`Go to Step ${idx + 1}`}
              />
            ))}
          </div>

          <button className="cq-tut-nav-btn next-btn" onClick={handleNext}>
            <span>{currentStep === TUTORIAL_STEPS.length - 1 ? 'Start Mission' : 'Next Step'}</span>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
