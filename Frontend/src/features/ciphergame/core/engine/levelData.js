/**
 * Level data for each cipher category, difficulty, and stage.
 *
 * Caesar  → 3 game types: FISHING (CaesarFishingGame), PACMAN, SPRINT
 * Vigenere → 1 game type: FISHING (VigenereGame)
 * Playfair → placeholder
 *
 * levelData shape for Caesar FISHING / PACMAN / SPRINT:
 *   { level, ciphertext, plaintext, targetShifts, masks, hint }
 *
 * levelData shape for Vigenere FISHING:
 *   { level, ciphertext, plaintext, targetKey, hint }
 */

/* ─────────────────── helpers ─────────────────── */
function caesarEnc(text, shift) {
  return text.toUpperCase().split('').map(c => {
    const code = c.charCodeAt(0);
    if (code < 65 || code > 90) return c;
    return String.fromCharCode(((code - 65 + shift) % 26) + 65);
  }).join('');
}

function vigEnc(text, key) {
  text = text.toUpperCase(); key = key.toUpperCase();
  let j = 0, out = '';
  for (const c of text) {
    const code = c.charCodeAt(0);
    if (code < 65 || code > 90) { out += c; continue; }
    const sh = key.charCodeAt(j % key.length) - 65;
    out += String.fromCharCode(((code - 65 + sh) % 26) + 65);
    j++;
  }
  return out;
}

/** Build a boolean mask array: false = player must solve this letter */
function makeMask(len, revealFraction = 0.5) {
  const mask = Array(len).fill(true);
  const hideCount = Math.ceil(len * (1 - revealFraction));
  const indices = Array.from({ length: len }, (_, i) => i)
    .sort(() => Math.random() - 0.5)
    .slice(0, hideCount);
  indices.forEach(i => { mask[i] = false; });
  return mask;
}

/* ─────────────────── Caesar levels ─────────────────── */
// Stage cycling: stage 0→FISHING, stage 1→PACMAN, stage 2→SPRINT, 3→FISHING, 4→PACMAN
// (5 stages per difficulty, distributed across 3 games)

const caesarWords = {
  easy: [
    { plain: 'HELLO',   shift: 3, hint: 'A common greeting' },
    { plain: 'WORLD',   shift: 5, hint: 'The planet we live on' },
    { plain: 'APPLE',   shift: 7, hint: 'A fruit that keeps the doctor away' },
    { plain: 'BEACH',   shift: 4, hint: 'Sandy shores by the sea' },
    { plain: 'CLOUD',   shift: 6, hint: 'Floats in the sky' },
  ],
  medium: [
    { plain: 'SHIELD',  shift: 11, hint: 'Used for protection in battle' },
    { plain: 'FALCON',  shift: 13, hint: 'A fast bird of prey' },
    { plain: 'BRIDGE',  shift: 9,  hint: 'Connects two sides' },
    { plain: 'CASTLE',  shift: 15, hint: 'A royal fortress' },
    { plain: 'DRAGON',  shift: 17, hint: 'A mythical fire-breather' },
  ],
  hard: [
    { plain: 'CRYPTOGRAPHY', shift: 19, hint: 'The art of secret writing' },
    { plain: 'JAVASCRIPT',   shift: 21, hint: 'A web programming language' },
    { plain: 'ALGORITHM',    shift: 23, hint: 'A step-by-step problem solution' },
    { plain: 'FREQUENCY',    shift: 17, hint: 'Rate of recurrence' },
    { plain: 'SUBSTITUTION', shift: 25, hint: 'Replacing one thing with another' },
  ],
};

function buildCaesarLevel(plain, shift, stageIndex, difficulty) {
  const ciphertext = caesarEnc(plain, shift);
  const len = plain.length;
  // Reveal more in easy, less in hard
  const reveal = difficulty === 'easy' ? 0.6 : difficulty === 'medium' ? 0.5 : 0.35;
  const mask = makeMask(len, reveal);
  // Starting shift must not equal the target shift
  let startShift;
  do { startShift = Math.floor(Math.random() * 5); } while (startShift === shift);
  return {
    level: stageIndex + 1,
    ciphertext,
    plaintext: plain,
    targetShifts: [shift],
    startShifts: [startShift],
    masks: [mask],
    hint: caesarWords[difficulty][stageIndex].hint,
  };
}

