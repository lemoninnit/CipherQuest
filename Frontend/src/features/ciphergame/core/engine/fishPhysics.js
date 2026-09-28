const FACINGS = ['left', 'right'];

const DEFAULT_BOUNDS = {
  minX: 2,
  maxX: 96,
  minY: 30,
  maxY: 230,
};

// Extra % of lane width the oversized trophy sprites keep away from the walls.
const LARGE_FISH_EDGE_PAD = 6;

export const randomFacing = () => FACINGS[Math.floor(Math.random() * FACINGS.length)];

export const facingTransform = (facing) => {
  if (facing === 'right') return 'scaleX(-1)';
  return 'scaleX(1)'; // left is default orientation
};

/* ────────────────────────────────────────────────────────────────────────────
 * Fish sprite assets
 * ────────────────────────────────────────────────────────────────────────────
 * Every fish is a single static PNG — "<prefix> <species>.1.png".
 * The second swim frame (".2.png") is no longer shipped with the game, so no
 * code here cycles images anymore: the only motion comes from tickFish(), which
 * slides the entity around the pond.
 */
const FISH_FOLDER = {
  positive: 'positive fish (freshwater)',
  negative: 'negative fish (marine)',
};

// Exact filename spelling per species. "N Fish 3.1.png" is the only marine
// sprite that keeps a capital "F", so it has to be requested with that exact
// spelling on case-sensitive file systems (Cloudflare Pages / Linux).
const FISH_SPRITE_PREFIX = {
  'positive 3': 'P Fish',
  'negative 3': 'N Fish',
};

const fishSpecies = (n) => Math.min(10, Math.max(1, Math.round(Number(n)) || 1));

const fishSpritePrefix = (species, isPositive) => {
  const key = `${isPositive ? 'positive' : 'negative'} ${species}`;
  return FISH_SPRITE_PREFIX[key] || (isPositive ? 'P Fish' : 'N fish');
};

/** Absolute path of the static sprite for one fish species. */
export const getFishSpriteSrc = (isPositive, n) => {
  const species = fishSpecies(n);
  const folder = isPositive ? FISH_FOLDER.positive : FISH_FOLDER.negative;
  const prefix = fishSpritePrefix(species, isPositive);
  return encodeURI(`/assets/fish/${folder}/${prefix} ${species}.1.png`);
};

/** Sprite for a Caesar-style signed fish value (+n / -n). */
export const spriteForFishValue = (value) => {
  const numeric = Number(value);
  const magnitude = Math.min(10, Math.max(1, Math.abs(Math.round(numeric)) || 1));
  return { imgSrc: getFishSpriteSrc(numeric >= 0, magnitude) };
};

/** Sprite for games that pick a random species (Vigenère / Playfair). */
export const randomFishSprite = () => ({
  imgSrc: getFishSpriteSrc(Math.random() >= 0.5, 1 + Math.floor(Math.random() * 10)),
});

/**
 * <img onError> handler: swaps "N Fish" ⇄ "N fish" (and the "P Fish" variants)
 * once before giving up, so a spelling mismatch between this module and the
 * shipped asset can never make a fish invisible.
 */
export const onFishImgError = (event) => {
  const img = event.currentTarget;
  if (!img || img.dataset.spriteRetried === '1') return;
  img.dataset.spriteRetried = '1';

  let decoded = img.getAttribute('src') || '';
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    /* not a valid escape sequence — fall through with the raw value */
  }

  const swaps = [
    ['/N Fish ', '/N fish '],
    ['/N fish ', '/N Fish '],
    ['/P Fish ', '/P fish '],
    ['/P fish ', '/P Fish '],
  ];

  for (const [from, to] of swaps) {
    if (decoded.includes(from)) {
      img.src = encodeURI(decoded.replace(from, to));
      return;
    }
  }
};

export const makeSwimProps = () => {
  const facing = randomFacing();
  // Independent vertical drift speed — random direction, gentle magnitude
  const vy = (Math.random() > 0.5 ? 1 : -1) * (0.08 + Math.random() * 0.14);
  return {
    facing,
    direction: facing === 'left' ? -1 : 1,
    vy,
    turnIn: 80 + Math.floor(Math.random() * 180),
  };
};

export const tickFish = (fish, bounds = DEFAULT_BOUNDS) => {
  const { minX, maxX, minY, maxY } = { ...DEFAULT_BOUNDS, ...bounds };
  let { x, y, facing, speed, turnIn = 90 } = fish;
  // vy is the independent vertical drift; default if missing (backwards-compat)
  let vy = fish.vy ?? (Math.random() > 0.5 ? 0.12 : -0.12);
  const stepX = speed * 0.09;
  let hitXEdge = false;

  // Randomly switch horizontal direction after turnIn ticks
  turnIn -= 1;
  if (turnIn <= 0) {
    facing = randomFacing();
    turnIn = 80 + Math.floor(Math.random() * 180);
  }

  // Horizontal movement — facing drives direction
  if (facing === 'right') x += stepX;
  else x -= stepX;

  // Vertical drift — completely independent, facing never changes for this
  y += vy;

  // Clamp X and flip horizontal facing on wall hit
  // Trophy sprites (P Fish 9 / 10) are ~2.3x wider than the standard fish, so
  // keep them further from the side walls or half the fish would hang outside.
  const edgePad = isLargeFish(fish.imgSrc) ? LARGE_FISH_EDGE_PAD : 0;
  const rightLimit = maxX - edgePad;
  const leftLimit = minX + edgePad;

  if (x > rightLimit) {
    x = rightLimit;
    facing = 'left';
    hitXEdge = true;
  } else if (x < leftLimit) {
    x = leftLimit;
    facing = 'right';
    hitXEdge = true;
  }

  // Bounce y — flip vy, never touch facing
  if (y > maxY) { y = maxY; vy = -Math.abs(vy); }
  if (y < minY) { y = minY; vy =  Math.abs(vy); }

  // Horizontal facing drives the badge mirror, so keep it derived
  const direction = facing === 'left' ? -1 : 1;

  return {
    ...fish,
    x,
    y,
    vy,
    facing,
    direction,
    turnIn,
    hitXEdge,
  };
};

/**
 * The two biggest catches ("P Fish 9" and "P Fish 10") are long, slim fish that
 * would look tiny at the standard sprite size, so they get their own CSS class
 * (see .fg-large-fish / .pf-fish-img.fg-large-fish).
 */
export const isLargeFish = (imgSrc) => {
  if (!imgSrc) return false;
  let decoded = imgSrc;
  try {
    decoded = decodeURIComponent(imgSrc);
  } catch {
    /* keep the raw value if it is not a valid escape sequence */
  }
  return /P Fish (9|10)\./i.test(decoded);
};
