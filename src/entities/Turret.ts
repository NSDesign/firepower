import Phaser from 'phaser';
import { BAL, DEPTH } from '../config';
import { Sfx } from '../audio/Sfx';
import type BattleScene from '../scenes/BattleScene';

const RANGE = 250;
const TURN = 2.0;

export class Turret {
  base: Phaser.Physics.Arcade.Image;
  gun: Phaser.GameObjects.Image;
  hp = BAL.turretHP;
  dead = false;
  private fireCd = 1 + Math.random() * 1.5;

  constructor(private battle: BattleScene, x: number, y: number) {
    this.base = battle.physics.add.staticImage(x, y, 'turbase') as unknown as Phaser.Physics.Arcade.Image;
    this.base.setDepth(DEPTH.turret);
    (this.base.body as Phaser.Physics.Arcade.StaticBody).setCircle(10, 1, 1);
    this.base.setData('turret', this);
    this.gun = battle.add.image(x, y, 'turgun').setDepth(DEPTH.turret + 1);
    this.gun.setOrigin(5 / 28, 0.5); // pivot on the mount
    this.gun.rotation = Math.random() * Math.PI * 2;
  }

  update(dt: number): void {
    if (this.dead) return;
    const player = this.battle.player;
    if (!player || player.isDead) return;
    const dist = Phaser.Math.Distance.Between(this.base.x, this.base.y, player.x, player.y);
    if (dist > RANGE) return;

    const desired = Math.atan2(player.y - this.base.y, player.x - this.base.x);
    const diff = Phaser.Math.Angle.Wrap(desired - this.gun.rotation);
    const step = TURN * dt;
    if (Math.abs(diff) <= step) this.gun.rotation = desired;
    else this.gun.rotation += Math.sign(diff) * step;

    this.fireCd = Math.max(0, this.fireCd - dt);
    if (Math.abs(diff) < 0.12 && this.fireCd === 0) {
      this.fireCd = 2.4;
      // clear the wall tile the emplacement sits on
      const mx = this.base.x + Math.cos(this.gun.rotation) * 26;
      const my = this.base.y + Math.sin(this.gun.rotation) * 26;
      this.battle.spawnShell(mx, my, this.gun.rotation, 'enemy', true);
      if (dist < 320) Sfx.cannon();
    }
  }

  takeHit(dmg: number): void {
    if (this.dead) return;
    this.hp -= dmg;
    this.base.setTintFill(0xffffff);
    this.battle.time.delayedCall(60, () => {
      if (this.base.active) this.base.clearTint();
    });
    if (this.hp <= 0) this.destroy();
  }

  private destroy(): void {
    this.dead = true;
    this.battle.boom(this.base.x, this.base.y, true);
    this.battle.addScore(BAL.score.turret);
    this.base.destroy();
    this.gun.destroy();
  }
}
