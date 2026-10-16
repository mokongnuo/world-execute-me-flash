/* ============================================================================
   src/35_motifs.js — the shared vocabulary.

   Every plate in the film is built from these. They obey two rules:

     1. A curve is an event. Wires are routed orthogonally with 45-degree
        bevels; when something curves it is because the machine has left its
        own layout — a wave, a growth, a tangle, a hand.
     2. Every number is real. If a motif prints a value it comes from the
        performance, the clock or the world; there are no decorative readouts,
        because those teach the viewer not to read.
   ========================================================================== */
(function (EM) {
  'use strict';
  var C = EM.C, TAU = EM.TAU;
  var M = {};

  function pal(S) { return EM.palette(S.world); }

  /* ---------- shared chrome -------------------------------------------------
     A hairline frame, the cue's own text set small and exactly right, and the
     real clock. Plates stay recognisable as one film because of this. */
  function chrome(D, S, o) {
    o = o || {};
    var P = pal(S), a = 0.42 * S.world.breath + 0.18;
    D.line(48, 44, 48 + 62, 44, P.silk, 1, a);
    D.line(48, 44, 48, 44 + 62, P.silk, 1, a);
    D.line(EM.W - 48, 44, EM.W - 110, 44, P.silk, 1, a);
    D.line(EM.W - 48, 44, EM.W - 48, 106, P.silk, 1, a);
    D.line(48, EM.H - 40, 110, EM.H - 40, P.silk, 1, a);
    D.line(EM.W - 48, EM.H - 40, EM.W - 110, EM.H - 40, P.silk, 1, a);
    /* The note rail is NOT drawn here. It used to be, which put a piece of the
       film's skeleton inside the beat warp and inside the camera — so the one
       strip that is supposed to be a fixed instrument was the one that moved
       most. The engine draws it now, outside both. */
    /* The register bank is NOT drawn here. The plate runs inside the beat
       warp, so a second copy from inside would sit a few pixels off the
       engine's unwarped one and the whole panel would ghost on every note.
       The engine draws it once, outside the warp. */
    // The lyric band owns subtitles; duplicated terminal captions are debug-only.
    if (o.noWord || !EM.debugView) return;
    var word = o.w || S.text;
    if (!word) return;
    /* ENTRANCE: typed, with a caret, and slid in from the side it belongs to */
    var shown = EM.MO.typedByNotes(word.toUpperCase(), S.t, S.cue.t, S.p);
    var sx = EM.MO.slide(S.p, 26, 0.24);
    D.mono(shown, EM.W / 2 + sx, EM.H - 34, 13, P.silk, 'center', 0.62);
    EM.MO.caret(D, shown, EM.W / 2 + sx - D.width(shown, 13) / 2, EM.H - 34, 13, P.silk, 0.5, S.t);
  }

  /* which instrument the rail is, per act */
  var RAIL = { boot: 'ticks', th: 'dots', cd: 'bars', fl: 'spikes',
               ab: 'dots', xs: 'bars', lv: 'spikes' };

  function noteRail(D, S, mode) {
    var P = pal(S);
    var x0 = 252, x1 = EM.W - 252, y = EM.H - 96, wd = x1 - x0;
    var hits = S.K.notesBetween(S.t - 6.0, S.t);
    if (!hits.length) return;
    var lo = EM.MIDI.pitchLo, hi = EM.MIDI.pitchHi, span = Math.max(1, hi - lo);
    var a0 = 0.16 * S.world.breath + 0.10;
    D.line(x0, y, x1, y, P.dim, 1, a0);
    var n = hits.length;
    for (var i = 0; i < n; i++) {
      var h = hits[i];
      var age = S.t - h.ms;
      var f = Math.exp(-age / 2.4) * (h.vel / 127);
      if (f < 0.02) continue;
      var u = C.clamp((h.pitch - lo) / span, 0, 1);
      var runX = x0 + wd * i / Math.max(1, n - 1);   /* history, left -> right */
      var pitX = x0 + wd * u;                        /* placed by pitch        */
      var col = C.mix(P.trace, P.pad, u);
      if (mode === 'bars') {
        D.fillRect(runX - 2.5, y - 4, 5, 8 + 46 * f, col, 0.12 + 0.88 * f);
      } else if (mode === 'ticks') {
        D.line(runX, y, runX, y - 6 - 54 * u, col, 1 + 2 * f, 0.10 + 0.90 * f);
      } else if (mode === 'dots') {
        D.disc(pitX, y - 8 - 52 * u, 2 + 5 * f + 2 * (h.voices - 1), col, 0.14 + 0.86 * f);
      } else {
        var hh = 10 + 60 * f * (0.5 + 0.5 * u);
        D.poly([[pitX - 5, y], [pitX, y - hh], [pitX + 5, y]], col, 1 + 1.6 * f, 0.12 + 0.88 * f);
      }
    }
    /* the count is real, and so is the span it covers */
    if (EM.debugView) D.mono(n + ' notes / 6 s', x0, y + 20, 10, P.silk, 'left', a0 * 3);
  }

  /* ---------- the workhorse: a word drawn as a subject, not a caption ------
     Used wherever the sung word IS the picture. Letters are measured, spaced
     and framed, so the word reads as an object on the board. */
  function bigWord(D, S, o) {
    var P = pal(S), w = S.world;
    var str = (o && o.w) || S.text;
    var size = ((o && o.size) || 92) * (1 + 0.035 * S.beatPulse * S.velocity / 127);
    var cx = EM.W / 2, cy = EM.H / 2 - 10;
    var punch = (o && o.punch) || 0;      /* 0..1 : how hard it has been struck */
    var cols = (o && o.tint) || P.trace;
    var a = 0.55 + 0.45 * S.world.breath;
    /* A complete word slides into place. Musical impact drives the stroke and
       size; a short cue never needs extra notes to finish its spelling. */
    var ph = EM.MO.phases(S.p);
    var shown = str;
    if (!shown) { D.ink++; return { x0: 0, wd: 0, cy: cy, size: size }; }
    var off = EM.MO.slide(S.p, 54, 0.26);
    var wd = D.width(str, size);
    var x0 = cx - wd / 2, y0 = cy + size * 0.34;

    /* the ruler it is measured against */
    if (EM.debugView) D.span(x0, x0 + wd, y0 + 46, cols, a * 0.45, Math.round(wd) + ' px');
    D.mono(shown, cx + off, y0, size, cols, 'center', a);
    /* STRUCK: every crack in the word is a note that was actually played while
       this line was on screen. Its position across the word is that note's
       PITCH, and the crack's length is that note's VELOCITY. Nothing here is
       placed by a hash: if the performance changed, the marks would move. */
    var hits = EM.clock.notesBetween(S.cue.t, S.t);
    var lo = EM.MIDI.pitchLo, hi = EM.MIDI.pitchHi;
    for (var i = 0; i < hits.length; i++) {
      var n2 = hits[i];
      var u = C.clamp((n2.pitch - lo) / Math.max(1, hi - lo), 0, 1);
      var fx = x0 + wd * (0.06 + 0.88 * u);
      var hit = Math.exp(-(S.t - n2.ms) / 0.11) * (n2.vel / 127);
      if (hit < 0.05) continue;
      var jx = (u - 0.5) * 14;
      var hl = size * (0.34 + 0.30 * (n2.vel / 127)) * (0.6 + 0.4 * n2.voices / 3);
      D.poly([[fx, cy - hl], [fx + jx, cy], [fx + jx * 1.7, cy + hl]],
        C.mix(cols, P.alarm, 0.55 + 0.4 * hit), 1 + hit * 1.6, a * (0.5 + 0.5 * hit));
    }
    /* and the whole word takes the impact of the note, not a generic wobble */
    var s0 = EM.clock.sinceNote(S.t);
    if (s0 && s0.dt < 0.22) {
      var imp = Math.exp(-s0.dt / 0.07) * (s0.vel / 127);
      D.line(x0 - 10, y0 + 30, x0 + wd + 10, y0 + 30, C.mix(cols, P.paper, 0.5), 1 + 2 * imp, a * imp * 0.8);
    }
    chrome(D, S, { noWord: true });
    return { x0: x0, wd: wd, cy: cy, size: size };
  }

  /* ---------- board furniture ---------------------------------------------- */
  function busLine(D, S, o) {
    var P = pal(S), a = 0.5 * S.world.breath + 0.2;
    /* the last note-on read off the note table. In a bar with nothing being
       played to the machine this is the only reading there is, and it is a
       real one: the bus keeps carrying the shape of what it was last told. */
    var last = S.velocity / 127;
    var n = (o && o.n) || 7;
    var sp = (o && o.span) || [120, EM.W - 120];
    /* a packet travelling the bus, positioned by the real clock */
    var k = C.saw(S.t * 0.31 + ((o && o.phase) || 0));
    var py = 150 + Math.round(k * (n - 1)) * ((EM.H - 300) / Math.max(1, n - 1));
    for (var i = 0; i < n; i++) {
      var y = 150 + i * ((EM.H - 300) / Math.max(1, n - 1));
      var j = C.sym(i * 3 + Math.floor(S.t / 5), 5) * 70 * S.world.chaos;
      /* the conductors are being DRIVEN, so they are not inert lines: each one
         ripples on its own phase, and the row the packet is crossing swells at
         both ends. A passage with no notes in it still has a live bus — the one
         thing in the plate that runs on its own clock rather than on the
         performance's. */
      var hot = Math.max(0, 1 - Math.abs(y - py) / 46);
      D.wire(sp[0], y, sp[1] + j, y + 6.5 * Math.sin(S.t * 0.9 + i * 0.7),
        P.trace, 1, a * (0.5 + 0.5 * C.hash01(i, 9)));
      D.pad(sp[0] - 10, y, 7 + 7 * hot, P.pad, a * 0.7);
      D.pad(sp[1] + j + 10, y, 7 + 7 * hot, P.pad, a * 0.7);
    }
    D.disc(C.lerp(sp[0], sp[1], C.saw(S.t * 0.23)), py, 3 + 4 * last, P.paper, 0.45 + 0.4 * last);

    /* and the bus is DRIVEN by the notes: each note-on in the last few seconds
       fires a pad. Where it fires is the note's pitch, how hard it is is the
       note's velocity, and how big it is is how many notes made the chord. */
    var hits = S.K.notesBetween(S.t - 3.0, S.t);
    for (var h2 = 0; h2 < hits.length; h2++) {
      var n3 = hits[h2];
      var q = C.clamp((n3.pitch - EM.MIDI.pitchLo) /
        Math.max(1, EM.MIDI.pitchHi - EM.MIDI.pitchLo), 0, 1);
      var f = Math.exp(-(S.t - n3.ms) / 0.5) * (n3.vel / 127);
      if (f < 0.03) continue;
      D.disc(C.lerp(sp[0], sp[1], q), py, 3 + 6 * f + 2 * (n3.voices - 1), P.paper, f * 0.9);
    }
  }

  function padField(D, S, o) {
    var P = pal(S), a = 0.45 * S.world.breath + 0.15;
    var cols = 26, rows = 13, sx = (EM.W - 200) / (cols - 1), sy = 34;
    var x0 = 100, y0 = (EM.H - (rows - 1) * sy) / 2;
    var lit = 0;
    for (var i = 0; i < cols * rows; i++) {
      var x = x0 + (i % cols) * sx, y = y0 + Math.floor(i / cols) * sy;
      var h = C.hash01(i, 31);
      /* the weight of the last note-on, added to every pad: this is what keeps
         an idle field the field of ONE performance instead of a static grid
         with a few lights on it */
      var lastW = 2.6 * S.velocity / 127;
      /* and the field is never still. A wave of SIZE travels through the
         matrix — the same device the board itself uses — so the panel is being
         swept even in a passage with nothing being played to it. Without this,
         the widest plate in the film (338 pads) sat perfectly frozen through
         the boot instrumental, which is exactly the dead air a suite exists to
         prevent. */
      var wave = 0.5 + 0.5 * Math.sin((x * 0.9 + y * 1.7) * 0.008 - S.t * 1.05);
      /* which pads answer is decided by the notes actually sounding near t */
      /* the pad answers a real note, and its SIZE and BRIGHTNESS are that
         note's velocity. Asking only whether a note happened (a boolean) made
         this field insensitive to the performance, which is how it ended up on
         the deaf list. */
      var near = S.K.nearest(S.t - h * 2.5, 0.08);
      var on = near ? 1 : 0;
      var nv = on ? EM.ONSETS[near.index][4] / 127 : 0;
      var np = on ? (EM.ONSETS[near.index][1] - EM.MIDI.pitchLo) /
        Math.max(1, EM.MIDI.pitchHi - EM.MIDI.pitchLo) : 0;
      if (on) lit++;
      D.pad(x, y, 6 + 7 * nv + 4 * np + lastW + 3.4 * wave, on ? P.pad : P.dim,
        (on ? 0.30 + 0.65 * nv : a * 0.5));
      if (on) D.disc(x, y, 2.2 + 3 * S.beatPulse + 4 * nv, P.paper, 0.25 + 0.75 * nv);
    }
    if (o && o.label) D.mono(o.label + '  ' + lit + '/' + (cols * rows), 100, EM.H - 66, 12, P.silk, 'left', 0.7);

    /* ---- THE VERDICT ------------------------------------------------------
       When the field it is showing is the EMPTY one this shot is the machine's
       self-test, and the result belongs on the picture that passes it — the
       score calls this movement "self-test ok". It comes up one beat after the
       cleanup line has left the frame, on the ground the line left behind: the
       machine reports that there is nothing on it, and that it is still
       running. Timed from the instant the line goes (EM.PURGE.hi), not from the
       purge reading, which is pinned at 1.0 from then on — a stamp keyed to a
       pinned reading pops on at full strength, and what the film wanted here
       was one beat with nothing on it, and then the verdict. */
    if (o && o.label === 'empty') {
      var kv = C.smooth(C.clamp((S.t - (EM.PURGE.hi + 0.35)) / 0.55, 0, 1));
      if (kv > 0) {
        var qa = kv * (0.62 + 0.30 * S.world.breath);
        var qx = EM.W / 2, qy = EM.H / 2 + 120;
        D.mono('STATE  EMPTY', qx, qy, 30, P.trace, 'center', qa);
        D.mono('RESET COMPLETE', qx, qy + 44, 22, P.pad, 'center', qa);
        D.mono('waiting for a connection', qx, qy + 82, 14, P.silk, 'center', qa * 0.85);
      }
    }
  }

  /* an oscilloscope running off the REAL pitches of the last few seconds */
  function scope(D, S, o) {
    var P = pal(S);
    var x0 = 170, x1 = EM.W - 170, mid = EM.H / 2, amp = (o && o.amp) || 92;
    D.rect(x0 - 26, mid - amp - 40, (x1 - x0) + 52, (amp + 40) * 2, P.trace, 1, 0.30);
    for (var g = -2; g <= 2; g++) D.line(x0, mid + g * amp / 2, x1, mid + g * amp / 2, P.dim, 1, 0.22);
    var win = (o && o.win) || 6;
    var pts = [];
    for (var i = 0; i <= 220; i++) {
      var t = S.t - win + win * i / 220;
      var p = S.K.pitchAt(t);
      pts.push([x0 + (x1 - x0) * i / 220, mid - ((p - 57) / 17 - 0.5) * 2 * amp]);
    }
    D.poly(pts, P.trace, 1.6, 0.85);
    var nx = x1 - 4;
    D.disc(nx, mid - ((S.pitch - 57) / 17 - 0.5) * 2 * amp, 3.4, P.paper, 0.9);
    D.mono('pitch ' + S.pitch + '  vel ' + S.velocity, x0, mid + amp + 62, 12, P.silk, 'left', 0.7);
    D.span(x0, x1, mid + amp + 84, P.dim, 0.4, '-' + win + ' s');
  }

  /* a column of measurements, all of them real */
  function stack(D, S, o) {
    var P = pal(S), a = 0.62 * S.world.breath + 0.2;
    var x = (o && o.x) || 980, y = (o && o.y) || 210, n = (o && o.n) || 11;
    var rows = [
      ['t', C.fmtTime(S.t)],
      ['beat', (S.beat + 1) + ' / ' + S.K.count],
      ['period', S.beatPeriod ? S.beatPeriod.toFixed(4) + ' s' : '—'],
      ['tempo', S.tempo ? S.tempo.toFixed(2) + ' bpm' : '—'],
      ['pitch', String(S.pitch)],
      ['vel', S.velocity + ' / 127'],
      ['struct', S.world.struct.toFixed(4)],
      ['chaos', S.world.chaos.toFixed(4)],
      ['love', '——'],
      ['exit', S.world.purge > 0.999 ? 'TAKEN' : 'NONE'],
      ['run', String((o && o.run) || 1)]
    ];
    var cnt = Math.min(n, rows.length);
    for (var i = 0; i < cnt; i++) {
      var yy = y + i * 26;
      /* ENTRANCE and EXIT are the same gesture run backwards: rows arrive one
         after another and leave one after another, and a row that is leaving
         slides back out to the right rather than fading where it stands. */
      var out = EM.MO.lineOut(S.p, i, cnt);
      var in_ = C.smooth(C.clamp((S.p - 0.04 - i * 0.03) / 0.22, 0, 1));
      var k = in_ * out;
      var sx = (1 - out) * (44 + i * 9);
      D.mono(rows[i][0], x + sx, yy, 12, P.silk, 'left', a * 0.75 * k);
      D.mono(rows[i][1], x + 96 + sx, yy, 13, rows[i][1] === '——' ? P.love : P.trace, 'left', a * k);
      D.line(x + sx, yy + 7, x + sx + 210 * k, yy + 7, P.dim, 1, a * 0.25 * k);
    }
    var spine = C.smooth(C.clamp(S.p / 0.28, 0, 1)) *
                C.smooth(C.clamp((1 - S.p) / 0.26, 0, 1));
    D.line(x - 18, y - 22, x - 18, y - 22 + (cnt * 26 + 10) * spine, P.silk, 1, a * 0.5);
  }

  /* ---------- ACT I · geometry that is measured ---------------------------- */
  function proveGeometry(D, S, o) {
    var P = pal(S), kind = (o && o.kind) || 'point';
    var cx = EM.W / 2, cy = EM.H / 2 - 20;
    var k = C.env(S.p, 0.16, 0.3);
    var a = (0.55 + 0.45 * S.world.breath) * k;
    var pts = [];
    /* the figure is measured BY the performance, not merely drawn beside it:
       the note that is sounding sets how far the circle is drawn, how tall the
       wave is, and which vertex of the set is picked out. */
    var n0 = S.K.sinceNote(S.t);
    var nv = n0 ? n0.vel / 127 : 0;
    var nn = n0 ? Math.exp(-n0.dt / 0.10) : 0;
    var pv = n0 ? C.clamp((n0.pitch - EM.MIDI.pitchLo) /
      Math.max(1, EM.MIDI.pitchHi - EM.MIDI.pitchLo), 0, 1) : 0;

    if (kind === 'point') {
      for (var i = 0; i < 12; i++) {
        var ang = i * TAU / 12 + S.t * 0.12;
        pts.push([cx + Math.cos(ang) * 230, cy + Math.sin(ang) * 150]);
      }
      var pick = Math.floor(pv * (pts.length - 1));
      /* every vertex is weighted by the last note played to the machine, and
         the one the pitch picks out is struck again on the beat. In a silent
         passage the set still carries the shape of what it heard last, which
         is the only honest thing a machine can do with silence. */
      for (i = 0; i < pts.length; i++) {
        D.disc(pts[i][0], pts[i][1], i === pick ? 3.4 + 6 * nn : 3.4 + 2.2 * nv,
          P.trace, a * (i === pick ? 1 : 0.75));
      }
      /* the leader must follow the point it names: the set rotates, and a
         callout pinned to a fixed coordinate detaches from it within a second */
      D.callout(pts[0][0], pts[0][1], pts[0][0] - 90, pts[0][1] - 120, 'set of points', P.silk, a, 12);
    } else if (kind === 'circle') {
      var r = 132 + 30 * nv + 8 * Math.sin(S.t * 0.9);
      D.circle(cx, cy, r, P.trace, 1.6, a);
      D.disc(cx, cy, 3, P.paper, a);
      D.line(cx, cy, cx + r, cy, P.dim, 1, a * 0.7);
      D.callout(cx + r * 0.5, cy, cx + 120, cy - 150, 'r = ' + r.toFixed(1) + ' px', P.silk, a, 12);
      D.callout(cx, cy - r, cx + 60, cy - r - 60, 'circumference ' + (TAU * r).toFixed(1), P.silk, a, 12);
    } else if (kind === 'sine') {
      for (i = 0; i <= 240; i++) {
        var x = 200 + (EM.W - 400) * i / 240;
        pts.push([x, cy - Math.sin(i / 240 * TAU * 3 + S.t * 1.4) * (70 + 74 * nv)]);
      }
      D.poly(pts, P.trace, 1.6, a);
      var tx = 200 + (EM.W - 400) * 0.5;
      var ty = cy - Math.sin(0.5 * TAU * 3 + S.t * 1.4) * 120;
      D.line(tx, ty, tx + 100, ty + 80, P.silk, 1, a * 0.8);
      D.callout(tx, ty, tx + 120, ty + 96, 'tangent', P.silk, a, 12);
      D.line(200, cy, EM.W - 200, cy, P.dim, 1, a * 0.4);
    } else {
      /* approach infinity: the terms walk out and never arrive */
      /* how tall a term stands is how hard the note was struck, so the series
         is not merely drawn beside the performance — it is pushed out by it */
      for (i = 1; i <= 22; i++) {
        var u = 1 - Math.pow(1 / i, 0.42);
        var xx = 260 + u * (EM.W - 620);
        var hh = 58 * (0.45 + 1.15 * nv);
        D.line(xx, cy - hh, xx, cy + hh, P.trace, 1, a * (0.25 + 0.75 / i));
      }
      D.dash(EM.W - 360, cy - 90, EM.W - 360, cy + 90, P.alarm, 1.2, [5, 5], a);
      D.mono('-> ∞', EM.W - 356, cy - 104, 13, P.alarm, 'left', a);
      D.callout(EM.W - 360, cy, EM.W - 300, cy + 150, 'the limit you become', P.silk, a, 12);
      D.mono('each term stands as tall as the last note was struck:  ' +
        (n0 ? n0.vel : '—') + ' / 127', 262, cy + 132, 12, P.silk, 'left', a * 0.85);
    }
    chrome(D, S, {});
  }

  /* ---------- ACT II · the contract and the trade ------------------------- */
  function contract(D, S, o) {
    var P = pal(S), a = 0.6 * S.world.breath + 0.25;
    var x = 210, y = 200, wd = 700;
    /* ENTRANCE: the frame is stroked open from the left, and only then is it
       lettered. On the way out it retracts in the same order, so the two halves
       of the gesture are the same gesture. */
    var ph = EM.MO.phases(S.p);
    EM.MO.box(D, S, x, y, wd, 72, ph, P.trace, -1, 1.2);
    if (ph.letter < 0.01) { chrome(D, S, {}); return; }
    /* the signature is typed one character per NOTE, and the value it returns
       is struck by the note that is sounding: velocity sets how hard it lands.
       Before this the contract was a picture of a contract — it knew nothing
       about the performance it was describing. */
    var sig = EM.MO.typedByNotes('if (I am ' + ((o && o.is) || 'x') +
      ')  ->  return ' + ((o && o.give) || 'y'), S.t, S.cue.t, ph.letter);
    var n0 = S.K.sinceNote(S.t);
    var hit = n0 ? Math.exp(-n0.dt / 0.09) * (n0.vel / 127) : 0;
    D.mono(sig, x + 20, y + 44, 17, P.trace, 'left', a * ph.letter);
    EM.MO.caret(D, sig, x + 20, y + 44, 17, P.trace, a * ph.letter, S.t);
    /* the return value arrives, and is signed off */
    var k = C.env(S.p, 0.2, 0.3) * ph.letter;
    var rx = x + wd + 40;
    D.wire(x + wd, y + 36, rx + 120, y + 36, P.pad, 1.4, a * k);
    var rw = 240 * (1 + 0.10 * hit);
    D.rect(rx + 120, y - 5 * hit, rw, 72 + 10 * hit, P.pad, 1.2 + 1.8 * hit, a * k);
    D.mono('RETURNED ' + ((o && o.give) || 'y'), rx + 138, y + 44, 15 + 3 * hit, P.pad, 'left', a * k);
    D.mono('vel ' + (n0 ? n0.vel : '—') + '  voices ' + (n0 ? n0.voices : '—'),
      rx + 138, y + 96, 11, P.silk, 'left', a * k * 0.8);
    /* the price, stated */
    D.mono('cost: run the execution', x, y + 122, 13, P.alarm, 'left', a * 0.8);
    chrome(D, S, {});
  }

  function flowchart(D, S, o) {
    var P = pal(S), a = 0.5 * S.world.breath + 0.2;
    var cx = EM.W / 2, cy = EM.H / 2 - 10, n = 5;
    for (var i = 0; i < n; i++) {
      var y = cy - 170 + i * 88;
      var w = 170 + 40 * Math.sin(i + S.t * 0.3);
      /* how badly this decision box has cracked is set by the performance as
         well as by the world: hard notes crack it further, so the flow chart
         degrades at the speed the music pushes it */
      var brk = C.clamp(S.world.chaos * (0.4 + 0.6 * i / n) *
        (0.65 + 0.75 * S.velocity / 127), 0, 1.3);
      D.poly([[cx - w, y], [cx, y - 34], [cx + w, y], [cx, y + 34]], P.trace, 1.2,
        a * (1 - brk * 0.55), true);
      /* the diamond is cracking: each gap is placed by a real note */
      for (var g = 0; g < Math.round(brk * 7); g++) {
        var u = C.hash01(i * 17 + g, 41);
        var px = C.lerp(cx - w, cx, u), py = C.lerp(y, y - 34, u);
        D.line(px - 12, py + 5, px + 12, py - 5, P.alarm, 1.6, a * brk);
      }
      if (i < n - 1) D.wire(cx, y + 34, cx, y + 54, P.trace, 1, a * 0.7);
    }
    D.mono((o && o.label) || 'condition', cx + 230, cy - 170, 13, P.silk, 'left', a * 0.8);
    chrome(D, S, {});
  }

  /* a bank of switches; the state is the world's, not a random flicker */
  /* ---------- the switch ---------------------------------------------------
     "Switch my gender / To F, to M" … and eight seconds later "Oh, switch my
     role / To S, to M": the same gesture with different letters on the poles. So
     it is one object, and it is the object the board would have: a slide switch
     — a bus bar with a solder pad at each end, and a contactor that rides it.
     The two letters sit OUTSIDE the two ends, so the whole figure reads at a
     glance as "F ——●—— M", which is exactly what the couplet says.

     WHAT THROWS IT is the performance, and this is the whole reason the plate is
     worth drawing: the pole the lever rests on is the SIGN OF THE INTERVAL
     between the note that has just sounded and the one before it — the machine's
     own last move, up or down — and the number that threw it is printed under
     the switch. Without that number the letter on the pole would be a claim;
     with it, it is a reading, and it can be checked against the performance.
     The throw starts exactly on a note-on (there is no other clock in this
     film), travels in 0.16 s, and clicks onto the pad.

     The other half of the legibility is that the same switch comes back for the
     second pair: the audience sees one device, thrown, and re-silkscreened —
     which is what the two lines are actually saying. */
  function switchBank(D, S, o) {
    var P = pal(S), a = 0.55 * S.world.breath + 0.3;
    var cx = EM.W / 2, cy = EM.H / 2 + 30, HW = 300, THROW = 0.16;
    var A = (o && o.pairs && o.pairs[0]) || 'F';
    var B = (o && o.pairs && o.pairs[1]) || 'M';

    /* --- the reading ------------------------------------------------------- */
    var i = S.K.indexAt(S.t), d = 0, on = 0, prev = 0, dt = 9;
    var here = i >= 0 ? S.K.sinceNote(S.t) : null;
    if (here) {
      dt = here.dt;
      if (i >= 1) {
        d = EM.ONSETS[i][1] - EM.ONSETS[i - 1][1];
        on = d >= 0 ? 0 : 1;
        prev = i >= 2
          ? ((EM.ONSETS[i - 1][1] - EM.ONSETS[i - 2][1]) >= 0 ? 0 : 1)
          : on;
      }
    }
    /* the lever is still on the old pole until the note that changed the
       reading, and when the two readings agree it does not move at all */
    var k = dt >= THROW ? on : C.lerp(prev, on, C.smooth(C.clamp(dt / THROW, 0, 1)));

    /* --- the object -------------------------------------------------------- */
    var xA = cx - HW, xB = cx + HW, lx = C.lerp(xA, xB, k);
    D.line(xA, cy, xB, cy, C.mix(P.trace, P.dim, 0.5), 6, a * 0.5);   /* the bar     */
    D.dash(xA, cy - 42, xB, cy - 42, P.dim, 1, [6, 5], a * 0.35);     /* the travel  */
    D.pad(xA, cy, 26, P.pad, a);                                      /* the poles   */
    D.pad(xB, cy, 26, P.pad, a);
    /* the contactor, riding the bar: the handle is what the eye follows */
    D.line(lx, cy - 12, lx - 30, cy - 54, P.paper, 3, a * 0.9);
    D.fillRect(lx - 17, cy - 15, 34, 30, C.mix(P.paper, P.trace, 0.35), a * 0.85);
    D.rect(lx - 17, cy - 15, 34, 30, P.paper, 1.4, a);
    D.disc(lx, cy, 5.5, P.paper, a);

    /* the click: the pad it has just landed on */
    if (here && dt < THROW) {
      var cl = 1 - dt / THROW;
      D.circle(on ? xB : xA, cy, 24 + 34 * cl, P.paper, 1.6, a * cl * 0.9);
    }

    /* the poles, and which one the contactor is on: that letter is the bright
       one, so the state of the machine reads at a glance */
    var litA = k < 0.5;
    D.mono(A, xA - 44, cy + 15, 42, litA ? P.paper : P.dim, 'right', a * (litA ? 1 : 0.45));
    D.mono(B, xB + 44, cy + 15, 42, litA ? P.dim : P.paper, 'left', a * (litA ? 0.45 : 1));
    if (litA) D.circle(xA, cy, 34, P.paper, 1.2, a * 0.55);
    else D.circle(xB, cy, 34, P.paper, 1.2, a * 0.55);

    /* And the number that threw it. The block sits under the LEFT pole rather
       than under the middle of the switch: she is standing in the middle, and a
       reading written across her is a reading nobody can read. */
    D.mono('pitch step  ' + (d > 0 ? '+' : '') + d, xA - 44, cy + 46, 15, P.trace, 'left', a * 0.9);
    D.mono('resting on  ' + (litA ? A : B), xA - 44, cy + 72, 15, P.paper, 'left', a * 0.9);
    D.mono((o && o.label) || 'switch', xA - 44, cy + 98, 12, P.silk, 'left', a * 0.7);
    chrome(D, S, {});
  }

  /* ---------- ACT III · the nouns that have no schema --------------------- */
  function vectorBasis(D, S, o) {
    var P = pal(S), a = 0.6 * S.world.breath + 0.25;
    var x = 300, y = EM.H / 2 + 60;
    D.line(x - 40, y, x + 420, y, P.dim, 1, a * 0.5);
    D.line(x, y + 40, x, y - 260, P.dim, 1, a * 0.5);
    /* the three components ARE the three most recent notes. Each one is that
       note's velocity, so the vector is the shape of what was just played
       rather than a constant pair of numbers dressed up as a vector: change
       the performance and the figure changes with it. The middle term keeps
       its sign because that is the one that folds the path back on itself. */
    var recent = S.K.notesBetween(S.t - 4.0, S.t);
    var n1 = recent.length > 0 ? recent[recent.length - 1].vel / 127 : 0.72;
    var n2 = recent.length > 1 ? recent[recent.length - 2].vel / 127 : 0.35;
    var n3 = recent.length > 2 ? recent[recent.length - 3].vel / 127 : 0.44;
    var comp = [n1, -n2, n3];
    var acc = [0, 0];
    for (var i = 0; i < comp.length; i++) {
      var nx = acc[0] + comp[i] * 300 * (i === 0 ? 1 : 0.5);
      var ny = acc[1] - (i === 0 ? 0 : comp[i] * 200);
      D.wire(acc[0] + x, acc[1] + y, nx + x, ny + y, P.trace, 1.6, a);
      acc = [nx, ny];
    }
    D.disc(x + acc[0], y + acc[1], 4.5, P.pad, a);
    D.callout(x + acc[0], y + acc[1], x + 180, y - 300, 'state vector', P.silk, a, 12);
    D.mono('basis: 3   residual: ' + (1 - S.world.struct).toFixed(3), x, y + 74, 13, P.silk, 'left', a * 0.8);
    /* the cell the machine cannot type */
    D.rect(x + 560, y - 250, 250, 78, P.alarm, 1.2, a);
    D.mono('cell = UNKNOWN', x + 578, y - 200, 15, P.alarm, 'left', a);
    chrome(D, S, {});
  }

  function dataflow(D, S, o) {
    var P = pal(S), a = 0.6 * S.world.breath + 0.25;
    var y = EM.H / 2 - 30;
    var boxes = [[150, 170], [560, 170], [970, 170]];
    var names = ['input', (o && o.op) || 'operator', 'output'];
    for (var i = 0; i < 3; i++) {
      var x = boxes[i][0], w = boxes[i][1];
      /* the operator's coefficient jitters with the world, never with a random */
      /* the operator's coefficient is driven by the note that is sounding */
      var jit = (1 + (S.world.chaos * 0.35) * Math.sin(S.t * 2.1 + i)) *
                (0.72 + 0.56 * S.velocity / 127);
      D.rect(x, y, w, 110, P.trace, 1.2, a);
      D.mono(names[i], x + 16, y + 34, 14, P.trace, 'left', a);
      D.mono(i === 1 ? 'k = ' + jit.toFixed(3) : (i === 0 ? 'n = 615' : 'y = kx'), x + 16, y + 66, 13, P.silk, 'left', a * 0.8);
      if (i < 2) {
        D.wire(x + w, y + 55, boxes[i + 1][0], y + 55, P.trace, 1.2, a * 0.8);
        var k = C.saw(S.K.notePhase(S.t) + i * 0.33);
        D.disc(C.lerp(x + w, boxes[i + 1][0], k), y + 55,
          3 + 4 * S.velocity / 127, P.paper, a);
      }
    }
    chrome(D, S, {});
  }

  /* a limit cycle in phase space — the closed orbit a cat settles into */
  function limitCycle(D, S, o) {
    var P = pal(S), a = 0.62 * S.world.breath + 0.28;
    var cx = EM.W / 2, cy = EM.H / 2 - 10, R = 165, r = 52;
    var pts = [];
    var harm = 0;
    for (var i = 0; i <= 260; i++) {
      var th = i / 260 * TAU;
      /* a 15-term series, summed live — the number printed is the sum */
      var rr = R;
      /* the harmonic series is scaled by the note that is sounding */
      var hv = 0.45 + 0.95 * (S.velocity / 127);
      for (var n = 1; n <= 15; n++) rr += Math.sin(n * th + S.t * 0.6) * (14 / n) * hv;
      harm += rr - R;
      pts.push([cx + Math.cos(th) * rr, cy + Math.sin(th) * rr * 0.82]);
    }
    D.poly(pts, P.trace, 1.5, a);
    var st = C.saw(S.t * 0.22) * TAU;
    var sx = cx + Math.cos(st) * R, sy = cy + Math.sin(st) * R * 0.82;
    D.disc(sx, sy, 5, P.pad, a);
    D.line(sx, sy, sx - Math.sin(st) * 46, sy + Math.cos(st) * 38, P.pad, 1.4, a * 0.9);
    D.mono('sum = ' + harm.toFixed(1), cx + R + 40, cy - R, 12, P.silk, 'left', a * 0.8);
    D.mono('orbit closed', cx + R + 40, cy - R + 22, 12, P.trace, 'left', a * 0.8);
    chrome(D, S, {});
  }

  function purr(D, S, o) {
    var P = pal(S), a = 0.6 * S.world.breath + 0.25;
    var mid = EM.H / 2;
    /* The purr waveform follows MIDI phase; its amplitude responds to the
       pulse and velocity, without claiming a measured physical frequency. */
    var shake = 1.2 + 2.6 * S.world.love + 4 * S.beatPulse;
    var phase = S.K.notePhase(S.t), weight = 0.65 + 0.6 * S.velocity / 127;
    var pts = [];
    for (var i = 0; i <= 300; i++) {
      var x = 140 + (EM.W - 280) * i / 300;
      pts.push([x, mid - Math.sin(i / 300 * TAU * 26 + phase * TAU) * 34 * weight]);
    }
    D.poly(pts, P.trace, 1.4, a);
    for (var g = 0; g < 14; g++) {
      var yy = 120 + g * ((EM.H - 260) / 13);
      D.line(140, yy + C.sym(g + Math.floor(S.t * 25), 61) * shake, EM.W - 140, yy, P.dim, 1, a * 0.35);
    }
    if (EM.debugView) D.mono('grid displacement ' + shake.toFixed(2) + ' px',
      140, mid + 114, 12, P.silk, 'left', a * 0.8);
    chrome(D, S, {});
  }

  function horizon(D, S, o) {
    var P = pal(S), a = 0.6 * S.world.breath + 0.3;
    var cx = EM.W / 2, cy = EM.H / 2 + 120, R = 300;
    D.arc(cx, cy, R, Math.PI, TAU, P.dim, 1.2, a * 0.6);          /* the celestial arc */
    D.line(140, cy, EM.W - 140, cy, P.trace, 1.4, a);              /* the horizon */
    /* the sun and the moon ride the SAME arc, one setting as the other rises */
    /* The day passes at the speed of the performance, not of the clock — and it
       passes WITHIN THE LINE, which is the thing the line is about. It used to
       be a fixed 26 notes, and this cue is one and a half seconds of song: the
       sun set off from the left end and never reached the other side while she
       was singing "From A.M. to P.M.", so the crossing the sentence promises
       never happened. The day is now the line's own note count, printed. */
    var endT = (S.cue && S.cue.end) || (S.cue.t + (S.dur || 1.5));
    var across = Math.max(1, S.K.countFrom(S.cue.t, endT));
    var done = S.K.countFrom(S.cue.t, S.t);
    var k = C.clamp(done / across, 0, 1);
    var sunA = Math.PI + k * Math.PI;
    var moonA = Math.PI + (1 - k) * Math.PI;
    var sx = cx + Math.cos(sunA) * R, sy = cy + Math.sin(sunA) * R;
    var mx = cx + Math.cos(moonA) * R, my = cy + Math.sin(moonA) * R;
    D.circle(sx, sy, 26, P.pad, 2, a);
    for (var i = 0; i < 12; i++) {
      var ang = i * TAU / 12 + S.t * 0.2;
      D.line(sx + Math.cos(ang) * 32, sy + Math.sin(ang) * 32,
             sx + Math.cos(ang) * 40, sy + Math.sin(ang) * 40, P.pad, 1.4, a * 0.8);
    }
    /* a true crescent, by subtracting one disc from another */
    var c = D.ctx;
    c.save(); c.globalAlpha = a;
    c.beginPath(); c.arc(mx, my, 24, 0, TAU); c.clip();
    c.fillStyle = C.rgba(P.paper, 0.95); c.fillRect(mx - 26, my - 26, 52, 52);
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.arc(mx - 11 * Math.cos(S.t * 0.25), my - 4, 22, 0, TAU); c.fill();
    c.restore();
    D.ink += 3;
    /* the same device as the switch lines, at the scale of a day: the two ends
       of the horizon are the two poles, the sun riding the arc is the lever, and
       the machine says out loud which half it is in. "From A.M. to P.M." is one
       more throw of the same switch, decided by the same performance (26 notes
       from one end to the other — the count is printed). */
    var pm = k > 0.5;
    D.pad(148, cy, 18, P.pad, a * (pm ? 0.45 : 1));
    D.pad(EM.W - 148, cy, 18, P.pad, a * (pm ? 1 : 0.45));
    D.mono('A.M.', 160, cy + 30, 13, pm ? P.dim : P.silk, 'left', a * (pm ? 0.5 : 0.95));
    D.mono('P.M.', EM.W - 200, cy + 30, 13, pm ? P.silk : P.dim, 'left', a * (pm ? 0.95 : 0.5));
    D.mono('state  ' + (pm ? 'P.M.' : 'A.M.'), cx, cy - 54, 20, pm ? P.pad : P.trace, 'center', a);
    D.mono('notes across  ' + done + ' / ' + across, cx, cy + 66, 12, P.silk,
      'center', a * 0.8);
    chrome(D, S, {});
  }

  function mirrorPair(D, S, o) {
    var P = pal(S), a = 0.6 * S.world.breath + 0.28;
    var cx = EM.W / 2, cy = EM.H / 2 - 10;
    /* The pair is the CUE'S OWN pair. It used to be hard-wired to S and M, which
       put "S" and "M" on the screen during "To F, to M" — the machine naming a
       word the song had not reached and had not asked for (rule 16). A pair is
       an argument to the plate now, and so is the word for the moment the two
       cross, because "indistinguishable" is a claim about S and M and not about
       F and M. */
    var A = (o && o.a) || 'S', B = (o && o.b) || 'M';
    var coin = (o && o.coincide) || 'indistinguishable';
    /* the two curves swap places at a rate the notes set */
    var k = C.smooth(C.clamp((S.t - S.cue.t) / Math.max(0.6, S.dur * 0.7) *
      (0.60 + 0.80 * S.velocity / 127), 0, 1));
    var swap = k * 300;
    for (var s = 0; s < 2; s++) {
      var sgn = s ? -1 : 1;
      var off = (s ? swap : -swap);
      var pts = [];
      for (var i = 0; i <= 200; i++) {
        var x = cx - 320 + 640 * i / 200;
        var u = (x - cx) / 320;
        pts.push([x + off, cy + sgn * (Math.sin(u * 2.3 + S.t * 0.7 + s) * 84) * (1 - 0.55 * Math.abs(u))]);
      }
      var col = s ? P.pad : P.trace;
      var near = 1 - Math.min(1, Math.abs(off) / 60);
      D.poly(pts, C.mix(col, P.paper, near * 0.8), 1.8 - near * 0.6, a);
    }
    D.dash(cx - 340, cy, cx + 340, cy, P.dim, 1, [7, 6], a * 0.5);
    D.mono(k < 0.5 ? A : B, cx - 372, cy + 5, 15, P.trace, 'right', a);
    D.mono(k < 0.5 ? B : A, cx + 372, cy + 5, 15, P.pad, 'left', a);
    if (Math.abs(swap) < 26) D.mono(coin, cx, cy + 130, 13, P.paper, 'center', a * 0.85);
    chrome(D, S, {});
  }

  function roseEye(D, S, o) {
    var P = pal(S), a = 0.6 * S.world.breath + 0.28;
    var cx = EM.W / 2, cy = EM.H / 2 - 10, R = 190;
    for (var i = 0; i < 12; i++) {
      var th = i * TAU / 12 + S.t * 0.05;
      D.poly([[cx, cy], [cx + Math.cos(th) * R, cy + Math.sin(th) * R],
        [cx + Math.cos(th + 0.26) * R, cy + Math.sin(th + 0.26) * R]], P.trace, 1, a * 0.5);
      D.circle(cx, cy, R * (0.35 + 0.12 * i % 0.7), P.trace, 1, a * 0.22);
    }
    D.circle(cx, cy, R, P.trace, 1.6, a);
    /* the pupil keeps time with the notes, not with a metronome */
    var pr = 44 + 16 * S.beatPulse;
    D.disc(cx, cy, pr, C.mix(P.paper, P.pad, S.beatPulse), a * 0.9);
    D.disc(cx, cy, pr * 0.42, P.bg, a);
    for (i = 0; i < 3; i++) {
      var ang = -Math.PI / 2 + (i - 1) * 0.34;
      D.line(cx, cy, cx + Math.cos(ang) * 620, cy + Math.sin(ang) * 620, P.paper, 1, a * 0.35);
    }
    D.mono('proof of existence = the marks on the board', cx, EM.H - 96, 13, P.paper, 'center', a * 0.9);
    chrome(D, S, {});
  }

  EM.M = M;
  M.chrome = chrome;
  M.pal = pal;
  M.bigWord = bigWord;
  M.busLine = busLine;
  M.padField = padField;
  M.scope = scope;
  M.stack = stack;
  M.proveGeometry = proveGeometry;
  M.contract = contract;
  M.flowchart = flowchart;
  M.switchBank = switchBank;
  M.vectorBasis = vectorBasis;
  M.dataflow = dataflow;
  M.limitCycle = limitCycle;
  M.purr = purr;
  M.horizon = horizon;
  M.mirrorPair = mirrorPair;
  M.roseEye = roseEye;
  M.noteRail = noteRail;
  EM.RAIL = RAIL;
})(window.EM = window.EM || {});
