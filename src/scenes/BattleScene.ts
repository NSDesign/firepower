import Phaser from 'phaser';
import {
  BAL, DEPTH, GAME_H, SOLID_TILES, T, TILE, Team, VIEW_W, WORLD_H, WORLD_W
} from '../config';
import { TANKS, TankSpec } from '../data/tanks';
import { buildMap, MapData } from '../world/MapBuilder';
import { InputController } from '../systems/InputController';
import { PlayerTank } from '../entities/PlayerTank';
import { EnemyTank } from '../entities/EnemyTank';
import { Turret } from '../entities/Turret';
import { Helicopter } from '../entities/Helicopter';
import { Infantry } from '../entities/Infantry';
import { Tank } from '../entities/Tank';
import { Sfx } from '../audio/Sfx';

type AImage = Phaser.Physics.Arcade.Image;

export default class BattleScene extends Phaser.Scene {
  mapData!: MapData;
  player: PlayerTank | null = null;
  spec!: TankSpec;

  score = 0;
  men = 0;
  lives = 0;
  flagStolen = false;
  gameOver = false;

  enemyTanks!: Phaser.Physics.Arcade.Group;
  infantryGrp!: Phaser.Physics.Arcade.Group;
  crewGrp!: Phaser.Physics.Arcade.Group;
  turretGrp!: Phaser.Physics.Arcade.StaticGroup;
  heliGrp!: Phaser.Physics.Arcade.Group;
  turrets: Turret[] = [];
  heli: Helicopter | null = null;

