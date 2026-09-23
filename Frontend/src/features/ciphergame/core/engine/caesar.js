export function caesarEncrypt(text, shift = 3) {
  return text
    .toUpperCase()
    .split("")
    .map(char => {
      const code = char.charCodeAt(0);
      if (code < 65 || code > 90) return char;
      return String.fromCharCode(((code - 65 + shift) % 26) + 65);
    })
    .join("");
}

/* ────────────────────────────────────────────────────────────
   Caesar shift helpers shared by Caesar Pac-Man & Caesar Sprint.
   Convention: "shift" = ENCRYPTION shift (plain + shift = cipher),
   matching levelData.targetShifts and the Fishing game.
   ──────────────────────────────────────────────────────────── */

/** Normalize any integer into 0..25. */
export function norm26(n) {
  return ((n % 26) + 26) % 26;
}

/** Normalize a shift into the 1..25 range (0 wraps to 26 → 0 stays a no-op). */
export function normalizeShift(n) {
  const v = norm26(n);
  return v === 0 ? 0 : v;
}

/** Decrypt a single A-Z char with an encryption shift (cipher - shift = plain). */
export function caesarDecryptChar(char, shift) {
  return caesarShiftRaw(char, -shift);
}

function caesarShiftRaw(char, shift) {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(norm26(code - 65 + shift) + 65);
  }
  return char;
}

/**
 * Build a candidate set of shift values for a round.
 * The correct shift is always included. Decoys are "near-miss" shifts
 * (±1 / ±2 of the true shift) on medium/hard, plus randoms on easy.
 *
 * @param {number} trueShift  encryption shift (1..25)
 * @param {'easy'|'medium'|'hard'} tier
 * @param {number} count      total candidates to return (including correct)
 * @returns {Array<{shiftValue: number, isCorrect: boolean}>} shuffled
 */
export function buildShiftCandidates(trueShift, tier = 'easy', count = 3) {
  const t = normalizeShift(trueShift) || 1;
  const nearMissOnly = tier === 'medium' || tier === 'hard';
  const decoyCount = Math.max(0, count - 1);

  const decoys = new Set();
  // Near-miss decoys first (classic off-by-one errors)
  const offsets = nearMissOnly
    ? [1, -1, 2, -2]
    : [1, -1, 2, -2, 3, -3, 5, -5];
  for (const off of offsets) {
    if (decoys.size >= decoyCount) break;
    const v = normalizeShift(t + off);
    if (v !== 0 && v !== t) decoys.add(v);
  }
  // Random decoys on easy to fill remaining slots
  if (!nearMissOnly) {
    let guard = 0;
    while (decoys.size < decoyCount && guard < 100) {
      const v = 1 + Math.floor(Math.random() * 25);
      if (v !== t) decoys.add(v);
      guard++;
    }
  }

  const list = [
    { shiftValue: t, isCorrect: true },
    ...[...decoys].slice(0, decoyCount).map(v => ({ shiftValue: v, isCorrect: false })),
  ];
  // Shuffle
  return list.sort(() => Math.random() - 0.5);
}

/** How many shift candidates each tier presents. */
export const SHIFT_CANDIDATE_COUNT = { easy: 3, medium: 3, hard: 4 };