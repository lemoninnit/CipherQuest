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
function makeMask(plainOrLen, revealFraction = 0.5) {
  const isStr = typeof plainOrLen === 'string';
  const len = isStr ? plainOrLen.length : plainOrLen;
  const mask = Array(len).fill(true);

  const eligibleIndices = [];
  for (let i = 0; i < len; i++) {
    if (isStr) {
      const code = plainOrLen.charCodeAt(i);
      if (code >= 65 && code <= 90) {
        eligibleIndices.push(i);
      }
    } else {
      eligibleIndices.push(i);
    }
  }

  const hideCount = Math.min(
    eligibleIndices.length,
    Math.ceil(eligibleIndices.length * (1 - revealFraction))
  );

  const hiddenIndices = [...eligibleIndices]
    .sort(() => Math.random() - 0.5)
    .slice(0, hideCount);

  hiddenIndices.forEach(i => { mask[i] = false; });
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
      {
      plain: "CORAL",
      hint: "Hard rocky structure built by tiny sea animals called polyps",
    },
    {
      plain: "SHELL",
      hint: "Hard protective outer covering of a sea creature",
    },
    {
      plain: "RIVER",
      hint: "A large natural stream of fresh water flowing to the sea",
    },
    {
      plain: "WAVES",
      hint: "Rolling ridges of water that move across the surface",
    },
    {
      plain: "BOAT",
      hint: "A small vessel that travels on water",
    },
    {
      plain: "SAND",
      hint: "Tiny loose grains of worn-down rock covering beaches",
    },
    {
      plain: "COAST",
      hint: "The land next to the sea",
    },
    {
      plain: "REEF",
      hint: "An underwater ridge of rock or coral near the surface",
    },
    {
      plain: "TIDE",
      hint: "The regular rise and fall of the sea level",
    },
    {
      plain: "GULL",
      hint: "A common white seabird often seen near harbors",
    },
    {
      plain: "PIER",
      hint: "A wooden structure built out over the water",
    },
    {
      plain: "CLIFF",
      hint: "A steep high rock face, often beside the sea",
    },
    {
      plain: "DUNE",
      hint: "A hill of sand shaped by the wind",
    },
    {
      plain: "CAVE",
      hint: "A natural hollow chamber in rock or a hillside",
    },
    {
      plain: "PORT",
      hint: "A town or harbor where ships load and unload",
    },
    {
      plain: "DOCK",
      hint: "A platform where ships are moored for loading",
    },
    {
      plain: "KNOT",
      hint: "A fastening tied in rope, also a unit of ship speed",
    },
    {
      plain: "SAIL",
      hint: "A canvas sheet that catches wind to move a boat",
    },
    {
      plain: "MAST",
      hint: "The tall vertical pole that holds up a ship’s sail",
    },
    {
      plain: "DECK",
      hint: "The flat floor surface of a ship",
    },
    {
      plain: "FISH",
      hint: "An animal with gills and fins that lives in water",
    },
    {
      plain: "SWIM",
      hint: "To move through water using your body",
    },
    {
      plain: "DIVE",
      hint: "To plunge headfirst into deep water",
    },
    {
      plain: "WIND",
      hint: "Moving air that fills a ship’s sails",
    },
    {
      plain: "SUN",
      hint: "The star that lights and warms our days",
    },
    {
      plain: "STAR",
      hint: "A distant burning sphere of gas seen at night",
    },
    {
      plain: "MOON",
      hint: "The bright body that circles the Earth and rules the tides",
    },
    {
      plain: "RAIN",
      hint: "Water droplets that fall from clouds",
    },
    {
      plain: "STORM",
      hint: "Violent weather with strong winds and rain",
    },
    {
      plain: "CALM",
      hint: "Completely still water with no wind or waves",
    },
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
      {
      plain: "COMPASS",
      hint: "A navigational instrument with a needle pointing north",
    },
    {
      plain: "LANTERN",
      hint: "A portable lamp with a protective case for carrying light",
    },
    {
      plain: "ANCHOR",
      hint: "A heavy iron device dropped overboard to hold a ship in place",
    },
    {
      plain: "VOYAGE",
      hint: "A long journey taken across the sea or through space",
    },
    {
      plain: "ISLAND",
      hint: "A tract of land completely surrounded by water",
    },
    {
      plain: "PIRATE",
      hint: "A sea raider who attacks ships under a black flag",
    },
    {
      plain: "SAILOR",
      hint: "A person who works or travels on a ship",
    },
    {
      plain: "HARBOR",
      hint: "A sheltered stretch of water where ships anchor safely",
    },
    {
      plain: "VESSEL",
      hint: "A large ship or seagoing craft",
    },
    {
      plain: "MARINE",
      hint: "Relating to the sea and the life within it",
    },
    {
      plain: "BEACON",
      hint: "A guiding light or signal fire set on a shore",
    },
    {
      plain: "CURRENT",
      hint: "A steady flow of water moving in one direction",
    },
    {
      plain: "SEAGULL",
      hint: "A loud white seabird that scavenges along coasts",
    },
    {
      plain: "HORIZON",
      hint: "The distant line where the sea appears to meet the sky",
    },
    {
      plain: "BREEZE",
      hint: "A light gentle wind",
    },
    {
      plain: "RUDDER",
      hint: "The flat movable blade steered to turn a ship",
    },
    {
      plain: "GALLEY",
      hint: "A ship’s kitchen where meals are cooked",
    },
    {
      plain: "CABIN",
      hint: "A private room aboard a ship",
    },
    {
      plain: "TACKLE",
      hint: "The rigging and gear fitted on a fishing boat",
    },
    {
      plain: "BALLAST",
      hint: "Heavy weight placed in a ship’s hull to keep it stable",
    },
    {
      plain: "FATHOM",
      hint: "A nautical depth unit equal to six feet",
    },
    {
      plain: "LAGOON",
      hint: "A shallow body of water separated from the sea by a reef",
    },
    {
      plain: "TRENCH",
      hint: "A long deep chasm on the ocean floor",
    },
    {
      plain: "PELICAN",
      hint: "A large coastal bird with a pouch under its beak",
    },
    {
      plain: "DOLPHIN",
      hint: "A clever marine mammal that leaps beside ships",
    },
    {
      plain: "TURTLE",
      hint: "A slow shelled reptile that swims the open sea",
    },
    {
      plain: "WHALE",
      hint: "The largest marine mammal, a giant of the deep",
    },
    {
      plain: "SHARK",
      hint: "A powerful predatory fish with rows of sharp teeth",
    },
    {
      plain: "OCTOPUS",
      hint: "An eight-armed sea creature that squirts ink",
    },
    {
      plain: "SQUID",
      hint: "A fast-swimming cephalopod with ten arms and ink",
    },
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
      {
      plain: "SHIPWRECK",
      hint: "The remains of a destroyed vessel on the seabed",
    },
    {
      plain: "NAVIGATION",
      hint: "The science of plotting a ship’s course and position",
    },
    {
      plain: "SUBMARINE",
      hint: "A vessel that travels and fights beneath the surface",
    },
    {
      plain: "HURRICANE",
      hint: "A massive rotating tropical storm born over warm seas",
    },
    {
      plain: "WHIRLPOOL",
      hint: "A powerful spinning vortex of water that sucks objects down",
    },
    {
      plain: "PENINSULA",
      hint: "Land almost surrounded by water but joined to the mainland",
    },
    {
      plain: "ARCHIPELAGO",
      hint: "A chain or cluster of scattered islands",
    },
    {
      plain: "MERIDIAN",
      hint: "A line of longitude running pole to pole on a chart",
    },
    {
      plain: "LATITUDE",
      hint: "Distance north or south of the equator, measured in degrees",
    },
    {
      plain: "LONGITUDE",
      hint: "Distance east or west of the prime meridian, in degrees",
    },
    {
      plain: "EQUATOR",
      hint: "The imaginary line circling Earth at zero degrees latitude",
    },
    {
      plain: "TIDESWELL",
      hint: "A sudden surge of seawater driven by rising tides",
    },
    {
      plain: "BATHYSCAPHE",
      hint: "A deep-diving submersible built to explore ocean trenches",
    },
    {
      plain: "OCEANOGRAPHY",
      hint: "The scientific study of the sea’s waters, currents, and life",
    },
    {
      plain: "BARNACLE",
      hint: "A small crustacean that cements itself to hulls and rocks",
    },
    {
      plain: "CRUSTACEAN",
      hint: "A hard-shelled sea animal such as a crab or lobster",
    },
    {
      plain: "PLANKTON",
      hint: "Tiny drifting organisms that feed nearly all ocean life",
    },
    {
      plain: "ALBATROSS",
      hint: "A giant seabird that glides over oceans for days",
    },
    {
      plain: "CORSAIR",
      hint: "A private ship authorized to raid enemy merchant vessels",
    },
    {
      plain: "BUCCANEER",
      hint: "A 17th-century pirate who hunted Spanish treasure ships",
    },
    {
      plain: "PRIVATEER",
      hint: "A privately armed ship licensed by a government to raid",
    },
    {
      plain: "GALLEON",
      hint: "A large Spanish sailing ship built to carry treasure",
    },
    {
      plain: "SCHOONER",
      hint: "A swift sailing ship with fore-and-aft sails on two masts",
    },
    {
      plain: "FRIGATE",
      hint: "A fast warship built for escort and patrol duty",
    },
    {
      plain: "CORVETTE",
      hint: "A small lightly armed escort warship",
    },
    {
      plain: "IRONCLAD",
      hint: "A 19th-century warship protected by iron armor plates",
    },
    {
      plain: "DREADNOUGHT",
      hint: "An early 20th-century battleship with all-big-gun armament",
    },
    {
      plain: "BATTLESHIP",
      hint: "The heaviest armored warship, built for line of battle",
    },
    {
      plain: "DESTROYER",
      hint: "A fast maneuverable warship armed with torpedoes",
    },
    {
      plain: "CRUISER",
      hint: "A fast mid-sized warship built for long-range patrols",
    },
  ],
};

