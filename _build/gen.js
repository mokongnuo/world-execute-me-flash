/* ============================================================================
   gen.js — turn the three supplied inputs into baked data.

   BUILD step. The film must never fetch or decode anything at runtime, so
   every number it needs is written into a source file here.

     1. MIDI -> assets/onsets.js    every note-on: [ms, lo, hi, voices, vel]
     2. MP3  -> assets/waveform.js  measured duration + an energy envelope
     3. LRC  -> assets/cues.js      the cue table, bound to scenes.js
     4.      -> assets/personas.js  the nine borrowed faces

   Run:  node _build/gen.js
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_MID = process.argv[2] || path.join(ROOT, 'original', 'world.execute (me) ;.mid');
const SRC_MP3 = process.argv[3] || path.join(ROOT, 'original', 'Mili - world.execute (me) ;.mp3');
const SRC_LRC = process.argv[4] || path.join(ROOT, 'original', 'timeline.lrc');

const w = (rel, txt) => {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, txt, 'utf8');
  console.log('    wrote ' + rel + '  (' + (txt.length / 1024).toFixed(1) + ' KB)');
};
const head = (title, note) =>
  '/* ============================================================================\n' +
  '   ' + title + '\n' +
  '   GENERATED — do not edit by hand.\n' +
  '   ' + note + '\n' +
  '   ========================================================================== */\n';

/* ==========================================================================
   1. MIDI — a minimal, strict Standard MIDI File reader.
   ========================================================================== */
function readVarInt(b, p) {
  let v = 0, n = 0;
  for (;;) {
    const c = b[p++];
    v = (v << 7) | (c & 0x7f);
    if (++n > 4) throw new Error('varint too long at ' + p);
    if (!(c & 0x80)) break;
  }
  return [v, p];
}

function parseMidi(buf) {
  if (buf.toString('ascii', 0, 4) !== 'MThd') throw new Error('not a MIDI file');
  const headerLen = buf.readUInt32BE(4);
  const format = buf.readUInt16BE(8);
  const nTracks = buf.readUInt16BE(10);
  const division = buf.readUInt16BE(12);
  if (division & 0x8000) throw new Error('SMPTE time division unsupported');

  let p = 8 + headerLen;
  const notes = [], tempos = [];
  for (let tr = 0; tr < nTracks && p + 8 <= buf.length; tr++) {
    if (buf.toString('ascii', p, p + 4) !== 'MTrk') break;
    const end = p + 8 + buf.readUInt32BE(p + 4);
    let q = p + 8, tick = 0, running = 0;
    while (q < end) {
      let dt;
      [dt, q] = readVarInt(buf, q);
      tick += dt;
      let status = buf[q];
      if (status & 0x80) { q++; running = status; } else { status = running; }
      const type = status & 0xf0;
      if (status === 0xff) {
        const meta = buf[q++];
        let len;
        [len, q] = readVarInt(buf, q);
        if (meta === 0x51 && len === 3) {
          tempos.push({ tick, us: (buf[q] << 16) | (buf[q + 1] << 8) | buf[q + 2] });
        }
        q += len;
      } else if (status === 0xf0 || status === 0xf7) {
        let len;
        [len, q] = readVarInt(buf, q);
        q += len;
      } else if (type === 0x90) {
        const pitch = buf[q], vel = buf[q + 1]; q += 2;
        if (vel > 0) notes.push({ tick, pitch, vel });
      } else if (type === 0x80 || type === 0xa0 || type === 0xb0 || type === 0xe0) {
        q += 2;
      } else if (type === 0xc0 || type === 0xd0) {
        q += 1;
      } else {
        throw new Error('unknown status 0x' + status.toString(16) + ' at ' + (q - 1));
      }
    }
    p = end;
  }
  return { format, nTracks, division, notes, tempos };
}

/* ticks -> milliseconds, walking the tempo map so a mid-song tempo change
   still lands every note on the right millisecond. */
