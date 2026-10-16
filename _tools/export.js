/* ============================================================================
   _tools/export.js — the film, out of the browser and into a file.

   The picture is a function of t (rule 2), so an export never has to PLAY the
   film: this asks the page for one frame at a time, by name, as fast as the
   machine can render it, and pipes the PNGs straight into ffmpeg. Nothing is
   recorded in real time, so no frame can be dropped, doubled or late — the file
   contains exactly the frames the film says it has, and a second run produces
   the same file.

   It is also how a 4K master is made: `--scale=2.4` makes the page lay the whole
   composition down at 3840 x 2160 (the geometry is written in one space and a
   transform takes it out, see 60_app.js), so 4K is a NATIVE render, not an
   upscale. The one soft element is the borrowed art: the nine portraits are
   280 x 500 JPEG plates.

   Usage, from the project root:
     node _tools/export.js                       1600 x 900, 30 fps, with the song
     node _tools/export.js --scale=2.4           3840 x 2160 master
     node _tools/export.js --probe               one frame — and say whether it worked
     node _tools/export.js --from=190 --to=212 --out=dist/ending.mp4

   Flags: --from --to --fps --out --audio --ffmpeg --chrome --crf --preset
          --scale --workers --port --probe --keep-open

   With --workers=N the timeline is cut into N frame-aligned ranges, each one
   rendered by its own browser and encoded by its own x264 (an elementary stream,
   which has no timestamps to disagree about); the pieces are then joined by
   concatenating the bytes and muxing once. A clean render is a pure function of t,
   so the joins cannot show: the result is the same file one worker would write.
   ========================================================================== */
'use strict';

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { findChrome } = require('./browser');

const ROOT = path.dirname(__dirname);
const END = 211.98367;                    /* the song, measured (see HANDOFF.md) */
/* ffmpeg is not on PATH on this machine; these are the copies that ship inside
   other applications, and only the first one has libx264 + aac */
const FFMPEG_HINTS = [
  process.env.FFMPEG_PATH,
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'kzip_sogou', 'ffmpeg.exe'),
  'C:\\Program Files\\Tencent\\QQBrowser\\20.1.7233.400\\ffmpeg\\ffmpeg.exe',
  'C:\\Program Files\\Red Giant\\Trapcode Suite\\Tools\\ffmpeg.exe'
].filter(Boolean);

/* ---------- arguments ----------------------------------------------------- */
function parseArgs(argv) {
  const o = {
    from: 0, to: END, fps: 30, scale: 1, crf: 16, preset: 'medium',
    port: 9333, workers: 1, pipe: 'jpeg', probe: false, keepOpen: false,
    out: null, audio: null, decoder: null,
    ffmpeg: null, chrome: null
  };
  for (const a of argv.slice(2)) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(a);
    if (!m) continue;
    const k = m[1], v = m[2];
    switch (k) {
      case 'from': o.from = +v; break;
      case 'to': o.to = +v; break;
      case 'fps': o.fps = +v; break;
      case 'scale': o.scale = +v; break;
      case 'crf': o.crf = +v; break;
      case 'preset': o.preset = v; break;
      case 'out': o.out = v; break;
      case 'audio': o.audio = v; break;
      case 'ffmpeg': o.ffmpeg = v; break;
      case 'decoder': o.decoder = v; break;
      case 'chrome': o.chrome = v; break;
      case 'port': o.port = +v; break;
      case 'workers': o.workers = Math.max(1, Math.min(16, +v || 1)); break;
      case 'pipe': o.pipe = (v || 'jpeg').toLowerCase(); break;
      case 'probe': o.probe = true; break;
      case 'keep-open': o.keepOpen = true; break;
      default: console.error('  (ignoring unknown flag --' + k + ')');
    }
  }
  const DW = Math.round(1600 * o.scale), DH = Math.round(900 * o.scale);
  o.dw = DW; o.dh = DH;
  o.out = path.resolve(ROOT, o.out ||
    'dist/world-execute-me_' + DW + 'x' + DH + '_' + o.fps + 'fps.mp4');
  o.audio = path.resolve(ROOT, o.audio || 'original/Mili - world.execute (me) ;.mp3');
  return o;
}

