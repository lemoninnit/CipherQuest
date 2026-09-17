import {
  generatePlayfairMatrix,
  preparePlayfairDigraphs,
  transformPlayfairPair,
  playfairEncrypt,
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
    { plain: 'PUZZLE', hint: 'A problem designed to test ingenuity' },
    { plain: 'MYSTERY', hint: 'Something that remains difficult to explain or understand' },
    { plain: 'LANTERN', hint: 'A portable lighting device with a protective case' },
    { plain: 'VOYAGE', hint: 'A long journey, especially by water or through space' },
    { plain: 'TREASURE', hint: 'A quantity of precious gems, metals, or valuables' },
    { plain: 'COMPASS', hint: 'A navigational instrument showing magnetic directions' },
    { plain: 'FORTRESS', hint: 'A strongly fortified military stronghold or citadel' },
    { plain: 'SHADOW', hint: 'A dark area produced by an object blocking light' },
    { plain: 'CRYSTAL', hint: 'A clear transparent mineral with faceted surfaces' },
    { plain: 'HARBOR', hint: 'A sheltered body of water where ships anchor safely' },
  ],
  hard: [
    { plain: 'DARK NIGHT', hint: 'The hours of darkness before sunrise' },
    { plain: 'LOST KEY', hint: 'A misplaced tool used to unlock doorways' },
    { plain: 'SILENT CODE', hint: 'A quiet cipher transmitted without sound' },
    { plain: 'HIDDEN MAP', hint: 'A secret chart pointing toward concealed locations' },
    { plain: 'GOLDEN VAULT', hint: 'A secure underground chamber holding valuables' },
    { plain: 'IRON SHIELD', hint: 'A heavy piece of defensive armor held in battle' },
    { plain: 'SECRET CAVE', hint: 'An uncharted hollow chamber beneath the rocks' },
    { plain: 'ANCIENT TOWER', hint: 'A tall stone spire standing from centuries ago' },
    { plain: 'MIDNIGHT SUN', hint: 'A natural phenomenon where daylight persists all night' },
    { plain: 'FROZEN SHORE', hint: 'An icy coastal boundary beside freezing waters' },
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
      plain: 'PHANTOM',
      key: 'GHOST',
      hint: 'An apparition or specter seen in the shadows',
      keyClue: 'Key hint: a wandering spirit from beyond',
      keyInfo: 'G=6, H=7, O=14, S=18, T=19 — five distinct shifts cycle across the word.',
    },
    {
      plain: 'BEACON',
      key: 'LIGHT',
      hint: 'A visible guiding signal or coastal fire',
      keyClue: 'Key hint: electromagnetic radiation that illuminates',
      keyInfo: 'L=11, I=8, G=6, H=7, T=19 — each letter of the key advances the plaintext accordingly.',
    },
    {
      plain: 'HORIZON',
      key: 'OCEAN',
      hint: 'The distant line where earth or water meets the sky',
      keyClue: 'Key hint: a vast continuous body of salt water',
      keyInfo: 'O=14, C=2, E=4, A=0, N=13 — A produces a shift of zero, leaving that letter unchanged.',
    },
    {
      plain: 'FALCON',
      key: 'BIRD',
      hint: 'A swift bird of prey known for high-speed dives',
      keyClue: 'Key hint: a feathered animal with wings',
      keyInfo: 'B=1, I=8, R=17, D=3 — a compact 4-letter key repeating over the word.',
    },
    {
      plain: 'CORSAIR',
      key: 'PIRATE',
      hint: 'A privateer or sea raider of historic waters',
      keyClue: 'Key hint: a buccaneer sailing under the Jolly Roger',
      keyInfo: 'P=15, I=8, R=17, A=0, T=19, E=4 — A provides an unshifted anchor letter.',
    },
    {
      plain: 'TEMPEST',
      key: 'STORM',
      hint: 'A violent and windy rainstorm at sea',
      keyClue: 'Key hint: severe turbulent atmospheric weather',
      keyInfo: 'S=18, T=19, O=14, R=17, M=12 — strong high-value shifts throughout.',
    },
    {
      plain: 'GALAXY',
      key: 'STAR',
      hint: 'A gravitationally bound system of stars and cosmic dust',
      keyClue: 'Key hint: a glowing celestial body of plasma',
      keyInfo: 'S=18, T=19, A=0, R=17 — A=0 exposes the underlying character directly.',
    },
    {
      plain: 'KEEPER',
      key: 'LOCK',
      hint: 'A guardian or caretaker watching over a domain',
      keyClue: 'Key hint: a fastening mechanism opened by a key',
      keyInfo: 'L=11, O=14, C=2, K=10 — four key values cycling through the positions.',
    },
    {
      plain: 'HARBOR',
      key: 'PORT',
      hint: 'A sheltered port where boats find refuge',
      keyClue: 'Key hint: a maritime harbor town where ships dock',
      keyInfo: 'P=15, O=14, R=17, T=19 — high shifts clustered between 14 and 19.',
    },
    {
      plain: 'MIRAGE',
      key: 'SAND',
      hint: 'An optical illusion caused by atmospheric conditions',
      keyClue: 'Key hint: granular mineral particles found in deserts',
      keyInfo: 'S=18, A=0, N=13, D=3 — A=0 gives away a plaintext position.',
    },
  ],
  hard: [
    {
      plain: 'SILENT CIPHER',
      key: 'SECRET',
      hint: 'An encoded message transmitted without making noise',
      keyClue: 'Key hint: kept hidden from the knowledge of others',
      keyInfo: 'S=18, E=4, C=2, R=17, E=4, T=19 — repeating E shifts give two key positions identical offsets.',
    },
    {
      plain: 'DARK FORTRESS',
      key: 'CASTLE',
      hint: 'A formidable black stronghold rising above the crags',
      keyClue: 'Key hint: a large fortified building of medieval stone',
      keyInfo: 'C=2, A=0, S=18, T=19, L=11, E=4 — A at position 2 leaves its letter unshifted.',
    },
    {
      plain: 'GOLDEN FALCON',
      key: 'SHIELD',
      hint: 'A gilded sculpture of a predatory hunting bird',
      keyClue: 'Key hint: a piece of defensive armor held to block strikes',
      keyInfo: 'S=18, H=7, I=8, E=4, L=11, D=3 — a balanced 6-letter keyword.',
    },
    {
      plain: 'MYSTIC RUNES',
      key: 'ENIGMA',
      hint: 'Ancient carved symbols endowed with magical meaning',
      keyClue: 'Key hint: a mysterious or puzzling riddle or machine',
      keyInfo: 'E=4, N=13, I=8, G=6, M=12, A=0 — A=0 reveals its corresponding character.',
    },
    {
      plain: 'STEALTH AGENT',
      key: 'SHADOW',
      hint: 'An undercover operative trained in silent movement',
      keyClue: 'Key hint: darkness cast by an obstructed light source',
      keyInfo: 'S=18, H=7, A=0, D=3, O=14, W=22 — contains wide shifts from 0 to 22.',
    },
    {
      plain: 'ANCIENT SCROLL',
      key: 'TEMPLE',
      hint: 'A brittle parchment roll preserving historic knowledge',
      keyClue: 'Key hint: a sacred building devoted to worship',
      keyInfo: 'T=19, E=4, M=12, P=15, L=11, E=4 — duplicate E shifts at indices 1 and 5.',
    },
    {
      plain: 'MIDNIGHT SIGNAL',
      key: 'BEACON',
      hint: 'A beacon transmission dispatched in the dead of night',
      keyClue: 'Key hint: a guiding light tower on a rocky cape',
      keyInfo: 'B=1, E=4, A=0, C=2, O=14, N=13 — A=0 gives an exact match at that cycle slot.',
    },
    {
      plain: 'HIDDEN COMPASS',
      key: 'VOYAGE',
      hint: 'A concealed navigational gauge showing magnetic north',
      keyClue: 'Key hint: a long journey across the open seas',
      keyInfo: 'V=21, O=14, Y=24, A=0, G=6, E=4 — high shifts V and Y with a zero shift at A.',
    },
    {
      plain: 'FROZEN TRENCH',
      key: 'ARCTIC',
      hint: 'A deep undersea chasm surrounded by polar ice',
      keyClue: 'Key hint: the polar region surrounding the North Pole',
      keyInfo: 'A=0, R=17, C=2, T=19, I=8, C=2 — double C provides repeated shift offsets.',
    },
    {
      plain: 'SILVER LANTERN',
      key: 'LUNAR',
      hint: 'A gleaming metal lamp holding an illuminating flame',
      keyClue: 'Key hint: relating to the moon and its phases',
      keyInfo: 'L=11, U=20, N=13, A=0, R=17 — 5-letter key cycling across both words.',
    },
  ],
};

