import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { FONT_KEY } from '../gfx/font';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: { won: boolean; score: number; men: number }): void {
    (window as unknown as Record<string, unknown>).__FP_SCENE = 'GameOver';
    this.add.tileSprite(0, 0, GAME_W, GAME_H, 'camo').setOrigin(0);
    const cx = GAME_W / 2;

    const title = data.won ? 'MISSION ACCOMPLISHED!' : 'TANK FORCE DESTROYED';
    const tint = data.won ? 0xffd83d : 0xc23b2a;
    this.add.bitmapText(cx + 2, 72, FONT_KEY, title).setOrigin(0.5).setScale(2).setTint(0x000000);
    this.add.bitmapText(cx, 70, FONT_KEY, title).setOrigin(0.5).setScale(2).setTint(tint);

    this.add.bitmapText(cx, 130, FONT_KEY, `FINAL SCORE  ${String(data.score).padStart(4, '0')}`)
      .setOrigin(0.5)
      .setScale(1.5)
      .setTint(0xffffff);
    this.add.bitmapText(cx, 156, FONT_KEY, `MEN RESCUED  ${String(data.men).padStart(2, '0')}`)
      .setOrigin(0.5)
      .setTint(0x9aa1a6);

    if (data.won) {
      this.add.bitmapText(cx, 182, FONT_KEY, 'THE FLAG IS OURS.')
        .setOrigin(0.5)
        .setTint(0x4fae3c);
    }

    const back = this.add.bitmapText(cx, 226, FONT_KEY, 'CLICK OR TAP FOR TITLE')
      .setOrigin(0.5)
      .setScale(1.2)
      .setTint(0xffd83d);
    this.tweens.add({ targets: back, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    // small delay so a stray battle tap doesn't skip the screen
    this.time.delayedCall(600, () => {
      this.input.once('pointerdown', () => this.scene.start('Title'));
      this.input.keyboard!.once('keydown', () => this.scene.start('Title'));
    });
  }
}
