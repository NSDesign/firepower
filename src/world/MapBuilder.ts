import { MAP_W, MAP_H, TILE, T } from '../config';

export interface Pt {
  x: number;
  y: number;
}

export interface MapData {
  grid: number[][];
  playerSpawn: Pt;
  playerBaseCenter: Pt;
  enemyBaseCenter: Pt;
  /** px rect — returning the flag inside this wins */
  playerBaseZone: { x: number; y: number; w: number; h: number };
  enemyTurrets: Pt[];
  fuelDumps: Pt[];
  repairPads: Pt[];
  ammoCrates: Pt[];
  enemyTankSpawns: Pt[];
  infantrySpawns: Pt[];
  patrolPoints: Pt[];
}

const t2p = (t: number): number => t * TILE + TILE / 2;
const P = (tx: number, ty: number): Pt => ({ x: t2p(tx), y: t2p(ty) });

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const PBX = 16; // player base center tile
const PBY = 63;
const EBX = 63; // enemy base center tile
const EBY = 16;
const R = 7; // base wall ring radius

function hRoad(g: number[][], y: number, x0: number, x1: number): void {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    g[y][x] = T.ROAD;
    g[y + 1][x] = T.ROAD;
  }
}

function vRoad(g: number[][], x: number, y0: number, y1: number): void {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    g[y][x] = T.ROAD;
    g[y][x + 1] = T.ROAD;
  }
}

/** gates: which sides get a 2-tile gap ('n','s','e','w') */
function stampBase(g: number[][], cx: number, cy: number, gates: string): void {
  // concrete floor
  for (let y = cy - R + 1; y <= cy + R - 1; y++) {
    for (let x = cx - R + 1; x <= cx + R - 1; x++) {
      g[y][x] = T.CONCRETE;
    }
  }
  // perimeter wall
  for (let i = -R; i <= R; i++) {
    g[cy - R][cx + i] = T.WALL;
    g[cy + R][cx + i] = T.WALL;
    g[cy + i][cx - R] = T.WALL;
    g[cy + i][cx + R] = T.WALL;
  }
  // gates (2 tiles wide at the middle of a side)
  if (gates.includes('n')) {
    g[cy - R][cx - 1] = T.ROAD;
    g[cy - R][cx] = T.ROAD;
  }
  if (gates.includes('s')) {
    g[cy + R][cx - 1] = T.ROAD;
    g[cy + R][cx] = T.ROAD;
  }
  if (gates.includes('w')) {
    g[cy - 1][cx - R] = T.ROAD;
    g[cy][cx - R] = T.ROAD;
  }
  if (gates.includes('e')) {
    g[cy - 1][cx + R] = T.ROAD;
    g[cy][cx + R] = T.ROAD;
  }
  // two storage bunkers (3x2) with doors, top corners of the floor
  for (const sx of [cx - 5, cx + 3]) {
    for (let y = cy - 5; y <= cy - 4; y++) {
      for (let x = sx; x <= sx + 2; x++) g[y][x] = T.BUNKER;
    }
    g[cy - 4][sx + 1] = T.BUNKER_DOOR;
  }
}

