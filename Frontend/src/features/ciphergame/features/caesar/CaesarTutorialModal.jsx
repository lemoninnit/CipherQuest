import React, { useState, useEffect } from 'react';
import './CaesarTutorialModal.css';

/**
 * CAESAR SHIFT TUTORIAL STEPS METADATA
 */
const TUTORIAL_STEPS = [
  {
    id: 1,
    title: 'Monoalphabetic Substitution',
    subtitle: 'What is Caesar Shift?',
    icon: 'menu_book',
    conceptTag: 'FOUNDATIONAL CONCEPT',
    formula: 'Ciphertext Letter = Plaintext Letter shifted by Key',
    description: (
      <>
        The <strong>Caesar Shift</strong> is one of the earliest and simplest cryptographic techniques, famously used by Julius Caesar to protect secret military communications.
        Each letter in your plaintext message is replaced by another letter a fixed number of positions down the alphabet.
      </>
    ),
    tip: 'Letters retain their relative distance. For example, if A becomes D, then B will always become E under the same key.'
  },
  {
    id: 2,
    title: 'The Shift Key (K)',
    subtitle: 'How Shift Mechanics Work',
    icon: 'vpn_key',
    conceptTag: 'SHIFT ALGORITHM',
    formula: 'C = (P + K) mod 26',
    description: (
      <>
        The numeric <strong>Key (K)</strong> specifies how many spaces forward each letter shifts.
        Positions wrap around after <strong>Z (25)</strong> back to <strong>A (0)</strong> using modular arithmetic.
      </>
    ),
    tip: 'Try dragging the Key Slider in the animation screen above to see how changing K immediately shifts the ciphertext alphabet!'
  },
  {
    id: 3,
    title: 'Encrypting a Message',
    subtitle: 'Character-by-Character Encoding',
    icon: 'lock',
    conceptTag: 'ENCRYPTION PROCESS',
    formula: 'Process every letter individually',
    description: (
      <>
        To encrypt a full message, operatives process letters one by one.
        For example, encoding the word <strong>SECRET</strong> with <strong>Key = 3</strong> shifts <strong>S &rarr; V</strong>, <strong>E &rarr; H</strong>, <strong>C &rarr; F</strong>, <strong>R &rarr; U</strong>, <strong>E &rarr; H</strong>, and <strong>T &rarr; W</strong>.
      </>
    ),
    tip: 'Non-alphabetic characters like spaces, numbers, and punctuation marks are preserved without modification.'
  },
  {
    id: 4,
    title: 'Decrypting Intercepted Data',
    subtitle: 'Reversing the Cipher',
    icon: 'lock_open',
    conceptTag: 'DECRYPTION PROCESS',
    formula: 'P = (C - K) mod 26',
    description: (
      <>
        To read an encrypted dispatch, operatives perform the exact inverse operation.
        Subtract the key value <strong>K</strong> from each ciphertext letter to slide backwards along the alphabet wheel and reveal the plaintext.
      </>
    ),
    tip: 'If subtraction yields a negative position index, simply add 26 to wrap around correctly.'
  },
  {
    id: 5,
    title: 'Cryptanalysis & Weaknesses',
    subtitle: 'Brute-Force & Frequency Attacks',
    icon: 'warning',
    conceptTag: 'FIELD CRYPTANALYSIS',
    formula: 'Only 25 Possible Keys',
    description: (
      <>
        Because there are only <strong>25 possible shift keys</strong> (key 0 leaves text unchanged), Caesar ciphers are easily broken by testing all keys in seconds or analyzing common English letter frequencies.
      </>
    ),
    tip: 'You are now ready to jump into field operations! Test your decoding speed in CipherQuest stages.'
  }
];

const PLAIN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// 5-letter target cipher word for Step 5: "D S S O H" (Decrypts to "A P P L E" when Key = 3)
const STEP5_CIPHER_WORD = ['D', 'S', 'S', 'O', 'H'];

