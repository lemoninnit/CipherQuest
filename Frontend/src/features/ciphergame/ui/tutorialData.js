/**
 * Comprehensive tutorial dataset for CipherQuest pause menu tutorial modal.
 * 
 * Matrix of 9 combinations:
 * Ciphers: Caesar, Vigenère, Playfair
 * Games: Fishing, Pacman, Sprint
 */

export const CIPHER_TUTORIALS = {
  caesar: {
    id: 'caesar',
    name: 'Caesar Cipher',
    subtitle: 'Monoalphabetic Fixed-Shift Substitution',
    icon: 'lock_open',
    badge: 'CIPHER DIRECTIVE // CAESAR',
    concept: 'Each letter in the message is shifted forwards by a fixed numerical key (K). Decrypting reverses the shift by counting backwards by K positions.',
    formula: 'P = (C - K + 26) mod 26',
    formulaExplanation: 'Where P is Plaintext index, C is Ciphertext index, K is Shift Key, and A=0, B=1, ... Z=25.',
    steps: [
      {
        num: 1,
        title: 'Identify the Shift Key (K)',
        desc: 'Find the shift value (e.g. +3) shown on your HUD or deduced from stage clues.',
      },
      {
        num: 2,
        title: 'Find Cipher Letter Index (C)',
        desc: 'Locate the intercepted letter in the alphabet (A=0, B=1, C=2, ... Z=25).',
      },
      {
        num: 3,
        title: 'Subtract Shift & Wrap Around',
        desc: 'Subtract K from C. If the result is negative (< 0), add 26 to wrap backwards around the alphabet.',
      },
    ],
    examples: [
      { input: 'D', key: '+3', calc: '3 - 3 = 0', output: 'A' },
      { input: 'B', key: '+3', calc: '1 - 3 + 26 = 24', output: 'Y' },
      { input: 'K', key: '+5', calc: '10 - 5 = 5', output: 'F' },
    ],
    proTips: [
      'Punctuation, spaces, and numbers bypass the cipher unmodified.',
      'To test candidate shifts, inspect the in-game Decryption Arithmetic panel.',
      'Shifting forward by 23 is mathematically identical to shifting backward by 3 (26 - 3 = 23).',
    ],
  },

  vigenere: {
    id: 'vigenere',
    name: 'Vigenère Cipher',
    subtitle: 'Polyalphabetic Multi-Key Substitution',
    icon: 'grid_view',
    badge: 'CIPHER DIRECTIVE // VIGENÈRE',
    concept: 'Uses a repeating secret keyword. Each letter of the keyword acts as an individual Caesar shift for the corresponding letter of the message.',
    formula: 'P = (C - Kval + 26) mod 26',
    formulaExplanation: 'Where Kval is the alphabetical index of the keyword letter at that position (A=0, B=1, ... Z=25).',
    steps: [
      {
        num: 1,
        title: 'Align Keyword with Ciphertext',
        desc: 'Repeat the secret keyword beneath the ciphertext so every letter has a matching key letter (e.g. CIPHER + KEY → K E Y K E Y).',
      },
      {
        num: 2,
        title: 'Locate Key Row on Tabula Recta',
        desc: 'Find the row corresponding to your key letter on the 26×26 Tabula Recta matrix.',
      },
      {
        num: 3,
        title: 'Scan for Cipher Letter & Read Header',
        desc: 'Scan across that row to find the cipher letter, then look straight up at the column header to find the plaintext letter.',
      },
    ],
    examples: [
      { input: 'R', key: 'K (10)', calc: '17 - 10 = 7', output: 'H' },
      { input: 'C', key: 'E (4)', calc: '2 - 4 + 26 = 24', output: 'Y' },
      { input: 'M', key: 'Y (24)', calc: '12 - 24 + 26 = 14', output: 'O' },
    ],
    proTips: [
      'Use the Tabula Recta tool in your game HUD to inspect full alphabet intersections.',
      'The keyword repeats cyclically across all characters in the stage.',
      'If arithmetic goes negative, always add 26 to wrap back into valid A–Z range.',
    ],
  },

  playfair: {
    id: 'playfair',
    name: 'Playfair Cipher',
    subtitle: 'Polygraphic Digraph Matrix Substitution',
    icon: 'grid_on',
    badge: 'CIPHER DIRECTIVE // PLAYFAIR',
    concept: 'Encrypts and decrypts pairs of letters (digraphs) simultaneously using a 5×5 matrix constructed from a secret keyword. Letters I and J share a single cell.',
    formula: 'Geometric Matrix Transformations (Inverse)',
    formulaExplanation: 'Decryption reverses the geometric movements on the 5×5 matrix.',
    matrixRules: [
      {
        name: 'Rectangle Rule (Corner Swap)',
        icon: 'crop_square',
        desc: 'If the two letters form opposite corners of a rectangle, replace each letter with the one in its own row and the other letter\'s column.',
      },
      {
        name: 'Same Row Rule (Shift Left)',
        icon: 'arrow_back',
        desc: 'If both letters are in the same row, shift each letter 1 step to the LEFT. Wrap around to the far right if at the leftmost column.',
      },
      {
        name: 'Same Column Rule (Shift Up)',
        icon: 'arrow_upward',
        desc: 'If both letters are in the same column, shift each letter 1 step UP. Wrap around to the bottom row if at the top row.',
      },
    ],
    steps: [
      {
        num: 1,
        title: 'Group Intercepted Message into Pairs',
        desc: 'Split ciphertext into 2-letter digraphs (e.g. BM, OD, KX).',
      },
      {
        num: 2,
        title: 'Locate Both Letters in the 5×5 Matrix',
        desc: 'Find their row and column coordinates on the key table.',
      },
      {
        num: 3,
        title: 'Apply the Matching Inverse Rule',
        desc: 'Apply Rectangle Corner Swap, Row Shift Left, or Column Shift Up to reveal the decrypted pair.',
      },
    ],
    examples: [
      { input: 'B M', key: 'Rectangle', calc: 'Swap column indices', output: 'Plain Pair' },
      { input: 'K X', key: 'Same Row', calc: 'Shift 1 tile Left (wrap)', output: 'Plain Pair' },
      { input: 'T P', key: 'Same Col', calc: 'Shift 1 tile Up (wrap)', output: 'Plain Pair' },
    ],
    proTips: [
      'Encryption shifts Right and Down; Decryption shifts Left and Up!',
      'Letters I and J share the exact same matrix position.',
      'Filler letters (like "X") inserted between duplicate pairs can be safely ignored in final words.',
    ],
  },
};

