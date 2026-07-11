import Phaser from 'phaser';
import { TILE, T } from '../config';

// All art is generated at runtime as pixel drawings on canvas textures —
// newly created, Amiga-inspired, no ripped assets.

type Ctx = CanvasRenderingContext2D;

// Deterministic PRNG so speckle patterns are stable between runs
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function px(ctx: Ctx, x: number, y: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, 1, 1);
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function canvas(scene: Phaser.Scene, key: string, w: number, h: number): Phaser.Textures.CanvasTexture {
  const existing = scene.textures.exists(key);
  if (existing) scene.textures.remove(key);
  return scene.textures.createCanvas(key, w, h)!;
}

// ---------------------------------------------------------------- tiles

function speckle(ctx: Ctx, ox: number, base: string, dots: [string, number][], rnd: () => number): void {
  rect(ctx, ox, 0, TILE, TILE, base);
  for (const [color, count] of dots) {
    for (let i = 0; i < count; i++) {
      px(ctx, ox + Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), color);
    }
  }
}

function drawSandBase(ctx: Ctx, ox: number, rnd: () => number, dense: boolean): void {
  speckle(ctx, ox, '#d6bf86', [
    ['#c7ae74', dense ? 60 : 34],
    ['#e5d3a2', dense ? 40 : 26],
    ['#b89d66', 12]
  ], rnd);
}

function drawRoad(ctx: Ctx, ox: number, rnd: () => number): void {
  speckle(ctx, ox, '#6e6e6e', [
    ['#636363', 40],
    ['#7a7a7a', 40],
    ['#8a8a8a', 8]
  ], rnd);
}

function drawConcrete(ctx: Ctx, ox: number, rnd: () => number): void {
  speckle(ctx, ox, '#9c9c9c', [
    ['#909090', 30],
    ['#a8a8a8', 30]
  ], rnd);
  rect(ctx, ox, 0, TILE, 1, '#8a8a8a');
  rect(ctx, ox, 0, 1, TILE, '#8a8a8a');
}

function drawWall(ctx: Ctx, ox: number): void {
  rect(ctx, ox, 0, TILE, TILE, '#57756b');
  // brick pattern: 2 rows
  ctx.fillStyle = '#2c3e38';
  ctx.fillRect(ox, 0, TILE, 2);
  ctx.fillRect(ox, 15, TILE, 2);
  ctx.fillRect(ox, 30, TILE, 2);
  ctx.fillRect(ox + 15, 2, 2, 13); // vertical seam row 1
  ctx.fillRect(ox + 7, 17, 2, 13); // offset seam row 2
  ctx.fillRect(ox + 23, 17, 2, 13);
  // highlights
  rect(ctx, ox, 2, TILE, 2, '#6f8f84');
  rect(ctx, ox, 17, TILE, 2, '#6f8f84');
  // shading
  rect(ctx, ox, 13, TILE, 2, '#41584f');
  rect(ctx, ox, 28, TILE, 2, '#41584f');
}

function drawWallDamaged(ctx: Ctx, ox: number, rnd: () => number): void {
  drawWall(ctx, ox);
  // chunks blown out, sand showing through
  const holes: [number, number, number, number][] = [
    [4, 3, 8, 6],
    [20, 12, 9, 8],
    [8, 22, 7, 7]
  ];
  for (const [hx, hy, hw, hh] of holes) {
    rect(ctx, ox + hx, hy, hw, hh, '#1b241f');
    rect(ctx, ox + hx + 1, hy + 1, hw - 2, hh - 2, '#d6bf86');
    for (let i = 0; i < 6; i++) {
      px(ctx, ox + hx + 1 + Math.floor(rnd() * (hw - 2)), hy + 1 + Math.floor(rnd() * (hh - 2)), '#8a8a7a');
    }
  }
  // cracks
  ctx.fillStyle = '#1b241f';
  for (let i = 0; i < 10; i++) px(ctx, ox + 2 + Math.floor(rnd() * 28), Math.floor(rnd() * 32), '#1b241f');
}