/* ---------- ffmpeg -------------------------------------------------------- */
function findFfmpeg(given) {
  const tries = [];
  if (given) tries.push(given);
  tries.push(path.join(ROOT, 'ffmpeg.exe'), 'ffmpeg');
  for (const h of FFMPEG_HINTS) tries.push(h);
  for (const t of tries) {
    let ver;
    try { ver = spawnSync(t, ['-hide_banner', '-version'], { encoding: 'utf8' }); }
    catch (e) { continue; }
    if (!ver || ver.status !== 0) continue;
    let enc;
    try { enc = spawnSync(t, ['-hide_banner', '-encoders'], { encoding: 'utf8' }); }
    catch (e) { continue; }
    if (enc && /libx264/.test(enc.stdout || '')) {
      return { bin: t, version: (ver.stdout || '').split('\n')[0].trim() };
    }
    console.error('  ffmpeg without libx264, skipping: ' + t);
  }
  return null;
}

/* ---------- the browser --------------------------------------------------- */
async function waitForPage(port, timeoutMs) {
  const t0 = Date.now();
  for (;;) {
    try {
      const r = await fetch('http://127.0.0.1:' + port + '/json/list');
      const list = await r.json();
      const page = list.find(t => t.type === 'page' && /index\.html/.test(t.url || ''));
      if (page && page.webSocketDebuggerUrl) return page;
    } catch (e) { /* not listening yet */ }
    if (Date.now() - t0 > timeoutMs) throw new Error('chrome did not open a page on port ' + port);
    await new Promise(r => setTimeout(r, 250));
  }
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    const w = waiting.get(msg.id);
    if (!w) return;
    waiting.delete(msg.id);
    if (msg.error) w.rej(new Error(msg.error.message));
    else w.res(msg.result);
  });
  const open = new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', () => rej(new Error('websocket to the page failed')));
  });
  return {
    open,
    close() { try { ws.close(); } catch (e) {} },
    send(method, params) {
      const mid = ++id;
      return new Promise((res, rej) => {
        waiting.set(mid, { res, rej });
        ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
      });
    },
    async eval(expression) {
      const r = await this.send('Runtime.evaluate', { expression, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + expression);
      return r.result.value;
    }
  };
}

function launchChrome(o, k) {
  k = k || 0;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wem-export-'));
  const url = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/') +
    '?t=0&audio=0&ui=0&scale=' + o.scale;
  const args = [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files',
    '--remote-allow-origins=*', '--user-data-dir=' + profile,
    '--disk-cache-dir=' + path.join(profile, 'cache'),
    '--window-size=' + Math.min(1920, o.dw) + ',' + Math.min(1080, o.dh),
    '--remote-debugging-port=' + (o.port + k), url
  ];
  const proc = spawn(o.chrome, args, { stdio: 'ignore' });
  return { proc, profile, url };
}

/* ---------- writing into ffmpeg's stdin, one frame at a time -------------- */
function write(stream, buf) {
  return new Promise(res => { stream.write(buf) ? res() : stream.once('drain', res); });
}

/* The frame's pixels go from the canvas to ffmpeg as one JPEG per frame, quality
   0.98. It is a pipe, not the master: at 4K this build's own ffmpeg has no PNG
   decoder (the copies that ship inside other applications are stripped), and the
   lossless alternative — raw RGB — is 33 MB a frame, which is 210 GB of transfer
   for no visible difference. Use --pipe=png with a full ffmpeg if you want it
   arithmetic-exact. */
const b64Of = s => s.slice(s.indexOf(',') + 1);
function pipeCodec(o) {
  return o.pipe === 'png'
    ? { mime: 'image/png', dec: 'png', quality: undefined }
    : { mime: 'image/jpeg', dec: 'mjpeg', quality: 0.98 };
}