function tickToMs(division, tempos) {
  const map = tempos.length ? tempos.slice() : [{ tick: 0, us: 500000 }];
  map.sort((a, b) => a.tick - b.tick);
  if (map[0].tick !== 0) map.unshift({ tick: 0, us: 500000 });
  return (tick) => {
    let ms = 0;
    for (let i = 0; i < map.length; i++) {
      const cur = map[i], next = map[i + 1];
      const stop = next ? Math.min(tick, next.tick) : tick;
      if (stop > cur.tick) ms += (stop - cur.tick) / division * (cur.us / 1000);
      if (!next || tick <= next.tick) break;
    }
    return ms;
  };
}

/* ==========================================================================
   2. MP3 — walk every frame header. The duration the film is pinned to must
   be measured, never read from a tag.
   ========================================================================== */
/* keyed by the raw 2-bit version field: 3 = MPEG-1, 2 = MPEG-2, 0 = MPEG-2.5;
   inside, keyed by layer number (1 = Layer I, 2 = II, 3 = III). */
const BR = {
  3: { 1: [0,32,64,96,128,160,192,224,256,288,320,352,384,416,448],
       2: [0,32,48,56,64,80,96,112,128,160,192,224,256,320,384],
       3: [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] },
  2: { 1: [0,32,48,56,64,80,96,112,128,144,160,176,192,224,256],
       2: [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160],
       3: [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160] }
};
BR[0] = BR[2];
const SRATE = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

function parseMp3(buf) {
  let start = 0;
  if (buf.toString('ascii', 0, 3) === 'ID3') {
    start = 10 + ((buf[6] & 0x7f) << 21 | (buf[7] & 0x7f) << 14 |
                  (buf[8] & 0x7f) << 7 | (buf[9] & 0x7f));
  }
  let i = start, frames = 0, samples = 0, resync = 0;
  let sr = 0, ch = 0, kbps = 0, layer = 3, version = 1;
  let firstFrameAt = -1;
  const density = [];              // audio bytes per 0.5 s bin, for the envelope
  while (i + 4 <= buf.length) {
    const b1 = buf[i + 1], b2 = buf[i + 2];
    let len = -1;
    if (buf[i] === 0xff && (b1 & 0xe0) === 0xe0) {
      const ver = (b1 >> 3) & 3, lay = (b1 >> 1) & 3;
      const bri = (b2 >> 4) & 0xf, sri = (b2 >> 2) & 3, pad = (b2 >> 1) & 1;
      if (ver !== 1 && lay !== 0 && bri !== 0 && bri !== 15 && sri !== 3) {
        const lk = { 3: 1, 2: 2, 1: 3 }[lay];
        const bitrate = BR[ver][lk][bri] * 1000;
        const rate = SRATE[ver][sri];
        const spf = lay === 3 ? 384 : 1152;
        len = lay === 3 ? Math.floor((12 * bitrate / rate + pad) * 4)
                        : Math.floor(spf / 8 * bitrate / rate + pad);
        if (len > 4) {
          if (firstFrameAt < 0) { firstFrameAt = i; layer = 4 - lay; version = ver; }
          /* channel mode lives in byte 3 of the header, bits 7-6; 3 = mono */
          frames++; samples += spf; sr = rate;
          ch = (((buf[i + 3] >> 6) & 3) === 3) ? 1 : 2;
          kbps = Math.round(bitrate / 1000);
        }
      }
    }
    if (len > 4) { i += len; } else { resync++; i++; }
  }
  return { start, firstFrameAt, frames, samples, sr, ch, kbps, layer, version, resync };
}

/* energy envelope: how much music is happening per half second. */
function envelope(groups, endSec, perSec) {
  const n = Math.ceil(endSec * perSec);
  const bins = new Array(n).fill(0);
  for (const g of groups) {
    const k = Math.floor(g.ms / 1000 * perSec);
    if (k >= 0 && k < n) bins[k] += g.voices * (g.vel / 127);
  }
  const max = Math.max(1e-6, ...bins);
  return bins.map((v) => Math.round(Math.sqrt(v / max) * 255));
}

/* ==========================================================================
   3. LRC -> cues, bound to scenes.js
   ========================================================================== */