export default function CaesarTutorialModal({ isOpen, onClose, onComplete, skipButtonText = 'Skip Tutorial' }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [shiftKey, setShiftKey] = useState(3);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // Step 3 animation state (Word encryption stepper)
  const [encryptCharIdx, setEncryptCharIdx] = useState(0);
  const sampleWord = ['S', 'E', 'C', 'R', 'E', 'T'];

  // Step 5 animation state (Brute force scanner)
  const [scanKey, setScanKey] = useState(1);
  const [scannerFound, setScannerFound] = useState(false);

  // Reset states when changing step or reopening
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setCurrentStep(0);
      setEncryptCharIdx(0);
      setScanKey(1);
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
      setEncryptCharIdx((prev) => (prev + 1) % (sampleWord.length + 1));
    }, 1400);
    return () => clearInterval(timer);
  }, [isOpen, currentStep, isPlaying, isClosing]);

  // Loop Step 5 brute force key scanner with dynamic candidate updates
  useEffect(() => {
    if (!isOpen || currentStep !== 4 || !isPlaying || isClosing) return;
    const timer = setInterval(() => {
      setScanKey((prevKey) => {
        const nextKey = prevKey >= 25 ? 1 : prevKey + 1;
        setScannerFound(nextKey === 3);
        return nextKey;
      });
    }, 650);
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
      case 0:
        return (
          <div className="cq-tut-viewport cq-tut-step1-viewport">
            <div className="cq-tut-laser-scanline" />
            <div className="cq-tut-track-container">
              <div className="cq-tut-track-label">PLAIN TEXT</div>
              <div className="cq-tut-letters-row">
                {PLAIN_ALPHABET.slice(0, 12).map((char, i) => (
                  <div key={`p-${i}`} className="cq-tut-char-box cq-tut-char-plain">
                    {char}
                  </div>
                ))}
              </div>

              <div className="cq-tut-align-connector">
                <span className="material-symbols-outlined">sync_alt</span>
              </div>

              <div className="cq-tut-track-label">CIPHER TEXT (SHIFT = 0)</div>
              <div className="cq-tut-letters-row">
                {PLAIN_ALPHABET.slice(0, 12).map((char, i) => (
                  <div key={`c-${i}`} className="cq-tut-char-box cq-tut-char-cipher">
                    {char}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 1: {
        const cipherAlphabet = PLAIN_ALPHABET.map((_, idx) => {
          const shiftedIdx = (idx + shiftKey) % 26;
          return PLAIN_ALPHABET[shiftedIdx];
        });

        return (
          <div className="cq-tut-viewport cq-tut-step2-viewport">
            <div className="cq-tut-shift-controls">
              <div className="cq-tut-slider-group">
                <label>SHIFT KEY (K): <span className="cq-tut-key-badge">+{shiftKey}</span></label>
                <input
                  type="range"
                  min="1"
                  max="25"
                  value={shiftKey}
                  onChange={(e) => setShiftKey(parseInt(e.target.value, 10))}
                  className="cq-tut-slider"
                />
              </div>
            </div>

            <div className="cq-tut-interactive-shift-display">
              <div className="cq-tut-letters-strip-wrapper">
                <div className="cq-tut-strip-row">
                  <span className="cq-tut-row-title">Plain:</span>
                  {PLAIN_ALPHABET.slice(0, 10).map((char, idx) => (
                    <div key={`step2-p-${idx}`} className="cq-tut-char-box cq-tut-char-plain">
                      {char}
                    </div>
                  ))}
                </div>

                <div className="cq-tut-shift-arrows-row">
                  {PLAIN_ALPHABET.slice(0, 10).map((_, idx) => (
                    <span key={`arrow-${idx}`} className="material-symbols-outlined cq-tut-arrow-down">
                      south
                    </span>
                  ))}
                </div>

                <div className="cq-tut-strip-row">
                  <span className="cq-tut-row-title">Cipher:</span>
                  {cipherAlphabet.slice(0, 10).map((char, idx) => (
                    <div key={`step2-c-${idx}`} className="cq-tut-char-box cq-tut-char-cipher cq-tut-glow">
                      {char}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 2:
        return (
          <div className="cq-tut-viewport cq-tut-step3-viewport">
            <div className="cq-tut-word-container">
              <div className="cq-tut-word-label">PLAIN WORD</div>
              <div className="cq-tut-word-box">
                {sampleWord.map((char, idx) => {
                  const isActive = idx === encryptCharIdx;
                  const isProcessed = idx < encryptCharIdx;
                  return (
                    <div
                      key={`w-p-${idx}`}
                      className={`cq-tut-word-tile ${isActive ? 'active-tile' : ''} ${isProcessed ? 'processed-tile' : ''}`}
                    >
                      {char}
                    </div>
                  );
                })}
              </div>

              <div className="cq-tut-process-arrow">
                <span className="material-symbols-outlined">arrow_downward</span>
                <span className="cq-tut-process-tag">Shift +3</span>
              </div>

              <div className="cq-tut-word-label">CIPHER RESULT</div>
              <div className="cq-tut-word-box">
                {sampleWord.map((char, idx) => {
                  const pCode = char.charCodeAt(0) - 65;
                  const cChar = String.fromCharCode(((pCode + 3) % 26) + 65);
                  const isDone = idx < encryptCharIdx;
                  return (
                    <div
                      key={`w-c-${idx}`}
                      className={`cq-tut-word-tile cipher-tile ${isDone ? 'done-tile' : 'empty-tile'}`}
                    >
                      {isDone ? cChar : '?'}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="cq-tut-viewport cq-tut-step4-viewport">
            <div className="cq-tut-decrypt-row">
              <div className="cq-tut-decrypt-card cipher-card">
                <span className="cq-tut-card-tag">CIPHER INPUT</span>
                <span className="cq-tut-card-text">K H O O O</span>
              </div>

              <div className="cq-tut-decrypt-action">
                <span className="material-symbols-outlined cq-tut-reverse-spin">sync</span>
                <span className="cq-tut-key-sub">Subtract Key (-3)</span>
              </div>

              <div className="cq-tut-decrypt-card plain-card">
                <span className="cq-tut-card-tag">PLAINTEXT OUTPUT</span>
                <span className="cq-tut-card-text text-glow">H E L L O</span>
              </div>
            </div>
          </div>
        );

      case 4: {
        // Dynamically shift "D S S O H" backwards by scanKey
        const currentDecryptedCandidate = STEP5_CIPHER_WORD.map((char) => {
          const cCode = char.charCodeAt(0) - 65;
          const pCode = (cCode - scanKey + 26) % 26;
          return String.fromCharCode(pCode + 65);
        }).join('  ');

        return (
          <div className="cq-tut-viewport cq-tut-step5-viewport">
            <div className="cq-tut-scanner-panel">
              <div className="cq-tut-scanner-header">
                <span className="material-symbols-outlined text-warning">radar</span>
                <span>CRYPTANALYSIS KEY SCANNER</span>
              </div>

              <div className="cq-tut-scanner-display">
                <div className="cq-tut-scan-key-col">
                  <span className="cq-tut-scan-label">Testing Key:</span>
                  <span className={`cq-tut-scan-key-val ${scannerFound ? 'found-key' : ''}`}>
                    K = {scanKey}
                  </span>
                </div>

                <div className="cq-tut-scan-output-col">
                  <span className="cq-tut-scan-label">Decrypted Candidate:</span>
                  <div className={`cq-tut-candidate-text ${scannerFound ? 'matched-text' : ''}`}>
                    {currentDecryptedCandidate}
                  </div>
                </div>
              </div>

              <div className={`cq-tut-scan-status ${scannerFound ? 'status-success' : 'status-scanning'}`}>
                {scannerFound ? '✓ MATCH DETECTED (English Word Found)' : '⚡ SCANNING ALL 25 KEYS...'}
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
              <h2>FIELD MANUAL: CAESAR SHIFT</h2>
              <span className="cq-tut-subtitle">{stepData.subtitle}</span>
            </div>
          </div>

          <button className="cq-tut-skip-btn" onClick={triggerClose} title={skipButtonText}>
            <span>{skipButtonText}</span>
          </button>
        </div>

        {/* MAIN BODY */}
        <div className="cq-tut-body">
          {/* ANIMATION SCREEN */}
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

          {/* CONTEXT EXPLANATION CARD */}
          <div className="cq-tut-context-card">
            <div className="cq-tut-context-header">
              <span className="material-symbols-outlined text-cyan">info</span>
              <h3>{stepData.title}</h3>
            </div>

            <p className="cq-tut-description">{stepData.description}</p>

            <div className="cq-tut-formula-pill">
              <span className="material-symbols-outlined">functions</span>
              <code>{stepData.formula}</code>
            </div>

            {stepData.tip && (
              <div className="cq-tut-tip-box">
                <strong>💡 Operative Tip:</strong> {stepData.tip}
              </div>
            )}
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