export const GAME_TUTORIALS = {
  fishing: {
    id: 'fishing',
    name: 'Deep Sea Cipher Fishing',
    subtitle: 'Hook Target Letters & Maintain Line Tension',
    icon: 'phishing',
    badge: 'MISSION PROTOCOL // FISHING',
    objective: 'Cast your line into deep cryptographic waters, catch the swimming fish carrying the target decrypted letters, and reel them in without snapping your line.',
    controls: [
      { key: 'Space / Click (Hold)', action: 'Charge casting power meter to reach further depth zones' },
      { key: 'Space / Click (Tap)', action: 'Reel in hooked fish and balance line tension gauge' },
      { key: 'Chum Bait Button', action: 'Dispense chum bait to attract target fish closer to your boat' },
    ],
    walkthrough: [
      {
        step: 1,
        title: 'Check the Active Decryption Slot',
        desc: 'Inspect the Decryption Arithmetic HUD at the bottom to see what letter or shift is required.',
      },
      {
        step: 2,
        title: 'Calculate the Target Character',
        desc: 'Use the cipher rules on the left to calculate which letter fish you must catch.',
      },
      {
        step: 3,
        title: 'Cast & Hook',
        desc: 'Time your cast power bar so your lure drops near the target fish to hook it.',
      },
      {
        step: 4,
        title: 'Reel within the Green Tension Zone',
        desc: 'Tap or hold to keep line tension inside the green sweet spot. Avoid the red zone to prevent line snap!',
      },
      {
        step: 5,
        title: 'Complete All Word Slots',
        desc: 'Land all required target fish before running out of attempts or time to secure victory.',
      },
    ],
    winCondition: 'Successfully decrypt and catch all target letters to secure the stage and earn full score stars.',
    tacticalTips: [
      'Catching incorrect decoy fish wastes attempts and decreases your efficiency rating.',
      'Release the reel button immediately if the tension enters the critical red danger zone.',
      'Use Chum bait when target fish are swimming too deep or moving erratically.',
    ],
  },

  pacman: {
    id: 'pacman',
    name: 'Labyrinth Cipher Hunt',
    subtitle: 'Evade Hazard Ghosts & Capture Target Letters',
    icon: 'sports_esports',
    badge: 'MISSION PROTOCOL // PACMAN LABYRINTH',
    objective: 'Navigate through a neon security labyrinth, evade patrolling guardian ghosts, collect energy pellets for speed and freeze buffs, and capture the correct target cipher ghosts.',
    controls: [
      { key: 'Arrow Keys / WASD', action: 'Steer agent through labyrinth corridors and intersections' },
      { key: 'Yellow Pellets', action: 'Collect to gain speed boosts and temporarily freeze patrolling ghosts' },
      { key: 'Tabula / Tool (T)', action: 'Toggle the in-game arithmetic cheat-sheet or Tabula matrix' },
    ],
    walkthrough: [
      {
        step: 1,
        title: 'Inspect Active Target Letter',
        desc: 'Look at the top HUD / active slot indicator to identify which letter position is unsolved.',
      },
      {
        step: 2,
        title: 'Calculate the Required Plain Character',
        desc: 'Use cipher decryption rules to know which letter ghost is your true target.',
      },
      {
        step: 3,
        title: 'Navigate Corridors Safely',
        desc: 'Move through open lanes while avoiding red hazard ghosts that patrol the maze.',
      },
      {
        step: 4,
        title: 'Capture the Target Letter Ghost',
        desc: 'Touch the correct target ghost to absorb its letter into your active word slot.',
      },
      {
        step: 5,
        title: 'Solve the Phrase & Extract',
        desc: 'Fill all masked letter positions to unlock the extraction portal and complete the mission.',
      },
    ],
    winCondition: 'Capture all required target letter ghosts without depleting your agent lives.',
    tacticalTips: [
      'Watch out for Decoy ghosts carrying incorrect letters; touching them will penalize your streak.',
      'Collect yellow pellets right before rushing crowded corridors to freeze enemies in place.',
      'You can pause anytime to double-check your arithmetic without losing time.',
    ],
  },

  sprint: {
    id: 'sprint',
    name: 'Cipher Sprint Relay',
    subtitle: 'High-Speed 3-Lane Track & Diamond Collection',
    icon: 'sprint',
    badge: 'MISSION PROTOCOL // SPRINT RELAY',
    objective: 'High-speed cyber runner along a 3-lane track. Dodge corrupted slime monsters and steer into the correct lanes to collect glowing diamonds that decrypt stage segments.',
    controls: [
      { key: 'W / S or Up / Down', action: 'Smoothly switch between Top, Middle, and Bottom lanes' },
      { key: 'A / D or Left / Right', action: 'Fine-tune horizontal positioning on the sprint track' },
      { key: 'Esc / Pause', action: 'Pause the sprint to review decryption keys and lane strategy' },
    ],
    walkthrough: [
      {
        step: 1,
        title: 'Read Current Segment Intel',
        desc: 'Check the floating HUD for the active segment cipher letters and required shift/letter.',
      },
      {
        step: 2,
        title: 'Identify Target Diamonds Ahead',
        desc: 'Scan the 3 lanes ahead to spot the diamond containing the correct decrypted character or key.',
      },
      {
        step: 3,
        title: 'Switch Lanes Early & Safely',
        desc: 'Switch lanes smoothly to align with the target diamond while dodging obstacle slimes.',
      },
      {
        step: 4,
        title: 'Collect Diamonds to Unlock Segment',
        desc: 'Grab the target diamond to solve the letter/shift. Avoid monsters (each collision costs 1 heart).',
      },
      {
        step: 5,
        title: 'Cross the Stage Finish Gate',
        desc: 'Complete all cipher word segments and dash through the final security gate to win.',
      },
    ],
    winCondition: 'Solve all word segments along the sprint track and reach the finish line with at least 1 heart remaining.',
    tacticalTips: [
      'You can switch lanes freely at any time—plan your lane changes several steps in advance.',
      'There is always a safe lane open to bypass monsters and collect target items.',
      'Decoy diamonds will flash red upon collection—double check the cipher arithmetic before grabbing!',
    ],
  },
};

