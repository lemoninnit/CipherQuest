/* eslint-disable react-hooks/set-state-in-effect, no-unused-vars, react-hooks/immutability, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import './VigenereTutorialModal.css';
import { useAuth } from '../../../../context/AuthContext';
import { userApi } from '../../../../api/cipherQuestApi';

/**
 * VIGENÈRE CIPHER TUTORIAL STEPS METADATA
 * Refactored for HUD-style tactical intel cards & gamified micro-copy
 */
const TUTORIAL_STEPS = [
  {
    id: 1,
    title: 'Polyalphabetic Substitution',
    subtitle: 'What is Vigenère Cipher?',
    icon: 'grid_view',
    conceptTag: 'DIRECTIVE 01 // FOUNDATION',
    intel1: {
      tag: 'CORE MECHANIC',
      title: 'Multiple Shift Keys',
      text: (
        <>
          Unlike Caesar shift which uses a single fixed shift, Vigenère uses a <strong>repeating keyword</strong> where each letter applies a different shift value.
        </>
      )
    },
    intel2: {
      tag: 'OPERATIVE RULE',
      title: 'Tabula Recta Matrix',
      text: (
        <>
          En/decryption relies on a <strong>26&times;26 grid</strong> (Vigenère Square) containing all 26 shifted Caesar alphabets stacked vertically.
        </>
      )
    }
  },
  {
    id: 2,
    title: 'Keyword Alignment & Expansion',
    subtitle: 'How Key Alignment Works',
    icon: 'key',
    conceptTag: 'DIRECTIVE 02 // KEY MECHANICS',
    intel1: {
      tag: 'ALGORITHM',
      title: 'Repeated Key Sequence',
      text: (
        <>
          The secret keyword is repeated continuously under the plaintext until it <strong>matches the exact message length</strong>.
        </>
      )
    },
    intel2: {
      tag: 'TRY IT NOW',
      title: 'Dynamic Key Alignment',
      text: (
        <>
          Select a <strong>keyword preset</strong> below to observe how letters align cyclically underneath each character of the message.
        </>
      )
    }
  },
  {
    id: 3,
    title: 'Encrypting a Message',
    subtitle: 'Character-by-Character Encoding',
    icon: 'lock',
    conceptTag: 'DIRECTIVE 03 // ENCRYPTION PIPELINE',
    intel1: {
      tag: 'OPERATION',
      title: 'Row-Column Intersection',
      text: (
        <>
          Locate the <strong>Plaintext letter on column</strong> and <strong>Key letter on row</strong>. Their matrix crosshair intersection is the <strong>Ciphertext</strong>.
        </>
      )
    },
    intel2: {
      tag: 'PROTOCOL',
      title: 'Punctuation Bypass',
      text: (
        <>
          Spaces, numbers, and symbols pass through <strong>unmodified</strong> while keyword position skips to the next valid letter.
        </>
      )
    }
  },
  {
    id: 4,
    title: 'Decrypting Intercepted Data',
    subtitle: 'Reversing the Matrix Search',
    icon: 'lock_open',
    conceptTag: 'DIRECTIVE 04 // DECRYPTION PIPELINE',
    intel1: {
      tag: 'DECRYPTION',
      title: 'Inverse Matrix Lookup',
      text: (
        <>
          Find the <strong>Key row</strong>, scan horizontally to locate the <strong>Ciphertext letter</strong>, then look straight UP at column header for <strong>Plaintext</strong>.
        </>
      )
    },
    intel2: {
      tag: 'FORMULA RULE',
      title: 'Modular Subtraction',
      text: (
        <>
          Mathematically expressed as <strong>P = (C - K + 26) mod 26</strong>. If subtraction goes negative, add 26 to wrap back around.
        </>
      )
    }
  },
  {
    id: 5,
    title: 'Cryptanalysis & Weaknesses',
    subtitle: 'Kasiski Examination & Key Length',
    icon: 'warning',
    conceptTag: 'DIRECTIVE 05 // CRYPTANALYSIS',
    intel1: {
      tag: 'VULNERABILITY',
      title: 'Repeated Pattern Flaw',
      text: (
        <>
          Because keywords repeat, identical word patterns yield <strong>repeating ciphertext groups</strong> at distance intervals of key length multiples.
        </>
      )
    },
    intel2: {
      tag: 'MISSION READY',
      title: 'Operational Status',
      text: (
        <>
          Briefing complete! You are ready to crack polyalphabetic dispatches in <strong>CipherQuest stages</strong>.
        </>
      )
    }
  }
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Sample data for Step 3: ATTACK + LEMON = MPRWOE
const SAMPLE_PLAINTEXT = ['A', 'T', 'T', 'A', 'C', 'K'];
const SAMPLE_KEY = ['L', 'E', 'M', 'O', 'N', 'L'];
const SAMPLE_CIPHERTEXT = ['M', 'P', 'R', 'W', 'O', 'E'];

// Sample data for Step 4: Intercepted dispatches
const DECRYPT_CIPHER = ['M', 'P', 'R', 'W', 'O', 'E'];
const DECRYPT_KEY = ['L', 'E', 'M', 'O', 'N', 'L'];
const DECRYPT_PLAIN = ['A', 'T', 'T', 'A', 'C', 'K'];

export default function VigenereTutorialModal({ isOpen, onClose, onComplete, skipButtonText = 'Skip Tutorial' }) {
  const { user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Step 2 state: Keyword selector
  const [keywordPreset, setKeywordPreset] = useState('LEMON');

  // Step 3 animation state (Word encryption stepper)
  const [encryptCharIdx, setEncryptCharIdx] = useState(0);

  // Step 5 animation state (Kasiski scanner)
  const [scanInterval, setScanInterval] = useState(2);
  const [scannerFound, setScannerFound] = useState(false);

  // Sync preference on open
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;

    if (user?.tutorialDismissed && typeof user.tutorialDismissed.vigenere === 'boolean') {
      setDontShowAgain(user.tutorialDismissed.vigenere);
    } else {
      userApi.getTutorialPreferences()
        .then((prefs) => {
          if (!isCancelled && prefs && typeof prefs.vigenere === 'boolean') {
            setDontShowAgain(prefs.vigenere);
          }
        })
        .catch((err) => {
          console.warn("Could not fetch tutorial preferences on open:", err);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [isOpen, user?.tutorialDismissed?.vigenere]);

  const handleToggleDontShow = async (e) => {
    const nextVal = Boolean(e.target.checked);
    setDontShowAgain(nextVal);
    try {
      const res = await userApi.saveTutorialPreference('vigenere', nextVal);
      if (res && typeof res.vigenere === 'boolean') {
        setDontShowAgain(res.vigenere);
      }
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err) {
      console.error("Failed to save Vigenere tutorial preference:", err);
      setDontShowAgain(!nextVal);
    }
  };

  // Reset states when changing step or reopening
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setCurrentStep(0);
      setEncryptCharIdx(0);
      setScanInterval(2);
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

  // Loop Step 3 word encryption stepper
  useEffect(() => {
    if (!isOpen || currentStep !== 2 || !isPlaying || isClosing) return;
    const timer = setInterval(() => {
      setEncryptCharIdx((prev) => (prev + 1) % (SAMPLE_PLAINTEXT.length + 1));
    }, 1400);
    return () => clearInterval(timer);
  }, [isOpen, currentStep, isPlaying, isClosing]);

  // Loop Step 5 Kasiski pattern scanner
  useEffect(() => {
    if (!isOpen || currentStep !== 4 || !isPlaying || isClosing) return;
    const timer = setInterval(() => {
      setScanInterval((prev) => {
        const next = prev >= 8 ? 2 : prev + 1;
        setScannerFound(next === 5); // LEMON length is 5
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
        // Step 1: Vigenère Square Mini Grid (5x5 alphabet matrix visualizer)
        const miniAlpha = ['A', 'B', 'C', 'D', 'E'];
        return (
          <div className="cq-tut-viewport cq-vig-step1-viewport">
            <div className="cq-tut-laser-scanline" />
            <div className="cq-vig-square-container">
              <div className="cq-vig-square-header">
                <span className="cq-vig-corner-box">&times;</span>
                {miniAlpha.map((colChar) => (
                  <div key={`col-${colChar}`} className="cq-vig-grid-header-col">
                    {colChar}
                  </div>
                ))}
              </div>
              {miniAlpha.map((rowChar, rowIdx) => (
                <div key={`row-${rowChar}`} className="cq-vig-grid-row">
                  <div className="cq-vig-grid-header-row">{rowChar}</div>
                  {miniAlpha.map((_, colIdx) => {
                    const charCode = (rowIdx + colIdx) % 26 + 65;
                    const letter = String.fromCharCode(charCode);
                    const isDiagonal = rowIdx === colIdx;
                    return (
                      <div
                        key={`cell-${rowIdx}-${colIdx}`}
                        className={`cq-vig-grid-cell ${isDiagonal ? 'cq-vig-cell-highlight' : ''}`}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="cq-vig-square-caption">
              <span className="material-symbols-outlined">grid_4x4</span>
              <span>26&times;26 Alphabet Matrix (Tabula Recta)</span>
            </div>
          </div>
        );
      }

      case 1: {
        // Step 2: Live Keyword Alignment Track
        const sampleMsg = 'DEFENDTHEEAST';
        const keyChars = keywordPreset.split('');
        const alignedKey = sampleMsg
          .split('')
          .map((_, i) => keyChars[i % keyChars.length]);

        return (
          <div className="cq-tut-viewport cq-vig-step2-viewport">
            <div className="cq-vig-preset-controls">
              <span className="cq-vig-controls-label">SELECT KEYWORD:</span>
              {['LEMON', 'KEY', 'CIPHER', 'SECRET'].map((keyOption) => (
                <button
                  key={keyOption}
                  className={`cq-vig-preset-btn ${keywordPreset === keyOption ? 'active' : ''}`}
                  onClick={() => setKeywordPreset(keyOption)}
                >
                  {keyOption}
                </button>
              ))}
            </div>

            <div className="cq-vig-alignment-display">
              <div className="cq-vig-track-row">
                <span className="cq-vig-track-tag tag-plain">Plain:</span>
                <div className="cq-vig-track-letters">
                  {sampleMsg.split('').map((char, idx) => (
                    <div key={`msg-${idx}`} className="cq-tut-char-box cq-tut-char-plain">
                      {char}
                    </div>
                  ))}
                </div>
              </div>

              <div className="cq-vig-connectors-row">
                {sampleMsg.split('').map((_, idx) => (
                  <span key={`conn-${idx}`} className="material-symbols-outlined cq-vig-connector-icon">
                    height
                  </span>
                ))}
              </div>

              <div className="cq-vig-track-row">
                <span className="cq-vig-track-tag tag-key">Key:</span>
                <div className="cq-vig-track-letters">
                  {alignedKey.map((char, idx) => (
                    <div key={`key-${idx}`} className="cq-tut-char-box cq-vig-char-key">
                      {char}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 2: {
        // Step 3: Intersection Lookup Stepper
        const activePlainChar = encryptCharIdx < SAMPLE_PLAINTEXT.length ? SAMPLE_PLAINTEXT[encryptCharIdx] : null;
        const activeKeyChar = encryptCharIdx < SAMPLE_KEY.length ? SAMPLE_KEY[encryptCharIdx] : null;

        return (
          <div className="cq-tut-viewport cq-vig-step3-viewport">
            <div className="cq-vig-lookup-status">
              <div className="cq-vig-lookup-badge">
                <span>Column: <strong>{activePlainChar || '-'}</strong></span>
                <span className="cq-vig-plus">+</span>
                <span>Row: <strong>{activeKeyChar || '-'}</strong></span>
              </div>
            </div>

            <div className="cq-tut-word-container">
              <div className="cq-vig-triple-track">
                {/* PLAINTEXT ROW */}
                <div className="cq-vig-stepper-line">
                  <span className="cq-vig-line-label">PLAIN</span>
                  <div className="cq-tut-word-box">
                    {SAMPLE_PLAINTEXT.map((char, idx) => {
                      const isActive = idx === encryptCharIdx;
                      const isProcessed = idx < encryptCharIdx;
                      return (
                        <div
                          key={`p-tile-${idx}`}
                          className={`cq-tut-word-tile ${isActive ? 'active-tile' : ''} ${isProcessed ? 'processed-tile' : ''}`}
                        >
                          {char}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* KEYWORD ROW */}
                <div className="cq-vig-stepper-line">
                  <span className="cq-vig-line-label label-key">KEY</span>
                  <div className="cq-tut-word-box">
                    {SAMPLE_KEY.map((char, idx) => {
                      const isActive = idx === encryptCharIdx;
                      return (
                        <div
                          key={`k-tile-${idx}`}
                          className={`cq-tut-word-tile key-tile ${isActive ? 'active-key-tile' : ''}`}
                        >
                          {char}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="cq-tut-process-arrow">
                  <span className="material-symbols-outlined">arrow_downward</span>
                  <span className="cq-tut-process-tag">Grid Intersection (P + K mod 26)</span>
                </div>

                {/* CIPHERTEXT RESULT ROW */}
                <div className="cq-vig-stepper-line">
                  <span className="cq-vig-line-label label-cipher">CIPHER</span>
                  <div className="cq-tut-word-box">
                    {SAMPLE_CIPHERTEXT.map((char, idx) => {
                      const isDone = idx < encryptCharIdx;
                      return (
                        <div
                          key={`c-tile-${idx}`}
                          className={`cq-tut-word-tile cipher-tile ${isDone ? 'done-tile' : 'empty-tile'}`}
                        >
                          {isDone ? char : '?'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 3:
        // Step 4: Decryption Card & Modular Subtraction Formula
        return (
          <div className="cq-tut-viewport cq-vig-step4-viewport">
            <div className="cq-tut-decrypt-row">
              <div className="cq-tut-decrypt-card cipher-card">
                <span className="cq-tut-card-tag">CIPHERTEXT</span>
                <span className="cq-tut-card-text">{DECRYPT_CIPHER.join(' ')}</span>
              </div>

              <div className="cq-tut-decrypt-action">
                <span className="material-symbols-outlined cq-tut-reverse-spin">grid_guides</span>
                <span className="cq-tut-key-sub">Subtract Key Row ({DECRYPT_KEY.join('')})</span>
              </div>

              <div className="cq-tut-decrypt-card plain-card">
                <span className="cq-tut-card-tag">PLAINTEXT REVEAL</span>
                <span className="cq-tut-card-text text-glow">{DECRYPT_PLAIN.join(' ')}</span>
              </div>
            </div>

            <div className="cq-vig-formula-banner">
              <code>P = (C - K + 26) mod 26</code>
            </div>
          </div>
        );

      case 4: {
        // Step 5: Kasiski Key Length Scanner
        return (
          <div className="cq-tut-viewport cq-vig-step5-viewport">
            <div className="cq-tut-scanner-panel">
              <div className="cq-tut-scanner-header">
                <span className="material-symbols-outlined text-warning">analytics</span>
                <span>KASISKI PATTERN INTERVAL SCANNER</span>
              </div>

              <div className="cq-tut-scanner-display">
                <div className="cq-tut-scan-key-col">
                  <span className="cq-tut-scan-label">Testing Key Length:</span>
                  <span className={`cq-tut-scan-key-val ${scannerFound ? 'found-key' : ''}`}>
                    L = {scanInterval}
                  </span>
                </div>

                <div className="cq-tut-scan-output-col">
                  <span className="cq-tut-scan-label">Pattern Match Frequency:</span>
                  <div className={`cq-tut-candidate-text ${scannerFound ? 'matched-text' : ''}`}>
                    {scannerFound ? 'REPEATED TRIGRAM AT INTERVAL 5' : `INTERVAL ${scanInterval} NO MATCH`}
                  </div>
                </div>
              </div>

              <div className={`cq-tut-scan-status ${scannerFound ? 'status-success' : 'status-scanning'}`}>
                {scannerFound ? 'MATCH CONFIRMED: KEYWORD LENGTH IS 5 (e.g. L-E-M-O-N)' : 'SCANNING PATTERN INTERVALS (2 - 8)...'}
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
              <span className="cq-tut-category-label">FIELD MANUAL: VIGENÈRE CIPHER</span>
              <h2>{stepData.subtitle}</h2>
            </div>
          </div>

          <div className="cq-tut-header-actions">
            <label className="cq-tut-dont-show-checkbox">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={handleToggleDontShow}
              />
              <span className="cq-tut-custom-checkbox" />
              <span className="cq-tut-dont-show-text">Don't show this again</span>
            </label>
            <button className="cq-tut-skip-btn" onClick={triggerClose} title={skipButtonText}>
              <span>{skipButtonText}</span>
            </button>
          </div>
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
          <div className="cq-tut-footer-left">
            <button
              className="cq-tut-nav-btn prev-btn"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <span className="material-symbols-outlined">chevron_left</span>
              <span>Back</span>
            </button>
          </div>

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
