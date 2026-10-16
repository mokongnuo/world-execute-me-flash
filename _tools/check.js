/* ============================================================================
   _tools/check.js — the film's own invariants, headlessly.

   Coverage here counts PRIMITIVES, not registrations. A check that only
   verifies "a plate is registered" once reported 100% while every plate was
   throwing and nothing was drawn.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { makeCtx } = require('./stub.js');

global.window = global;
const ROOT = path.join(__dirname, '..');
const SRC = [
  'assets/onsets.js', 'assets/waveform.js', 'assets/cues.js', 'assets/translation.js', 'assets/personas.js',
  'src/00_core.js', 'src/01_world.js', 'src/07_motion.js', 'src/10_draw.js', 'src/05_persona_grammar.js',
  'src/20_lyrics.js', 'src/15_sceneapi.js', 'src/30_world.js',
  'src/35_motifs.js', 'src/36_motifs2.js', 'src/37_story.js', 'src/38_offers.js',
  'src/39_identity.js', 'src/41_resolve.js', 'src/40_plates.js', 'src/50_selftest.js'
];
for (const f of SRC) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { console.error('missing ' + f); process.exit(1); }
  vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: f });
}
const EM = global.EM;
EM.clock = EM.C.makeClock(EM.ONSETS);
EM.img = {};                       /* no images headlessly; plates must cope */

let fails = 0, warns = 0;
const ok = (m) => console.log('  ok   ' + m);
const bad = (m) => { console.log('  FAIL ' + m); fails++; };
const warn = (m) => { console.log('  warn ' + m); warns++; };

console.log('='.repeat(78));
console.log('  exe-mv — verification');
console.log('='.repeat(78));

/* ---------- 1. every cue resolves to a plate that exists ---------- */
console.log('\n-- 1. SCORE vs TIMELINE --');
const L = EM.Lyrics;
let held = 0, own = 0, unresolved = [];
for (const c of L.cues) {
  if (c.held) { held++; continue; }
  own++;
  if (!EM.plates[c.scene]) unresolved.push(c.i + ' ' + c.scene);
}
if (unresolved.length) bad('cues with no plate: ' + unresolved.slice(0, 6).join(', '));
else ok('every cue resolves to a plate  —  ' + own + ' with their own, ' + held + ' held');
if (EM.scoreMissing.length) bad('score names a missing motif: ' + EM.scoreMissing.join(', '));
else ok('every motif named in the score exists  —  ' + Object.keys(EM.SCORE).length + ' rows');

/* every registered plate is reachable from a cue */
const used = Object.create(null);
for (const c of L.cues) if (!c.held) used[c.scene] = true;
const orphan = Object.keys(EM.plates).filter((k) => !used[k]);
if (orphan.length) warn('reachable from no cue: ' + orphan.join(', '));
else ok('all ' + Object.keys(EM.plates).length + ' registered plates are reachable');

/* ---------- 2. duration and accents ---------- */
console.log('\n-- 2. MEASURED INPUTS --');
ok('audio length measured  —  ' + EM.AUDIO_END.toFixed(5) + ' s from ' + EM.AUDIO_FRAMES + ' MPEG frames');
ok('accents  —  ' + EM.ONSETS.length + ' from the MIDI, ' + EM.MIDI.bpm.join('/') + ' BPM');
let mono = true;
for (let i = 1; i < EM.ONSETS.length; i++) if (EM.ONSETS[i][0] < EM.ONSETS[i - 1][0]) mono = false;
mono ? ok('accents are in time order') : bad('accents are out of order');
const lastCue = L.cues[L.cues.length - 1];
Math.abs((lastCue.t + (L.cues[L.cues.length - 2].held ? 0 : 0)) - EM.AUDIO_END) < 0.01
  ? ok('the final cue holds to the audio end') : warn('final cue is ' + (EM.AUDIO_END - lastCue.t).toFixed(3) + ' s from the end');

/* ---------- 3. every plate runs AND draws ---------- */
console.log('\n-- 3. EVERY PLATE RUNS AND PUTS INK ON THE CANVAS --');
const ids = Object.keys(EM.plates);
let throws = 0, thin = [], totalInk = 0, minInk = 1e9, minId = '';
for (const id of ids) {
  let best = 0;
  for (const p of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    const cue = L.byScene[id];
    const t = cue ? cue.t + Math.max(0.001, cue.dur * p) : 1;
    const log = [];
    const ctx = makeCtx(log);
    const D = EM.newDraw(ctx);
    try { EM.plates[id](D, EM.state(t)); } catch (e) { throws++; bad(id + ' threw: ' + e.message); break; }
    best = Math.max(best, D.ink);
  }
  totalInk += best;
  if (best < minInk) { minInk = best; minId = id; }
  if (best < 8) thin.push(id + '(' + best + ')');
}
if (throws === 0) ok('every plate runs without throwing  —  ' + ids.length + ' plates x 6 progress points');
if (thin.length) warn('suspiciously thin plates: ' + thin.join(', '));
else ok('every plate puts ink on the canvas  —  min ' + minInk + ' (' + minId + '), mean ' + Math.round(totalInk / ids.length));

/* ---------- 4. the scene registry recorded no faults ---------- */
console.log('\n-- 4. RUNTIME FAULTS --');
EM.plateFaults.length ? bad('plate faults: ' + JSON.stringify(EM.plateFaults.slice(0, 4)))
  : ok('the scene registry recorded no faults');