const LRC_RE = /^\[(\d+):(\d+)[.:](\d{1,3})\](.*)$/;
function parseLrc(text) {
  const cues = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(LRC_RE);
    if (!m) continue;
    const frac = (m[3] + '00').slice(0, 3);
    const t = (+m[1]) * 60 + (+m[2]) + (+frac) / 1000;
    cues.push({ t: Math.round(t * 1000) / 1000, text: m[4].trim() });
  }
  return cues;
}

/* A plate whose picture IS the sung word must be cut at its own boundary
   rather than cross-faded through the next line — otherwise the word sits on
   screen while the song is singing something else. */
const NO_BLEED_PREFIX = ['xs.r', 'xs.first', 'xs.final'];
const isNoBleed = (id) => NO_BLEED_PREFIX.some((p) => id.indexOf(p) === 0);

/* ==========================================================================
   4. the nine borrowed faces
   ========================================================================== */
const PERSONAS = [
  { id: 'deepseek', cn: 'DeepSeek',  en: 'DeepSeek',   rgb: [ 78, 124, 255], trait: '鲸' },
  { id: 'gpt',      cn: 'GPT',       en: 'ChatGPT',    rgb: [232, 238, 246], trait: '结' },
  { id: 'claude',   cn: 'Claude',    en: 'Claude',     rgb: [222, 124,  86], trait: '书' },
  { id: 'grok',     cn: 'Grok',      en: 'Grok',       rgb: [240, 190,  80], trait: '斧' },
  { id: 'kimi',     cn: 'Kimi',      en: 'Kimi',       rgb: [156, 178, 206], trait: '月' },
  { id: 'gemini',   cn: 'Gemini',    en: 'Gemini',     rgb: [146, 120, 240], trait: '星' },
  { id: 'glm',      cn: '智谱 GLM',  en: 'GLM',        rgb: [ 96, 196, 186], trait: '印' },
  { id: 'qwen',     cn: '千问',      en: 'Qwen',       rgb: [ 92, 150, 224], trait: '扇' },
  { id: 'doubao',   cn: '豆包',      en: 'Doubao',     rgb: [246, 168, 150], trait: '豆' }
];

/* ========================================================================== */

console.log('  [1/4] MIDI  -> assets/onsets.js');
const midBuf = fs.readFileSync(SRC_MID);
const smf = parseMidi(midBuf);
const toMs = tickToMs(smf.division, smf.tempos);
const notes = smf.notes
  .map((n) => ({ ms: Math.round(toMs(n.tick)), pitch: n.pitch, vel: n.vel }))
  .sort((a, b) => a.ms - b.ms || a.pitch - b.pitch);

const groups = [];
for (const n of notes) {
  const last = groups[groups.length - 1];
  if (last && last.ms === n.ms) {
    last.lo = Math.min(last.lo, n.pitch);
    last.hi = Math.max(last.hi, n.pitch);
    last.voices++;
    last.vel = Math.max(last.vel, n.vel);
  } else {
    groups.push({ ms: n.ms, lo: n.pitch, hi: n.pitch, voices: 1, vel: n.vel });
  }
}
const bpm = smf.tempos.length
  ? smf.tempos.map((t) => Math.round(60000000 / t.us))
  : [120];
const pitches = notes.map((n) => n.pitch);
console.log('        ' + groups.length + ' accents / ' + notes.length + ' note-ons, ' +
  bpm.join('/') + ' BPM, pitch ' + Math.min(...pitches) + '..' + Math.max(...pitches));

