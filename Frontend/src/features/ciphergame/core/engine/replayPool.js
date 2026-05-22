export const GAME_TYPES = ["FISHING", "PACMAN", "SPRINT"];
export const CIPHER_TYPES = ["CAESAR", "VIGENERE", "PLAYFAIR"];

const WORD_POOL = [
  "SHARK",
  "OCEAN",
  "PUZZLE",
  "HIDDEN",
  "SECRET",
  "CRYPTO",
  "FISHING",
  "JAVASCRIPT"
];

export function generateStageConfig(difficulty, stageIndex) {
  const randomCipher =
    CIPHER_TYPES[Math.floor(Math.random() * CIPHER_TYPES.length)];

  const randomGame =
    GAME_TYPES[Math.floor(Math.random() * GAME_TYPES.length)];

  const word =
    WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)];

  return {
    id: `${difficulty}-${stageIndex}`,
    difficulty,
    stageIndex,
    gameType: randomGame,
    cipherType: randomCipher,
    word,
    completed: false
  };
}