/* ---------- 5. determinism: same t, same call stream ---------- */
console.log('\n-- 5. DETERMINISM (the seek-safety proof) --');
function hashAt(t) {
  const log = frameLog(t);
  return crypto.createHash('sha1').update(log.join('|')).digest('hex');
}
const times = [];
for (let i = 0; i < 96; i++) times.push(EM.AUDIO_END * (i + 0.5) / 96);
const first = times.map(hashAt);
const again = times.map(hashAt);
let same = 0;
for (let i = 0; i < times.length; i++) if (first[i] === again[i]) same++;
same === times.length ? ok('the same t renders identically on a repeat pass  —  ' + same + ' frames hashed and matched')
  : bad('only ' + same + '/' + times.length + ' frames reproduced');

/* ---------- 6. shuffled seek ---------- */
console.log('\n-- 6. SEEKING --');
const order = times.map((_, i) => i);
/* a deterministic shuffle: no Math.random in a verifier either */
for (let i = order.length - 1; i > 0; i--) {
  const j = EM.C.hash01(i, 991) * (i + 1) | 0;
  const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
}
let matched = 0;
for (const idx of order) if (hashAt(times[idx]) === first[idx]) matched++;
matched === times.length ? ok('a shuffled seek reproduces every frame  —  ' + matched + ' visited out of order, all identical')
  : bad('shuffled seek reproduced only ' + matched + '/' + times.length);

/* end -> start -> end */
const hEnd = hashAt(EM.AUDIO_END - 0.02);
hashAt(0.4);
hashAt(EM.AUDIO_END - 0.02) === hEnd ? ok('seeking end -> start -> end returns the same frame')
  : bad('end frame changed after a round trip');

/* ---------- 7. no still frames ---------- */
console.log('\n-- 7. NO STILL FRAMES --');
let identical = 0, samples = 0, prev = null;
for (let t = 0; t < EM.AUDIO_END; t += 0.2) {
  const h = hashAt(t);
  if (prev !== null && h === prev) identical++;
  prev = h; samples++;
}
identical === 0 ? ok('no frame repeats the one before it  —  ' + samples + ' samples, 0 identical')
  : warn(identical + ' of ' + samples + ' samples are byte-identical to the previous frame');

/* ---------- 8. the world layer says what we designed ---------- */
console.log('\n-- 8. THE SUBSTRATE --');
const peak = EM.remainingJoints(193.46);
const mid = EM.remainingJoints(200);
const clean = EM.remainingJoints(203.9);
const after = EM.remainingJoints(207);
peak > 500 ? ok('the board accumulates what was played to it  —  ' + peak + ' joints at 3:13')
  : bad('joints never accumulate (' + peak + ')');
EM.frontX(EM.world(200)) > 0 && mid < peak ? ok('the self-purge takes them  —  ' + mid + ' left at 3:20')
  : bad('the purge does not remove joints');
clean === 0 ? ok('the board is empty at 3:24  —  0 joints') : bad('board not empty after the purge: ' + clean);
after > 0 ? ok('and the last seconds write on it again  —  ' + after + ' new joints')
  : warn('nothing was written after the purge');
let releasedAll = true;
for (const p of EM.PERSONAS) if (!EM.personaStateAt(p.id, 205).released) releasedAll = false;
releasedAll ? ok('all nine identities are released by 3:25') : bad('an identity survived the purge');

/* ---------- 9. every M.*() named in the plates exists ---------- */
console.log('\n-- 9. STATIC CHECK --');
const motifs = Object.keys(EM.M);
const badMotif = motifs.filter((k) => typeof EM.M[k] !== 'function');
if (badMotif.length) bad('M.' + badMotif.join(', M.') + ' is not a function');
else ok('every M.*() used by a plate exists  —  ' + motifs.length + ' motifs');
const grammars = Object.keys(EM.GRAMMAR);
grammars.length === 9 ? ok('nine persona grammars, each with a law and a curve budget')
  : bad('expected 9 grammars, found ' + grammars.length);

/* ---------- 10. the frame does not move ---------- */
console.log('\n-- 10. THE FRAME IS NAILED DOWN --');
/* The board is drawn first, and its pad grid is a fixed set of coordinates.
   If any whole-frame transform existed, adjacent instants would report
   different coordinates for the SAME pads. They must not. */
function boardCoords(t) {
  const log = [];
  const D = EM.newDraw(makeCtx(log));
  EM.drawWorldLayer(D, t);
  return log.slice(0, 273 * 2).join('|');
}
let moved = 0;
for (const t of [12.0, 30.0, 44.5, 74.1, 148.0, 178.0, 200.0]) {
  if (boardCoords(t) !== boardCoords(t + 0.4)) moved++;
}
moved === 0
  ? ok('the substrate does not shift between instants  —  7 pairs, identical coordinates')
  : bad(moved + ' of 7 samples moved the board');

/* and no plate may translate the origin of the frame */
const srcAll = ['35_motifs.js', '36_motifs2.js', '40_plates.js'].map(function (f) {
  return fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
}).join('\n');
const offenders = srcAll.match(/translate\(\s*EM\.W\s*\/\s*2\s*,\s*EM\.H\s*\/\s*2\s*\)/g);
offenders ? warn('a plate pivots the whole stage: ' + offenders.length + ' site(s)')
  : ok('no plate carries a whole-stage transform');