{
  const rows = [];
  for (let i = 0; i < groups.length; i += 8) {
    rows.push('  ' + groups.slice(i, i + 8)
      .map((g) => '[' + g.ms + ',' + g.lo + ',' + g.hi + ',' + g.voices + ',' + g.vel + ']')
      .join(','));
  }
  w('assets/onsets.js', head('assets/onsets.js — the measured accents',
    'Every beat-synced event in this film is fired from ONSETS. Notes that start\n' +
    '   on the same millisecond are merged: a chord is ONE impact, and `voices`\n' +
    '   records how many notes made it.') +
    'window.EM = window.EM || {};\nEM.ONSETS = [\n' + rows.join(',\n') + '\n];\n' +
    'EM.MIDI = { bpm: [' + bpm.join(',') + '], notes: ' + notes.length +
    ', accents: ' + groups.length + ', firstMs: ' + groups[0].ms +
    ', lastMs: ' + groups[groups.length - 1].ms +
    ', pitchLo: ' + Math.min(...pitches) + ', pitchHi: ' + Math.max(...pitches) + ' };\n');
}

console.log('  [2/4] MP3   -> assets/waveform.js');
const mp3 = parseMp3(fs.readFileSync(SRC_MP3));
const END = mp3.samples / mp3.sr;
console.log('        ' + mp3.frames + ' frames, ' + mp3.sr + ' Hz, ' + mp3.kbps +
  ' kbps, ' + (mp3.ch === 2 ? 'stereo' : 'mono'));
console.log('        DURATION ' + END.toFixed(5) + ' s');

const PER_SEC = 2;
const env = envelope(groups, END, PER_SEC);
{
  const rows = [];
  for (let i = 0; i < env.length; i += 16) rows.push('  ' + env.slice(i, i + 16).join(','));
  w('assets/waveform.js', head('assets/waveform.js — measured length + energy',
    'AUDIO_END is walked out of the MPEG frame headers, not read from a tag: the\n' +
    '   film\'s last frame is pinned to the track\'s last sample. WAVE is the energy\n' +
    '   envelope, derived from the MIDI performance (note density x velocity) at\n' +
    '   ' + PER_SEC + ' bins per second — it is labelled as such in the UI.') +
    'window.EM = window.EM || {};\n' +
    'EM.AUDIO_END = ' + END.toFixed(6) + ';\n' +
    'EM.AUDIO_FRAMES = ' + mp3.frames + ';\n' +
    'EM.AUDIO_INFO = { sampleRate: ' + mp3.sr + ', channels: ' + mp3.ch +
    ', kbps: ' + mp3.kbps + ', layer: ' + mp3.layer + ' };\n' +
    'EM.WAVE_PER_SEC = ' + PER_SEC + ';\n' +
    'EM.WAVE = [\n' + rows.join(',\n') + '\n];\n');
}

console.log('  [3/4] LRC   -> assets/cues.js');
const cuesRaw = parseLrc(fs.readFileSync(SRC_LRC, 'utf8'));
const SCENES = require('./scenes.js');

const problems = [];
if (SCENES.length !== cuesRaw.length) {
  problems.push('scenes.js has ' + SCENES.length + ' rows but the timeline has ' +
    cuesRaw.length + ' cues');
}
const rows = [];
const seen = Object.create(null);
for (let i = 0; i < SCENES.length; i++) {
  const e = SCENES[i];
  if (!Array.isArray(e) || e.length < 5) { problems.push('row ' + i + ' malformed'); continue; }
  const [idx, id, word, act, persona] = e;
  if (idx !== i) problems.push('row ' + i + ' declares index ' + idx);
  if (seen[id]) problems.push('scene id used twice: ' + id);
  seen[id] = true;
  if (persona && !PERSONAS.some((p) => p.id === persona)) {
    problems.push('row ' + i + ' names unknown persona "' + persona + '"');
  }
  const cue = cuesRaw[idx];
  if (!cue) { problems.push('no cue at index ' + idx + ' for ' + id); continue; }
  if (word && cue.text.toLowerCase().indexOf(String(word).toLowerCase()) === -1) {
    problems.push('cue ' + idx + ' is "' + cue.text + '" but ' + id +
      ' expects to find "' + word + '" in it');
  }
  rows.push({ t: cue.t, text: cue.text, scene: id, act, persona: persona || '', bleed: !isNoBleed(id) });
}
if (problems.length) {
  console.error('\nSCENE TABLE DOES NOT MATCH THE TIMELINE — refusing to emit.\n');
  for (const p of problems.slice(0, 24)) console.error('   x ' + p);
  if (problems.length > 24) console.error('   … ' + (problems.length - 24) + ' more');
  process.exit(1);
}

