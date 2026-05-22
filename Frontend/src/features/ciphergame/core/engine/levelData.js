import {
  generatePlayfairMatrix,
  preparePlayfairDigraphs,
  transformPlayfairPair,
} from "./playfair";

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
const caesarWords = {
  easy: [
    { plain: 'HELLO', hint: 'A common greeting' },
    { plain: 'WORLD', hint: 'The planet we live on' },
    { plain: 'APPLE', hint: 'A fruit that keeps the doctor away' },
    { plain: 'BEACH', hint: 'Sandy shores by the sea' },
    { plain: 'CLOUD', hint: 'Floats in the sky' },
    { plain: 'WATER', hint: 'Essential liquid for all living things' },
    { plain: 'SHARK', hint: 'A fearsome ocean predator' },
    { plain: 'CIPHER', hint: 'A secret way of writing' },
    { plain: 'OCEAN', hint: 'A very large expanse of sea' },
    { plain: 'SALMON', hint: 'Pink-fleshed fish that swims upstream' },
  ],
  medium: [
    { plain: 'SHIELD', hint: 'Used for protection in battle' },
    { plain: 'FALCON', hint: 'A fast bird of prey' },
    { plain: 'BRIDGE', hint: 'Connects two sides' },
    { plain: 'CASTLE', hint: 'A royal fortress' },
    { plain: 'DRAGON', hint: 'A mythical fire-breather' },
    { plain: 'ANCHOR', hint: 'Heavy metal object used to moor a ship' },
    { plain: 'SECRET', hint: 'Not meant to be known or seen by others' },
    { plain: 'TREASURE', hint: 'Precious metals, gems, or other values' },
    { plain: 'OCTOPUS', hint: 'Sea creature with eight tentacles' },
    { plain: 'COMPASS', hint: 'Instrument for finding direction' },
  ],
  hard: [
    { plain: 'CRYPTOGRAPHY', hint: 'The art of secret writing' },
    { plain: 'JAVASCRIPT', hint: 'A web programming language' },
    { plain: 'ALGORITHM', hint: 'A step-by-step problem solution' },
    { plain: 'FREQUENCY', hint: 'Rate of recurrence' },
    { plain: 'SUBSTITUTION', hint: 'Replacing one thing with another' },
    { plain: 'DECIPHERMENT', hint: 'The process of decoding secret messages' },
    { plain: 'MATHEMATICS', hint: 'The science of numbers and space' },
    { plain: 'POLYMORPHIC', hint: 'Occurring in several different forms' },
    { plain: 'COINCIDENCE', hint: 'A remarkable concurrence of events' },
    { plain: 'TRANSPOSITION', hint: 'Rearranging the positions of letters' },
  ],
};

function buildCaesarLevel(plain, shift, stageIndex, difficulty, hint) {
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
    hint: hint,
  };
}

const GAME_CYCLE_CAESAR = ['FISHING', 'PACMAN', 'SPRINT', 'FISHING', 'PACMAN'];

export function getCaesarLevelData(difficulty, stageIndex) {
  const pool = caesarWords[difficulty];
  const randIndex = Math.floor(Math.random() * pool.length);
  const w = pool[randIndex];
  // Randomize shift between 1 and 25
  const shift = Math.floor(Math.random() * 25) + 1;
  return buildCaesarLevel(w.plain, shift, stageIndex, difficulty, w.hint);
}

export function getCaesarGameType(stageIndex) {
  return GAME_CYCLE_CAESAR[stageIndex % GAME_CYCLE_CAESAR.length];
}