function buildCaesarLevel(plain, shift, stageIndex, difficulty, hint) {
  const ciphertext = caesarEnc(plain, shift);
  const reveal = difficulty === 'easy' ? 0.6 : difficulty === 'medium' ? 0.5 : 0.35;
  const mask = makeMask(plain, reveal);
  // Starting shift must not equal the target shift
  let startShift;
  do { startShift = Math.floor(Math.random() * 5); } while (startShift === shift);

  const words = plain.split(' ');
  const masks = [];
  let currentMaskIdx = 0;
  words.forEach(word => {
    masks.push(mask.slice(currentMaskIdx, currentMaskIdx + word.length));
    currentMaskIdx += word.length + 1;
  });

  return {
    level: stageIndex + 1,
    ciphertext,
    plaintext: plain,
    targetShifts: [shift],
    startShifts: [startShift],
    fullMask: mask,
    masks: masks,
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
    },
      {
      plain: "CORAL",
      key: "SEA",
      hint: "Hard rocky structure built by tiny sea animals called polyps",
      keyClue: "Key hint: The vast salt water covering most of the Earth",
      keyInfo: "S=18, E=4, A=0 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "SHELL",
      key: "WAVE",
      hint: "Hard protective outer covering of a sea creature",
      keyClue: "Key hint: A rolling ridge of moving water",
      keyInfo: "W=22, A=0, V=21, E=4 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "RIVER",
      key: "TIDE",
      hint: "A large natural stream of fresh water flowing to the sea",
      keyClue: "Key hint: The twice-daily rise and fall of the sea",
      keyInfo: "T=19, I=8, D=3, E=4 — distinct shifts cycle across the word.",
    },
    {
      plain: "WAVES",
      key: "FISH",
      hint: "Rolling ridges of water that move across the surface",
      keyClue: "Key hint: A gilled animal that swims with fins",
      keyInfo: "F=5, I=8, S=18, H=7 — distinct shifts cycle across the word.",
    },
    {
      plain: "BOAT",
      key: "GULL",
      hint: "A small vessel that travels on water",
      keyClue: "Key hint: A white seabird that cries near the shore",
      keyInfo: "G=6, U=20, L=11, L=11 — repeated L gives identical shifts at both positions.",
    },
    {
      plain: "SAND",
      key: "SALT",
      hint: "Tiny loose grains of worn-down rock covering beaches",
      keyClue: "Key hint: White crystals that season food and flavor the sea",
      keyInfo: "S=18, A=0, L=11, T=19 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "COAST",
      key: "ROCK",
      hint: "The land next to the sea",
      keyClue: "Key hint: A hard solid mass of stone",
      keyInfo: "R=17, O=14, C=2, K=10 — distinct shifts cycle across the word.",
    },
    {
      plain: "REEF",
      key: "SAND",
      hint: "An underwater ridge of rock or coral near the surface",
      keyClue: "Key hint: Tiny loose grains of worn-down rock",
      keyInfo: "S=18, A=0, N=13, D=3 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "TIDE",
      key: "SHIP",
      hint: "The regular rise and fall of the sea level",
      keyClue: "Key hint: A large seagoing vessel",
      keyInfo: "S=18, H=7, I=8, P=15 — distinct shifts cycle across the word.",
    },
    {
      plain: "GULL",
      key: "BOAT",
      hint: "A common white seabird often seen near harbors",
      keyClue: "Key hint: A small watercraft paddled, sailed, or motored",
      keyInfo: "B=1, O=14, A=0, T=19 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "PIER",
      key: "SEA",
      hint: "A wooden structure built out over the water",
      keyClue: "Key hint: The vast salt water covering most of the Earth",
      keyInfo: "S=18, E=4, A=0 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "CLIFF",
      key: "WAVE",
      hint: "A steep high rock face, often beside the sea",
      keyClue: "Key hint: A rolling ridge of moving water",
      keyInfo: "W=22, A=0, V=21, E=4 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "DUNE",
      key: "TIDE",
      hint: "A hill of sand shaped by the wind",
      keyClue: "Key hint: The twice-daily rise and fall of the sea",
      keyInfo: "T=19, I=8, D=3, E=4 — distinct shifts cycle across the word.",
    },
    {
      plain: "CAVE",
      key: "FISH",
      hint: "A natural hollow chamber in rock or a hillside",
      keyClue: "Key hint: A gilled animal that swims with fins",
      keyInfo: "F=5, I=8, S=18, H=7 — distinct shifts cycle across the word.",
    },
    {
      plain: "PORT",
      key: "GULL",
      hint: "A town or harbor where ships load and unload",
      keyClue: "Key hint: A white seabird that cries near the shore",
      keyInfo: "G=6, U=20, L=11, L=11 — repeated L gives identical shifts at both positions.",
    },
    {
      plain: "DOCK",
      key: "SALT",
      hint: "A platform where ships are moored for loading",
      keyClue: "Key hint: White crystals that season food and flavor the sea",
      keyInfo: "S=18, A=0, L=11, T=19 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "KNOT",
      key: "ROCK",
      hint: "A fastening tied in rope, also a unit of ship speed",
      keyClue: "Key hint: A hard solid mass of stone",
      keyInfo: "R=17, O=14, C=2, K=10 — distinct shifts cycle across the word.",
    },
    {
      plain: "SAIL",
      key: "SAND",
      hint: "A canvas sheet that catches wind to move a boat",
      keyClue: "Key hint: Tiny loose grains of worn-down rock",
      keyInfo: "S=18, A=0, N=13, D=3 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "MAST",
      key: "SHIP",
      hint: "The tall vertical pole that holds up a ship’s sail",
      keyClue: "Key hint: A large seagoing vessel",
      keyInfo: "S=18, H=7, I=8, P=15 — distinct shifts cycle across the word.",
    },
    {
      plain: "DECK",
      key: "BOAT",
      hint: "The flat floor surface of a ship",
      keyClue: "Key hint: A small watercraft paddled, sailed, or motored",
      keyInfo: "B=1, O=14, A=0, T=19 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "FISH",
      key: "SEA",
      hint: "An animal with gills and fins that lives in water",
      keyClue: "Key hint: The vast salt water covering most of the Earth",
      keyInfo: "S=18, E=4, A=0 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "SWIM",
      key: "WAVE",
      hint: "To move through water using your body",
      keyClue: "Key hint: A rolling ridge of moving water",
      keyInfo: "W=22, A=0, V=21, E=4 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "DIVE",
      key: "TIDE",
      hint: "To plunge headfirst into deep water",
      keyClue: "Key hint: The twice-daily rise and fall of the sea",
      keyInfo: "T=19, I=8, D=3, E=4 — distinct shifts cycle across the word.",
    },
    {
      plain: "WIND",
      key: "FISH",
      hint: "Moving air that fills a ship’s sails",
      keyClue: "Key hint: A gilled animal that swims with fins",
      keyInfo: "F=5, I=8, S=18, H=7 — distinct shifts cycle across the word.",
    },
    {
      plain: "SUN",
      key: "GULL",
      hint: "The star that lights and warms our days",
      keyClue: "Key hint: A white seabird that cries near the shore",
      keyInfo: "G=6, U=20, L=11, L=11 — repeated L gives identical shifts at both positions.",
    },
    {
      plain: "STAR",
      key: "SALT",
      hint: "A distant burning sphere of gas seen at night",
      keyClue: "Key hint: White crystals that season food and flavor the sea",
      keyInfo: "S=18, A=0, L=11, T=19 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "MOON",
      key: "ROCK",
      hint: "The bright body that circles the Earth and rules the tides",
      keyClue: "Key hint: A hard solid mass of stone",
      keyInfo: "R=17, O=14, C=2, K=10 — distinct shifts cycle across the word.",
    },
    {
      plain: "RAIN",
      key: "SAND",
      hint: "Water droplets that fall from clouds",
      keyClue: "Key hint: Tiny loose grains of worn-down rock",
      keyInfo: "S=18, A=0, N=13, D=3 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "STORM",
      key: "SHIP",
      hint: "Violent weather with strong winds and rain",
      keyClue: "Key hint: A large seagoing vessel",
      keyInfo: "S=18, H=7, I=8, P=15 — distinct shifts cycle across the word.",
    },
    {
      plain: "CALM",
      key: "BOAT",
      hint: "Completely still water with no wind or waves",
      keyClue: "Key hint: A small watercraft paddled, sailed, or motored",
      keyInfo: "B=1, O=14, A=0, T=19 — A=0 leaves its letter unshifted.",
    },
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
      {
      plain: "COMPASS",
      key: "SEA",
      hint: "A navigational instrument with a needle pointing north",
      keyClue: "Key hint: The vast salt water covering most of the Earth",
      keyInfo: "S=18, E=4, A=0 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "LANTERN",
      key: "WAVE",
      hint: "A portable lamp with a protective case for carrying light",
      keyClue: "Key hint: A rolling ridge of moving water",
      keyInfo: "W=22, A=0, V=21, E=4 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "ANCHOR",
      key: "TIDE",
      hint: "A heavy iron device dropped overboard to hold a ship in place",
      keyClue: "Key hint: The twice-daily rise and fall of the sea",
      keyInfo: "T=19, I=8, D=3, E=4 — distinct shifts cycle across the word.",
    },
    {
      plain: "VOYAGE",
      key: "FISH",
      hint: "A long journey taken across the sea or through space",
      keyClue: "Key hint: A gilled animal that swims with fins",
      keyInfo: "F=5, I=8, S=18, H=7 — distinct shifts cycle across the word.",
    },
    {
      plain: "ISLAND",
      key: "GULL",
      hint: "A tract of land completely surrounded by water",
      keyClue: "Key hint: A white seabird that cries near the shore",
      keyInfo: "G=6, U=20, L=11, L=11 — repeated L gives identical shifts at both positions.",
    },
    {
      plain: "PIRATE",
      key: "SALT",
      hint: "A sea raider who attacks ships under a black flag",
      keyClue: "Key hint: White crystals that season food and flavor the sea",
      keyInfo: "S=18, A=0, L=11, T=19 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "SAILOR",
      key: "ROCK",
      hint: "A person who works or travels on a ship",
      keyClue: "Key hint: A hard solid mass of stone",
      keyInfo: "R=17, O=14, C=2, K=10 — distinct shifts cycle across the word.",
    },
    {
      plain: "HARBOR",
      key: "SAND",
      hint: "A sheltered stretch of water where ships anchor safely",
      keyClue: "Key hint: Tiny loose grains of worn-down rock",
      keyInfo: "S=18, A=0, N=13, D=3 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "VESSEL",
      key: "SHIP",
      hint: "A large ship or seagoing craft",
      keyClue: "Key hint: A large seagoing vessel",
      keyInfo: "S=18, H=7, I=8, P=15 — distinct shifts cycle across the word.",
    },
    {
      plain: "MARINE",
      key: "BOAT",
      hint: "Relating to the sea and the life within it",
      keyClue: "Key hint: A small watercraft paddled, sailed, or motored",
      keyInfo: "B=1, O=14, A=0, T=19 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "BEACON",
      key: "SEA",
      hint: "A guiding light or signal fire set on a shore",
      keyClue: "Key hint: The vast salt water covering most of the Earth",
      keyInfo: "S=18, E=4, A=0 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "CURRENT",
      key: "WAVE",
      hint: "A steady flow of water moving in one direction",
      keyClue: "Key hint: A rolling ridge of moving water",
      keyInfo: "W=22, A=0, V=21, E=4 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "SEAGULL",
      key: "TIDE",
      hint: "A loud white seabird that scavenges along coasts",
      keyClue: "Key hint: The twice-daily rise and fall of the sea",
      keyInfo: "T=19, I=8, D=3, E=4 — distinct shifts cycle across the word.",
    },
    {
      plain: "HORIZON",
      key: "FISH",
      hint: "The distant line where the sea appears to meet the sky",
      keyClue: "Key hint: A gilled animal that swims with fins",
      keyInfo: "F=5, I=8, S=18, H=7 — distinct shifts cycle across the word.",
    },
    {
      plain: "BREEZE",
      key: "GULL",
      hint: "A light gentle wind",
      keyClue: "Key hint: A white seabird that cries near the shore",
      keyInfo: "G=6, U=20, L=11, L=11 — repeated L gives identical shifts at both positions.",
    },
    {
      plain: "RUDDER",
      key: "SALT",
      hint: "The flat movable blade steered to turn a ship",
      keyClue: "Key hint: White crystals that season food and flavor the sea",
      keyInfo: "S=18, A=0, L=11, T=19 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "GALLEY",
      key: "ROCK",
      hint: "A ship’s kitchen where meals are cooked",
      keyClue: "Key hint: A hard solid mass of stone",
      keyInfo: "R=17, O=14, C=2, K=10 — distinct shifts cycle across the word.",
    },
    {
      plain: "CABIN",
      key: "SAND",
      hint: "A private room aboard a ship",
      keyClue: "Key hint: Tiny loose grains of worn-down rock",
      keyInfo: "S=18, A=0, N=13, D=3 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "TACKLE",
      key: "SHIP",
      hint: "The rigging and gear fitted on a fishing boat",
      keyClue: "Key hint: A large seagoing vessel",
      keyInfo: "S=18, H=7, I=8, P=15 — distinct shifts cycle across the word.",
    },
    {
      plain: "BALLAST",
      key: "BOAT",
      hint: "Heavy weight placed in a ship’s hull to keep it stable",
      keyClue: "Key hint: A small watercraft paddled, sailed, or motored",
      keyInfo: "B=1, O=14, A=0, T=19 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "FATHOM",
      key: "SEA",
      hint: "A nautical depth unit equal to six feet",
      keyClue: "Key hint: The vast salt water covering most of the Earth",
      keyInfo: "S=18, E=4, A=0 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "LAGOON",
      key: "WAVE",
      hint: "A shallow body of water separated from the sea by a reef",
      keyClue: "Key hint: A rolling ridge of moving water",
      keyInfo: "W=22, A=0, V=21, E=4 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "TRENCH",
      key: "TIDE",
      hint: "A long deep chasm on the ocean floor",
      keyClue: "Key hint: The twice-daily rise and fall of the sea",
      keyInfo: "T=19, I=8, D=3, E=4 — distinct shifts cycle across the word.",
    },
    {
      plain: "PELICAN",
      key: "FISH",
      hint: "A large coastal bird with a pouch under its beak",
      keyClue: "Key hint: A gilled animal that swims with fins",
      keyInfo: "F=5, I=8, S=18, H=7 — distinct shifts cycle across the word.",
    },
    {
      plain: "DOLPHIN",
      key: "GULL",
      hint: "A clever marine mammal that leaps beside ships",
      keyClue: "Key hint: A white seabird that cries near the shore",
      keyInfo: "G=6, U=20, L=11, L=11 — repeated L gives identical shifts at both positions.",
    },
    {
      plain: "TURTLE",
      key: "SALT",
      hint: "A slow shelled reptile that swims the open sea",
      keyClue: "Key hint: White crystals that season food and flavor the sea",
      keyInfo: "S=18, A=0, L=11, T=19 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "WHALE",
      key: "ROCK",
      hint: "The largest marine mammal, a giant of the deep",
      keyClue: "Key hint: A hard solid mass of stone",
      keyInfo: "R=17, O=14, C=2, K=10 — distinct shifts cycle across the word.",
    },
    {
      plain: "SHARK",
      key: "SAND",
      hint: "A powerful predatory fish with rows of sharp teeth",
      keyClue: "Key hint: Tiny loose grains of worn-down rock",
      keyInfo: "S=18, A=0, N=13, D=3 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "OCTOPUS",
      key: "SHIP",
      hint: "An eight-armed sea creature that squirts ink",
      keyClue: "Key hint: A large seagoing vessel",
      keyInfo: "S=18, H=7, I=8, P=15 — distinct shifts cycle across the word.",
    },
    {
      plain: "SQUID",
      key: "BOAT",
      hint: "A fast-swimming cephalopod with ten arms and ink",
      keyClue: "Key hint: A small watercraft paddled, sailed, or motored",
      keyInfo: "B=1, O=14, A=0, T=19 — A=0 leaves its letter unshifted.",
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
      {
      plain: "SHIPWRECK",
      key: "SEA",
      hint: "The remains of a destroyed vessel on the seabed",
      keyClue: "Key hint: The vast salt water covering most of the Earth",
      keyInfo: "S=18, E=4, A=0 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "NAVIGATION",
      key: "WAVE",
      hint: "The science of plotting a ship’s course and position",
      keyClue: "Key hint: A rolling ridge of moving water",
      keyInfo: "W=22, A=0, V=21, E=4 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "SUBMARINE",
      key: "TIDE",
      hint: "A vessel that travels and fights beneath the surface",
      keyClue: "Key hint: The twice-daily rise and fall of the sea",
      keyInfo: "T=19, I=8, D=3, E=4 — distinct shifts cycle across the word.",
    },
    {
      plain: "HURRICANE",
      key: "FISH",
      hint: "A massive rotating tropical storm born over warm seas",
      keyClue: "Key hint: A gilled animal that swims with fins",
      keyInfo: "F=5, I=8, S=18, H=7 — distinct shifts cycle across the word.",
    },
    {
      plain: "WHIRLPOOL",
      key: "GULL",
      hint: "A powerful spinning vortex of water that sucks objects down",
      keyClue: "Key hint: A white seabird that cries near the shore",
      keyInfo: "G=6, U=20, L=11, L=11 — repeated L gives identical shifts at both positions.",
    },
    {
      plain: "PENINSULA",
      key: "SALT",
      hint: "Land almost surrounded by water but joined to the mainland",
      keyClue: "Key hint: White crystals that season food and flavor the sea",
      keyInfo: "S=18, A=0, L=11, T=19 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "ARCHIPELAGO",
      key: "ROCK",
      hint: "A chain or cluster of scattered islands",
      keyClue: "Key hint: A hard solid mass of stone",
      keyInfo: "R=17, O=14, C=2, K=10 — distinct shifts cycle across the word.",
    },
    {
      plain: "MERIDIAN",
      key: "SAND",
      hint: "A line of longitude running pole to pole on a chart",
      keyClue: "Key hint: Tiny loose grains of worn-down rock",
      keyInfo: "S=18, A=0, N=13, D=3 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "LATITUDE",
      key: "SHIP",
      hint: "Distance north or south of the equator, measured in degrees",
      keyClue: "Key hint: A large seagoing vessel",
      keyInfo: "S=18, H=7, I=8, P=15 — distinct shifts cycle across the word.",
    },
    {
      plain: "LONGITUDE",
      key: "BOAT",
      hint: "Distance east or west of the prime meridian, in degrees",
      keyClue: "Key hint: A small watercraft paddled, sailed, or motored",
      keyInfo: "B=1, O=14, A=0, T=19 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "EQUATOR",
      key: "SEA",
      hint: "The imaginary line circling Earth at zero degrees latitude",
      keyClue: "Key hint: The vast salt water covering most of the Earth",
      keyInfo: "S=18, E=4, A=0 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "TIDESWELL",
      key: "WAVE",
      hint: "A sudden surge of seawater driven by rising tides",
      keyClue: "Key hint: A rolling ridge of moving water",
      keyInfo: "W=22, A=0, V=21, E=4 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "BATHYSCAPHE",
      key: "TIDE",
      hint: "A deep-diving submersible built to explore ocean trenches",
      keyClue: "Key hint: The twice-daily rise and fall of the sea",
      keyInfo: "T=19, I=8, D=3, E=4 — distinct shifts cycle across the word.",
    },
    {
      plain: "OCEANOGRAPHY",
      key: "FISH",
      hint: "The scientific study of the sea’s waters, currents, and life",
      keyClue: "Key hint: A gilled animal that swims with fins",
      keyInfo: "F=5, I=8, S=18, H=7 — distinct shifts cycle across the word.",
    },
    {
      plain: "BARNACLE",
      key: "GULL",
      hint: "A small crustacean that cements itself to hulls and rocks",
      keyClue: "Key hint: A white seabird that cries near the shore",
      keyInfo: "G=6, U=20, L=11, L=11 — repeated L gives identical shifts at both positions.",
    },
    {
      plain: "CRUSTACEAN",
      key: "SALT",
      hint: "A hard-shelled sea animal such as a crab or lobster",
      keyClue: "Key hint: White crystals that season food and flavor the sea",
      keyInfo: "S=18, A=0, L=11, T=19 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "PLANKTON",
      key: "ROCK",
      hint: "Tiny drifting organisms that feed nearly all ocean life",
      keyClue: "Key hint: A hard solid mass of stone",
      keyInfo: "R=17, O=14, C=2, K=10 — distinct shifts cycle across the word.",
    },
    {
      plain: "ALBATROSS",
      key: "SAND",
      hint: "A giant seabird that glides over oceans for days",
      keyClue: "Key hint: Tiny loose grains of worn-down rock",
      keyInfo: "S=18, A=0, N=13, D=3 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "CORSAIR",
      key: "SHIP",
      hint: "A private ship authorized to raid enemy merchant vessels",
      keyClue: "Key hint: A large seagoing vessel",
      keyInfo: "S=18, H=7, I=8, P=15 — distinct shifts cycle across the word.",
    },
    {
      plain: "BUCCANEER",
      key: "BOAT",
      hint: "A 17th-century pirate who hunted Spanish treasure ships",
      keyClue: "Key hint: A small watercraft paddled, sailed, or motored",
      keyInfo: "B=1, O=14, A=0, T=19 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "PRIVATEER",
      key: "SEA",
      hint: "A privately armed ship licensed by a government to raid",
      keyClue: "Key hint: The vast salt water covering most of the Earth",
      keyInfo: "S=18, E=4, A=0 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "GALLEON",
      key: "WAVE",
      hint: "A large Spanish sailing ship built to carry treasure",
      keyClue: "Key hint: A rolling ridge of moving water",
      keyInfo: "W=22, A=0, V=21, E=4 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "SCHOONER",
      key: "TIDE",
      hint: "A swift sailing ship with fore-and-aft sails on two masts",
      keyClue: "Key hint: The twice-daily rise and fall of the sea",
      keyInfo: "T=19, I=8, D=3, E=4 — distinct shifts cycle across the word.",
    },
    {
      plain: "FRIGATE",
      key: "FISH",
      hint: "A fast warship built for escort and patrol duty",
      keyClue: "Key hint: A gilled animal that swims with fins",
      keyInfo: "F=5, I=8, S=18, H=7 — distinct shifts cycle across the word.",
    },
    {
      plain: "CORVETTE",
      key: "GULL",
      hint: "A small lightly armed escort warship",
      keyClue: "Key hint: A white seabird that cries near the shore",
      keyInfo: "G=6, U=20, L=11, L=11 — repeated L gives identical shifts at both positions.",
    },
    {
      plain: "IRONCLAD",
      key: "SALT",
      hint: "A 19th-century warship protected by iron armor plates",
      keyClue: "Key hint: White crystals that season food and flavor the sea",
      keyInfo: "S=18, A=0, L=11, T=19 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "DREADNOUGHT",
      key: "ROCK",
      hint: "An early 20th-century battleship with all-big-gun armament",
      keyClue: "Key hint: A hard solid mass of stone",
      keyInfo: "R=17, O=14, C=2, K=10 — distinct shifts cycle across the word.",
    },
    {
      plain: "BATTLESHIP",
      key: "SAND",
      hint: "The heaviest armored warship, built for line of battle",
      keyClue: "Key hint: Tiny loose grains of worn-down rock",
      keyInfo: "S=18, A=0, N=13, D=3 — A=0 leaves its letter unshifted.",
    },
    {
      plain: "DESTROYER",
      key: "SHIP",
      hint: "A fast maneuverable warship armed with torpedoes",
      keyClue: "Key hint: A large seagoing vessel",
      keyInfo: "S=18, H=7, I=8, P=15 — distinct shifts cycle across the word.",
    },
    {
      plain: "CRUISER",
      key: "BOAT",
      hint: "A fast mid-sized warship built for long-range patrols",
      keyClue: "Key hint: A small watercraft paddled, sailed, or motored",
      keyInfo: "B=1, O=14, A=0, T=19 — A=0 leaves its letter unshifted.",
    },
  ],
};

