/* TEMPORARY diagnostic for the offer shapes. Delete after use. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeCtx } = require('./stub.js');
global.window = global;
const ROOT = path.join(__dirname, '..');
for (const f of [
  'assets/onsets.js', 'assets/waveform.js', 'assets/cues.js', 'assets/personas.js', 'assets/figures.js',
  'src/00_core.js', 'src/01_world.js', 'src/07_motion.js', 'src/10_draw.js', 'src/05_persona_grammar.js',
  'src/20_lyrics.js', 'src/15_sceneapi.js', 'src/30_world.js',
  'src/35_motifs.js', 'src/36_motifs2.js', 'src/40_plates.js', 'src/50_selftest.js'
]) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
const EM = global.EM;
EM.clock = EM.C.makeClock(EM.ONSETS);
EM.img = {};
EM.MIDI = EM.MIDI || { pitchLo: 55, pitchHi: 79 };
for (const t of process.argv.slice(2).map(Number)) {
  const S = EM.state(t);
  const log = [];
  const D = EM.newDraw(makeCtx(log));
  try { EM.drawLyricImage(D, S); } catch (e) { console.log('THREW ' + e.message); }
  const pads = log.filter((l) => l.startsWith('pad(') || l.startsWith('di(') || l.startsWith('disc('));
  console.log('--- t=' + t + '  cue=' + S.scene + '  text=' + JSON.stringify(S.text) +
    '  ops=' + log.length + '  pads=' + pads.length);
  console.log('    ' + pads.slice(0, 12).join(' | '));
  console.log('    ' + log.filter((l) => l.startsWith('ft(')).slice(0, 6).join(' | '));
}
