import Phaser from 'phaser';
import { BAL, DEPTH } from '../config';
import type BattleScene from '../scenes/BattleScene';

const SPEED = 95;
const ORBIT_DIST = 130;

export class Helicopter extends Phaser.Physics.Arcade.Sprite {
  battle: BattleScene;
  hp = BAL.heliHP;
  isDead = false;
  private shadow: Phaser.GameObjects.Image;
  private bombCd = 2;
  private orbitDir = Math.random() < 0.5 ? 1 : -1;

  constructor(scene: BattleScene, x: number, y: number) {
    super(scene, x, y, 'heli', '0');
    this.battle = scene;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.heli);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(10, this.width / 2 - 10, this.height / 2 - 10);
    this.shadow = scene.add.image(x + 8, y + 16, 'shadow').setDepth(DEPTH.heliShadow).setAlpha(0.8);
    this.play('heliSpin');
  }

  updateHeli(dt: number): void {
    if (this.isDead) return;
    this.shadow.setPosition(this.x + 8, this.y + 16);

    const player = this.battle.player;
    if (!player || player.isDead) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return;
    }
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const toPlayer = Math.atan2(dy, dx);

    let vAngle: number;
    if (dist > ORBIT_DIST + 30) {
      vAngle = toPlayer;
    } else if (dist < ORBIT_DIST - 30) {
      vAngle = toPlayer + Math.PI; // back off
    } else {
      vAngle = toPlayer + (Math.PI / 2) * this.orbitDir; // circle the target
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(vAngle) * SPEED, Math.sin(vAngle) * SPEED);
    // face travel direction
    this.setFlipX(body.velocity.x < 0);

    this.bombCd = Math.max(0, this.bombCd - dt);
    if (dist < 160 && this.bombCd === 0) {
      this.bombCd = 2.6;
      // lead the target slightly
      const pv = player.body as Phaser.Physics.Arcade.Body;
      this.battle.spawnBomb(this.x, this.y, player.x + pv.velocity.x * 0.5, player.y + pv.velocity.y * 0.5);
    }
  }

  takeHit(dmg: number): void {
    if (this.isDead) return;
    this.hp -= dmg;
    this.setTintFill(0xffffff);
    this.battle.time.delayedCall(60, () => {
      if (this.active) this.clearTint();
    });
    if (this.hp <= 0) this.crash();
  }

  private crash(): void {
    this.isDead = true;
    this.battle.addScore(BAL.score.heli);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity((Math.random() - 0.5) * 60, 40 + Math.random() * 40);
    this.battle.tweens.add({
      targets: this,
      scale: 0.4,
      angle: 360,
      duration: 700,
      onComplete: () => {
        this.battle.boom(this.x, this.y, true);
        this.battle.onHeliDown();
        this.shadow.destroy();
        this.destroy();
      }
    });
  }

  destroyWithShadow(): void {
    this.shadow.destroy();
    this.destroy();
  }
}
