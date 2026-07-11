import Phaser from 'phaser';
import { GAME_H, GAME_W, PANEL_W, VIEW_W, WORLD_W } from '../config';
import { FONT_KEY } from '../gfx/font';
import type BattleScene from './BattleScene';
import type { EnemyTank } from '../entities/EnemyTank';
import type { Infantry } from '../entities/Infantry';

const ORANGE = 0xa97636;
const RIVET = 0xc9a15c;
const PLATE = 0x7d8489;
const YELLOW = 0xffd83d;
const RED = 0xc23b2a;

const RADAR_X = VIEW_W + 14;
const RADAR_Y = 178;
const RADAR_S = 92;

export default class HudScene extends Phaser.Scene {
  private battle!: BattleScene;
  private scoreText!: Phaser.GameObjects.BitmapText;
  private menText!: Phaser.GameObjects.BitmapText;
  private livesText!: Phaser.GameObjects.BitmapText;
  private shellText!: Phaser.GameObjects.BitmapText;
  private mgText!: Phaser.GameObjects.BitmapText;
  private bars!: Phaser.GameObjects.Graphics;
  private radar!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Hud');
  }

  create(): void {
    this.battle = this.scene.get('Battle') as BattleScene;

    // camo frame + riveted plate
    this.add.tileSprite(VIEW_W, 0, PANEL_W, GAME_H, 'camo').setOrigin(0);
    const g = this.add.graphics();
    g.fillStyle(PLATE, 1).fillRect(VIEW_W + 5, 5, PANEL_W - 10, GAME_H - 10);
    g.lineStyle(2, ORANGE).strokeRect(VIEW_W + 5, 5, PANEL_W - 10, GAME_H - 10);
    g.fillStyle(RIVET, 1);
    for (let y = 14; y < GAME_H - 8; y += 27) {
      g.fillCircle(VIEW_W + 10, y, 2);
      g.fillCircle(GAME_W - 10, y, 2);
    }

    const box = (x: number, y: number, w: number, h: number): void => {
      g.fillStyle(0x14140d, 1).fillRect(x, y, w, h);
      g.lineStyle(1, ORANGE).strokeRect(x, y, w, h);
    };
    const label = (x: number, y: number, text: string, tint: number, scale = 1): Phaser.GameObjects.BitmapText =>
      this.add.bitmapText(x, y, FONT_KEY, text).setTint(tint).setScale(scale);

    const cx = VIEW_W + PANEL_W / 2;

    // SCORE
    box(VIEW_W + 16, 12, PANEL_W - 32, 14);
    label(cx - 15, 16, 'SCORE', RED);
    box(VIEW_W + 16, 30, PANEL_W - 32, 14);
    this.scoreText = label(cx, 34, '0000', YELLOW).setOrigin(0.5, 0);

    // men + tanks counters
    box(VIEW_W + 16, 52, 40, 14);
    this.add.image(VIEW_W + 26, 59, 'crew', '0');
    this.menText = label(VIEW_W + 34, 56, '00', YELLOW);
    box(VIEW_W + 62, 52, 42, 14);
    this.add.image(VIEW_W + 74, 59, 'tank0').setScale(0.5);
    this.livesText = label(VIEW_W + 86, 56, '0', YELLOW);

    // ammo readouts
    box(VIEW_W + 16, 74, 40, 14);
    this.add.image(VIEW_W + 25, 81, 'shell').setScale(1.4);
    this.shellText = label(VIEW_W + 33, 78, '00', YELLOW);
    box(VIEW_W + 62, 74, 42, 14);
    this.add.image(VIEW_W + 71, 81, 'bullet').setScale(1.6);
    this.mgText = label(VIEW_W + 78, 78, '000', YELLOW);

    // FUEL + DAMAGE bars
    box(VIEW_W + 16, 96, PANEL_W - 32, 13);
    label(cx - 12, 99, 'FUEL', RED);
    box(VIEW_W + 16, 113, PANEL_W - 32, 12);
    box(VIEW_W + 16, 133, PANEL_W - 32, 13);
    label(cx - 21, 136, 'DAMAGE', RED);
    box(VIEW_W + 16, 150, PANEL_W - 32, 12);
    this.bars = this.add.graphics();

    // radar
    g.fillStyle(0x000000, 1).fillRect(RADAR_X - 3, RADAR_Y - 3, RADAR_S + 6, RADAR_S + 6);
    g.lineStyle(2, ORANGE).strokeRect(RADAR_X - 3, RADAR_Y - 3, RADAR_S + 6, RADAR_S + 6);
    this.radar = this.add.graphics();
  }

  update(time: number): void {
    const b = this.battle;
    if (!b || !b.scene.isActive() || !b.player) return;
    const p = b.player;

    this.scoreText.setText(String(b.score).padStart(4, '0'));
    this.menText.setText(String(b.men).padStart(2, '0'));
    this.livesText.setText(String(Math.max(0, b.lives)));
    this.shellText.setText(String(p.shells).padStart(2, '0'));
    this.mgText.setText(String(p.mgAmmo).padStart(3, '0'));

    // bars
    this.bars.clear();
    const barW = PANEL_W - 36;
    const fuelFrac = Phaser.Math.Clamp(p.fuel / p.spec.fuel, 0, 1);
    const lowFuel = fuelFrac < 0.2 && Math.floor(time / 300) % 2 === 0;
    this.bars.fillStyle(lowFuel ? RED : 0xc8c8c8, 1);
    this.bars.fillRect(VIEW_W + 18, 115, Math.round(barW * fuelFrac), 8);
    const hpFrac = Phaser.Math.Clamp(p.hp / p.maxHP, 0, 1);
    const hpColor = hpFrac > 0.5 ? 0x4fae3c : hpFrac > 0.25 ? YELLOW : RED;
    this.bars.fillStyle(hpColor, 1);
    this.bars.fillRect(VIEW_W + 18, 152, Math.round(barW * hpFrac), 8);

    this.drawRadar(time);
  }

  private drawRadar(time: number): void {
    const r = this.radar;
    const k = RADAR_S / WORLD_W;
    const blink = Math.floor(time / 250) % 2 === 0;
    r.clear();

    const dot = (wx: number, wy: number, color: number, size = 2): void => {
      r.fillStyle(color, 1);
      r.fillRect(RADAR_X + wx * k - size / 2, RADAR_Y + wy * k - size / 2, size, size);
    };

    const b = this.battle;
    // fortress outlines
    r.lineStyle(1, 0x4c5257);
    for (const f of [b.mapData.playerFortRect, b.mapData.enemyFortRect]) {
      r.strokeRect(RADAR_X + f.x * k, RADAR_Y + f.y * k, f.w * k, f.h * k);
    }

    for (const t of b.turrets) {
      if (!t.dead) dot(t.base.x, t.base.y, 0x7a2a1e, 2);
    }
    for (const e of b.enemyTanks.getChildren() as EnemyTank[]) {
      if (e.active) dot(e.x, e.y, RED, 2);
    }
    if (b.heli && b.heli.active && blink) dot(b.heli.x, b.heli.y, 0xff9a2a, 3);
    for (const c of b.crewGrp.getChildren() as Infantry[]) {
      if (c.active) dot(c.x, c.y, 0x4fae3c, 2);
    }
    // flags
    if (b.enemyFlag.visible) {
      if (blink || !b.flagStolen) dot(b.enemyFlag.x, b.enemyFlag.y, RED, 3);
    }
    dot(b.mapData.playerBaseCenter.x, b.mapData.playerBaseCenter.y, 0x2a58c2, 3);
    // player
    const p = b.player;
    if (p && !p.isDead) {
      if (p.carryingFlag && blink) dot(p.x, p.y, RED, 4);
      dot(p.x, p.y, 0xffffff, 2);
    }
  }
}
