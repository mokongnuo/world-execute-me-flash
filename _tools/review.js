/* Render the actual browser compositor for every scene, plus editorial seams.
   Usage: node _tools/review.js [--key] [--story] [--out=dist/review-v3-final]
                                  [--chrome=PATH] */
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
const { findChrome } = require('./browser');
const ROOT = path.resolve(__dirname, '..');
const outFlag = process.argv.find(a => a.startsWith('--out='));
const chromeFlag = process.argv.find(a => a.startsWith('--chrome='));
const chrome = findChrome(chromeFlag && chromeFlag.slice(9));
const OUT = path.resolve(ROOT, outFlag ? outFlag.slice(6) : 'dist/review-v3-final');
if (!OUT.startsWith(path.join(ROOT, 'dist') + path.sep)) throw Error('Review output must stay inside dist');
if (!chrome) throw Error('Chrome or Edge not found; pass --chrome=PATH or set CHROME_PATH');
const keyOnly = process.argv.includes('--key');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true,
    executablePath: chrome,
    args: ['--allow-file-access-from-files', '--disable-gpu', '--mute-audio'] });
  const errors = [], manifest = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href + '?t=0&audio=0&ui=0');
    await page.waitForFunction(() => document.title.startsWith('still '));
    const cues = await page.evaluate(() => EM.Lyrics.cues.map(c =>
      ({ scene: c.scene, t: c.t, end: c.end, held: c.held })));
    const keyTimes = [0.4, 3.4, 9, 15.9, 18.35, 25.5, 34.7, 45.2, 61.5, 76.5,
      84, 87.5, 94.9, 106, 114.9, 118.7, 120.3, 123.5, 128.8, 141.5,
      148.0, 152.6, 158.3, 164.3, 174.4, 174.974, 174.976, 176.2,
      184.1, 190.5, 199.9, 202.5, 204.4, 206.3, 207.2, 209, 211.7];
    if (process.argv.includes('--story')) keyTimes.push(32.9, 36.5, 40.2, 43.8,
      46.8, 48.3, 50.5, 54.3, 58, 65.8, 68.8, 78.5, 82, 86, 90.8, 94.6,
      98.1, 102.2, 109.7, 111.1, 113.7, 116.9, 126.9, 130.5, 132.5,
      177.8, 179.1, 182.8, 186, 188.7, 192.3);
    const samples = keyTimes.map((t, i) => ({ t, scene: 'key-' + String(i).padStart(2, '0') }));
    if (!keyOnly) for (const c of cues) if (!c.held && c.t < 211.98)
      samples.push({ t: c.t + (c.end - c.t) * 0.55, scene: c.scene });
    for (const sample of samples) {
      const data = await page.evaluate(t => EM.renderAt(t, 'image/png'), sample.t);
      const file = sample.scene + '.png';
      fs.writeFileSync(path.join(OUT, file), Buffer.from(data.split(',')[1], 'base64'));
      manifest.push({ ...sample, file });
    }
    const faults = await page.evaluate(() => EM.plateFaults);
    // Revisit frames out of order: no scene may depend on what played before it.
    const deterministic = await page.evaluate(() => {
      const times = [36.5, 82, 116.9, 132.5, 186, 50.5];
      const first = times.map(t => EM.renderAt(t, 'image/png'));
      for (let i = times.length - 1; i >= 0; i--)
        if (first[i] !== EM.renderAt(times[i], 'image/png')) return false;
      return true;
    });
    fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('Rendered ' + manifest.length + ' frames to ' + OUT);
    if (errors.length || faults.length) throw Error(JSON.stringify({ errors, faults }));
    if (!deterministic) throw Error('Story scenes depend on seek order');
    console.log('Browser runtime: no page errors or plate faults');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
