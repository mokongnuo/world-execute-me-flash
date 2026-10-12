/* ============================================================================
   _tools/scoretable.js - the running order, read back off the screen.

   Prints one line per cue: the measured time, the sung line, the motif the
   score gave it and with what options, and the words the frame actually puts
   on the screen. Two columns that disagree are the only way to see whether the
   picture is answering the line, so both are printed rather than the intent.

   Usage:  node _tools/scoretable.js            (all 131)
           node _tools/scoretable.js 100 140    (a slice of the film)
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeCtx } = require('./stub.js');

global.window = global;
const ROOT = path.join(__dirname, '..');
const SRC = [
  'assets/onsets.js', 'assets/waveform.js', 'assets/cues.js', 'assets/personas.js',
  'src/00_core.js', 'src/01_world.js', 'src/07_motion.js', 'src/10_draw.js', 'src/05_persona_grammar.js',
  'src/20_lyrics.js', 'src/15_sceneapi.js', 'src/30_world.js',
  'src/35_motifs.js', 'src/36_motifs2.js', 'src/40_plates.js', 'src/50_selftest.js'
];
for (const f of SRC) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
const EM = global.EM;
EM.clock = EM.C.makeClock(EM.ONSETS);
EM.img = {};
const L = EM.Lyrics;

const FT = /^ft\((.*),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)$/;
function wordsOnScreen(t) {
  const log = [];
  const D = EM.newDraw(makeCtx(log));
  const S = EM.drawWorldLayer(D, t);
  EM.drawWorn(D, S);
  try { EM.drawSequence(D, t, S); } catch (e) { /* reported elsewhere */ }
  EM.drawLyric(D, S);
  const out = [];
  for (const s of log) {
    const m = FT.exec(s);
    if (!m) continue;
    const w = m[1].toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
    if (w.length < 4) continue;
    if (out.indexOf(w) < 0) out.push(w);
  }
  return out;
}

const from = process.argv[2] ? +process.argv[2] : 0;
const to = process.argv[3] ? +process.argv[3] : 1e9;
for (const c of L.cues) {
  if (c.t < from || c.t > to) continue;
  const e = EM.SCORE[c.scene] || [];
  const o = e[1] ? JSON.stringify(e[1]).replace(/"/g, '') : '';
  const t = c.t + Math.max(0.05, c.dur * 0.62);
  const words = c.held ? ['(held - no plate)'] : wordsOnScreen(Math.min(t, EM.AUDIO_END - 0.05));
  console.log(
    String(c.i).padStart(3) + '  ' +
    c.t.toFixed(2).padStart(7) + '  ' +
    c.act.padEnd(4) + '  ' +
    (c.held ? 'HELD ' : (e[0] || '?????').padEnd(14)) + '  ' +
    ('"' + c.text + '"').padEnd(42) + '  ' +
    (o.length > 30 ? o.slice(0, 30) + '..' : o.padEnd(32)) + '  ' +
    words.join(' / ')
  );
}