/* ---------- 11. do the plates actually read the note table? ---------- */
console.log('\n-- 11. EVERY PLATE IS PLAYED BY THE NOTES --');
/* Counted, not claimed: the beat clock is instrumented, every plate is drawn,
   and we record which ones reached for the performance. */
const K = EM.clock, ORIG = {};
const KEYS = ['pulse', 'nearest', 'pitchAt', 'velocityAt', 'notesBetween',
              'countFrom', 'sinceNote', 'notePhase', 'periodAt', 'indexAt'];
for (const k of KEYS) ORIG[k] = K[k];
let hitFlag = false, direct = 0, viaWarp = 0;
const deaf = [];
for (const k of KEYS) {
  K[k] = (function (name) {
    return function () { hitFlag = true; return ORIG[name].apply(K, arguments); };
  })(k);
}
for (const id of Object.keys(EM.plates)) {
  const cue = L.byScene[id];
  let touched = false;
  for (const p of [0.15, 0.5, 0.85]) {
    const t = cue ? cue.t + Math.max(0.002, cue.dur * p) : 1;
    const D = EM.newDraw(makeCtx([]));
    /* build the state FIRST and only then arm the probe: state() itself reads
       the clock, so arming before it counts the harness, not the plate. The
       first version of this check reported 130/130 for exactly that reason. */
    const S = EM.state(t);
    hitFlag = false;
    try { EM.plates[id](D, S); } catch (e) { /* reported in section 3 */ }
    if (hitFlag) touched = true;
    /* A plate that prints S.pitch or S.velocity is reading the note table too,
       just through the state object. Counting only direct clock calls produced
       a false negative on `stack`, which is nothing BUT note-derived numbers. */
    if (!touched) {
      const log = [];
      const D2 = EM.newDraw(makeCtx(log));
      const S2 = EM.state(t);
      try { EM.plates[id](D2, S2); } catch (e) { /* ignore */ }
      const txt = log.join('|');
      if (S2.pitch && txt.indexOf(String(S2.pitch)) >= 0) touched = true;
      else if (S2.velocity && txt.indexOf(String(S2.velocity)) >= 0) touched = true;
    }
  }
  if (touched) { direct++; continue; }
  const t0 = cue ? cue.t + cue.dur * 0.5 : 1;
  const warped = EM.beatWarp(EM.newDraw(makeCtx([])), EM.state(t0), 1);
  if (warped) viaWarp++; else deaf.push(id);
}
for (const k of KEYS) K[k] = ORIG[k];
const total = Object.keys(EM.plates).length;
ok('plates that read the note table directly  —  ' + direct + '/' + total +
   ' (' + Math.round(100 * direct / total) + ' %)');
viaWarp ? ok('the other ' + viaWarp + ' are still played by the notes through the shared beat warp') : null;
deaf.length
  ? warn('deaf to the performance: ' + deaf.slice(0, 8).join(', ') +
      (deaf.length > 8 ? ' … +' + (deaf.length - 8) : ''))
  : ok('no plate is deaf to the performance');

/* ---------- 12. the falsifiable test: perturb MIDI, watch the picture ----------
   Asking a plate whether it "read the clock" is unreliable in both directions —
   the first version counted the harness (130/130, false) and the second matched
   digits in the log (130/130, also false). So this does the only thing that
   cannot lie: it CHANGES THE MIDI and checks whether the picture moves. A plate
   whose output is identical under a different performance is not beat-synced,
   whatever its source says. */
console.log('\n-- 12. PERTURB THE PERFORMANCE, WATCH THE PICTURE --');
function plateHash(id, t, perturb) {
  const saved = { O: EM.ONSETS, M: EM.MIDI, K: EM.clock };
  if (perturb) {
    const O2 = EM.ONSETS.map(function (a) { return a.slice(); });
    for (let i = 0; i < O2.length; i++) {
      O2[i][4] = 128 - O2[i][4];            /* velocity inverted      */
      O2[i][1] += 7; O2[i][2] += 7;          /* pitch transposed up    */
      O2[i][3] = Math.min(4, O2[i][3] + 1);  /* every note a chord     */
      /* and the ONSET TIME moves too. Without this the test was under-powered:
         beatPulse is a function of the times only, so a plate that responds
         purely through the beat warp looked unresponsive. */
      O2[i][0] = Math.max(0, O2[i][0] + ((i % 7) - 3) * 55);
    }
    EM.ONSETS = O2;
    EM.MIDI = Object.assign({}, saved.M, { pitchLo: saved.M.pitchLo + 7, pitchHi: saved.M.pitchHi + 7 });
    EM.clock = EM.C.makeClock(O2);
  }
  const log = [];
  const D = EM.newDraw(makeCtx(log));
  try { EM.plates[id](D, EM.state(t)); } catch (e) { /* reported in section 3 */ }
  const h = crypto.createHash('sha1').update(log.join('|')).digest('hex');
  EM.ONSETS = saved.O; EM.MIDI = saved.M; EM.clock = saved.K;
  return h;
}
/* Measured on the WHOLE FRAME, because that is what a viewer sees — a plate on
   its own is only half the picture, and the substrate is the other half. */
