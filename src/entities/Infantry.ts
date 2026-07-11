import Phaser from 'phaser';
import { BAL, DEPTH } from '../config';
import { Sfx } from '../audio/Sfx';
import type BattleScene from '../scenes/BattleScene';

const WALK = 26;
const SHOOT_RANGE = 130;

/** Enemy foot soldier, or a friendly bailed-out crewman awaiting rescue. */
export class Infantry extends Phaser.Physics.Arcade.Sprite {
  battle: BattleScene;
  friendly: boolean;
  hp = BAL.infantryHP;
  isDead = false;
  private wanderCd = 0;
  private shootCd = 1 + Math.random();

  constructor(scene: BattleScene, x: number, y: number, friendly: boolean) {
    super(scene, x, y, friendly ? 'crew' : 'inf', '0');
    this.battle = scene;
    this.friendly = friendly;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.infantry);
    (this.body as Phaser.Physics.Arcade.Body).setSize(6, 6);
    this.setCollideWorldBounds(true);
    this.play(friendly ? 'crewWalk' : 'infWalk');
  }

  updateInfantry(dt: number): void {
    if (this.isDead) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.wanderCd -= dt;
    if (this.wanderCd <= 0) {
      this.wanderCd = 0.8 + Math.random() * 1.6;
      if (Math.random() < 0.3) {
        body.setVelocity(0, 0);
      } else {
        const a = Math.random() * Math.PI * 2;
        body.setVelocity(Math.cos(a) * WALK, Math.sin(a) * WALK);
      }
    }

    if (!this.friendly) {
      const player = this.battle.player;
      if (player && !player.isDead) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        this.shootCd = Math.max(0, this.shootCd - dt);
        if (dist < SHOOT_RANGE && this.shootCd === 0) {
          this.shootCd = 1.6;
          const a = Math.atan2(player.y - this.y, player.x - this.x) + (Math.random() - 0.5) * 0.15;
          this.battle.spawnRifleShot(this.x, this.y, a);
          if (dist < 200) Sfx.rifle();
        }
      }
    }
  }

  takeHit(dmg: number): void {
    if (this.isDead) return;
    this.hp -= dmg;
    if (this.hp <= 0) this.die();
  }

  die(): void {
    if (this.isDead) return;
    this.isDead = true;
    if (!this.friendly) this.battle.addScore(BAL.score.infantry);
    this.battle.splat(this.x, this.y);
    this.destroy();
  }
}
