import { MAP_W, MAP_H, TILE, T } from '../config';

export interface Pt {
  x: number;
  y: number;
}

export interface RectPx {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapData {
  grid: number[][];
  playerSpawn: Pt;
  /** flag positions (px) */
  playerBaseCenter: Pt;
  enemyBaseCenter: Pt;
  /** fortress outlines (px) for the radar */
  playerFortRect: RectPx;
  enemyFortRect: RectPx;
  /** px rect — returning the flag inside this wins */
  playerBaseZone: RectPx;
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

// ---- layout constants -------------------------------------------------
// Two large fortresses stacked north (enemy) / south (player), a ring road
// around both, and a battlefield corridor between them.
const FORT_X0 = 20;
const FORT_W = 40; // tiles 20..59
const FORT_H = 26;
const ENEMY_Y0 = 6; // enemy fortress rows 6..31
const PLAYER_Y0 = 48; // player fortress rows 48..73
const MID_ROAD_Y = 39; // corridor road rows 39,40
const RING_W_X = 8; // ring road columns 8,9 and 70,71
const RING_E_X = 70;
const RING_N_Y = 2; // ring road rows 2,3 and 76,77
const RING_S_Y = 76;

const isRoadTile = (v: number): boolean => v === T.ROAD;

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

/** elliptical blob of `tile`, skipping roads (and anything non-sand for mud edges) */
function blob(
  g: number[][],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tile: number,
  onlySand = true,
  skip?: Set<string>
): void {
  for (let y = Math.max(1, Math.floor(cy - ry)); y <= Math.min(MAP_H - 2, Math.ceil(cy + ry)); y++) {
    for (let x = Math.max(1, Math.floor(cx - rx)); x <= Math.min(MAP_W - 2, Math.ceil(cx + rx)); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      if (skip?.has(`${x},${y}`)) continue;
      const cur = g[y][x];
      if (isRoadTile(cur)) continue;
      if (onlySand && cur !== T.SAND && cur !== T.SAND2 && cur !== T.MUD) continue;
      g[y][x] = tile;
    }
  }
}

/**
 * Stamp a 40x26 fortress. `flip` mirrors the layout vertically:
 * the enemy fortress (flip=false) opens south toward the corridor,
 * the player fortress (flip=true) opens north toward it.
 */
function stampFortress(g: number[][], x0: number, y0: number, flip: boolean): void {
  const H = FORT_H;
  const yy = (dy: number): number => y0 + (flip ? H - 1 - dy : dy);
  const set = (dx: number, dy: number, v: number): void => {
    g[yy(dy)][x0 + dx] = v;
  };
  const fill = (dx0: number, dy0: number, dx1: number, dy1: number, v: number): void => {
    for (let dy = dy0; dy <= dy1; dy++) {
      for (let dx = dx0; dx <= dx1; dx++) set(dx, dy, v);
    }
  };

  // concrete parade ground
  fill(1, 1, FORT_W - 2, H - 2, T.CONCRETE);
  // outer wall
  for (let dx = 0; dx < FORT_W; dx++) {
    set(dx, 0, T.WALL);
    set(dx, H - 1, T.WALL);
  }
  for (let dy = 0; dy < H; dy++) {
    set(0, dy, T.WALL);
    set(FORT_W - 1, dy, T.WALL);
  }
  // gates: two on the corridor side (dy = H-1), one on the ring side (dy = 0)
  for (const dx of [12, 13, 26, 27]) set(dx, H - 1, T.ROAD);
  for (const dx of [19, 20]) set(dx, 0, T.ROAD);

  // inner keep housing the flag
  for (let dx = 14; dx <= 25; dx++) {
    set(dx, 9, T.WALL);
    set(dx, 17, T.WALL);
  }
  for (let dy = 9; dy <= 17; dy++) {
    set(14, dy, T.WALL);
    set(25, dy, T.WALL);
  }
  for (const dx of [19, 20]) set(dx, 17, T.CONCRETE); // keep gate faces the corridor

  // barracks / storage bunkers with doors
  const bunker = (dx0: number, dy0: number, dx1: number, dy1: number, doorDx: number): void => {
    fill(dx0, dy0, dx1, dy1, T.BUNKER);
    set(doorDx, dy1, T.BUNKER_DOOR);
  };
  bunker(3, 3, 7, 5, 5);
  bunker(32, 3, 36, 5, 34);
  bunker(4, 19, 7, 21, 5);
  bunker(31, 19, 35, 21, 33);

  // chicane walls funnelling the corridor gates
  for (let dy = 18; dy <= 24; dy++) {
    set(10, dy, T.WALL);
    set(29, dy, T.WALL);
  }
  // courtyard dividers
  for (let dx = 3; dx <= 10; dx++) set(dx, 8, T.WALL);
  for (let dx = 29; dx <= 36; dx++) set(dx, 8, T.WALL);
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

  // --- road network: ring around both fortresses + corridor between them ---
  hRoad(g, RING_N_Y, RING_W_X, RING_E_X + 1);
  hRoad(g, RING_S_Y, RING_W_X, RING_E_X + 1);
  vRoad(g, RING_W_X, RING_N_Y, RING_S_Y + 1);
  vRoad(g, RING_E_X, RING_N_Y, RING_S_Y + 1);
  hRoad(g, MID_ROAD_Y, RING_W_X + 2, RING_E_X - 1); // the corridor
  // fortress gate connectors
  vRoad(g, 32, 32, 38); // enemy south gates -> corridor
  vRoad(g, 46, 32, 38);
  vRoad(g, 32, 41, 47); // corridor -> player north gates
  vRoad(g, 46, 41, 47);
  vRoad(g, 39, 4, 5); // enemy north gate -> ring
  vRoad(g, 39, 74, 75); // player south gate -> ring

  // --- object home positions (tile coords), reserved so terrain never buries them ---
  const spawnT: [number, number] = [FORT_X0 + 17, PLAYER_Y0 + FORT_H - 1 - 13];
  const fuelT: [number, number][] = [
    [FORT_X0 + 8, PLAYER_Y0 + FORT_H - 1 - 22],
    [FORT_X0 + 8, ENEMY_Y0 + 22],
    [20, 37],
    [60, 42]
  ];
  const repairT: [number, number][] = [
    [FORT_X0 + 32, PLAYER_Y0 + FORT_H - 1 - 22],
    [FORT_X0 + 32, ENEMY_Y0 + 22]
  ];
  const ammoT: [number, number][] = [
    [FORT_X0 + 19, PLAYER_Y0 + FORT_H - 1 - 3],
    [FORT_X0 + 19, ENEMY_Y0 + 3],
    [15, 41],
    [64, 37]
  ];
  const etankT: [number, number][] = [[32, 34], [47, 34]];
  const infT: [number, number][] = [
    [FORT_X0 + 4, ENEMY_Y0 + 11],
    [FORT_X0 + 35, ENEMY_Y0 + 11],
    [FORT_X0 + 25, ENEMY_Y0 + 22],
    [FORT_X0 + 12, ENEMY_Y0 + 22],
    [FORT_X0 + 20, ENEMY_Y0 + 20],
    [36, 34],
    [44, 42],
    [60, 39]
  ];
  const reserved = new Set<string>();
  for (const [tx, ty] of [spawnT, ...fuelT, ...repairT, ...ammoT, ...etankT, ...infT]) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) reserved.add(`${tx + dx},${ty + dy}`);
    }
  }

  // --- water, mud (before fortresses; blobs skip roads; water spares reserved tiles) ---
  blob(g, 15, 35, 3.6, 3.0, T.WATER, true, reserved);
  blob(g, 15, 35, 5.2, 4.4, T.MUD); // shoreline mud (fills around the water)
  blob(g, 64, 44, 3.4, 2.6, T.WATER, true, reserved);
  blob(g, 64, 44, 5.0, 4.0, T.MUD);
  blob(g, 25, 44, 3.2, 2.0, T.MUD); // bog patches in the corridor
  blob(g, 54, 34, 3.2, 2.0, T.MUD);
  blob(g, 5, 55, 2.6, 3.2, T.MUD); // western flank marsh
  blob(g, 75, 24, 2.4, 3.0, T.MUD);
  // re-carve water that the mud pass may have missed at the centres
  blob(g, 15, 35, 3.6, 3.0, T.WATER, false, reserved);
  blob(g, 64, 44, 3.4, 2.6, T.WATER, false, reserved);

  // --- fortresses ---
  stampFortress(g, FORT_X0, ENEMY_Y0, false);
  stampFortress(g, FORT_X0, PLAYER_Y0, true);

  // --- natural scatter: trees, rocks, hedgehogs, craters ---
  const clear = (x: number, y: number): boolean => {
    if (x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2) return false;
    if (reserved.has(`${x},${y}`)) return false;
    // stay out of both fortresses (+1 margin)
    if (x >= FORT_X0 - 1 && x <= FORT_X0 + FORT_W && y >= ENEMY_Y0 - 1 && y <= ENEMY_Y0 + FORT_H) return false;
    if (x >= FORT_X0 - 1 && x <= FORT_X0 + FORT_W && y >= PLAYER_Y0 - 1 && y <= PLAYER_Y0 + FORT_H) return false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const t = g[y + dy][x + dx];
        if (t !== T.SAND && t !== T.SAND2) return false;
      }
    }
    return true;
  };
  // tree clusters
  for (let i = 0; i < 60; i++) {
    const x = 2 + Math.floor(rnd() * (MAP_W - 4));
    const y = 2 + Math.floor(rnd() * (MAP_H - 4));
    if (!clear(x, y)) continue;
    g[y][x] = T.TREE;
    if (rnd() < 0.6 && clear(x + 1, y)) g[y][x + 1] = T.TREE;
    if (rnd() < 0.4 && clear(x, y + 1)) g[y + 1][x] = T.TREE;
  }
  // rock outcrops
  const rockCluster = (cx: number, cy: number): void => {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]] as const) {
      if (rnd() < ((dx === 0 && dy === 0) ? 1 : 0.55) && clear(cx + dx, cy + dy)) {
        g[cy + dy][cx + dx] = T.ROCK;
      }
    }
  };
  for (const [cx, cy] of [[13, 60], [67, 18], [22, 35], [57, 44], [4, 40], [75, 40], [40, 36], [40, 44]] as const) {
    rockCluster(cx, cy);
  }
  for (let i = 0; i < 8; i++) {
    rockCluster(2 + Math.floor(rnd() * (MAP_W - 4)), 2 + Math.floor(rnd() * (MAP_H - 4)));
  }
  // hedgehog lines guarding the corridor approaches
  for (const x of [36, 38, 41, 43]) {
    if (clear(x, 36)) g[36][x] = T.HEDGEHOG;
    if (clear(x, 43)) g[43][x] = T.HEDGEHOG;
  }
  for (let i = 0; i < 14; i++) {
    const x = 2 + Math.floor(rnd() * (MAP_W - 4));
    const y = 2 + Math.floor(rnd() * (MAP_H - 4));
    if (clear(x, y)) g[y][x] = T.HEDGEHOG;
  }
  // old craters
  for (let i = 0; i < 14; i++) {
    const x = 2 + Math.floor(rnd() * (MAP_W - 4));
    const y = 2 + Math.floor(rnd() * (MAP_H - 4));
    if (clear(x, y)) g[y][x] = T.CRATER;
  }

  // ---- reachability: flood-fill drivable tiles from the player spawn ----
  const passable = (v: number): boolean =>
    v !== T.WALL && v !== T.WALL_DMG && v !== T.BUNKER && v !== T.BUNKER_DOOR &&
    v !== T.HEDGEHOG && v !== T.WATER && v !== T.ROCK;
  const reach = new Set<string>();
  {
    const q: [number, number][] = [spawnT];
    reach.add(`${spawnT[0]},${spawnT[1]}`);
    while (q.length) {
      const [cx, cy] = q.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 1 || ny < 1 || nx >= MAP_W - 1 || ny >= MAP_H - 1) continue;
        const key = `${nx},${ny}`;
        if (reach.has(key) || !passable(g[ny][nx])) continue;
        reach.add(key);
        q.push([nx, ny]);
      }
    }
  }
  /** move a point to the nearest tank-reachable tile if it isn't on one */
  const snap = ([tx, ty]: [number, number]): [number, number] => {
    if (reach.has(`${tx},${ty}`)) return [tx, ty];
    for (let r = 1; r < 12; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (reach.has(`${tx + dx},${ty + dy}`)) return [tx + dx, ty + dy];
        }
      }
    }
    return [tx, ty]; // design guarantees a hit well before r=12
  };
  const snapP = (pts: [number, number][]): Pt[] => pts.map(snap).map(([x, y]) => P(x, y));
  if (!reach.has(`${FORT_X0 + 20},${ENEMY_Y0 + 13}`) || !reach.has(`${FORT_X0 + 20},${PLAYER_Y0 + FORT_H - 1 - 13}`)) {
    console.warn('MapBuilder: a flag is not reachable from the player spawn');
  }

  // ---- object placement (tile coords -> px) -----------------------------
  const enemyFlag = P(FORT_X0 + 20, ENEMY_Y0 + 13); // keep centre
  const playerFlag = P(FORT_X0 + 20, PLAYER_Y0 + FORT_H - 1 - 13);
  const zone = TILE * 4;

  return {
    grid: g,
    playerSpawn: P(spawnT[0], spawnT[1]),
    playerBaseCenter: playerFlag,
    enemyBaseCenter: enemyFlag,
    playerFortRect: {
      x: FORT_X0 * TILE, y: PLAYER_Y0 * TILE, w: FORT_W * TILE, h: FORT_H * TILE
    },
    enemyFortRect: {
      x: FORT_X0 * TILE, y: ENEMY_Y0 * TILE, w: FORT_W * TILE, h: FORT_H * TILE
    },
    playerBaseZone: {
      x: playerFlag.x - zone / 2,
      y: playerFlag.y - zone / 2,
      w: zone,
      h: zone
    },
    enemyTurrets: [
      // emplacements built into the outer wall: the four corners...
      P(FORT_X0, ENEMY_Y0),
      P(FORT_X0 + FORT_W - 1, ENEMY_Y0),
      P(FORT_X0, ENEMY_Y0 + FORT_H - 1),
      P(FORT_X0 + FORT_W - 1, ENEMY_Y0 + FORT_H - 1),
      // ...and along the corridor-facing wall between the gates
      P(FORT_X0 + 6, ENEMY_Y0 + FORT_H - 1),
      P(FORT_X0 + 19, ENEMY_Y0 + FORT_H - 1),
      P(FORT_X0 + 33, ENEMY_Y0 + FORT_H - 1),
      // keep wall corners guarding the flag
      P(FORT_X0 + 14, ENEMY_Y0 + 17),
      P(FORT_X0 + 25, ENEMY_Y0 + 17)
    ],
    fuelDumps: snapP(fuelT),
    repairPads: snapP(repairT),
    ammoCrates: snapP(ammoT),
    enemyTankSpawns: snapP(etankT),
    infantrySpawns: snapP(infT),
    patrolPoints: [
      // a loop: west along the corridor, up the ring, across the top,
      // down the east side, back along the corridor, around the south
      P(25, 39),
      P(9, 39),
      P(9, 20),
      P(9, 3),
      P(40, 2),
      P(70, 3),
      P(70, 20),
      P(70, 39),
      P(55, 39),
      P(40, 39),
      P(70, 60),
      P(70, 77),
      P(40, 77),
      P(9, 77),
      P(9, 60)
    ]
  };
}
