import Phaser from 'phaser';
import { BAL } from '../config';
import { TankSpec } from '../data/tanks';
import { TankIntent } from '../systems/InputController';
import { Sfx } from '../audio/Sfx';
import { Tank } from './Tank';
import type BattleScene from '../scenes/BattleScene';

export class PlayerTank extends Tank {
  spec: TankSpec;
  fuel: number;
  shells: number;
  mgAmmo: number;
  carryingFlag = false;
  /** 0..1 throttle actually applied this frame (for engine sound) */
  effort = 0;

  constructor(scene: BattleScene, x: number, y: number, spec: TankSpec) {
    super(scene, x, y, spec.key, 'player', spec.maxDamage);
    this.spec = spec;
    this.fuel = spec.fuel;
    this.shells = spec.shells;
    this.mgAmmo = spec.mg;
    this.rotation = -Math.PI / 2; // face north, toward the enemy
  }

  updateTank(dt: number, intent: TankIntent): void {
    if (this.isDead) return;
    this.tickCooldowns(dt);

    let throttle = intent.throttle;
    if (this.fuel <= 0) {
      throttle = 0;
      // stranded without fuel: the crew is in trouble
      this.hp -= dt * 1.5;
      if (this.hp <= 0) this.explode();
    }
    const terrain = this.battle.speedFactorAt(this.x, this.y);
    this.drive(dt, throttle, intent.steer, intent.targetAngle, this.spec.speed * terrain, this.spec.turnRate);
    this.effort = Math.abs(throttle);

    // fuel burn
    this.fuel = Math.max(
      0,
      this.fuel - dt * (this.effort > 0.05 ? BAL.fuelPerSecMoving * this.effort : BAL.fuelPerSecIdle)
    );

    if (intent.cannon && this.cannonCd === 0 && this.shells > 0) {
      this.cannonCd = 0.55;
      this.shells--;
      const m = this.muzzle(16);
      this.battle.spawnShell(m.x, m.y, this.rotation, 'player');
      Sfx.cannon();
    }
    if (intent.mg && this.mgCd === 0 && this.mgAmmo > 0) {
      this.mgCd = 0.09;
      this.mgAmmo--;
      const m = this.muzzle(16);
      const spread = (Math.random() - 0.5) * 0.09;
      this.battle.spawnBullet(m.x, m.y, this.rotation + spread, 'player');
      Sfx.mg();
    }
  }

  refuel(amount: number): number {
    const take = Math.min(amount, this.spec.fuel - this.fuel);
    this.fuel += take;
    return take;
  }

  repair(amount: number): void {
    this.hp = Math.min(this.maxHP, this.hp + amount);
  }

  resupply(): void {
    this.shells = Math.min(this.spec.shells + 20, this.shells + 10);
    this.mgAmmo = Math.min(this.spec.mg + 200, this.mgAmmo + 100);
  }

  private muzzle(len: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.x + Math.cos(this.rotation) * len,
      this.y + Math.sin(this.rotation) * len
    );
  }
}