function drawRubble(ctx: Ctx, ox: number, rnd: () => number): void {
  drawSandBase(ctx, ox, rnd, false);
  for (let i = 0; i < 22; i++) {
    const x = ox + 1 + Math.floor(rnd() * 29);
    const y = 1 + Math.floor(rnd() * 29);
    const s = 1 + Math.floor(rnd() * 3);
    rect(ctx, x, y, s, s, rnd() > 0.5 ? '#57756b' : '#6e6e6e');
    px(ctx, x, y + s, '#41584f');
  }
}

function drawBunker(ctx: Ctx, ox: number): void {
  rect(ctx, ox, 0, TILE, TILE, '#8a6a3f');
  rect(ctx, ox, 0, TILE, 2, '#a5834f');
  rect(ctx, ox, TILE - 2, TILE, 2, '#5f4527');
  rect(ctx, ox, 0, 2, TILE, '#a5834f');
  rect(ctx, ox + TILE - 2, 0, 2, TILE, '#5f4527');
  // plank lines + rivets
  for (let y = 8; y < TILE; y += 8) rect(ctx, ox + 2, y, TILE - 4, 1, '#6d5231');
  for (const [rx, ry] of [[5, 4], [26, 4], [5, 27], [26, 27]] as const) {
    rect(ctx, ox + rx, ry, 2, 2, '#c9a15c');
  }
}

function drawBunkerDoor(ctx: Ctx, ox: number): void {
  drawBunker(ctx, ox);
  // steel door with cross brace, like the base storage doors
  rect(ctx, ox + 5, 5, 22, 22, '#3c3c3c');
  rect(ctx, ox + 6, 6, 20, 20, '#7d8489');
  ctx.strokeStyle = '#4c5257';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ox + 7, 7);
  ctx.lineTo(ox + 25, 25);
  ctx.moveTo(ox + 25, 7);
  ctx.lineTo(ox + 7, 25);
  ctx.stroke();
  rect(ctx, ox + 14, 14, 4, 4, '#9aa1a6');
}