function frameHash(t, perturb) {
  plateHash('__none__', t, perturb);       /* swap the tables in          */
  const saved = { O: EM.ONSETS, M: EM.MIDI, K: EM.clock };
  const s = plateHash('__none__', t, false);   /* restores them, returns junk */
  const run = (pert) => {
    const sv = { O: EM.ONSETS, M: EM.MIDI, K: EM.clock };
    if (pert) {
      const O2 = EM.ONSETS.map(function (a) {
        return [Math.max(0, a[0] + (((a[0] / 7 | 0) % 7) - 3) * 55),
                128 - a[4], a[1] + 7, a[2] + 7, Math.min(4, a[3] + 1)];
      });
      EM.ONSETS = O2;
      EM.MIDI = Object.assign({}, sv.M, { pitchLo: sv.M.pitchLo + 7, pitchHi: sv.M.pitchHi + 7 });
      EM.clock = EM.C.makeClock(O2);
    }
    const log = [];
    const D = EM.newDraw(makeCtx(log));
    const S = EM.drawWorldLayer(D, t);
    EM.drawWorn(D, S);
    try { EM.drawSequence(D, t, S); } catch (e) { /* reported in section 3 */ }
    EM.drawRegisters(D, S);
    EM.drawFrame(D, S);
    const h = crypto.createHash('sha1').update(log.join('|')).digest('hex');
    EM.ONSETS = sv.O; EM.MIDI = sv.M; EM.clock = sv.K;
    return h;
  };
  return [run(false), run(true)];
}
let sampled = 0, movedNow = 0;
const stillFrames = [];
for (let i = 0; i < L.cues.length; i++) {
  const c = L.cues[i];
  /* sample ON the performance: a real note inside this cue, plus a gap sample */
  const inside = EM.clock.notesBetween(c.t, Math.min(c.end, c.t + 1.2));
  const ts = [];
  if (inside.length) ts.push(inside[0].ms + 0.02);
  if (inside.length > 1) ts.push(inside[inside.length - 1].ms + 0.02);
  ts.push(Math.min(c.t + c.dur * 0.45, c.end - 0.01));
  for (const t of ts) {
    if (t <= c.t || t >= EM.AUDIO_END) continue;
    const pair = frameHash(t, false);
    sampled++;
    if (pair[0] !== pair[1]) movedNow++; else stillFrames.push(c.scene + '@' + t.toFixed(2));
  }
}
const pct2 = Math.round(100 * movedNow / Math.max(1, sampled));
if (pct2 >= 95) {
  ok('change the MIDI and the frame changes  —  ' + movedNow + '/' + sampled + ' instants (' + pct2 + ' %)');
} else {
  warn('only ' + movedNow + '/' + sampled + ' instants (' + pct2 + ' %) respond to the performance; ' +
    stillFrames.length + ' do not, e.g. ' + stillFrames.slice(0, 5).join(', '));
}

/* and the same question asked of each plate on its own, sampled ON the notes */
const deafPlate = [], exempt = [];
for (const id of Object.keys(EM.plates)) {
  const cue = L.byScene[id];
  if (!cue) continue;
  const inside = EM.clock.notesBetween(cue.t, Math.min(cue.end, cue.t + 2.0));
  /* six samples, not two. Sampling only two instants can land entirely inside
     a rest and condemn a plate that responds perfectly well one beat later —
     which is what happened to ab.stack. Three samples are pinned to real notes
     in the cue and three are spread across it. */
  const ts = [];
  if (inside.length) {
    ts.push(inside[0].ms + 0.02);
    ts.push(inside[Math.floor(inside.length / 2)].ms + 0.02);
    ts.push(inside[inside.length - 1].ms + 0.02);
  }
  ts.push(cue.t + cue.dur * 0.25, cue.t + cue.dur * 0.5, cue.t + cue.dur * 0.75);
  let differs = false;
  for (const t of ts) {
    if (t <= cue.t || t >= EM.AUDIO_END) continue;
    if (plateHash(id, t, false) !== plateHash(id, t, true)) { differs = true; break; }
  }
  if (!differs) {
    /* Two cues cannot respond, and it is not a defect — it is what they are:
       one sits before the performance has begun, and one sits past the last
       sample of the file and is therefore never reached during playback.
       Naming the reason is better than reporting a number that looks like
       a failure. */
    if (cue.t >= EM.AUDIO_END - 1e-6) {
      exempt.push(id + '  (beyond the audio end — unreachable)');
    } else if (cue.end <= EM.clock.first + 1e-6) {
      exempt.push(id + '  (ends before the first note — a pre-roll frame)');
    } else {
      deafPlate.push(id);
    }
  }
}
const np = Object.keys(EM.plates).length;
deafPlate.length === 0
  ? ok('每一块画板自己都吃音符  —  ' + np + '/' + np +
      ' plates change when the MIDI changes')
  : warn((np - deafPlate.length) + '/' + np + ' plates respond on their own; not yet: ' +
      deafPlate.join(', '));
for (const e of exempt) ok('exempt, with a reason: ' + e);

/* ---------- 13. the same borrowed face must not be shot the same way ----------
   The loudest kind of monotony is a character that looks identical every time
   she appears. This measures her SCALE at every occurrence and refuses to let
   one face have a single value across the film. */
