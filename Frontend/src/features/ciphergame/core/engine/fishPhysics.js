const FACINGS = ['left', 'right'];
const P_FISH_FRAME2 = new Set([9, 10]);

const DEFAULT_BOUNDS = {
  minX: 2,
  maxX: 96,
  minY: 30,
  maxY: 230,
};

export const randomFacing = () => FACINGS[Math.floor(Math.random() * FACINGS.length)];

export const facingTransform = (facing) => {
  if (facing === 'right') return 'scaleX(-1)';
  return 'scaleX(1)'; // left is default orientation
};

const fishSrc = (folder, prefix, n, frame) =>
  encodeURI(`/assets/fish/${folder}/${prefix} ${n}.${frame}.png`);

export const getFishFrames = (isPositive, n) => {
  const species = Math.min(10, Math.max(1, Math.round(Number(n)) || 1));
  const folder = isPositive ? 'positive fish (freshwater)' : 'negative fish (marine)';
  const prefix = isPositive ? 'P Fish' : 'N fish';
  const frame1 = fishSrc(folder, prefix, species, 1);
  const hasFrame2 = !isPositive || P_FISH_FRAME2.has(species);
  const frame2 = hasFrame2 ? fishSrc(folder, prefix, species, 2) : frame1;
  return [frame1, frame2];
};

export const getFishFramesForValue = (value) => {
  const numeric = Number(value);
  const magnitude = Math.min(10, Math.max(1, Math.abs(Math.round(numeric)) || 1));
  return getFishFrames(numeric >= 0, magnitude);
};

export const visualsForValue = (value) => {
  const frames = getFishFramesForValue(value);
  return { frames, imgSrc: frames[0] };
};

export const randomVisualFrames = () => {
  const frames = getFishFrames(Math.random() >= 0.5, 1 + Math.floor(Math.random() * 10));
  return { frames, imgSrc: frames[0] };
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
    animClock: Math.floor(Math.random() * 24),
  };
};

export const tickFish = (fish, bounds = DEFAULT_BOUNDS) => {
  const { minX, maxX, minY, maxY } = { ...DEFAULT_BOUNDS, ...bounds };
  let { x, y, facing, speed, turnIn = 90, animClock = 0, direction } = fish;
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
  if (x > maxX) {
    x = maxX;
    facing = 'left';
    hitXEdge = true;
  } else if (x < minX) {
    x = minX;
    facing = 'right';
    hitXEdge = true;
  }

  // Bounce y — flip vy, never touch facing
  if (y > maxY) { y = maxY; vy = -Math.abs(vy); }
  if (y < minY) { y = minY; vy =  Math.abs(vy); }

  direction = facing === 'left' ? -1 : 1;

  animClock += 1;
  const frames = fish.frames?.length ? fish.frames : [fish.imgSrc, fish.imgSrc];
  const imgSrc = frames[Math.floor(animClock / 12) % frames.length];

  return {
    ...fish,
    x,
    y,
    vy,
    facing,
    direction,
    turnIn,
    animClock,
    imgSrc,
    hitXEdge,
  };
};