  private layer!: Phaser.Tilemaps.TilemapLayer;
  private inputCtl!: InputController;
  private shellsP!: Phaser.Physics.Arcade.Group;
  private bulletsP!: Phaser.Physics.Arcade.Group;
  private shellsE!: Phaser.Physics.Arcade.Group;
  private bulletsE!: Phaser.Physics.Arcade.Group;
  enemyFlag!: Phaser.Physics.Arcade.Sprite;
  private carryIcon!: Phaser.GameObjects.Sprite;
  private fuelGrp!: Phaser.Physics.Arcade.StaticGroup;
  private repairGrp!: Phaser.Physics.Arcade.StaticGroup;
  private ammoGrp!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super('Battle');
  }

  create(data: { tank?: number }): void {
    (window as unknown as Record<string, unknown>).__FP_SCENE = 'Battle';
    this.spec = TANKS[data.tank ?? 0];
    this.score = 0;
    this.men = 0;
    this.lives = this.spec.lives;
    this.flagStolen = false;
    this.gameOver = false;
    this.turrets = [];
    this.heli = null;

    // --- world ---
    this.mapData = buildMap();
    const map = this.make.tilemap({
      data: this.mapData.grid,
      tileWidth: TILE,
      tileHeight: TILE
    });
    const tiles = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    this.layer = map.createLayer(0, tiles, 0, 0)!;
    this.layer.setDepth(DEPTH.ground);
    this.layer.setCollision(SOLID_TILES);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // --- groups ---
    this.enemyTanks = this.physics.add.group();
    this.infantryGrp = this.physics.add.group();
    this.crewGrp = this.physics.add.group();
    this.turretGrp = this.physics.add.staticGroup();
    this.heliGrp = this.physics.add.group();
    this.shellsP = this.physics.add.group();
    this.bulletsP = this.physics.add.group();
    this.shellsE = this.physics.add.group();
    this.bulletsE = this.physics.add.group();
    this.fuelGrp = this.physics.add.staticGroup();
    this.repairGrp = this.physics.add.staticGroup();
    this.ammoGrp = this.physics.add.staticGroup();

    // --- player ---
    this.player = new PlayerTank(this, this.mapData.playerSpawn.x, this.mapData.playerSpawn.y, this.spec);
    this.inputCtl = new InputController(this);

    const cam = this.cameras.main;
    cam.setViewport(0, 0, VIEW_W, GAME_H);
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.startFollow(this.player, true, 0.12, 0.12);

    // --- flags ---
    this.add.sprite(this.mapData.playerBaseCenter.x, this.mapData.playerBaseCenter.y, 'flag_blue', '0')
      .setDepth(DEPTH.flag)
      .play('flagBlue');
    this.enemyFlag = this.physics.add.sprite(
      this.mapData.enemyBaseCenter.x, this.mapData.enemyBaseCenter.y, 'flag_red', '0'
    );
    this.enemyFlag.setDepth(DEPTH.flag).play('flagRed');
    (this.enemyFlag.body as Phaser.Physics.Arcade.Body).setSize(20, 20).setAllowGravity(false);
    (this.enemyFlag.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.carryIcon = this.add.sprite(0, 0, 'flag_red', '0').setDepth(DEPTH.ui).setVisible(false).play('flagRed');

    // --- defenses + pickups ---
    for (const p of this.mapData.enemyTurrets) {
      const t = new Turret(this, p.x, p.y);
      this.turretGrp.add(t.base);
      this.turrets.push(t);
    }
    for (const p of this.mapData.fuelDumps) {
      const img = this.fuelGrp.create(p.x, p.y, 'fuel') as AImage;
      img.setDepth(DEPTH.pickup).setData('amount', 250);
    }
    for (const p of this.mapData.repairPads) {
      (this.repairGrp.create(p.x, p.y, 'repair') as AImage).setDepth(DEPTH.pickup);
    }
    for (const p of this.mapData.ammoCrates) {
      const img = this.ammoGrp.create(p.x, p.y, 'ammo') as AImage;
      img.setDepth(DEPTH.pickup).setData('ready', true);
    }

    // --- enemies ---
    for (const p of this.mapData.infantrySpawns) {
      this.infantryGrp.add(new Infantry(this, p.x, p.y, false));
    }
    this.spawnEnemyTank(0);
    this.spawnEnemyTank(1);
    this.time.addEvent({
      delay: 12000,
      loop: true,
      callback: () => {
        if (!this.gameOver && this.enemyTanks.countActive(true) < 3) {
          this.spawnEnemyTank(Math.floor(Math.random() * 2));
        }
      }
    });
    this.time.addEvent({
      delay: 25000,
      loop: true,
      callback: () => {
        if (!this.gameOver && this.infantryGrp.countActive(true) < 8) {
          const p = Phaser.Utils.Array.GetRandom(this.mapData.infantrySpawns);
          this.infantryGrp.add(new Infantry(this, p.x, p.y, false));
        }
      }
    });
    this.time.delayedCall(30000, () => this.spawnHeli());

    // --- colliders ---
    const ph = this.physics;
    ph.add.collider(this.player, this.layer);
    ph.add.collider(this.enemyTanks, this.layer);
    ph.add.collider(this.enemyTanks, this.enemyTanks);
    ph.add.collider(this.player, this.enemyTanks);
    ph.add.collider(this.player, this.turretGrp);
    ph.add.collider(this.enemyTanks, this.turretGrp);
    ph.add.collider(this.infantryGrp, this.layer);
    ph.add.collider(this.crewGrp, this.layer);

    ph.add.collider(this.shellsP, this.layer, (shell, tile) =>
      this.onShellHitsTile(shell as AImage, tile as Phaser.Tilemaps.Tile)
    );
    ph.add.collider(this.shellsE, this.layer, (shell) => {
      const s = shell as AImage;
      this.boom(s.x, s.y, false);
      s.destroy();
    });
    ph.add.collider(this.bulletsP, this.layer, (b) => (b as AImage).destroy());
    ph.add.collider(this.bulletsE, this.layer, (b) => (b as AImage).destroy());

    ph.add.overlap(this.shellsP, this.enemyTanks, (shell, tank) => {
      (tank as EnemyTank).takeHit(BAL.shellDamage);
      this.boom((shell as AImage).x, (shell as AImage).y, false);
      (shell as AImage).destroy();
    });
    ph.add.overlap(this.bulletsP, this.enemyTanks, (b, tank) => {
      (tank as EnemyTank).takeHit(BAL.mgDamage);
      (b as AImage).destroy();
    });
    ph.add.overlap(this.shellsP, this.turretGrp, (shell, base) => {
      const turret = (base as AImage).getData('turret') as Turret;
      turret.takeHit(BAL.shellDamage);
      this.boom((shell as AImage).x, (shell as AImage).y, false);
      (shell as AImage).destroy();
    });
    ph.add.overlap(this.shellsP, this.heliGrp, (shell, h) => {
      (h as Helicopter).takeHit(BAL.shellDamage);
      this.boom((shell as AImage).x, (shell as AImage).y, false);
      (shell as AImage).destroy();
    });
    ph.add.overlap(this.bulletsP, this.heliGrp, (b, h) => {
      (h as Helicopter).takeHit(BAL.mgDamage);
      (b as AImage).destroy();
    });
    ph.add.overlap(this.shellsP, this.infantryGrp, (shell, inf) => {
      (inf as Infantry).die();
      (shell as AImage).destroy();
    });
    ph.add.overlap(this.bulletsP, this.infantryGrp, (b, inf) => {
      (inf as Infantry).takeHit(BAL.mgDamage);
      (b as AImage).destroy();
    });

    // NOTE: Phaser delivers sprite-vs-group overlap args as (sprite, groupChild)
    // regardless of registration order — resolve the projectile explicitly.
    ph.add.overlap(this.shellsE, this.player, (a, b) => {
      const s = (a === (this.player as unknown) ? b : a) as AImage;
      this.player?.takeHit(s.getData('dmg') as number);
      this.boom(s.x, s.y, false);
      s.destroy();
    });
    ph.add.overlap(this.bulletsE, this.player, (a, b) => {
      const s = (a === (this.player as unknown) ? b : a) as AImage;
      this.player?.takeHit(s.getData('dmg') as number);
      s.destroy();
    });

    ph.add.overlap(this.player, this.infantryGrp, (_p, inf) => (inf as Infantry).die());
    ph.add.overlap(this.player, this.crewGrp, (_p, crew) => {
      (crew as Infantry).destroy();
      this.men++;
      this.addScore(BAL.score.rescue);
      Sfx.rescue();
    });
    ph.add.overlap(this.player, this.enemyFlag, () => this.grabFlag());
    ph.add.overlap(this.player, this.fuelGrp, (_p, dump) => this.onFuel(dump as AImage));
    ph.add.overlap(this.player, this.repairGrp, () => {
      this.player?.repair(BAL.repairPerSec * this.game.loop.delta / 1000);
    });
    ph.add.overlap(this.player, this.ammoGrp, (_p, crate) => this.onAmmo(crate as AImage));

    this.scene.launch('Hud');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => Sfx.engineOff());
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    if (this.gameOver || !this.player) return;

    const intent = this.inputCtl.read();
    this.player.updateTank(dt, intent);
    if (this.player.isDead) Sfx.engineOff();
    else Sfx.engine(this.player.effort);

    for (const t of this.enemyTanks.getChildren() as EnemyTank[]) t.updateTank(dt, time);
    for (const t of this.turrets) t.update(dt);
    this.heli?.updateHeli(dt);
    for (const i of this.infantryGrp.getChildren() as Infantry[]) i.updateInfantry(dt);
    for (const c of this.crewGrp.getChildren() as Infantry[]) c.updateInfantry(dt);

    // flag carrying + win check
    if (this.player.carryingFlag && !this.player.isDead) {
      this.carryIcon.setVisible(true).setPosition(this.player.x, this.player.y - 16);
      const z = this.mapData.playerBaseZone;
      if (
        this.player.x > z.x && this.player.x < z.x + z.w &&
        this.player.y > z.y && this.player.y < z.y + z.h
      ) {
        this.win();
      }
    } else {
      this.carryIcon.setVisible(false);
    }

    this.pruneProjectiles(time);

    (window as unknown as Record<string, unknown>).__FP_STATE = {
      score: this.score,
      lives: this.lives,
      men: this.men,
      fuel: Math.round(this.player.fuel),
      hp: Math.max(0, Math.round(this.player.hp)),
      shells: this.player.shells,
      mg: this.player.mgAmmo,
      flag: this.player.carryingFlag,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y)
    };
  }

  // ------------------------------------------------------------ projectiles

  spawnShell(x: number, y: number, rot: number, team: Team, weak = false): void {
    const grp = team === 'player' ? this.shellsP : this.shellsE;
    const img = grp.create(x, y, 'shell') as AImage;
    img.setRotation(rot).setDepth(DEPTH.projectile);
    const speed = team === 'player' ? BAL.shellSpeed : BAL.enemyShellSpeed;
    this.physics.velocityFromRotation(rot, speed, (img.body as Phaser.Physics.Arcade.Body).velocity);
    (img.body as Phaser.Physics.Arcade.Body).setSize(5, 5);
    img.setData('dmg', weak ? BAL.turretShellDamage : BAL.shellDamage);
    img.setData('ttl', this.time.now + 1400);
  }

  spawnBullet(x: number, y: number, rot: number, team: Team): void {
    const grp = team === 'player' ? this.bulletsP : this.bulletsE;
    const img = grp.create(x, y, 'bullet') as AImage;
    img.setRotation(rot).setDepth(DEPTH.projectile);
    this.physics.velocityFromRotation(rot, BAL.bulletSpeed, (img.body as Phaser.Physics.Arcade.Body).velocity);
    (img.body as Phaser.Physics.Arcade.Body).setSize(4, 4);
    img.setData('dmg', BAL.mgDamage);
    img.setData('ttl', this.time.now + 800);
  }

  spawnRifleShot(x: number, y: number, rot: number): void {
    const img = this.bulletsE.create(x, y, 'bullet') as AImage;
    img.setRotation(rot).setDepth(DEPTH.projectile).setAlpha(0.9);
    this.physics.velocityFromRotation(rot, BAL.rifleSpeed, (img.body as Phaser.Physics.Arcade.Body).velocity);
    (img.body as Phaser.Physics.Arcade.Body).setSize(4, 4);
    img.setData('dmg', BAL.rifleDamage);
    img.setData('ttl', this.time.now + 1000);
  }

  spawnBomb(x: number, y: number, tx: number, ty: number): void {
    const img = this.add.image(x, y, 'bomb').setDepth(DEPTH.heli - 1);
    this.tweens.add({
      targets: img,
      x: tx,
      y: ty,
      scale: 0.6,
      duration: 700,
      onComplete: () => {
        img.destroy();
        this.boom(tx, ty, true);
        const p = this.player;
        if (p && !p.isDead && Phaser.Math.Distance.Between(tx, ty, p.x, p.y) < BAL.bombRadius) {
          p.takeHit(BAL.heliBombDamage);
        }
        this.damageTileAt(tx, ty);
      }
    });
  }

  private pruneProjectiles(time: number): void {
    for (const grp of [this.shellsP, this.bulletsP, this.shellsE, this.bulletsE]) {
      for (const obj of grp.getChildren().slice() as AImage[]) {
        if ((obj.getData('ttl') as number) < time) obj.destroy();
      }
    }
  }

  private onShellHitsTile(shell: AImage, tile: Phaser.Tilemaps.Tile): void {
    this.damageTile(tile);
    this.boom(shell.x, shell.y, false);
    shell.destroy();
  }

  private damageTile(tile: Phaser.Tilemaps.Tile): void {
    if (tile.index === T.WALL) {
      this.setTile(tile.x, tile.y, T.WALL_DMG);
      this.addScore(BAL.score.wall);
    } else if (tile.index === T.WALL_DMG) {
      this.setTile(tile.x, tile.y, T.RUBBLE);
      this.addScore(BAL.score.wall);
      this.cameras.main.shake(80, 0.004);
    }
  }

  private damageTileAt(px: number, py: number): void {
    const tile = this.layer.getTileAtWorldXY(px, py);
    if (tile) this.damageTile(tile);
  }

  private setTile(tx: number, ty: number, index: number): void {
    const tile = this.layer.putTileAt(index, tx, ty);
    tile.setCollision(SOLID_TILES.includes(index));
  }

  // ------------------------------------------------------------ combat events

  boom(x: number, y: number, big: boolean): void {
    const s = this.add.sprite(x, y, 'boom', '0').setDepth(DEPTH.boom);
    if (big) s.setScale(1.7);
    s.play('boomAnim');
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
    if (big) {
      this.cameras.main.shake(150, 0.008);
      Sfx.explosion(true);
    } else {
      Sfx.hit();
    }
  }

  splat(x: number, y: number): void {
    const em = this.add.particles(x, y, 'white', {
      speed: { min: 20, max: 70 },
      lifespan: 350,
      scale: { start: 1, end: 0 },
      tint: 0xc23b2a,
      quantity: 8,
      emitting: false
    });
    em.setDepth(DEPTH.boom);
    em.explode(8);
    this.time.delayedCall(500, () => em.destroy());
  }

  addScore(n: number): void {
    this.score += n;
  }

  onTankDestroyed(tank: Tank): void {
    this.boom(tank.x, tank.y, true);
    if (tank.team === 'enemy') {
      this.addScore(BAL.score.tank);
      this.add.image(tank.x, tank.y, 'wreck').setRotation(tank.rotation).setDepth(DEPTH.crater);
      tank.destroy();
      return;
    }
    // player tank down
    const p = tank as PlayerTank;
    this.lives--;
    Sfx.engineOff();
    if (p.carryingFlag) {
      p.carryingFlag = false;
      this.flagStolen = false;
      this.enemyFlag.setPosition(p.x, p.y).setVisible(true);
      (this.enemyFlag.body as Phaser.Physics.Arcade.Body).reset(p.x, p.y);
    }
    // the crew bails out — rescue them with your next tank
    for (let i = 0; i < 2; i++) {
      this.crewGrp.add(
        new Infantry(this, p.x + (Math.random() - 0.5) * 30, p.y + (Math.random() - 0.5) * 30, true)
      );
    }
    p.disableBody(true, true);
    if (this.lives <= 0) {
      this.endGame(false);
    } else {
      this.time.delayedCall(1600, () => this.respawnPlayer());
    }
  }

  private respawnPlayer(): void {
    const p = this.player;
    if (!p || this.gameOver) return;
    p.enableBody(true, this.mapData.playerSpawn.x, this.mapData.playerSpawn.y, true, true);
    p.isDead = false;
    p.hp = p.maxHP;
    p.fuel = p.spec.fuel;
    p.shells = p.spec.shells;
    p.mgAmmo = p.spec.mg;
    p.carryingFlag = false;
    p.rotation = -Math.PI / 2;
    p.clearTint();
    this.cameras.main.flash(300, 255, 255, 255);
  }

  onHeliDown(): void {
    this.heli = null;
    this.time.delayedCall(40000, () => this.spawnHeli());
  }

  private spawnHeli(): void {
    if (this.gameOver || this.heli) return;
    this.heli = new Helicopter(this, this.mapData.enemyBaseCenter.x, this.mapData.enemyBaseCenter.y - 60);
    this.heliGrp.add(this.heli);
  }

  private spawnEnemyTank(which: number): void {
    const p = this.mapData.enemyTankSpawns[which % this.mapData.enemyTankSpawns.length];
    this.enemyTanks.add(new EnemyTank(this, p.x, p.y));
  }

  private grabFlag(): void {
    const p = this.player;
    if (!p || p.isDead || p.carryingFlag || !this.enemyFlag.visible) return;
    p.carryingFlag = true;
    this.flagStolen = true;
    this.enemyFlag.setVisible(false);
    this.addScore(BAL.score.flag);
    Sfx.flag();
  }

  private onFuel(dump: AImage): void {
    const p = this.player;
    if (!p || p.isDead) return;
    const amount = dump.getData('amount') as number;
    if (amount <= 0) return;
    const dt = this.game.loop.delta / 1000;
    const taken = p.refuel(BAL.refuelPerSec * dt);
    if (taken > 0) {
      dump.setData('amount', amount - taken);
      if (amount - taken <= 0) dump.setAlpha(0.35);
    }
  }

  private onAmmo(crate: AImage): void {
    const p = this.player;
    if (!p || p.isDead || !crate.getData('ready')) return;
    crate.setData('ready', false).setVisible(false);
    p.resupply();
    Sfx.pickup();
    this.time.delayedCall(45000, () => {
      if (crate.active) crate.setData('ready', true).setVisible(true);
    });
  }

  private win(): void {
    if (this.gameOver) return;
    this.addScore(BAL.score.win + this.lives * 50 + Math.round(this.player?.fuel ?? 0));
    this.endGame(true);
  }

  private endGame(won: boolean): void {
    this.gameOver = true;
    Sfx.engineOff();
    if (won) Sfx.win();
    else Sfx.lose();
    this.physics.pause();
    this.time.delayedCall(1400, () => {
      this.scene.stop('Hud');
      this.scene.start('GameOver', { won, score: this.score, men: this.men });
    });
  }
}