const counts = Object.create(null);
for (const r of rows) {
  const key = r.text.replace(/[^A-Za-z]/g, '').toUpperCase() || ('_' + r.scene);
  counts[key] = (counts[key] || 0) + 1;
}
const repeatOf = [];
{
  const seenT = Object.create(null);
  for (const r of rows) {
    const key = r.text.replace(/[^A-Za-z]/g, '').toUpperCase() || ('_' + r.scene);
    seenT[key] = (seenT[key] || 0) + 1;
    repeatOf.push(seenT[key] - 1);
  }
}
const repeated = Object.keys(counts).filter((k) => counts[k] > 1)
  .map((k) => k.toLowerCase() + ' x' + counts[k]).join(', ');
const personaCues = rows.filter((r) => r.persona).length;
console.log('        ' + rows.length + ' cues, ' + personaCues + ' wear a borrowed face');
console.log('        repeated: ' + repeated);

{
  const list = rows.map((r, i) =>
    '  [' + r.t.toFixed(3) + ',' + JSON.stringify(r.text) + ',' + JSON.stringify(r.scene) +
    ',' + JSON.stringify(r.act) + ',' + JSON.stringify(r.persona) + ',' + repeatOf[i] +
    ',' + (r.bleed ? 1 : 0) + ']').join(',\n');
  w('assets/cues.js', head('assets/cues.js — the running order',
    'Times are the MEASURED ones from the supplied LRC, not a metronome grid: the\n' +
    '   recording is played by a person and drifts about a tenth of a second off a\n' +
    '   strict 130 BPM lattice. The MIDI supplies the rhythm, the LRC supplies the\n' +
    '   words, and the two are deliberately never mixed.\n\n' +
    '   [t, text, scene, act, persona, repeat_index, bleed]\n' +
    '   persona      the borrowed face worn on this line ("" = none)\n' +
    '   repeat_index how many earlier lines share this text, so a plate can ask\n' +
    '                "which EXECUTION am I" without anyone hard-coding 7\n' +
    '   bleed        0 = cut at the cue boundary, because the picture IS the word') +
    'window.EM = window.EM || {};\nEM.CUES = [\n' + list + '\n];\n');

  const embed = cuesRaw.map((c) =>
    '[' + String(Math.floor(c.t / 60)).padStart(2, '0') + ':' +
    String(Math.floor(c.t % 60)).padStart(2, '0') + '.' +
    String(Math.round((c.t % 1) * 1000)).padStart(3, '0') + ']' + c.text).join('\n');
  fs.writeFileSync(path.join(ROOT, 'assets', 'lrc-embed.txt'), embed, 'utf8');
  console.log('    wrote assets/lrc-embed.txt');
}

console.log('  [4/4] the nine faces -> assets/personas.js');
{
  const body = PERSONAS.map((p) =>
    '  { id: ' + JSON.stringify(p.id) + ', cn: ' + JSON.stringify(p.cn) +
    ', en: ' + JSON.stringify(p.en) + ', rgb: [' + p.rgb.join(',') + '], trait: ' +
    JSON.stringify(p.trait) + ',\n    mark: "art/mark-' + p.id + '.jpg", girl: "art/girl-' + p.id + '.jpg" }'
  ).join(',\n');
  w('assets/personas.js', head('assets/personas.js — the nine borrowed faces',
    'The machine in this film has no face of its own, so it borrows nine.\n' +
    '   `mark` is the official product mark; `girl` is the fan-drawn personification\n' +
    '   collected by the ai-girls project (ZipZipPipe, "AI娘化"). Attribution and\n' +
    '   licence notes are in README.md; both are shown inside the film as\n' +
    '   borrowed identity, never as the film\'s own artwork.') +
    'window.EM = window.EM || {};\nEM.PERSONAS = [\n' + body + '\n];\n');
}

console.log('\n  generated for a ' + END.toFixed(3) + ' s film.');
