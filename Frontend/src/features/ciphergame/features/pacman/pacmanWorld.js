export const CELL = 46;

export const ASSETS = {
  knight: '/assets/pacman/Knight/Warrior_Blue.png',
  goblin: '/assets/pacman/Enemy Goblins/Torch_Red.png',
  terrainFlat: '/assets/pacman/Terrain/Ground/Tilemap_Flat.png',
  terrainElev: '/assets/pacman/Terrain/Ground/Tilemap_Elevation.png',
  terrainShadow: '/assets/pacman/Terrain/Ground/Shadows.png',
  water: '/assets/pacman/Terrain/Water/Water.png',
  foam: '/assets/pacman/Terrain/Water/Foam/Foam.png',
  rock1: '/assets/pacman/Terrain/Water/Rocks/Rocks_01.png',
  rock2: '/assets/pacman/Terrain/Water/Rocks/Rocks_02.png',
  rock3: '/assets/pacman/Terrain/Water/Rocks/Rocks_03.png',
  rock4: '/assets/pacman/Terrain/Water/Rocks/Rocks_04.png',
  tree: '/assets/pacman/Resources/Trees/Tree.png',
  goldIdle: '/assets/pacman/Resources/Resources/G_Idle.png',
  goldSpawn: '/assets/pacman/Resources/Resources/G_Spawn.png',
  woodIdle: '/assets/pacman/Resources/Resources/W_Idle.png',
  meatIdle: '/assets/pacman/Resources/Resources/M_Idle.png',
  sheep: '/assets/pacman/Resources/Sheep/HappySheep_Idle.png',
  goldMine: '/assets/pacman/Resources/Gold Mine/GoldMine_Active.png',
  castle: '/assets/pacman/Buildings/Castle/Castle_Blue.png',
  house: '/assets/pacman/Buildings/House/House_Red.png',
  houseBlue: '/assets/pacman/Buildings/House/House_Blue.png',
  tower: '/assets/pacman/Buildings/Tower/Tower_Blue.png',
  towerRed: '/assets/pacman/Buildings/Tower/Tower_Red.png',
  banner: '/assets/pacman/UI/Banners/Banner_Horizontal.png',
  buttonBlue: '/assets/pacman/UI/Buttons/Button_Blue_9Slides.png',
  buttonRed: '/assets/pacman/UI/Buttons/Button_Red_9Slides.png'
};

const isWall = (grid, r, c) => !!(grid[r] && grid[r][c] === 1);

export function hedgeClass(grid, r, c) {
  const n = isWall(grid, r - 1, c);
  const s = isWall(grid, r + 1, c);
  const w = isWall(grid, r, c - 1);
  const e = isWall(grid, r, c + 1);
  const border =
    r === 0 || c === 0 || r === grid.length - 1 || c === grid[0].length - 1;

  let edge = 'fill';
  if (!n && s && !w && e) edge = 'tl';
  else if (!n && s && w && !e) edge = 'tr';
  else if (n && !s && !w && e) edge = 'bl';
  else if (n && !s && w && !e) edge = 'br';
  else if (!n && s) edge = 'top';
  else if (n && !s) edge = 'bottom';
  else if (!w && e) edge = 'left';
  else if (w && !e) edge = 'right';
  else if (!n && !s && !w && !e) edge = 'alone';

  return `${border ? 'stone' : 'hedge'} hedge-${edge}`;
}

export function pathVariant(r, c) {
  return (r * 7 + c * 3) % 3;
}

export function facingFromDir(dirName, vec) {
  if (dirName && dirName !== 'NONE') return dirName;
  if (!vec) return 'RIGHT';
  if (vec.r < 0) return 'UP';
  if (vec.r > 0) return 'DOWN';
  if (vec.c < 0) return 'LEFT';
  return 'RIGHT';
}

export const MAZE_DECOR = [
  { type: 'castle', row: 0, col: 9, w: 3, h: 2 },
  { type: 'tower', row: 0, col: 0, w: 1, h: 2, variant: 'blue' },
  { type: 'tower', row: 0, col: 20, w: 1, h: 2, variant: 'red' },
  { type: 'house', row: 4, col: 1, w: 2, h: 2, variant: 'red' },
  { type: 'house', row: 6, col: 8, w: 2, h: 2, variant: 'blue' },
  { type: 'mine', row: 8, col: 15, w: 2, h: 1 },
  { type: 'tree', row: 2, col: 7, frame: 0 },
  { type: 'tree', row: 2, col: 11, frame: 1 },
  { type: 'tree', row: 4, col: 16, frame: 2 },
  { type: 'tree', row: 6, col: 4, frame: 0 },
  { type: 'tree', row: 8, col: 2, frame: 3 },
  { type: 'tree', row: 8, col: 19, frame: 1 },
  { type: 'sheep', row: 4, col: 8, delay: '0s' },
  { type: 'sheep', row: 6, col: 16, delay: '0.35s' },
  { type: 'wood', row: 2, col: 2 },
  { type: 'meat', row: 4, col: 10 },
  { type: 'wood', row: 6, col: 18 }
];

export const WATER_ROCKS = [
  { src: 'rock1', x: 8, y: 6, frame: 0 },
  { src: 'rock2', x: 940, y: 10, frame: 1 },
  { src: 'rock3', x: 24, y: 430, frame: 0 },
  { src: 'rock4', x: 900, y: 424, frame: 2 },
  { src: 'rock1', x: 480, y: 2, frame: 3 },
  { src: 'rock2', x: 470, y: 448, frame: 0 }
];