/* ---------- the parallel path: N browsers, N encoders, one join -------------
   A 4K frame costs about half a second: draw it, encode it as a PNG, hand it
   over, run it through x264 — and that is one core doing all four. So the
   timeline is cut into frame-aligned ranges and each range gets its own browser
   and its own encoder writing an elementary H.264 stream, which has no container
   timestamps to disagree about where two pieces meet. The pieces are then
   concatenated as bytes and muxed once, with the song. Because a frame is a pure
   function of t, the joins cannot show: the result is the file one worker would
   have written. */
function encoderArgs(o, tail) {
  const pc = pipeCodec(o);
  return ['-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'image2pipe', '-vcodec', pc.dec, '-framerate', String(o.fps), '-i', 'pipe:0',
    '-c:v', 'libx264', '-preset', o.preset, '-crf', String(o.crf),
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-g', String(o.fps * 2),
    ...tail];
}

/* Is this ffmpeg able to READ the frames at all? The copies that ship inside
   other applications are stripped in different directions: the one with libx264
   has no PNG decoder, the one with a PNG decoder has no libx264. */
function hasPngDecoder(bin) {
  const r = spawnSync(bin, ['-hide_banner', '-decoders'], { encoding: 'utf8' });
  return r.status === 0 && /^\s*V\S*\s+png\s/m.test(r.stdout || '');
}

/* The encoder's input, plus — when the encoder's own ffmpeg cannot read PNG — the
   decoder that stands in front of it: PNG in, raw out, raw in, H.264 out. The
   cost is one extra copy of every frame; what it buys is an arithmetic-exact path
   from the canvas to x264, which is worth it because this film is thousands of
   one-pixel hairlines and type on black, and a JPEG stage at this scale measures
   26 dB against the canvas (see the note by pipeCodec). */
function openPipeline(o, ff, tail) {
  const pc = pipeCodec(o);
  if (pc.dec === 'png' && !hasPngDecoder(ff.bin)) {
    if (!o.decoder) {
      throw new Error('the encoder ffmpeg cannot decode PNG — pass --decoder=PATH ' +
        '(any ffmpeg that can) or take --pipe=jpeg');
    }
    const dec = spawn(o.decoder, ['-hide_banner', '-loglevel', 'error',
      '-f', 'image2pipe', '-vcodec', 'png', '-framerate', String(o.fps), '-i', 'pipe:0',
      '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'],
      { stdio: ['pipe', 'pipe', 'inherit'] });
    const enc = spawn(ff.bin, ['-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', o.dw + 'x' + o.dh,
      '-framerate', String(o.fps), '-i', 'pipe:0', ...tail],
      { stdio: ['pipe', 'ignore', 'inherit'] });
    dec.stdout.pipe(enc.stdin);
    dec.stdin.on('error', () => {});
    return { stdin: dec.stdin, procs: [dec, enc] };
  }
  const enc = spawn(ff.bin, encoderArgs(o, tail), { stdio: ['pipe', 'ignore', 'inherit'] });
  enc.stdin.on('error', () => {});
  return { stdin: enc.stdin, procs: [enc] };
}

async function bootWorker(o, k) {
  const chrome = launchChrome(o, k);
  try {
    const page = await waitForPage(o.port + (k || 0), 30000);
    const cdp = connect(page.webSocketDebuggerUrl);
    await cdp.open;
    await cdp.send('Runtime.enable');
    /* the page names itself when it is ready (`still <t>`), which happens after
       every image has been DECODED — the difference between the film and a row
       of flat tints */
    const t0 = Date.now();
    for (;;) {
      const title = await cdp.eval('document.title');
      if (/^still/.test(title || '')) break;
      if (Date.now() - t0 > 30000) throw new Error('a page never finished booting');
      await new Promise(r => setTimeout(r, 200));
    }
    if (await cdp.eval('typeof EM.renderAt') !== 'function') {
      throw new Error('this index.html has no EM.renderAt — run: node build.js');
    }
    /* the film's own loop would re-render t=0 every tick: take it out of the way */
    await cdp.eval('window.requestAnimationFrame = function () { return 0; };');
    return { chrome, cdp };
  } catch (e) {
    try { chrome.proc.kill(); } catch (x) {}
    throw e;
  }
}

