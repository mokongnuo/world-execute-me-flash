/* Load the runtime headlessly (no canvas) and interrogate the world layer.
   This is the quick check that the concept-critical part behaves: the joint
   count must fall to zero during the purge and then rise again, because the
   last three seconds of the song write on the clean board. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = global;
const ROOT = path.join(__dirname, '..');
const files = [
  'assets/onsets.js', 'assets/waveform.js', 'assets/cues.js', 'assets/personas.js',
  'src/00_core.js', 'src/01_world.js', 'src/20_lyrics.js', 'src/10_draw.js',
  'src/15_sceneapi.js', 'src/30_world.js'
];
for (const f of files) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });

const EM = global.EM;
EM.clock = EM.C.makeClock(EM.ONSETS);

console.log('cues            :', EM.Lyrics.count, ' duration:', EM.Lyrics.duration.toFixed(3));
console.log('accents         :', EM.ONSETS.length);
console.log('personas        :', EM.PERSONAS.length);
console.log('anchors         :', EM.WORLD_ANCHORS);
console.log('');

const probes = [0, 29.7, 69.3, 110, 147.7, 177, 193.46, 196, 200, 203.5, 205, 206.6, 211.9];
console.log('   t        struct chaos warm heat love purge  joints  topo      alarm');
for (const t of probes) {
  const w = EM.world(t);
  const n = EM.remainingJoints(t);
  console.log(
    '  ' + String(t).padEnd(8) +
    w.struct.toFixed(2) + '   ' + w.chaos.toFixed(2) + '  ' + w.warm.toFixed(2) + ' ' +
    w.heat.toFixed(2) + ' ' + w.love.toFixed(2) + '  ' + w.purge.toFixed(2) + '   ' +
    String(n).padStart(4) + '   ' + w.topo.padEnd(8) + '  ' + w.alarm);
}

console.log('');
const zero = [];
for (let t = 193; t <= 212; t += 0.25) if (EM.remainingJoints(t) === 0) zero.push(t);
console.log('joints reach 0 between   :', zero.length ? zero[0].toFixed(2) + ' s and ' + zero[zero.length - 1].toFixed(2) + ' s' : 'NEVER');
console.log('joints at the very end   :', EM.remainingJoints(211.98));

console.log('');
console.log('the nine, at the last LO-O-OVE (191.4 s):');
for (const p of EM.PERSONAS) {
  const st = EM.personaStateAt(p.id, 191.4);
  console.log('   ' + p.cn.padEnd(12) + (st.worn ? 'WORN' : st.cooling ? 'cooling' : st.used ? 'used' : 'never worn') +
    (st.released ? '  released' : ''));
}
console.log('');
console.log('the nine, after the purge (205 s):');
for (const p of EM.PERSONAS) {
  const st = EM.personaStateAt(p.id, 205);
  console.log('   ' + p.cn.padEnd(12) + (st.released ? 'RELEASED (blank socket)' : 'still present'));
}
