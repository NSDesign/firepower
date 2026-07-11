# FIRE POWER — Remake

A browser remake of **Fire Power** (Silent Software / MicroIllusions, 1987) — the classic
top-down capture-the-flag tank battle — playable on desktop, laptop, and mobile from a
single build. All art and sound are newly created in the spirit of the Amiga original:
pixel sprites are generated at runtime from code, and sound effects are synthesized with
WebAudio, so the repository contains no binary assets.

## The mission

Pick one of three tanks, fight across the battlefield to the enemy base, blast a hole
through its perimeter wall, drive over the enemy flag, and bring it home to your own base.
Lose all your tanks and the war is over.

| Tank | Speed | Armor | Shells | MG | Fuel |
|------|-------|-------|--------|-----|------|
| **Scorpion** | fast | light | 15 | 150 | low |
| **Panther** | medium | medium | 25 | 250 | medium |
| **Rhino** | slow | heavy | 40 | 400 | high |

Along the way: enemy patrol tanks, a hunter-killer helicopter, gun turrets, and infantry.
Fuel burns as you drive — refill at fuel dumps. Repair pads fix damage, ammo crates
resupply. When one of your tanks is destroyed, its crew bails out; rescue them with your
next tank for bonus points.

## Controls

**Desktop:** Arrow keys / WASD to drive · `Space` cannon · `Shift` or `X` machine gun

**Mobile / touch:** left virtual joystick to drive · `FIRE` and `MG` buttons (landscape
recommended)

## Development

```sh
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build to dist/
npm run smoke      # headless end-to-end test (uses playwright-core + Chromium)
```

Built with [Phaser 3](https://phaser.io), TypeScript, and Vite.

## Deployment

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`
(enable **Settings → Pages → Source: GitHub Actions** once).