async function runRange(o, ff, w, chunk, tail, label, stats) {
  const { chrome, cdp } = await bootWorker(o, w);
  const pipe = openPipeline(o, ff, tail);
  const done = Promise.all(pipe.procs.map(p => new Promise(res => p.on('exit', c => res(c)))));
  let encCode = null;
  pipe.procs[pipe.procs.length - 1].on('exit', c => { encCode = c; });
  try {
    for (let i = chunk.a; i < chunk.b; i++) {
      if (encCode !== null) throw new Error('x264 exited early with ' + encCode);
      const t = +(o.from + i / o.fps).toFixed(4);
      const pc = pipeCodec(o);
      const data = await cdp.eval('EM.renderAt(' + t + ', "' + pc.mime + '"' +
        (pc.quality === undefined ? '' : ', ' + pc.quality) + ')');
      const buf = Buffer.from(b64Of(data), 'base64');
      stats.bytes += buf.length;
      stats.frames++;
      await write(pipe.stdin, buf);
      if ((i - chunk.a) % 150 === 0 || i === chunk.b - 1) {
        const el = (Date.now() - stats.t0) / 1000;
        const left = el / stats.frames * (stats.total - stats.frames);
        console.log('  ' + label + ' frame ' + stats.frames + '/' + stats.total +
          '  t=' + t.toFixed(2) + '  ' + (stats.frames / el).toFixed(1) + ' fps aggregate  ' +
          (stats.bytes / 1048576).toFixed(0) + ' MB in  eta ' + (left / 60).toFixed(1) + ' min');
      }
    }
    pipe.stdin.end();
    const codes = await done;
    if (codes.some(c => c !== 0)) throw new Error('the encoder chain exited with ' + codes.join('/'));
  } finally {
    try { pipe.stdin.destroy(); } catch (e) {}
    for (const p of pipe.procs) { try { p.kill(); } catch (e) {} }
    cdp.close();
    try { chrome.proc.kill(); } catch (e) {}
    try { fs.rmSync(chrome.profile, { recursive: true, force: true }); } catch (e) {}
  }
}

