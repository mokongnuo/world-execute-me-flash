/* Why would the same t render differently when visited out of order?
   This finds the first place two log streams diverge and prints the calls
   around it, which is the fastest way to see the leak rather than guess at it. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeCtx } = require('./stub.js');

global.window = global;
const ROOT = path.join(__dirname, '..');
for (const f of [
  'assets/onsets.js', 'assets/waveform.js', 'assets/cues.js', 'assets/personas.js',
  'src/00_core.js', 'src/01_world.js', 'src/07_motion.js', 'src/10_draw.js', 'src/05_persona_grammar.js',
  'src/20_lyrics.js', 'src/15_sceneapi.js', 'src/30_world.js',
  'src/35_motifs.js', 'src/36_motifs2.js', 'src/40_plates.js', 'src/50_selftest.js'
]) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });

const EM = global.EM;
EM.clock = EM.C.makeClock(EM.ONSETS);
EM.img = {};

function logAt(t) {
  const log = [];
  const D = EM.newDraw(makeCtx(log));
  const S = EM.drawWorldLayer(D, t);
  EM.drawWorn(D, S);
  try { EM.drawSequence(D, t, S); } catch (e) { log.push('THREW ' + e.message); }
  EM.drawRegisters(D, S);
  return log;
}

const N = 96, times = [];
for (let i = 0; i < N; i++) times.push(EM.AUDIO_END * (i + 0.5) / N);
const A = times.map(logAt);
const order = times.map((_, i) => i);
for (let i = order.length - 1; i > 0; i--) {
  const j = EM.C.hash01(i, 991) * (i + 1) | 0;
  const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
}
const uniq = new Set(order);
console.log('permutation ok:', uniq.size === N, '(size ' + uniq.size + ')');
const B = new Array(N).fill(null);
for (const idx of order) if (B[idx] === null) B[idx] = logAt(times[idx]);

const bad = [];
for (let i = 0; i < N; i++) {
  if (!A[i] || !B[i]) { console.log('missing log at', i, !!A[i], !!B[i]); continue; }
  if (A[i].join('|') !== B[i].join('|')) bad.push(i);
}
console.log('differing frames:', bad.length, '->', bad.slice(0, 40).join(' '));

for (const i of bad.slice(0, 3)) {
  console.log('\n--- frame ' + i + '  t=' + times[i].toFixed(3) +
    '  scene=' + (EM.Lyrics.at(times[i]) || {}).scene);
  const a = A[i], b = B[i];
  console.log('  log lengths: ' + a.length + ' vs ' + b.length);
  for (let k = 0; k < Math.max(a.length, b.length); k++) {
    if (a[k] !== b[k]) {
      console.log('  first divergence at call #' + k);
      console.log('    ordered   : ' + a.slice(Math.max(0, k - 2), k + 3).join(' | '));
      console.log('    shuffled  : ' + b.slice(Math.max(0, k - 2), k + 3).join(' | '));
      break;
    }
  }
}