export function buildMap(): MapData {
  const rnd = lcg(20260711);
  const g: number[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_W; x++) {
      row.push(rnd() < 0.18 ? T.SAND2 : T.SAND);
    }
    g.push(row);
  }

  // --- roads (before bases; gates re-carved by stampBase) ---
  // southern route: player east gate -> two bends -> enemy south gate
  hRoad(g, 62, 24, 45);
  vRoad(g, 44, 44, 63);
  hRoad(g, 44, 44, 63);
  vRoad(g, 62, 24, 45);
  // western route: player north gate -> north -> east -> enemy west gate
  vRoad(g, 15, 16, 55);
  hRoad(g, 15, 15, 55);

  // --- bases ---
  stampBase(g, PBX, PBY, 'ne'); // player: gates north + east
  stampBase(g, EBX, EBY, 'sw'); // enemy: gates south + west

  // --- scatter decoration, avoiding roads/bases ---
  const clear = (x: number, y: number): boolean => {
    if (x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2) return false;
    if (Math.abs(x - PBX) <= R + 2 && Math.abs(y - PBY) <= R + 2) return false;
    if (Math.abs(x - EBX) <= R + 2 && Math.abs(y - EBY) <= R + 2) return false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const t = g[y + dy][x + dx];
        if (t !== T.SAND && t !== T.SAND2) return false;
      }
    }
    return true;
  };
  // bush clusters
  for (let i = 0; i < 46; i++) {
    const x = 2 + Math.floor(rnd() * (MAP_W - 4));
    const y = 2 + Math.floor(rnd() * (MAP_H - 4));
    if (!clear(x, y)) continue;
    g[y][x] = T.TREE;
    if (rnd() < 0.6 && clear(x + 1, y)) g[y][x + 1] = T.TREE;
    if (rnd() < 0.4 && clear(x, y + 1)) g[y + 1][x] = T.TREE;
  }
  // (simple second pass for vertical growth)
  for (let i = 0; i < 18; i++) {
    const x = 2 + Math.floor(rnd() * (MAP_W - 4));
    const y = 2 + Math.floor(rnd() * (MAP_H - 4));
    if (clear(x, y) && clear(x, y + 1)) {
      g[y][x] = T.TREE;
      g[y + 1][x] = T.TREE;
    }
  }
  // hedgehog defense lines across the middle
  for (let i = 0; i < 9; i++) {
    const x = 26 + i * 2;
    const y = 38 - i;
    if (clear(x, y)) g[y][x] = T.HEDGEHOG;
  }
  for (let i = 0; i < 22; i++) {
    const x = 2 + Math.floor(rnd() * (MAP_W - 4));
    const y = 2 + Math.floor(rnd() * (MAP_H - 4));
    if (clear(x, y)) g[y][x] = T.HEDGEHOG;
  }
  // old craters
  for (let i = 0; i < 16; i++) {
    const x = 2 + Math.floor(rnd() * (MAP_W - 4));
    const y = 2 + Math.floor(rnd() * (MAP_H - 4));
    if (clear(x, y)) g[y][x] = T.CRATER;
  }

  const zone = TILE * 4;
  return {
    grid: g,
    playerSpawn: P(PBX - 3, PBY + 2),
    playerBaseCenter: P(PBX, PBY),
    enemyBaseCenter: P(EBX, EBY),
    playerBaseZone: {
      x: t2p(PBX) - zone / 2,
      y: t2p(PBY) - zone / 2,
      w: zone,
      h: zone
    },
    enemyTurrets: [
      P(EBX - 6, EBY - 6),
      P(EBX + 6, EBY - 6),
      P(EBX - 6, EBY + 6),
      P(EBX + 6, EBY + 6),
      // forward emplacements guarding the road bends
      P(47, 43),
      P(60, 47),
      P(17, 30)
    ],
    fuelDumps: [P(PBX - 4, PBY + 4), P(EBX - 4, EBY + 4), P(40, 41)],
    repairPads: [P(PBX + 4, PBY + 4), P(EBX + 4, EBY + 4)],
    ammoCrates: [P(PBX + 4, PBY - 1), P(43, 47), P(18, 17)],
    enemyTankSpawns: [P(EBX, EBY + 9), P(EBX - 9, EBY)],
    infantrySpawns: [
      P(EBX - 8, EBY - 8),
      P(EBX + 8, EBY - 4),
      P(EBX + 4, EBY + 8),
      P(EBX - 8, EBY + 5),
      P(EBX - 2, EBY - 2),
      P(EBX + 2, EBY + 2),
      P(48, 40),
      P(58, 50)
    ],
    patrolPoints: [
      P(30, 62),
      P(44, 54),
      P(44, 44),
      P(56, 44),
      P(62, 34),
      P(62, 26),
      P(50, 16),
      P(30, 16),
      P(15, 26),
      P(15, 50)
    ]
  };
}