export const COMBINATION_TIPS = {
  caesar_fishing: 'In Caesar Fishing, calculate the Shift Key (K) for your target letter, then cast your hook to catch the swimming fish carrying that shift or letter value.',
  caesar_pacman: 'In Caesar Pacman, use the shift key to determine the required plain letter, then guide your agent through the maze to hunt that specific ghost.',
  caesar_sprint: 'In Caesar Sprint, calculate the required shift or decrypted letter, then steer between the 3 lanes to grab the matching diamond while evading slime monsters.',

  vigenere_fishing: 'In Vigenère Fishing, check the keyword letter for your active slot in the HUD, calculate the plain letter via Tabula lookup, and reel in that letter fish.',
  vigenere_pacman: 'In Vigenère Pacman, align your keyword with the current unsolved position, find the target letter ghost in the labyrinth, and capture it while dodging guards.',
  vigenere_sprint: 'In Vigenère Sprint, each segment corresponds to a keyword letter. Decrypt the active character on the fly and steer into the lane with the matching diamond.',

  playfair_fishing: 'In Playfair Fishing, divide the ciphertext into digraph pairs, apply the 5×5 matrix inverse rule (Left, Up, or Corner Swap), and catch the fish carrying the decoded pair.',
  playfair_pacman: 'In Playfair Pacman, locate the target digraph pair on your 5×5 matrix, apply the reverse matrix movement, and capture the ghost bearing the decrypted pair.',
  playfair_sprint: 'In Playfair Sprint, read the incoming digraph pair, compute the inverse matrix coordinates, and swiftly change lanes to grab the target digraph diamond.',
};