function buildVigenereLevel(plain, key, stageIndex, difficulty, hint, keyClue, keyInfo) {
  const ciphertext = vigEnc(plain, key);
  const reveal = difficulty === 'easy' ? 0.6 : difficulty === 'medium' ? 0.5 : 0.35;
  const mask = makeMask(plain, reveal);
  const targetShifts = [];
  const startShifts = [];
  const masks = [];
  const words = plain.split(' ');
  let currentMaskIdx = 0;
  words.forEach(word => {
    const wordMask = mask.slice(currentMaskIdx, currentMaskIdx + word.length);
    masks.push(wordMask);
    currentMaskIdx += word.length + 1;
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
    fullMask: mask,
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
    },
      {
      plain: "CORAL",
      key: "CORAL",
      hint: "Hard rocky structure built by tiny sea animals called polyps",
      keyClue: "A rocky reef built by tiny sea animals",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "SHELL",
      key: "OCEAN",
      hint: "Hard protective outer covering of a sea creature",
      keyClue: "An enormous body of salt water",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "RIVER",
      key: "WATER",
      hint: "A large natural stream of fresh water flowing to the sea",
      keyClue: "The clear liquid of rivers, rain, and seas",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "WAVES",
      key: "BEACH",
      hint: "Rolling ridges of water that move across the surface",
      keyClue: "A sandy or pebbly shore beside the water",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "BOAT",
      key: "SHORE",
      hint: "A small vessel that travels on water",
      keyClue: "The land along the edge of the sea",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
    {
      plain: "SAND",
      key: "SHELL",
      hint: "Tiny loose grains of worn-down rock covering beaches",
      keyClue: "A hard outer covering of a sea creature",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "COAST",
      key: "STORM",
      hint: "The land next to the sea",
      keyClue: "Violent weather of wind and rain",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "REEF",
      key: "WINDS",
      hint: "An underwater ridge of rock or coral near the surface",
      keyClue: "Moving currents of air that fill sails",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "TIDE",
      key: "SQUID",
      hint: "The regular rise and fall of the sea level",
      keyClue: "A ten-armed sea creature that squirts ink",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "GULL",
      key: "WHALE",
      hint: "A common white seabird often seen near harbors",
      keyClue: "The giant of the sea, a huge marine mammal",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
    {
      plain: "PIER",
      key: "CORAL",
      hint: "A wooden structure built out over the water",
      keyClue: "A rocky reef built by tiny sea animals",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "CLIFF",
      key: "OCEAN",
      hint: "A steep high rock face, often beside the sea",
      keyClue: "An enormous body of salt water",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "DUNE",
      key: "WATER",
      hint: "A hill of sand shaped by the wind",
      keyClue: "The clear liquid of rivers, rain, and seas",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "CAVE",
      key: "BEACH",
      hint: "A natural hollow chamber in rock or a hillside",
      keyClue: "A sandy or pebbly shore beside the water",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "PORT",
      key: "SHORE",
      hint: "A town or harbor where ships load and unload",
      keyClue: "The land along the edge of the sea",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
    {
      plain: "DOCK",
      key: "SHELL",
      hint: "A platform where ships are moored for loading",
      keyClue: "A hard outer covering of a sea creature",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "KNOT",
      key: "STORM",
      hint: "A fastening tied in rope, also a unit of ship speed",
      keyClue: "Violent weather of wind and rain",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "SAIL",
      key: "WINDS",
      hint: "A canvas sheet that catches wind to move a boat",
      keyClue: "Moving currents of air that fill sails",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "MAST",
      key: "SQUID",
      hint: "The tall vertical pole that holds up a ship’s sail",
      keyClue: "A ten-armed sea creature that squirts ink",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "DECK",
      key: "WHALE",
      hint: "The flat floor surface of a ship",
      keyClue: "The giant of the sea, a huge marine mammal",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
    {
      plain: "FISH",
      key: "CORAL",
      hint: "An animal with gills and fins that lives in water",
      keyClue: "A rocky reef built by tiny sea animals",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "SWIM",
      key: "OCEAN",
      hint: "To move through water using your body",
      keyClue: "An enormous body of salt water",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "DIVE",
      key: "WATER",
      hint: "To plunge headfirst into deep water",
      keyClue: "The clear liquid of rivers, rain, and seas",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "WIND",
      key: "BEACH",
      hint: "Moving air that fills a ship’s sails",
      keyClue: "A sandy or pebbly shore beside the water",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "SUN",
      key: "SHORE",
      hint: "The star that lights and warms our days",
      keyClue: "The land along the edge of the sea",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
    {
      plain: "STAR",
      key: "SHELL",
      hint: "A distant burning sphere of gas seen at night",
      keyClue: "A hard outer covering of a sea creature",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "MOON",
      key: "STORM",
      hint: "The bright body that circles the Earth and rules the tides",
      keyClue: "Violent weather of wind and rain",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "RAIN",
      key: "WINDS",
      hint: "Water droplets that fall from clouds",
      keyClue: "Moving currents of air that fill sails",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "STORM",
      key: "SQUID",
      hint: "Violent weather with strong winds and rain",
      keyClue: "A ten-armed sea creature that squirts ink",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "CALM",
      key: "WHALE",
      hint: "Completely still water with no wind or waves",
      keyClue: "The giant of the sea, a huge marine mammal",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
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
      {
      plain: "COMPASS",
      key: "CORAL",
      hint: "A navigational instrument with a needle pointing north",
      keyClue: "A rocky reef built by tiny sea animals",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "LANTERN",
      key: "OCEAN",
      hint: "A portable lamp with a protective case for carrying light",
      keyClue: "An enormous body of salt water",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "ANCHOR",
      key: "WATER",
      hint: "A heavy iron device dropped overboard to hold a ship in place",
      keyClue: "The clear liquid of rivers, rain, and seas",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "VOYAGE",
      key: "BEACH",
      hint: "A long journey taken across the sea or through space",
      keyClue: "A sandy or pebbly shore beside the water",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "ISLAND",
      key: "SHORE",
      hint: "A tract of land completely surrounded by water",
      keyClue: "The land along the edge of the sea",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
    {
      plain: "PIRATE",
      key: "SHELL",
      hint: "A sea raider who attacks ships under a black flag",
      keyClue: "A hard outer covering of a sea creature",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "SAILOR",
      key: "STORM",
      hint: "A person who works or travels on a ship",
      keyClue: "Violent weather of wind and rain",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "HARBOR",
      key: "WINDS",
      hint: "A sheltered stretch of water where ships anchor safely",
      keyClue: "Moving currents of air that fill sails",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "VESSEL",
      key: "SQUID",
      hint: "A large ship or seagoing craft",
      keyClue: "A ten-armed sea creature that squirts ink",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "MARINE",
      key: "WHALE",
      hint: "Relating to the sea and the life within it",
      keyClue: "The giant of the sea, a huge marine mammal",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
    {
      plain: "BEACON",
      key: "CORAL",
      hint: "A guiding light or signal fire set on a shore",
      keyClue: "A rocky reef built by tiny sea animals",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "CURRENT",
      key: "OCEAN",
      hint: "A steady flow of water moving in one direction",
      keyClue: "An enormous body of salt water",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "SEAGULL",
      key: "WATER",
      hint: "A loud white seabird that scavenges along coasts",
      keyClue: "The clear liquid of rivers, rain, and seas",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "HORIZON",
      key: "BEACH",
      hint: "The distant line where the sea appears to meet the sky",
      keyClue: "A sandy or pebbly shore beside the water",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "BREEZE",
      key: "SHORE",
      hint: "A light gentle wind",
      keyClue: "The land along the edge of the sea",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
    {
      plain: "RUDDER",
      key: "SHELL",
      hint: "The flat movable blade steered to turn a ship",
      keyClue: "A hard outer covering of a sea creature",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "GALLEY",
      key: "STORM",
      hint: "A ship’s kitchen where meals are cooked",
      keyClue: "Violent weather of wind and rain",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "CABIN",
      key: "WINDS",
      hint: "A private room aboard a ship",
      keyClue: "Moving currents of air that fill sails",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "TACKLE",
      key: "SQUID",
      hint: "The rigging and gear fitted on a fishing boat",
      keyClue: "A ten-armed sea creature that squirts ink",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "BALLAST",
      key: "WHALE",
      hint: "Heavy weight placed in a ship’s hull to keep it stable",
      keyClue: "The giant of the sea, a huge marine mammal",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
    {
      plain: "FATHOM",
      key: "CORAL",
      hint: "A nautical depth unit equal to six feet",
      keyClue: "A rocky reef built by tiny sea animals",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "LAGOON",
      key: "OCEAN",
      hint: "A shallow body of water separated from the sea by a reef",
      keyClue: "An enormous body of salt water",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "TRENCH",
      key: "WATER",
      hint: "A long deep chasm on the ocean floor",
      keyClue: "The clear liquid of rivers, rain, and seas",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "PELICAN",
      key: "BEACH",
      hint: "A large coastal bird with a pouch under its beak",
      keyClue: "A sandy or pebbly shore beside the water",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "DOLPHIN",
      key: "SHORE",
      hint: "A clever marine mammal that leaps beside ships",
      keyClue: "The land along the edge of the sea",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
    {
      plain: "TURTLE",
      key: "SHELL",
      hint: "A slow shelled reptile that swims the open sea",
      keyClue: "A hard outer covering of a sea creature",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "WHALE",
      key: "STORM",
      hint: "The largest marine mammal, a giant of the deep",
      keyClue: "Violent weather of wind and rain",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "SHARK",
      key: "WINDS",
      hint: "A powerful predatory fish with rows of sharp teeth",
      keyClue: "Moving currents of air that fill sails",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "OCTOPUS",
      key: "SQUID",
      hint: "An eight-armed sea creature that squirts ink",
      keyClue: "A ten-armed sea creature that squirts ink",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "SQUID",
      key: "WHALE",
      hint: "A fast-swimming cephalopod with ten arms and ink",
      keyClue: "The giant of the sea, a huge marine mammal",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
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
      {
      plain: "SHIPWRECK",
      key: "CORAL",
      hint: "The remains of a destroyed vessel on the seabed",
      keyClue: "A rocky reef built by tiny sea animals",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "NAVIGATION",
      key: "OCEAN",
      hint: "The science of plotting a ship’s course and position",
      keyClue: "An enormous body of salt water",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "SUBMARINE",
      key: "WATER",
      hint: "A vessel that travels and fights beneath the surface",
      keyClue: "The clear liquid of rivers, rain, and seas",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "HURRICANE",
      key: "BEACH",
      hint: "A massive rotating tropical storm born over warm seas",
      keyClue: "A sandy or pebbly shore beside the water",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "WHIRLPOOL",
      key: "SHORE",
      hint: "A powerful spinning vortex of water that sucks objects down",
      keyClue: "The land along the edge of the sea",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
    {
      plain: "PENINSULA",
      key: "SHELL",
      hint: "Land almost surrounded by water but joined to the mainland",
      keyClue: "A hard outer covering of a sea creature",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "ARCHIPELAGO",
      key: "STORM",
      hint: "A chain or cluster of scattered islands",
      keyClue: "Violent weather of wind and rain",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "MERIDIAN",
      key: "WINDS",
      hint: "A line of longitude running pole to pole on a chart",
      keyClue: "Moving currents of air that fill sails",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "LATITUDE",
      key: "SQUID",
      hint: "Distance north or south of the equator, measured in degrees",
      keyClue: "A ten-armed sea creature that squirts ink",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "LONGITUDE",
      key: "WHALE",
      hint: "Distance east or west of the prime meridian, in degrees",
      keyClue: "The giant of the sea, a huge marine mammal",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
    {
      plain: "EQUATOR",
      key: "CORAL",
      hint: "The imaginary line circling Earth at zero degrees latitude",
      keyClue: "A rocky reef built by tiny sea animals",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "TIDESWELL",
      key: "OCEAN",
      hint: "A sudden surge of seawater driven by rising tides",
      keyClue: "An enormous body of salt water",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "BATHYSCAPHE",
      key: "WATER",
      hint: "A deep-diving submersible built to explore ocean trenches",
      keyClue: "The clear liquid of rivers, rain, and seas",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "OCEANOGRAPHY",
      key: "BEACH",
      hint: "The scientific study of the sea’s waters, currents, and life",
      keyClue: "A sandy or pebbly shore beside the water",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "BARNACLE",
      key: "SHORE",
      hint: "A small crustacean that cements itself to hulls and rocks",
      keyClue: "The land along the edge of the sea",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
    {
      plain: "CRUSTACEAN",
      key: "SHELL",
      hint: "A hard-shelled sea animal such as a crab or lobster",
      keyClue: "A hard outer covering of a sea creature",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "PLANKTON",
      key: "STORM",
      hint: "Tiny drifting organisms that feed nearly all ocean life",
      keyClue: "Violent weather of wind and rain",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "ALBATROSS",
      key: "WINDS",
      hint: "A giant seabird that glides over oceans for days",
      keyClue: "Moving currents of air that fill sails",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "CORSAIR",
      key: "SQUID",
      hint: "A private ship authorized to raid enemy merchant vessels",
      keyClue: "A ten-armed sea creature that squirts ink",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "BUCCANEER",
      key: "WHALE",
      hint: "A 17th-century pirate who hunted Spanish treasure ships",
      keyClue: "The giant of the sea, a huge marine mammal",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
    {
      plain: "PRIVATEER",
      key: "CORAL",
      hint: "A privately armed ship licensed by a government to raid",
      keyClue: "A rocky reef built by tiny sea animals",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "GALLEON",
      key: "OCEAN",
      hint: "A large Spanish sailing ship built to carry treasure",
      keyClue: "An enormous body of salt water",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "SCHOONER",
      key: "WATER",
      hint: "A swift sailing ship with fore-and-aft sails on two masts",
      keyClue: "The clear liquid of rivers, rain, and seas",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "FRIGATE",
      key: "BEACH",
      hint: "A fast warship built for escort and patrol duty",
      keyClue: "A sandy or pebbly shore beside the water",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "CORVETTE",
      key: "SHORE",
      hint: "A small lightly armed escort warship",
      keyClue: "The land along the edge of the sea",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
    },
    {
      plain: "IRONCLAD",
      key: "SHELL",
      hint: "A 19th-century warship protected by iron armor plates",
      keyClue: "A hard outer covering of a sea creature",
      lesson: "Same-row digraph pairs each shift one letter left when decrypting.",
    },
    {
      plain: "DREADNOUGHT",
      key: "STORM",
      hint: "An early 20th-century battleship with all-big-gun armament",
      keyClue: "Violent weather of wind and rain",
      lesson: "Same-column digraph pairs each shift one letter up when decrypting.",
    },
    {
      plain: "BATTLESHIP",
      key: "WINDS",
      hint: "The heaviest armored warship, built for line of battle",
      keyClue: "Moving currents of air that fill sails",
      lesson: "Rectangle digraph pairs swap columns while keeping their rows.",
    },
    {
      plain: "DESTROYER",
      key: "SQUID",
      hint: "A fast maneuverable warship armed with torpedoes",
      keyClue: "A ten-armed sea creature that squirts ink",
      lesson: "I and J share a single slot in the 5x5 Playfair matrix.",
    },
    {
      plain: "CRUISER",
      key: "WHALE",
      hint: "A fast mid-sized warship built for long-range patrols",
      keyClue: "The giant of the sea, a huge marine mammal",
      lesson: "Doubled letters in a pair are split apart with an X filler.",
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
    fullMask: mask,
    masks,
    hint,
    keyClue,
    lesson,
  };
}

export function getPlayfairGameType(stageIndex = 0) {
  return GAME_CYCLE_PLAYFAIR[stageIndex % GAME_CYCLE_PLAYFAIR.length];
}
