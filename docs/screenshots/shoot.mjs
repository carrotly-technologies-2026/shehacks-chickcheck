// Retina screenshots of every screen, plus the pitch hero image.
// Needs: the web build running (npm run web), chromium and ffmpeg on PATH.
// usage: node docs/screenshots/shoot.mjs [baseUrl] [chromiumPath]
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE = process.argv[2] ?? 'http://localhost:8081';
const CHROMIUM = process.argv[3] ?? '/usr/bin/chromium';
const OUT = dirname(fileURLToPath(import.meta.url));
const FEED = join(OUT, '..', 'demo-feed');
const TMP = mkdtempSync(join(tmpdir(), 'chickcheck-'));
const DSF = 3;

// still photo -> short looping y4m clip for Chromium's fake webcam
function feed(name, filter) {
  const out = join(TMP, `${name}.y4m`);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-loop', '1', '-i', join(FEED, `${name}.jpg`), '-t', '1', '-r', '6', '-vf', filter, '-pix_fmt', 'yuv420p', out]);
  return out;
}
const portrait = 'scale=-2:1280,crop=720:1280';
const FEEDS = { front: feed('front', portrait), raised: feed('raised', portrait), palpate: feed('palpate', 'scale=1280:-2') };

const GL = ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader'];
const cam = (file) => ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${file}`];

async function shoot(name, route, { wait = 2500, video, act } = {}) {
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: [...GL, ...(video ? cam(video) : [])] });
  const page = await browser.newPage({ viewport: { width: 417, height: 876 }, deviceScaleFactor: DSF });
  await page.goto(`${BASE}${route}${route.includes('?') ? '&' : '?'}bare`, { waitUntil: 'networkidle' });
  if (act) await act(page);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  await browser.close();
  console.log('✓', name);
}

await shoot('01-welcome', '/', { wait: 4500 });
await shoot('02-about', '/about', { wait: 6500 });
await shoot('03-prepare', '/prepare');
await shoot('04-method', '/method', { wait: 3200 });
await shoot('05-exam-front-ai', '/exam?step=1', { video: FEEDS.front, wait: 7000 });
await shoot('06-exam-raised-ai', '/exam?step=2', { video: FEEDS.raised, wait: 7000 });
await shoot('07-exam-palpation-ai', '/exam?step=4', { video: FEEDS.palpate, wait: 8000 });
await shoot('08-exam-palpation-demo', '/exam?step=4&demo=1', { wait: 10500 });
await shoot('09-result', '/result', { wait: 2000 });
await shoot('10-home', '/home');
await shoot('11-log', '/log');
await shoot('12-log-entry', '/log-new', {
  act: async (page) => {
    const maps = page.getByLabel('Mapa piersi: dotknij, aby zaznaczyć miejsce');
    const r = await maps.nth(1).boundingBox();
    await page.mouse.click(r.x + r.width * 0.74, r.y + r.height * 0.3);
    await page.getByText('Guzek', { exact: true }).click();
    await page.getByText('Lekki', { exact: true }).click();
  },
});
await shoot('13-tips', '/tips');

// pitch hero: rendered from hero.html next to this script
const browser = await chromium.launch({ executablePath: CHROMIUM, args: GL });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
await page.goto(`file://${join(OUT, 'hero.html')}`);
await page.waitForTimeout(800);
await page.screenshot({ path: join(OUT, 'hero.png') });
await browser.close();
console.log('✓ hero');