/**
 * Normalizes cipher and game identifiers and returns complete tutorial data.
 */
export function getTutorialData(cipherType = 'caesar', gameType = 'fishing') {
  const normCipher = String(cipherType || 'caesar').toLowerCase().trim();
  const normGame = String(gameType || 'fishing').toLowerCase().trim();

  let resolvedCipher = 'caesar';
  if (normCipher.includes('vigenere') || normCipher.includes('vigenère')) {
    resolvedCipher = 'vigenere';
  } else if (normCipher.includes('playfair')) {
    resolvedCipher = 'playfair';
  }

  let resolvedGame = 'fishing';
  if (normGame.includes('pacman') || normGame.includes('labyrinth')) {
    resolvedGame = 'pacman';
  } else if (normGame.includes('sprint') || normGame.includes('relay')) {
    resolvedGame = 'sprint';
  }

  const cipher = CIPHER_TUTORIALS[resolvedCipher] || CIPHER_TUTORIALS.caesar;
  const game = GAME_TUTORIALS[resolvedGame] || GAME_TUTORIALS.fishing;
  const comboKey = `${resolvedCipher}_${resolvedGame}`;
  const comboTip = COMBINATION_TIPS[comboKey] || COMBINATION_TIPS.caesar_fishing;

  return {
    cipher,
    game,
    comboTip,
    cipherType: resolvedCipher,
    gameType: resolvedGame,
  };
}
