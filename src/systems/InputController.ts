import Phaser from 'phaser';
import { GAME_H, VIEW_W, DEPTH } from '../config';
import { FONT_KEY } from '../gfx/font';

export interface TankIntent {
  /** -1..1 */
  throttle: number;
  /** -1..1, used when targetAngle is null */
  steer: number;
  /** touch steering: rotate hull toward this world angle */
  targetAngle: number | null;
  cannon: boolean;
  mg: boolean;
}

class VirtualJoystick {
  private stick: Phaser.GameObjects.Image;
  private pointerId = -1;
  force = 0;
  angle = 0;

  constructor(scene: Phaser.Scene, private cx: number, private cy: number) {
    scene.add.image(cx, cy, 'joyBase').setScrollFactor(0).setDepth(DEPTH.ui);
    this.stick = scene.add.image(cx, cy, 'joyStick').setScrollFactor(0).setDepth(DEPTH.ui + 1);
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.pointerId === -1 && p.x < VIEW_W * 0.5) {
        this.pointerId = p.id;
        this.track(p);
      }
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id === this.pointerId) this.track(p);
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id === this.pointerId) {
        this.pointerId = -1;
        this.force = 0;
        this.stick.setPosition(this.cx, this.cy);
      }
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
  }

  private track(p: Phaser.Input.Pointer): void {
    const dx = p.x - this.cx;
    const dy = p.y - this.cy;
    const d = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);
    this.force = Phaser.Math.Clamp(d / 26, 0, 1);
    const c = Math.min(d, 26);
    this.stick.setPosition(this.cx + Math.cos(this.angle) * c, this.cy + Math.sin(this.angle) * c);
  }
}

class FireButton {
  pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string, scale = 1) {
    const img = scene.add.image(x, y, 'btn').setScrollFactor(0).setDepth(DEPTH.ui).setScale(scale);
    scene.add
      .bitmapText(x, y, FONT_KEY, label)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.ui + 1)
      .setTint(0xffffff)
      .setAlpha(0.85);
    img.setInteractive({ useHandCursor: false });
    img.on('pointerdown', () => (this.pressed = true));
    img.on('pointerup', () => (this.pressed = false));
    img.on('pointerout', () => (this.pressed = false));
  }
}

export class InputController {
  private keys: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
    x: Phaser.Input.Keyboard.Key;
  };

  private joystick: VirtualJoystick | null = null;
  private cannonBtn: FireButton | null = null;
  private mgBtn: FireButton | null = null;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys('up,down,left,right,w,s,a,d,space,shift,x') as InputController['keys'];

    if (scene.sys.game.device.input.touch) {
      scene.input.addPointer(3);
      this.joystick = new VirtualJoystick(scene, 54, GAME_H - 58);
      this.cannonBtn = new FireButton(scene, VIEW_W - 34, GAME_H - 62, 'FIRE', 1.1);
      this.mgBtn = new FireButton(scene, VIEW_W - 76, GAME_H - 30, 'MG', 0.85);
    }
  }

  read(): TankIntent {
    const k = this.keys;
    let throttle = 0;
    let steer = 0;
    let targetAngle: number | null = null;

    if (this.joystick && this.joystick.force > 0.15) {
      targetAngle = this.joystick.angle;
      throttle = Phaser.Math.Clamp(this.joystick.force * 1.25, 0, 1);
    } else {
      if (k.up.isDown || k.w.isDown) throttle += 1;
      if (k.down.isDown || k.s.isDown) throttle -= 0.6;
      if (k.left.isDown || k.a.isDown) steer -= 1;
      if (k.right.isDown || k.d.isDown) steer += 1;
    }

    return {
      throttle,
      steer,
      targetAngle,
      cannon: k.space.isDown || (this.cannonBtn?.pressed ?? false),
      mg: k.shift.isDown || k.x.isDown || (this.mgBtn?.pressed ?? false)
    };
  }
}
