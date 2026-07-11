import Phaser from 'phaser';
import { GAME_W } from '../config';
import { TANKS } from '../data/tanks';
import { FONT_KEY } from '../gfx/font';
import { Sfx } from '../audio/Sfx';

const YELLOW = 0xffd83d;
const RED = 0xc23b2a;
const ORANGE = 0xa97636;

export default class TankSelectScene extends Phaser.Scene {
  private index = 0;
  private nameText!: Phaser.GameObjects.BitmapText;
  private tankImg!: Phaser.GameObjects.Image;
  private descText!: Phaser.GameObjects.BitmapText;
  private stats: Phaser.GameObjects.BitmapText[] = [];

  constructor() {
    super('Select');
  }

  create(): void {
    (window as unknown as Record<string, unknown>).__FP_SCENE = 'Select';
    this.add.tileSprite(0, 0, GAME_W, 288, 'camo').setOrigin(0);
    const cx = GAME_W / 2;

    // showcase box, like the original select screen
    const g = this.add.graphics();
    g.fillStyle(0x000000, 1).fillRect(cx - 130, 8, 260, 148);
    g.lineStyle(2, ORANGE).strokeRect(cx - 130, 8, 260, 148);

    this.nameText = this.add.bitmapText(cx, 24, FONT_KEY, '').setOrigin(0.5).setScale(2).setTint(YELLOW);
    this.tankImg = this.add.image(cx, 92, 'tank0').setScale(4).setRotation(-Math.PI / 2);
    this.descText = this.add.bitmapText(cx, 144, FONT_KEY, '').setOrigin(0.5).setTint(0x9aa1a6);

    // riveted stat plate
    const plate = this.add.graphics();
    plate.fillStyle(0x7d8489, 1).fillRect(cx - 130, 162, 260, 84);
    plate.lineStyle(2, ORANGE).strokeRect(cx - 130, 162, 260, 84);
    plate.fillStyle(0xc9a15c, 1);
    for (const x of [cx - 122, cx + 122]) {
      for (const y of [170, 204, 238]) plate.fillCircle(x, y, 2);
    }

    const mkStat = (col: number, row: number): Phaser.GameObjects.BitmapText => {
      const bx = cx - 125 + 10 + col * 125;
      const by = 172 + row * 24;
      const box = this.add.graphics();
      box.fillStyle(0x1a1a12, 1).fillRect(bx, by, 105, 18);
      box.lineStyle(1, ORANGE).strokeRect(bx, by, 105, 18);
      return this.add.bitmapText(bx + 6, by + 5, FONT_KEY, '').setTint(YELLOW);
    };
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) this.stats.push(mkStat(col, row));
    }

    // arrows
    const left = this.add.bitmapText(cx - 160, 92, FONT_KEY, '<').setOrigin(0.5).setScale(3).setTint(YELLOW);
    const right = this.add.bitmapText(cx + 160, 92, FONT_KEY, '>').setOrigin(0.5).setScale(3).setTint(YELLOW);
    for (const [arrow, dir] of [[left, -1], [right, 1]] as const) {
      arrow.setInteractive({ useHandCursor: true });
      arrow.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        this.cycle(dir);
      });
      this.tweens.add({ targets: arrow, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
    }

    const go = this.add.bitmapText(cx, 262, FONT_KEY, 'PRESS ENTER OR TAP TANK TO ROLL OUT')
      .setOrigin(0.5)
      .setScale(1.2)
      .setTint(RED);
    this.tweens.add({ targets: go, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    this.tankImg.setInteractive({ useHandCursor: true });
    this.tankImg.on('pointerdown', () => this.start());

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.cycle(-1));
    kb.on('keydown-RIGHT', () => this.cycle(1));
    kb.on('keydown-A', () => this.cycle(-1));
    kb.on('keydown-D', () => this.cycle(1));
    kb.on('keydown-ENTER', () => this.start());
    kb.on('keydown-SPACE', () => this.start());

    this.refresh();
  }

  private cycle(dir: number): void {
    this.index = (this.index + dir + TANKS.length) % TANKS.length;
    Sfx.clank();
    this.refresh();
  }

  private refresh(): void {
    const t = TANKS[this.index];
    this.nameText.setText(t.name);
    this.tankImg.setTexture(t.key);
    this.descText.setText(t.desc);
    const pad = (n: number): string => String(n).padStart(2, '0');
    const vals = [
      `SPEED  ${pad(t.speedRating)}`,
      `LIVES  ${pad(t.lives)}`,
      `SHELLS ${t.shells}`,
      `MG     ${t.mg}`,
      `FUEL   ${Math.round(t.fuel / 10)}`,
      `DAMAGE ${t.maxDamage}`
    ];
    this.stats.forEach((s, i) => s.setText(vals[i]));
  }

  private start(): void {
    Sfx.unlock();
    Sfx.pickup();
    this.scene.start('Battle', { tank: this.index });
  }
}