function buildVigenereLevel(plain, key, stageIndex, difficulty, hint, keyClue, keyInfo) {
  const ciphertext = vigEnc(plain, key);
  const len = plain.length;
  const reveal = difficulty === 'easy' ? 0.6 : difficulty === 'medium' ? 0.5 : 0.35;
  const mask = makeMask(len, reveal);
  const targetShifts = [];
  const startShifts = [];
  const masks = [];
  const words = plain.split(' ');
  let currentMaskIdx = 0;
  words.forEach(word => {
    const wordMask = mask.slice(currentMaskIdx, currentMaskIdx + word.length);
    masks.push(wordMask);
    currentMaskIdx += word.length;
  });
  // For Vigenere, targetShifts should be the shift values from the key (A=0, B=1, ..., Z=25)
  key.split('').forEach(k => {
    const shift = k.charCodeAt(0) - 65;
    targetShifts.push(shift);
    let startShift;
    do { startShift = Math.floor(Math.random() * 5); } while (startShift === shift);
    startShifts.push(startShift);
  });
  return {
    level: stageIndex + 1,
    ciphertext,
    plaintext: plain,
    targetKey: key,
    targetShifts,
    startShifts,
    masks,
    hint: hint,
    keyClue: keyClue,
    keyInfo: keyInfo,
  };
}

