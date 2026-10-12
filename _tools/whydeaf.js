/* scratch: replicate check.js section 12's per-plate test and show, sample by
   sample, whether a plate's output moves when the performance is perturbed. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
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

function plateHash(id, t, perturb) {
  const saved = { O: EM.ONSETS, M: EM.MIDI, K: EM.clock };
  if (perturb) {
    const O2 = EM.ONSETS.map((a) => a.slice());
    for (let i = 0; i < O2.length; i++) {
      O2[i][4] = 128 - O2[i][4];
      O2[i][1] += 7; O2[i][2] += 7;
      O2[i][3] = Math.min(4, O2[i][3] + 1);
      O2[i][0] = Math.max(0, O2[i][0] + ((i % 7) - 3) * 55);
    }
    EM.ONSETS = O2;
    EM.MIDI = Object.assign({}, saved.M, { pitchLo: saved.M.pitchLo + 7, pitchHi: saved.M.pitchHi + 7 });
    EM.clock = EM.C.makeClock(O2);
  }
  const log = [];
  const D = EM.newDraw(makeCtx(log));
  try { EM.plates[id](D, EM.state(t)); } catch (e) { log.push('THREW ' + e.message); }
  const h = crypto.createHash('sha1').update(log.join('|')).digest('hex');
  EM.ONSETS = saved.O; EM.MIDI = saved.M; EM.clock = saved.K;
  return h;
}

for (const id of process.argv.slice(2)) {
  const cue = L.byScene[id];
  if (!cue) { console.log(id + ' — no cue'); continue; }
  const insideWindow = EM.clock.notesBetween(cue.t, Math.min(cue.end, cue.t + 2.0));
  const ts = [], why = [];
  if (insideWindow.length) {
    ts.push(insideWindow[0].ms + 0.02); why.push('note0 idx' + insideWindow[0].i);
    ts.push(insideWindow[Math.floor(insideWindow.length / 2)].ms + 0.02); why.push('noteMid');
    ts.push(insideWindow[insideWindow.length - 1].ms + 0.02); why.push('noteLast');
  }
  ts.push(cue.t + cue.dur * 0.25); why.push('q25');
  ts.push(cue.t + cue.dur * 0.5); why.push('q50');
  ts.push(cue.t + cue.dur * 0.75); why.push('q75');
  console.log('\n' + id + '  t=' + cue.t.toFixed(3) + '  dur=' + cue.dur.toFixed(3) +
    '  notesInBuildWindow=' + insideWindow.length);
  let any = false;
  ts.forEach((t, i) => {
    if (t <= cue.t || t >= EM.AUDIO_END) return;
    const a = plateHash(id, t, false), b = plateHash(id, t, true);
    const diff = a !== b;
    if (diff) any = true;
    const S = EM.state(t);
    console.log('  t=' + t.toFixed(3) + ' ' + why[i].padEnd(9) +
      (diff ? ' MOVES' : ' same ') +
      '  p=' + S.p.toFixed(3) + ' beat=' + (S.beat + 1) + ' pitch=' + S.pitch + ' vel=' + S.velocity +
      ' pulse=' + S.beatPulse.toFixed(3));
  });
  console.log('  => ' + (any ? 'RESPONDS' : 'DEAF'));
}
