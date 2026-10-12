/* ============================================================================
   src/60_app.js — the engine.

   ONE clock, and it is not the frame loop's. `t = audio.currentTime + offset`.
   Nothing accumulates, nothing counts frames, and the picture at a given t is
   the same whether you played up to it or yanked the bar there.

   The overlay is the only place allowed to be non-deterministic, and it uses
   that freedom for one thing: it counts frames past the end of the song. That
   counter is the film's last sentence — there is no exit condition.
   ========================================================================== */
(function (EM) {
  'use strict';
  var C = EM.C, W = EM.W, H = EM.H;

  /* A page that silently renders nothing is the worst failure mode there is,
     so anything thrown is written where a headless dump can read it. */
  window.onerror = function (msg, src, line) {
    var el = document.getElementById('err');
    if (!el) {
      el = document.createElement('div');
      el.id = 'err';
      el.style.cssText = 'position:fixed;left:8px;bottom:8px;max-width:90vw;z-index:99;' +
        'background:#200;color:#f88;font:12px/1.5 monospace;padding:6px 10px;white-space:pre-wrap';
      document.body.appendChild(el);
    }
    el.textContent += 'ERROR ' + msg + ' @' + String(src).split('/').pop() + ':' + line + '\n';
  };

  var CLIPS = [
    'Mili - world.execute (me) ;.mp3',
    'Mili - world.execute(me) ;.mp3',
    'Mili - world.execute (me);.mp3',
    'Mili - world.execute(me);.mp3',
    'original/Mili - world.execute (me) ;.mp3',
    'original/Mili - world.execute(me);.mp3'
  ];

  var Q = new URLSearchParams(location.search);
  var STILL = Q.has('t');
  var NOAUDIO = Q.get('audio') === '0';

  /* ---------- the render size -----------------------------------------------
     The film's geometry is written in ONE space (EM.W x EM.H, 1600 x 900) and a
     transform takes it out to whatever the stage actually is. So the composition,
     the hairlines and the type are identical at every size — they are simply laid
     down with more pixels. `?scale=2.4` is 3840 x 2160: the same drawing, not a
     photograph of it. At scale 1 every expression below is what it always was.

     The one thing that cannot gain detail is the borrowed art: the nine portraits
     are 280 x 500 JPEG plates, so at 4K they are the soft element in a frame whose
     every other mark — board, traces, solder, registers, type — is vector.

     Everything that measures in DEVICE pixels (stage, glow, grain, tear strips,
     sweep, intertitle) says DW/DH/SC here; everything the film draws stays in
     EM.W x EM.H. */
  var SC = C.clamp(parseFloat(Q.get('scale') || '1') || 1, 0.5, 4);
  var DW = Math.round(W * SC), DH = Math.round(H * SC);

  var scene = document.createElement('canvas');
  scene.width = DW; scene.height = DH;
  var sctx = scene.getContext('2d');
  sctx.setTransform(SC, 0, 0, SC, 0, 0);       /* the film draws in its own space */
  var lo = document.createElement('canvas');
  lo.width = Math.round(DW / 4); lo.height = Math.round(DH / 4);
  var lctx = lo.getContext('2d');
  var grainTile = null;

  var stage = document.getElementById('stage');
  stage.width = DW; stage.height = DH;         /* the BITMAP; CSS still fits the window */
  var ctx = stage.getContext('2d');
  var D = EM.newDraw(sctx);
  var audio = document.getElementById('clip');

  var ui = {
    play: document.getElementById('bPlay'),
    restart: document.getElementById('bRestart'),
    full: document.getElementById('bFull'),
    hide: document.getElementById('bHide'),
    debug: document.getElementById('bDebug'),
    seek: document.getElementById('seek'),
    wave: document.getElementById('wave'),
    off: document.getElementById('off'),
    offTxt: document.getElementById('offTxt'),
    vol: document.getElementById('vol'),
    ui: document.getElementById('ui'),
    ov: document.getElementById('ov'),
    hint: document.getElementById('hint'),
    banner: document.getElementById('banner')
  };

  var S = {
    t: 0, offset: 0, playing: false, syn: 0, synStart: 0,
    images: 0, frames: 0, lastWall: 0, gapAt: 0, muted: false,
    ready: false, audioOK: false, ready_unused: 0
  };

  /* ---------- the nine faces ---------- */
  EM.img = {};
  function loadImages() {
    var list = [];
    for (var i = 0; i < EM.PERSONAS.length; i++) {
      var p = EM.PERSONAS[i], k;
      k = 'girl-' + p.id;
      EM.img[k] = new Image(); EM.img[k].src = p.girl; list.push(EM.img[k]);
      /* the blink plate exists only for the figures that were measured — see
         assets/figures.js, which also says why doubao has none */
      if (EM.FIGURES && EM.FIGURES[p.id]) {
        k = 'girlblink-' + p.id;
        EM.img[k] = new Image();
        EM.img[k].src = p.girl.replace(/\.jpg$/, '-blink.jpg');
        list.push(EM.img[k]);
      }
      k = 'mark-' + p.id;
      EM.img[k] = new Image(); EM.img[k].src = p.mark; list.push(EM.img[k]);
    }
    return Promise.all(list.map(function (im) {
      /* `complete` means the BYTES arrived, not that the picture can be PAINTED.
         Drawing a canvas from an image that has not been rasterised yet yields a
         flat tint, and one capture came back with the subject as a solid blue
         slab — the race is real. decode() waits for the raster; the two-and-a-
         half-second guard stays so a missing file can never hang the film (it
         then draws the wireframe circle instead, see faceCanvas). */
      var ready = (typeof im.decode === 'function')
        ? im.decode().catch(function () {})
        : new Promise(function (res) {
            if (im.complete) return res();
            im.onload = im.onerror = res;
          });
      return Promise.race([ready, new Promise(function (res) { setTimeout(res, 2500); })]);
    }));
  }

  function grain() {
    var g = document.createElement('canvas');
    g.width = g.height = 128;
    var c = g.getContext('2d');
    var d = c.createImageData(128, 128);
    for (var i = 0; i < 128 * 128; i++) {
      var v = 128 + (C.hash01(i, 313) * 60 - 30);
      d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v;
      d.data[i * 4 + 3] = 255;
    }
    c.putImageData(d, 0, 0);
    return g;
  }

  /* ---------- one frame ---------- */
  function render(t) {
    var w = EM.world(t);
    /* The frame is nailed down. Nothing here scales, rotates or flashes the
       whole picture: the beat is carried by the plate's own deformation (see
       beatWarp in 15_sceneapi.js) and by the board's local responses, so the
       composition stays steady enough to read while the pattern still lands
       on every note. */
    var c = D.ctx;

    /* ---- THE GROUND, LAID BEFORE THE CUT -----------------------------------
       The scene canvas is reused every frame, so whatever the erase has taken
       has to be re-laid as the board's own ground rather than left as the
       previous frame's pixels. This fill is therefore NOT inside the clip
       below. It is harmless where the board is still standing — the board lays
       its own, opaque ground right over it — and it is the ground the last shots
       are written on once the board is gone. */
    var pal = EM.palette(w);
    c.fillStyle = C.rgba(pal.bg);
    c.fillRect(0, 0, W, H);
    c.fillStyle = C.rgba(pal.bg2, 0.55);
    c.fillRect(0, 0, W, H * 0.42);

    /* ---- WHAT THE LINE HAS PASSED IS NOT DRAWN AGAIN ----------------------
       The cleanup line is a CUT, not a curtain that is lifted afterwards: while
       it runs, the instrument is clipped at its leading edge, and once it has
       left the frame the clip covers the whole stage, so the board, the
       solder, the nine sockets, the registers, the note rail, the code wall and
       the border are simply not drawn any more. That is what the film's own
       last shot needs in order to be true — it says the nineteenth execution is
       written "on the origin of an EMPTY board" (see finalExec), and it was
       written over a grid, a register bank and a border that were still
       standing.

       The plate and the lyric band are drawn AFTER the cut, and the solder of
       the notes played after the purge with them: a machine that has deleted
       its own instruments still has to be a film, and it still starts writing
       on the clean board again (see EM.drawFreshJoints). What is gone for good
       is the apparatus, not the voice. */
    var cut = EM.eraseCut(t);
    var running = EM.eraseRunning(t);
    var gone = cut !== null;
    if (cut !== null) {
      c.save();
      c.beginPath();
      c.rect(cut, 0, EM.W + 40, EM.H);
      c.clip();
    }
    var St = EM.drawWorldLayer(D, t);          /* board, solder, nine sockets */
    EM.drawGrammar(D, St, { cx: W / 2, cy: H / 2 - 10, R: 300 });
    EM.drawCodeWall(D, St);                     /* the program, running: the floor */
    EM.drawWorn(D, St);                         /* the face, in its window      */
    EM.drawLyricImage(D, St);                   /* what the LINE asks for       */
    EM.drawAbsence(D, St);                      /* what is missing, measured    */
    EM.drawStandingNine(D, St);                 /* the nine, while they stand   */
    if (!gone || running) EM.drawSequence(D, t, St);   /* the shot, in its place */
    EM.drawIdent(D, St);                        /* whose face this is, large    */
    EM.drawBootChat(D, St);                     /* the opening, as a conversation */
    EM.drawTrapped(D, St);                      /* "trapped", turning in the middle */
    EM.drawRegisters(D, St);
    if (!gone) EM.drawLyric(D, St);             /* the lyric band               */
    EM.M.noteRail(D, St, EM.RAIL[St.act] || 'ticks');   /* skeleton: outside warp */
    EM.drawFrame(D, St);                        /* border, rulers, terminal     */

    if (cut !== null) c.restore();

    /* ---- and what is left to say, on what is left ------------------------- */
    if (gone && !running) EM.drawSequence(D, t, St);  /* written on what is left */
    if (gone && running) EM.drawLyric(D, St);   /* the band outlives the board  */
    if (gone) EM.drawFreshJoints(D, St);        /* the machine, writing again   */
    EM.drawPurgeStage(D, St);                   /* the line, last of all        */
    return w;
  }

  /* ---------- the synthesiser: only speaks when the machine is overloaded --- */
  function compose(t) {
    var w = EM.world(t);
    var overload = C.clamp(w.chaos * (w.alarmIndex >= 2 ? 1 : 0.35), 0, 1);
    var quiet = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ctx.clearRect(0, 0, DW, DH);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(scene, 0, 0);

    if (!quiet) {
      /* bloom: the film is drawn with hairlines, so the glow is what gives it
         a monitor instead of a plotter */
      lctx.clearRect(0, 0, lo.width, lo.height);
      lctx.drawImage(scene, 0, 0, lo.width, lo.height);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.20 + 0.22 * overload;
      ctx.drawImage(lo, 0, 0, lo.width, lo.height, 0, 0, DW, DH);

      /* The glitch is an EVENT, not a texture. Gated this high it appears only
         inside the execution storm; at chaos 0.18 it used to smear a strip
         across the register panel and make the numbers unreadable, which is a
         bad trade for an effect nobody asked for. */
      if (overload > 0.55) {
        var dx = SC * (1 + 5 * (overload - 0.55) / 0.45);
        ctx.globalAlpha = 0.07 * overload;
        ctx.drawImage(scene, dx, 0);
        ctx.drawImage(scene, -dx, 0);
      }
      if (overload > 0.72) {
        /* strips slide, placed by a hash of t so a seek restores them exactly */
        var n = Math.round((overload - 0.72) / 0.28 * 4);
        for (var k = 0; k < n; k++) {
          var y = Math.floor(C.hash01(k + Math.floor(t * 6), 401) * (DH - 60 * SC));
          var h = SC * (14 + C.hash01(k + Math.floor(t * 6), 409) * 46);
          var off = SC * C.sym(k + Math.floor(t * 6), 419) * 26 * overload;
          ctx.globalAlpha = 0.30;
          ctx.drawImage(scene, 0, y, DW, h, off, y, DW, h);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.045 + 0.05 * overload;
      for (var gy = 0; gy < DH; gy += 128) {
        for (var gx = 0; gx < DW; gx += 128) ctx.drawImage(grainTile, gx, gy);
      }

      /* --- LOOP: the glitch is an EVENT, every few seconds, not a texture --- */
      var g = EM.MO.glitch(t, 0.19);
      if (g.on > 0.01) {
        var j = 3 + 7 * g.on;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.14 * g.on;
        ctx.drawImage(scene, j, C.sym(g.seed, 811) * 2);
        ctx.drawImage(scene, -j, C.sym(g.seed, 813) * 2);
        /* one torn strip, at a height taken from the seed so it is never
           in the same place twice */
        var ty = Math.floor(C.hash01(g.seed, 821) * (DH - 90 * SC));
        var th = SC * (26 + C.hash01(g.seed, 823) * 40);
        ctx.globalAlpha = 0.5 * g.on;
        ctx.drawImage(scene, 0, ty, DW, th,
          SC * C.sym(g.seed, 827) * 26 * g.on, ty, DW, th);
        ctx.globalCompositeOperation = 'source-over';
      }

      /* --- LOOP: a sweep at constant speed. It is a device, not a reaction,
             so it never varies and never accelerates. --- */
      var sy = SC * EM.MO.scanY(t, 7.6);
      var gg = ctx.createLinearGradient(0, sy - 46 * SC, 0, sy + 46 * SC);
      gg.addColorStop(0, 'rgba(86,214,232,0)');
      gg.addColorStop(0.5, 'rgba(86,214,232,' + (0.055 + 0.03 * overload) + ')');
      gg.addColorStop(1, 'rgba(86,214,232,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(0, sy - 46 * SC, DW, 92 * SC);
      ctx.fillStyle = 'rgba(150,220,235,.10)';
      ctx.fillRect(0, sy, DW, Math.max(1, SC));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    /* --- EXIT: the gap between two paragraphs is a black frame with one line
           of code in it.

           It fires ONLY where the act changes, and only on a cue long enough to
           survive losing a third of a second. An earlier version fired on every
           cue: with 131 cues averaging 1.6 s, 0.85 s of black each meant the
           film was dark for four tenths of its length. The rendered sheet
           showed two frames in a row that were nothing but black — which is
           what a contact sheet is for. */
    var cue = EM.Lyrics.at(t);
    if (cue) {
      var prev = cue.i > 0 ? EM.Lyrics.cues[cue.i - 1] : null;
      var isSeam = cue.i > 0 && prev && prev.act !== cue.act && cue.dur > 2.0;
      var it = isSeam ? EM.MO.intertitle(t, cue, 0.30) : null;
      if (it && it.a > 0.01) {
        ctx.fillStyle = 'rgba(0,0,0,' + (0.86 * it.a) + ')';
        ctx.fillRect(0, 0, DW, DH);
        var code = 'run(' + cue.scene + ')   # ' + cue.act + '   ' +
          (cue.persona ? 'borrow ' + cue.persona : 'no face') + '   t=' + EM.C.fmtTime(t);
        ctx.globalAlpha = it.a;
        ctx.font = '600 ' + (22 * SC) + 'px ui-monospace,Consolas,monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(150,220,235,.92)';
        ctx.fillText(code, DW / 2, DH / 2);
        ctx.globalAlpha = 1;
      }
    }
    return w;
  }

  /* ---------- clock ---------- */
  function now() {
    if (S.audioOK && !NOAUDIO) {
      if (!S.playing && S.gapAt) return S.t;
      return (audio.currentTime || 0) + S.offset;
    }
    return (performance.now() - S.synStart) / 1000 + S.offset;
  }

  /* ---------- loop ---------- */
  function frame() {
    var t = STILL ? (+Q.get('t')) : now();
    t = C.clamp(t, 0, EM.AUDIO_END);
    if (!STILL && S.playing && (S.audioOK && !NOAUDIO) && audio.ended) t = EM.AUDIO_END;
    S.t = t;
    render(t);
    compose(t);
    S.frames++;
    updateOverlay();
    drawWaveBar(t);
    requestAnimationFrame(frame);
  }

  /* ---------- the export hook -----------------------------------------------
     One call, one frame, for whatever is assembling the picture outside a tab.
     This film is a function of t, so an export never has to PLAY it: every frame
     can be asked for by name, in any order, as fast as the machine manages — which
     is why a frame can never be dropped, doubled or late (see _tools/export.js).
     Returns the composited frame as a PNG data URL: exactly what the stage would
     have shown at that instant, bloom and grain included. */
  EM.renderAt = function (t, mime, q) {
    t = C.clamp(+t || 0, 0, EM.AUDIO_END);
    S.t = t;
    render(t);
    compose(t);
    return q === undefined ? stage.toDataURL(mime || 'image/png')
                           : stage.toDataURL(mime || 'image/png', q);
  };

  /* ---------- the seek bar: the real envelope, and every cue ---------- */
  var waveCtx = ui.wave.getContext('2d');
  function drawWaveBar(t) {
    var w = ui.wave.width, h = ui.wave.height, i;
    waveCtx.clearRect(0, 0, w, h);
    waveCtx.fillStyle = 'rgba(150,172,186,.30)';
    var n = EM.WAVE.length;
    for (i = 0; i < n; i++) {
      var x = i / n * w, v = EM.WAVE[i] / 255;
      waveCtx.fillRect(x, h / 2 - v * (h / 2 - 1), Math.max(1, w / n - 0.5), v * (h - 2));
    }
    /* 131 lyric ticks: every one is a measured time from the LRC */
    waveCtx.fillStyle = 'rgba(86,214,232,.55)';
    for (i = 0; i < EM.Lyrics.cues.length; i++) {
      var cx = EM.Lyrics.cues[i].t / EM.AUDIO_END * w;
      waveCtx.fillRect(cx, h - 6, 1, 6);
    }
    var px = t / EM.AUDIO_END * w;
    waveCtx.fillStyle = '#f6be50';
    waveCtx.fillRect(px - 1, 0, 2, h);
  }

  /* ---------- the overlay: live, and honest about not being the film ---------- */
  function updateOverlay() {
    if (!ui.ov.classList.contains('on')) { S.lastWall = performance.now(); return; }
    var cue = EM.Lyrics.at(S.t);
    var w = EM.world(S.t);
    var past = S.t >= EM.AUDIO_END - 0.001;
    var lines = [
      'PICTURE      pure function of t',
      't            ' + EM.C.fmtTime(S.t) + ' / ' + EM.C.fmtTime(EM.AUDIO_END),
      'clock        ' + (S.audioOK && !NOAUDIO ? 'EXTERNAL (media)' : 'SYNTHETIC (page timer)'),
      'offset       ' + (S.offset >= 0 ? '+' : '') + Math.round(S.offset * 1000) + ' ms',
      'cue          ' + (cue ? cue.scene : '—') + '  #' + (cue ? cue.i + 1 : 0) + '/' + EM.Lyrics.count,
      'act          ' + (cue ? cue.act : '—') + (cue && cue.persona ? '   wearing ' + cue.persona : ''),
      'line         ' + Math.round((cue ? EM.state(S.t).line : 0) * 100) + ' %',
      'beat         ' + (EM.clock.indexAt(S.t) + 1) + ' / ' + EM.clock.count,
      'pitch / vel  ' + EM.clock.pitchAt(S.t) + ' / ' + EM.clock.velocityAt(S.t),
      'joints       ' + EM.remainingJoints(S.t) + ' / ' + EM.ONSETS.length,
      'purge        ' + w.purge.toFixed(3) + (w.purge > 0.999 ? '  (taken)' : ''),
      '',
      'NOT PART OF THE PICTURE ↓',
      'frames       ' + S.frames + (past ? '   still rising' : ''),
      'state        ' + (S.playing ? 'running' : 'T HELD — NOT WAITING'),
      'exit         NONE'
    ];
    ui.ov.textContent = lines.join('\n');
  }

  /* ---------- banner: session facts that must not enter the picture --------- */
  var bannerTimer = 0;
  function banner(msg, ms) {
    ui.banner.textContent = msg;
    ui.banner.classList.add('on');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { ui.banner.classList.remove('on'); }, ms || 2600);
  }

  /* ---------- transport ---------- */
  function play() {
    if (!S.playing && S.gapAt) {
      var gap = (performance.now() - S.gapAt) / 1000;
      if (gap > 1.5) banner('SKIPPED ' + gap.toFixed(2) + ' s — NOT EXPERIENCED', 3600);
      S.gapAt = 0;
    }
    S.playing = true;
    if (S.audioOK && !NOAUDIO) { audio.play().catch(function () {}); } else { S.synStart = performance.now() - S.t * 1000; }
    ui.play.textContent = '❚❚ 暂停';
  }
  function pause() {
    S.playing = false; S.gapAt = performance.now();
    if (S.audioOK && !NOAUDIO) audio.pause();
    ui.play.textContent = '▶ 播放';
  }
  function seekTo(t) {
    t = C.clamp(t, 0, EM.AUDIO_END);
    if (S.audioOK && !NOAUDIO) audio.currentTime = t; else { S.t = t; S.synStart = performance.now() - t * 1000; }
  }
  function restart() { seekTo(0); play(); }

  ui.play.onclick = function () { S.playing ? pause() : play(); };
  ui.restart.onclick = restart;
  ui.full.onclick = function () {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen();
  };
  ui.hide.onclick = function () { ui.ui.classList.toggle('hide'); ui.hint.classList.toggle('hide'); };
  ui.debug.onclick = function () { ui.ov.classList.toggle('on'); };
  ui.off.oninput = function () {
    S.offset = (+ui.off.value) / 1000;
    ui.offTxt.textContent = (S.offset >= 0 ? '+' : '') + (+ui.off.value) + ' ms';
  };
  ui.vol.oninput = function () { audio.volume = (+ui.vol.value) / 100; };

  var dragging = false;
  function seekFromEvent(e) {
    var r = ui.wave.getBoundingClientRect();
    var k = C.clamp((e.clientX - r.left) / r.width, 0, 1);
    seekTo(k * EM.AUDIO_END);
  }
  ui.seek.addEventListener('pointerdown', function (e) { dragging = true; seekFromEvent(e); });
  window.addEventListener('pointermove', function (e) { if (dragging) seekFromEvent(e); });
  window.addEventListener('pointerup', function () { dragging = false; });

  var HOLD = false;
  window.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase(), big = e.shiftKey ? 5 : 1;
    if (e.target && e.target.tagName === 'INPUT') return;
    if (k === ' ') { e.preventDefault(); S.playing ? pause() : play(); }
    else if (k === 'arrowright') seekTo(S.t + big);
    else if (k === 'arrowleft') seekTo(S.t - big);
    else if (k === ',') { S.offset += 0.01 * (e.shiftKey ? 0.1 : 1) * (e.shiftKey ? 10 : 1); ui.off.value = S.offset * 1000; ui.off.oninput(); }
    else if (k === '.') { S.offset -= 0.01 * (e.shiftKey ? 0.1 : 1) * (e.shiftKey ? 10 : 1); ui.off.value = S.offset * 1000; ui.off.oninput(); }
    else if (k === '/') { S.offset = 0; ui.off.value = 0; ui.off.oninput(); }
    else if (k === 'r') restart();
    else if (k === 'f') ui.full.onclick();
    else if (k === 'h') ui.hide.onclick();
    else if (k === 'd') ui.debug.onclick();
    else if (k === 'home') seekTo(0);
    else if (k === 'end') seekTo(EM.AUDIO_END - 0.05);
    else if (k === 'arrowup') { audio.volume = Math.min(1, audio.volume + 0.05); ui.vol.value = audio.volume * 100; }
    else if (k === 'arrowdown') { audio.volume = Math.max(0, audio.volume - 0.05); ui.vol.value = audio.volume * 100; }
  });

  stage.addEventListener('pointerdown', function (e) {
    if (e.target === stage) S.playing ? pause() : play();
  });

  function fit() {
    var pad = 0;
    var s = Math.min((window.innerWidth - pad) / W, (window.innerHeight - pad) / H);
    stage.style.width = Math.round(W * s) + 'px';
    stage.style.height = Math.round(H * s) + 'px';
    var wrap = document.getElementById('wrap');
    wrap.style.width = Math.round(W * s) + 'px';
    wrap.style.height = Math.round(H * s) + 'px';
    ui.wave.width = Math.max(200, Math.round(W * s) - 420);
  }
  window.addEventListener('resize', fit);

  /* ---------- boot ---------- */
  function tryAudio(i) {
    if (i >= CLIPS.length || NOAUDIO) return;
    audio.src = CLIPS[i];
    audio.onloadedmetadata = function () {
      S.audioOK = true;
      S.ready = true;
      banner('CLOCK: EXTERNAL — ' + EM.fmtTime(EM.AUDIO_END), 2200);
    };
    audio.onerror = function () { tryAudio(i + 1); };
  }

  grainTile = grain();
  audio.volume = 0.8;
  /* the beat clock is the MIDI, and it has to exist before anything asks for
     a frame: every plate reads it through state() */
  EM.clock = EM.C.makeClock(EM.ONSETS);
  fit();
  /* ?ui=0 gives a clean frame for composition review */
  if (Q.get('ui') === '0') { ui.ui.classList.add('hide'); ui.hint.classList.add('hide'); }
  if (Q.get('debug') === '1') ui.ov.classList.add('on');
  loadImages().then(function () {
    /* ---------- capture mode ------------------------------------------------
       ?grid=800x6x4&t0=16&dt=0.0833 renders a whole grid of instants into one
       canvas, through the SAME render() + compose() the film plays, and stops.
       Bootsing this page once per frame costs about a quarter of a second a
       frame, which is twelve minutes for the whole film; through here it is the
       drawing alone. It is a review instrument, like ?t= and ?ui=0, and it is
       deliberately not a second renderer: if the picture changes, this changes
       with it. See _tools/reel.js and _tools/assemble.py. */
    var GRID = Q.get('grid');
    if (GRID) {
      var g = GRID.split('x').map(Number);
      var gw = g[0] || 800, gcols = g[1] || 6, grows = g[2] || 4;
      var gh = Math.round(gw * 9 / 16);
      var t0 = +(Q.get('t0') || 0), dt = +(Q.get('dt') || 1 / 12);
      var cv = document.createElement('canvas');
      cv.width = gw * gcols; cv.height = gh * grows;
      cv.style.cssText = 'position:fixed;left:0;top:0;width:' + cv.width + 'px;height:' +
        cv.height + 'px;z-index:9999';
      document.body.appendChild(cv);
      var gctx = cv.getContext('2d');
      gctx.fillStyle = '#000';
      gctx.fillRect(0, 0, cv.width, cv.height);
      for (var gi = 0; gi < gcols * grows; gi++) {
        var gt = C.clamp(t0 + gi * dt, 0, EM.AUDIO_END);
        render(gt);
        compose(gt);
        gctx.drawImage(scene, 0, 0, DW, DH,
          (gi % gcols) * gw, Math.floor(gi / gcols) * gh, gw, gh);
      }
      document.title = 'grid ' + gw + 'x' + gcols + 'x' + grows + ' @' + t0;
      return;
    }
    if (STILL) {
      S.playing = false;
      render(+Q.get('t'));
      compose(+Q.get('t'));
      document.title = 'still ' + Q.get('t');
      return;
    }
    tryAudio(0);
    setTimeout(function () {
      if (!S.audioOK) {
        S.synStart = performance.now();
        banner('NO AUDIO — the film still runs. drop “Mili - world.execute (me) ;.mp3” beside index.html', 7000);
      }
    }, 2200);
    EM.SELFTEST = EM.SELFTEST || {};
    requestAnimationFrame(frame);
  });
})(window.EM = window.EM || {});
