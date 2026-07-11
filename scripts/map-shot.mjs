// Whole-map overview screenshot for layout review
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const PORT = 4173;
const OUT = process.env.OUT || 'map-overview.png';
const chrome = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium']
  .find((c) => existsSync(c));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: '/home/user/firepower', stdio: 'ignore', detached: true
});
try {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch {}
    await sleep(250);
  }
  const browser = await chromium.launch({ executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
  await page.goto(`http://localhost:${PORT}/`);
  await sleep(1500);
  await page.keyboard.press('Enter');
  await sleep(600);
  await page.keyboard.press('Enter');
  await sleep(1200);
  const view = {
    zoom: Number(process.env.ZOOM || 288 / 2560), // default: whole world in the viewport
    cx: Number(process.env.CX || 1280),
    cy: Number(process.env.CY || 1280)
  };
  await page.evaluate((v) => {
    const b = window.__FP.scene.getScene('Battle');
    const cam = b.cameras.main;
    cam.stopFollow();
    cam.setZoom(v.zoom);
    cam.centerOn(v.cx, v.cy);
  }, view);
  await sleep(400);
  await page.screenshot({ path: OUT });
  await browser.close();
  console.log('saved', OUT);
} finally {
  try { process.kill(-server.pid); } catch {}
}
