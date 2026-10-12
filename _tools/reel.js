/* ============================================================================
   _tools/reel.js - turn the film back into a moving picture.

   The film is a pure function of t, so a "recording" is just a list of instants.
   This prints that list, packed into contact sheets of 12 frames each, which
   _tools/reel.ps1 photographs and _tools/assemble.py cuts back apart into an
   animated reel.

   Usage:  node _tools/reel.js     -> one "reel/sheetNN.png|t,t,t,..." per line,
                                      and the manifest on stderr.
   ========================================================================== */
'use strict';

/* [label, from, to, fps] - the passages that show what changed this round */
const CLIPS = [
  ['boot-1', 16.00, 19.60, 12],   /* the instrumental's first two shots      */
  ['boot-2', 22.80, 26.40, 12],   /* the pad-field wave, then the hard cut   */
  ['flash', 37.10, 38.10, 20],    /* her overexposure, at 20 fps because the
                                     flash lives for about a fifth of a second */
  ['left', 112.20, 116.60, 12],   /* the five "You have left" lines          */
  ['end', 205.90, 208.30, 12]     /* the origin, then the replay opens       */
];

/* argv: [reel|full] [fps] [cw] [per] */
const mode = process.argv[2] || 'reel';
const args = process.argv.slice(3).map(Number);
const FPS = mode === 'full' ? (args[0] || 12) : 0;
const CW = mode === 'full' ? (args[1] || 800) : 800;
const PER = mode === 'full' ? (args[2] || 24) : 12;
const CH = Math.round(CW * 9 / 16);
const COLS = PER <= 12 ? 4 : 6;
const ROWS = Math.ceil(PER / COLS);
const END = 211.98367;

const all = [];
if (mode === 'full') {
  /* the whole film, one frame every 1/FPS, at 0.5 s INSIDE each frame's window
     so the first shot is not missed and the last is not past the audio */
  const ts = [];
  for (let t = 0; t < END - 1e-9; t += 1 / FPS) ts.push(+t.toFixed(4));
  all.push({ name: 'film', ts: ts, dur: Math.round(1000 / FPS) });
} else {
  for (const c of CLIPS) {
    const name = c[0], from = c[1], to = c[2], fps = c[3];
    const ts = [];
    for (let t = from; t < to - 1e-9; t += 1 / fps) ts.push(+t.toFixed(4));
    all.push({ name: name, ts: ts, dur: Math.round(1000 / fps) });
  }
}

/* one sheet per 12 frames, and a sheet never spans two clips, so each clip
   keeps its own frame rate */
let n = 0;
const manifest = [];
for (const clip of all) {
  for (let i = 0; i < clip.ts.length; i += PER) {
    const chunk = clip.ts.slice(i, i + PER);
    const count = chunk.length;
    while (chunk.length < PER) chunk.push(chunk[chunk.length - 1]);
    n++;
    const file = 'sheet' + (n < 10 ? '0' : '') + n + '.png';
    manifest.push({ file: file, count: count, dur: clip.dur, clip: clip.name });
    console.log('reel/' + file + '|' + chunk.join(','));
  }
}
console.error(JSON.stringify({ cols: COLS, rows: ROWS, cw: CW, ch: CH, sheets: manifest }));