const GAME_CYCLE_CAESAR = ['FISHING', 'PACMAN', 'SPRINT', 'FISHING', 'PACMAN'];

export function getCaesarLevelData(difficulty, stageIndex) {
  const w = caesarWords[difficulty][stageIndex];
  return buildCaesarLevel(w.plain, w.shift, stageIndex, difficulty);
}

export function getCaesarGameType(stageIndex) {
  return GAME_CYCLE_CAESAR[stageIndex % GAME_CYCLE_CAESAR.length];
}

/* ─────────────────── Vigenere levels ─────────────────── */
// Vigenere only has its own fishing game

/*
 * Vigenère level design principles:
 *  - Easy:   2-letter keys, short words, one thematic clue about the key
 *  - Medium: 4-letter keys, 2-word phrases, key relates to theme
 *  - Hard:   5-7 letter keys, multi-word phrases, key hidden in a riddle
 *
 * Each entry includes:
 *   plain    — plaintext (uppercase)
 *   key      — keyword (uppercase)
 *   hint     — what the plaintext means
 *   keyClue  — a riddle / clue about the keyword itself
 *   keyInfo  — educational note shown in sidebar (why this key, what shifts it applies)
 */
const vigenereData = {
  easy: [
    {
      plain: 'MARBLE',
      key: 'GO',
      hint: 'A small glass sphere used in playground games',
      keyClue: 'Key hint: what you say to start a race',
      keyInfo: 'G=6, O=14 — this 2-letter key alternates between two different Caesar shifts across the letters.',
    },
    {
      plain: 'JUNGLE',
      key: 'AX',
      hint: 'A dense tropical forest',
      keyClue: 'Key hint: the tool a lumberjack swings to fell trees',
      keyInfo: 'A=0, X=23 — notice A causes no shift while X shifts almost a full alphabet backward.',
    },
    {
      plain: 'BRIDGE',
      key: 'UP',
      hint: 'A structure that crosses a river or gap',
      keyClue: 'Key hint: the opposite of down',
      keyInfo: 'U=20, P=15 — both letters apply large forward shifts, making the ciphertext drift far from the original.',
    },
    {
      plain: 'FROZEN',
      key: 'MW',
      hint: 'Turned solid by extreme cold',
      keyClue: 'Key hint: the 13th and 23rd letters of the alphabet',
      keyInfo: 'M=12, W=22 — mid-alphabet and near-end shifts give very different offsets to alternating letters.',
    },
    {
      plain: 'PIRATE',
      key: 'XO',
      hint: 'A sea bandit who sails under a skull-and-crossbones flag',
      keyClue: 'Key hint: a hugs-and-kisses sign-off in a letter',
      keyInfo: 'X=23, O=14 — X is only 3 away from Z, so it produces a near-reverse shift; O shifts by 14.',
    },
  ],
  medium: [
    {
      plain: 'STORM FRONT',
      key: 'GALE',
      hint: 'The leading edge of an incoming severe weather system',
      keyClue: 'Key hint: a very strong wind — almost a hurricane',
      keyInfo: 'G=6, A=0, L=11, E=4 — A causes no shift at all, so the letter under A is a freebie if you know it.',
    },
    {
      plain: 'NIGHT WATCH',
      key: 'MOON',
      hint: 'A guard shift that runs through the dark hours',
      keyClue: 'Key hint: it controls the tides and lights up the night sky',
      keyInfo: 'M=12, O=14, O=14, N=13 — two identical O shifts means every 2nd and 3rd key-position letter gets the same Caesar offset.',
    },
    {
      plain: 'FORGE IRON',
      key: 'FIRE',
      hint: 'To shape metal by heating it in a furnace and hammering',
      keyClue: 'Key hint: the element that the blacksmith cannot work without',
      keyInfo: 'F=5, I=8, R=17, E=4 — R is the largest shift here; plaintext letters under R jump 17 positions forward.',
    },
    {
      plain: 'ROGUE AGENT',
      key: 'MASK',
      hint: 'A spy who has gone off the books and operates alone',
      keyClue: 'Key hint: what a spy or actor wears to hide their identity',
      keyInfo: 'M=12, A=0, S=18, K=10 — A gives away its position for free; use that letter to narrow down the key.',
    },
    {
      plain: 'CORAL TRENCH',
      key: 'REEF',
      hint: 'A deep undersea canyon lined with living coral structures',
      keyClue: 'Key hint: a shallow rocky formation just below the ocean surface',
      keyInfo: 'R=17, E=4, E=4, F=5 — two consecutive E shifts repeat; look for repeating patterns in the ciphertext.',
    },
  ],
  hard: [
    {
      plain: 'CRYPTOGRAPHY BREAKS CODES',
      key: 'ENIGMA',
      hint: 'The science of making and breaking secret messages',
      keyClue: 'Key hint: the famous German WWII cipher machine that Alan Turing cracked',
      keyInfo: 'E=4, N=13, I=8, G=6, M=12, A=0 — 6-letter key means the pattern repeats roughly every 6 letters. A at position 6 produces no shift — that plaintext letter shows through unchanged.',
    },
    {
      plain: 'POLYALPHABETIC SUBSTITUTION',
      key: 'BLAISE',
      hint: 'A cipher that uses multiple shifted alphabets, making frequency analysis much harder',
      keyClue: 'Key hint: Blaise de Vigenère — the 16th-century French diplomat who popularized this cipher',
      keyInfo: 'B=1, L=11, A=0, I=8, S=18, E=4 — A at position 3 is a free letter. S=18 is the largest shift, moving letters nearly ¾ of the way around the alphabet.',
    },
    {
      plain: 'FREQUENCY ANALYSIS REVEALS KEYS',
      key: 'KASISKI',
      hint: 'The statistical attack on polyalphabetic ciphers by studying repeated letter patterns',
      keyClue: 'Key hint: Friedrich Kasiski, who published the first systematic break of the Vigenère cipher in 1863',
      keyInfo: 'K=10, A=0, S=18, I=8, S=18, K=10, I=8 — two S-shifts and two K-shifts repeat; a skilled analyst could spot the period from ciphertext repetitions alone.',
    },
    {
      plain: 'INDEX OF COINCIDENCE EXPOSES PERIOD',
      key: 'BABBAGE',
      hint: 'A mathematical measure used to estimate the key length of a Vigenère-encrypted message',
      keyClue: 'Key hint: Charles Babbage — the Victorian mathematician who secretly cracked Vigenère cipher but never published his method',
      keyInfo: 'B=1, A=0, B=1, B=1, A=0, G=6, E=4 — three A-shifts mean three plaintext positions appear completely unshifted in the ciphertext. Spot the most common letters at those positions to verify.',
    },
    {
      plain: 'ONE TIME PAD ACHIEVES PERFECT SECRECY',
      key: 'SHANNON',
      hint: 'A theoretically unbreakable cipher where the key is as long as the message and used only once',
      keyClue: 'Key hint: Claude Shannon — the mathematician who proved information-theoretic security in 1949',
      keyInfo: 'S=18, H=7, A=0, N=13, N=13, O=14, N=13 — three N-shifts and one A-shift. Shannon\'s proof showed that for perfect secrecy the key entropy must equal the message entropy — something a repeating Vigenère key cannot achieve.',
    },
  ],
};

export function getVigenereLevelData(difficulty, stageIndex) {
  const d = vigenereData[difficulty][stageIndex];
  const ciphertext = vigEnc(d.plain, d.key);
  return {
    level: stageIndex + 1,
    ciphertext,
    plaintext: d.plain,
    targetKey: d.key,
    hint: d.hint,
    keyClue: d.keyClue,
    keyInfo: d.keyInfo,
  };
}

export function getVigenereGameType() {
  return 'VIGENERE_FISHING'; // always the same game for vigenere
}

/* ─────────────────── Playfair levels ─────────────────── */
// Playfair is placeholder only
export function getPlayfairLevelData(difficulty, stageIndex) {
  return {
    level: stageIndex + 1,
    difficulty,
    hint: 'Playfair cipher uses a 5×5 key matrix to encrypt digraphs.',
  };
}

export function getPlayfairGameType() {
  return 'PLAYFAIR_PLACEHOLDER';
}