console.log('\n-- 13. 同一张脸不许每次一样 --');
const byFace = Object.create(null);
for (const c of L.cues) {
  if (!c.persona) continue;
  const t = c.t + Math.max(0.05, c.dur * 0.5);
  const S = EM.state(t);
  const D = EM.newDraw(makeCtx([]));
  try {
    if (EM.hasStoryScene(S)) EM.drawStoryScene(D, S);
    else EM.drawWorn(D, S);
  } catch (e) { /* reported elsewhere */ }
  if (typeof S.subjectScale !== 'number') continue;
  (byFace[c.persona] = byFace[c.persona] || []).push(S.subjectScale);
}
const flat = [];
let variedFaces = 0;
for (const k of Object.keys(byFace)) {
  const v = byFace[k].map(function (x) { return Math.round(x * 100); });
  if (v.length < 2) continue;
  if (new Set(v).size === 1) flat.push(k + ' (' + v.length + ' shots, all ' + v[0] / 100 + ')');
  else variedFaces++;
}
flat.length === 0
  ? ok('no borrowed face is shot the same way twice  —  ' + variedFaces +
      ' faces vary their scale across ' +
      Object.keys(byFace).reduce(function (n, k) { return n + byFace[k].length; }, 0) + ' appearances')
  : warn('identical scale on every appearance: ' + flat.join(', '));

/* ---------- helpers shared by 14 / 16 / 17 -------------------------------
   One definition of "the frame", and it is the same one hashAt() hashes. If
   the film is tested two ways then "the frame" means two things, and one of
   the two is wrong. */
function frameLog(t) {
  const log = [];
  const D = EM.newDraw(makeCtx(log));
  const S = EM.drawWorldLayer(D, t);
  if (!EM.hasStoryScene(S)) {
    EM.drawGrammar(D, S, { cx: EM.W / 2, cy: EM.H / 2 - 10, R: 300 });
    EM.drawCodeWall(D, S);
    EM.drawWorn(D, S);
  }
  if (!EM.storyOwnsShot(t)) EM.drawLyricImage(D, S);
  EM.drawStandingNine(D, S);
  EM.drawExecutionMemory(D, S);
  if (!EM.storyOwnsShot(t)) {
    try { EM.drawSequence(D, t, S); } catch (e) { /* reported in section 3 */ }
  }
  EM.drawStoryScene(D, S);
  EM.drawAbsence(D, S);
  EM.drawBootChat(D, S);
  EM.drawTrapped(D, S);
  if (EM.debugView) EM.drawRegisters(D, S);
  EM.drawLyric(D, S);
  EM.M.noteRail(D, S, EM.RAIL[S.act] || 'ticks');
  EM.drawFrame(D, S);
  return log;
}
/* the perturbation section 12 uses, as a wrapper */
function withPerturbed(fn) {
  const saved = { O: EM.ONSETS, M: EM.MIDI, K: EM.clock };
  const O2 = EM.ONSETS.map(function (a) { return a.slice(); });
  for (let i = 0; i < O2.length; i++) {
    O2[i][4] = 128 - O2[i][4];
    O2[i][1] += 7; O2[i][2] += 7;
    O2[i][3] = Math.min(4, O2[i][3] + 1);
    O2[i][0] = Math.max(0, O2[i][0] + ((i % 7) - 3) * 55);
  }
  EM.ONSETS = O2;
  EM.MIDI = Object.assign({}, saved.M, { pitchLo: saved.M.pitchLo + 7, pitchHi: saved.M.pitchHi + 7 });
  EM.clock = EM.C.makeClock(O2);
  let r;
  try { r = fn(); } finally { EM.ONSETS = saved.O; EM.MIDI = saved.M; EM.clock = saved.K; }
  return r;
}
/* how much two frames differ: the share of primitives they do not share.
   0 = byte-identical, 1 = nothing in common. */
function logDist(a, b) {
  const A = new Map(), B = new Map();
  for (const s of a) A.set(s, (A.get(s) || 0) + 1);
  for (const s of b) B.set(s, (B.get(s) || 0) + 1);
  let common = 0;
  for (const kv of A) common += Math.min(kv[1], B.get(kv[0]) || 0);
  return 1 - 2 * common / Math.max(1, a.length + b.length);
}
const FT = /^ft\((.*),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)$/;
/* The SHOT: her, and the plate. The board, the sockets, the registers and the
   frame are deliberately nailed down (rule 3), so folding their ~2500 inert
   primitives into a change-rate measure would make it a measure of the board
   rather than of the passage — and a compact plate could never move the needle
   no matter how much it developed. The passage is the shot. */
function shotLog(t) {
  const log = [];
  const D = EM.newDraw(makeCtx(log));
  const S = EM.state(t);
  if (EM.hasStoryScene(S)) EM.drawStoryScene(D, S);
  else {
    try { EM.drawWorn(D, S); } catch (e) { /* reported elsewhere */ }
    try { EM.drawSequence(D, t, S); } catch (e) { /* reported in section 3 */ }
  }
  return log;
}
function textsAt(t) {
  const out = [];
  for (const s of frameLog(t)) {
    const m = FT.exec(s);
    if (m) out.push({ str: m[1], x: +m[2], y: +m[3] });
  }
  return out;
}
const norm = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/^\s+|\s+$/g, '');
const wordsOf = (s) => norm(s).split(' ').filter(Boolean);
/* the band's own row: one line of mono, centred, a little above the rail. The
   window is tight on purpose — the suite's "movement n / 4" label sits 22 px
   below it and the rail's note count 16 px below that, and counting either of
   those as a caption produced a page of false positives the first time. */
