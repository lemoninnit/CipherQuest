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

## 🎨 2. Component Structure & Data Schema (`<Cipher>TutorialModal.jsx`)

Each tutorial modal component follows a **Hero-First + Dual Intel Grid** architectural layout.

### A. Props Contract
```jsx
<CaesarTutorialModal
  isOpen={boolean}            // Modal visibility flag
  onClose={function}          // Callback when closing/skipping
  onComplete={function}       // Optional callback on final step completion
  skipButtonText={string}    // "Skip Tutorial" (CipherGame) or "Close Tutorial" (Dashboard)
/>
```

### B. Header Hierarchy & Layout Specification
1. **Header Layout**:
   - **Category Tag** (`.cq-tut-category-label`): Small cyan uppercase label on top (e.g. `FIELD MANUAL: CAESAR SHIFT`).
   - **Main Heading** (`<h2>`): Large white glowing step title (e.g. `What is Caesar Shift?`).
   - **No duplicate step counter in header**: Progress tracking is handled visually by the bottom stepper pills.
2. **Hero Animation Viewport** (`.cq-tut-animation-wrapper`):
   - Dominates top ~60% of the body canvas with a radial dark backdrop, scanlines, and live interactive animations.
3. **Dual Intel Card Grid** (`.cq-tut-intel-grid`):
   - Replaces heavy textbook blocks with 2 side-by-side HUD micro-cards:
     - **Intel Card 1 (`core-card`)**: Cyan accent border, punchy core mechanic breakdown.
     - **Intel Card 2 (`tip-card`)**: Amber accent border, action-oriented cue or operational rule.

### C. `TUTORIAL_STEPS` Data Schema (Without Emojis)
```javascript
const TUTORIAL_STEPS = [
  {
    id: 1,
    title: 'Monoalphabetic Substitution',
    subtitle: 'What is Caesar Shift?',
    icon: 'menu_book',
    conceptTag: 'DIRECTIVE 01 // FOUNDATION',
    intel1: {
      tag: 'CORE MECHANIC',
      title: 'Direct Letter Shift',
      text: (
        <>
          Each character in your message is replaced by a letter a <strong>fixed number of positions</strong> down the alphabet.
        </>
      )
    },
    intel2: {
      tag: 'OPERATIVE RULE',
      title: 'Uniform Spacing',
      text: (
        <>
          Distance remains constant. If <strong>A &rarr; D (+3)</strong>, then <strong>B &rarr; E (+3)</strong> under the exact same shift key.
        </>
      )
    }
  }
];
```

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
/* Header category label & main h2 title */
.cq-tut-category-label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: var(--neon-cyan, #00e5ff);
  text-transform: uppercase;
  display: block;
  margin-bottom: 2px;
}

.cq-tut-header h2 {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #ffffff;
  margin: 0;
}

/* Dual Intel Grid & Micro-cards */
.cq-tut-intel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.cq-tut-intel-card {
  background: rgba(15, 20, 29, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cq-tut-intel-card.core-card {
  border-left: 3px solid var(--neon-cyan, #00e5ff);
}

.cq-tut-intel-card.tip-card {
  border-left: 3px solid #f59e0b;
}

/* Immediate blur & click shield during 0.4s cooldown */
.cq-tutorial-preparing-overlay {
  position: fixed;
  inset: 0;
  z-index: 9980;
  backdrop-filter: blur(8px);
  background: transparent;
  pointer-events: all;
  cursor: wait;
}

/* Modal backdrop overlay */
.cq-tut-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(4, 8, 15, 0.88);
  backdrop-filter: blur(14px);
  animation: cqTutFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Smooth exit animations */
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
2. Update the `TUTORIAL_STEPS` array content using the `intel1` and `intel2` data schema (without emojis).
3. Replace the viewport renderers in `renderAnimationViewport()` with Vigenère key grid / Playfair matrix visualizations.
4. Wire the trigger into `CipherGame.jsx` for `category === 'vigenere'` or `'playfair'`.
