import React, { useEffect, useRef, useState } from 'react';
import './GameTutorialModal.css';
import { getTutorialData } from './tutorialData';

export default function GameTutorialModal({ cipherType = 'caesar', gameType = 'fishing', onClose }) {
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previousFocusRef = useRef(null);

  const { cipher, game, comboTip } = getTutorialData(cipherType, gameType);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose?.();
    }, 200);
  };

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    closeBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isClosing) {
      handleClose();
    }
  };

  return (
    <div
      className={`cq-tut-modal-overlay ${isClosing ? 'is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cq-tut-modal-title"
      onClick={handleBackdropClick}
    >
      <div className={`cq-tut-modal-container ${isClosing ? 'is-closing' : ''}`} ref={modalRef}>
        {/* Header */}
        <div className="cq-tut-modal-header">
          <div className="cq-tut-modal-header-left">
            <div className="cq-tut-modal-tag-row">
              <span className="cq-tut-modal-badge tag-cipher">
                <span className="material-symbols-outlined icon-small">{cipher.icon}</span>
                {cipher.name.toUpperCase()}
              </span>
              <span className="cq-tut-modal-badge tag-game">
                <span className="material-symbols-outlined icon-small">{game.icon}</span>
                {game.name.toUpperCase()}
              </span>
            </div>
            <h2 id="cq-tut-modal-title" className="cq-tut-modal-title">
              FIELD BRIEFING &amp; TUTORIAL
            </h2>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className="cq-tut-modal-back-btn"
            onClick={handleClose}
            aria-label="Back to pause menu"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Back to Pause</span>
          </button>
        </div>

        {/* Synergy Mission Tip Banner */}
        {comboTip && (
          <div className="cq-tut-synergy-banner">
            <span className="material-symbols-outlined text-cyan">info</span>
            <div className="cq-tut-synergy-text">
              <strong>Active Mission Intel:</strong> {comboTip}
            </div>
          </div>
        )}

        {/* 2 Side-by-Side Panels */}
        <div className="cq-tut-dual-grid">
          {/* ════════ LEFT PANEL: HOW TO SOLVE ════════ */}
          <div className="cq-tut-panel cq-tut-panel-solve">
            <div className="cq-tut-panel-header">
              <div className="cq-tut-panel-title-group">
                <span className="material-symbols-outlined cq-tut-panel-icon icon-cyan">{cipher.icon}</span>
                <div>
                  <span className="cq-tut-panel-kicker">LEFT PANEL // DECRYPTION INTEL</span>
                  <h3 className="cq-tut-panel-heading">How to Solve: {cipher.name}</h3>
                </div>
              </div>
            </div>

            <div className="cq-tut-panel-content">
              {/* Concept overview */}
              <div className="cq-tut-card cq-tut-card-concept">
                <div className="cq-tut-card-label">Core Cipher Principle</div>
                <p className="cq-tut-card-text">{cipher.concept}</p>
              </div>

              {/* Mathematical Formula / Matrix Rules */}
              {cipher.formula && (
                <div className="cq-tut-card cq-tut-card-formula">
                  <div className="cq-tut-card-label">Decryption Formula</div>
                  <div className="cq-tut-formula-box">
                    <code>{cipher.formula}</code>
                  </div>
                  {cipher.formulaExplanation && (
                    <p className="cq-tut-formula-explanation">{cipher.formulaExplanation}</p>
                  )}
                </div>
              )}

              {/* Playfair Specific Matrix Rules */}
              {cipher.matrixRules && (
                <div className="cq-tut-card cq-tut-card-matrix">
                  <div className="cq-tut-card-label">5×5 Matrix Inverse Rules</div>
                  <div className="cq-tut-matrix-rules-list">
                    {cipher.matrixRules.map((rule, idx) => (
                      <div key={idx} className="cq-tut-matrix-rule-item">
                        <div className="cq-tut-matrix-rule-title">
                          <span className="material-symbols-outlined text-cyan">{rule.icon}</span>
                          <strong>{rule.name}</strong>
                        </div>
                        <p className="cq-tut-matrix-rule-desc">{rule.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step by step */}
              <div className="cq-tut-card cq-tut-card-steps">
                <div className="cq-tut-card-label">Step-by-Step Decryption</div>
                <div className="cq-tut-steps-list">
                  {cipher.steps.map((step) => (
                    <div key={step.num} className="cq-tut-step-item">
                      <div className="cq-tut-step-num">{step.num}</div>
                      <div className="cq-tut-step-body">
                        <div className="cq-tut-step-title">{step.title}</div>
                        <div className="cq-tut-step-desc">{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Practical Examples */}
              {cipher.examples && cipher.examples.length > 0 && (
                <div className="cq-tut-card cq-tut-card-examples">
                  <div className="cq-tut-card-label">Decryption Examples</div>
                  <div className="cq-tut-examples-grid">
                    {cipher.examples.map((ex, idx) => (
                      <div key={idx} className="cq-tut-example-row">
                        <div className="cq-tut-ex-chip ex-in">
                          <span className="ex-label">Cipher</span>
                          <span className="ex-val">{ex.input}</span>
                        </div>
                        <div className="cq-tut-ex-chip ex-key">
                          <span className="ex-label">Key</span>
                          <span className="ex-val">{ex.key}</span>
                        </div>
                        <div className="cq-tut-ex-arrow">→</div>
                        <div className="cq-tut-ex-chip ex-calc">
                          <span className="ex-label">Calculation</span>
                          <span className="ex-val">{ex.calc}</span>
                        </div>
                        <div className="cq-tut-ex-arrow">→</div>
                        <div className="cq-tut-ex-chip ex-out">
                          <span className="ex-label">Plaintext</span>
                          <span className="ex-val text-cyan">{ex.output}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pro Tips */}
              {cipher.proTips && (
                <div className="cq-tut-card cq-tut-card-tips">
                  <div className="cq-tut-card-label text-amber">
                    <span className="material-symbols-outlined icon-small">tips_and_updates</span>
                    Cryptographic Tips
                  </div>
                  <ul className="cq-tut-tips-list">
                    {cipher.proTips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* ════════ RIGHT PANEL: HOW TO PLAY ════════ */}
          <div className="cq-tut-panel cq-tut-panel-play">
            <div className="cq-tut-panel-header">
              <div className="cq-tut-panel-title-group">
                <span className="material-symbols-outlined cq-tut-panel-icon icon-emerald">{game.icon}</span>
                <div>
                  <span className="cq-tut-panel-kicker">RIGHT PANEL // MISSION WALKTHROUGH</span>
                  <h3 className="cq-tut-panel-heading">How to Play: {game.name}</h3>
                </div>
              </div>
            </div>

            <div className="cq-tut-panel-content">
              {/* Mission Objective */}
              <div className="cq-tut-card cq-tut-card-objective">
                <div className="cq-tut-card-label">Mission Objective</div>
                <p className="cq-tut-card-text">{game.objective}</p>
              </div>

              {/* Controls */}
              {game.controls && (
                <div className="cq-tut-card cq-tut-card-controls">
                  <div className="cq-tut-card-label">Game Controls &amp; Actions</div>
                  <div className="cq-tut-controls-list">
                    {game.controls.map((ctrl, idx) => (
                      <div key={idx} className="cq-tut-control-row">
                        <span className="cq-tut-keycap">{ctrl.key}</span>
                        <span className="cq-tut-action-desc">{ctrl.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Walkthrough */}
              <div className="cq-tut-card cq-tut-card-walkthrough">
                <div className="cq-tut-card-label">Step-by-Step Walkthrough</div>
                <div className="cq-tut-steps-list">
                  {game.walkthrough.map((step) => (
                    <div key={step.step} className="cq-tut-step-item">
                      <div className="cq-tut-step-num step-num-green">{step.step}</div>
                      <div className="cq-tut-step-body">
                        <div className="cq-tut-step-title">{step.title}</div>
                        <div className="cq-tut-step-desc">{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Win Condition */}
              <div className="cq-tut-card cq-tut-card-win">
                <div className="cq-tut-card-label text-emerald">
                  <span className="material-symbols-outlined icon-small">military_tech</span>
                  Victory Condition
                </div>
                <p className="cq-tut-card-text font-bold text-emerald">{game.winCondition}</p>
              </div>

              {/* Tactical Survival Tips */}
              {game.tacticalTips && (
                <div className="cq-tut-card cq-tut-card-tips">
                  <div className="cq-tut-card-label text-amber">
                    <span className="material-symbols-outlined icon-small">shield</span>
                    Tactical Survival Notes
                  </div>
                  <ul className="cq-tut-tips-list">
                    {game.tacticalTips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="cq-tut-modal-footer">
          <button
            type="button"
            className="cq-tut-footer-close-btn"
            onClick={handleClose}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Return to Pause Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