/* ─────────────────── Vigenere levels ─────────────────── */
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
    {
      plain: 'SUNSET',
      key: 'RED',
      hint: 'The daily disappearance of the sun below the horizon',
      keyClue: 'Key hint: the color of fire or blood',
      keyInfo: 'R=17, E=4, D=3 — simple 3-letter keyword to practice short cyclic shifting.'
    },
    {
      plain: 'PALACE',
      key: 'ROYAL',
      hint: 'The official residence of a sovereign or president',
      keyClue: 'Key hint: relating to a king or queen',
      keyInfo: 'R=17, O=14, Y=24, A=0, L=11 — 5-letter key alternates shifts across letters.'
    },
    {
      plain: 'DESERT',
      key: 'SAND',
      hint: 'A barren area of landscape where little precipitation occurs',
      keyClue: 'Key hint: tiny loose grains of rock on a beach',
      keyInfo: 'S=18, A=0, N=13, D=3 — A at position 2 leaves that letter completely unshifted.'
    },
    {
      plain: 'GALAXY',
      key: 'STAR',
      hint: 'A system of millions or billions of stars, together with gas and dust',
      keyClue: 'Key hint: a luminous point in the night sky',
      keyInfo: 'S=18, T=19, A=0, R=17 — notice how A does not shift the letter under it.'
    },
    {
      plain: 'CAVERN',
      key: 'DEEP',
      hint: 'A cave, especially a large one that is dark',
      keyClue: 'Key hint: extending far down from the top or surface',
      keyInfo: 'D=3, E=4, E=4, P=15 — repeating E shifts give two adjacent letters the same offset.'
    }
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
    {
      plain: 'HIDDEN TREASURE',
      key: 'GOLD',
      hint: 'Valuable things that are pushed out of sight or buried',
      keyClue: 'Key hint: a precious yellow metal',
      keyInfo: 'G=6, O=14, L=11, D=3 — simple 4-letter key repeating over a multi-word phrase.'
    },
    {
      plain: 'SECRET AGENT',
      key: 'SPY',
      hint: 'A person employed by a government to obtain information secretly',
      keyClue: 'Key hint: to gather intelligence stealthily',
      keyInfo: 'S=18, P=15, Y=24 — short key applied to a longer phrase, creating a high frequency of pattern repeats.'
    },
    {
      plain: 'SATELLITE DISH',
      key: 'WAVE',
      hint: 'A bowl-shaped antenna used to receive signals from space',
      keyClue: 'Key hint: a disturbance that travels through medium, like sound or ocean waves',
      keyInfo: 'W=22, A=0, V=21, E=4 — a nice mix of large shifts (W, V) and small shifts (A, E).'
    },
    {
      plain: 'ANCIENT SCROLL',
      key: 'TOMB',
      hint: 'A very old roll of parchment containing writing',
      keyClue: 'Key hint: a large vault, typically underground, for burying the dead',
      keyInfo: 'T=19, O=14, M=12, B=1 — the keyword shifts letters in a consistent pattern.'
    },
    {
      plain: 'DEEP SEA TRENCH',
      key: 'FISH',
      hint: 'A very deep area of the ocean floor',
      keyClue: 'Key hint: a limbless cold-blooded vertebrate animal with gills',
      keyInfo: 'F=5, I=8, S=18, H=7 — a thematic word and keyword combo.'
    }
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
    {
      plain: 'MATHEMATICAL SYMMETRY IN CRYPTOGRAPHY',
      key: 'EULER',
      hint: 'The balanced beauty of number theory in protecting secrets',
      keyClue: 'Key hint: the Swiss mathematician Leonhard Euler whose totient theorem is fundamental to RSA encryption',
      keyInfo: 'E=4, U=20, L=11, E=4, R=17 — 5-letter key repeating over a long mathematical phrase.'
    },
    {
      plain: 'KNOWLEDGE IS THE ULTIMATE DEFENSE',
      key: 'SHIELD',
      hint: 'Understanding ciphers is your best protection against espionage',
      keyClue: 'Key hint: a broad piece of armor held for protection',
      keyInfo: 'S=18, H=7, I=8, E=4, L=11, D=3 — a solid key applied to an inspiring motto.'
    },
    {
      plain: 'FREQUENCY SPECTRUM ANALYSIS SECURES CHANNELS',
      key: 'HACKER',
      hint: 'Analyzing signal frequencies to intercept or secure communications',
      keyClue: 'Key hint: a person who uses computers to gain unauthorized access to data',
      keyInfo: 'H=7, A=0, C=2, K=10, E=4, R=17 — A at index 2 offers a zero-shift hint in the cycle.'
    },
    {
      plain: 'ALGORITHMS GOVERN THE DIGITAL WORLD',
      key: 'BINARY',
      hint: 'Mathematical rules controlling all computer processing and ciphers',
      keyClue: 'Key hint: a system of numerical notation to the base 2',
      keyInfo: 'B=1, I=8, N=13, A=0, R=17, Y=24 — 6-letter key with wide ranging shifts.'
    },
    {
      plain: 'SECURE COMMUNICATIONS REQUIRE PERFECT KEY SYNC',
      key: 'VERNAM',
      hint: 'Both sides must keep their keys perfectly synchronized to decode messages',
      keyClue: 'Key hint: Gilbert Vernam, who patented the One-Time Pad in 1919',
      keyInfo: 'V=21, E=4, R=17, N=13, A=0, M=12 — Vernam ciphers utilize exclusive OR logic.'
    }
  ],
};