const BAND_LO = EM.H - 166, BAND_HI = EM.H - 142;
function bandRow(t) {
  return textsAt(t).filter((it) => it.y > BAND_LO && it.y < BAND_HI && it.x > 300 && it.x < 1300);
}

/* ---------- 14. 尺度受 MIDI 驱动 (⑫) --------------------------------------
   Section 12 proves the FRAME moves when the performance does. That is not the
   same claim as "the subject is played": the frame could move entirely through
   the board and the plate while she stood there posed. So this asks the narrow
   question — change the MIDI and watch HER SIZE — which is the question a
   filmed subject actually raises, since its first variable is not position but
   scale. */
console.log('\n-- 14. 尺度受 MIDI 驱动 (⑫) --');
function subjectScales() {
  const out = [];
  for (const c of L.cues) {
    if (!c.persona) continue;
    const t = c.t + Math.max(0.05, c.dur * 0.5);
    const S = EM.state(t);
    const D = EM.newDraw(makeCtx([]));
    try {
      if (EM.hasStoryScene(S)) EM.drawStoryScene(D, S);
      else EM.drawWorn(D, S);
    } catch (e) { /* reported elsewhere */ }
    out.push(typeof S.subjectScale === 'number' ? S.subjectScale : null);
  }
  return out;
}
{
  const scPlain = subjectScales();
  const scPert = withPerturbed(subjectScales);
  let moved = 0;
  for (let i = 0; i < scPlain.length; i++) {
    if (scPlain[i] === null || scPert[i] === null) continue;
    if (Math.abs(scPlain[i] - scPert[i]) > 1e-9) moved++;
  }
  const pctS = Math.round(100 * moved / Math.max(1, scPlain.length));
  pctS >= 90
    ? ok('change the MIDI and her scale changes  —  ' + moved + '/' + scPlain.length +
        ' shots (' + pctS + ' %)')
    : bad('the subject is posed, not played: only ' + moved + '/' + scPlain.length +
        ' shots (' + pctS + ' %) change her scale when the MIDI changes');
}

/* ---------- 15. 器乐段变化率下限 (⑭) --------------------------------------
   The gap-check upstream only refuses a frame that is BYTE-identical to the one
   before it, and a picture whose only motion is a rigid camera move passes that
   forever — the call stream of a slow push is the same calls with different
   numbers in the translate(). Thirteen seconds of it is still dead air. These
   three passages are the ones the song has no words for, which is the reason a
   suite exists, so this is where the floor belongs: inside any one-second
   window of an instrumental, the SHOT 0.3 s earlier has to be a genuinely
   different picture and not a nudged or merely re-framed one.

   Measured on the shot and not on the whole frame on purpose — see shotLog.
   The floor is set from the measurement: with every movement of all three
   suites checked at 0.1 s steps, the worst window in the film moves 0.10 of
   the shot's marks, so 0.08 is the floor, and a movement that froze would
   report 0. */
console.log('\n-- 15. 器乐段变化率下限 (⑭) --');
{
  const INSTRUMENTALS = ['boot.inst', 'ab.stack', 'lv.loop'];
  const FLOOR = 0.08;
  let checked = 0, below = 0, worst = 1, worstAt = '';
  for (const id of INSTRUMENTALS) {
    const c = L.byScene[id];
    if (!c) { bad('no cue for ' + id); continue; }
    const seg = c.dur / 4;
    for (let t = c.t + 0.3; t < c.end - 0.02; t += 0.1) {
      const d = logDist(shotLog(t), shotLog(t - 0.3));
      checked++;
      if (d < worst) {
        worst = d;
        worstAt = id + ' movement ' + (Math.floor((t - c.t) / seg) + 1) + ' at ' + t.toFixed(2) + ' s';
      }
      if (d < FLOOR) below++;
    }
  }
  below === 0
    ? ok('the instrumentals keep moving  —  ' + checked + ' windows across ' +
        INSTRUMENTALS.length + ' passages x 4 movements, worst ' + worst.toFixed(3) +
        ' (floor ' + FLOOR + ')')
    : bad(below + ' of ' + checked + ' instrumental windows move less than ' + FLOOR +
        '  (worst ' + worst.toFixed(3) + ' at ' + worstAt + ')');
}

/* ---------- 16. 字幕与 cue 表逐毫秒一致 (⑮) ------------------------------
   The subtitle is the only part of the film that makes a CLAIM about a time:
   "this sentence is being sung now". So it is held against the cue table rather
   than against itself, and the cue table is held against the second, verbatim
   copy of the LRC that index.html carries — to the millisecond, because the
   times in the table are measured ones and a caption that drifts off its line
   is a caption that is describing the wrong moment. */
