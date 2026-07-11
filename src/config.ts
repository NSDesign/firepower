// Internal render resolution (integer-scaled to fit the window)
export const GAME_W = 512;
export const GAME_H = 288;
// Right-hand HUD panel width; the battlefield camera gets the rest
export const PANEL_W = 120;
export const VIEW_W = GAME_W - PANEL_W;

export const TILE = 32;
export const MAP_W = 80;
export const MAP_H = 80;
export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

export const enum T {
  SAND = 0,
  SAND2 = 1,
  ROAD = 2,
  CONCRETE = 3,
  WALL = 4,
  WALL_DMG = 5,
  RUBBLE = 6,
  BUNKER = 7,
  BUNKER_DOOR = 8,
  TREE = 9,
  HEDGEHOG = 10,
  CRATER = 11
}

export const SOLID_TILES: number[] = [T.WALL, T.WALL_DMG, T.BUNKER, T.BUNKER_DOOR, T.HEDGEHOG];

export type Team = 'player' | 'enemy';

export const DEPTH = {
  ground: 0,
  crater: 1,
  pickup: 2,
  infantry: 3,
  flag: 4,
  tank: 5,
  turret: 6,
  projectile: 7,
  boom: 8,
  heliShadow: 9,
  heli: 10,
  ui: 20
};

// Combat balance
export const BAL = {
  shellDamage: 25,
  mgDamage: 2,
  rifleDamage: 1,
  turretShellDamage: 15,
  heliBombDamage: 20,
  bombRadius: 44,
  enemyTankHP: 50,
  turretHP: 50,
  heliHP: 30,
  infantryHP: 2,
  shellSpeed: 320,
  bulletSpeed: 260,
  enemyShellSpeed: 240,
  rifleSpeed: 160,
  fuelPerSecMoving: 1.0,
  fuelPerSecIdle: 0.08,
  refuelPerSec: 25,
  repairPerSec: 6,
  score: {
    infantry: 5,
    rescue: 10,
    turret: 20,
    tank: 25,
    heli: 30,
    wall: 1,
    flag: 100,
    win: 500
  }
};
