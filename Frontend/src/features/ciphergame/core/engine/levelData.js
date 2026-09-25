import {
  generatePlayfairMatrix,
  preparePlayfairDigraphs,
  transformPlayfairPair,
  playfairEncrypt,
} from "./playfair";

/* ─────────────────── shift ranges & helpers ─────────────────── */
export const SHIFT_RANGES_BY_DIFFICULTY = {
  easy: { min: 1, max: 7 },
  medium: { min: 1, max: 14 },
  hard: { min: 1, max: 24, negMin: -5, negMax: -1 },
};

export function getRandomShiftForDifficulty(difficulty = 'easy') {
  const range = SHIFT_RANGES_BY_DIFFICULTY[difficulty] || SHIFT_RANGES_BY_DIFFICULTY.easy;
  if (difficulty === 'hard' && range.negMin !== undefined) {
    const isNegative = Math.random() < (5 / 29);
    if (isNegative) {
      return Math.floor(Math.random() * (range.negMax - range.negMin + 1)) + range.negMin;
    }
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  }
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

function caesarEnc(text, shift) {
  return text.toUpperCase().split('').map(c => {
    const code = c.charCodeAt(0);
    if (code < 65 || code > 90) return c;
    return String.fromCharCode((((code - 65 + shift) % 26 + 26) % 26) + 65);
  }).join('');
}

function vigEnc(text, key) {
  text = text.toUpperCase(); key = key.toUpperCase();
  let j = 0, out = '';
  for (const c of text) {
    const code = c.charCodeAt(0);
    if (code < 65 || code > 90) { out += c; continue; }
    const sh = key.charCodeAt(j % key.length) - 65;
    out += String.fromCharCode((((code - 65 + sh) % 26 + 26) % 26) + 65);
    j++;
  }
  return out;
}

/** Build a boolean mask array: false = player must solve this letter */
function makeMask(plainOrLen, revealFraction = 0.5, minRevealedPerWord = 1) {
  const isStr = typeof plainOrLen === 'string';
  const len = isStr ? plainOrLen.length : plainOrLen;
  const mask = Array(len).fill(true);

  if (revealFraction <= 0 && minRevealedPerWord <= 0) {
    for (let i = 0; i < len; i++) {
      if (isStr) {
        const code = plainOrLen.charCodeAt(i);
        if (code >= 65 && code <= 90) mask[i] = false;
      } else {
        mask[i] = false;
      }
    }
    return mask;
  }

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

  // Guarantee solvability on easy and medium
  if (isStr && minRevealedPerWord > 0) {
    const words = isStr ? plainOrLen.split(' ') : [];
    let wordStart = 0;
    words.forEach(word => {
      const wordLetters = [];
      for (let i = 0; i < word.length; i++) {
        const code = word.charCodeAt(i);
        if (code >= 65 && code <= 90) wordLetters.push(wordStart + i);
      }
      if (wordLetters.length > minRevealedPerWord) {
        const revealed = wordLetters.filter(i => mask[i]);
        const toReveal = minRevealedPerWord - revealed.length;
        if (toReveal > 0) {
          const hidden = wordLetters.filter(i => !mask[i])
            .sort(() => Math.random() - 0.5)
            .slice(0, toReveal);
          hidden.forEach(i => { mask[i] = true; });
        }
      }
      wordStart += word.length + 1;
    });
  }

  return mask;
}

/* ─────────────────── Caesar levels ─────────────────── */
const caesarWords = {
  easy: [
  {
    "plain": "HELLO",
    "hint": "A common greeting"
  },
  {
    "plain": "WORLD",
    "hint": "The planet we live on"
  },
  {
    "plain": "APPLE",
    "hint": "A fruit that keeps the doctor away"
  },
  {
    "plain": "BEACH",
    "hint": "Sandy shores by the sea"
  },
  {
    "plain": "CLOUD",
    "hint": "Floats in the sky"
  },
  {
    "plain": "WATER",
    "hint": "Essential liquid for all living things"
  },
  {
    "plain": "SHARK",
    "hint": "A fearsome ocean predator"
  },
  {
    "plain": "OCEAN",
    "hint": "A very large expanse of sea"
  },
  {
    "plain": "CORAL",
    "hint": "Hard rocky structure built by tiny sea animals called polyps"
  },
  {
    "plain": "SHELL",
    "hint": "Hard protective outer covering of a sea creature"
  },
  {
    "plain": "RIVER",
    "hint": "A large natural stream of fresh water flowing to the sea"
  },
  {
    "plain": "WAVES",
    "hint": "Rolling ridges of water that move across the surface"
  },
  {
    "plain": "BOAT",
    "hint": "A small vessel that travels on water"
  },
  {
    "plain": "SAND",
    "hint": "Tiny loose grains of worn-down rock covering beaches"
  },
  {
    "plain": "COAST",
    "hint": "The land next to the sea"
  },
  {
    "plain": "REEF",
    "hint": "An underwater ridge of rock or coral near the surface"
  },
  {
    "plain": "TIDE",
    "hint": "The regular rise and fall of the sea level"
  },
  {
    "plain": "GULL",
    "hint": "A common white seabird often seen near harbors"
  },
  {
    "plain": "PIER",
    "hint": "A wooden structure built out over the water"
  },
  {
    "plain": "CLIFF",
    "hint": "A steep high rock face, often beside the sea"
  },
  {
    "plain": "DUNE",
    "hint": "A hill of sand shaped by the wind"
  },
  {
    "plain": "CAVE",
    "hint": "A natural hollow chamber in rock or a hillside"
  },
  {
    "plain": "PORT",
    "hint": "A town or harbor where ships load and unload"
  },
  {
    "plain": "DOCK",
    "hint": "A platform where ships are moored for loading"
  },
  {
    "plain": "KNOT",
    "hint": "A fastening tied in rope, also a unit of ship speed"
  },
  {
    "plain": "SAIL",
    "hint": "A canvas sheet that catches wind to move a boat"
  },
  {
    "plain": "MAST",
    "hint": "The tall vertical pole that holds up a ship’s sail"
  },
  {
    "plain": "DECK",
    "hint": "The flat floor surface of a ship"
  },
  {
    "plain": "FISH",
    "hint": "An animal with gills and fins that lives in water"
  },
  {
    "plain": "SWIM",
    "hint": "To move through water using your body"
  },
  {
    "plain": "DIVE",
    "hint": "To plunge headfirst into deep water"
  },
  {
    "plain": "WIND",
    "hint": "Moving air that fills a ship’s sails"
  },
  {
    "plain": "STAR",
    "hint": "A distant burning sphere of gas seen at night"
  },
  {
    "plain": "MOON",
    "hint": "The bright body that circles the Earth and rules the tides"
  },
  {
    "plain": "RAIN",
    "hint": "Water droplets that fall from clouds"
  },
  {
    "plain": "STORM",
    "hint": "Violent weather with strong winds and rain"
  },
  {
    "plain": "CALM",
    "hint": "Completely still water with no wind or waves"
  },
  {
    "plain": "CABIN",
    "hint": "A private room or living quarters on a ship"
  },
  {
    "plain": "WHALE",
    "hint": "The largest mammal living in the ocean"
  },
  {
    "plain": "SQUID",
    "hint": "A fast ten-armed creature of the deep ocean"
  }
],
  medium: [
  {
    "plain": "CIPHER",
    "hint": "A secret way of writing"
  },
  {
    "plain": "SALMON",
    "hint": "Pink-fleshed fish that swims upstream"
  },
  {
    "plain": "PUZZLE",
    "hint": "A game or problem designed to test ingenuity"
  },
  {
    "plain": "VOYAGE",
    "hint": "A long journey across the sea or space"
  },
  {
    "plain": "SHADOW",
    "hint": "A dark area where light is blocked"
  },
  {
    "plain": "HARBOR",
    "hint": "A sheltered body of water where ships dock"
  },
  {
    "plain": "ANCHOR",
    "hint": "A heavy iron device dropped to hold a ship"
  },
  {
    "plain": "ISLAND",
    "hint": "A tract of land surrounded by water"
  },
  {
    "plain": "PIRATE",
    "hint": "A sea raider who attacks ships under a black flag"
  },
  {
    "plain": "SAILOR",
    "hint": "A person who works or travels on a ship"
  },
  {
    "plain": "VESSEL",
    "hint": "A large ship or seagoing craft"
  },
  {
    "plain": "MARINE",
    "hint": "Relating to or found in the sea"
  },
  {
    "plain": "BEACON",
    "hint": "A light or fire set up as a warning signal"
  },
  {
    "plain": "BREEZE",
    "hint": "A gentle, light wind"
  },
  {
    "plain": "RUDDER",
    "hint": "A flat piece used for steering a boat"
  },
  {
    "plain": "GALLEY",
    "hint": "The kitchen area on a ship"
  },
  {
    "plain": "TACKLE",
    "hint": "Equipment and ropes used on a sailing vessel"
  },
  {
    "plain": "FATHOM",
    "hint": "A unit of depth equal to six feet in water"
  },
  {
    "plain": "LAGOON",
    "hint": "A shallow body of water separated from sea by reefs"
  },
  {
    "plain": "TRENCH",
    "hint": "A deep, steep-sided depression in the ocean floor"
  },
  {
    "plain": "TURTLE",
    "hint": "A sea reptile with a hard shell and flippers"
  },
  {
    "plain": "MARBLE",
    "hint": "A smooth patterned stone often sculpted"
  },
  {
    "plain": "JUNGLE",
    "hint": "A dense tropical forest thick with wild growth"
  },
  {
    "plain": "BRIDGE",
    "hint": "A structure spanning across water or a chasm"
  },
  {
    "plain": "FROZEN",
    "hint": "Turned into ice or hardened by extreme cold"
  },
  {
    "plain": "SUNSET",
    "hint": "The daily descent of the sun below the horizon"
  },
  {
    "plain": "PALACE",
    "hint": "A grand residence of royalty or rulers"
  },
  {
    "plain": "DESERT",
    "hint": "A dry, barren expanse with little water"
  },
  {
    "plain": "GALAXY",
    "hint": "A vast gravitational system of stars and cosmic dust"
  },
  {
    "plain": "CAVERN",
    "hint": "A vast natural hollow chamber underground"
  },
  {
    "plain": "FALCON",
    "hint": "A swift raptor bird renowned for high-speed dives"
  },
  {
    "plain": "KEEPER",
    "hint": "A guardian or caretaker watching over a post"
  },
  {
    "plain": "MIRAGE",
    "hint": "An optical illusion caused by atmospheric conditions"
  },
  {
    "plain": "SILVER",
    "hint": "A precious lustrous white metallic element"
  },
  {
    "plain": "TIMBER",
    "hint": "Wood prepared for building ships and structures"
  },
  {
    "plain": "ZEPHYR",
    "hint": "A soft, gentle western breeze"
  },
  {
    "plain": "CORAL",
    "hint": "Hard rocky structure built by tiny sea animals"
  },
  {
    "plain": "COAST",
    "hint": "The land bordering along the sea"
  },
  {
    "plain": "OCEAN",
    "hint": "A vast continuous body of salt water"
  },
  {
    "plain": "STORM",
    "hint": "Violent weather with heavy winds and rain"
  }
],
  hard: [
  {
    "plain": "MYSTERY",
    "hint": "Something that is difficult or impossible to explain"
  },
  {
    "plain": "LANTERN",
    "hint": "A portable light with protective transparent casing"
  },
  {
    "plain": "COMPASS",
    "hint": "A navigation tool with a needle pointing north"
  },
  {
    "plain": "CRYSTAL",
    "hint": "A clear mineral with a regular geometric pattern"
  },
  {
    "plain": "CURRENT",
    "hint": "A continuous directed movement of seawater"
  },
  {
    "plain": "SEAGULL",
    "hint": "A coastal bird that swoops over ocean waves"
  },
  {
    "plain": "HORIZON",
    "hint": "The line where the earth or sea meets the sky"
  },
  {
    "plain": "BALLAST",
    "hint": "Heavy material placed in a ship to ensure stability"
  },
  {
    "plain": "PELICAN",
    "hint": "A large water bird with a pouch under its beak"
  },
  {
    "plain": "DOLPHIN",
    "hint": "An intelligent marine mammal known for acrobatics"
  },
  {
    "plain": "OCTOPUS",
    "hint": "An eight-armed creature that squirts ink in defense"
  },
  {
    "plain": "EQUATOR",
    "hint": "The imaginary circle around the middle of Earth"
  },
  {
    "plain": "CORSAIR",
    "hint": "A fast pirate ship authorized to raid enemy vessels"
  },
  {
    "plain": "GALLEON",
    "hint": "A large multi-decked Spanish sailing warship"
  },
  {
    "plain": "FRIGATE",
    "hint": "A swift warship built for patrol and escort duty"
  },
  {
    "plain": "CRUISER",
    "hint": "A fast warship designed for long-range oceanic patrols"
  },
  {
    "plain": "PHANTOM",
    "hint": "An apparition or ghostly shadow seen in the mist"
  },
  {
    "plain": "TEMPEST",
    "hint": "A violent and turbulent storm upon the sea"
  },
  {
    "plain": "CAPTAIN",
    "hint": "The officer in command of a ship at sea"
  },
  {
    "plain": "KRAKEN",
    "hint": "A legendary giant sea monster of terrifying size"
  },
  {
    "plain": "SEAMARK",
    "hint": "A conspicuous landmark aiding sailors at sea"
  },
  {
    "plain": "TRIDENT",
    "hint": "A three-pronged spear carried by sea deities"
  },
  {
    "plain": "ICEBERG",
    "hint": "A massive piece of freshwater ice floating in open sea"
  },
  {
    "plain": "BARRIER",
    "hint": "A natural offshore reef guarding the coastline"
  },
  {
    "plain": "MONSOON",
    "hint": "A seasonal prevailing wind bringing ocean torrents"
  },
  {
    "plain": "MARINER",
    "hint": "A sailor who navigates the vast oceans"
  },
  {
    "plain": "CLIPPER",
    "hint": "A fast sailing ship with multiple masts and large sails"
  },
  {
    "plain": "CUTTER",
    "hint": "A fast single-masted vessel used for patrols"
  },
  {
    "plain": "BRIGADE",
    "hint": "A squadron or organized naval force"
  },
  {
    "plain": "CIPHER",
    "hint": "A secret code or cryptographic system"
  },
  {
    "plain": "FATHOM",
    "hint": "A maritime unit of underwater depth"
  },
  {
    "plain": "RUDDER",
    "hint": "A submerged blade used for steering vessels"
  },
  {
    "plain": "LAGOON",
    "hint": "A quiet saltwater basin shielded by barrier reefs"
  },
  {
    "plain": "TRENCH",
    "hint": "An immense abyss plunging into ocean depths"
  },
  {
    "plain": "BEACON",
    "hint": "A blazing coastal signal guiding night navigators"
  },
  {
    "plain": "ANCHOR",
    "hint": "A heavy forged iron hook that moors ships"
  },
  {
    "plain": "ISLAND",
    "hint": "An isolated landmass encircled by open waters"
  },
  {
    "plain": "PIRATE",
    "hint": "A rogue corsair sailing under the Jolly Roger"
  },
  {
    "plain": "SAILOR",
    "hint": "A seasoned hand working the rigging and decks"
  },
  {
    "plain": "VESSEL",
    "hint": "A sturdy seagoing craft traversing treacherous waters"
  }
],
};

function buildCaesarLevel(plain, shift, stageIndex, difficulty, hint) {
  const ciphertext = caesarEnc(plain, shift);
  const reveal = difficulty === 'easy' ? 0.6 : difficulty === 'medium' ? 0.5 : 0;
  const minRevealed = difficulty === 'hard' ? 0 : 1;
  const mask = makeMask(plain, reveal, minRevealed);
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
  const pool = caesarWords[difficulty] || caesarWords.easy;
  const randIndex = Math.floor(Math.random() * pool.length);
  const w = pool[randIndex];
  const shift = getRandomShiftForDifficulty(difficulty);
  return buildCaesarLevel(w.plain, shift, stageIndex, difficulty, w.hint);
}

export function getCaesarGameType(stageIndex) {
  return GAME_CYCLE_CAESAR[stageIndex % GAME_CYCLE_CAESAR.length];
}

/* ─────────────────── Vigenere levels ─────────────────── */
const vigenereData = {
  easy: [
  {
    "plain": "HELLO",
    "key": "BED",
    "hint": "A common greeting",
    "keyClue": "Key hint: A piece of furniture for sleeping",
    "keyInfo": "B=1, E=4, D=3 — gentle shift offsets cycle across the word."
  },
  {
    "plain": "WORLD",
    "key": "BEE",
    "hint": "The planet we live on",
    "keyClue": "Key hint: A buzzing insect that makes honey",
    "keyInfo": "B=1, E=4, E=4 — repeating E gives two adjacent positions the same shift."
  },
  {
    "plain": "APPLE",
    "key": "CHEF",
    "hint": "A fruit that keeps the doctor away",
    "keyClue": "Key hint: A master cook in a ship’s galley",
    "keyInfo": "C=2, H=7, E=4, F=5 — four balanced shifts in the 1–7 range."
  },
  {
    "plain": "BEACH",
    "key": "EDGE",
    "hint": "Sandy shores by the sea",
    "keyClue": "Key hint: The border or rim of an area",
    "keyInfo": "E=4, D=3, G=6, E=4 — cycling low shifts keep letters close to plaintext."
  },
  {
    "plain": "CLOUD",
    "key": "FEED",
    "hint": "Floats in the sky",
    "keyClue": "Key hint: To supply food to animals or crew",
    "keyInfo": "F=5, E=4, E=4, D=3 — repeating E provides consistent shifting."
  },
  {
    "plain": "WATER",
    "key": "DEED",
    "hint": "Essential liquid for all living things",
    "keyClue": "Key hint: An action performed intentionally",
    "keyInfo": "D=3, E=4, E=4, D=3 — symmetrical shifts across the word."
  },
  {
    "plain": "SHARK",
    "key": "BEEF",
    "hint": "A fearsome ocean predator",
    "keyClue": "Key hint: Meat from cattle stored for voyages",
    "keyInfo": "B=1, E=4, E=4, F=5 — shifts stay strictly between 1 and 5."
  },
  {
    "plain": "OCEAN",
    "key": "FED",
    "hint": "A very large expanse of sea",
    "keyClue": "Key hint: Given food and sustenance",
    "keyInfo": "F=5, E=4, D=3 — simple 3-letter keyword with shifts in 1–5."
  },
  {
    "plain": "CORAL",
    "key": "BEG",
    "hint": "Hard rocky structure built by tiny sea animals called polyps",
    "keyClue": "Key hint: To ask earnestly or plead for help",
    "keyInfo": "B=1, E=4, G=6 — three distinct low-tier shifts."
  },
  {
    "plain": "SHELL",
    "key": "EGG",
    "hint": "Hard protective outer covering of a sea creature",
    "keyClue": "Key hint: An oval shell laid by seabirds and reptiles",
    "keyInfo": "E=4, G=6, G=6 — repeated G applies identical shift 6."
  },
  {
    "plain": "RIVER",
    "key": "FEE",
    "hint": "A large natural stream of fresh water flowing to the sea",
    "keyClue": "Key hint: A toll or charge paid for passage",
    "keyInfo": "F=5, E=4, E=4 — easy low shifts cycle through the word."
  },
  {
    "plain": "WAVES",
    "key": "BED",
    "hint": "Rolling ridges of water that move across the surface",
    "keyClue": "Key hint: A berth or bunk where sailors rest",
    "keyInfo": "B=1, E=4, D=3 — gentle shift offsets cycle across the word."
  },
  {
    "plain": "BOAT",
    "key": "BEE",
    "hint": "A small vessel that travels on water",
    "keyClue": "Key hint: A stinging insect that gathers nectar",
    "keyInfo": "B=1, E=4, E=4 — repeating E gives two adjacent positions the same shift."
  },
  {
    "plain": "SAND",
    "key": "CHEF",
    "hint": "Tiny loose grains of worn-down rock covering beaches",
    "keyClue": "Key hint: A professional cook who prepares meals",
    "keyInfo": "C=2, H=7, E=4, F=5 — four balanced shifts in the 1–7 range."
  },
  {
    "plain": "COAST",
    "key": "EDGE",
    "hint": "The land next to the sea",
    "keyClue": "Key hint: The perimeter or boundary of the land",
    "keyInfo": "E=4, D=3, G=6, E=4 — cycling low shifts keep letters close to plaintext."
  },
  {
    "plain": "REEF",
    "key": "FEED",
    "hint": "An underwater ridge of rock or coral near the surface",
    "keyClue": "Key hint: To provide provisions to hungry sailors",
    "keyInfo": "F=5, E=4, E=4, D=3 — repeating E provides consistent shifting."
  },
  {
    "plain": "TIDE",
    "key": "DEED",
    "hint": "The regular rise and fall of the sea level",
    "keyClue": "Key hint: A noteworthy act of courage at sea",
    "keyInfo": "D=3, E=4, E=4, D=3 — symmetrical shifts across the word."
  },
  {
    "plain": "GULL",
    "key": "BEEF",
    "hint": "A common white seabird often seen near harbors",
    "keyClue": "Key hint: Salted meat stored in barrels on sailing ships",
    "keyInfo": "B=1, E=4, E=4, F=5 — shifts stay strictly between 1 and 5."
  },
  {
    "plain": "PIER",
    "key": "FED",
    "hint": "A wooden structure built out over the water",
    "keyClue": "Key hint: Nourished with ship rations",
    "keyInfo": "F=5, E=4, D=3 — simple 3-letter keyword with shifts in 1–5."
  },
  {
    "plain": "CLIFF",
    "key": "BEG",
    "hint": "A steep high rock face, often beside the sea",
    "keyClue": "Key hint: To plead or implore for quarter",
    "keyInfo": "B=1, E=4, G=6 — three distinct low-tier shifts."
  },
  {
    "plain": "DUNE",
    "key": "EGG",
    "hint": "A hill of sand shaped by the wind",
    "keyClue": "Key hint: An oval egg laid in a coastal nest",
    "keyInfo": "E=4, G=6, G=6 — repeated G applies identical shift 6."
  },
  {
    "plain": "CAVE",
    "key": "FEE",
    "hint": "A natural hollow chamber in rock or a hillside",
    "keyClue": "Key hint: A harbour duty paid at port",
    "keyInfo": "F=5, E=4, E=4 — easy low shifts cycle through the word."
  },
  {
    "plain": "PORT",
    "key": "BED",
    "hint": "A town or harbor where ships load and unload",
    "keyClue": "Key hint: A berth where crew members sleep",
    "keyInfo": "B=1, E=4, D=3 — gentle shift offsets cycle across the word."
  },
  {
    "plain": "DOCK",
    "key": "BEE",
    "hint": "A platform where ships are moored for loading",
    "keyClue": "Key hint: An insect worker in a hive",
    "keyInfo": "B=1, E=4, E=4 — repeating E gives two adjacent positions the same shift."
  },
  {
    "plain": "KNOT",
    "key": "CHEF",
    "hint": "A fastening tied in rope, also a unit of ship speed",
    "keyClue": "Key hint: The ship’s cook preparing hot stew",
    "keyInfo": "C=2, H=7, E=4, F=5 — four balanced shifts in the 1–7 range."
  },
  {
    "plain": "SAIL",
    "key": "EDGE",
    "hint": "A canvas sheet that catches wind to move a boat",
    "keyClue": "Key hint: The margin or hem of a canvas sail",
    "keyInfo": "E=4, D=3, G=6, E=4 — cycling low shifts keep letters close to plaintext."
  },
  {
    "plain": "MAST",
    "key": "FEED",
    "hint": "The tall vertical pole that holds up a ship’s sail",
    "keyClue": "Key hint: To supply provisions to the lookout",
    "keyInfo": "F=5, E=4, E=4, D=3 — repeating E provides consistent shifting."
  },
  {
    "plain": "DECK",
    "key": "DEED",
    "hint": "The flat floor surface of a ship",
    "keyClue": "Key hint: A signed title of ship ownership",
    "keyInfo": "D=3, E=4, E=4, D=3 — symmetrical shifts across the word."
  },
  {
    "plain": "FISH",
    "key": "BEEF",
    "hint": "An animal with gills and fins that lives in water",
    "keyClue": "Key hint: Salt provisions carried in ship holds",
    "keyInfo": "B=1, E=4, E=4, F=5 — shifts stay strictly between 1 and 5."
  },
  {
    "plain": "SWIM",
    "key": "FED",
    "hint": "To move through water using your body",
    "keyClue": "Key hint: Provided with energy and food",
    "keyInfo": "F=5, E=4, D=3 — simple 3-letter keyword with shifts in 1–5."
  },
  {
    "plain": "DIVE",
    "key": "BEG",
    "hint": "To plunge headfirst into deep water",
    "keyClue": "Key hint: To ask earnestly for assistance",
    "keyInfo": "B=1, E=4, G=6 — three distinct low-tier shifts."
  },
  {
    "plain": "WIND",
    "key": "EGG",
    "hint": "Moving air that fills a ship’s sails",
    "keyClue": "Key hint: A delicate oval shell holding new life",
    "keyInfo": "E=4, G=6, G=6 — repeated G applies identical shift 6."
  },
  {
    "plain": "STAR",
    "key": "FEE",
    "hint": "A distant burning sphere of gas seen at night",
    "keyClue": "Key hint: A navigator’s fee for celestial charts",
    "keyInfo": "F=5, E=4, E=4 — easy low shifts cycle through the word."
  },
  {
    "plain": "MOON",
    "key": "BED",
    "hint": "The bright body that circles the Earth and rules the tides",
    "keyClue": "Key hint: A cozy bunk after a night watch",
    "keyInfo": "B=1, E=4, D=3 — gentle shift offsets cycle across the word."
  },
  {
    "plain": "RAIN",
    "key": "BEE",
    "hint": "Water droplets that fall from clouds",
    "keyClue": "Key hint: A worker gathering nectar before the storm",
    "keyInfo": "B=1, E=4, E=4 — repeating E gives two adjacent positions the same shift."
  },
  {
    "plain": "STORM",
    "key": "CHEF",
    "hint": "Violent weather with strong winds and rain",
    "keyClue": "Key hint: The cook securing pots in a squall",
    "keyInfo": "C=2, H=7, E=4, F=5 — four balanced shifts in the 1–7 range."
  },
  {
    "plain": "CALM",
    "key": "EDGE",
    "hint": "Completely still water with no wind or waves",
    "keyClue": "Key hint: The smooth rim of the glass sea",
    "keyInfo": "E=4, D=3, G=6, E=4 — cycling low shifts keep letters close to plaintext."
  },
  {
    "plain": "CABIN",
    "key": "FEED",
    "hint": "A private room or living quarters on a ship",
    "keyClue": "Key hint: To supply mess meals to officers",
    "keyInfo": "F=5, E=4, E=4, D=3 — repeating E provides consistent shifting."
  },
  {
    "plain": "WHALE",
    "key": "DEED",
    "hint": "The largest mammal living in the ocean",
    "keyClue": "Key hint: A brave feat recorded in ship logs",
    "keyInfo": "D=3, E=4, E=4, D=3 — symmetrical shifts across the word."
  },
  {
    "plain": "SQUID",
    "key": "BEEF",
    "hint": "A fast ten-armed creature of the deep ocean",
    "keyClue": "Key hint: Salted barrels of provisions",
    "keyInfo": "B=1, E=4, E=4, F=5 — shifts stay strictly between 1 and 5."
  }
],
  medium: [
  {
    "plain": "CIPHER",
    "key": "LOCK",
    "hint": "A secret way of writing",
    "keyClue": "Key hint: A fastening mechanism opened by a key",
    "keyInfo": "L=11, O=14, C=2, K=10 — four key values cycling through the positions."
  },
  {
    "plain": "SALMON",
    "key": "HOOK",
    "hint": "Pink-fleshed fish that swims upstream",
    "keyClue": "Key hint: A curved barb used by fishermen",
    "keyInfo": "H=7, O=14, O=14, K=10 — double O applies identical 14 shift."
  },
  {
    "plain": "PUZZLE",
    "key": "COIN",
    "hint": "A game or problem designed to test ingenuity",
    "keyClue": "Key hint: A stamped piece of metal used as currency",
    "keyInfo": "C=2, O=14, I=8, N=13 — varied medium-tier shifts."
  },
  {
    "plain": "VOYAGE",
    "key": "HELM",
    "hint": "A long journey across the sea or space",
    "keyClue": "Key hint: The tiller or wheel steering the vessel",
    "keyInfo": "H=7, E=4, L=11, M=12 — nautical key with shifts between 4 and 12."
  },
  {
    "plain": "SHADOW",
    "key": "LION",
    "hint": "A dark area where light is blocked",
    "keyClue": "Key hint: A proud golden predator with a great mane",
    "keyInfo": "L=11, I=8, O=14, N=13 — moderate shifts spanning up to 14."
  },
  {
    "plain": "HARBOR",
    "key": "DECK",
    "hint": "A sheltered body of water where ships dock",
    "keyClue": "Key hint: The flat wooden walking surface of a ship",
    "keyInfo": "D=3, E=4, C=2, K=10 — compact maritime keyword."
  },
  {
    "plain": "ANCHOR",
    "key": "GOLD",
    "hint": "A heavy iron device dropped to hold a ship",
    "keyClue": "Key hint: A precious yellow treasure metal",
    "keyInfo": "G=6, O=14, L=11, D=3 — shifts reaching up to 14."
  },
  {
    "plain": "ISLAND",
    "key": "KING",
    "hint": "A tract of land surrounded by water",
    "keyClue": "Key hint: A sovereign ruler wearing a crown",
    "keyInfo": "K=10, I=8, N=13, G=6 — strong balanced shifts cycling across."
  },
  {
    "plain": "PIRATE",
    "key": "BELL",
    "hint": "A sea raider who attacks ships under a black flag",
    "keyClue": "Key hint: A ship instrument that chimes watch hours",
    "keyInfo": "B=1, E=4, L=11, L=11 — double L applies identical 11 shift."
  },
  {
    "plain": "SAILOR",
    "key": "MINE",
    "hint": "A person who works or travels on a ship",
    "keyClue": "Key hint: An underground excavation for ore",
    "keyInfo": "M=12, I=8, N=13, E=4 — cycling medium shifts."
  },
  {
    "plain": "VESSEL",
    "key": "LOG",
    "hint": "A large ship or seagoing craft",
    "keyClue": "Key hint: An official record of voyages and speed",
    "keyInfo": "L=11, O=14, G=6 — nautical logbook keyword."
  },
  {
    "plain": "MARINE",
    "key": "FOG",
    "hint": "Relating to or found in the sea",
    "keyClue": "Key hint: A thick mist hovering over the water",
    "keyInfo": "F=5, O=14, G=6 — 3-letter keyword with shifts up to 14."
  },
  {
    "plain": "BEACON",
    "key": "FOIL",
    "hint": "A light or fire set up as a warning signal",
    "keyClue": "Key hint: A shiny metallic sheet reflector",
    "keyInfo": "F=5, O=14, I=8, L=11 — shifts 5, 14, 8, 11."
  },
  {
    "plain": "BREEZE",
    "key": "LOCK",
    "hint": "A gentle, light wind",
    "keyClue": "Key hint: A mechanism securing treasure chests",
    "keyInfo": "L=11, O=14, C=2, K=10 — four key values cycling through positions."
  },
  {
    "plain": "RUDDER",
    "key": "HOOK",
    "hint": "A flat piece used for steering a boat",
    "keyClue": "Key hint: A curved iron gaff or anchor hook",
    "keyInfo": "H=7, O=14, O=14, K=10 — double O applies identical 14 shift."
  },
  {
    "plain": "GALLEY",
    "key": "COIN",
    "hint": "The kitchen area on a ship",
    "keyClue": "Key hint: A shiny doubloon paid to cooks",
    "keyInfo": "C=2, O=14, I=8, N=13 — varied medium-tier shifts."
  },
  {
    "plain": "TACKLE",
    "key": "HELM",
    "hint": "Equipment and ropes used on a sailing vessel",
    "keyClue": "Key hint: The steering control station on the bridge",
    "keyInfo": "H=7, E=4, L=11, M=12 — nautical key with shifts between 4 and 12."
  },
  {
    "plain": "FATHOM",
    "key": "LION",
    "hint": "A unit of depth equal to six feet in water",
    "keyClue": "Key hint: The figurehead beast carved on the bow",
    "keyInfo": "L=11, I=8, O=14, N=13 — moderate shifts spanning up to 14."
  },
  {
    "plain": "LAGOON",
    "key": "DECK",
    "hint": "A shallow body of water separated from sea by reefs",
    "keyClue": "Key hint: The teak deck overlooking emerald waters",
    "keyInfo": "D=3, E=4, C=2, K=10 — compact maritime keyword."
  },
  {
    "plain": "TRENCH",
    "key": "GOLD",
    "hint": "A deep, steep-sided depression in the ocean floor",
    "keyClue": "Key hint: Sunken doubloons buried in the abyss",
    "keyInfo": "G=6, O=14, L=11, D=3 — shifts reaching up to 14."
  },
  {
    "plain": "TURTLE",
    "key": "KING",
    "hint": "A sea reptile with a hard shell and flippers",
    "keyClue": "Key hint: The monarch of the ocean depths",
    "keyInfo": "K=10, I=8, N=13, G=6 — strong balanced shifts cycling across."
  },
  {
    "plain": "MARBLE",
    "key": "BELL",
    "hint": "A smooth patterned stone often sculpted",
    "keyClue": "Key hint: A bronze bell polished like marble",
    "keyInfo": "B=1, E=4, L=11, L=11 — double L applies identical 11 shift."
  },
  {
    "plain": "JUNGLE",
    "key": "MINE",
    "hint": "A dense tropical forest thick with wild growth",
    "keyClue": "Key hint: An old mineral dig hidden in dense canopy",
    "keyInfo": "M=12, I=8, N=13, E=4 — cycling medium shifts."
  },
  {
    "plain": "BRIDGE",
    "key": "LOG",
    "hint": "A structure spanning across water or a chasm",
    "keyClue": "Key hint: The captain’s log kept on the bridge",
    "keyInfo": "L=11, O=14, G=6 — nautical logbook keyword."
  },
  {
    "plain": "FROZEN",
    "key": "FOG",
    "hint": "Turned into ice or hardened by extreme cold",
    "keyClue": "Key hint: Freezing mist blanketing the ice shelf",
    "keyInfo": "F=5, O=14, G=6 — 3-letter keyword with shifts up to 14."
  },
  {
    "plain": "SUNSET",
    "key": "FOIL",
    "hint": "The daily descent of the sun below the horizon",
    "keyClue": "Key hint: Golden reflections like metallic foil",
    "keyInfo": "F=5, O=14, I=8, L=11 — shifts 5, 14, 8, 11."
  },
  {
    "plain": "PALACE",
    "key": "LOCK",
    "hint": "A grand residence of royalty or rulers",
    "keyClue": "Key hint: Heavy brass locks on castle gates",
    "keyInfo": "L=11, O=14, C=2, K=10 — four key values cycling through positions."
  },
  {
    "plain": "DESERT",
    "key": "HOOK",
    "hint": "A dry, barren expanse with little water",
    "keyClue": "Key hint: A caravan trail hooked around the dunes",
    "keyInfo": "H=7, O=14, O=14, K=10 — double O applies identical 14 shift."
  },
  {
    "plain": "GALAXY",
    "key": "COIN",
    "hint": "A vast gravitational system of stars and cosmic dust",
    "keyClue": "Key hint: Stars scattered like gleaming coins",
    "keyInfo": "C=2, O=14, I=8, N=13 — varied medium-tier shifts."
  },
  {
    "plain": "CAVERN",
    "key": "HELM",
    "hint": "A vast natural hollow chamber underground",
    "keyClue": "Key hint: Steering into the cavern with steady hands",
    "keyInfo": "H=7, E=4, L=11, M=12 — nautical key with shifts between 4 and 12."
  },
  {
    "plain": "FALCON",
    "key": "LION",
    "hint": "A swift raptor bird renowned for high-speed dives",
    "keyClue": "Key hint: A regal predator painted on the herald",
    "keyInfo": "L=11, I=8, O=14, N=13 — moderate shifts spanning up to 14."
  },
  {
    "plain": "KEEPER",
    "key": "DECK",
    "hint": "A guardian or caretaker watching over a post",
    "keyClue": "Key hint: The watchkeeper standing on the quarterdeck",
    "keyInfo": "D=3, E=4, C=2, K=10 — compact maritime keyword."
  },
  {
    "plain": "MIRAGE",
    "key": "GOLD",
    "hint": "An optical illusion caused by atmospheric conditions",
    "keyClue": "Key hint: The shimmering promise of golden riches",
    "keyInfo": "G=6, O=14, L=11, D=3 — shifts reaching up to 14."
  },
  {
    "plain": "SILVER",
    "key": "KING",
    "hint": "A precious lustrous white metallic element",
    "keyClue": "Key hint: Royal silver tribute for the monarch",
    "keyInfo": "K=10, I=8, N=13, G=6 — strong balanced shifts cycling across."
  },
  {
    "plain": "TIMBER",
    "key": "BELL",
    "hint": "Wood prepared for building ships and structures",
    "keyClue": "Key hint: The ship’s bell mounted on the main mast",
    "keyInfo": "B=1, E=4, L=11, L=11 — double L applies identical 11 shift."
  },
  {
    "plain": "ZEPHYR",
    "key": "MINE",
    "hint": "A soft, gentle western breeze",
    "keyClue": "Key hint: Fresh airflow circulating through deep shafts",
    "keyInfo": "M=12, I=8, N=13, E=4 — cycling medium shifts."
  },
  {
    "plain": "CORAL",
    "key": "LOG",
    "hint": "Hard rocky structure built by tiny sea animals",
    "keyClue": "Key hint: Dangerous reefs noted in the captain’s log",
    "keyInfo": "L=11, O=14, G=6 — nautical logbook keyword."
  },
  {
    "plain": "COAST",
    "key": "FOG",
    "hint": "The land bordering along the sea",
    "keyClue": "Key hint: Shrouded shores hidden behind grey vapor",
    "keyInfo": "F=5, O=14, G=6 — 3-letter keyword with shifts up to 14."
  },
  {
    "plain": "OCEAN",
    "key": "FOIL",
    "hint": "A vast continuous body of salt water",
    "keyClue": "Key hint: Glittering waves shimmering like metal foil",
    "keyInfo": "F=5, O=14, I=8, L=11 — shifts 5, 14, 8, 11."
  },
  {
    "plain": "STORM",
    "key": "LOCK",
    "hint": "Violent weather with heavy winds and rain",
    "keyClue": "Key hint: Batten down hatches and lock the cargo doors",
    "keyInfo": "L=11, O=14, C=2, K=10 — four key values cycling through positions."
  }
],
  hard: [
  {
    "plain": "MYSTERY",
    "key": "STORM",
    "hint": "Something that is difficult or impossible to explain",
    "keyClue": "Key hint: Violent turbulent squall weather",
    "keyInfo": "S=18, T=19, O=14, R=17, M=12 — strong high-value shifts throughout."
  },
  {
    "plain": "LANTERN",
    "key": "GHOST",
    "hint": "A portable light with protective transparent casing",
    "keyClue": "Key hint: An ethereal spirit wandering in the night",
    "keyInfo": "G=6, H=7, O=14, S=18, T=19 — five distinct shifts cycle across the word."
  },
  {
    "plain": "COMPASS",
    "key": "LIGHT",
    "hint": "A navigation tool with a needle pointing north",
    "keyClue": "Key hint: Electromagnetic illumination piercing darkness",
    "keyInfo": "L=11, I=8, G=6, H=7, T=19 — each letter advances the plaintext accordingly."
  },
  {
    "plain": "CRYSTAL",
    "key": "DEPTH",
    "hint": "A clear mineral with a regular geometric pattern",
    "keyClue": "Key hint: Distance measuring far down into the abyss",
    "keyInfo": "D=3, E=4, P=15, T=19, H=7 — broad shifts across the alphabet."
  },
  {
    "plain": "CURRENT",
    "key": "CREST",
    "hint": "A continuous directed movement of seawater",
    "keyClue": "Key hint: The foaming top of an ocean surge",
    "keyInfo": "C=2, R=17, E=4, S=18, T=19 — high shifts challenging decryption."
  },
  {
    "plain": "SEAGULL",
    "key": "WIND",
    "hint": "A coastal bird that swoops over ocean waves",
    "keyClue": "Key hint: Powerful air currents filling topgallants",
    "keyInfo": "W=22, I=8, N=13, D=3 — W creates a large shift of 22."
  },
  {
    "plain": "HORIZON",
    "key": "CORNER",
    "hint": "The line where the earth or sea meets the sky",
    "keyClue": "Key hint: A junction where two bearings intersect",
    "keyInfo": "C=2, O=14, R=17, N=13, E=4, R=17 — 6-letter rotating key."
  },
  {
    "plain": "BALLAST",
    "key": "SILVER",
    "hint": "Heavy material placed in a ship to ensure stability",
    "keyClue": "Key hint: A precious lustrous white metallic element",
    "keyInfo": "S=18, I=8, L=11, V=21, E=4, R=17 — six varied shifts across the word."
  },
  {
    "plain": "PELICAN",
    "key": "SQUID",
    "hint": "A large water bird with a pouch under its beak",
    "keyClue": "Key hint: A deep-sea cephalopod that squirts dark ink",
    "keyInfo": "S=18, Q=16, U=20, I=8, D=3 — high shifts with U=20 and S=18."
  },
  {
    "plain": "DOLPHIN",
    "key": "STORM",
    "hint": "An intelligent marine mammal known for acrobatics",
    "keyClue": "Key hint: A tempest of gales and driving rain",
    "keyInfo": "S=18, T=19, O=14, R=17, M=12 — strong high-value shifts throughout."
  },
  {
    "plain": "OCTOPUS",
    "key": "GHOST",
    "hint": "An eight-armed creature that squirts ink in defense",
    "keyClue": "Key hint: A spectral apparition of lost sailors",
    "keyInfo": "G=6, H=7, O=14, S=18, T=19 — five distinct shifts cycle across the word."
  },
  {
    "plain": "EQUATOR",
    "key": "LIGHT",
    "hint": "The imaginary circle around the middle of Earth",
    "keyClue": "Key hint: Blazing tropical sunshine",
    "keyInfo": "L=11, I=8, G=6, H=7, T=19 — each letter advances the plaintext accordingly."
  },
  {
    "plain": "CORSAIR",
    "key": "DEPTH",
    "hint": "A fast pirate ship authorized to raid enemy vessels",
    "keyClue": "Key hint: The deep oceanic trench where wrecks lie",
    "keyInfo": "D=3, E=4, P=15, T=19, H=7 — broad shifts across the alphabet."
  },
  {
    "plain": "GALLEON",
    "key": "CREST",
    "hint": "A large multi-decked Spanish sailing warship",
    "keyClue": "Key hint: The royal crest stamped upon treasure bars",
    "keyInfo": "C=2, R=17, E=4, S=18, T=19 — high shifts challenging decryption."
  },
  {
    "plain": "FRIGATE",
    "key": "WIND",
    "hint": "A swift warship built for patrol and escort duty",
    "keyClue": "Key hint: Swift offshore gales carrying sails",
    "keyInfo": "W=22, I=8, N=13, D=3 — W creates a large shift of 22."
  },
  {
    "plain": "CRUISER",
    "key": "CORNER",
    "hint": "A fast warship designed for long-range oceanic patrols",
    "keyClue": "Key hint: Patrolling every corner of the charted sea",
    "keyInfo": "C=2, O=14, R=17, N=13, E=4, R=17 — 6-letter rotating key."
  },
  {
    "plain": "PHANTOM",
    "key": "SILVER",
    "hint": "An apparition or ghostly shadow seen in the mist",
    "keyClue": "Key hint: A gleaming silver mist in twilight",
    "keyInfo": "S=18, I=8, L=11, V=21, E=4, R=17 — six varied shifts across the word."
  },
  {
    "plain": "TEMPEST",
    "key": "SQUID",
    "hint": "A violent and turbulent storm upon the sea",
    "keyClue": "Key hint: A sea monster thriving in stormy depths",
    "keyInfo": "S=18, Q=16, U=20, I=8, D=3 — high shifts with U=20 and S=18."
  },
  {
    "plain": "CAPTAIN",
    "key": "STORM",
    "hint": "The officer in command of a ship at sea",
    "keyClue": "Key hint: Weathering a ferocious squall at the helm",
    "keyInfo": "S=18, T=19, O=14, R=17, M=12 — strong high-value shifts throughout."
  },
  {
    "plain": "KRAKEN",
    "key": "GHOST",
    "hint": "A legendary giant sea monster of terrifying size",
    "keyClue": "Key hint: Phantom legends whispered by whalers",
    "keyInfo": "G=6, H=7, O=14, S=18, T=19 — five distinct shifts cycle across the word."
  },
  {
    "plain": "SEAMARK",
    "key": "LIGHT",
    "hint": "A conspicuous landmark aiding sailors at sea",
    "keyClue": "Key hint: A lighthouse beam guiding through shoals",
    "keyInfo": "L=11, I=8, G=6, H=7, T=19 — each letter advances the plaintext accordingly."
  },
  {
    "plain": "TRIDENT",
    "key": "DEPTH",
    "hint": "A three-pronged spear carried by sea deities",
    "keyClue": "Key hint: Forged in the abyssal ocean floor",
    "keyInfo": "D=3, E=4, P=15, T=19, H=7 — broad shifts across the alphabet."
  },
  {
    "plain": "ICEBERG",
    "key": "CREST",
    "hint": "A massive piece of freshwater ice floating in open sea",
    "keyClue": "Key hint: Glacial ridges towering above frosty waves",
    "keyInfo": "C=2, R=17, E=4, S=18, T=19 — high shifts challenging decryption."
  },
  {
    "plain": "BARRIER",
    "key": "WIND",
    "hint": "A natural offshore reef guarding the coastline",
    "keyClue": "Key hint: Windward breakers crashing on the shoals",
    "keyInfo": "W=22, I=8, N=13, D=3 — W creates a large shift of 22."
  },
  {
    "plain": "MONSOON",
    "key": "CORNER",
    "hint": "A seasonal prevailing wind bringing ocean torrents",
    "keyClue": "Key hint: Sweeping round every cape and island corner",
    "keyInfo": "C=2, O=14, R=17, N=13, E=4, R=17 — 6-letter rotating key."
  },
  {
    "plain": "MARINER",
    "key": "SILVER",
    "hint": "A sailor who navigates the vast oceans",
    "keyClue": "Key hint: Navigating by the silvery moonlight",
    "keyInfo": "S=18, I=8, L=11, V=21, E=4, R=17 — six varied shifts across the word."
  },
  {
    "plain": "CLIPPER",
    "key": "SQUID",
    "hint": "A fast sailing ship with multiple masts and large sails",
    "keyClue": "Key hint: Outrunning deep-sea beasts across trade winds",
    "keyInfo": "S=18, Q=16, U=20, I=8, D=3 — high shifts with U=20 and S=18."
  },
  {
    "plain": "CUTTER",
    "key": "STORM",
    "hint": "A fast single-masted vessel used for patrols",
    "keyClue": "Key hint: Swift cutter slicing through heavy seas",
    "keyInfo": "S=18, T=19, O=14, R=17, M=12 — strong high-value shifts throughout."
  },
  {
    "plain": "BRIGADE",
    "key": "GHOST",
    "hint": "A squadron or organized naval force",
    "keyClue": "Key hint: A ghostly armada sailing in formation",
    "keyInfo": "G=6, H=7, O=14, S=18, T=19 — five distinct shifts cycle across the word."
  },
  {
    "plain": "CIPHER",
    "key": "LIGHT",
    "hint": "A secret code or cryptographic system",
    "keyClue": "Key hint: Shining light upon hidden messages",
    "keyInfo": "L=11, I=8, G=6, H=7, T=19 — each letter advances the plaintext accordingly."
  },
  {
    "plain": "FATHOM",
    "key": "DEPTH",
    "hint": "A maritime unit of underwater depth",
    "keyClue": "Key hint: Sounding lead plunged into the abyss",
    "keyInfo": "D=3, E=4, P=15, T=19, H=7 — broad shifts across the alphabet."
  },
  {
    "plain": "RUDDER",
    "key": "CREST",
    "hint": "A submerged blade used for steering vessels",
    "keyClue": "Key hint: Riding the highest crest of rolling breakers",
    "keyInfo": "C=2, R=17, E=4, S=18, T=19 — high shifts challenging decryption."
  },
  {
    "plain": "LAGOON",
    "key": "WIND",
    "hint": "A quiet saltwater basin shielded by barrier reefs",
    "keyClue": "Key hint: Gentle trade winds rustling palm trees",
    "keyInfo": "W=22, I=8, N=13, D=3 — W creates a large shift of 22."
  },
  {
    "plain": "TRENCH",
    "key": "CORNER",
    "hint": "An immense abyss plunging into ocean depths",
    "keyClue": "Key hint: Uncharted corners of the midnight ocean",
    "keyInfo": "C=2, O=14, R=17, N=13, E=4, R=17 — 6-letter rotating key."
  },
  {
    "plain": "BEACON",
    "key": "SILVER",
    "hint": "A blazing coastal signal guiding night navigators",
    "keyClue": "Key hint: Shining like a polished silver mirror",
    "keyInfo": "S=18, I=8, L=11, V=21, E=4, R=17 — six varied shifts across the word."
  },
  {
    "plain": "ANCHOR",
    "key": "SQUID",
    "hint": "A heavy forged iron hook that moors ships",
    "keyClue": "Key hint: Entangled with tentacles on the sea bed",
    "keyInfo": "S=18, Q=16, U=20, I=8, D=3 — high shifts with U=20 and S=18."
  },
  {
    "plain": "ISLAND",
    "key": "STORM",
    "hint": "An isolated landmass encircled by open waters",
    "keyClue": "Key hint: Buffeted by ocean squalls and heavy gales",
    "keyInfo": "S=18, T=19, O=14, R=17, M=12 — strong high-value shifts throughout."
  },
  {
    "plain": "PIRATE",
    "key": "GHOST",
    "hint": "A rogue corsair sailing under the Jolly Roger",
    "keyClue": "Key hint: Legendary ghost ship flying ragged sails",
    "keyInfo": "G=6, H=7, O=14, S=18, T=19 — five distinct shifts cycle across the word."
  },
  {
    "plain": "SAILOR",
    "key": "LIGHT",
    "hint": "A seasoned hand working the rigging and decks",
    "keyClue": "Key hint: Watching for dawn light on morning watch",
    "keyInfo": "L=11, I=8, G=6, H=7, T=19 — each letter advances the plaintext accordingly."
  },
  {
    "plain": "VESSEL",
    "key": "DEPTH",
    "hint": "A sturdy seagoing craft traversing treacherous waters",
    "keyClue": "Key hint: Slicing through deep sapphire ocean waters",
    "keyInfo": "D=3, E=4, P=15, T=19, H=7 — broad shifts across the alphabet."
  }
],
};

function buildVigenereLevel(plain, key, stageIndex, difficulty, hint, keyClue, keyInfo) {
  const ciphertext = vigEnc(plain, key);
  const reveal = difficulty === 'easy' ? 0.6 : difficulty === 'medium' ? 0.5 : 0;
  const minRevealed = difficulty === 'hard' ? 0 : 1;
  const mask = makeMask(plain, reveal, minRevealed);
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
  const pool = vigenereData[difficulty] || vigenereData.easy;
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
    "plain": "BOAT",
    "key": "WAVE",
    "hint": "A small vessel that travels on water",
    "keyClue": "A rolling ridge of moving water",
    "lesson": "Playfair reads letters in pairs (digraphs). Same-row letters shift left to decrypt."
  },
  {
    "plain": "SAND",
    "key": "TIDE",
    "hint": "Tiny loose grains of worn-down rock covering beaches",
    "keyClue": "The regular rise and fall of the sea",
    "lesson": "Same-column digraph pairs shift upward by one letter when decrypting."
  },
  {
    "plain": "REEF",
    "key": "FISH",
    "hint": "An underwater ridge of rock or coral near the surface",
    "keyClue": "A gilled creature swimming the currents",
    "lesson": "Rectangle pairs swap columns while staying on their original rows."
  },
  {
    "plain": "TIDE",
    "key": "BOAT",
    "hint": "The regular rise and fall of the sea level",
    "keyClue": "A small craft navigating coastal waters",
    "lesson": "The letters I and J share a single square in the 5x5 Playfair matrix."
  },
  {
    "plain": "GULL",
    "key": "SAND",
    "hint": "A common white seabird often seen near harbors",
    "keyClue": "Fine coastal sediment along the shoreline",
    "lesson": "Identical letter pairs are separated with the filler letter X."
  },
  {
    "plain": "PIER",
    "key": "REEF",
    "hint": "A wooden structure built out over the water",
    "keyClue": "A submerged coral ledge near the shore",
    "lesson": "Same-row digraphs shift left with wrap-around at the row border."
  },
  {
    "plain": "DUNE",
    "key": "DOCK",
    "hint": "A hill of sand shaped by the wind",
    "keyClue": "A wooden landing platform for mooring boats",
    "lesson": "Same-column digraphs shift upward with wrap-around at the top."
  },
  {
    "plain": "CAVE",
    "key": "MAST",
    "hint": "A natural hollow chamber in rock or a hillside",
    "keyClue": "The vertical wooden spar holding the sails",
    "lesson": "In a rectangle rule, pick the letters at the opposite column corners."
  },
  {
    "plain": "PORT",
    "key": "SAIL",
    "hint": "A town or harbor where ships load and unload",
    "keyClue": "A canvas sheet catching oceanic breezes",
    "lesson": "Playfair encrypts digraph pairs rather than individual single letters."
  },
  {
    "plain": "DOCK",
    "key": "PORT",
    "hint": "A platform where ships are moored for loading",
    "keyClue": "A bustling haven for merchant vessels",
    "lesson": "Same-row digraphs move one space to the left when deciphering."
  },
  {
    "plain": "KNOT",
    "key": "GULL",
    "hint": "A fastening tied in rope, also a unit of ship speed",
    "keyClue": "A white seafaring bird soaring over waves",
    "lesson": "Same-column digraphs move one space up when deciphering."
  },
  {
    "plain": "SAIL",
    "key": "DECK",
    "hint": "A canvas sheet that catches wind to move a boat",
    "keyClue": "The main outdoor planked surface of a ship",
    "lesson": "Matrix coordinates (row, col) define digraph transformations."
  },
  {
    "plain": "MAST",
    "key": "WIND",
    "hint": "The tall vertical pole that holds up a ship’s sail",
    "keyClue": "Air currents powering sailing ships",
    "lesson": "Remember: I and J occupy the exact same cell in the grid."
  },
  {
    "plain": "DECK",
    "key": "STAR",
    "hint": "The flat floor surface of a ship",
    "keyClue": "A celestial navigational beacon at night",
    "lesson": "Rectangle pairs swap columns while retaining their row coordinates."
  },
  {
    "plain": "FISH",
    "key": "MOON",
    "hint": "An animal with gills and fins that lives in water",
    "keyClue": "The silver orb governing oceanic tides",
    "lesson": "Decryption reverses the encryption shifts along rows and columns."
  },
  {
    "plain": "SWIM",
    "key": "RAIN",
    "hint": "To move through water using your body",
    "keyClue": "Precipitation falling over the open seas",
    "lesson": "Same-row pairs step left; same-column pairs step up."
  },
  {
    "plain": "DIVE",
    "key": "CALM",
    "hint": "To plunge headfirst into deep water",
    "keyClue": "Tranquil sea waters devoid of squalls",
    "lesson": "Two letters in a digraph cannot be identical without a filler."
  },
  {
    "plain": "WIND",
    "key": "BEACH",
    "hint": "Moving air that fills a ship’s sails",
    "keyClue": "A warm sandy shoreline touching the sea",
    "lesson": "Keyword letters fill the matrix first, followed by the remaining alphabet."
  },
  {
    "plain": "STAR",
    "key": "CORAL",
    "hint": "A distant burning sphere of gas seen at night",
    "keyClue": "Marine polyps forming vast underwater structures",
    "lesson": "Same-row digraphs wrap around to the rightmost column when moving left."
  },
  {
    "plain": "MOON",
    "key": "SHELL",
    "hint": "The bright body that circles the Earth and rules the tides",
    "keyClue": "A hard calcified shield of a molluscan creature",
    "lesson": "Same-column digraphs wrap around to the bottom row when moving up."
  },
  {
    "plain": "RAIN",
    "key": "WAVE",
    "hint": "Water droplets that fall from clouds",
    "keyClue": "A cresting swell of moving water",
    "lesson": "Rectangle pairs maintain their respective row levels."
  },
  {
    "plain": "CALM",
    "key": "TIDE",
    "hint": "Completely still water with no wind or waves",
    "keyClue": "The gravitational ebb and flood of the ocean",
    "lesson": "Playfair was invented by Charles Wheatstone in 1854."
  },
  {
    "plain": "HELLO",
    "key": "FISH",
    "hint": "A common friendly greeting",
    "keyClue": "A swimming gilled sea creature",
    "lesson": "Double letters like LL in HELLO are split with filler X."
  },
  {
    "plain": "WORLD",
    "key": "BOAT",
    "hint": "The planet we live on",
    "keyClue": "A vessel sailing across waterways",
    "lesson": "Five-by-five key squares house 25 unique cipher letters."
  },
  {
    "plain": "APPLE",
    "key": "SAND",
    "hint": "A fruit that keeps the doctor away",
    "keyClue": "Finely crushed mineral shore grains",
    "lesson": "Same-row pairs slide leftward during decryption."
  },
  {
    "plain": "BEACH",
    "key": "REEF",
    "hint": "Sandy shores by the sea",
    "keyClue": "A rocky ridge near the surface",
    "lesson": "Same-column pairs slide upward during decryption."
  },
  {
    "plain": "CLOUD",
    "key": "DOCK",
    "hint": "Floats in the sky",
    "keyClue": "A mooring pier for seagoing vessels",
    "lesson": "Corner letters in a rectangle rule form the decrypted pair."
  },
  {
    "plain": "WATER",
    "key": "MAST",
    "hint": "Essential liquid for all living things",
    "keyClue": "The upright timber supporting sails",
    "lesson": "Playfair encrypts text in digraph pairs."
  },
  {
    "plain": "SHARK",
    "key": "SAIL",
    "hint": "A fearsome ocean predator",
    "keyClue": "Canvas sheets catching coastal breezes",
    "lesson": "Keep track of the row and column of each letter."
  },
  {
    "plain": "OCEAN",
    "key": "PORT",
    "hint": "A very large expanse of sea",
    "keyClue": "A sheltered coastal harbor",
    "lesson": "Duplicate keyword letters are skipped when building the grid."
  },
  {
    "plain": "CORAL",
    "key": "GULL",
    "hint": "Hard rocky structure built by tiny sea animals called polyps",
    "keyClue": "A white coastal scavenger bird",
    "lesson": "Same-row letters shift left; same-column letters shift up."
  },
  {
    "plain": "SHELL",
    "key": "DECK",
    "hint": "Hard protective outer covering of a sea creature",
    "keyClue": "The flat upper timber floor of a vessel",
    "lesson": "Deciphering reverses the direction of encryption shifts."
  },
  {
    "plain": "RIVER",
    "key": "WIND",
    "hint": "A large natural stream of fresh water flowing to the sea",
    "keyClue": "Moving atmospheric currents filling sails",
    "lesson": "Rectangle digraph pairs swap horizontal coordinates."
  },
  {
    "plain": "WAVES",
    "key": "STAR",
    "hint": "Rolling ridges of water that move across the surface",
    "keyClue": "A night-sky celestial landmark",
    "lesson": "The matrix grid has 5 rows and 5 columns."
  },
  {
    "plain": "COAST",
    "key": "MOON",
    "hint": "The land next to the sea",
    "keyClue": "The celestial sphere that governs tides",
    "lesson": "Same-column pairs shift up one cell during decryption."
  },
  {
    "plain": "CLIFF",
    "key": "RAIN",
    "hint": "A steep high rock face, often beside the sea",
    "keyClue": "Fresh precipitation over coastal bluffs",
    "lesson": "Same-row pairs shift left one cell during decryption."
  },
  {
    "plain": "STORM",
    "key": "CALM",
    "hint": "Violent weather with strong winds and rain",
    "keyClue": "Quiet seas following a tempest",
    "lesson": "Rectangle transformations preserve the original rows."
  },
  {
    "plain": "CABIN",
    "key": "BEACH",
    "hint": "A private room or living quarters on a ship",
    "keyClue": "The sandy edge of an island",
    "lesson": "Keyword letters appear first in the matrix without duplicates."
  },
  {
    "plain": "WHALE",
    "key": "CORAL",
    "hint": "The largest mammal living in the ocean",
    "keyClue": "Reef formations created by polyps",
    "lesson": "Pair letters in the same row step leftward to decrypt."
  },
  {
    "plain": "SQUID",
    "key": "SHELL",
    "hint": "A fast ten-armed creature of the deep ocean",
    "keyClue": "A hard armor covering sea life",
    "lesson": "Pair letters in the same column step upward to decrypt."
  }
],
  medium: [
  {
    "plain": "CIPHER",
    "key": "ANCHOR",
    "hint": "A secret way of writing",
    "keyClue": "A heavy forged iron hook holding a ship in harbor",
    "lesson": "Rectangle pairs swap columns while maintaining their row coordinates."
  },
  {
    "plain": "SALMON",
    "key": "BEACON",
    "hint": "Pink-fleshed fish that swims upstream",
    "keyClue": "A bright guiding coastal fire on the bluffs",
    "lesson": "Same-column digraphs move upward with top-to-bottom wrap-around."
  },
  {
    "plain": "PUZZLE",
    "key": "FALCON",
    "hint": "A game or problem designed to test ingenuity",
    "keyClue": "A swift raptor renowned for high-speed dives",
    "lesson": "Same-row digraphs move left with left-to-right wrap-around."
  },
  {
    "plain": "VOYAGE",
    "key": "HARBOR",
    "hint": "A long journey across the sea or space",
    "keyClue": "A sheltered coastal basin where vessels dock",
    "lesson": "Rectangle swapping forms the core of Playfair deciphering."
  },
  {
    "plain": "SHADOW",
    "key": "ISLAND",
    "hint": "A dark area where light is blocked",
    "keyClue": "A tract of land encircled by open water",
    "lesson": "Playfair was favored for tactical battlefield communications."
  },
  {
    "plain": "HARBOR",
    "key": "PIRATE",
    "hint": "A sheltered body of water where ships dock",
    "keyClue": "A privateer sailing under the skull and crossbones",
    "lesson": "Check matrix coordinates: row, col for both letters in the pair."
  },
  {
    "plain": "ANCHOR",
    "key": "SILVER",
    "hint": "A heavy iron device dropped to hold a ship",
    "keyClue": "A lustrous metallic element prized for coins",
    "lesson": "Same-column digraphs shift upward for decryption."
  },
  {
    "plain": "ISLAND",
    "key": "TIMBER",
    "hint": "A tract of land surrounded by water",
    "keyClue": "Sturdy seasoned wood used to frame ship hulls",
    "lesson": "Same-row digraphs shift to the left for decryption."
  },
  {
    "plain": "PIRATE",
    "key": "VOYAGE",
    "hint": "A sea raider who attacks ships under a black flag",
    "keyClue": "A long expedition over uncharted waters",
    "lesson": "Rectangle pairs exchange column indices cleanly."
  },
  {
    "plain": "SAILOR",
    "key": "LAGOON",
    "hint": "A person who works or travels on a ship",
    "keyClue": "A quiet saltwater basin protected by barrier reefs",
    "lesson": "I and J share a single grid position in the 5x5 matrix."
  },
  {
    "plain": "VESSEL",
    "key": "COMPASS",
    "hint": "A large ship or seagoing craft",
    "keyClue": "A magnetic needle instrument pointing true north",
    "lesson": "Repeated letters in a pair are separated with filler letter X."
  },
  {
    "plain": "MARINE",
    "key": "LANTERN",
    "hint": "Relating to or found in the sea",
    "keyClue": "A glass-cased lamp providing maritime illumination",
    "lesson": "Same-row pairs step one unit to the left."
  },
  {
    "plain": "BEACON",
    "key": "CURRENT",
    "hint": "A light or fire set up as a warning signal",
    "keyClue": "A continuous flowing stream of seawater",
    "lesson": "Same-column pairs step one unit upward."
  },
  {
    "plain": "BREEZE",
    "key": "SEAGULL",
    "hint": "A gentle, light wind",
    "keyClue": "A coastal bird that cries near harbors and shores",
    "lesson": "Rectangle rule: swap horizontal column positions."
  },
  {
    "plain": "RUDDER",
    "key": "HORIZON",
    "hint": "A flat piece used for steering a boat",
    "keyClue": "The distant dividing line between sea and sky",
    "lesson": "Playfair encryption is symmetrical; decryption reverses shifts."
  },
  {
    "plain": "GALLEY",
    "key": "DOLPHIN",
    "hint": "The kitchen area on a ship",
    "keyClue": "An agile intelligent marine mammal riding bow waves",
    "lesson": "Mastering Playfair requires rapid matrix grid scanning."
  },
  {
    "plain": "TACKLE",
    "key": "OCTOPUS",
    "hint": "Equipment and ropes used on a sailing vessel",
    "keyClue": "An eight-armed creature that squirts concealing ink",
    "lesson": "Same-row digraphs shift leftward along the matrix grid."
  },
  {
    "plain": "FATHOM",
    "key": "ANCHOR",
    "hint": "A unit of depth equal to six feet in water",
    "keyClue": "A heavy iron anchor securing a ship in harbor",
    "lesson": "Same-column digraphs shift upward along the matrix grid."
  },
  {
    "plain": "LAGOON",
    "key": "BEACON",
    "hint": "A shallow body of water separated from sea by reefs",
    "keyClue": "A coastal guiding beacon light on high bluffs",
    "lesson": "Rectangle digraph pairs swap horizontal columns."
  },
  {
    "plain": "TRENCH",
    "key": "FALCON",
    "hint": "A deep, steep-sided depression in the ocean floor",
    "keyClue": "A fast raptor diving swiftly through coastal winds",
    "lesson": "Playfair handles digraphs to resist frequency analysis."
  },
  {
    "plain": "TURTLE",
    "key": "HARBOR",
    "hint": "A sea reptile with a hard shell and flippers",
    "keyClue": "A safe haven where vessels shelter from rough seas",
    "lesson": "Same-row digraphs shift left; same-column digraphs shift up."
  },
  {
    "plain": "MARBLE",
    "key": "ISLAND",
    "hint": "A smooth patterned stone often sculpted",
    "keyClue": "An isolated landmass surrounded by ocean waves",
    "lesson": "Rectangle pairs maintain their respective row coordinates."
  },
  {
    "plain": "JUNGLE",
    "key": "PIRATE",
    "hint": "A dense tropical forest thick with wild growth",
    "keyClue": "A buccaneer hunting Spanish treasure ships",
    "lesson": "The letter J shares its matrix slot with I."
  },
  {
    "plain": "BRIDGE",
    "key": "SILVER",
    "hint": "A structure spanning across water or a chasm",
    "keyClue": "A bright metal used for minting valuable coins",
    "lesson": "Double letters in a digraph are split with an X filler."
  },
  {
    "plain": "FROZEN",
    "key": "TIMBER",
    "hint": "Turned into ice or hardened by extreme cold",
    "keyClue": "Heavy wooden logs used in ship construction",
    "lesson": "Same-row digraphs step leftward upon decryption."
  },
  {
    "plain": "SUNSET",
    "key": "VOYAGE",
    "hint": "The daily descent of the sun below the horizon",
    "keyClue": "An expedition across the vast open ocean",
    "lesson": "Same-column digraphs step upward upon decryption."
  },
  {
    "plain": "PALACE",
    "key": "LAGOON",
    "hint": "A grand residence of royalty or rulers",
    "keyClue": "A tropical basin shielded by coral barrier reefs",
    "lesson": "Rectangle pairs swap column corners across rows."
  },
  {
    "plain": "DESERT",
    "key": "COMPASS",
    "hint": "A dry, barren expanse with little water",
    "keyClue": "A navigational compass with a needle pointing north",
    "lesson": "Playfair was invented by Charles Wheatstone in 1854."
  },
  {
    "plain": "GALAXY",
    "key": "LANTERN",
    "hint": "A vast gravitational system of stars and cosmic dust",
    "keyClue": "A brass lantern lighting dark decks in twilight",
    "lesson": "Keyword letters are inserted into the grid first."
  },
  {
    "plain": "CAVERN",
    "key": "CURRENT",
    "hint": "A vast natural hollow chamber underground",
    "keyClue": "A swift ocean current carrying watercraft along",
    "lesson": "Same-row digraphs wrap around leftward at grid borders."
  },
  {
    "plain": "FALCON",
    "key": "SEAGULL",
    "hint": "A swift raptor bird renowned for high-speed dives",
    "keyClue": "A coastal seabird gliding above harbor waters",
    "lesson": "Same-column digraphs wrap around upward at grid borders."
  },
  {
    "plain": "KEEPER",
    "key": "HORIZON",
    "hint": "A guardian or caretaker watching over a post",
    "keyClue": "The boundary line where ocean meets the sky",
    "lesson": "Rectangle pairs preserve their original row heights."
  },
  {
    "plain": "MIRAGE",
    "key": "DOLPHIN",
    "hint": "An optical illusion caused by atmospheric conditions",
    "keyClue": "A playful marine mammal surfacing near boats",
    "lesson": "Playfair cipher replaces digraph pairs systematically."
  },
  {
    "plain": "SILVER",
    "key": "OCTOPUS",
    "hint": "A precious lustrous white metallic element",
    "keyClue": "A clever eight-legged invertebrate of the deep",
    "lesson": "Check same-row, same-column, and rectangle rules."
  },
  {
    "plain": "TIMBER",
    "key": "ANCHOR",
    "hint": "Wood prepared for building ships and structures",
    "keyClue": "An iron anchor dropped into the ocean seabed",
    "lesson": "Same-row digraphs shift left; same-column shift up."
  },
  {
    "plain": "ZEPHYR",
    "key": "BEACON",
    "hint": "A soft, gentle western breeze",
    "keyClue": "A coastal warning light beaming from a tower",
    "lesson": "Rectangle digraph pairs swap horizontal column positions."
  },
  {
    "plain": "CORAL",
    "key": "FALCON",
    "hint": "Hard rocky structure built by tiny sea animals",
    "keyClue": "A swift hunting falcon scanning coastal waters",
    "lesson": "Same-row letters move leftward for decryption."
  },
  {
    "plain": "COAST",
    "key": "HARBOR",
    "hint": "The land bordering along the sea",
    "keyClue": "A sheltered haven protecting moored wooden ships",
    "lesson": "Same-column letters move upward for decryption."
  },
  {
    "plain": "OCEAN",
    "key": "ISLAND",
    "hint": "A vast continuous body of salt water",
    "keyClue": "A tropical island fringed with coconut palms",
    "lesson": "Rectangle pairs swap column corners accurately."
  },
  {
    "plain": "STORM",
    "key": "PIRATE",
    "hint": "Violent weather with heavy winds and rain",
    "keyClue": "A fearless pirate navigating rough ocean waves",
    "lesson": "Playfair was widely used for tactical military communications."
  }
],
  hard: [
  {
    "plain": "MYSTERY",
    "key": "LIGHTHOUSE",
    "hint": "Something that is difficult or impossible to explain",
    "keyClue": "A coastal beacon tower warning mariners",
    "lesson": "Hard Playfair solving is pattern work: inspect matrix geometry."
  },
  {
    "plain": "LANTERN",
    "key": "CARTOGRAPHER",
    "hint": "A portable light with protective transparent casing",
    "keyClue": "A skilled maker of nautical charts and maps",
    "lesson": "Rectangle pairs swap columns while maintaining their row coordinates."
  },
  {
    "plain": "COMPASS",
    "key": "CONSTELLATION",
    "hint": "A navigation tool with a needle pointing north",
    "keyClue": "A recognizable celestial grouping of stars",
    "lesson": "A strong keyword spreads common letters across the square."
  },
  {
    "plain": "CRYSTAL",
    "key": "DECIPHERABLE",
    "hint": "A clear mineral with a regular geometric pattern",
    "keyClue": "Able to be decoded or understood by a cryptanalyst",
    "lesson": "Playfair was widely used in WWII because it could be computed by hand."
  },
  {
    "plain": "CURRENT",
    "key": "HYDROPHONE",
    "hint": "A continuous directed movement of seawater",
    "keyClue": "An instrument for detecting underwater acoustic sounds",
    "lesson": "A wider keyword matrix layout makes rectangle patterns less obvious."
  },
  {
    "plain": "SEAGULL",
    "key": "CORSAIR",
    "hint": "A coastal bird that swoops over ocean waves",
    "keyClue": "A historic privateer raiding on the open sea",
    "lesson": "Playfair is a symmetric cipher, meaning decryption reverses encryption."
  },
  {
    "plain": "HORIZON",
    "key": "BATTLESHIP",
    "hint": "The line where the earth or sea meets the sky",
    "keyClue": "A heavily armored warship built for line of battle",
    "lesson": "Same-column digraphs shift upward for decryption."
  },
  {
    "plain": "BALLAST",
    "key": "ARCHIPELAGO",
    "hint": "Heavy material placed in a ship to ensure stability",
    "keyClue": "A chain or cluster of scattered oceanic islands",
    "lesson": "Same-row digraphs shift leftward for decryption."
  },
  {
    "plain": "PELICAN",
    "key": "SUBMARINE",
    "hint": "A large water bird with a pouch under its beak",
    "keyClue": "A vessel that travels and fights beneath the surface",
    "lesson": "Rectangle digraph pairs swap columns while keeping their rows."
  },
  {
    "plain": "DOLPHIN",
    "key": "HURRICANE",
    "hint": "An intelligent marine mammal known for acrobatics",
    "keyClue": "A massive rotating tropical storm born over warm seas",
    "lesson": "I and J share a single slot in the 5x5 Playfair matrix."
  },
  {
    "plain": "OCTOPUS",
    "key": "WHIRLPOOL",
    "hint": "An eight-armed creature that squirts ink in defense",
    "keyClue": "A powerful spinning vortex of water sucking objects down",
    "lesson": "Doubled letters in a pair are split apart with an X filler."
  },
  {
    "plain": "EQUATOR",
    "key": "PENINSULA",
    "hint": "The imaginary circle around the middle of Earth",
    "keyClue": "Land almost surrounded by water but joined to mainland",
    "lesson": "Same-row digraph pairs each shift one letter left when decrypting."
  },
  {
    "plain": "CORSAIR",
    "key": "BATHYSCAPHE",
    "hint": "A fast pirate ship authorized to raid enemy vessels",
    "keyClue": "A deep-diving submersible exploring ocean trenches",
    "lesson": "Same-column digraph pairs each shift one letter up when decrypting."
  },
  {
    "plain": "GALLEON",
    "key": "OCEANOGRAPHY",
    "hint": "A large multi-decked Spanish sailing warship",
    "keyClue": "The scientific study of the sea’s waters and life",
    "lesson": "Rectangle digraph pairs swap columns while keeping their rows."
  },
  {
    "plain": "FRIGATE",
    "key": "LIGHTHOUSE",
    "hint": "A swift warship built for patrol and escort duty",
    "keyClue": "A coastal beacon tower warning mariners of shoals",
    "lesson": "Mastery means recognizing row, column, and rectangle rules quickly."
  },
  {
    "plain": "CRUISER",
    "key": "CARTOGRAPHER",
    "hint": "A fast warship designed for long-range oceanic patrols",
    "keyClue": "A skilled maker of nautical maps and sea charts",
    "lesson": "Playfair was stronger than simple substitution because it encrypts pairs."
  },
  {
    "plain": "PHANTOM",
    "key": "CONSTELLATION",
    "hint": "An apparition or ghostly shadow seen in the mist",
    "keyClue": "A recognizable celestial grouping of night stars",
    "lesson": "A strong keyword spreads common letters across the matrix."
  },
  {
    "plain": "TEMPEST",
    "key": "DECIPHERABLE",
    "hint": "A violent and turbulent storm upon the sea",
    "keyClue": "Able to be decoded or understood by cryptanalysts",
    "lesson": "Playfair was widely used in WWII because it could be computed by hand."
  },
  {
    "plain": "CAPTAIN",
    "key": "HYDROPHONE",
    "hint": "The officer in command of a ship at sea",
    "keyClue": "An instrument for detecting underwater sound signals",
    "lesson": "Remember that I and J share a single slot in the Playfair matrix."
  },
  {
    "plain": "KRAKEN",
    "key": "CORSAIR",
    "hint": "A legendary giant sea monster of terrifying size",
    "keyClue": "A historic privateer vessel of the open sea",
    "lesson": "Same-column digraphs shift upward for decryption."
  },
  {
    "plain": "SEAMARK",
    "key": "BATTLESHIP",
    "hint": "A conspicuous landmark aiding sailors at sea",
    "keyClue": "The heaviest armored warship built for battle lines",
    "lesson": "Same-row digraphs shift leftward for decryption."
  },
  {
    "plain": "TRIDENT",
    "key": "ARCHIPELAGO",
    "hint": "A three-pronged spear carried by sea deities",
    "keyClue": "A chain or cluster of scattered tropical islands",
    "lesson": "Rectangle digraph pairs swap columns while keeping their rows."
  },
  {
    "plain": "ICEBERG",
    "key": "SUBMARINE",
    "hint": "A massive piece of freshwater ice floating in open sea",
    "keyClue": "A naval vessel navigating deep beneath ocean waves",
    "lesson": "Same-column digraphs shift upward for decryption."
  },
  {
    "plain": "BARRIER",
    "key": "HURRICANE",
    "hint": "A natural offshore reef guarding the coastline",
    "keyClue": "A severe tropical storm with fierce howling winds",
    "lesson": "Same-row digraphs shift leftward for decryption."
  },
  {
    "plain": "MONSOON",
    "key": "WHIRLPOOL",
    "hint": "A seasonal prevailing wind bringing ocean torrents",
    "keyClue": "A swirling vortex dragging debris down into the depths",
    "lesson": "Double letters in a digraph are split with an X filler."
  },
  {
    "plain": "MARINER",
    "key": "PENINSULA",
    "hint": "A sailor who navigates the vast oceans",
    "keyClue": "A landform reaching far out into oceanic waters",
    "lesson": "Same-row digraph pairs each shift one letter left when decrypting."
  },
  {
    "plain": "CLIPPER",
    "key": "BATHYSCAPHE",
    "hint": "A fast sailing ship with multiple masts and large sails",
    "keyClue": "A deep-diving pressure hull exploring the sea floor",
    "lesson": "Same-column digraph pairs each shift one letter up when decrypting."
  },
  {
    "plain": "CUTTER",
    "key": "OCEANOGRAPHY",
    "hint": "A fast single-masted vessel used for patrols",
    "keyClue": "The marine science of ocean currents and topography",
    "lesson": "Rectangle pairs swap columns while maintaining their row coordinates."
  },
  {
    "plain": "BRIGADE",
    "key": "LIGHTHOUSE",
    "hint": "A squadron or organized naval force",
    "keyClue": "A warning light guiding fleets safely through rocks",
    "lesson": "Playfair encryption is symmetric and easily decoded with the matrix."
  },
  {
    "plain": "CIPHER",
    "key": "CARTOGRAPHER",
    "hint": "A secret code or cryptographic system",
    "keyClue": "A master draftsman charting coastal shoals and channels",
    "lesson": "Hard Playfair solving is pattern work: inspect matrix geometry."
  },
  {
    "plain": "FATHOM",
    "key": "CONSTELLATION",
    "hint": "A maritime unit of underwater depth",
    "keyClue": "A celestial star cluster guiding deep-sea voyagers",
    "lesson": "A strong keyword spreads common letters across the square."
  },
  {
    "plain": "RUDDER",
    "key": "DECIPHERABLE",
    "hint": "A submerged blade used for steering vessels",
    "keyClue": "Able to be decoded or understood through cipher analysis",
    "lesson": "Playfair was widely used in WWII because it could be computed by hand."
  },
  {
    "plain": "LAGOON",
    "key": "HYDROPHONE",
    "hint": "A quiet saltwater basin shielded by barrier reefs",
    "keyClue": "An acoustic sensor detecting sounds in the deep sea",
    "lesson": "Remember that I and J share a single slot in the Playfair matrix."
  },
  {
    "plain": "TRENCH",
    "key": "CORSAIR",
    "hint": "An immense abyss plunging into ocean depths",
    "keyClue": "A private raider authorized to seize enemy merchant ships",
    "lesson": "Same-column digraphs shift upward for decryption."
  },
  {
    "plain": "BEACON",
    "key": "BATTLESHIP",
    "hint": "A blazing coastal signal guiding night navigators",
    "keyClue": "A steel armored battleship carrying heavy naval guns",
    "lesson": "Same-row digraphs shift leftward for decryption."
  },
  {
    "plain": "ANCHOR",
    "key": "ARCHIPELAGO",
    "hint": "A heavy forged iron hook that moors ships",
    "keyClue": "A chain of volcanic islands rising from the seabed",
    "lesson": "Rectangle digraph pairs swap columns while keeping their rows."
  },
  {
    "plain": "ISLAND",
    "key": "SUBMARINE",
    "hint": "An isolated landmass encircled by open waters",
    "keyClue": "An undersea warship equipped with ballast tanks",
    "lesson": "Same-column digraphs shift upward for decryption."
  },
  {
    "plain": "PIRATE",
    "key": "HURRICANE",
    "hint": "A rogue corsair sailing under the Jolly Roger",
    "keyClue": "A violent oceanic storm system with hurricane-force winds",
    "lesson": "Same-row digraphs shift leftward for decryption."
  },
  {
    "plain": "SAILOR",
    "key": "WHIRLPOOL",
    "hint": "A seasoned hand working the rigging and decks",
    "keyClue": "A dangerous marine vortex spinning in coastal narrows",
    "lesson": "Doubled letters in a pair are split apart with an X filler."
  },
  {
    "plain": "VESSEL",
    "key": "PENINSULA",
    "hint": "A sturdy seagoing craft traversing treacherous waters",
    "keyClue": "A coastal peninsula jutting into oceanic currents",
    "lesson": "Playfair cipher requires recognizing matrix rules quickly."
  }
],
};

export function getPlayfairLevelData(difficulty, stageIndex) {
  const pool = playfairData[difficulty] || playfairData.easy;
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
  
  const reveal = difficulty === 'easy' ? 0.6 : difficulty === 'medium' ? 0.5 : 0;
  const minRevealed = difficulty === 'hard' ? 0 : 1;
  const mask = makeMask(plain, reveal, minRevealed);
  const words = plain.split(' ');
  const masks = [];
  let currentMaskIdx = 0;
  words.forEach(word => {
    const wordMask = mask.slice(currentMaskIdx, currentMaskIdx + word.length);
    masks.push(wordMask);
    currentMaskIdx += word.length + 1; // +1 for space
  });
  
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