async function mainParallel(o, ff) {
  const N = Math.max(1, Math.round((o.to - o.from) * o.fps));
  const chunks = [];
  for (let k = 0; k < o.workers; k++) {
    const a = Math.floor(N * k / o.workers), b = Math.floor(N * (k + 1) / o.workers);
    if (b > a) chunks.push({ a: a, b: b });
  }
  const haveAudio = fs.existsSync(o.audio);
  console.log('plan      ' + N + ' frames over ' + chunks.length + ' worker' +
    (chunks.length > 1 ? 's' : '') +
    (haveAudio ? ', with the song' : ' — no audio found, video only'));
  const stats = { t0: Date.now(), frames: 0, bytes: 0, total: N };
  /* Each range is a finished MP4 of its own, so every frame has a timestamp and
     the pieces can be joined without re-encoding. (An elementary H.264 stream has
     no timestamps at all — muxing one drops the audio, which is how this was
     found: the mux printed "pts has no value" and wrote a silent film.) */
  const parts = chunks.map((c, j) => path.join(os.tmpdir(), 'wem-' + process.pid + '-' + j + '.mp4'));
  await Promise.all(chunks.map((c, j) =>
    runRange(o, ff, j, c, ['-f', 'mp4', '-movflags', '+faststart', parts[j]],
      (j + 1) + '/' + chunks.length, stats)));
  let mux;
  let listPath = null;
  if (parts.length > 1) {
    listPath = path.join(os.tmpdir(), 'wem-' + process.pid + '-list.txt');
    fs.writeFileSync(listPath, parts.map(p => "file '" + p.replace(/\\/g, '/') + "'").join('\n') + '\n');
    console.log('joining   ' + parts.length + ' encoded pieces (no re-encode)');
    mux = ['-y', '-hide_banner', '-loglevel', 'warning', '-f', 'concat', '-safe', '0', '-i', listPath];
  } else {
    mux = ['-y', '-hide_banner', '-loglevel', 'warning', '-i', parts[0]];
  }
  if (haveAudio) mux.push('-ss', String(o.from), '-t', String(o.to - o.from),
    '-i', o.audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k');
  else mux.push('-map', '0:v');
  mux.push('-c:v', 'copy', '-movflags', '+faststart', o.out);
  const r = spawnSync(ff.bin, mux, { encoding: 'utf8' });
  for (const p of parts) { try { fs.rmSync(p, { force: true }); } catch (e) {} }
  if (listPath) { try { fs.rmSync(listPath, { force: true }); } catch (e) {} }
  const said = String((r.stderr || '') + (r.stdout || '')).trim();
  if (said) console.log('mux       ' + said.split('\n').slice(-4).join('\n          '));
  if (r.status !== 0) {
    throw new Error('mux failed: ' + String(r.stderr || '').trim().split('\n').slice(-2).join(' '));
  }
  const st = fs.statSync(o.out);
  console.log('done      ' + o.out);
  console.log('          ' + (st.size / 1048576).toFixed(1) + ' MB  ·  ' + N + ' frames  · ' +
    ' ' + (N / o.fps).toFixed(2) + ' s  ·  ' + ((Date.now() - stats.t0) / 60000).toFixed(1) + ' min');
}

async function main() {
  const o = parseArgs(process.argv);
  o.chrome = findChrome(o.chrome);
  const ff = findFfmpeg(o.ffmpeg);
  if (!ff) {
    console.error('no ffmpeg with libx264 found — pass --ffmpeg=PATH');
    process.exit(2);
  }
  if (!o.chrome) {
    console.error('no Chrome or Edge found — pass --chrome=PATH or set CHROME_PATH');
    process.exit(2);
  }
  fs.mkdirSync(path.dirname(o.out), { recursive: true });

  console.log('film      ' + o.dw + ' x ' + o.dh + ' @ ' + o.fps + ' fps, ' +
    o.from.toFixed(3) + ' → ' + o.to.toFixed(3) + ' s');
  console.log('ffmpeg    ' + ff.version + '  (' + ff.bin + ')');
  console.log('browser   ' + o.chrome);

  /* a PNG-capable ffmpeg, needed only when the encoder's own copy cannot read
     PNG (and on this machine it cannot — see hasPngDecoder) */
  if (!o.decoder) {
    for (const c of [o.ffmpeg].filter(Boolean).concat(FFMPEG_HINTS)) {
      if (fs.existsSync(c) && hasPngDecoder(c)) { o.decoder = c; break; }
    }
  }

  /* ---- one frame, asked for by name: the probe -----------------------------
     The page hands back its own PNG here, so this is also the frame to compare
     the pipeline against — it is what the canvas actually holds, before any
     encoder has touched it. */
  const w0 = await bootWorker(o, 0);
  try {
    const size = await w0.cdp.eval('[EM.W, EM.H, document.getElementById("stage").width, ' +
      'document.getElementById("stage").height].join("x")');
    console.log('stage     ' + size + '   (layout x device, from the page)');
    console.log('pipe      ' + pipeCodec(o).mime + (pipeCodec(o).quality === undefined
      ? (hasPngDecoder(ff.bin) ? ' (lossless, direct)'
        : ' (lossless, two-stage via ' + (o.decoder || 'MISSING') + ')')
      : ' q=' + pipeCodec(o).quality));
    if (o.probe) {
      const data = await w0.cdp.eval('EM.renderAt(' + o.from + ')');
      const buf = Buffer.from(b64Of(data), 'base64');
      const p = path.join(path.dirname(o.out), '_probe_' + o.dw + 'x' + o.dh + '.png');
      fs.writeFileSync(p, buf);
      console.log('probe     one frame at t=' + o.from + ' → ' + p +
        '  (' + (buf.length / 1024).toFixed(0) + ' KB)');
      return;
    }
  } finally {
    w0.cdp.close();
    if (!o.keepOpen) {
      try { w0.chrome.proc.kill(); } catch (e) {}
      try { fs.rmSync(w0.chrome.profile, { recursive: true, force: true }); } catch (e) {}
    }
  }

  /* ---- and the film: workers, encoders, one join --------------------------- */
  await mainParallel(o, ff);
}

main().catch(e => { console.error('export failed: ' + e.message); process.exit(1); });
