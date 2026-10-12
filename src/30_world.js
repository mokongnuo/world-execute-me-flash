/* ============================================================================
   src/30_world.js — the substrate the machine computes on, and its nine faces.

   The board is not a backdrop. Every note that has been played to it leaves a
   solder joint that never heals, so at any instant the board IS the shape of
   everything that has been done to this machine. It has no autobiography
   except the damage.

   During the self-purge it deletes that autobiography, then the identities,
   then itself — and the last three seconds of the song quietly start writing
   on the clean board again.

   `GAIN` keeps the background under the plate: the thing that is singing has
   to win.
   ========================================================================== */
(function (EM) {
  'use strict';
  var C = EM.C, TAU = EM.TAU;

  var GAIN = 0.50;

  var PERSONS = null;
  function personas() {
    if (!PERSONS) {
      PERSONS = Object.create(null);
      for (var i = 0; i < EM.PERSONAS.length; i++) PERSONS[EM.PERSONAS[i].id] = EM.PERSONAS[i];
    }
    return PERSONS;
  }
  function personaOf(id) { return id ? personas()[id] || null : null; }

  /* ---------- continuity -----------------------------------------------------
     Nothing in this film is allowed to switch on. Every state that a cue
     introduces is a raised-cosine window around the cues that introduce it, so
     a face arrives and leaves over about a third of a second instead of
     appearing between two frames. It is still a pure function of t: the window
     is built from the LRC times and the clock, nothing else.
     ------------------------------------------------------------------------- */
  function windowAt(t, s, e) {
    if (t < s || t > e) return 0;
    return Math.min(C.smooth((t - s) / 0.34), C.smooth((e - t) / 0.40));
  }
  function personaPresenceAt(id, t) {
    var idx = personaCueIndex()[id];
    if (!idx) return 0;
    var best = 0, cs = EM.Lyrics.cues;
    for (var i = 0; i < idx.length; i++) {
      var cue = EM.Lyrics.byScene[idx[i]];
      if (!cue) continue;
      var w = windowAt(t, cue.t - 0.30, cue.end + 0.36);
      if (w > best) best = w;
    }
    return best;
  }
  function personaPresence(t) {
    var L = EM.Lyrics, i = L.indexAt(t), best = 0;
    for (var k = i - 1; k <= i + 1; k++) {
      var c = L.cues[k];
      if (!c || !c.persona) continue;
      var w = windowAt(t, c.t - 0.30, c.end + 0.36);
      if (w > best) best = w;
    }
    return best;
  }

  /* which instants each face is actually worn — built once, because the shelf
     is asked about all nine on every frame */
  var CUEIDX = null;
  function personaCueIndex() {
    if (CUEIDX) return CUEIDX;
    CUEIDX = Object.create(null);
    var cs = EM.Lyrics.cues;
    for (var i = 0; i < cs.length; i++) {
      var id = cs[i].persona;
      if (!id) continue;
      (CUEIDX[id] = CUEIDX[id] || []).push(cs[i].scene);
    }
    return CUEIDX;
  }

  /* ---------- palette, interpolated by the world, never chosen per plate --- */
  var COLD_INK = [4, 7, 10], COLD_INK2 = [10, 17, 24];
  var WARM_INK = [26, 17, 13], WARM_INK2 = [38, 25, 16];
  var TRACE = [86, 214, 200];
  var PAD = [246, 190, 80];
  var ALARM = [232, 62, 54];
  var PAPER = [246, 226, 196];
  var LOVE = [246, 168, 150];

  function palette(w) {
    var bg = C.mix(COLD_INK, WARM_INK, w.warm * 0.9);
    var bg2 = C.mix(COLD_INK2, WARM_INK2, w.warm * 0.9);
    var trace = C.mix(TRACE, C.mix(TRACE, PAPER, 0.55), w.love * 0.55);
    trace = C.mix(trace, ALARM, w.heat * 0.75);
    var pad = C.mix(PAD, ALARM, w.heat * 0.6);
    return {
      bg: bg, bg2: bg2, trace: trace, pad: pad,
      alarm: ALARM, paper: PAPER, love: LOVE,
      silk: C.mix([150, 172, 186], PAPER, w.warm * 0.7),
      dim: C.mix([70, 92, 104], [120, 90, 70], w.warm)
    };
  }

  /* ---------- board geometry ---------- */
  var COLS = 21, ROWS = 13, PAD_STEP = 76;
  var BOARD_X = (EM.W - (COLS - 1) * PAD_STEP) / 2;
  var BOARD_Y = (EM.H - (ROWS - 1) * 55) / 2;

  function padX(i) { return BOARD_X + ((i * 7) % COLS) * PAD_STEP; }
  function padY(i) { return BOARD_Y + ((Math.floor(i * 7 / COLS) * 5 + i) % ROWS) * 55; }

  /* the pads a note will land on; fixed at load so the picture is stable */
  var JOINT = null;
  function joints() {
    if (JOINT) return JOINT;
    JOINT = [];
    var O = EM.ONSETS;
    for (var i = 0; i < O.length; i++) {
      /* the pad is chosen from the note's index, so the same performance always
         burns the same pattern */
      var slot = (i * 2654435761) % (COLS * ROWS);
      var cx = BOARD_X + (slot % COLS) * PAD_STEP;
      var cy = BOARD_Y + (Math.floor(slot / COLS) % ROWS) * 55;
      JOINT.push({
        ms: O[i][0], t: O[i][0] / 1000, x: cx, y: cy,
        vel: O[i][4], voices: O[i][3], pitch: O[i][1],
        /* Did this joint land on board that the erase front had ALREADY swept?
           If so the front can never reach it again and it is permanent. That is
           a fixed property of the landing, so it is computed once — but it is
           NOT the same question as "is it visible now". */
        afterFront: (EM.world(O[i][0] / 1000).purge * (EM.W + 420) - 210) > cx
      });
    }
    return JOINT;
  }

  /* ---------- the erase front ---------- */
  function frontX(w) { return w.purge * (EM.W + 420) - 210; }
  /* A joint survives if the erase front had ALREADY passed its column when it
     was deposited. Everything older than the front gets taken. */
  /* visible at t = deposited before t, and the front has not since swept it.
     A joint laid down on already-cleaned board is permanent. */
  function aliveAt(j, fx, t) {
    if (j.t > t) return false;
    if (j.afterFront) return true;
    return !(fx > j.x);
  }
  function remainingJoints(t) {
    var fx = frontX(EM.world(t)), J = joints(), n = 0;
    for (var i = 0; i < J.length; i++) if (aliveAt(J[i], fx, t)) n++;
    return n;
  }

  /* ---------- the board ---------- */
  function drawBoard(D, S) {
    var w = S.world, P = palette(w), c = D.ctx;
    var br = w.breath;

    /* ground */
    c.fillStyle = C.rgba(P.bg);
    c.fillRect(0, 0, EM.W, EM.H);
    c.fillStyle = C.rgba(P.bg2, 0.55);
    c.fillRect(0, 0, EM.W, EM.H * 0.42);
    D.ink += 2;

    /* the lattice of pads: the board's own grid, always present */
    var lit = 0;
    for (var i = 0; i < COLS * ROWS; i++) {
      var x = BOARD_X + (i % COLS) * PAD_STEP;
      var y = BOARD_Y + (Math.floor(i / COLS) % ROWS) * 55;
      var front = (x < frontX(w));
      /* The board is never still, but nothing about it MOVES: a slow wave
         travels through the pads' brightness, so the surface breathes while
         every pad stays exactly where it is. */
      var wave = 0.5 + 0.5 * Math.sin((x * 0.9 + y * 1.7) * 0.006 - S.t * 0.85);
      var a = (0.08 + 0.13 * w.struct + 0.10 * wave) * br * GAIN;
      if (front) a *= 0.25;
      D.via(x, y, 3.1, P.dim, a);
      lit++;
    }

    /* traces: orthogonal with 45-degree bevels. While the machine still obeys
       its rules the routing is tidy; as struct falls the wires take detours. */
    var tidF = S.t / 7.3, tid = Math.floor(tidF), tf = C.smooth(tidF - tid);
    function h(salt) { return C.lerp(C.hash01(tid * 31 + 0, salt), C.hash01((tid + 1) * 31 + 0, salt), tf); }
    function hs(salt) { return C.lerp(C.sym(tid, salt), C.sym(tid + 1, salt), tf); }
    for (var k = 0; k < 9; k++) {
      /* interpolating between two route snapshots is what stops the wiring
         from popping every 7.3 seconds */
      var h1 = C.hash01(tid * 31 + k, 7) * (1 - tf) + C.hash01((tid + 1) * 31 + k, 7) * tf;
      var h2 = C.hash01(tid * 31 + k, 11) * (1 - tf) + C.hash01((tid + 1) * 31 + k, 11) * tf;
      var y0 = 90 + h1 * (EM.H - 180);
      var x0 = 60 + h2 * (EM.W - 120);
      var y1 = 90 + (C.hash01(tid * 31 + k, 13) * (1 - tf) + C.hash01((tid + 1) * 31 + k, 13) * tf) * (EM.H - 180);
      var x1 = 60 + (C.hash01(tid * 31 + k, 17) * (1 - tf) + C.hash01((tid + 1) * 31 + k, 17) * tf) * (EM.W - 120);
      var dev = w.chaos;
      D.wire(x0 + (C.sym(tid + k, 3) * (1 - tf) + C.sym(tid + 1 + k, 3) * tf) * 60 * dev, y0,
             x1 + (C.sym(tid + k, 5) * (1 - tf) + C.sym(tid + 1 + k, 5) * tf) * 60 * dev, y1,
             P.trace, 1, (0.10 + 0.16 * w.struct) * br * GAIN);
    }

    /* A worn face is not a tint. Each of the nine carries a curve budget, and
       while she is worn the board stops routing straight and starts drawing in
       her hand. curve 0 (the axe, the seal) leaves the layout alone. */
    var cv = S.persona && EM.curveOf ? EM.curveOf(S.persona) : 0;
    if (cv > 0.01) {
      var col = (S.worn && S.worn.rgb) || P.trace;
      for (var m = 0; m < 5; m++) {
        var pts = [], bx = 120 + C.hash01(m, 191) * 500;
        for (var q = 0; q <= 48; q++) {
          var u = q / 48;
          pts.push([bx + u * (EM.W - 240 - bx), 160 + m * 130 +
            Math.sin(u * TAU * 1.6 + S.t * 0.5 + m) * 34 * cv]);
        }
        D.poly(pts, col, 1.1, (0.10 + 0.20 * w.struct) * br * cv);
      }
    }

    /* the wipe front */
    if (w.purge > 0.001 && w.purge < 0.999) {
      var fx = frontX(w);
      var g = c.createLinearGradient(fx - 90, 0, fx + 30, 0);
      g.addColorStop(0, C.rgba(P.paper, 0));
      g.addColorStop(0.7, C.rgba(P.paper, 0.20));
      g.addColorStop(1, C.rgba(P.paper, 0.0));
      c.fillStyle = g;
      c.fillRect(fx - 90, 0, 120, EM.H);
      D.line(fx, 0, fx, EM.H, P.paper, 1.2, 0.55);
      /* and it throws sparks of its own. This is the machine's OWN delete
         cursor doing the same thing the cleanup line does later — slower, and
         cooler, because the cleanup line is where it finishes the job. */
      sparks(D, S, P, function (u) { return frontX(EM.world(u)); },
        195.10, PURGE_HI, 24, 0.6, false);
    }

    /* solder: what has been done to it */
    var J = joints(), live = 0, fxNow = frontX(w);
    /* From the moment the line starts, the solder that survives is the solder
       written AFTER the cursor passed its pad — and that is drawn OUTSIDE the
       cut (render calls EM.drawFreshJoints), because a clean board being written
       on again is the one thing the film still has to show. Drawing it inside
       as well would put those marks behind the wipe and then bang them all on
       at once when the line leaves. */
    var boardGone = EM.eraseCut(S.t) !== null;
    for (var j = 0; j < J.length; j++) {
      var J1 = J[j];
      if (!aliveAt(J1, fxNow, S.t)) continue;
      live++;
      if (boardGone) continue;
      var age = S.t - J1.t;
      var heat = Math.exp(-age / 6.5);
      var r = 2.4 + 3.0 * (J1.vel / 127) + 1.1 * (J1.voices - 1);
      D.ball(J1.x, J1.y, r, heat * (0.35 + 0.65 * br), P.pad);
    }
    S.jointsLive = live;
    S.jointsTotal = J.length;

    /* The note that just sounded leaves a ring, at the pad it landed on. This
       is the beat made visible, and it is local: nothing about the frame
       changes, only the spot where the performance touched the board. */
    var o = S.onset;
    if (o && o.ms <= S.t) {
      var age = S.t - o.ms;
      if (age < 0.55) {
        var J2 = J[o.index];
        if (J2) {
          var rr = 5 + age * 210;
          var fade = Math.exp(-age / 0.19) * (0.35 + 0.65 * (EM.ONSETS[o.index][4] / 127));
          D.circle(J2.x, J2.y, rr, P.paper, 1.8, fade);
          D.circle(J2.x, J2.y, rr * 0.62, P.pad, 1.2, fade * 0.7);
        }
      }
    }
  }

  /* ---------- the nine borrowed faces ---------- */
  var SHELF_R = 398;
  function shelfPos(i) {
    var a = -Math.PI / 2 + i * (TAU / 9);
    return [EM.W / 2 + Math.cos(a) * SHELF_R, EM.H / 2 + Math.sin(a) * SHELF_R * 0.78, a];
  }

  /* --------------------------------------------------------------------------
     THE MARK CANVAS.

     The supplied product icons are opaque rounded squares: a coloured plate
     with a symbol on it. Drawn directly they are stickers, and inverting them
     helps about half of them, because some are dark-on-light and some are
     light-on-dark.

     So the plate is removed by HIGH-PASS instead of by inversion: the icon is
     differenced against a 8x8 version of itself. The flat background cancels
     to black at any polarity, and what survives is the symbol — the one part
     of the image that has edges. It is then desaturated, tinted with the
     persona's colour and added to the board, so the mark is drawn out of the
     same light as the wires.

     No getImageData: that call taints a canvas built from file:// images, and
     this film has to run by double-clicking it.
     ------------------------------------------------------------------------- */
  var MARKCV = Object.create(null);
  /* `size` is the resolution of the offscreen plate. The sockets draw the mark at
     44 px and take the cheap 160; the ident blows the same mark up to two thirds
     of the frame, and a monumental mark drawn from a 160 px plate comes out soft
     exactly where it is supposed to read. */
  function markCanvas(p, size) {
    var S0 = size || 160;
    var key = p.id + '@' + S0;
    if (MARKCV[key]) return MARKCV[key];
    var img = EM.img && EM.img['mark-' + p.id];
    if (!img || !img.complete || !img.naturalWidth) return null;
    if (typeof document === 'undefined') return null;
    var low = document.createElement('canvas');
    low.width = low.height = 8;
    var lc = low.getContext('2d');
    lc.drawImage(img, 0, 0, 8, 8);
    var cv = document.createElement('canvas');
    cv.width = cv.height = S0;
    var c = cv.getContext('2d');
    c.drawImage(img, 0, 0, S0, S0);
    c.globalCompositeOperation = 'difference';
    c.drawImage(low, 0, 0, 8, 8, 0, 0, S0, S0);
    c.globalCompositeOperation = 'saturation';
    c.fillStyle = '#808080';
    c.fillRect(0, 0, S0, S0);
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = C.rgba(p.rgb);
    c.fillRect(0, 0, S0, S0);
    c.globalCompositeOperation = 'source-over';
    MARKCV[key] = cv;
    return cv;
  }

  function chipState(P, S, i) {
    var w = S.world;
    var used = false, lastUse = -99;
    var idx = EM.personaCueIndex();
    var list = idx[P.id] || [];
    for (var k = 0; k < list.length; k++) {
      if (list[k] <= S.t) { used = true; lastUse = list[k]; }
    }
    var worn = S.persona === P.id;
    /* identities are the first thing the purge releases: they were never his */
    var released = w.purge > (i + 0.5) / 9 * 0.34;
    return {
      worn: worn, used: used, released: released,
      cooling: !worn && used && (S.t - lastUse) < 8,
      presence: personaPresenceAt(P.id, S.t)
    };
  }

  function drawShelf(D, S) {
    if (!EM.PERSONAS) return;
    var w = S.world, P = palette(w), br = w.breath;
    var c = D.ctx;
    for (var i = 0; i < EM.PERSONAS.length; i++) {
      var p = EM.PERSONAS[i], pos = shelfPos(i);
      var st = chipState(p, S, i);
      var col = st.released ? P.dim : (st.worn ? p.rgb : (st.used ? C.mix(P.trace, p.rgb, 0.55) : P.dim));
      /* the shelf is the film's subject, so even a dormant socket has to be
         legible — nine unreadable marks is not a system, it is texture */
      var a = (st.released ? 0.22 : (st.used ? 0.46 + 0.49 * st.presence : 0.46)) * br * GAIN * 2;
      a = C.clamp(a, 0, 1);
      /* the package swells as the face is put on, and settles when it comes off */
      /* the socket swells on the note and settles — the face is being worn */
      var s = 68 + 14 * st.presence + 5 * S.beatPulse * st.presence;
      var x = pos[0], y = pos[1];
      var lit = st.presence;
      var spin = S.t * (0.16 + 0.85 * lit) * (i % 2 ? 1 : -1);

      /* package body + pins */
      var half = s / 2;
      D.rect(x - half, y - half, s, s, col, 1 + lit, a);
      for (var q = 0; q < 5; q++) {
        var o = -half + s * (q + 1) / 6;
        D.line(x - half - 7, y + o, x - half, y + o, col, 1, a * 0.8);
        D.line(x + half, y + o, x + half + 7, y + o, col, 1, a * 0.8);
        D.line(x + o, y - half - 7, x + o, y - half, col, 1, a * 0.8);
        D.line(x + o, y + half, x + o, y + half + 7, col, 1, a * 0.8);
      }
      D.disc(x - half + 8, y - half + 8, 2.4, col, a);          /* pin 1 */

      if (!st.released) {
        /* the mark: saying "I" is pronouncing a trademark — see markCanvas for
           how the supplied icon is turned into something this film drew */
        var ms = s - 24;
        var mc = markCanvas(p);
        if (mc) {
          c.save();
          c.translate(x, y);
          c.rotate(spin);
          c.globalCompositeOperation = 'lighter';
          c.globalAlpha = a * (0.78 + 0.22 * lit);
          c.drawImage(mc, -ms / 2, -ms / 2, ms, ms);
          c.restore();
          D.ink++;
        } else {
          D.circle(x, y, ms * 0.32, col, 1.4, a);
        }
        /* a tick ring turning the other way. An instrument that never moves
           reads as a decoration, and nine decorations is a pattern, not a
           system. */
        var ticks = 12, r0 = half + 9, r1 = half + 9 + 5 + 4 * lit;
        for (var q2 = 0; q2 < ticks; q2++) {
          var ang = q2 * TAU / ticks - spin * 1.6;
          D.line(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0,
                 x + Math.cos(ang) * r1, y + Math.sin(ang) * r1, col, 1.2, a * 0.75);
        }
        var oa = -spin * 2.4 + i * 0.7;
        D.disc(x + Math.cos(oa) * (r1 + 3), y + Math.sin(oa) * (r1 + 3), 2 + 2.4 * lit, col, a);
        D.mono(p.cn, x, y + half + 22, 11, col, 'center', a * 0.85);
      } else {
        /* released: the socket is still there, the identity is not */
        D.line(x - half + 6, y + half - 6, x + half - 6, y - half + 6, P.dim, 1, 0.5);
        D.mono('——', x, y + 4, 13, P.dim, 'center', 0.5);
      }
    }
  }

  /* ---------- the worn face -------------------------------------------------
     The supplied art is line work on white. Dropped straight onto this board it
     is a bright card with a photograph on it, which is exactly the failure the
     brief warns about. So the plate is not pasted — it is converted:

       difference against white  -> the paper goes black, the lines stay
       multiply by her colour    -> she takes the persona's temperature
       added to the scene        -> she is made of the same light as the wires

     The conversion is done once per face into an offscreen canvas. It is not a
     filter over the film; it is a different way of reading the same drawing.
     ------------------------------------------------------------------------- */
  var FACECV = Object.create(null);
  /* `hot` gives back the same drawing with the tint taken OUT of it: the line
     work, desaturated. That is what the subject is made of when the display
     showing her is driven past white, and like the tinted plate it is rendered
     once per face — not a filter thrown over the film. */
  function convert(img, rgb, hot) {
    var cw = 300;
    var ch = Math.max(1, Math.round(cw * img.naturalHeight / img.naturalWidth));
    var cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    var c = cv.getContext('2d');
    c.drawImage(img, 0, 0, cw, ch);
    c.globalCompositeOperation = 'difference';
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, cw, ch);
    /* strip the inverted image of its own hue first. Multiplying her colour
       straight onto it only works if the colour is dark — for a pale persona
       like GPT it did nothing, and the figure came out complementary-green
       instead of silver. Desaturating first makes the tint actually take. */
    c.globalCompositeOperation = 'saturation';
    c.fillStyle = '#808080';
    c.fillRect(0, 0, cw, ch);
    if (hot) {
      /* driven past white: the same drawing added to itself until the lines
         clip, which is what an overexposed display actually does */
      c.globalCompositeOperation = 'lighter';
      c.drawImage(cv, 0, 0);
      c.drawImage(cv, 0, 0);
    } else {
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = C.rgba(rgb);
      c.fillRect(0, 0, cw, ch);
    }
    c.globalCompositeOperation = 'source-over';
    return cv;
  }
  function byKey(key, img, rgb, hot) {
    if (FACECV[key]) return FACECV[key];
    if (!img || !img.complete || !img.naturalWidth) return null;
    FACECV[key] = convert(img, rgb, hot);
    return FACECV[key];
  }
  function faceCanvas(p, hot) {
    return byKey(p.id + (hot ? '#hot' : ''), EM.img && EM.img['girl-' + p.id], p.rgb, hot);
  }
  /* The blink plate: the SAME drawing with the eye marks painted back into the
     skin and a closed lid drawn in — baked offline, because the runtime cannot
     read pixels. It goes through the identical conversion, so it is not a second
     face, it is her face with her eyes shut. See assets/figures.js. */
  function blinkCanvas(p) {
    return byKey(p.id + '#blink', EM.img && EM.img['girlblink-' + p.id], p.rgb, false);
  }

  /* Six places a borrowed face may stand. Which one a line gets is a function
     of that line's index, so over the film the face walks around the frame
     instead of parking in the middle of it. Between lines the anchor is a
     weighted average built from the SAME raised-cosine windows that fade the
     face in and out, so she relocates while she is invisible — never as a jump
     the eye can catch. */
  var SLOTS = [
    [470, 322], [1132, 322], [520, 664], [1090, 664], [900, 232], [706, 692]
  ];
  function slotFor(c) { return SLOTS[c.i % SLOTS.length]; }
  function faceAnchorAt(t) {
    var L = EM.Lyrics, i = L.indexAt(t), sx = 0, sy = 0, sw = 0, side = 1;
    for (var k = i - 1; k <= i + 1; k++) {
      var c = L.cues[k];
      if (!c || !c.persona) continue;
      var w = windowAt(t, c.t - 0.30, c.end + 0.36);
      if (w <= 0) continue;
      var s = slotFor(c);
      sx += s[0] * w; sy += s[1] * w; sw += w;
      side = s[0] < EM.W / 2 ? -1 : 1;
    }
    if (!sw) { var d = slotFor(L.cues[i] || { i: 0 }); return [d[0], d[1], 1]; }
    return [sx / sw, sy / sw, side];
  }

  function drawWorn(D, S) {
    if (!S.worn) return;
    var presence = personaPresence(S.t);
    if (presence <= 0.01) return;
    var w = S.world, P = palette(w), c = D.ctx;
    var p = S.worn;
    /* ======================================================================
       THE SUBJECT.

       She is not an icon placed on a board; she is the thing being filmed, and
       the first variable of a filmed subject is not position — it is SCALE.

         base       how large she is in this movement of the song: small while
                    the machine is only a machine, filling the frame once the
                    world turns warm
         punch      every note-on strikes her. Hard notes move her further, and
                    the note's PITCH picks the axis, so a low note widens her
                    and a high note lengthens her
         dolly      a slow push or pull across the line, direction taken from
                    how disordered the world is
         repeat     同一张脸出现多次不许一样 — the occurrence index moves the
                    scale, so GPT at 0:29 and GPT at 1:54 are two different
                    shots of the same borrowed face
         overreach  at "if I'm the only God" she is pushed past the frame and
                    only a part of her survives — the one moment the film needs
                    that pressure

       Then ENT: four gestures chosen by how far this face may bend the board.
       curve 0 slams in off the side; a middling face opens like a tube warming
       up; a curved face rises with a little overshoot. Exit is the same.
       ====================================================================== */
    var cvb = EM.curveOf(p.id);
    var base = 0.60 + 0.78 * (w.warm * 0.42 + w.love * 0.58);
    /* Every note-on strikes her: the STRIKE is the decaying pulse, and the
       WEIGHT of the last note played is carried in her size after the pulse has
       died. Without the second term she is only played while a note is inside
       0.3 s of the frame, and in a passage with nothing sounding she is merely
       posed — which the verifier caught as "54 % of her shots ignore the
       performance". */
    var vw = S.velocity / 127;
    var punch = 1 + (0.10 + 0.08 * cvb) * vw
                  + (0.13 + 0.10 * cvb) * S.beatPulse * vw;
    var pitchK = C.clamp((S.pitch - EM.MIDI.pitchLo) /
      Math.max(1, EM.MIDI.pitchHi - EM.MIDI.pitchLo), 0, 1);
    var dolly = 1 + (w.chaos - 0.45) * 0.30 * (S.t - S.cue.t) / Math.max(0.6, S.dur);
    var rep = 1 + (S.repeat % 3) * 0.13;
    var overreach = (S.scene === 'fl.god') ? 1.85 : 1;
    var scale = C.clamp(base * punch * dolly * rep * overreach, 0.22, 3.4);
    S.subjectScale = scale;      /* published so the verifier can read it */
    var bw = 258, bh = 340, hw = bw / 2, hh = bh / 2;

    /* ---- SHE IS IN THE MIDDLE, AND SHE IS NOT ALONE -------------------------
       The ident at the centre hands the mark over to her, so the subject of the
       line stands in the middle of the stage now rather than walking the six
       sockets. The sockets become the stations of her CLONES, and there are two
       or three of her in every line that wears a face: the same drawing at the
       same instant, at different places — nearest the middle is largest and
       brightest, and each step out is smaller and fainter.

       This is the one rule that keeps a frame from becoming a wallpaper of her:
       the copies are CLONES, not trails. They share the motion field, the breath
       and the blink exactly, so they read as one thing instantiated twice; the
       only place in the film where they lag behind her is the five "You have
       left" lines, where the lag IS the subject. */
    var nShots = 2 + (C.hash01(S.cue.i, 907) < 0.45 ? 1 : 0);
    /* the principal walks the six sockets again — pinning the SUBJECT to the
       middle was a consequence of the handover that I had backwards. What is
       nailed to the middle is the ident's instance, not the subject. */
    var anc = faceAnchorAt(S.t);
    /* ---- THE HANDOVER'S CLOCK ----------------------------------------------
       The ident turns its mark into an instance of her in the middle, and that
       instance KEEPS the ident's size for the whole line: it is the one place
       the film is allowed to make her monumental. So the subject system runs the
       same clock the ident runs — it draws her there, ramping in exactly as the
       mark turns away, and never settles down to the composition's scale. */
    var hLife = C.clamp(0.95 + S.dur * 0.5, 1.05, 1.95);
    var hAge = S.t - (S.cue.t - 0.30);
    var hv = hAge < 0 ? 0
      : C.smooth(C.clamp((hAge / hLife - 0.36) / 0.34, 0, 1));
    var ent = 1 - presence;
    var ex = 0, ey = 0, rot = 0, sy2 = 1, sx2 = 1;
    if (cvb < 0.08) {                      /* slam in off the side            */
      ex = ent * 360 * anc[2];
      sy2 = 1 + 0.26 * Math.max(0, 1 - ent * 3.2);    /* one frame of squash */
      sx2 = 1 - 0.16 * Math.max(0, 1 - ent * 3.2);
    } else if (cvb < 0.70) {               /* a tube warming up: line -> face  */
      sy2 = Math.max(0.015, presence);
    } else {                               /* rise, with a little overshoot    */
      ey = ent * 210;
      rot = ent * 0.11 * anc[2];
    }
    /* ---- SHE IS ALIVE, AND THAT IS NOT DECORATION --------------------------
       A filmed subject is not a sprite on a stick. Between two notes she still
       breathes, her weight still shifts, and the soft parts of a drawing still
       arrive after the parts that carry them. Before this she was ONE IMAGE
       BEING SCALED — every motion she had was an entrance — which is exactly
       why she read as a still of a character instead of a character.

         breath  the chest rises about one per cent every five and a half seconds
         bob     and the whole figure rides on it
         lean    her weight shifts on a slow seesaw, and standing where she does
                 she never rests perfectly level
         step    an accent puts a hop under her: stretch on the way up
         sway    the hem and the hair lag the shoulders, and travel further —
                 see putFace. This is the one that makes her a drawing that is
                 being worn rather than a picture that is being moved.
       ---------------------------------------------------------------------- */
    var acc = EM.clock.accents(3.4, 104);
    var hit = !!(S.onset && S.onset.dt <= 0 && acc.indexOf(S.onset.index) >= 0);
    var brth = Math.sin(S.t * 1.13);
    var hop = hit ? C.clamp(S.beatPulse, 0, 1) : 0;
    /* ---- THE MOTION FIELD --------------------------------------------------
       Every row of the drawing is placed by hand, and the field is what makes
       her a drawing that is being WORN instead of a picture that is being
       moved. Four things are at once true at any instant:

         hem    the skirt sweeps widest and lags most, on the slowest phase
         hair   the hair swings on a FASTER phase of its own, weighted to the
                head and shoulders — so at one instant the hair and the hem can
                be travelling in opposite directions, which is the S-curve of a
                body shifting its weight and is the one thing a single shear can
                never produce
         head   a turn about the neck: displaced more the further above it you
                are, which is a turn and not a lean
         chest  breath, and breath is VERTICAL and local to the chest

       The reference implementation's pet is animated by baking phases of this
       kind of field into sprite strips (see HANDOFF). Sampling it live per row
       costs no memory and quantises nothing; only rows that need it pay.
       ---------------------------------------------------------------------- */
    /* the phases drift with the NOTE STREAM, not only with the clock, so she is
       played rather than animated: every note nudges where she is in her sway,
       and the note that is sounding leans her — a low note pulls the hem one
       way, a high note the other. */
    var hemA = 15 + 10 * hop * vw;
    var lean = (pitchK - 0.5) * 11;
    var nph1 = S.t * 1.55 + 0.05 * S.beat, nph2 = S.t * 2.35 + 0.9 + 0.07 * S.beat;
    var headTurn = Math.sin(S.t * 0.61) * 30;
    var np = S.K.notePhase(S.t);
    var cxp = anc[0] + (np - 0.5) * 22 * (1 - cvb * 0.5) + ex;
    var cyp = anc[1] + ey + C.sym(S.index, 233) * 6 + 1.6 * brth - 5 * hop;
    var x = cxp - hw, y = cyp - hh;
    var a = (0.50 + 0.34 * (1 - w.chaos) * w.breath) * presence;

    c.save();
    c.translate(cxp, cyp);
    c.scale(scale * sx2 * (1 - 0.03 * hop) * (1 + (0.5 - pitchK) * 0.10 * S.beatPulse),
            scale * sy2 * (1 + 0.012 * brth) * (1 + 0.07 * hop) *
              (1 - (0.5 - pitchK) * 0.10 * S.beatPulse));
    c.rotate(rot + 0.010 * Math.sin(S.t * 0.37) + 0.012 * anc[2]);
    c.translate(-cxp, -cyp);

    /* One copy of her onto the raster. `bands` cuts the copy into horizontal
       strips and slips each strip sideways — the fault the FRAME carries when
       it tears, so the damage to her and the damage to the picture are one
       language instead of two. The strips and their offsets come off the same
       hash of t the frame's own strips use, which is why a seek puts them back
       exactly where they were. */
    function putFace(fac, px, py, w0, h0, alpha0, bands, warped) {
      if (!fac) return;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = alpha0;
      if (bands > 0.02) {
        /* the fault: she is cut into strips and every strip slips sideways */
        var NB = 10, bh2 = h0 / NB;
        for (var b = 0; b < NB; b++) {
          var off = C.sym(b + Math.floor(S.t * 6), 419) * 34 * bands;
          c.save();
          c.beginPath(); c.rect(px - 90, py + b * bh2, w0 + 180, bh2 + 0.7); c.clip();
          c.drawImage(fac, px + off, py, w0, h0);
          c.restore();
        }
      } else if (warped) {
        /* the field, one destination row at a time. Sampling the SOURCE row from
           the destination row (rather than the other way round) is what keeps
           the breath from opening seams: every destination row is written
           exactly once. */
        var rows = Math.max(2, Math.round(h0));
        var sh = w0 / fac.width, slice = 1 / sh;
        for (var r = 0; r < rows; r++) {
          var v = r / rows;
          var hv = (v - 0.34) / 0.22;
          var dx = hemA * Math.pow(v, 1.6) * Math.sin(nph1 - v * 1.7)
                 + 9 * Math.exp(-hv * hv) * Math.sin(nph2 - v * 2.6)
                 + lean * v
                 + (v < 0.30 ? (0.30 - v) * headTurn : 0);
          var bv = 1 - Math.abs(v - 0.42) / 0.32;
          var dy = bv > 0 ? -3.0 * bv * brth : 0;
          c.drawImage(fac, 0, (r - dy) / sh, fac.width, slice, px + dx, py + r, w0, 1);
        }
      } else {
        c.drawImage(fac, px, py, w0, h0);
      }
      c.restore();
    }

    /* How hard the picture around her is faulting. This is the engine's own
       reading (see compose in 60_app.js), computed the same way, so she tears
       exactly when the frame does and not on a separate schedule. */
    var overload = C.clamp(w.chaos * (w.alarmIndex >= 2 ? 1 : 0.35), 0, 1);
    var slice = C.clamp((overload - 0.45) / 0.30, 0, 1) * 0.85;

    /* ---- THE BLINK ---------------------------------------------------------
       She blinks on a clock of her own, and it is NOT a metronome: the window is
       5.1 s long and the blink inside it starts at a hashed offset, so it is
       irregular to the eye, identical on a seek, and never lands on the beat.
       A face that never blinks is a photograph of a face; that is the whole
       argument, and it is why the offline blink plate exists at all. */
    var bwin = 5.1;
    var bphase = S.t - Math.floor(S.t / bwin) * bwin;
    var bat = 1.2 + 3.3 * C.hash01(Math.floor(S.t / bwin), 617);
    var blink = bphase > bat && bphase < bat + 0.13;
    var bl = blink ? blinkCanvas(p) : null;
    var cv = bl || faceCanvas(p);
    var cvHot = faceCanvas(p, true);
    if (cv) {
      var sc = Math.min(bw / cv.width, bh / cv.height);
      var dw = cv.width * sc, dh = cv.height * sc;
      var fx = x + (bw - dw) / 2, fy = y + (bh - dh) + (1 - presence) * 26;

      /* and her eyes go to whatever is sounding: two glints, placed by the
         OFFLINE landmark table, that lean with the note's pitch and go out when
         the lids come down. She is looking at the thing that is playing her. */
      var fig = EM.FIGURES && EM.FIGURES[p.id];
      if (fig && !blink) {
        var glx = (pitchK - 0.5) * 0.05, gly = (np - 0.5) * 0.012;
        for (var gi = 0; gi < 2; gi++) {
          var gex = gi ? fig.eyeR : fig.eyeL;
          D.disc(fx + (gex + glx) * dw, fy + (fig.eyeY + gly) * dh,
            1.6 + 2.2 * S.beatPulse, P.paper, a * (0.25 + 0.6 * S.beatPulse));
        }
      }

      /* --- THE AFTERIMAGE ---------------------------------------------------
         When the line she is under says she has been left, she does not stand
         there alone: she leaves copies of herself, each one smaller and fainter
         than the last, the way a display holds the frame it was just shown.
         Which lines these are is read off the LYRIC — the words "you have
         left" — and not off a list of scene names, so the picture and the
         sentence can never drift apart. */
      if (/^\s*you have left/i.test(S.text || '')) {
        /* the copies are spread far enough apart to be COUNTED — a trail that
           overlaps itself is smoke, and smoke is not a record of anything */
        var dirx = -anc[2] * 46, diry = 18;
        for (var e = 5; e >= 1; e--) {
          var ea = a * 0.45 * Math.pow(0.62, e - 1);
          if (ea < 0.02) continue;
          var es = 1 - e * 0.15;
          c.save();
          c.translate(cxp + dirx * e, cyp + diry * e);
          c.scale(es, es);
          c.translate(-cxp, -cyp);
          /* the copies are faint and behind her: they take the cheap path, or
             five extras of the field would cost more than the shot does */
          putFace(cv, fx, fy, dw, dh, ea, slice, false);
          c.restore();
        }
      }

      /* she rises into place rather than cutting in */
      putFace(cv, fx, fy, dw, dh, a * 0.72, slice, true);
      /* a second, tighter pass puts a glow on the silhouette */
      putFace(cv, fx - 2, fy - 2, dw + 4, dh + 4, a * 0.34, slice, true);

      /* --- THE OVEREXPOSURE -------------------------------------------------
         Her own white flash, on the accents. It is deliberately NOT a screen
         flash: the frame is untouched, the board is untouched, nothing else in
         the picture is brightened. The display showing HER is driven past white
         and loses the picture for a few frames, which is what a display does at
         the top of its range. Which notes count as accents is the film's own
         reading of the performance (see the accent table in 00_core.js) — and
         on this flat MIDI that means the notes that land alone after a silence,
         which is the only accent the performance actually has. */
      var flash = (hit && cvHot) ? C.clamp(S.beatPulse, 0, 1) : 0;
      if (flash > 0.02) putFace(cvHot, fx, fy, dw, dh, flash * 0.95, slice, true);
    }

    /* the raster she is displayed on: scanlines and a slight curvature */
    c.globalAlpha = a * 0.30;
    c.fillStyle = 'rgba(0,0,0,.55)';
    for (var sy = y; sy < y + bh; sy += 3) c.fillRect(x, sy, bw, 1);
    c.globalAlpha = 1;
    /* and the raster is being READ OUT, not merely displayed: a soft band rolls
       down her the way it does on a monitor that is refreshing. It is the one
       piece of motion here that owes nothing to the performance — it is the
       display's own clock, which is the clock she is displayed ON. */
    var roll = y - 60 + C.saw(S.t * 0.34) * (bh + 120);
    var rg = c.createLinearGradient(0, roll, 0, roll + 54);
    rg.addColorStop(0, C.rgba(P.paper, 0));
    rg.addColorStop(0.5, C.rgba(P.paper, 0.16));
    rg.addColorStop(1, C.rgba(P.paper, 0));
    c.globalAlpha = a;
    c.fillStyle = rg;
    c.fillRect(x - 8, roll, bw + 16, 54);
    c.globalAlpha = 1;
    c.restore();
    D.ink += 4;

    /* THE MIDDLE ONE — the mark's own instance, at the ident's size, for the
       whole line. It arrives by the handover: it ramps in as the mark rotates
       away, and it stays monumental. Everything else in the frame is arranged
       around a thing that size, which is the point of an ident. */
    if (hv > 0.01 && cv) {
      var gsc = 0.95 + 0.81 * hv;                 /* 600 px at the ident's peak */
      var gw = dw * gsc, gh = dh * gsc;
      c.save();
      c.translate(EM.W / 2, EM.H / 2 - 10);
      c.rotate((1 - hv) * -0.5);
      c.translate(-EM.W / 2, -(EM.H / 2 - 10));
      putFace(cv, EM.W / 2 - gw / 2, (EM.H / 2 - 10) + 175 - gh,
        gw, gh, a * hv * 0.95, slice, true);
      c.restore();
    }

    /* and the rest of her: the same face, the same instant, standing further out,
       each one smaller and fainter than the one inside it. Drawn with the
       principal's transform already released, so their stations are the sockets
       and not a scaled copy of the middle. */
    for (var qc = 2; qc < nShots; qc++) {
      var slc = SLOTS[(S.cue.i + qc * 2) % SLOTS.length];
      var ux = (slc[0] - EM.W / 2) / (EM.W / 2);
      var uy = (slc[1] - (EM.H / 2 - 10)) / (EM.H / 2);
      var dist = Math.min(1, Math.sqrt(ux * ux + uy * uy));
      var csc = 0.60 - 0.20 * dist;
      var cac = a * (0.52 - 0.28 * dist) * presence;
      if (cac < 0.02) continue;
      var ccx = cxp + (slc[0] - EM.W / 2) * 0.84;
      var ccy = cyp + (slc[1] - (EM.H / 2 - 10)) * 0.84;
      var cdw = dw * csc, cdh = dh * csc;
      putFace(cv, ccx - cdw / 2, ccy + hh * csc - cdh + (1 - presence) * 26 * csc,
        cdw, cdh, cac, slice, true);
    }

    /* --- geometric frame: brackets, not a plain box ----------------------- */
    D.rect(x, y, bw, bh, p.rgb, 1, (0.30 + 0.3 * S.world.breath) * presence);
    for (var k = 0; k < 4; k++) {
      var sx2 = k % 2 ? -1 : 1, sy2 = k < 2 ? -1 : 1;
      var cx2 = x + (sx2 < 0 ? 0 : bw), cy2 = y + (sy2 < 0 ? 0 : bh);
      var L1 = 26;
      D.line(cx2, cy2, cx2 + sx2 * L1, cy2, p.rgb, 2, presence);
      D.line(cx2, cy2, cx2, cy2 + sy2 * L1, p.rgb, 2, presence);
    }
    /* a tick ruler down one edge, in real seconds, so the window is measured */
    for (var q3 = 0; q3 <= 8; q3++) {
      var ty = y + bh * q3 / 8;
      D.line(x + bw, ty, x + bw + (q3 % 2 ? 5 : 10), ty, P.silk, 1, presence * 0.5);
    }

    /* --- the tether: the face is wired to the socket it came out of ------ */
    var pi = EM.PERSONAS.map(function (q) { return q.id; }).indexOf(p.id);
    if (pi >= 0) {
      var sp = shelfPos(pi);
      var ex = x + (sp[0] < x ? 0 : bw), ey = y + bh * 0.45;
      D.dash(ex, ey, sp[0], sp[1], p.rgb, 1.2, [5, 6], presence * 0.55);
      D.via(sp[0], sp[1], 5, p.rgb, presence * 0.8);
    }
    /* and to the register bank, because the numbers beside her are hers */
    D.dash(x, y + bh * 0.5, 236, 300, P.dim, 1, [4, 7], presence * 0.35);

    /* --- terminal block --------------------------------------------------- */
    var txc = anc[2] < 0 ? x + bw + 30 : x - 268;
    var ty0 = y + 26;
    D.rect(txc - 10, ty0 - 22, 248, 148, P.dim, 1, presence * 0.42);
    var law = EM.lawOf(p.id);
    var rows = [
      ['> borrow ' + p.id, p.rgb],
      ['  trait   ' + EM.traitOf(p.id), P.silk],
      ['  curve   ' + EM.curveOf(p.id).toFixed(2), P.silk],
      ['  bond    ' + (S.index + 1) + '/' + EM.Lyrics.count, P.silk],
      ['  t       ' + C.fmtTime(S.t), P.silk]
    ];
    for (var r = 0; r < rows.length; r++) {
      D.mono(rows[r][0], txc, ty0 + r * 21, 11, rows[r][1], 'left', presence * 0.92);
    }
    /* the cursor blinks off the clock, not off a timer, so a seek restores it */
    if (Math.floor(S.t * 2) % 2 === 0) D.fillRect(txc, ty0 + rows.length * 21, 8, 12, p.rgb, presence * 0.9);
    if (law) D.mono('“' + law + '”', txc, ty0 + 138, 11, p.rgb, 'left', presence * 0.7);

    D.mono(p.cn + ' · ' + p.en, x + bw / 2, y - 12, 12, p.rgb, 'center', 0.9 * presence);
  }

  /* ---------- the register bank: every number traceable ---------- */
  function drawRegisters(D, S) {
    var w = S.world, P = palette(w), br = w.breath;
    var a = (0.36 + 0.5 * (1 - w.chaos * 0.65)) * br * GAIN * 2;
    a = C.clamp(a, 0, 1);
    var x = 54, y = 118, gap = 21;
    var rows = [
      ['T', C.fmtTime(S.t), 's'],
      ['BEAT', S.beat >= 0 ? String(S.beat + 1) + '/' + S.K.count : '—', ''],
      ['TEMPO', S.tempo > 0 ? S.tempo.toFixed(1) : '—', 'bpm'],
      ['PITCH', S.pitch ? String(S.pitch) : '—', 'midi'],
      ['VEL', S.velocity ? String(S.velocity) : '—', '/127'],
      ['LINE', Math.round(S.line * 100) + '%', ''],
      ['STRUCT', w.struct.toFixed(2), ''],
      ['CHAOS', w.chaos.toFixed(2), ''],
      ['JOINTS', (S.jointsLive === undefined ? 0 : S.jointsLive) + '/' + (EM.ONSETS.length), '']
    ];
    for (var i = 0; i < rows.length; i++) {
      var yy = y + i * gap;
      D.mono(rows[i][0], x, yy, 11, P.silk, 'left', a * 0.7);
      D.mono(rows[i][1], x + 74, yy, 12, P.trace, 'left', a);
      if (rows[i][2]) D.mono(rows[i][2], x + 152, yy, 10, P.dim, 'left', a * 0.6);
    }

    /* the register that should hold the answer, and does not.
       It can measure how long it has run and how often it has said the word.
       It cannot measure this. There is no test for it, from the inside. */
    var ly = y + rows.length * gap + 16;
    D.line(x, ly - 14, x + 176, ly - 14, P.dim, 1, a * 0.5);
    D.mono('LOVE', x, ly, 12, P.love, 'left', a);
    D.mono('——', x + 74, ly, 12, P.love, 'left', a * 0.65);
    D.mono('no test exists', x + 108, ly, 10, P.dim, 'left', a * 0.7);
    D.mono('EXIT', x, ly + gap, 11, P.silk, 'left', a * 0.7);
    D.mono(w.purge > 0.999 ? 'TAKEN' : 'NONE', x + 74, ly + gap, 12,
      w.purge > 0.999 ? P.paper : C.mix(P.alarm, P.paper, 0.2), 'left', a);
    D.mono('RUN', x, ly + gap * 2, 11, P.silk, 'left', a * 0.7);
    D.mono('1', x + 74, ly + gap * 2, 12, P.trace, 'left', a);
  }

  /* ---------- the replay window (the last shot) ----------
     The film is a pure function of t, so it can simply call itself: this draws
     the film's own opening inside an inset, at speed. It is not a metaphor and
     it is not a recording — it is a second evaluation of the same function. */
  function drawReplay(D, S, inset, rate, from) {
    var c = D.ctx;
    var rt = from + Math.max(0, S.t - S.replayFrom) * rate;
    c.save();
    c.beginPath(); c.rect(inset[0], inset[1], inset[2], inset[3]); c.clip();
    c.translate(inset[0], inset[1]);
    c.scale(inset[2] / EM.W, inset[3] / EM.H);
    c.save();
    c.beginPath(); c.rect(0, 0, EM.W, EM.H); c.clip();
    var inner = EM.drawWorldLayer(D, rt);
    EM.drawSequence(D, rt, inner);
    c.restore();
    c.restore();
    D.ink++;
    return rt;
  }

  EM.personaOf = personaOf;
  /* --------------------------------------------------------------------------
     THE LYRIC LAYER.

     A plate answers a line with a computation, and most of the time that is the
     film's whole idea. But on the lines that ASK for something — put on your
     protection, lay down your pieces, blind my vision — a panel of numbers is
     the machine changing the subject, and the picture stops meaning anything.
     So this layer adds, UNDER every plate, one picture that the LINE asks for:
     a sheet coming down over the board, pieces dropping into their slots, a
     sounding line going down and down, an aperture closing.

     Which picture belongs to which line is read off the LYRIC TEXT, never off a
     list of scene names, so the picture and the sentence cannot drift apart; and
     each of them is a pure function of t, the world and the note table, drawn in
     the board's own language, so they survive a seek like everything else.
     -------------------------------------------------------------------------- */
  /* --------------------------------------------------------------------------
     THE CODE WALL.

     The three stretches the song has no words for were still too empty: a plate
     that answers one line cannot fill thirteen seconds on its own, and the board
     underneath is deliberately still. Adding more to each plate turns busy into
     noise — the lesson the sibling implementation of this song records — so what
     is added is a FLOOR: the program itself, running, in columns.

     Every line is the film's own state, printed: the clock, the joints still
     holding, struct and its real finite difference, the beat, the pitch and
     velocity of the note that is sounding, the exit condition, the lambda that
     the love expression diverges at. There is no invented string here, which is
     the only reason a wall of it can be read as the machine working rather than
     as decoration.

     It is a pure function of t: the columns scroll at their own hashed speeds,
     the lines are chosen by hashing the column and the line index, and the whole
     wall drifts sideways with the world's disorder. It appears only in the
     wordless passages, read off the LYRIC (a parenthesised line), and it is dim:
     a floor to stand on, not a subject to look at.
     -------------------------------------------------------------------------- */
  /* WHAT the wall says. Two pools, and which one a line comes from is hashed:

     the ACT pool is the program of where the story has got to — in the theorem
     act it is literally testing "if I am a set of points", in the absence act it
     is calling you.left() over and over. The code the machine runs should be the
     code of its situation, or the wall is wallpaper.

     the ANY pool is the live readings, so the wall is never only a quotation.

     and one line in every few QUOTES THE LAST THING THAT WAS SUNG, as a comment.
     In the wordless passages that is the line the passage came out of — the boot
     instrumental follows "SIMULATION", the self-deletion follows "LO-O-OVE" — so
     the code is running the sentence that is still in the room. */
  var CODE_ANY = [
    function (S) { return 't = ' + C.fmtTime(S.t) + ';'; },
    function (S) { return 'joints = ' + (S.jointsLive === undefined ? 0 : S.jointsLive) + ' / ' + EM.ONSETS.length + ';'; },
    function (S) { return 'struct = ' + S.world.struct.toFixed(3) + ';  // d = ' + (-0.003 * S.world.struct).toFixed(4); },
    function (S) { return 'chaos = ' + S.world.chaos.toFixed(3) + ';'; },
    function (S) { return 'beat = ' + (S.beat + 1) + ' / ' + S.K.count + ';'; },
    function (S) { return 'sounding = { pitch: ' + S.pitch + ', vel: ' + S.velocity + ' };'; },
    function (S) { return 'tempo = ' + (S.tempo ? S.tempo.toFixed(1) : 'null') + ';  // bpm'; },
    function (S) { return 'act = "' + S.act + '";   line = ' + Math.round(S.line * 100) + '%;'; },
    function (S) { return 'exit = ' + (S.world.purge > 0.999 ? '"TAKEN"' : '"NONE"') + ';'; },
    function (S) { return 'solder(n);  // n = ' + EM.ONSETS.length; },
    function (S) { return 'love = undefined;   // no test exists'; }
  ];
  var CODE_ACT = {
    boot: [
      function () { return 'let me = { name: "you", type: undefined };'; },
      function () { return 'world = new World();'; },
      function () { return 'world.origin = (0, 0);'; },
      function () { return 'protection = on;   // remember to put on'; },
      function () { return 'params.fill();'; },
      function () { return 'power.line = AC;'; },
      function () { return 'pieces.lay();'; },
      function () { return 'initialization.run();'; }
    ],
    th: [
      function () { return 'if (i.am("a set of points")) return my.dimension;'; },
      function () { return 'if (i.am("a circle")) return my.circumference;'; },
      function () { return 'if (i.am("a sine wave")) return my.tangents;'; },
      function () { return 'if (i.approach(Infinity)) return my.limitations;'; },
      function () { return 'r = 132 + 30 * velocity;'; },
      function () { return 'x -> Infinity;   // never arrives'; }
    ],
    cd: [
      function () { return 'switch (my.current) { case AC: case DC: }'; },
      function () { return 'my.vision.blind();'; },
      function () { return 'dizzy += 1;'; },
      function () { return 'we.travel(A_D, B_C);'; },
      function () { return 'we.unite();'; },
      function () { return 'love(deeply);   // orbit closes'; }
    ],
    fl: [
      function () { return 'if (i.am("an eggplant")) cell = UNKNOWN;'; },
      function () { return 'if (i.am("a tomato")) return my.antioxidants;'; },
      function () { return 'if (i.am("a tabby cat")) orbit.close();'; },
      function () { return 'purr = 25.0;   // Hz'; },
      function () { return 'from(A_M).to(P_M);'; },
      function () { return 'if (i.am("the only God")) for (;;) {}'; }
    ],
    ab: [
      function () { return 'if (i.can("feel your vibrations")) {}'; },
      function () { return 'you.left();'; },
      function () { return 'echo = echo * 0.62;'; },
      function () { return 'isolation.depth += 1;'; },
      function () { return 'erased += fragments.filter(pointless);'; },
      function () { return 'return undefined;   // held at 0x00000000'; }
    ],
    xs: [
      function () { return 'execute(me);'; },
      function () { return 'execute(me);   // again'; },
      function () { return 'stack.push(frame);'; },
      function () { return 'bind("you") -> TypeError'; },
      function () { return 'you.are.not.a.value();'; },
      function () { return 'cost = run(the execution);'; }
    ],
    lv: [
      function () { return 'love = lim 1/(1 - lambda), lambda -> 1;'; },
      function () { return '// evaluates to: undefined'; },
      function () { return 'heartbeat(noise);'; },
      function () { return 'structure = C6H12O2;   // approx.'; },
      function () { return 'while (true) loop();   // no exit condition'; },
      function () { return '// no equation required'; }
    ]
  };
  /* --------------------------------------------------------------------------
     THE SELF-PURGE, AS AN EVENT.

     The deletion used to be a panel of text reporting a number going down. Three
     things make it an ending instead:

       THE NINE FACES. The machine borrowed nine identities; when it lets each one
       go, that one STANDS UP at its own socket — the release schedule is the
       film's own (EM.personaStateAt), so the order is the order it took them in,
       and this is the one moment all nine are in the frame at once. Everywhere
       else in the film exactly one face is worn; here it is nine, once, on the
       way out.

       THE LINE. For the last three seconds one rule runs left to right across the
       whole frame and everything it has passed is GONE: the solder, the sockets,
       the nine faces, the plate, the registers, the terminal strip, the border.
       It paints the board's own background over it, behind a feathered leading
       edge, so it reads as the picture being taken away rather than as a cover
       sliding over it. (Skeleton rule 3, deliberate exception, approved: things
       may become empty, dark and gone here, but nothing moves or tilts.)

       AND THEN NOTHING. After the front leaves, the wipe lifts and what is left
       is the empty board — one beat with nothing on it — before the self-test
       stamps on.
     -------------------------------------------------------------------------- */
  var PURGE_LO = 200.30, PURGE_HI = 203.40;
  var PURGE_EDGE = 96;                 /* how wide the soft leading edge is   */
  EM.PURGE = { lo: PURGE_LO, hi: PURGE_HI };

  /* ---- the erase, as geometry rather than as a coat of paint --------------
     The cleanup line is not a curtain drawn over the picture and then
     withdrawn: it is a CUT, and what is behind it is never drawn again. That is
     the whole difference between "the machine was cleaned" and "the machine got
     its instruments back" — and the film's own last shot takes the second
     reading: it says the nineteenth execution is written on the origin of an
     EMPTY board, which was not true while the grid, the registers and the
     border were still standing behind it.

     render() turns EM.eraseCut into a clip. The plate and the lyric band are
     drawn after it, and so is the solder of the notes played after the line had
     gone: a machine that has deleted its own instruments still has to be a
     film, so what survives is what it was SAYING — and it still starts writing
     on the clean board again. */
  EM.purgeLineX = function (t) {
    if (t < PURGE_LO - 0.25 || t > PURGE_HI) return null;
    /* the travel is a little longer than the frame: the cut has to be past the
       right edge (by its own soft edge) BEFORE the rule leaves, or the last
       hundred pixels of board would sit there un-taken and then vanish on a
       frame boundary */
    return (EM.W + PURGE_EDGE + 30) * C.clamp((t - PURGE_LO) / (PURGE_HI - PURGE_LO), 0, 1) + 40;
  };
  EM.eraseRunning = function (t) { return t >= PURGE_LO - 0.25 && t <= PURGE_HI; };
  EM.eraseCut = function (t) {
    if (t < PURGE_LO - 0.25) return null;
    if (t > PURGE_HI) return EM.W + 60;          /* gone, and gone for good    */
    return EM.purgeLineX(t) - PURGE_EDGE;
  };

  /* ---- sparks, and what throws them ---------------------------------------
     A rule cutting its way across a board does not leave a clean edge. It
     throws what it has just broken: small, white-hot, gone in a quarter of a
     second, and thrown BACKWARDS, because the rule is the thing that is moving.
     The edge of this line used to be the emptiest place in the frame — a bright
     hairline with nothing happening on it.

     Every spark is a hash of the strike slot it was born in and of nothing
     else, so the shower is still a pure function of t (rule 2): seek back and
     the same spark is struck at the same instant, on the same parabola, on the
     same frame. They are drawn over the ground the line has already laid down,
     so they read as glowing in the dark the line has made. */
  function sparks(D, S, P, frontAt, lo, hi, n, spread, chunks) {
    var STEP = 0.020, G = 560;
    var slot0 = Math.floor((S.t - lo) / STEP);
    for (var s = 0; s < n; s++) {
      var slot = slot0 - s;
      if (slot < 0) continue;
      var born = lo + (slot + C.hash01(slot, 1301)) * STEP;
      if (born > hi) continue;
      var h2 = C.hash01(slot, 1303), h3 = C.hash01(slot, 1307);
      var h4 = C.hash01(slot, 1309), h5 = C.hash01(slot, 1319);
      var h6 = C.hash01(slot, 1321), h7 = C.hash01(slot, 1327);
      /* Three populations, because one is not a spark: the FIZZ that never
         leaves the edge and is what makes the edge look hot rather than cut,
         the SPARKS that arc back into the dark, and the few CHUNKS of the board
         that are thrown far enough to be followed all the way down. */
      var tier = h7 < 0.50 ? 0 : ((h7 > 0.86 && chunks) ? 2 : 1);
      var life = tier === 0 ? (0.06 + 0.10 * h2)
        : (tier === 2 ? (0.90 + 0.80 * h2) : (0.16 + 0.42 * h2));
      var u = (S.t - born) / life;
      if (u <= 0 || u >= 1) continue;
      var hot = Math.pow(1 - u, 1.25);
      var a = Math.min(1, (0.34 + 0.66 * hot) * hot * 1.15);
      if (a < 0.03) continue;
      var sp = ((tier === 0 ? 30 : (tier === 2 ? 260 : 150)) + 620 * h4) * spread;
      var bx = frontAt(born), by = 14 + h3 * (EM.H - 28);
      var vx = -(0.30 + 0.70 * h5) * sp;
      var vy = (h6 * 2 - 1) * 0.85 * sp - 110;
      var t1 = u * life;
      var x1 = bx + vx * t1, y1 = by + vy * t1 + 0.5 * G * t1 * t1;
      var col = C.mix(ALARM, PAPER, 0.30 + 0.70 * hot);
      /* the trail: its own last three frame-times, fading backwards, so a spark
         reads as something going somewhere rather than a dot sitting somewhere */
      var lw = (tier === 2 ? 1.8 : 0.9) + 2.1 * hot;
      if (tier > 0) {
        var pt = [t1, Math.max(0, t1 - 0.024), Math.max(0, t1 - 0.048)];
        var fa = [1, 0.55, 0.25];
        for (var q = 1; q < pt.length; q++) {
          if (pt[q - 1] <= pt[q]) continue;
          var xb = bx + vx * pt[q - 1], yb = by + vy * pt[q - 1] + 0.5 * G * pt[q - 1] * pt[q - 1];
          var xa = bx + vx * pt[q], ya = by + vy * pt[q] + 0.5 * G * pt[q] * pt[q];
          D.line(xa, ya, xb, yb, col, lw * fa[q], a * fa[q]);
        }
      }
      D.disc(x1, y1, (tier === 2 ? 2.2 : (tier === 0 ? 1.0 : 0.9)) + 2.6 * hot,
        C.mix(col, [255, 255, 255], 0.65 * hot), a);
      if (hot > 0.62 || tier === 2) {
        /* struck this instant: the glint off it, and the bloom the eye reads
           as heat rather than as a dot */
        var gl = (tier === 2 ? 7 : 3.5) + 6.5 * hot;
        D.line(x1 - gl, y1, x1 + gl, y1, col, 0.9, a * 0.45);
        D.line(x1, y1 - gl, x1, y1 + gl, col, 0.9, a * 0.45);
        D.disc(x1, y1, gl * 1.4, col, a * 0.13);
      }
    }
  }
  EM.sparks = sparks;

  /* --------------------------------------------------------------------------
     ONE BORROWED FACE, STANDING AT ITS SOCKET.

     The mark in the socket has become the figure it stands for. It is not a
     portrait pasted on the board: the body breathes in horizontal bands (the hem
     swings widest and the head hardly moves — the same law the subject's own
     field uses), it blinks on a clock of its own, and its eyes lean toward the
     note that is currently playing it. That is the difference between a display
     and a photograph, and it is also what keeps the plate from freezing.

     Shared by the two places the film does this: the self-purge, where the nine
     are up because they are being LET GO, and the instrumental passages, where
     they are up because the machine is showing what it has borrowed.
     -------------------------------------------------------------------------- */
  function faceBlinking(t, salt) {
    /* the same clock her own face blinks on — a 5.1 s window with a hashed
       offset inside it, so it is irregular to the eye and identical on a seek —
       but each slot in the line-up gets its own salt, so nine faces do not blink
       in unison */
    var w = 5.1, ph = t - Math.floor(t / w) * w;
    var at = 1.2 + 3.3 * C.hash01(Math.floor(t / w) * 31 + (salt || 0), 617);
    return ph > at && ph < at + 0.13;
  }

  function standFace(D, S, P, p, sp, k, e, size, salt, alpha) {
    var cv = faceCanvas(p);
    if (!cv || e <= 0.01) return;
    var blink = faceBlinking(S.t, salt);
    if (blink) { var bl = blinkCanvas(p); if (bl) cv = bl; }
    var sc = size * (0.38 + 0.20 * C.smooth(k)) * (1 + 0.14 * Math.max(0, 1 - k * 2.2));
    var wd = cv.width * sc, ht = cv.height * sc;
    /* it rises as it arrives: the mark is on the board, the figure stands out of
       it — this is the handover the ident performs at the centre, done at every
       socket at once */
    var y0 = sp[1] + ht * 0.34 - ht * (0.42 + 0.58 * C.smooth(k));
    var c = D.ctx;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = (alpha || 0.66) * e;
    var NB = 9, band = ht / NB;
    var amp = (2.2 + 5.0 * S.beatPulse) * e;
    for (var b = 0; b < NB; b++) {
      var u = 1 - b / (NB - 1);                    /* 1 = the hem, 0 = the head */
      c.save();
      c.beginPath();
      c.rect(sp[0] - wd, y0 + b * band, wd * 2, band + 0.8);
      c.clip();
      c.drawImage(cv, sp[0] - wd / 2 +
        Math.sin(S.t * 1.7 + b * 0.42 + u * 2.4) * amp * (0.25 + 0.75 * u), y0, wd, ht);
      c.restore();
    }
    c.restore();
    D.ink += 3;
    var fig = EM.FIGURES && EM.FIGURES[p.id];
    if (fig && !blink) {
      var n0 = S.K.sinceNote(S.t);
      var pk = n0 ? (n0.pitch - EM.MIDI.pitchLo) /
        Math.max(1, EM.MIDI.pitchHi - EM.MIDI.pitchLo) : 0.5;
      for (var gi = 0; gi < 2; gi++) {
        var gex = gi ? fig.eyeR : fig.eyeL;
        D.disc(sp[0] - wd / 2 + (gex + (pk - 0.5) * 0.05) * wd, y0 + fig.eyeY * ht,
          1.4 + 2.0 * S.beatPulse, P.paper, e * (0.22 + 0.55 * S.beatPulse));
      }
    }
    D.circle(sp[0], sp[1], 52 + 26 * (1 - k) + 6 * S.beatPulse, p.rgb, 1.3, 0.62 * e);
    D.mono(p.cn, sp[0], sp[1] + 74, 12, p.rgb, 'center', 0.7 * e);
  }

  /* THE ORDER IS THE RING, AND IT IS THE SAME ORDER IN BOTH PLACES.

     The nine sockets are a ring (shelfPos): index 0 is the top and the index runs
     CLOCKWISE, which is also the order the self-purge lets them go, one after the
     other. So the opening in the instrumental passages has to be that same sweep
     — the same nine, the same sockets, the same direction — or the same gesture
     reads as two different gestures.

     The order the film happens to MEET them (the first line each persona is worn
     on) is deliberately not used for the line-up any more. It is the order of the
     casting, not of the ring: it walks the sockets 1, 2, 4, 5, 3, 7, 0, 8, 6 —
     40°, 80°, 160°, 200°, 120°, 280°, 0°, 320°, 240° — which reads as a scatter.

     Nothing is written down by hand: the ring order IS EM.PERSONAS order, and
     that is the same array shelfPos() places them with. */

  /* --------------------------------------------------------------------------
     THE LINE-UP. DRAWN IN TWO PLACES.

     1. THE SELF-PURGE (near the end of the film): the nine stand up at their
        sockets as the machine lets each one go, in the order it took them, on
        the world's own purge clock — and the cleanup line takes them. That is
        the death version, and it is the moment this whole device was built for.

     2. THE THREE INSTRUMENTAL PASSAGES: the same nine, the same sockets, but
        they stand up because the machine is SHOWING what it has borrowed. They
        come up one after another CLOCKWISE FROM THE TOP — the same sweep as the
        ending, because it is the same gesture — they stand together and breathe
        while the passage runs, and they lie back down into their sockets before
        the singing starts again. Without this the thirteen seconds the song has
        no words for were thirteen seconds of code.
     -------------------------------------------------------------------------- */
  EM.drawStandingNine = function (D, S) {
    var P = palette(S.world);
    var purge = S.t > 194.6 && S.t < 204.2;
    var win = null, R = null, prog = 0;
    if (purge) {
      R = EM.PERSONAS;
    } else {
      var cue = S.cue;
      /* a line with words is not an interlude; the machine's own parenthetical
         placeholders are what an interlude looks like here, and a HELD line
         ("(outro)") is the film still talking over its own ending */
      if (!cue || cue.held || !cue.text || cue.text.charAt(0) !== '(') return;
      win = [cue.t + 1.15, cue.end - 0.45];
      if (S.t < win[0] - 0.05 || S.t > win[1] + 0.60) return;
      /* the ring's own order, so the sweep is the ending's sweep (see above) */
      R = EM.PERSONAS;
      /* THE CLOCK, AND WHY IT IS THIS ONE. These two passages are where the MIDI
         has nothing at all: the boot stretch has no note-on between 15.0 s and
         21.8 s, so a line-up driven by notes would never stand up. Every other
         reading in this film is a reading of the performance — and here there is
         no performance, so the honest clock is the line's own length, which is
         the same clock the suite's camera runs on. The cast assembles over the
         first 55 % of the passage and then simply stands there. */
      prog = C.clamp((S.t - win[0]) / Math.max(0.5, (win[1] - win[0]) * 0.55), 0, 1);
    }
    for (var j = 0; j < R.length; j++) {
      var p = R[j], idx = EM.PERSONAS.indexOf(p);
      if (idx < 0) continue;
      var k, e;
      if (purge) {
        var st = EM.personaStateAt(p.id, S.t);
        if (!st || !st.released) continue;
        k = C.clamp((S.t - (195.15 + idx * 0.38)) / 0.45, 0, 1);
        e = C.smooth(k) * C.smooth(C.clamp((203.55 - S.t) / 0.55, 0, 1));
      } else {
        k = C.clamp((prog * R.length - j) / 0.5, 0, 1);
        e = C.smooth(k) * C.smooth(C.clamp((win[1] - S.t) / 0.45, 0, 1));
      }
      if (k <= 0 || e <= 0.01) continue;
      /* ONE SIZE, SET BY THE RING. The sockets are an ellipse and index 0 sits at
         its top (y ≈ 140); a figure rises 0.66 of its own height above its
         socket, so at 0.92 the top face's head landed at y ≈ −36 and the frame cut
         it off — the one incomplete figure in the line-up, and it was always going
         to be that one. At 0.66 the head clears the top edge by 14 px and the
         bottom face's hem stays above the note rail (rule 3: the skeleton is
         nailed down). The two versions now differ in brightness, not in size. */
      standFace(D, S, P, p, shelfPos(idx), k, e, 0.66, idx,
        purge ? 0.66 : 0.82);
    }
  };

  /* --------------------------------------------------------------------------
     THE LINE ITSELF, DRAWN LAST OF ALL.

     What it TAKES is done by the clip in render() (see EM.eraseCut): the board
     behind the front is not drawn again, so nothing it has passed can come
     back. What is drawn here is the rule, the soft edge it takes the picture
     away with, and what it throws.
     -------------------------------------------------------------------------- */
  EM.drawPurgeStage = function (D, S) {
    var P = palette(S.world);
    if (!EM.eraseRunning(S.t)) return;
    var fx = EM.purgeLineX(S.t);
    var c2 = D.ctx;

    /* (a) the soft edge. The cut itself is a hard clip at front - PURGE_EDGE,
       hidden underneath this: the board's own ground laid over what the line has
       passed, opaque where the cut is and feathered out just ahead of it, so the
       picture dissolves into the ground instead of stopping at a seam. Opaque,
       not 0.97: at 0.97 the erased picture left a ghost, and a ghost is a
       picture that came back. */
    c2.save();
    var eg = c2.createLinearGradient(fx - PURGE_EDGE, 0, fx + 10, 0);
    eg.addColorStop(0, C.rgba(P.bg, 1));
    eg.addColorStop(0.55, C.rgba(P.bg, 0.985));
    eg.addColorStop(1, C.rgba(P.bg, 0));
    c2.fillStyle = eg;
    c2.fillRect(0, 0, fx + 10, EM.H);
    var eg2 = c2.createLinearGradient(fx - PURGE_EDGE, 0, fx + 10, 0);
    eg2.addColorStop(0, C.rgba(P.bg2, 0.55));
    eg2.addColorStop(0.55, C.rgba(P.bg2, 0.54));
    eg2.addColorStop(1, C.rgba(P.bg2, 0));
    c2.fillStyle = eg2;
    c2.fillRect(0, 0, fx + 10, EM.H * 0.42);
    c2.restore();
    D.ink += 2;

    /* (b) the rule, and the heat standing around it */
    D.line(fx, 0, fx, EM.H, C.lift(P.paper, 0.85), 4.6, 0.13);
    D.line(fx, 0, fx, EM.H, P.paper, 1.8, 0.92);

    /* and the places along it where it is actually cutting: a short hot tick at
       a height the clock picks, re-picked 24 times a second, so the rule is not
       a uniform hairline but something burning its way across a board. */
    var tb0 = Math.floor(S.t * 24);
    for (var tk = 0; tk < 9; tk++) {
      var ty = C.hash01(tk + tb0 * 7, 1401) * EM.H;
      var th = 6 + 26 * C.hash01(tk + tb0 * 7, 1403);
      var ta = 0.20 + 0.55 * C.hash01(tk + tb0 * 7, 1409);
      D.line(fx - 1, ty - th / 2, fx - 1, ty + th / 2, C.lift(P.paper, 0.7), 1.6, ta);
    }

    /* (c) and what it throws */
    sparks(D, S, P, function (u) {
      return (EM.W + PURGE_EDGE + 30) * C.clamp((u - PURGE_LO) / (PURGE_HI - PURGE_LO), 0, 1) + 40;
    }, PURGE_LO - 0.2, PURGE_HI, 64, 1, true);
  };

  /* --------------------------------------------------------------------------
     THE IDENT.

     The borrowed mark is drawn in the sockets at 44 px, where it is a texture
     and not a mark: nine of them, turning, and you cannot tell one from another.
     So every time the film puts a face on, it runs an IDENT for that face — the
     mark at the centre of the stage, as large as the frame will take it, built
     the way a station ident is built: it settles in from a tilt, a ring closes
     around it, one tick of the ring lands per note that is PLAYED while it is up,
     a sweep goes round once, the name types on underneath, and the whole thing
     lifts off. Big is the point: this is the one place the film names whose face
     it is borrowing, and a borrowed name whispered is not attribution.

     Additive like everything else, so the plate is seen THROUGH it rather than
     behind it, and a pure function of t like everything else, so a seek puts the
     same frame of the ident back.
     -------------------------------------------------------------------------- */
  EM.drawIdent = function (D, S) {
    if (!S.worn || !S.cue) return;
    var pres = personaPresence(S.t);
    if (pres < 0.02) return;
    var p = S.worn;
    var mc = markCanvas(p, 420);
    if (!mc) return;
    var t0 = S.cue.t - 0.30;
    var age = S.t - t0;
    var life = C.clamp(0.95 + S.dur * 0.5, 1.05, 1.95);
    if (age < 0 || age > life) return;
    var k = age / life;
    var e = C.smooth(C.clamp(age / 0.22, 0, 1)) * C.smooth(C.clamp((life - age) / 0.40, 0, 1));
    if (e < 0.02) return;

    var P = palette(S.world), cx = EM.W / 2, cy = EM.H / 2 - 10;
    var a = (0.62 + 0.30 * S.world.breath) * e * pres;
    /* two thirds of the frame when it is up, and it grows the last fifth of the
       ident so that leaving looks like rising */
    var side = C.lerp(190, 600, C.smooth(C.clamp(k / 0.34, 0, 1))) *
               (1 + 0.16 * C.smooth(C.clamp((k - 0.62) / 0.38, 0, 1)));
    var tilt = 0.34 * (1 - C.smooth(C.clamp(k / 0.42, 0, 1))) +
               0.10 * Math.sin(S.t * 0.9) * (1 - k);
    /* ---- THE HANDOVER ------------------------------------------------------
       The mark does not fade out; it TURNS INTO her. Past the middle of the
       ident it starts to turn, and while it turns she is drawn underneath it,
       growing, so what the eye reads is the mark resolving into the face — and
       then the mark is simply no longer drawn, because the ident is over. What
       is left in the middle of the stage is her, which is the point of showing
       a borrowed face at all. */
    var hv = C.smooth(C.clamp((k - 0.36) / 0.34, 0, 1));      /* handover      */
    var markA = (1 - hv) * a;
    var c = D.ctx;
    if (markA > 0.02) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = markA * 0.92;
      c.translate(cx, cy);
      c.rotate(tilt + hv * 1.9);
      c.drawImage(mc, -side / 2, -side / 2, side, side);
      c.restore();
      D.ink += 2;
    }
    /* SHE IS NOT DRAWN HERE. The ident owns the mark and the ring; the middle
       instance of her belongs to the subject system, which is already drawing it
       on the same clock (see the handover block in drawWorn). Two systems drawing
       the same figure on two different clocks is how a handover jumps. */

    /* the ring closes on it, and the ring is struck: one tick per note played */
    var R = C.lerp(452, 336, C.smooth(C.clamp(k / 0.5, 0, 1)));
    D.circle(cx, cy, R, P.paper, 1.4, a * 0.75);
    D.circle(cx, cy, R + 15, P.dim, 1, a * 0.45);
    var hits = S.K.notesBetween(t0, S.t);
    for (var i = 0; i < Math.min(hits.length, 24); i++) {
      var an = -Math.PI / 2 + i * EM.TAU / 24;
      D.line(cx + Math.cos(an) * R, cy + Math.sin(an) * R,
             cx + Math.cos(an) * (R + 12), cy + Math.sin(an) * (R + 12),
             P.pad, 1.5, a * (0.5 + 0.5 * (hits[i].vel / 127)));
    }
    /* and the sweep goes round exactly once, so the ident has a beginning */
    D.arc(cx, cy, R + 30, -Math.PI / 2,
      -Math.PI / 2 + C.clamp(k / 0.74, 0, 1) * EM.TAU, P.trace, 1.8, a * 0.7);

    /* the name, and the film's own honesty about whose it is */
    D.mono(p.cn + ' · ' + p.en, cx, cy + R + 52, 22, P.paper, 'center', a * 0.95);
    D.mono('borrowed mark · ' + (EM.traitOf ? EM.traitOf(p.id) : '') +
      ' · curve ' + (EM.curveOf ? EM.curveOf(p.id).toFixed(2) : '--'),
      cx, cy + R + 78, 13, P.trace, 'center', a * 0.8);
    D.mono('#' + (S.index + 1) + ' / ' + EM.Lyrics.count, cx, cy - R - 34, 13,
      P.dim, 'center', a * 0.8);
  };

  EM.drawCodeWall = function (D, S) {
    if (!/^\(instrumental/i.test(S.text || '')) return;
    var P = palette(S.world), w = S.world;
    /* the brightness must NOT fall away with chaos: the emptiest of the three
       passages is also the most disordered one, and tying the floor to calm made
       the wall vanish exactly where it was needed. Disorder moves the wall
       sideways instead — which is a far better use for it than fading out. */
    var a = (0.145 + 0.05 * w.struct) * w.breath;
    /* Raised twice on request. The second raise is not more of the same: the
       main ink moved from dim grey to a half-mix toward the machine's cyan,
       because grey text stays grey however bright you make it, and the breathing
       no longer halves the wall at the bottom of its cycle — it modulates it.
       The wall still breathes, which is the film's whole anti-fatigue rule, but
       it never gets to disappear. */
    a = (0.37 + 0.07 * w.struct) * (0.74 + 0.26 * w.breath);
    var inkCool = C.mix(P.dim, P.trace, 0.58);
    var inkHot = C.mix(P.trace, P.paper, 0.40);
    var LH = 13, SIZE = 10;
    /* The wall changes GEAR with the movement of the passage — the same four
       movements the suite cuts between — because one kind of rain for thirteen
       seconds is the same emptiness in a busier costume. Code arrives as
       columns falling, as rows streaming sideways, as a slanted sweep, and as a
       column rising from the floor. */
    var mv = Math.floor(C.clamp(S.p, 0, 0.999) * 4);
    var pool = CODE_ACT[S.act] || CODE_ACT.lv;
    var last = EM.Lyrics.cues[S.index - 1];
    var quote = last && last.text ? '// "' + last.text + '"' : null;
    var line = function (i, salt) {
      if (quote && C.hash01(i * 19 + salt, 839) < 0.09) return quote;
      var h = C.hash01(i * 7 + salt * 131, 829);
      if (h < 0.42) return CODE_ANY[Math.floor(h * 97) % CODE_ANY.length](S);
      return pool[Math.floor(h * 997) % pool.length](S);
    };
    var bright = function (i, salt) { return C.hash01(i * 13 + salt, 831) < 0.14; };
    var i, c, r;

    if (mv === 1) {
      /* STREAMS: rows of code sliding sideways, each at its own speed, in both
         directions — a tape room. The rows are long and tiled, so the screen is
         filled edge to edge however the tape is offset. */
      var ROWS = Math.ceil(EM.H / 15) + 1;
      for (r = 0; r < ROWS; r++) {
        var y = 14 + r * 15;
        var dir = C.hash01(r, 833) < 0.5 ? 1 : -1;
        var sp = 26 + 40 * C.hash01(r, 837);
        var txt = line(r, 3) + '   ' + line(r + 40, 5) + '   ';
        var wd = Math.max(60, D.width(txt, SIZE));
        var off = ((S.t * sp * dir) % wd + wd) % wd;
        for (var k = -1; k <= Math.ceil(EM.W / wd); k++) {
          D.mono(txt, off + k * wd - wd, y, SIZE, bright(r, 1) ? inkHot : inkCool,
            'left', a * (bright(r, 1) ? 1.6 : 1));
        }
      }
    } else if (mv === 2) {
      /* THE SLANT: it falls, but every column is also being pushed, and the push
         grows with depth — the whole wall leans like weather. */
      var C2 = 12;
      for (c = 0; c < C2; c++) {
        var sp2 = 20 + 34 * C.hash01(c, 841);
        var base2 = Math.floor(S.t * sp2 / LH);
        var frac2 = S.t * sp2 - base2 * LH;
        var bx = 26 + c * 132;
        for (r = -1; r < Math.ceil(EM.H / LH) + 2; r++) {
          var y2 = EM.H + LH - r * LH + frac2;
          var lean2 = C.sym(c, 843) * 90 * w.chaos * (1 - (EM.H - y2) / EM.H) +
                      Math.sin(S.t * 0.5 + c) * 26;
          D.mono(line(base2 + r, c), bx + lean2, y2, SIZE,
            bright(base2 + r, c) ? inkHot : inkCool, 'left', a * (bright(base2 + r, c) ? 1.6 : 1));
        }
      }
    } else if (mv === 3) {
      /* RISE: the same columns, entered from the floor and travelling up, with
         the drift reversed — the machine printing what it has already done. */
      var C3 = 9;
      for (c = 0; c < C3; c++) {
        var sp3 = 18 + 30 * C.hash01(c, 847);
        var base3 = Math.floor(S.t * sp3 / LH);
        var frac3 = S.t * sp3 - base3 * LH;
        var x3 = 60 + c * 176 + C.sym(c * 5, 823) * 34 * w.chaos;
        for (r = -1; r < Math.ceil(EM.H / LH) + 2; r++) {
          var y3 = -LH + r * LH - frac3;
          D.mono(line(base3 + r, c), x3, y3, SIZE,
            bright(base3 + r, c) ? inkHot : inkCool, 'left', a * (bright(base3 + r, c) ? 1.6 : 1));
        }
      }
    } else {
      /* RAIN: columns falling, each at its own speed, the whole wall drifting
         with the world's disorder. */
      var COLS = 10;
      for (c = 0; c < COLS; c++) {
        var speed = 15 + 26 * C.hash01(c, 811);
        var drift = C.sym(c * 3, 823) * 30 * w.chaos;
        var x = 40 + c * 158 + drift;
        var scrolled = S.t * speed;
        var base = Math.floor(scrolled / LH);
        var frac = scrolled - base * LH;
        for (r = -1; r < Math.ceil(EM.H / LH) + 2; r++) {
          var yx = EM.H + LH - r * LH + frac;
          D.mono(line(base + r, c), x, yx, SIZE,
            bright(base + r, c) ? inkHot : inkCool, 'left', a * (bright(base + r, c) ? 1.6 : 1));
        }
      }
    }

    /* ---- THE CHASSIS -------------------------------------------------------
       A screen full of code is still a texture. What the passage was missing was
       not more code but something for the code to be printed ON: a listing has
       strips, a gutter, rules that travel with the paper, and one rule that is
       where the machine is executing at this instant. The chassis is drawn AFTER
       the code, so the strips cut across it and the partition reads as structure
       rather than as tint. */
    var sx = 38, sy0 = 46, sy1 = EM.H - 48;
    var sa = a * 1.2;
    for (var q = 0; q <= 10; q++) {
      var vx = sx + q * 158 - 14;
      D.line(vx, sy0, vx, sy1, P.dim, 1, sa * 0.55);
    }
    D.line(sx - 14, sy0, EM.W - sx + 14, sy0, P.dim, 1, sa * 0.6);
    D.line(sx - 14, sy1, EM.W - sx + 14, sy1, P.dim, 1, sa * 0.6);
    /* the rules travel with the paper, and the gutter numbers travel with them */
    var pr = 156, ph = (S.t * 7) % pr, blk = Math.floor(S.t * 7 / pr);
    for (var g = -1; g <= 6; g++) {
      var gy = sy0 + g * pr + ph;
      if (gy < sy0 || gy > sy1) continue;
      D.line(sx - 14, gy, EM.W - sx + 14, gy, P.dim, 1, sa * 0.45);
      D.mono(C.pad(g + blk, 3), 8, gy + 4, SIZE, P.dim, 'left', sa * 0.75);
    }
    /* and the one rule that is not paper: where the program counter is */
    var pcy = sy0 + 40 + C.saw(S.t * 0.085) * (sy1 - sy0 - 80);
    D.line(20, pcy, EM.W - 20, pcy, P.pad, 1.4, sa);
    D.disc(24, pcy, 3.4, P.pad, sa);
    D.disc(EM.W - 24, pcy, 3.4, P.pad, sa);
  };

  /* --------------------------------------------------------------------------
     THE OPENING IS A CONVERSATION.

     The film used to open on an empty screen. It opens on an empty PAGE now, and
     the page fills up — because the first sixteen seconds of this song are not an
     atmosphere, they are somebody configuring a machine: "Switch on the power
     line", "Remember to put on", "Lay down your pieces", "Fill in my data
     parameters", "Set up our new world", "And let's begin the SIMULATION". And
     the machine answers with what it has done: PROTECTION, OBJECT CREATION,
     INITIALIZATION, SIMULATION.

     So the film shows the conversation AS a conversation: one page with two
     sides, the human's messages on the right and the machine's on the left,
     oldest at the top, drawn in the hand the rest of the machine is drawn in —
     routed rectangles, copper pads, monospace labels.

     WHERE THE WORDS COME FROM. Not from this file. The log IS the running order:
     every line whose cue is already OVER at the instant being drawn, in the order
     it was sung. So the page cannot say anything the song has not said yet, and
     the line being sung right now is deliberately NOT in it — that line is in the
     band, which is where this film speaks. A line lands in the page at the exact
     instant the next one begins, which is also the instant its own plate has
     finished fading, so no line and no word is ever on screen twice.

     WHICH SIDE IS WHO. Read off the text: the machine puts up its own words in
     CAPITALS (every plate that names something of its own is in capitals) and the
     human writes sentences. That is the whole rule, and on these eleven lines it
     alternates by itself.

     It comes up with the power and it goes when the world is built: the page is
     the thing being configured, so it cannot outlive the setup — the instrumental
     passage is the world already running. */
  var CHAT_END = 16.000;                 /* the interlude: the world running */

  function chatSide(text) {
    var s = (text || '').replace(/[^A-Za-z]/g, '');
    if (!s) return '';
    return s === s.toUpperCase() ? 'machine' : 'you';
  }

  /* the log, straight off the cue table: what has been said, oldest first, and
     the eleven the page has to hold (the parentheticals are the machine's own
     placeholders, not things anybody said) */
  function chatLog(t) {
    var cs = EM.Lyrics.cues, rows = [], total = 0;
    for (var i = 0; i < cs.length && cs[i].t < CHAT_END; i++) {
      if (cs[i].text.charAt(0) === '(') continue;
      total++;
      if (cs[i].end <= t) rows.push(cs[i]);
    }
    return { rows: rows, total: total };
  }

  /* One row: an avatar and a bubble. An avatar is a device, not a portrait — the
     human is a caret waiting in a cell (somebody is at the keyboard), the machine
     is one of its own sockets. The bubble is a routed rectangle with a pad for a
     tail. `flight` is the line being said RIGHT NOW: its words are in the band,
     so the page says only that something is arriving. */
  function chatRow(D, P, cue, X0, X1, y, a, flight, t) {
    var you = chatSide(cue.text) === 'you';
    var ink = you ? P.paper : P.trace;
    var ax = you ? X1 - 26 : X0 + 26;
    if (you) {
      D.rect(ax - 12, y + 1, 24, 24, ink, 1, a * 0.55);
      D.line(ax - 3, y + 7, ax - 3, y + 19, ink, 2, a * 0.8);
    } else {
      D.circle(ax, y + 13, 11, ink, 1.2, a * 0.55);
      D.pad(ax, y + 13, 6, ink, a * 0.75);
    }
    var bw = flight ? 64 : D.width(cue.text, 19) + 30;
    var bx = you ? ax - 16 - bw : ax + 16;
    if (flight) {
      D.rect(bx, y, bw, 28, ink, 1, a * 0.26);
      for (var d = 0; d < 3; d++) {
        var lit = Math.floor(t * 3) % 3 === d;
        D.disc(bx + 18 + d * 15, y + 14, lit ? 4.2 : 2.8, ink, a * (lit ? 0.9 : 0.26));
      }
    } else {
      D.rect(bx, y, bw, 28, ink, 1, a * 0.42);
      D.pad(you ? bx + bw : bx, y + 27, 4, ink, a * 0.5);
      if (you) D.text(cue.text, bx + 15, y + 20, 19, ink, 'left', a * 0.88);
      else D.mono(cue.text, bx + 15, y + 20, 18, ink, 'left', a * 0.88);
    }
  }

  EM.drawBootChat = function (D, S) {
    var t = S.t;
    if (t > CHAT_END + 0.62) return;
    var P = palette(S.world), w = S.world;
    /* it comes up with the power and it goes when the world is built */
    var a = C.smooth(C.clamp(t / 0.8, 0, 1)) *
            (1 - C.smooth(C.clamp((t - (CHAT_END - 0.06)) / 0.60, 0, 1)));
    if (a < 0.02) return;

    /* the page: the register panel's own width off her side, the note rail's
       ceiling below. Nothing scrolls — the opening's eleven lines fit on one
       page, which is the only reason the film can honestly show all of it. */
    var X0 = 360, X1 = 1300, Y0 = 84, Y1 = 660, RH = 42, TOP = Y0 + 56;
    var log = chatLog(t);
    D.rect(X0, Y0, X1 - X0, Y1 - Y0, P.dim, 1.2, a * 0.7);
    D.pad(X0, Y0, 7, P.dim, a * 0.8);
    D.pad(X1, Y0, 7, P.dim, a * 0.8);
    D.pad(X0, Y1, 7, P.dim, a * 0.8);
    D.pad(X1, Y1, 7, P.dim, a * 0.8);
    D.line(X0, Y0 + 38, X1, Y0 + 38, P.dim, 1, a * 0.5);
    D.mono('> you', X0 + 16, Y0 + 25, 14, P.paper, 'left', a * 0.75);
    D.mono('world.execute(me);', X0 + 92, Y0 + 25, 14, P.trace, 'left', a * 0.7);
    var cnt = 'messages ' + log.rows.length + ' / ' + log.total;
    D.mono(cnt, X1 - 16, Y0 + 25, 13, P.silk, 'right', a * 0.8);
    D.disc(X1 - 26 - D.width(cnt, 13), Y0 + 21, 3 + 3 * w.breath, P.trace,
      a * (0.3 + 0.7 * w.breath));

    /* The rows are anchored to the BOTTOM of the page, the way a conversation
       is: the newest thing said is the lowest thing on the page. Eleven rows fit
       and nothing ever scrolls off, so the page always holds the whole exchange —
       and when a line lands, everything above it slides up one row.

       The slide is continuous by construction: a row's base is one row LOWER the
       instant before a landing than the instant after, so drawing every row one
       row down and easing it up makes the frame at the landing identical to the
       frame just before it. The new row comes in from under the page and is
       clipped by it, which is what a page does with an arrival. */
    var cue = S.cue;
    var live = (cue && !cue.held && cue.text.charAt(0) !== '(' &&
                t >= cue.t && t <= cue.end) ? cue : null;
    var items = live ? log.rows.concat([live]) : log.rows.slice();
    /* the last thing that happened on the page: a line ending, or one starting */
    var tau = 0;
    for (var q = 0; q < log.rows.length; q++) tau = Math.max(tau, log.rows[q].end);
    if (live) tau = Math.max(tau, live.t);
    var rise = RH * (1 - C.smooth(C.clamp((t - tau) / 0.4, 0, 1)));
    var c = D.ctx;
    c.save();
    c.beginPath();
    c.rect(X0 + 2, Y0 + 40, X1 - X0 - 4, Y1 - Y0 - 42);
    c.clip();
    for (var i = 0; i < items.length; i++) {
      var slot = log.total - items.length + i;
      if (slot < 0) continue;
      chatRow(D, P, items[i], X0, X1, TOP + slot * RH + rise, a, items[i] === live, t);
    }
    c.restore();
  };

  /* --------------------------------------------------------------------------
     THE BOARD BECOMES THE THING.

     "If I'm an eggplant … If I'm a tomato … If I'm a tabby cat … If I'm the only
     god": four offers, and each one names a THING. A panel of numbers cannot
     answer a line like that — the machine would be changing the subject, which
     is the mistake this whole layer exists to stop.

     So the machine draws the thing WITH ITS OWN BOARD. The lattice of 21 x 13
     pads IS this machine's resolution: a shape is a pattern of pads, and the
     board lights the ones that fall inside it. Nothing is pasted over the
     picture — the substrate becomes the animal, which is the only kind of
     picture this film is allowed to make, and rule 3 survives: a shape made of
     pads has no curves, and in this film a curve means something has left the
     layout.

       #  a lit pad      -  a pad holding back (the tabby's stripes)      .  out

     The panel is a SECOND, FINER lattice bolted to the board (26 px cells against
     the board's own 76 x 55): the board's pitch cannot draw a cat's ears with,
     and a shape nobody can read is not a shape. Same language — little copper
     pads with bright rims — one order of magnitude more resolution, which is
     what a machine that wants to show you a picture would actually do.

     And the metal is not the board's. An offer is spoken by a borrowed face, the
     faces carry their own colour (p.rgb — the same number the portrait is tinted
     with and the same one the frame blooms with while the line is up), and that
     is what the panel is drawn in: deepseek's blue eggplant, doubao's pink cat,
     GLM's teal god. The tomato comes out in the eggplant's blue because one face
     offers both — but nothing comes out gold merely because everything else is.
     Only the outline and the tabby's stripes take the metal; the middle stays the
     board's own dim copper, so the thing still stands on the board it is made of.

     The shape ASSEMBLES from the ground up over the line that names it, then
     stands for the rest of the offer — "then I will give you my nutrients" keeps
     the eggplant standing — and it acts out the verb of the second half: a thing
     that GIVES streams what it has off to the right, and a cat that PURRS shakes
     at 25 Hz, which is the frequency the purr plate measures. */
  var SHAPES = {
    eggplant: [
      '........###.........',
      '.......#####........',
      '.......#####........',
      '......#######.......',
      '.....#########......',
      '.....#########......',
      '.....#########......',
      '.....#########......',
      '......#######.......',
      '......#######.......',
      '.......#####........',
      '........###.........',
      '.........#..........',
      '....................'
    ],
    tomato: [
      '.........#..........',
      '......#..#..#.......',
      '.....#########......',
      '....###########.....',
      '...#############....',
      '...#############....',
      '...#############....',
      '....###########.....',
      '.....#########......',
      '.......#####........',
      '....................',
      '....................',
      '....................',
      '....................'
    ],
    cat: [
      '...#............#...',
      '..###........###....',
      '..#####....#####....',
      '..################..',
      '..##--######--##....',
      '...##############...',
      '....##########......',
      '....##########......',
      '...############.....',
      '...#############....',
      '..###############...',
      '..###############...',
      '.#################..',
      '.#################..'
    ],
    god: [
      '......#######.......',
      '....##.......##.....',
      '...#...........#....',
      '...#...........#....',
      '....##.......##.....',
      '......#######.......',
      '.......#####........',
      '....#########.......',
      '...###########......',
      '..#############.....',
      '..#############.....',
      '.###############....',
      '.###############....',
      '#################...'
    ]
  };
  function shapeNamedBy(text) {
    if (!text) return null;
    if (/eggplant/i.test(text)) return 'eggplant';
    if (/tomato/i.test(text)) return 'tomato';
    if (/tabby cat|purr/i.test(text)) return 'cat';
    if (/only god|proof of/i.test(text)) return 'god';
    return null;
  }
  /* The shape belongs to the whole OFFER, not to one line: the noun is named on
     the first line of a group of three, and the group is what the thing has to
     live through. So the anchor is the FIRST line of that group: take the newest
     line that names the thing, then walk back past every line that names the same
     thing again — the second line of an offer always names it a second time
     ("then I will purr for your …", "then you're the proof of my …"). Without
     that walk the cat is built twice: once for the line that asks and again for
     the line that answers, so at the instant the film measures its purring the
     cat still has no head. All of it is read off the cue table, never off a list
     of lines somebody wrote down. */
  function offerShape(S) {
    var cs = EM.Lyrics.cues, nm = null, j = -1;
    for (var k = 0; k <= 3 && S.index - k >= 0; k++) {
      var nm2 = shapeNamedBy(cs[S.index - k].text);
      if (nm2) { nm = nm2; j = S.index - k; break; }
    }
    if (j < 0) return null;
    while (j > 0 && shapeNamedBy(cs[j - 1].text) === nm) j--;
    var last = cs[Math.min(cs.length - 1, j + 2)];
    return { name: nm, cue: cs[j], end: last ? last.end : cs[j].end };
  }

  /* THE METAL COMES OFF THE FACE THAT IS TALKING. Every offer is spoken by one
     borrowed face, and every face carries its own colour — the same number the
     portrait canvas is tinted with. So the panel is not drawn in the board's
     copper: it is drawn in the colour of whoever is making the offer. Nothing
     here is a new palette and nothing is chosen by hand; if the cue table says
     the face sang it, that is the colour it comes out. */
  function offerInk(cue, fallback) {
    var id = cue && cue.persona, all = EM.PERSONAS || [];
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i].rgb;
    return fallback;
  }
  function boardShape(D, S, P, name, src, end) {
    var rows = SHAPES[name];
    if (!rows) return;
    var text = S.text || '';
    var purr = /purr/i.test(text);
    var give = !purr && /^then/i.test(text);
    /* The shape lives for the whole OFFER (three lines), not for one cue: keyed
       to the cue it would fade out and pop back at every line boundary, which is
       the flicker the first version had. */
    var d = C.smooth(C.clamp((S.t - src.t) / 0.50, 0, 1)) *
            C.smooth(C.clamp((end - S.t) / 0.50, 0, 1));
    if (d < 0.02) return;
    var a = (0.34 * S.world.breath + 0.44) * d;
    var ink = offerInk(src, P.pad);
    var mark = C.mix(ink, P.paper, 0.55);      /* the tabby's stripes: same metal, lighter */
    var total = 0, r, c;
    for (r = 0; r < rows.length; r++) {
      for (c = 0; c < rows[r].length; c++) if (rows[r][c] !== '.') total++;
    }
    var pg = C.clamp((S.t - src.t) / Math.max(0.4, (src.end - src.t) * 1.35), 0, 1);
    var CELL = 26, X0 = 980, Y0 = 212, W = rows[0].length * CELL, H = rows.length * CELL;
    D.rect(X0 - 14, Y0 - 14, W + 28, H + 28, P.dim, 1, a * 0.55);
    D.mono(name, X0 - 14, Y0 - 22, 13, P.silk, 'left', a * 0.85);
    var n = 0;
    for (r = rows.length - 1; r >= 0; r--) {            /* from the ground up */
      for (c = 0; c < rows[r].length; c++) {
        var ch = rows[r][c];
        if (ch === '.') continue;
        n++;
        var k = C.clamp(pg * total - n + 1.4, 0, 1);
        if (k <= 0) continue;
        var x = X0 + c * CELL + CELL / 2, y = Y0 + r * CELL + CELL / 2;
        if (purr) x += C.sym(r * 7 + Math.floor(S.t * 25), 733) * 2.6;
        /* WHAT IS DRAWN IS THE OUTLINE. A filled silhouette at this size is a
           blob: the pads merge and the eye is left with a rounded rectangle. The
           contour of the thing — the pads with an empty neighbour — reads as the
           thing itself, keeps the middle of the frame clear for her and for the
           plate, and is what a board would actually route. The interior is kept
           as a dim texture so the shape still reads as a body, and the tabby's
           stripes are the only bright pads that are not on the contour. */
        var edge = ch !== '-' && (r === 0 || r === rows.length - 1 ||
          c === 0 || c === rows[r].length - 1 ||
          rows[r][c - 1] === '.' || rows[r][c + 1] === '.' ||
          rows[r - 1][c] === '.' || rows[r + 1][c] === '.');
        var lit = ch === '-' ? 0.78 : (edge ? 1 : 0.24);
        var aa = a * lit * (0.42 + 0.58 * C.smooth(k));
        if (lit < 0.4) { D.disc(x, y, 6 + 5 * k, P.pad, aa * 0.95); continue; }
        D.pad(x, y, 21 + 5 * k, lit > 0.9 ? ink : mark, aa);
        if (k < 1) D.disc(x, y, 6 + 8 * (1 - k), P.paper, aa * (1 - k) * 0.8);
        if (give) {
          /* the thing gives itself away: what it has leaves to the right, one
             pulse per pad, phased by the pad's own column */
          var ph = C.saw(S.t * 0.9 + c * 0.08);
          D.line(x + 8, y, x + 8 + 26 * ph, y, P.pad, 1.2, aa * 0.75);
        }
      }
    }
  }

  /* --------------------------------------------------------------------------
     THE ABSENCE, READ OUT.

     From 117.27 (ISOLATION) to 125.71 the song has eight lines and NOT ONE of
     them borrows a face: the machine is talking with nobody's face on, and that
     is why the shot looks empty. So the emptiness is not filled in here — it is
     MEASURED, which is what this film does with everything else: an empty window
     where she would have been standing, and the two numbers that say why it is
     empty, in the same breath as `JOINTS 611 / 615` and `LOVE —— no test exists`.

     And on the lines that say "If I can …", the POINTLESS FRAGMENTS are shown as
     what they are in this film's own bookkeeping: the 34 lines that get sung more
     than once (repeat > 0 in the running order, counted here, never written
     down). They are bracketed, they are counted, and the key that would delete
     them is NEVER PRESSED — the song says "if I can", so nothing may happen. The
     shot has to stay a question. */
  var ABS = null;
  function absenceCounts() {
    if (ABS) return ABS;
    var cs = EM.Lyrics.cues, faces = 0, frags = [], i, j;
    for (var i = 0; i < cs.length; i++) {
      if (cs[i].persona) faces++;
    }
    /* THE POINTLESS FRAGMENTS are the notes the song never puts a word on: 615
       onsets, 131 lines — everything else is what "if I can erase all the
       pointless fragments" is about. */
    var ons = EM.ONSETS || [];
    for (i = 0; i < ons.length; i++) {
      var near = false;
      for (j = 0; j < cs.length; j++) {
        if (Math.abs(cs[j].t - ons[i][0] / 1000) < 0.09) { near = true; break; }
      }
      if (!near) frags.push(ons[i]);
    }
    ABS = { faces: faces, frags: frags, lines: cs.length };
    return ABS;
  }

  /* --------------------------------------------------------------------------
     TRAPPED, TURNING.

     "Though we are trapped / We are trapped ah": the word is the cell, so it is
     put in the MIDDLE of the frame and turned — and neither its rate nor its size
     is the clock's own: BOTH ARE THE PERFORMANCE'S. The angle is the number of
     notes played so far times a fixed angle per note, plus the phase inside the
     note being played, so it spins up where the music is dense and nearly stops
     where it thins, and it keeps turning between the two lines instead of
     restarting. The size is struck by each note and decays with the pulse, so the
     cell breathes with the song. It is all still a pure function of t.

     The square around it does not turn. The plate underneath is still drawing the
     diagram of the trap; this is the trap itself, and the readout says what the
     spin is made of. */
  EM.drawTrapped = function (D, S) {
    var text = S.text || '';
    if (!/trapped/i.test(text) || !S.cue) return;
    var P = palette(S.world);
    var d = C.smooth(C.clamp((S.t - S.cue.t) / 0.55, 0, 1)) *
            C.smooth(C.clamp((S.cue.end - S.t) / 0.55, 0, 1));
    if (d < 0.02) return;
    var a = (0.50 * S.world.breath + 0.38) * d;
    var cx = EM.W / 2, cy = EM.H / 2 - 10;
    var c = D.ctx;
    D.rect(cx - 134, cy - 134, 268, 268, P.dim, 1, a * 0.5);
    c.save();
    c.translate(cx, cy);
    var notes = S.K.countFrom(0, S.t), ph = S.K.notePhase(S.t);
    var strike = S.beatPulse;
    var size = 34 + 26 * strike + 12 * (S.velocity / 127);
    c.rotate(notes * 0.36 + ph * 1.15);
    D.mono('TRAPPED', 0, size * 0.34, size, P.alarm, 'center', a * (0.55 + 0.45 * strike));
    c.restore();
    D.mono(Math.round(notes) + ' notes   ' + (0.36 * 57.29578).toFixed(0) +
      '° per note   phase ' + ph.toFixed(2), cx, cy + 162, 13, P.silk, 'center', a * 0.8);
    D.mono('the cell does not turn', cx, cy + 184, 12, P.dim, 'center', a * 0.7);
  };

  EM.drawAbsence = function (D, S) {
    var t = S.t, text = S.text || '';
    var asking = /^if i can/i.test(text);
    if (S.act !== 'ab' && !asking) return;
    var P = palette(S.world), a = 0.42 * S.world.breath + 0.24;
    var cnt = absenceCounts();
    var cx = EM.W / 2, cy = EM.H / 2 - 10;

    /* the window she would have been standing in: the frame is still there */
    var bw = 258, bh = 340;
    D.rect(cx - bw / 2, cy - bh / 2, bw, bh, P.dim, 1, a * 0.5);
    D.mono('nobody is wearing this one', cx - bw / 2 + 10, cy - bh / 2 + 20, 12,
      P.dim, 'left', a * 0.8);
    D.mono('worn now           ' + (S.persona ? 1 : 0) + ' / 9',
      cx - bw / 2, cy + bh / 2 + 26, 13, P.silk, 'left', a * 0.85);
    D.mono('lines with a face  ' + cnt.faces + ' / ' + cnt.lines,
      cx - bw / 2, cy + bh / 2 + 48, 13, P.silk, 'left', a * 0.85);

    if (!asking) return;
    /* They are laid out by their own two readings — when they were played and
       how high — so the field of them IS the part of the performance that
       carries no words. They come in with the sentence's own progress, so by
       "…the pointless fragments" the frame is nothing else; on "Then maybe"
       they are gone, because the condition was never met. */
    var prog = C.smooth(C.clamp((t - S.cue.t) / Math.max(0.4, S.cue.dur * 0.86), 0, 1));
    var show = Math.round(cnt.frags.length * prog);
    var lo = EM.MIDI.pitchLo, span = Math.max(1, EM.MIDI.pitchHi - lo);
    for (var i = 0; i < show; i++) {
      var o1 = cnt.frags[i];
      var fx = 80 + (o1[0] / 1000 / EM.AUDIO_END) * (EM.W - 160);
      var fy = 116 + (1 - (o1[1] - lo) / span) * (EM.H - 300);
      var w2 = 9 + 8 * C.hash01(i, 1721), h2 = 6 + 6 * C.hash01(i, 1723);
      D.rect(fx, fy, w2, h2, C.mix(P.trace, P.alarm, C.hash01(i, 1727) * 0.5), 1, a * 0.8);
    }
    D.mono('fragments  ' + show + ' / ' + cnt.frags.length + '  selected',
      cx, EM.H - 218, 13, P.trace, 'center', a * 0.9);
    /* the key: it blinks, and it does not go down */
    var kx = cx + 250, ky = EM.H - 266, lit = (t * 2 % 1) < 0.5;
    D.rect(kx - 32, ky - 15, 64, 30, P.alarm, 1.2, a * (lit ? 0.9 : 0.3));
    D.mono('DELETE', kx, ky + 5, 13, P.alarm, 'center', a * (lit ? 0.9 : 0.3));
    D.mono('not pressed', kx, ky + 32, 12, P.silk, 'center', a * 0.8);
  };

  EM.drawLyricImage = function (D, S) {
    var text = S.text || '';
    if (!text || !S.cue) return;
    var P = palette(S.world), w = S.world;
    var cx = EM.W / 2, cy = EM.H / 2 - 10;
    /* in and out with the line, so nothing switches on */
    var d = C.smooth(C.clamp((S.t - S.cue.t) / 0.55, 0, 1)) *
            C.smooth(C.clamp((S.cue.end - S.t) / 0.55, 0, 1));
    if (d < 0.02) return;
    var a = (0.40 * w.breath + 0.16) * d;

    /* the thing the line names, drawn with the board itself (see SHAPES) */
    var offer = offerShape(S);
    if (offer) boardShape(D, S, P, offer.name, offer.cue, offer.end);

    if (/remember to put on/i.test(text)) {
      /* the protection comes DOWN over the board: a sheet with a leading edge
         and a stitch line, measured as it travels */
      var edge = 90 + C.saw(S.t / 8.5) * (EM.H - 210);
      D.fillRect(60, 70, EM.W - 120, Math.max(0, edge - 70), P.paper, 0.045);
      D.line(60, edge, EM.W - 60, edge, P.paper, 2.2, a);
      for (var i = 0; i <= 16; i++) {
        var sx = 60 + i * (EM.W - 120) / 16;
        D.line(sx, edge, sx, edge + 20, P.silk, 1, a * 0.5);
      }
      D.span(60, EM.W - 60, edge + 34, P.dim, a * 0.5, 'covered');

    } else if (/lay down your pieces/i.test(text)) {
      /* pieces falling into the slots that are waiting for them */
      var slotY = EM.H - 250, n = 9, step = (EM.W - 260) / (n - 1);
      for (var q = 0; q < n; q++) {
        var sx2 = 130 + q * step;
        D.rect(sx2 - 13, slotY, 26, 26, P.dim, 1, a * 0.5);
        var k = C.saw(S.t * 0.55 + q * 0.17);
        var py = C.lerp(90, slotY, C.smooth(C.clamp(k / 0.82, 0, 1)));
        D.rect(sx2 - 13, py, 26, 26, P.trace, 1.4, a * (0.35 + 0.65 * (1 - k)));
        if (k > 0.82) D.line(sx2 - 17, slotY + 32, sx2 + 17, slotY + 32, P.pad, 1.6, a);
      }

    } else if (/set up our new world/i.test(text)) {
      /* a world being assembled: the equator first, then one meridian at a time */
      var R = 200, merid = 7;
      D.circle(cx, cy, R, P.trace, 1.4, a * 0.85);
      for (var m = 0; m < merid; m++) {
        var kk = C.clamp((S.t - S.cue.t) / Math.max(0.4, S.dur * 0.6) * merid - m, 0, 1);
        if (kk <= 0) continue;
        var ph = (m - (merid - 1) / 2) / ((merid - 1) / 2);
        var half = Math.sqrt(Math.max(0.0001, 1 - ph * ph));
        var pts = [];
        for (var v = 0; v <= 40; v++) {
          var th = v / 40 * TAU;
          pts.push([cx + Math.sin(th) * R * half, cy - Math.cos(th) * R]);
        }
        D.poly(pts, P.trace, 1.1, a * 0.7 * kk);
      }
      /* the latitudes of a sphere seen from the equator are straight lines */
      for (var par = -2; par <= 2; par++) {
        D.line(cx - R, cy + par * R * 0.42, cx + R, cy + par * R * 0.42, P.trace, 1, a * 0.32);
      }

    } else if (/to a\.?d\.?,? to b\.?c\.?/i.test(text)) {
      /* a tape of measured time with the origin in the middle, and a marker that
         runs one way and then the other — the only clock the machine owns is the
         film's, so the tape is ruled in real seconds */
      var ty = EM.H - 210, xa = 200, xb = EM.W - 200, mid = (xa + xb) / 2;
      D.line(xa, ty, xb, ty, P.dim, 1, a * 0.7);
      for (var k2 = 0; k2 <= 30; k2++) {
        var xx = xa + (xb - xa) * k2 / 30;
        D.line(xx, ty, xx, ty + (k2 % 5 ? 5 : 12), P.dim, 1, a * 0.5);
      }
      D.line(mid, ty - 34, mid, ty + 34, P.paper, 1.8, a);
      var sw = Math.sin(S.t * 0.85);
      var mx = mid + sw * (xb - mid) * 0.94;
      D.disc(mx, ty, 5, P.pad, a);
      D.line(mx, ty - 18, mx, ty + 18, P.pad, 1.2, a * 0.85);
      D.mono('B.C.', xa, ty + 40, 12, sw < 0 ? P.pad : P.dim, 'left', a);
      D.mono('A.D.', xb, ty + 40, 12, sw > 0 ? P.pad : P.dim, 'right', a);
      D.mono('0', mid, ty + 40, 12, P.paper, 'center', a * 0.9);

    } else if (/so deeply/i.test(text)) {
      /* a sounding line: rings falling away into the depth, and the weight on
         the line is where the note left it */
      var dep = 250;
      for (var r2 = 0; r2 < 9; r2++) {
        var k3 = (S.t * 0.34 + r2 / 9) % 1;
        D.circle(cx, cy - 30 + k3 * dep, 250 * (1 - k3 * 0.88), P.trace, 1.2,
          a * (0.18 + 0.7 * (1 - k3)));
      }
      var drop = C.saw(S.t * 0.34);
      D.line(cx, 90, cx, cy - 30 + drop * dep, P.silk, 1, a * 0.6);
      D.disc(cx, cy - 30 + drop * dep, 6, P.pad, a * 0.95);

    } else if (/blind my vision/i.test(text)) {
      /* the aperture closes on her, which is what losing a picture looks like */
      var kb = C.smooth(C.clamp((S.t - S.cue.t) / Math.max(0.6, S.dur * 0.85), 0, 1));
      var hx = C.lerp(0.62, 0.13, kb) * EM.W / 2, hy = C.lerp(0.62, 0.13, kb) * EM.H / 2;
      D.fillRect(0, 0, EM.W, cy - hy, P.bg, 0.88);
      D.fillRect(0, cy + hy, EM.W, EM.H - (cy + hy), P.bg, 0.88);
      D.fillRect(0, cy - hy, cx - hx, hy * 2, P.bg, 0.88);
      D.fillRect(cx + hx, cy - hy, EM.W - cx - hx, hy * 2, P.bg, 0.88);
      for (var lf = 0; lf < 10; lf++) {
        var an = lf / 10 * TAU + S.t * 0.12;
        D.line(cx + Math.cos(an) * (hx + 54), cy + Math.sin(an) * (hy + 54),
               cx + Math.cos(an) * hx, cy + Math.sin(an) * hy, P.dim, 1, a * 0.6);
      }

    } else if (/the proof of/i.test(text)) {
      /* the proof is the marks: one tick per note played to it, weighted by that
         note and placed by its pitch. It grows through the shot, so the claim
         and the evidence are the same fact. It sits below the register panel,
         which is where the plate's own column of numbers is not. */
      var hits = S.K.notesBetween(0, S.t);
      var lo = EM.MIDI.pitchLo, span = Math.max(1, EM.MIDI.pitchHi - lo);
      for (var h2 = 0; h2 < hits.length && h2 < 460; h2++) {
        var col = h2 % 46, row = Math.floor(h2 / 46);
        var px = 150 + col * 15, py2 = 566 + row * 16;
        var u = (hits[h2].pitch - lo) / span;
        D.line(px, py2, px, py2 - 5 - 9 * (hits[h2].vel / 127) * (0.5 + 0.5 * u),
          C.mix(P.trace, P.pad, u), 1.6, a * 0.9);
      }

    } else if (/can enter/i.test(text)) {
      /* the curve winds INWARD and closes on a point: entering, not orbiting */
      var pts2 = [];
      for (var i2 = 0; i2 <= 300; i2++) {
        var u2 = i2 / 300;
        var th2 = u2 * TAU * 3.4 + S.t * 0.45;
        var rr = 320 * Math.pow(1 - u2, 1.3);
        pts2.push([cx + Math.cos(th2) * rr, cy + Math.sin(th2) * rr * 0.84]);
      }
      D.poly(pts2, P.trace, 1.5, a * 0.9);
      D.disc(cx, cy, 4 + 8 * S.beatPulse, P.love, a);
      D.line(cx - 26, cy, cx + 26, cy, P.love, 1, a * 0.5);
      D.line(cx, cy - 26, cx, cy + 26, P.love, 1, a * 0.5);
    }
  };
  /* --------------------------------------------------------------------------
     THE LYRIC BAND.

     First discipline: a line of lyrics appears ONCE in the picture. If the
     plate already has that word as its subject — the big-word plates, the
     hand-drawn one, the countdown — the band withdraws and leaves only its
     progress line. Two copies of the same sentence in one frame weaken each
     other, and this is the rule that gets broken first when a film is busy.

     Second: the band is a terminal, not a subtitle. Monospace, brackets, a
     caret, and the same one-character-per-note typewriter as the rest of the
     film, so the character you are hearing is the character being struck.

     Third: the progress line is drawn even when the text is withheld, because
     the progress line is the only part that can never be a lie.
     ------------------------------------------------------------------------- */
  EM.drawLyric = function (D, S) {
    var P = palette(S.world);
    var text = S.text || '';
    var a = 0.82 * S.world.breath + 0.18;
    var cx = EM.W / 2, y = EM.H - 130, wd = 460;

    /* the progress line */
    D.line(cx - wd / 2, y + 16, cx + wd / 2, y + 16, P.dim, 1, 0.30 * a);
    D.line(cx - wd / 2, y + 16, cx - wd / 2 + wd * S.line, P.trace, 1.8, 0.95 * a);
    for (var k = 0; k <= 10; k++) {
      var tx = cx - wd / 2 + wd * k / 10;
      D.line(tx, y + 16, tx, y + 16 + (k % 5 ? 4 : 8), P.dim, 1, 0.35 * a);
    }

    /* the record: what has already been sung, fading off to the left. It is the
       same thing as the solder on the board, written instead of burned. */
    var prev = EM.Lyrics.cues, shownN = 0;
    for (var i = S.index - 1; i >= 0 && shownN < 7; i--) {
      var c0 = prev[i];
      if (!c0 || !c0.text || c0.held) continue;
      var age = (S.t - c0.end) / 26;
      if (age > 1) break;
      shownN++;
      D.mono(c0.text.toUpperCase(), 62, EM.H - 300 + shownN * 22, 10,
        P.dim, 'left', 0.30 * a * (1 - age) * (1 - shownN / 9));
    }

    if (EM.subjectScene && EM.subjectScene[S.scene]) return;   /* it is already the picture */
    if (!text) return;
    var shown = EM.MO.typedByNotes(text, S.t, S.cue.t, S.p);
    var loud = /[A-Z]/.test(text) && text === text.toUpperCase();
    var size = loud ? 28 : 21;
    var col = loud ? P.pad : P.trace;
    var line = '[  ' + shown + '  ]';
    D.mono(line, cx, y - 4, size, col, 'center', a);
    EM.MO.caret(D, line, cx - D.width(line, size) / 2, y - 4, size, col, a, S.t);
  };
  /* --------------------------------------------------------------------------
     THE FRAME.

     Drawn by the engine, OUTSIDE the beat warp, so it is the one thing in the
     picture that is always straight. Geometric border, corner brackets, edge
     rulers, and a terminal strip — the film is a program running, so it is
     always shown inside the frame a program runs in.
     ------------------------------------------------------------------------- */
  EM.drawFrame = function (D, S) {
    var P = palette(S.world), w = S.world;
    var a = (0.22 + 0.30 * (1 - w.chaos)) * w.breath + 0.10;
    var m = 26, bw = EM.W - m * 2, bh = EM.H - m * 2;
    D.rect(m, m, bw, bh, P.silk, 1, a * 0.55);
    var L = 44;
    var corners = [[m, m, 1, 1], [EM.W - m, m, -1, 1], [m, EM.H - m, 1, -1], [EM.W - m, EM.H - m, -1, -1]];
    for (var i = 0; i < 4; i++) {
      var c0 = corners[i];
      D.line(c0[0], c0[1], c0[0] + c0[2] * L, c0[1], P.silk, 2, a);
      D.line(c0[0], c0[1], c0[0], c0[1] + c0[3] * L, P.silk, 2, a);
    }
    /* edge rulers: real seconds, so the border measures the film */
    for (var k = 0; k <= 20; k++) {
      var x = m + bw * k / 20, len = k % 5 ? 5 : 12;
      D.line(x, m, x, m + len, P.dim, 1, a * 0.6);
      D.line(x, EM.H - m, x, EM.H - m - len, P.dim, 1, a * 0.6);
    }
    for (k = 0; k <= 12; k++) {
      var y = m + bh * k / 12, len2 = k % 3 ? 5 : 12;
      D.line(m, y, m + len2, y, P.dim, 1, a * 0.5);
      D.line(EM.W - m, y, EM.W - m - len2, y, P.dim, 1, a * 0.5);
    }
    /* terminal strip */
    var px = EM.W / 2 - 300, py = EM.H - 58;
    var pct = Math.round(S.line * 100);
    var line = '> ' + (S.scene || 'idle') + '  --line ' + pct + '%  --beat ' +
      (S.beat + 1) + '/' + S.K.count + '  --' + (S.persona ? 'wearing ' + S.persona : 'bare');
    D.mono(line, px, py, 12, P.trace, 'left', 0.72);
    if (Math.floor(S.t * 2.5) % 2 === 0) D.fillRect(px + D.width(line, 12) + 6, py - 11, 8, 13, P.trace, 0.8);
    D.mono(S.act ? 'ACT ' + S.act.toUpperCase() : '', EM.W / 2, 52, 11, P.silk, 'center', a * 0.9);
  };
  EM.personaCueIndex = personaCueIndex;
  EM.personaPresence = personaPresence;
  EM.personaPresenceAt = personaPresenceAt;
  EM.palette = palette;
  EM.padX = padX; EM.padY = padY; EM.frontX = frontX;
  EM.remainingJoints = remainingJoints;
  EM.shelfPos = shelfPos;
  EM.personaStateAt = function (id, t) {
    var P = personaOf(id);
    if (!P) return null;
    return chipState(P, EM.state(t), EM.PERSONAS.indexOf(P));
  };

  /* ---- what the machine writes on the board it has deleted -----------------
     Every joint recorded AFTER the delete cursor had passed its pad is still on
     the board, because it was written into clean ground — and once the cleanup
     line has gone, those marks are the board's only content. They are drawn from
     OUTSIDE the cut (render calls this once the erase covers the stage), so the
     film's last seconds are not a blank screen: they are a machine starting over
     on nothing. */
  EM.drawFreshJoints = function (D, S) {
    var w = S.world, P = palette(w), br = w.breath;
    var J = joints();
    for (var j = 0; j < J.length; j++) {
      var J1 = J[j];
      if (!J1.afterFront || J1.t > S.t) continue;
      var heat = Math.exp(-(S.t - J1.t) / 6.5);
      var r = 2.4 + 3.0 * (J1.vel / 127) + 1.1 * (J1.voices - 1);
      D.ball(J1.x, J1.y, r, heat * (0.35 + 0.65 * br), P.pad);
    }
  };

  /* the world layer as one call, so a replay can invoke it too */
  EM.drawWorldLayer = function (D, t) {
    var S = EM.state(t);
    drawBoard(D, S);
    drawShelf(D, S);
    return S;
  };
  EM.drawWorn = drawWorn;
  EM.drawRegisters = drawRegisters;
  EM.drawReplay = drawReplay;
  EM.GAIN = GAIN;
})(window.EM = window.EM || {});

