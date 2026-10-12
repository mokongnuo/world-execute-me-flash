/* scratch: the time to photograph each registered plate at, so a contact-sheet
   sweep covers the whole running order. Mid-line, where its own entrance has
   finished and its exit has not started. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
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
const L = EM.Lyrics;
const rows = [];
for (const id of Object.keys(EM.plates)) {
  const cue = L.byScene[id];
  if (!cue) { rows.push([id, 1, 'NO CUE']); continue; }
  const t = Math.min(EM.AUDIO_END - 0.05, cue.t + cue.dur * 0.62);
  rows.push([id, t, cue.scene]);
}
rows.sort((a, b) => a[1] - b[1]);
const ts = rows.map((r) => r[1].toFixed(2));
const CHUNK = 12;
for (let i = 0; i < ts.length; i += CHUNK) {
  console.log((i / CHUNK + 1) + '|' + ts.slice(i, i + CHUNK).join(','));
}
console.log('TOTAL ' + ts.length);
