import Phaser from 'phaser';
import { BAL } from '../config';
import { Pt } from '../world/MapBuilder';
import { Sfx } from '../audio/Sfx';
import { Tank } from './Tank';
import type BattleScene from '../scenes/BattleScene';

const SPEED = 92;
const TURN = 2.6;
const SIGHT = 260;
const FIRE_RANGE = 230;
const MG_RANGE = 130;

type State = 'patrol' | 'chase';

export class EnemyTank extends Tank {
  private aiState: State = 'patrol';
  private target: Pt;
  private wpIndex: number;
  private fireCd = Math.random() * 2;
  private mgFireCd = 0;
  private detourUntil = 0;
  private detourAngle = 0;

  constructor(scene: BattleScene, x: number, y: number) {
    super(scene, x, y, 'etank', 'enemy', BAL.enemyTankHP);
    this.wpIndex = Math.floor(Math.random() * scene.mapData.patrolPoints.length);
    this.target = scene.mapData.patrolPoints[this.wpIndex];
    this.rotation = Math.random() * Math.PI * 2;
  }

  updateTank(dt: number, time: number): void {
    if (this.isDead) return;
    this.tickCooldowns(dt);
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.mgFireCd = Math.max(0, this.mgFireCd - dt);

    const player = this.battle.player;
    const playerAlive = player && !player.isDead;
    const dist = playerAlive ? Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) : Infinity;

    // hunt the player anywhere once the flag is stolen; otherwise only nearby
    if (playerAlive && (dist < SIGHT || this.battle.flagStolen)) {
      this.aiState = 'chase';
    } else {
      this.aiState = 'patrol';
    }

    let tx: number;
    let ty: number;
    if (this.aiState === 'chase' && playerAlive) {
      tx = player.x;
      ty = player.y;
    } else {
      tx = this.target.x;
      ty = this.target.y;
      if (Phaser.Math.Distance.Between(this.x, this.y, tx, ty) < 48) {
        this.wpIndex = (this.wpIndex + (Math.random() < 0.5 ? 1 : this.battle.mapData.patrolPoints.length - 1)) %
          this.battle.mapData.patrolPoints.length;
        this.target = this.battle.mapData.patrolPoints[this.wpIndex];
      }
    }

    let desired = Math.atan2(ty - this.y, tx - this.x);

    // crude obstacle avoidance: when blocked, veer off for a moment
    const body = this.body as Phaser.Physics.Arcade.Body;
    const blocked = body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down;
    if (blocked && time > this.detourUntil) {
      this.detourUntil = time + 900;
      this.detourAngle = desired + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2);
    }
    if (time < this.detourUntil) desired = this.detourAngle;

    const diff = Phaser.Math.Angle.Wrap(desired - this.rotation);
    const inFireRange = this.aiState === 'chase' && dist < FIRE_RANGE;
    // slow down to aim, stop when lined up for a shot
    const throttle = inFireRange && Math.abs(diff) < 0.3 ? (dist < 120 ? 0 : 0.5) : 1;
    this.drive(dt, throttle, 0, desired, SPEED * this.battle.speedFactorAt(this.x, this.y), TURN);

    if (playerAlive && this.aiState === 'chase' && Math.abs(diff) < 0.15) {
      if (dist < FIRE_RANGE && this.fireCd === 0) {
        this.fireCd = 2.2;
        this.battle.spawnShell(
          this.x + Math.cos(this.rotation) * 16,
          this.y + Math.sin(this.rotation) * 16,
          this.rotation,
          'enemy'
        );
        if (dist < 320) Sfx.cannon();
      } else if (dist < MG_RANGE && this.mgFireCd === 0) {
        this.mgFireCd = 0.35;
        this.battle.spawnBullet(
          this.x + Math.cos(this.rotation) * 16,
          this.y + Math.sin(this.rotation) * 16,
          this.rotation + (Math.random() - 0.5) * 0.12,
          'enemy'
        );
      }
    }
  }
}
