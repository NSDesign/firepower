// End-to-end smoke test: boots the built game in headless Chromium,
// walks Title -> Select -> Battle, drives and fires the tank, and
// verifies game state via the window.__FP_* hooks.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const PORT = 4173;
const SHOT_DIR = process.env.SHOT_DIR || 'screenshots';
const MOBILE = process.argv.includes('--mobile');

function findChromium() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
    '/opt/pw-browsers/chromium'
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error('Chromium not found; set CHROMIUM_PATH');
}

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('preview server did not start');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  mkdirSync(SHOT_DIR, { recursive: true });
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    detached: true
  });
  const failures = [];
  const check = (name, ok, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
    if (!ok) failures.push(name);
  };

  try {
    await waitForServer(`http://localhost:${PORT}/`);
    const browser = await chromium.launch({ executablePath: findChromium() });
    const context = await browser.newContext({
      viewport: MOBILE ? { width: 740, height: 360 } : { width: 1024, height: 576 },
      hasTouch: MOBILE,
      isMobile: MOBILE
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await page.goto(`http://localhost:${PORT}/`);
    await sleep(1500);
    check('boots to Title', (await page.evaluate(() => window.__FP_SCENE)) === 'Title');
    await page.screenshot({ path: `${SHOT_DIR}/1-title${MOBILE ? '-mobile' : ''}.png` });

    if (MOBILE) await page.touchscreen.tap(370, 180);
    else await page.keyboard.press('Enter');
    await sleep(700);
    check('tank select opens', (await page.evaluate(() => window.__FP_SCENE)) === 'Select');
    await page.screenshot({ path: `${SHOT_DIR}/2-select${MOBILE ? '-mobile' : ''}.png` });

    if (MOBILE) {
      // tap the tank preview (canvas center-ish, scaled: canvas fills width)
      const canvas = await page.locator('canvas').boundingBox();
      await page.touchscreen.tap(canvas.x + canvas.width / 2, canvas.y + canvas.height * 0.32);
    } else {
      await page.keyboard.press('Enter');
    }
    await sleep(1200);
    check('battle starts', (await page.evaluate(() => window.__FP_SCENE)) === 'Battle');

    const s0 = await page.evaluate(() => window.__FP_STATE);
    check('battle state exposed', !!s0, JSON.stringify(s0));

    if (!MOBILE && s0) {
      // drive forward (facing north) for 1.5s
      await page.keyboard.down('ArrowUp');
      await sleep(1500);
      await page.keyboard.up('ArrowUp');
      const s1 = await page.evaluate(() => window.__FP_STATE);
      check('tank moves', s1.y < s0.y, `y ${s0.y} -> ${s1.y}`);
      check('fuel burns', s1.fuel < s0.fuel, `fuel ${s0.fuel} -> ${s1.fuel}`);

      // fire cannon + MG (hold keys across several frames)
      await page.keyboard.down('Space');
      await sleep(150);
      await page.keyboard.up('Space');
      await page.keyboard.down('Shift');
      await sleep(400);
      await page.keyboard.up('Shift');
      await sleep(200);
      const s2 = await page.evaluate(() => window.__FP_STATE);
      check('cannon fires', s2.shells < s1.shells, `shells ${s1.shells} -> ${s2.shells}`);
      check('mg fires', s2.mg < s1.mg, `mg ${s1.mg} -> ${s2.mg}`);

      // regression: enemy shell hitting the player must damage it, not crash.
      // Park the tank in the open keep courtyard so the shell's path is clear.
      await page.evaluate(() => {
        const b = window.__FP.scene.getScene('Battle');
        b.player.body.reset(1296, 1936);
        b.spawnShell(b.player.x, b.player.y - 60, Math.PI / 2, 'enemy');
      });
      await sleep(1000);
      const s3 = await page.evaluate(() => window.__FP_STATE);
      const alive = await page.evaluate(() => {
        const b = window.__FP.scene.getScene('Battle');
        return b.player.active && !!b.player.body;
      });
      check('enemy shell damages player', s3.hp < s2.hp, `hp ${s2.hp} -> ${s3.hp}`);
      check('player survives the hit intact', alive);
    }
    await sleep(400);
    await page.screenshot({ path: `${SHOT_DIR}/3-battle${MOBILE ? '-mobile' : ''}.png` });

    check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
    await browser.close();
  } finally {
    try {
      process.kill(-server.pid);
    } catch { /* already gone */ }
  }

  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll checks passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