export function getVigenereLevelData(difficulty, stageIndex) {
  const pool = vigenereData[difficulty];
  const randIndex = Math.floor(Math.random() * pool.length);
  const d = pool[randIndex];
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
const playfairData = {
  easy: [
    {
      plain: 'HIDDEN MAP',
      key: 'LAGOON',
      hint: 'A secret chart that points toward buried treasure',
      keyClue: 'A calm pool separated from the open sea',
      lesson: 'Playfair reads two letters at a time. Repeated letters are split with filler X.',
    },
    {
      plain: 'SAFE HARBOR',
      key: 'ANCHOR',
      hint: 'A protected place where ships can rest',
      keyClue: 'Heavy metal gear that keeps a ship from drifting',
      lesson: 'Same-row digraphs move left when decrypting.',
    },
    {
      plain: 'SILVER KEY',
      key: 'COMPASS',
      hint: 'A bright object that can unlock a hidden door',
      keyClue: 'A navigator uses it to find north',
      lesson: 'Same-column digraphs move upward when decrypting.',
    },
    {
      plain: 'TIDAL CAVE',
      key: 'CURRENT',
      hint: 'A sea-carved chamber that opens at low water',
      keyClue: 'A moving stream of ocean water',
      lesson: 'Rectangle pairs swap columns while staying on their own rows.',
    },
    {
      plain: 'MOONLIT BAY',
      key: 'BEACON',
      hint: 'A quiet inlet brightened by night light',
      keyClue: 'A signal light that guides sailors home',
      lesson: 'The letter J shares I in the 5 by 5 matrix.',
    },
    {
      plain: 'PIRATE GOLD',
      key: 'ISLAND',
      hint: 'Sunken loot hidden by ocean outlaws',
      keyClue: 'A piece of land surrounded by water',
      lesson: 'Digraph pairs are mapped onto a 5x5 key matrix.'
    },
    {
      plain: 'DEEP WATER',
      key: 'OCEAN',
      hint: 'Vast blue sea depths',
      keyClue: 'A very large expanse of sea',
      lesson: 'Same-row digraphs shift to the left for decryption.'
    },
    {
      plain: 'SHIP WRECK',
      key: 'STORM',
      hint: 'A sunken vessel on the ocean floor',
      keyClue: 'Violent disturbance of the atmosphere with strong winds',
      lesson: 'Same-column digraphs shift upward for decryption.'
    },
    {
      plain: 'LOST MAPS',
      key: 'CHART',
      hint: 'Forgotten navigator guides',
      keyClue: 'A sheet map for sea navigation',
      lesson: 'Rectangle pairs swap columns while maintaining their row coordinates.'
    },
    {
      plain: 'SAND DUNES',
      key: 'BEACH',
      hint: 'Windblown ridges by the shoreline',
      keyClue: 'Sandy shore by the ocean',
      lesson: 'Remember that I and J share a single slot in the Playfair matrix.'
    }
  ],
  medium: [
    {
      plain: 'CIPHER ROUTE',
      key: 'VOYAGER',
      hint: 'A planned path for carrying a coded message',
      keyClue: 'Someone who travels far across water or space',
      lesson: 'Longer keys reshape the matrix and change every digraph decision.',
    },
    {
      plain: 'SECRET SIGNAL',
      key: 'HORIZON',
      hint: 'A hidden message flashed to an ally',
      keyClue: 'The line where sky appears to meet sea',
      lesson: 'Use the matrix positions first, then choose row, column, or rectangle.',
    },
    {
      plain: 'CORAL LOOKOUT',
      key: 'MARINER',
      hint: 'A reef station watching for danger',
      keyClue: 'A person skilled at navigating the sea',
      lesson: 'Double letters create filler X so each pair has two different letters.',
    },
    {
      plain: 'BURIED LETTER',
      key: 'SEASHELL',
      hint: 'A message hidden below the sand',
      keyClue: 'A beach object that sounds like the ocean',
      lesson: 'Playfair hides single-letter frequency by encrypting pairs.',
    },
    {
      plain: 'RIDDLE OF TIDES',
      key: 'ASTROLABE',
      hint: 'A puzzle about the ocean rising and falling',
      keyClue: 'An old instrument used to read stars for navigation',
      lesson: 'Every solved pair gives evidence for how the matrix is being used.',
    },
    {
      plain: 'INTERCEPT CODE',
      key: 'RECEIVER',
      hint: 'Eavesdropping on a cipher transmission',
      keyClue: 'A device or person that gets signals',
      lesson: 'Repeating letters are automatically split using filler letter X.'
    },
    {
      plain: 'OCEAN CURRENTS',
      key: 'DRIFTING',
      hint: 'Moving waters that carry ships',
      keyClue: 'Floating along with the flow',
      lesson: 'Every letter pair acts as coordinates in the 5x5 grid.'
    },
    {
      plain: 'SUNKEN GALLEON',
      key: 'SPANISH',
      hint: 'A Spanish gold ship at the bottom of the sea',
      keyClue: 'Relating to Spain',
      lesson: 'Playfair resists frequency analysis because single letters do not map directly.'
    },
    {
      plain: 'CIPHER SECRETS',
      key: 'LOCKBOX',
      hint: 'Encrypted details in a secure container',
      keyClue: 'A metal box with a lock',
      lesson: 'The key phrase dictates the layout of the 5x5 matrix.'
    },
    {
      plain: 'STARRY NIGHTS',
      key: 'NAVIGATOR',
      hint: 'Clear skies used for guiding ships',
      keyClue: 'The officer responsible for steering the ship',
      lesson: 'Digraph encryption preserves letter coordinates in structured shapes.'
    }
  ],
  hard: [
    {
      plain: 'JOURNAL HIDES THE FINAL COORDINATE',
      key: 'CARTOGRAPHER',
      hint: 'A logbook conceals the last map position',
      keyClue: 'A maker of maps',
      lesson: 'J becomes I before pairing, which changes both the text and the matrix.',
    },
    {
      plain: 'THE LIGHTHOUSE WINDOW REVEALS A ROUTE',
      key: 'LIGHTHOUSE',
      hint: 'A tower signal exposes where to sail next',
      keyClue: 'A coastal tower that warns ships',
      lesson: 'Hard Playfair solving is pattern work: inspect matrix geometry, not just letters.',
    },
    {
      plain: 'ANCIENT MARINERS GUARDED SILENT KEYS',
      key: 'CONSTELLATION',
      hint: 'Old sailors protected quiet cipher clues',
      keyClue: 'A named pattern of stars',
      lesson: 'A strong keyword spreads common letters across the square.',
    },
    {
      plain: 'FREQUENCY CLUES FAIL AGAINST DIGRAPHS',
      key: 'MONSOON CURRENT',
      hint: 'Single-letter statistics become less reliable',
      keyClue: 'Seasonal winds and moving seawater',
      lesson: 'Playfair was stronger than simple substitution because it encrypts pairs.',
    },
    {
      plain: 'RECTANGLES COLUMNS AND ROWS SOLVE THE VAULT',
      key: 'ABYSSAL TRENCH',
      hint: 'The three matrix moves open the final lock',
      keyClue: 'The deepest kind of ocean valley',
      lesson: 'Mastery means recognizing all three rules quickly under pressure.',
    },
    {
      plain: 'CRYPTANALYSIS SOLVES THE MATRIX PUZZLES',
      key: 'DECIPHERABLE',
      hint: 'Applying math and logic to break the grid',
      keyClue: 'Able to be decoded or understood',
      lesson: 'Playfair was widely used in WWII because it could be computed by hand.'
    },
    {
      plain: 'NAVIGATORS READ STARS FOR STEERING ROUTES',
      key: 'CONSTELLATIONS',
      hint: 'Guiding vessels using celestial patterns',
      keyClue: 'Recognizable patterns of stars',
      lesson: 'Remember to swap J for I when creating the matrix and mapping pairs.'
    },
    {
      plain: 'DOUBLE LETTER PAIRINGS RECEIVE FILLER LETTERS',
      key: 'SYMMETRICAL',
      hint: 'Splitting identical sequential characters in the plaintext',
      keyClue: 'Made up of exactly similar parts facing each other',
      lesson: 'Plaintext splitting prevents double-letter repeats from mapping to the same output.'
    },
    {
      plain: 'THE SUBMARINE STEALTHILY AVOIDS DETECTION',
      key: 'HYDROPHONE',
      hint: 'Undersea vessel running silent under the thermocline',
      keyClue: 'An instrument for detecting underwater sound',
      lesson: 'A wider keyword matrix layout makes rectangle patterns less obvious.'
    },
    {
      plain: 'SYMMETRIC ENCRYPTION RULES THE SEA LANES',
      key: 'CRYPTOSECURITY',
      hint: 'Using identical keys for coding and decoding messages',
      keyClue: 'Safety measures protecting communication channels',
      lesson: 'Playfair is a symmetric cipher, meaning decryption is the exact reverse of encryption.'
    }
  ],
};

export function getPlayfairLevelData(difficulty, stageIndex) {
  const pool = playfairData[difficulty];
  const randIndex = Math.floor(Math.random() * pool.length);
  const data = pool[randIndex];
  const matrix = generatePlayfairMatrix(data.key);
  const pairs = preparePlayfairDigraphs(data.plain);
  const encryptedPairs = pairs.map((pair) => transformPlayfairPair(pair, matrix, 'encrypt'));

  return {
    level: stageIndex + 1,
    difficulty,
    plaintext: pairs.join(' '),
    displayPlaintext: data.plain,
    ciphertext: encryptedPairs.map((pair) => pair.result).join(' '),
    key: data.key,
    matrix,
    pairs,
    cipherPairs: encryptedPairs.map((pair) => pair.result),
    rules: encryptedPairs.map((pair) => pair.rule),
    hint: data.hint,
    keyClue: data.keyClue,
    lesson: data.lesson,
  };
}

export function getPlayfairGameType() {
  return 'PLAYFAIR_FISHING';
}
