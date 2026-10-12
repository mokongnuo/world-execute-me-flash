/* scratch: print the drawWorn call stream for one instant, so a bad frame can be
   read instead of guessed at. */
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
/* the faces are images; stand in with a fake that reports a size, so faceCanvas
   cannot build one — which is exactly what the film does when no art is loaded */
EM.img = {};
for (const t of process.argv.slice(2).map(Number)) {
  const log = [];
  const D = EM.newDraw(makeCtx(log));
  const S = EM.state(t);
  EM.drawWorn(D, S);
  const di = log.filter((s) => s.indexOf('di(') === 0);
  const tf = log.filter((s) => s.indexOf('tf(') === 0);
  console.log('t=' + t + '  scene=' + S.scene + '  p=' + S.p.toFixed(3) +
    '  scale=' + (S.subjectScale || 0).toFixed(3) +
    '  entries=' + log.length + '  drawImage=' + di.length + '  transform=' + tf.length);
  console.log('   ' + di.slice(0, 6).join(' | '));
  console.log('   world: ' + JSON.stringify(EM.world(t)));
}