console.log('\n-- 16. 字幕与 cue 表逐毫秒一致 (⑮) --');
{
  const built = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const block = built.match(/<script id="lrc-source" type="text\/plain">([\s\S]*?)<\/script>/);
  if (!block) bad('index.html carries no embedded copy of the lyric');
  else {
    const re = /^\[(\d+):(\d+)[.:](\d{1,3})\](.*)$/;
    const emb = [];
    for (const line of block[1].split('\n')) {
      const m = line.match(re);
      if (m) emb.push({ t: (+m[1]) * 60 + (+m[2]) + (+(m[3] + '00').slice(0, 3)) / 1000, text: m[4].trim() });
    }
    let worstMs = 0, textBad = 0;
    if (emb.length !== L.cues.length) bad('the embedded copy has ' + emb.length + ' lines, the cue table has ' + L.cues.length);
    else {
      for (let i = 0; i < emb.length; i++) {
        worstMs = Math.max(worstMs, Math.abs(emb[i].t - L.cues[i].t) * 1000);
        if (emb[i].text !== L.cues[i].text) textBad++;
      }
      worstMs < 1 && textBad === 0
        ? ok('the subtitle table and the embedded lyric copy agree to the millisecond  —  ' +
            emb.length + ' lines, worst ' + worstMs.toFixed(3) + ' ms')
        : bad('the embedded copy drifts off the cue table: worst ' + worstMs.toFixed(3) +
            ' ms, ' + textBad + ' text mismatches');
    }
  }
  let notMono = 0;
  for (let i = 1; i < L.cues.length; i++) if (L.cues[i].t - L.cues[i - 1].t < 0.001) notMono++;
  notMono === 0
    ? ok('the cue table is resolved to the millisecond  —  no two lines closer than 1 ms')
    : bad(notMono + ' cue pairs are closer than a millisecond');

  /* and the band says what the table says: a prefix of the line while it is
     being typed, all of it by the time the line is over */
  let notPrefix = 0, notFinished = 0;
  const bandFaults = [];
  for (const c of L.cues) {
    if (c.held || c.text.charAt(0) === '(' || c.t >= EM.AUDIO_END ||
        (EM.subjectScene[c.scene] && !EM.storyOwnsShot(c.t + 0.02)) || EM.storySubject[c.scene]) continue;
    const want = norm(c.text);
    const early = bandRow(c.t + 0.02).map(function (it) { return norm(it.str); }).join(' ').trim();
    if (early && want.indexOf(early) !== 0) {
      notPrefix++;
      if (bandFaults.length < 4) bandFaults.push(c.scene + '@' + c.t.toFixed(2) + ' opens with "' + early + '"');
    }
    const late = bandRow(c.end - 0.02).map(function (it) { return norm(it.str); }).join(' ').trim();
    if (late.indexOf(want) === -1) {
      notFinished++;
      if (bandFaults.length < 4) bandFaults.push(c.scene + ' never finishes "' + c.text + '"');
    }
  }
  notPrefix === 0 && notFinished === 0
    ? ok('the band speaks the cue table  —  every line is typed as a prefix of itself and is whole by its end')
    : bad(notPrefix + ' lines are not prefixes of their cue and ' + notFinished +
        ' never finish  —  ' + bandFaults.join(' | '));
}

/* ---------- 17. 文字不撒谎 (⑯) --------------------------------------------
   Everything above trusts the film's own numbers. This one reads the drawing
   call stream instead: every fillText the frame actually emits, taken apart,
   and held against the words the song has actually sung at that instant.

     (b) a line may not be printed twice in one frame — and when the plate IS
         the line's subject the band must be silent. This is the rule the
         eighteen EXECUTION lines broke and nothing noticed: the word was struck
         large in the plate AND typed again in the band underneath it.
     (c) a whole line may not be quoted before it is sung.
     (d) the word a plate puts up as its SUBJECT must be one the song has
         already sung, or the picture is naming a thing that has not happened.

   A label that merely CONTAINS a lyric word is the machine's own voice — the
   contract does say "cost: run the execution" long before the song sings the
   word, and that is the machine talking about a service it has not been asked
   for, which is the film's whole subject. So only whole lines are judged under
   (c), and how far the labels reach forward is REPORTED at the end rather than
   failed: that is an editorial reach, not a claim about what is playing. */
