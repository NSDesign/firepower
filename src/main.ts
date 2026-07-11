import Phaser from 'phaser';
import { GAME_W, GAME_H } from './config';
import BootScene from './scenes/BootScene';
import TitleScene from './scenes/TitleScene';
import TankSelectScene from './scenes/TankSelectScene';
import BattleScene from './scenes/BattleScene';
import HudScene from './scenes/HudScene';
import GameOverScene from './scenes/GameOverScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#0a0a06',
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, TitleScene, TankSelectScene, BattleScene, HudScene, GameOverScene]
});

// hook for automated smoke tests
(window as unknown as Record<string, unknown>).__FP = game;