function drawTree(ctx: Ctx, ox: number, rnd: () => number): void {
  drawSandBase(ctx, ox, rnd, false);
  // full-tile canopy so trees loom over the (24px) tanks
  const blobs: [number, number, number][] = [
    [16, 16, 14],
    [8, 10, 8],
    [24, 10, 8],
    [9, 23, 8],
    [23, 23, 8]
  ];
  for (const [cx, cy, r] of blobs) {
    ctx.fillStyle = '#3f7d2c';
    ctx.beginPath();
    ctx.arc(ox + cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [cx, cy, r] of blobs) {
    ctx.fillStyle = '#59a53d';
    ctx.beginPath();
    ctx.arc(ox + cx - 1, cy - 1, r - 2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * 12;
    px(ctx, ox + 16 + Math.floor(Math.cos(a) * d) - 1, 15 + Math.floor(Math.sin(a) * d), '#7fcf5e');
  }
}

function drawHedgehog(ctx: Ctx, ox: number, rnd: () => number): void {
  drawSandBase(ctx, ox, rnd, false);
  // steel anti-tank X beams
  ctx.strokeStyle = '#2f2f2f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(ox + 5, 27);
  ctx.lineTo(ox + 27, 5);
  ctx.moveTo(ox + 5, 5);
  ctx.lineTo(ox + 27, 27);
  ctx.moveTo(ox + 16, 3);
  ctx.lineTo(ox + 16, 29);
  ctx.stroke();
  ctx.strokeStyle = '#8a9094';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ox + 6, 26);
  ctx.lineTo(ox + 26, 6);
  ctx.moveTo(ox + 6, 6);
  ctx.lineTo(ox + 26, 26);
  ctx.moveTo(ox + 15, 4);
  ctx.lineTo(ox + 15, 28);
  ctx.stroke();
}

function drawCrater(ctx: Ctx, ox: number, rnd: () => number): void {
  drawSandBase(ctx, ox, rnd, false);
  ctx.fillStyle = '#8c744a';
  ctx.beginPath();
  ctx.ellipse(ox + 16, 16, 11, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5f4a2c';
  ctx.beginPath();
  ctx.ellipse(ox + 16, 16, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#463621';
  ctx.beginPath();
  ctx.ellipse(ox + 17, 17, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawWater(ctx: Ctx, ox: number, rnd: () => number): void {
  speckle(ctx, ox, '#2a58a0', [
    ['#234b8a', 30],
    ['#3868b4', 30]
  ], rnd);
  // ripple highlights
  ctx.fillStyle = '#5c8ecb';
  for (let i = 0; i < 7; i++) {
    const x = ox + 2 + Math.floor(rnd() * 24);
    const y = 3 + Math.floor(rnd() * 26);
    ctx.fillRect(x, y, 3 + Math.floor(rnd() * 3), 1);
  }
}

function drawMud(ctx: Ctx, ox: number, rnd: () => number): void {
  speckle(ctx, ox, '#6b4a2a', [
    ['#5a3d20', 40],
    ['#7d5a35', 34],
    ['#4a3118', 14]
  ], rnd);
  // tank ruts
  ctx.fillStyle = '#4a3118';
  ctx.fillRect(ox + 4, 6, 24, 2);
  ctx.fillRect(ox + 6, 22, 22, 2);
  ctx.fillStyle = '#7d5a35';
  ctx.fillRect(ox + 4, 8, 24, 1);
  ctx.fillRect(ox + 6, 24, 22, 1);
}

function drawRock(ctx: Ctx, ox: number, rnd: () => number): void {
  drawSandBase(ctx, ox, rnd, false);
  const boulders: [number, number, number][] = [
    [15, 17, 10],
    [8, 10, 6],
    [23, 11, 6],
    [10, 23, 5]
  ];
  for (const [cx, cy, r] of boulders) {
    ctx.fillStyle = '#4c4c4c';
    ctx.beginPath();
    ctx.arc(ox + cx + 1, cy + 2, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [cx, cy, r] of boulders) {
    ctx.fillStyle = '#7a7a7a';
    ctx.beginPath();
    ctx.arc(ox + cx, cy, r - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#999999';
    ctx.beginPath();
    ctx.arc(ox + cx - 2, cy - 2, Math.max(2, r - 4), 0, Math.PI * 2);
    ctx.fill();
  }
}

function createTiles(scene: Phaser.Scene): void {
  const count = 15;
  const tex = canvas(scene, 'tiles', count * TILE, TILE);
  const ctx = tex.getContext();
  const rnd = lcg(1234);
  drawSandBase(ctx, T.SAND * TILE, rnd, false);
  drawSandBase(ctx, T.SAND2 * TILE, rnd, true);
  drawRoad(ctx, T.ROAD * TILE, rnd);
  drawConcrete(ctx, T.CONCRETE * TILE, rnd);
  drawWall(ctx, T.WALL * TILE);
  drawWallDamaged(ctx, T.WALL_DMG * TILE, rnd);
  drawRubble(ctx, T.RUBBLE * TILE, rnd);
  drawBunker(ctx, T.BUNKER * TILE);
  drawBunkerDoor(ctx, T.BUNKER_DOOR * TILE);
  drawTree(ctx, T.TREE * TILE, rnd);
  drawHedgehog(ctx, T.HEDGEHOG * TILE, rnd);
  drawCrater(ctx, T.CRATER * TILE, rnd);
  drawWater(ctx, T.WATER * TILE, rnd);
  drawMud(ctx, T.MUD * TILE, rnd);
  drawRock(ctx, T.ROCK * TILE, rnd);
  tex.refresh();
}

// ---------------------------------------------------------------- tanks

interface TankPalette {
  hull: string;
  hullDark: string;
  hullLight: string;
  tread: string;
  treadLight: string;
  barrel: string;
}

function drawTank(scene: Phaser.Scene, key: string, p: TankPalette, hullLen: 'short' | 'mid' | 'long'): void {
  // 24x16 keeps the tank small against walls, buildings, and trees,
  // matching the original's scale
  const w = 24;
  const h = 16;
  const tex = canvas(scene, key, w, h);
  const ctx = tex.getContext();
  const x0 = hullLen === 'short' ? 4 : hullLen === 'mid' ? 2 : 1;
  const x1 = hullLen === 'short' ? 19 : hullLen === 'mid' ? 21 : 22;
  // treads (top and bottom, tank faces right)
  rect(ctx, x0 - 1, 0, x1 - x0 + 2, 4, p.tread);
  rect(ctx, x0 - 1, 12, x1 - x0 + 2, 4, p.tread);
  for (let x = x0; x < x1; x += 3) {
    rect(ctx, x, 1, 1, 2, p.treadLight);
    rect(ctx, x, 13, 1, 2, p.treadLight);
  }
  // hull
  rect(ctx, x0, 3, x1 - x0, 10, p.hull);
  rect(ctx, x0, 3, x1 - x0, 2, p.hullLight);
  rect(ctx, x0, 11, x1 - x0, 2, p.hullDark);
  rect(ctx, x1 - 2, 4, 2, 8, p.hullDark);
  // turret
  ctx.fillStyle = p.hullDark;
  ctx.beginPath();
  ctx.arc(10, 8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.hullLight;
  ctx.beginPath();
  ctx.arc(9, 7, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.hull;
  ctx.beginPath();
  ctx.arc(10, 8, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // barrel
  rect(ctx, 13, 7, 9, 2, p.barrel);
  rect(ctx, 21, 6, 2, 4, p.barrel);
  tex.refresh();
}

function createTanks(scene: Phaser.Scene): void {
  drawTank(scene, 'tank0', {
    hull: '#b08a4e', hullDark: '#7d5f31', hullLight: '#cfa96a',
    tread: '#4f3d22', treadLight: '#6d5530', barrel: '#3a3a3a'
  }, 'short');
  drawTank(scene, 'tank1', {
    hull: '#96793c', hullDark: '#6a5528', hullLight: '#b5964f',
    tread: '#463822', treadLight: '#61512f', barrel: '#333333'
  }, 'mid');
  drawTank(scene, 'tank2', {
    hull: '#7b6a34', hullDark: '#554a22', hullLight: '#988546',
    tread: '#3c341d', treadLight: '#544a28', barrel: '#2d2d2d'
  }, 'long');
  drawTank(scene, 'etank', {
    hull: '#77806a', hullDark: '#4c5443', hullLight: '#939c85',
    tread: '#343a2e', treadLight: '#4a5240', barrel: '#2b2b2b'
  }, 'mid');
}

// ---------------------------------------------------------------- units

function createHelicopter(scene: Phaser.Scene): void {
  const fw = 34;
  const fh = 26;
  const tex = canvas(scene, 'heli', fw * 2, fh);
  const ctx = tex.getContext();
  for (let f = 0; f < 2; f++) {
    const ox = f * fw;
    // tail (left) and body (right), facing right
    rect(ctx, ox + 2, 11, 14, 3, '#3e4a3e');
    rect(ctx, ox + 1, 8, 3, 4, '#4a5a4a'); // tail fin
    px(ctx, ox + 1, 7, '#8a9a8a');
    // body
    ctx.fillStyle = '#4a5a4a';
    ctx.beginPath();
    ctx.ellipse(ox + 21, 13, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5c6e5c';
    ctx.beginPath();
    ctx.ellipse(ox + 21, 11, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // cockpit glass
    ctx.fillStyle = '#9fb8c8';
    ctx.beginPath();
    ctx.ellipse(ox + 25, 12, 3, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // skids
    rect(ctx, ox + 14, 20, 14, 1, '#2b2b2b');
    rect(ctx, ox + 16, 18, 1, 2, '#2b2b2b');
    rect(ctx, ox + 25, 18, 1, 2, '#2b2b2b');
    // main rotor across body center — two frames of spin
    ctx.fillStyle = '#d8d8d8';
    if (f === 0) {
      rect(ctx, ox + 6, 12, 30 - 6, 1, '#cccccc');
    } else {
      ctx.save();
      ctx.translate(ox + 21, 12.5);
      ctx.rotate(Math.PI / 3);
      ctx.fillRect(-12, 0, 24, 1);
      ctx.restore();
    }
    // rotor hub + tail rotor
    rect(ctx, ox + 20, 11, 3, 3, '#222222');
    rect(ctx, ox + 1, f === 0 ? 9 : 10, 1, 3, '#dddddd');
  }
  tex.refresh();
  tex.add('0', 0, 0, 0, fw, fh);
  tex.add('1', 0, fw, 0, fw, fh);
}

function createShadow(scene: Phaser.Scene): void {
  const tex = canvas(scene, 'shadow', 24, 10);
  const ctx = tex.getContext();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(12, 5, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  tex.refresh();
}

function drawMan(ctx: Ctx, ox: number, frame: number, uniform: string, uniformDark: string): void {
  const skin = '#c8a06a';
  // head
  rect(ctx, ox + 3, 0, 2, 2, skin);
  // body
  rect(ctx, ox + 2, 2, 4, 3, uniform);
  // arms
  px(ctx, ox + 1, 3, uniform);
  px(ctx, ox + 6, 3, uniform);
  // legs alternate
  if (frame === 0) {
    rect(ctx, ox + 2, 5, 1, 3, uniformDark);
    rect(ctx, ox + 5, 5, 1, 2, uniformDark);
  } else {
    rect(ctx, ox + 2, 5, 1, 2, uniformDark);
    rect(ctx, ox + 5, 5, 1, 3, uniformDark);
  }
}

function createInfantry(scene: Phaser.Scene): void {
  const tex = canvas(scene, 'inf', 16, 8);
  const ctx = tex.getContext();
  drawMan(ctx, 0, 0, '#3a4a3a', '#2a362a');
  drawMan(ctx, 8, 1, '#3a4a3a', '#2a362a');
  tex.refresh();
  tex.add('0', 0, 0, 0, 8, 8);
  tex.add('1', 0, 8, 0, 8, 8);

  const tex2 = canvas(scene, 'crew', 16, 8);
  const ctx2 = tex2.getContext();
  drawMan(ctx2, 0, 0, '#b89a5c', '#8d7440');
  drawMan(ctx2, 8, 1, '#b89a5c', '#8d7440');
  tex2.refresh();
  tex2.add('0', 0, 0, 0, 8, 8);
  tex2.add('1', 0, 8, 0, 8, 8);
}

function createTurret(scene: Phaser.Scene): void {
  // wall emplacement: a fortified block matching the wall masonry,
  // sized to sit on (and read as part of) a wall tile
  const S = 26;
  const base = canvas(scene, 'turbase', S, S);
  let ctx = base.getContext();
  rect(ctx, 0, 0, S, S, '#2c3e38');
  rect(ctx, 2, 2, S - 4, S - 4, '#57756b');
  rect(ctx, 2, 2, S - 4, 2, '#6f8f84');
  rect(ctx, 2, S - 4, S - 4, 2, '#41584f');
  // octagonal concrete mount on top
  const cx = S / 2;
  ctx.fillStyle = '#6d6d6d';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i + Math.PI / 8;
    const x = cx + Math.cos(a) * 9;
    const y = cx + Math.sin(a) * 9;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3c3c3c';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#7d7d7d';
  ctx.beginPath();
  ctx.arc(cx, cx, 5, 0, Math.PI * 2);
  ctx.fill();
  for (const [rx, ry] of [[4, 4], [S - 6, 4], [4, S - 6], [S - 6, S - 6]] as const) {
    rect(ctx, rx, ry, 2, 2, '#c9a15c');
  }
  base.refresh();

  const gun = canvas(scene, 'turgun', 28, 10);
  ctx = gun.getContext();
  // mounted at x=5,y=5; barrel to the right
  ctx.fillStyle = '#4c5443';
  ctx.beginPath();
  ctx.arc(5, 5, 5, 0, Math.PI * 2);
  ctx.fill();
  rect(ctx, 9, 3, 15, 3, '#333333');
  rect(ctx, 23, 2, 3, 5, '#333333');
  rect(ctx, 9, 3, 15, 1, '#4d4d4d');
  ctx.fillStyle = '#6d7a5a';
  ctx.beginPath();
  ctx.arc(4, 4, 3, 0, Math.PI * 2);
  ctx.fill();
  gun.refresh();
}

// ---------------------------------------------------------------- fx + items

function createProjectiles(scene: Phaser.Scene): void {
  let tex = canvas(scene, 'shell', 6, 3);
  let ctx = tex.getContext();
  rect(ctx, 0, 0, 6, 3, '#ffd23d');
  rect(ctx, 3, 1, 3, 1, '#ffffff');
  tex.refresh();

  tex = canvas(scene, 'bullet', 3, 2);
  ctx = tex.getContext();
  rect(ctx, 0, 0, 3, 2, '#ffe98a');
  tex.refresh();

  tex = canvas(scene, 'bomb', 6, 7);
  ctx = tex.getContext();
  rect(ctx, 1, 0, 4, 5, '#3c3c3c');
  rect(ctx, 2, 5, 2, 2, '#5a5a5a');
  px(ctx, 2, 0, '#6a6a6a');
  tex.refresh();
}

function createBoom(scene: Phaser.Scene): void {
  const fs = 24;
  const tex = canvas(scene, 'boom', fs * 4, fs);
  const ctx = tex.getContext();
  const c = fs / 2;
  const circle = (ox: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(ox + c, c, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const rnd = lcg(77);
  // frame 0: hot core
  circle(0, 4, '#ffffff');
  circle(0, 2, '#ffe98a');
  // frame 1: fireball
  circle(fs, 8, '#ff9a2a');
  circle(fs, 5, '#ffd23d');
  circle(fs, 2, '#ffffff');
  // frame 2: ragged orange/red + smoke
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 3 + rnd() * 7;
    const x = fs * 2 + c + Math.cos(a) * d;
    const y = c + Math.sin(a) * d;
    ctx.fillStyle = i % 3 === 0 ? '#8a8a8a' : i % 2 === 0 ? '#d84a1e' : '#ff9a2a';
    ctx.beginPath();
    ctx.arc(x, y, 2 + rnd() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // frame 3: dissipating smoke
  for (let i = 0; i < 10; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 4 + rnd() * 8;
    const x = fs * 3 + c + Math.cos(a) * d;
    const y = c + Math.sin(a) * d;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(90,90,90,0.7)' : 'rgba(60,50,40,0.6)';
    ctx.beginPath();
    ctx.arc(x, y, 1 + rnd() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  tex.refresh();
  for (let f = 0; f < 4; f++) tex.add(String(f), 0, f * fs, 0, fs, fs);
}

function createFlag(scene: Phaser.Scene, key: string, cloth: string, clothDark: string): void {
  const fw = 16;
  const fh = 16;
  const tex = canvas(scene, key, fw * 2, fh);
  const ctx = tex.getContext();
  for (let f = 0; f < 2; f++) {
    const ox = f * fw;
    rect(ctx, ox + 3, 0, 1, 16, '#3c3c3c');
    px(ctx, ox + 3, 0, '#c9a15c');
    if (f === 0) {
      rect(ctx, ox + 4, 1, 9, 6, cloth);
      rect(ctx, ox + 4, 5, 9, 2, clothDark);
      px(ctx, ox + 13, 2, clothDark);
    } else {
      rect(ctx, ox + 4, 1, 8, 6, cloth);
      rect(ctx, ox + 4, 3, 8, 1, clothDark);
      rect(ctx, ox + 11, 1, 2, 2, clothDark);
      px(ctx, ox + 12, 6, cloth);
    }
  }
  tex.refresh();
  tex.add('0', 0, 0, 0, fw, fh);
  tex.add('1', 0, fw, 0, fw, fh);
}

function createPickups(scene: Phaser.Scene): void {
  // fuel dump: pair of drums
  let tex = canvas(scene, 'fuel', 20, 16);
  let ctx = tex.getContext();
  for (const ox of [0, 10]) {
    rect(ctx, ox + 1, 1, 8, 14, '#7d7d7d');
    rect(ctx, ox + 1, 1, 8, 2, '#949494');
    rect(ctx, ox + 1, 4, 8, 2, '#5a5a5a');
    rect(ctx, ox + 1, 9, 8, 2, '#5a5a5a');
    rect(ctx, ox + 1, 13, 8, 2, '#4a4a4a');
    rect(ctx, ox + 4, 2, 2, 1, '#c23b2a');
  }
  tex.refresh();

  // repair pad: white circle + red cross
  tex = canvas(scene, 'repair', 20, 20);
  ctx = tex.getContext();
  ctx.fillStyle = '#e8e8e8';
  ctx.beginPath();
  ctx.arc(10, 10, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9a9a9a';
  ctx.lineWidth = 1;
  ctx.stroke();
  rect(ctx, 8, 3, 4, 14, '#c23b2a');
  rect(ctx, 3, 8, 14, 4, '#c23b2a');
  tex.refresh();

  // ammo crate
  tex = canvas(scene, 'ammo', 14, 12);
  ctx = tex.getContext();
  rect(ctx, 0, 0, 14, 12, '#8a6a3f');
  rect(ctx, 0, 0, 14, 1, '#a5834f');
  rect(ctx, 0, 11, 14, 1, '#5f4527');
  rect(ctx, 3, 0, 2, 12, '#5f4527');
  rect(ctx, 9, 0, 2, 12, '#5f4527');
  for (const x of [1, 6, 12]) rect(ctx, x, 4, 1, 4, '#ffd23d');
  tex.refresh();

  // wreck: burned-out hull (matches the 24x16 tank)
  tex = canvas(scene, 'wreck', 24, 16);
  ctx = tex.getContext();
  rect(ctx, 2, 0, 20, 4, '#2b2b2b');
  rect(ctx, 2, 12, 20, 4, '#2b2b2b');
  rect(ctx, 3, 3, 18, 10, '#3c3833');
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath();
  ctx.arc(10, 8, 4, 0, Math.PI * 2);
  ctx.fill();
  rect(ctx, 14, 7, 8, 2, '#242424');
  for (const [x, y] of [[6, 5], [17, 10], [8, 12]] as const) rect(ctx, x, y, 3, 2, '#6b3a22');
  tex.refresh();
}

// ---------------------------------------------------------------- UI

function createCamo(scene: Phaser.Scene): void {
  const s = 64;
  const tex = canvas(scene, 'camo', s, s);
  const ctx = tex.getContext();
  rect(ctx, 0, 0, s, s, '#12100a');
  const rnd = lcg(4242);
  const blob = (color: string) => {
    const cx = rnd() * s;
    const cy = rnd() * s;
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const x = cx + (rnd() - 0.5) * 10;
      const y = cy + (rnd() - 0.5) * 10;
      ctx.beginPath();
      ctx.arc(((x % s) + s) % s, ((y % s) + s) % s, 3 + rnd() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  for (let i = 0; i < 14; i++) blob('#24463a');
  for (let i = 0; i < 12; i++) blob('#58371b');
  tex.refresh();
}

function createTouchUI(scene: Phaser.Scene): void {
  let tex = canvas(scene, 'joyBase', 64, 64);
  let ctx = tex.getContext();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(32, 32, 18, 0, Math.PI * 2);
  ctx.stroke();
  tex.refresh();

  tex = canvas(scene, 'joyStick', 28, 28);
  ctx = tex.getContext();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(14, 14, 12, 0, Math.PI * 2);
  ctx.fill();
  tex.refresh();

  tex = canvas(scene, 'btn', 44, 44);
  ctx = tex.getContext();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.arc(22, 22, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  tex.refresh();
}

function createMisc(scene: Phaser.Scene): void {
  const tex = canvas(scene, 'white', 2, 2);
  const ctx = tex.getContext();
  rect(ctx, 0, 0, 2, 2, '#ffffff');
  tex.refresh();
}

export function generateAllTextures(scene: Phaser.Scene): void {
  createTiles(scene);
  createTanks(scene);
  createHelicopter(scene);
  createShadow(scene);
  createInfantry(scene);
  createTurret(scene);
  createProjectiles(scene);
  createBoom(scene);
  createFlag(scene, 'flag_red', '#c23b2a', '#8d2a1e');
  createFlag(scene, 'flag_blue', '#2a58c2', '#1e408d');
  createPickups(scene);
  createCamo(scene);
  createTouchUI(scene);
  createMisc(scene);
}
