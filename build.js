/* ============================================================================
   build.js — the whole data pipeline, one command.

     1. parse  original/*.mid|mp3|lrc  ->  assets/onsets.js  waveform.js  cues.js
     2. inject the lyric text          ->  index.html (the second, verbatim copy)
     3. cross-check                    ->  fail here, not in the browser

   Run:  node build.js
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const step = (n, t) => console.log('\n' + '='.repeat(74) + '\n  ' + n + '. ' + t + '\n' + '='.repeat(74));

step(1, 'MIDI / MP3 / LRC  ->  assets/');
const r = spawnSync(process.execPath, [path.join(ROOT, '_build', 'gen.js')], { stdio: 'inherit' });
if (r.status !== 0) { console.error('\nFAILED: _build/gen.js'); process.exit(r.status || 1); }

step(2, 'inject the lyric text into index.html (the second, verbatim copy)');
const html = fs.readFileSync(path.join(ROOT, 'index.src.html'), 'utf8');
const text = fs.readFileSync(path.join(ROOT, 'assets', 'lrc-embed.txt'), 'utf8').replace(/\s+$/, '');
const MARK = '<!--LRC-EMBED-->';
if (html.indexOf(MARK) === -1) { console.error('index.src.html has no ' + MARK); process.exit(1); }
fs.writeFileSync(path.join(ROOT, 'index.html'), html.replace(MARK, text), 'utf8');
console.log('  injected ' + text.split('\n').length + ' lyric lines (' + text.length + ' bytes)');

step(3, 'verify the generated files agree with each other');
function load(file) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  /* the generated files do `window.EM = window.EM || {}` and then use a BARE
     `EM`, so the sandbox's `window` has to BE the sandbox global. */
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  require('vm').runInNewContext(src, sandbox);
  return sandbox.EM;
}
const problems = [];
const A = load('assets/cues.js'), O = load('assets/onsets.js'), V = load('assets/waveform.js'), P = load('assets/personas.js');

if (!A.CUES || !A.CUES.length) problems.push('cues.js produced no cues');
if (!O.ONSETS || !O.ONSETS.length) problems.push('onsets.js produced no accents');
if (!V.WAVE || !V.WAVE.length) problems.push('waveform.js produced no envelope');
if (!(V.AUDIO_END > 60)) problems.push('waveform.js did not measure a plausible duration');
if (!P.PERSONAS || P.PERSONAS.length !== 9) problems.push('personas.js does not carry nine faces');
for (let i = 1; i < A.CUES.length; i++) {
  if (A.CUES[i][0] <= A.CUES[i - 1][0]) { problems.push('cue ' + i + ' does not advance'); break; }
}
const seen = Object.create(null);
for (const c of A.CUES) { if (seen[c[2]]) problems.push('scene id used twice: ' + c[2]); seen[c[2]] = true; }

/* the embedded copy in index.html must match the generated table */
const built = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const block = built.match(/<script id="lrc-source" type="text\/plain">([\s\S]*?)<\/script>/);
if (!block) problems.push('index.html has no embedded lyric block');
else {
  const re = /^\[(\d+):(\d+)[.:](\d{1,3})\](.*)$/;
  const emb = [];
  for (const line of block[1].split('\n')) {
    const m = line.match(re);
    if (m) emb.push({ t: (+m[1]) * 60 + (+m[2]) + (+(m[3] + '00').slice(0, 3)) / 1000, text: m[4].trim() });
  }
  if (emb.length !== A.CUES.length) problems.push('embedded=' + emb.length + ' cues but table=' + A.CUES.length);
  else {
    let worst = 0;
    for (let i = 0; i < A.CUES.length; i++) {
      worst = Math.max(worst, Math.abs(emb[i].t - A.CUES[i][0]) * 1000);
      if (emb[i].text !== A.CUES[i][1]) { problems.push('text mismatch at ' + i); break; }
    }
    if (worst > 0.5) problems.push('worst timestamp delta ' + worst.toFixed(3) + ' ms');
    console.log('  embedded copy vs cue table: ' + emb.length + ' cues, worst delta ' + worst.toFixed(3) + ' ms');
  }
}
console.log('  duration  : ' + V.AUDIO_END.toFixed(5) + ' s  (' + V.AUDIO_FRAMES + ' MPEG frames)');
console.log('  accents   : ' + O.ONSETS.length + '   ' + O.MIDI.bpm.join('/') + ' BPM');
console.log('  cues      : ' + A.CUES.length);
console.log('  envelope  : ' + V.WAVE.length + ' bins');
if (problems.length) {
  console.error('\nBUILD PROBLEMS:');
  for (const p of problems) console.error('  x ' + p);
  process.exit(1);
}
console.log('\nBUILD OK');