export function getVigenereLevelData(difficulty, stageIndex) {
  const pool = vigenereData[difficulty];
  const randIndex = Math.floor(Math.random() * pool.length);
  const d = pool[randIndex];
  return buildVigenereLevel(d.plain, d.key, stageIndex, difficulty, d.hint, d.keyClue, d.keyInfo);
}

const GAME_CYCLE_VIGENERE = ['FISHING', 'PACMAN', 'SPRINT', 'FISHING', 'PACMAN'];

export function getVigenereGameType(stageIndex = 0) {
  return GAME_CYCLE_VIGENERE[stageIndex % GAME_CYCLE_VIGENERE.length];
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
      plain: 'ANCHOR',
      key: 'VOYAGER',
      hint: 'A heavy metal device cast overboard to moor a ship',
      keyClue: 'Someone who travels far across water or space',
      lesson: 'Longer keys reshape the matrix and change every digraph decision.',
    },
    {
      plain: 'BEACON',
      key: 'HORIZON',
      hint: 'A guiding light signal set along the shore',
      keyClue: 'The line where sky appears to meet sea',
      lesson: 'Use the matrix positions first, then choose row, column, or rectangle.',
    },
    {
      plain: 'FALCON',
      key: 'MARINER',
      hint: 'A raptor with keen sight and swift flight',
      keyClue: 'A person skilled at navigating the sea',
      lesson: 'Letter pairs are located in the 5x5 grid before rule selection.',
    },
    {
      plain: 'HARBOR',
      key: 'SEASHELL',
      hint: 'A calm coastal shelter where ships anchor safely',
      keyClue: 'A beach object washed ashore by ocean waves',
      lesson: 'Playfair hides single-letter frequency by encrypting pairs.',
    },
    {
      plain: 'ISLAND',
      key: 'ASTROLABE',
      hint: 'A tract of land completely surrounded by water',
      keyClue: 'An old instrument used to read stars for navigation',
      lesson: 'Every solved pair gives evidence for how the matrix is constructed.',
    },
    {
      plain: 'PIRATE',
      key: 'LOCKBOX',
      hint: 'A swashbuckling mariner seeking treasure',
      keyClue: 'A metal chest with a sturdy lock',
      lesson: 'The key phrase dictates the layout of the 5x5 matrix.',
    },
    {
      plain: 'SILVER',
      key: 'DRIFTING',
      hint: 'A precious lustrous white metallic element',
      keyClue: 'Floating along with the tidal flow',
      lesson: 'Every letter pair acts as coordinates in the 5x5 grid.',
    },
    {
      plain: 'TIMBER',
      key: 'SPANISH',
      hint: 'Strong wood beams used in shipbuilding',
      keyClue: 'Relating to historic fleets and explorers',
      lesson: 'Playfair resists frequency analysis because letters encrypt in pairs.',
    },
    {
      plain: 'VOYAGE',
      key: 'NAVIGATOR',
      hint: 'An adventurous journey across vast oceans',
      keyClue: 'The officer responsible for steering the ship',
      lesson: 'Digraph encryption preserves letter coordinates in structured shapes.',
    },
    {
      plain: 'ZEPHYR',
      key: 'COMPASS',
      hint: 'A gentle and pleasant westerly breeze',
      keyClue: 'A magnetic navigation dial',
      lesson: 'Two letters in the same row wrap horizontally during encryption.',
    },
  ],
  hard: [
    {
      plain: 'DARK CAVE',
      key: 'CARTOGRAPHER',
      hint: 'An unlit cavern beneath rocky cliffs',
      keyClue: 'A skilled maker of nautical maps',
      lesson: 'Rectangle pairs swap columns while maintaining their row coordinates.',
    },
    {
      plain: 'LOST COIN',
      key: 'LIGHTHOUSE',
      hint: 'A misplaced metallic piece of currency',
      keyClue: 'A coastal beacon tower warning mariners',
      lesson: 'Hard Playfair solving is pattern work: inspect matrix geometry.',
    },
    {
      plain: 'IRON HELM',
      key: 'CONSTELLATION',
      hint: 'A sturdy piece of armor shielding the head',
      keyClue: 'A recognizable celestial grouping of stars',
      lesson: 'A strong keyword spreads common letters across the square.',
    },
    {
      plain: 'GOLD MINE',
      key: 'MONSOON',
      hint: 'An underground excavation yielding precious ore',
      keyClue: 'A seasonal prevailing wind bringing ocean rains',
      lesson: 'Playfair was stronger than simple substitution because it encrypts pairs.',
    },
    {
      plain: 'SILENT SHIP',
      key: 'ABYSSAL',
      hint: 'A phantom vessel gliding through fog without a sound',
      keyClue: 'Belonging to the immense depths of the ocean',
      lesson: 'Mastery means recognizing row, column, and rectangle rules quickly.',
    },
    {
      plain: 'SECRET CAVE',
      key: 'DECIPHERABLE',
      hint: 'A hidden grotto tucked away from prying eyes',
      keyClue: 'Able to be decoded or understood',
      lesson: 'Playfair was widely used in WWII because it could be computed by hand.',
    },
    {
      plain: 'COLD WIND',
      key: 'CHART',
      hint: 'A brisk icy gust sweeping across the deck',
      keyClue: 'A sheet map for marine navigation',
      lesson: 'Remember that I and J share a single slot in the Playfair matrix.',
    },
    {
      plain: 'ANCIENT MAP',
      key: 'OCTOPUS',
      hint: 'An aged parchment indicating forgotten trails',
      keyClue: 'An eight-armed ocean creature of the deep',
      lesson: 'Same-column digraphs shift upward for decryption.',
    },
    {
      plain: 'BLUE SHADOW',
      key: 'HYDROPHONE',
      hint: 'A cool twilight outline cast upon the water',
      keyClue: 'An instrument for detecting underwater sound',
      lesson: 'A wider keyword matrix layout makes rectangle patterns less obvious.',
    },
    {
      plain: 'STORM WATCH',
      key: 'CORSAIR',
      hint: 'A vigilant lookout for squalls and turbulent seas',
      keyClue: 'A historic privateer of the open sea',
      lesson: 'Playfair is a symmetric cipher, meaning decryption reverses encryption.',
    },
  ],
};

