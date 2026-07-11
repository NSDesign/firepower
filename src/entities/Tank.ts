import Phaser from 'phaser';
import { DEPTH, Team } from '../config';
import type BattleScene from '../scenes/BattleScene';

export class Tank extends Phaser.Physics.Arcade.Sprite {
  battle: BattleScene;
  team: Team;
  hp: number;
  maxHP: number;
  isDead = false;
  protected cannonCd = 0;
  protected mgCd = 0;

  constructor(scene: BattleScene, x: number, y: number, texture: string, team: Team, hp: number) {
    super(scene, x, y, texture);
    this.battle = scene;
    this.team = team;
    this.hp = hp;
    this.maxHP = hp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.tank);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(9, this.width / 2 - 9, this.height / 2 - 9);
    this.setCollideWorldBounds(true);
  }

  /** Rotate toward target or by steer, then drive along facing. */
  protected drive(
    dt: number,
    throttle: number,
    steer: number,
    targetAngle: number | null,
    speed: number,
    turnRate: number
  ): void {
    if (!this.body) return;
    if (targetAngle !== null) {
      const diff = Phaser.Math.Angle.Wrap(targetAngle - this.rotation);
      const step = turnRate * dt;
      if (Math.abs(diff) <= step) this.rotation = targetAngle;
      else this.rotation += Math.sign(diff) * step;
      // don't surge forward while facing the wrong way
      if (Math.abs(diff) > 1.2) throttle *= 0.25;
    } else {
      this.rotation += steer * turnRate * dt;
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (throttle === 0) {
      body.setVelocity(0, 0);
    } else {
      this.battle.physics.velocityFromRotation(this.rotation, speed * throttle, body.velocity);
    }
  }

  protected tickCooldowns(dt: number): void {
    this.cannonCd = Math.max(0, this.cannonCd - dt);
    this.mgCd = Math.max(0, this.mgCd - dt);
  }

  takeHit(dmg: number): void {
    if (this.isDead) return;
    this.hp -= dmg;
    this.setTintFill(0xffffff);
    this.battle.time.delayedCall(60, () => {
      if (this.active) this.clearTint();
    });
    if (this.hp <= 0) this.explode();
  }

  protected explode(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.battle.onTankDestroyed(this);
  }
}