console.log('\n-- 17. 文字不撒谎 (⑯) --');
{
  const FIRST_SUNG = Object.create(null);
  for (const c of L.cues) for (const w of wordsOf(c.text)) if (!(w in FIRST_SUNG)) FIRST_SUNG[w] = c.t;
  const LINE_AT = Object.create(null);
  /* a line that carries no Latin text at all normalises to the empty string,
     and so does every mark the machine draws (\u2014\u2014, a socket's own name
     in Chinese). Both are skipped rather than matched: there is nothing to
     compare, and matching them turned a page of shelf labels into 875
     "quotations". */
  for (const c of L.cues) {
    const n = norm(c.text);
    if (n && !(n in LINE_AT)) LINE_AT[n] = c.t;
  }

  let twice = 0, early = 0, unborn = 0;
  const faults = [];
  for (const c of L.cues) {
    if (c.held || c.t >= EM.AUDIO_END) continue;
    const want = norm(c.text);
    const isSubject = !!((EM.subjectScene && EM.subjectScene[c.scene] &&
      !EM.storyOwnsShot(c.t + 0.02)) || EM.storySubject[c.scene]);
    for (const f of [0.5, 0.92]) {
      const t = c.t + Math.max(0.02, c.dur * f);
      if (t >= EM.AUDIO_END) continue;
      const ts = textsAt(t);
      let inBand = 0;
      for (const it of bandRow(t)) if (norm(it.str) === want) inBand++;
      if (inBand > 1 || (isSubject && inBand > 0)) {
        twice++;
        if (faults.length < 5) faults.push('(b) ' + c.scene + '@' + t.toFixed(2) + ' prints "' +
          c.text + '" ' + inBand + 'x in the band' + (isSubject ? ' although the plate is its subject' : ''));
      }
      for (const it of ts) {
        const n = norm(it.str);
        if (n && (n in LINE_AT) && LINE_AT[n] > t + 1e-6) {
          early++;
          if (faults.length < 5) faults.push('(c) "' + it.str + '" at ' + t.toFixed(2) +
            ' but first sung at ' + LINE_AT[n].toFixed(2));
        }
      }
      if (isSubject) {
        const e = EM.SCORE[c.scene], o = (e && e[1]) || {};
        const sw = (o.w || c.text || '').toUpperCase();
        for (const w of wordsOf(sw)) {
          if ((w in FIRST_SUNG) && FIRST_SUNG[w] > c.t + 1e-6) {
            unborn++;
            if (faults.length < 5) faults.push('(d) ' + c.scene + ' puts up "' + sw + '" but "' + w +
              '" is not sung until ' + FIRST_SUNG[w].toFixed(2));
          }
        }
      }
    }
  }
  twice === 0 && early === 0 && unborn === 0
    ? ok('the words on screen are the words being sung  —  nothing printed twice, nothing quoted before its line')
    : bad('文字撒谎: ' + twice + ' double prints, ' + early + ' lines quoted early, ' + unborn +
        ' subjects not yet sung  —  ' + faults.join(' | '));

  const ahead = Object.create(null);
  for (const c of L.cues) {
    if (c.held || c.t >= EM.AUDIO_END) continue;
    for (const f of [0.3, 0.7]) {
      const t = c.t + Math.max(0.02, c.dur * f);
      if (t >= EM.AUDIO_END) continue;
      for (const it of textsAt(t)) {
        for (const w of wordsOf(it.str)) {
          if (w.length < 6 || !(w in FIRST_SUNG)) continue;
          if (FIRST_SUNG[w] > t + 1e-6) {
            if (!(w in ahead) || ahead[w] < FIRST_SUNG[w] - t) ahead[w] = FIRST_SUNG[w] - t;
          }
        }
      }
    }
  }
  const far = Object.keys(ahead).sort(function (a, b) { return ahead[b] - ahead[a]; });
  if (far.length) {
    warn('the machine names ' + far.length + ' words before the song reaches them — furthest "' +
      far[0] + '" leads its line by ' + ahead[far[0]].toFixed(1) + ' s  (' + far.slice(0, 6).join(', ') + ')');
  } else ok('nothing on screen names a word the song has not reached');
}

console.log('\n-- 18. STORY CONTINUITY AND COMPOSITION --');
{
  const translations = EM.LYRIC_CN || {};
  if (Object.keys(translations).length) {
    const missing = L.cues.filter(c => c.text && c.text[0] !== '(' && !translations[c.scene]);
    missing.length ? bad('Chinese subtitles missing for ' + missing.map(c => c.scene).join(', '))
      : ok('every sung cue has a Chinese subtitle on the original lyric clock');
  }
  const a = EM.fragmentState(121.2), b = EM.fragmentState(123.5);
  a && b && a.count >= 500 && b.count >= a.count
    ? ok('the fragment field stays full across the conditional and its consequence')
    : bad('the memory field resets or disappears between adjacent lines');
  const boxes = Array.from({ length: 16 }, (_, i) => {
    const p = EM.executionPlacement(i, false);
    const size = p.size * 1.10, w = size * 9 * 0.62, h = size * 1.2;
    const bw = w * Math.cos(p.angle) + h * Math.abs(Math.sin(p.angle));
    const bh = h * Math.cos(p.angle) + w * Math.abs(Math.sin(p.angle));
    return { l: p.x - bw / 2, r: p.x + bw / 2,
      t: p.y - bh / 2, b: p.y + bh / 2 };
  });
  let overlaps = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = 0; j < i; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) overlaps++;
  }
  overlaps === 0 && boxes.every(b => b.l >= 25 && b.r <= EM.W - 25 && b.t >= 70 && b.b < 740)
    ? ok('all sixteen chant words have separate, visible bounds at peak musical scale')
    : bad('the chant words overlap or reach the subtitle area');
  const seam = L.byScene['xs.trappedah'].t;
  const before = EM.trappedMotion(seam - 0.0001), after = EM.trappedMotion(seam + 0.0001);
  const onsetTimes = EM.clock.notesBetween(173.643, 176.5).map(n => n.ms);
  const jumps = onsetTimes.filter(t => Math.abs(EM.trappedMotion(t + 0.0001).angle -
    EM.trappedMotion(t - 0.0001).angle) > 0.01);
  const visible = [seam - 0.001, seam + 0.001].every(t => {
    const log = []; EM.drawTrapped(EM.newDraw(makeCtx(log)), EM.state(t));
    return log.some(s => s.startsWith('ft(TRAPPED,'));
  });
  visible && Math.abs(before.angle - after.angle) < 0.01 && jumps.length === 0
    ? ok('TRAPPED stays visible at the lyric seam and rotates continuously at note onsets')
    : bad('TRAPPED vanishes at its seam or jumps backwards at a note');
}

console.log('\n' + '='.repeat(78));
console.log(fails ? '  ' + fails + ' FAILED, ' + warns + ' warnings' : '  ALL CHECKS PASSED' + (warns ? ' (' + warns + ' warnings)' : ''));
console.log('='.repeat(78));
process.exit(fails ? 1 : 0);
