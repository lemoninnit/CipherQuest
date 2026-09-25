# 📖 CipherQuest Interactive Tutorial Modal Blueprint

This document provides the complete architectural guide and blueprint for building interactive multi-step tutorial modals in **CipherQuest**. Use this reference when building tutorial modals for **Vigenère Matrix** and **Playfair Matrix**.

---

## 📁 1. File & Component Architecture

For each cipher mode (e.g. `caesar`, `vigenere`, `playfair`), encapsulate the tutorial files in its respective feature folder:

```text
Frontend/src/features/ciphergame/features/
├── caesar/
│   ├── CaesarTutorialModal.jsx
│   └── CaesarTutorialModal.css
├── vigenere/
│   ├── VigenereTutorialModal.jsx  (To be created)
│   └── VigenereTutorialModal.css  (To be created)
└── playfair/
    ├── PlayfairTutorialModal.jsx  (To be created)
    └── PlayfairTutorialModal.css  (To be created)
```

---

## 🎨 2. Component Structure (`<Cipher>TutorialModal.jsx`)

Each tutorial modal component follows this unified pattern:

### A. Props Contract
```jsx
<CaesarTutorialModal
  isOpen={boolean}            // Modal visibility flag
  onClose={function}          // Callback when closing/skipping
  onComplete={function}       // Optional callback on final step completion
  skipButtonText={string}    // "Skip Tutorial" (CipherGame) or "Close Tutorial" (Dashboard)
/>
```

### B. State Engine
1. **`currentStep`** (`0` to `4`): Active step index out of 5 steps.
2. **`isClosing`** (`boolean`): Triggered prior to closing to allow a smooth **220ms CSS exit animation** (`cqModalScaleOut` / `cqTutFadeOut`) before unmounting.
3. **`isPlaying`** (`boolean`): Pause/play toggle for looping viewport animations.
4. **Step-Specific Animation States**:
   - E.g. `encryptCharIdx` for step-by-step word encoding loops.
   - E.g. `scanKey` & `scannerFound` for cryptanalysis key scanner loops.

---

## 🔄 3. Dual Trigger Flow & Routing Modes

The modal supports **two distinct UX triggers**:

```
                              ┌────────────────────────────────────────┐
                              │     User Interaction on Dashboard      │
                              └───────────────────┬────────────────────┘
                                                  │
                  ┌───────────────────────────────┴───────────────────────────────┐
                  ▼                                                               ▼
  [Click Caesar Shift Card]                                        [Click "Show Tutorial" Button]
  Navigates to /dashboard/ciphergame                               Opens Modal in-place on Dashboard
  State: { category: 'caesar', showTutorial: true }                State: showTutorial = true
                  │                                                               │
                  ▼                                                               ▼
  Landing Cooldown (0.4s):                                         Opens immediately on Dashboard
  - .cq-tutorial-preparing-overlay blurs page                      - Blurs & dims Dashboard backdrop
  - Click shield blocks all pointer interactions                   - Header button: "Close Tutorial"
                  │
                  ▼
  Modal pops up after 400ms delay
  - Header button: "Skip Tutorial"
```

---

## ⚡ 4. Code Wiring Quick-Reference

### A. Route Trigger Wiring in `CipherGame.jsx`
```jsx
// 1. State for preparation overlay and modal
const [showCaesarTutorial, setShowCaesarTutorial] = useState(false);
const [isTutorialPreparing, setIsTutorialPreparing] = useState(false);

// 2. Cooldown timer on landing
useEffect(() => {
  if (location.state?.showTutorial && (game.category === 'caesar' || location.state?.category === 'caesar')) {
    setIsTutorialPreparing(true);
    const timer = setTimeout(() => {
      setIsTutorialPreparing(false);
      setShowCaesarTutorial(true);
    }, 400); // 0.4s cooldown
    return () => clearTimeout(timer);
  }
}, [location.state, game.category]);

// 3. Render preparation overlay & modal
{isTutorialPreparing && <div className="cq-tutorial-preparing-overlay" />}

<CaesarTutorialModal
  isOpen={showCaesarTutorial}
  onClose={() => setShowCaesarTutorial(false)}
  skipButtonText="Skip Tutorial"
/>
```

### B. In-Place Trigger Wiring in `DashboardHome.jsx`
```jsx
<CaesarTutorialModal
  isOpen={showTutorial}
  onClose={() => setShowTutorial(false)}
  skipButtonText="Close Tutorial"
/>
```

---

## 🎯 5. Step Content & Animation Design Pattern

Every cipher tutorial consists of **5 standardized educational steps**:

| Step | Focus Area | Caesar Implementation Example | Vigenère / Playfair Adaptation Strategy |
| :--- | :--- | :--- | :--- |
| **Step 1** | **Foundational Concept** | Dual Plaintext/Ciphertext alignment tracks with scanning laser beam. | **Vigenère**: Vigenère square grid highlight.<br>**Playfair**: 5×5 Matrix grid arrangement. |
| **Step 2** | **Key Mechanics** | Interactive Shift Key Slider ($K = +1 \dots +25$). | **Vigenère**: Repeating Keyword alignment under plaintext.<br>**Playfair**: Digraph pairing rules (pair splitting, 'X' filler). |
| **Step 3** | **Encryption Stepper** | Character-by-character drop tiles (`SECRET` $+ 3 \rightarrow$ `VHFUHW`). | **Vigenère**: Letter + Key letter intersection lookup.<br>**Playfair**: Rectangle swap & same row/col shift animations. |
| **Step 4** | **Decryption Process** | Reverse shift spinning gear (`KHOOO` $- 3 \rightarrow$ `HELLO`). | **Vigenère**: Subtract key letter to find original plaintext.<br>**Playfair**: Reverse matrix shift rules. |
| **Step 5** | **Cryptanalysis** | Brute force key scanner testing all 25 shift keys (`D S S O H` $\rightarrow$ `A P P L E`). | **Vigenère**: Kasiski examination / keyword length analysis.<br>**Playfair**: Digraph frequency attacks. |

---

## 🎨 6. Essential CSS Utility Tokens

Key CSS selectors to reuse across all cipher modals:

```css
/* Immediate blur & click shield during 0.4s cooldown */
.cq-tutorial-preparing-overlay {
  position: fixed;
  inset: 0;
  z-index: 9980;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  background: transparent;
  pointer-events: all;
  cursor: wait;
}

/* Modal backdrop overlay */
.cq-tut-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(6, 11, 20, 0.82);
  backdrop-filter: blur(12px);
  animation: cqTutFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Smooth exit animation */
.cq-tut-backdrop.cq-tut-closing {
  animation: cqTutFadeOut 0.22s ease-in forwards;
}

.cq-tut-modal-container.cq-tut-closing {
  animation: cqModalScaleOut 0.22s ease-in forwards;
}
```

---

## 🚀 Replicating for Vigenère & Playfair
When you are ready to build **Vigenère** or **Playfair** tutorials:
1. Copy `CaesarTutorialModal.jsx` to `VigenereTutorialModal.jsx` (or `PlayfairTutorialModal.jsx`).
2. Update the `TUTORIAL_STEPS` array content with Vigenère/Playfair formulas and tips.
3. Replace the viewport renderers in `renderAnimationViewport()` with Vigenère key grid / Playfair matrix visualizations.
4. Wire the trigger into `CipherGame.jsx` for `category === 'vigenere'` or `'playfair'`.
