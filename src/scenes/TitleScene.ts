import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { FONT_KEY } from '../gfx/font';
import { Sfx } from '../audio/Sfx';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    (window as unknown as Record<string, unknown>).__FP_SCENE = 'Title';
    this.add.tileSprite(0, 0, GAME_W, GAME_H, 'camo').setOrigin(0);

    const cx = GAME_W / 2;
    // logo with drop shadow
    this.add.bitmapText(cx + 3, 53, FONT_KEY, 'FIRE POWER').setOrigin(0.5).setScale(4).setTint(0x7a1608);
    const logo = this.add.bitmapText(cx, 50, FONT_KEY, 'FIRE POWER').setOrigin(0.5).setScale(4).setTint(0xffd83d);
    this.tweens.add({
      targets: logo,
      y: 46,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.add.bitmapText(cx, 92, FONT_KEY, 'A REMAKE OF THE 1987 TANK CLASSIC')
      .setOrigin(0.5)
      .setTint(0xc9a15c);

    this.add.image(cx, 150, 'tank0').setScale(3.4).setRotation(-Math.PI / 2);

    const start = this.add.bitmapText(cx, 216, FONT_KEY, 'CLICK OR TAP TO START')
      .setOrigin(0.5)
      .setScale(1.5)
      .setTint(0xffffff);
    this.tweens.add({ targets: start, alpha: 0.15, duration: 500, yoyo: true, repeat: -1 });

    this.add.bitmapText(cx, 262, FONT_KEY, 'STEAL THE ENEMY FLAG. BRING IT HOME.')
      .setOrigin(0.5)
      .setTint(0x9aa1a6);

    const go = () => {
      Sfx.unlock();
      this.scene.start('Select');
    };
    this.input.once('pointerdown', go);
    this.input.keyboard!.once('keydown', go);
  }
}
