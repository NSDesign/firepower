import Phaser from 'phaser';
import { generateAllTextures } from '../gfx/TextureFactory';
import { createFont } from '../gfx/font';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateAllTextures(this);
    createFont(this);

    this.anims.create({
      key: 'boomAnim',
      frames: [
        { key: 'boom', frame: '0' },
        { key: 'boom', frame: '1' },
        { key: 'boom', frame: '2' },
        { key: 'boom', frame: '3' }
      ],
      frameRate: 12
    });
    this.anims.create({
      key: 'heliSpin',
      frames: [
        { key: 'heli', frame: '0' },
        { key: 'heli', frame: '1' }
      ],
      frameRate: 14,
      repeat: -1
    });
    this.anims.create({
      key: 'infWalk',
      frames: [
        { key: 'inf', frame: '0' },
        { key: 'inf', frame: '1' }
      ],
      frameRate: 6,
      repeat: -1
    });
    this.anims.create({
      key: 'crewWalk',
      frames: [
        { key: 'crew', frame: '0' },
        { key: 'crew', frame: '1' }
      ],
      frameRate: 6,
      repeat: -1
    });
    this.anims.create({
      key: 'flagRed',
      frames: [
        { key: 'flag_red', frame: '0' },
        { key: 'flag_red', frame: '1' }
      ],
      frameRate: 4,
      repeat: -1
    });
    this.anims.create({
      key: 'flagBlue',
      frames: [
        { key: 'flag_blue', frame: '0' },
        { key: 'flag_blue', frame: '1' }
      ],
      frameRate: 4,
      repeat: -1
    });

    this.scene.start('Title');
  }
}