export function getPlayfairLevelData(difficulty, stageIndex) {
  const pool = playfairData[difficulty];
  const randIndex = Math.floor(Math.random() * pool.length);
  const data = pool[randIndex];
  return buildPlayfairLevel(data.plain, data.key, stageIndex, difficulty, data.hint, data.keyClue, data.lesson);
}

const GAME_CYCLE_PLAYFAIR = ['FISHING', 'PACMAN', 'SPRINT', 'FISHING', 'PACMAN'];

function buildPlayfairLevel(plain, key, stageIndex, difficulty, hint, keyClue, lesson) {
  const matrix = generatePlayfairMatrix(key);
  const pairs = preparePlayfairDigraphs(plain);
  const encryptedPairs = pairs.map((pair) => transformPlayfairPair(pair, matrix, 'encrypt'));
  
  // For PlayfairFishingGame: ciphertext as pairs joined by spaces, plaintext as pairs
  const pairPlaintext = pairs.join(' ');
  const pairCiphertext = encryptedPairs.map((pair) => pair.result).join(' ');
  
  // Get actual Playfair ciphertext
  const playfairCiphertext = playfairEncrypt(plain, key);
  
  // Now, we need to map the original plaintext characters to the Playfair ciphertext.
  // But Playfair processes pairs and may add X's, so let's create a version of ciphertext
  // that preserves spaces and non-letters from the original plaintext, with Playfair-encrypted letters.
  let ciphertext = '';
  let pfIdx = 0;
  for (let i = 0; i < plain.length; i++) {
    const char = plain[i];
    if (char < 'A' || char > 'Z') {
      ciphertext += char;
    } else {
      if (pfIdx < playfairCiphertext.length) {
        ciphertext += playfairCiphertext[pfIdx];
        pfIdx++;
      } else {
        ciphertext += char;
      }
    }
  }
  
  const len = plain.length;
  const reveal = difficulty === 'easy' ? 0.6 : difficulty === 'medium' ? 0.5 : 0.35;
  const mask = makeMask(len, reveal);
  const words = plain.split(' ');
  const masks = [];
  let currentMaskIdx = 0;
  words.forEach(word => {
    const wordMask = mask.slice(currentMaskIdx, currentMaskIdx + word.length);
    masks.push(wordMask);
    currentMaskIdx += word.length + 1; // +1 for space
  });
  
  // For Playfair sprint, we won't use targetShifts (since it's not a shift cipher). 
  // But let's keep the structure for compatibility, we'll just use dummy values.
  const targetShifts = [];
  const startShifts = [];
  words.forEach(() => {
    const shift = 0;
    let startShift = 1;
    targetShifts.push(shift);
    startShifts.push(startShift);
  });
  
  return {
    level: stageIndex + 1,
    difficulty,
    plaintext: plain,
    pairPlaintext,
    displayPlaintext: plain,
    ciphertext: ciphertext,
    pairCiphertext,
    key,
    matrix,
    pairs,
    cipherPairs: encryptedPairs.map((pair) => pair.result),
    rules: encryptedPairs.map((pair) => pair.rule),
    targetShifts,
    startShifts,
    masks,
    hint,
    keyClue,
    lesson,
  };
}

export function getPlayfairGameType(stageIndex = 0) {
  return GAME_CYCLE_PLAYFAIR[stageIndex % GAME_CYCLE_PLAYFAIR.length];
}
