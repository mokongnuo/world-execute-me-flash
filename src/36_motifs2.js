/* ============================================================================
   src/36_motifs2.js — absence, execution, and the end.

   These are the motifs where the film has to be exact rather than pretty. The
   two rules from 35_motifs.js still hold: a curve is an event, and every
   number on screen is traceable to the performance, the clock or the world.
   ========================================================================== */
(function (EM) {
  'use strict';
  var C = EM.C, TAU = EM.TAU, M = EM.M;
  function pal(S) { return EM.palette(S.world); }

  /* ---------- ACT IV · absence: five different ways of not being there ----- */

  /* ① You have left — a hole punched through the outline */
  function hole(D, S, o) {
    var P = pal(S), a = 0.6 * S.world.breath + 0.25;
    var cx = EM.W / 2, cy = EM.H / 2 - 10, R = 220;
    var pts = [], i;
    for (i = 0; i <= 180; i++) {
      var th = i / 180 * TAU;
      pts.push([cx + Math.cos(th) * R * 1.25, cy + Math.sin(th) * R * 0.78]);
    }
    D.poly(pts, P.trace, 1.4, a, true);
    var grow = C.smooth(C.clamp((S.t - S.cue.t) / Math.max(0.5, S.dur * 0.8), 0, 1));
    var n0 = S.K.sinceNote(S.t);
    /* WHERE it is punched is the pitch of the note that just sounded: the
       absence sits at the position the performance last named. It is placed on
       the outline itself, because this is a hole THROUGH the shape, and a hole
       punched at a fixed spot is a sticker of a hole. */
    var pk = n0 ? C.clamp((n0.pitch - EM.MIDI.pitchLo) /
      Math.max(1, EM.MIDI.pitchHi - EM.MIDI.pitchLo), 0, 1) : 0.5;
    var hth = TAU * (0.06 + 0.88 * pk);
    var hx = cx + Math.cos(hth) * R * 1.25, hy = cy + Math.sin(hth) * R * 0.78;
    /* and how WIDE it is punched is how hard the note was struck: a soft note
       takes a little out of the shape, a hard one takes a bite. */
    var hr = (30 + 62 * grow) * (0.68 + 0.62 * (n0 ? n0.vel / 127 : 0.5));
    var c = D.ctx;
    c.save(); c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 1;
    c.beginPath(); c.arc(hx, hy, hr, 0, TAU); c.fill();
    c.restore(); D.ink++;
    D.circle(hx, hy, hr, P.alarm, 1.2, a * 0.8);
    D.callout(hx, hy, hx + 40, hy - 130,
      'absent  ·  pitch ' + (n0 ? n0.pitch : '—') + '  vel ' + (n0 ? n0.vel : '—'),
      P.silk, a, 12);
    M.chrome(D, S, {});
  }

  /* ② the hand is empty, and the thing that was in it is drawn as null */
  function emptyHand(D, S, o) {
    var P = pal(S), a = 0.6 * S.world.breath + 0.25;
    var cx = EM.W / 2, cy = EM.H / 2 - 10;
    /* the object that is not in the hand is still SHAPED like the note that
       took it: its size comes from that note's velocity. Drawn at a fixed size
       this is an illustration of an empty hand; sized by the note it is the
       absence of one particular thing. */
    var n0 = S.K.sinceNote(S.t);
    var k = 0.55 + 0.85 * (n0 ? n0.vel / 127 : 0.5);
    D.poly([[cx - 190, cy - 90], [cx - 40, cy - 120], [cx + 30, cy - 60], [cx + 10, cy + 60],
      [cx - 150, cy + 80], [cx - 210, cy + 10]], P.trace, 1.4, a, true);
    var shape = [[cx + 70, cy - 96], [cx + 214, cy - 20], [cx + 168, cy + 76], [cx + 70, cy + 30]];
    var mx0 = cx + 140, my0 = cy - 2;
    for (var i = 0; i < shape.length; i++) {
      var p0 = shape[i], p1 = shape[(i + 1) % shape.length];
      D.dash(mx0 + (p0[0] - mx0) * k, my0 + (p0[1] - my0) * k,
             mx0 + (p1[0] - mx0) * k, my0 + (p1[1] - my0) * k,
             P.paper, 1.4, [8, 6], a * 0.9);
    }
    D.mono('null', cx + 200, cy + 20, 15, P.paper, 'left', a);
    D.mono('the object evaluates to null, not to nothing', cx - 190, cy + 130, 13, P.silk, 'left', a * 0.85);
    D.mono('what was in it:  pitch ' + (n0 ? n0.pitch : '—') + '  vel ' + (n0 ? n0.vel : '—'),
      cx - 190, cy + 152, 13, P.paper, 'left', a * 0.85);
    M.chrome(D, S, {});
  }

  /* ③ a warm mark left on the board, cooling, with the real temperature */
  function coolMark(D, S, o) {
    var P = pal(S), a = 0.6 * S.world.breath + 0.25;
    var cx = EM.W / 2 - 120, cy = EM.H / 2 - 10;
    var age = S.t - S.cue.t;
    var temp = 36.5 * Math.exp(-age / 5.5);
    D.disc(cx, cy, 60, P.pad, 0.16 + 0.5 * Math.exp(-age / 4));
    D.circle(cx, cy, 60, C.mix(P.pad, P.dim, 1 - Math.exp(-age / 6)), 1.4, a);
    D.circle(cx, cy, 60 * (1 + 0.4 * C.smooth(C.clamp(age / 3, 0, 1))), P.dim, 1, a * 0.4);
    /* thermometer: the reading falls, because the heat really does */
    var tx = cx + 250, ty0 = cy - 130, ty1 = cy + 130;
    D.rect(tx - 7, ty0, 14, ty1 - ty0, P.silk, 1, a * 0.7);
    var lvl = C.clamp(temp / 36.5, 0, 1);
    D.fillRect(tx - 4, ty1 - (ty1 - ty0) * lvl, 8, (ty1 - ty0) * lvl,
      C.mix(P.alarm, P.trace, lvl), a * 0.9);
    D.mono(temp.toFixed(1) + ' °C', tx + 18, ty1 - (ty1 - ty0) * lvl + 4, 13, P.pad, 'left', a);
    D.mono('cooling', tx + 18, ty1 + 24, 12, P.silk, 'left', a * 0.7);
    M.chrome(D, S, {});
  }

  /* ④ the same figure repeated, each copy weaker — the echo */
  function echoes(D, S, o) {
    var P = pal(S), a = 0.62 * S.world.breath + 0.2;
    var cx = EM.W / 2, cy = EM.H / 2 - 10;
    for (var k = 0; k < 6; k++) {
      var sc = 1 - k * 0.13, al = a * Math.pow(0.62, k);
      if (al < 0.03) break;
      D.poly([[cx - 200 * sc, cy - 130 * sc], [cx + 120 * sc, cy - 130 * sc],
        [cx + 200 * sc, cy + 20 * sc], [cx - 60 * sc, cy + 140 * sc]],
        C.mix(P.trace, P.dim, k / 5), 1.3 - k * 0.12, al, true);
    }
    var amp = C.env(S.p, 0.2, 0.3);
    D.mono('attenuation ' + (100 * Math.pow(0.62, Math.floor(S.p * 6))).toFixed(1) + ' %',
      cx + 250, cy, 13, P.silk, 'left', a * amp);
    M.chrome(D, S, {});
  }

  /* ⑤ a variable that evaluates to undefined, and stays there */
  function undefinedVar(D, S, o) {
    var P = pal(S), a = 0.6 * S.world.breath + 0.25;
    var x = 320, y = EM.H / 2 - 10;
    D.mono('> you', x, y - 70, 16, P.silk, 'left', a * 0.8);
    D.mono('>> undefined', x, y - 24, 20, P.alarm, 'left', a);
    D.line(x, y - 8, x + 460, y - 8, P.alarm, 1, a * 0.5);
    D.mono('reference held at 0x00000000', x, y + 34, 13, P.silk, 'left', a * 0.7);
    /* the frame is almost empty on purpose: this one barely is anything */
    D.rect(x, y + 90, 460, 120, P.dim, 1, a * 0.35);
    D.mono('nothing to display', x + 18, y + 158, 14, P.dim, 'left', a * 0.5);
    M.chrome(D, S, {});
  }

  function isolation(D, S, o) {
    var P = pal(S), a = 0.55 * S.world.breath + 0.2;
    var n = 40, cx = EM.W / 2, cy = EM.H / 2 - 10, i;
    /* the points come APART at the rate the performance pushes them: the drift
       is how many notes have been played since this line began, scaled by how
       hard the note sounding now was struck. A different performance separates
       them differently, which a timer-driven drift could never do. */
    var hits = S.K.countFrom(S.cue.t, S.t);
    var drift = 1 + Math.min(1.8, hits * 0.040) * (0.70 + 0.60 * S.velocity / 127);
    /* and the whole scatter TURNS, slowly, on its own. The points coming apart
       is what the notes do to them; the turning is what the passage does when
       nothing is being played — a field that is only ever re-placed by the
       performance stands perfectly still in a passage with no notes in it. It
       also makes the links come and go, since which points are neighbours is a
       function of the angle. */
    var spin = S.t * 0.055;
    for (i = 0; i < n; i++) {
      var ang = C.hash01(i, 71) * TAU + spin, rr = 40 + C.hash01(i, 73) * 340;
      var x = cx + Math.cos(ang) * rr * drift, y = cy + Math.sin(ang) * rr * 0.8 * drift;
      D.circle(x, y, 2.6 + 1.8 * S.beatPulse, P.trace, 1, a);
      if (i > 0) {
        var j = i - 1;
        var a2 = C.hash01(j, 71) * TAU + spin, r2 = 40 + C.hash01(j, 73) * 340;
        var x2 = cx + Math.cos(a2) * r2 * drift, y2 = cy + Math.sin(a2) * r2 * 0.8 * drift;
        var d = Math.hypot(x - x2, y - y2);
        if (d < 190) D.line(x, y, x2, y2, P.dim, 1, a * 0.3 * (1 - d / 190));
      }
    }
    D.mono('links remaining ' + Math.round(100 / drift) + ' %   (' + hits + ' notes)',
      140, EM.H - 96, 13, P.silk, 'left', a * 0.8);
    M.chrome(D, S, {});
  }

  /* ---------- the argument that will not compile -------------------------- */
  function typeError(D, S, o) {
    var P = pal(S), a = 0.65 * S.world.breath + 0.3;
    var x = 220, y = 190;
    var L = [
      ['> call world.execute(me)', P.silk, 15],
      ['> binding argument  "you"', P.silk, 15],
      ['!! TypeError: cannot bind a free variable', P.alarm, 17],
      ['    at frame ' + (S.beat + 1) + ' of ' + S.K.count, P.dim, 13],
      ['    a parameter must be substitutable.', P.paper, 14],
      ['    you are not a value.', P.paper, 15]
    ];
    /* The error prints at the speed of the PERFORMANCE, not at three and a half
       lines a second. The first three lines are the call itself and are on
       screen from the first note; after that exactly one line lands per
       note-on. A seek restores the exact number of lines, and a different
       performance prints a different number of them at the same instant —
       which is the one thing a stopwatch can never do. */
    var lines = S.K.countFrom(S.cue.t, S.t);
    var shown = C.clamp(3 + lines, 0, L.length + 1);
    /* the block itself drifts, slowly, and the underline travels along the
       offending line: a report that does not move at all is a still image of a
       report, and this plate holds the screen on its own in a passage with no
       words and no notes. */
    var drift = 6 * Math.sin(S.t * 0.55);
    for (var i = 0; i < Math.min(L.length, shown); i++) {
      var yy = y + i * 44 + drift;
      D.mono(L[i][0], x, yy, L[i][2], L[i][1], 'left', a);
      /* the offending argument is underlined in the alarm colour */
      if (i === 2) {
        var wl = D.width(L[i][0], L[i][2]);
        var sweep = C.saw(S.t * 0.42);
        D.line(x, yy + 8, x + wl * sweep, yy + 8, P.alarm, 1.6, a * 0.8);
        D.line(x + wl * sweep, yy + 8, x + wl, yy + 8, P.dim, 1, a * 0.3);
      }
    }
    /* the substitution that cannot happen */
    if (shown > 2) {
      /* and the substitution is struck out two notes after the call comes back */
      var k = C.smooth(C.clamp((lines - 2) / 2, 0, 1));
      var bx = x, by = y + 330;
      D.rect(bx, by, 300, 70, P.trace, 1.2, a * (1 - k));
      D.mono('you := ', bx + 16, by + 42, 16, P.trace, 'left', a * (1 - k));
      D.rect(bx + 360, by, 300, 70, P.alarm, 1.4, a * k);
      D.mono('REFUSED', bx + 376, by + 42, 18, P.alarm, 'left', a * k);
      D.wire(bx + 300, by + 35, bx + 360, by + 35, P.alarm, 1.4, a * k);
    }
    M.chrome(D, S, {});
  }

  /* the argument stack, drawn as a stack that has stopped being pushed */
  function eraseStack(D, S, o) {
    var P = pal(S), a = 0.5 * S.world.breath + 0.2;
    var x = 260, bot = EM.H - 170, w = 900;
    /* the argument stack grows ONE FRAME PER NOTE. It was on a timer before,
       which is exactly the kind of decorative clock this film is supposed to
       refuse: a stack that is pushed by a metronome is not a stack. */
    /* a ROLLING window, not the cue's: the stack is a live stack, and it has to
       be readable at any instant, including a cue that begins in a rest */
    var hits = S.K.notesBetween(S.t - 4.2, S.t);
    var push = Math.min(34, 6 + hits.length);
    for (var i = 0; i < push; i++) {
      var y = bot - i * 19;
      if (y < 150) break;
      /* each frame in the stack IS one note: its width is that note's velocity,
         its inset is that note's pitch, and its age is how long ago it landed.
         Reading the stack top-down is reading the last sixteen notes back. */
      var h1 = (i < hits.length) ? hits[hits.length - 1 - i] : null;
      var wBar = h1 ? 150 + 330 * (h1.vel / 127) : 240;
      /* the stack is settling as well as being pushed: every frame sways on its
         own phase, so a passage with no notes in it still has a stack that is
         alive rather than a screenshot of one */
      var xx = x + (h1 ? C.clamp((h1.pitch - 57) / 17, 0, 1) * 150 : 0) +
        7 * Math.sin(S.t * 0.9 + i * 0.5);
      D.rect(xx, y - 15, wBar, 15, P.dim, 1, a * (0.92 - i * 0.02));
      if (h1) D.line(xx, y - 15, xx, y, C.mix(P.trace, P.pad, h1.vel / 127), 1.6, a * 0.7);
    }
    D.mono('frame ' + push, x, bot - push * 19 - 22, 13, P.silk, 'left', a);
    D.mono('sp 0x' + (0x7ff000 + push * 24).toString(16).toUpperCase(), x + 260, bot - push * 19 - 22, 13, P.dim, 'left', a * 0.7);
    M.chrome(D, S, {});
  }

  /* ==========================================================================
     THE FACTORY.

     EXECUTION is sung eighteen times. Eighteen copied slides would read as
     eighteen unrelated pictures; eighteen unrelated inventions would read as
     noise. So it is one parameterised machine: `heat` rises 0 -> 1 across the
     run and each step destroys a DIFFERENT mechanism, while a constant layer
     (the word, the counter, the sixteen progress dots) is superimposed on all
     of them. That is what makes it read as one entity coming apart.
     ======================================================================== */
  function execPlate(step, total) {
    var heat = total > 1 ? step / (total - 1) : 0;
    var variant = step % 16;
    return function (D, S, o) {
      var P = pal(S), a = 0.7 * S.world.breath + 0.3;
      var cx = EM.W / 2, cy = EM.H / 2 - 6;
      /* the eighteen executions were driven by the line's progress alone — a
         picture of a strike, not a strike. Now every one of them is also
         struck by the note that is sounding: the impact's size is that note's
         velocity and its position across the word is that note's pitch. */
      var n0 = S.K.sinceNote(S.t);
      var noteHit = n0 ? Math.exp(-n0.dt / 0.07) * (n0.vel / 127) : 0;
      var hit = Math.max(C.env(S.p, 0.06, 0.5), noteHit * 0.9);
      var word = 'EXECUTION';
      /* it GROWS with the step: twelve identical shots is a chant nobody can
         count — the twelfth has to be measurably bigger, redder and more crowded
         than the first, which is also what makes the nineteenth (finalExec) read
         as the next step instead of a repeat of the thirteenth. */
      var size = 46 + 28 * heat;
      var wd = D.width(word, size);
      var x0 = cx - wd / 2, y0 = cy + size * 0.34;
      var col = C.mix(P.paper, P.alarm, 0.35 + 0.65 * heat);
      /* EVERY EXECUTION STAYS WHERE IT LANDED. The word is said again and the
         screen keeps the one said before, so the count grows and the frame fills
         up — SCATTERED, never stacked: each one's place, size and tilt come from
         hash01 of its own number in the running order, so a seek restores the
         same field. The one being said NOW is the big one in the middle; the
         nineteenth (finalExec) is what this becomes when the machine stops
         counting and simply does not stop. */
      var execs = 0, csq = EM.Lyrics.cues;
      for (var q = 0; q < csq.length && csq[q].t <= S.t; q++) {
        if (csq[q].text === 'EXECUTION') execs++;
      }
      for (var e = 1; e < execs; e++) {
        var ex = 110 + C.hash01(e, 1451) * (EM.W - 240);
        var ey = 120 + C.hash01(e, 1453) * (EM.H - 250);
        var es = size * (0.62 + 0.55 * C.hash01(e, 1457));
        var ec = D.ctx;
        ec.save();
        ec.translate(ex, ey);
        ec.rotate(C.sym(e, 1459) * 0.20);
        D.mono(word, 0, 0, es, C.mix(P.alarm, P.paper, C.hash01(e, 1461) * 0.75),
          'center', a * 0.78);
        ec.restore();
      }
      /* and every execution leaves the board smaller than it found it: the count
         is the running order's own, read off the cue table, not a decoration */
      var burned = Math.min(615, execs * 34);
      D.mono('joints remaining  ' + (615 - burned) + ' / 615', cx, cy - 186, 13,
        P.silk, 'center', a * 0.9);

      /* --- the mechanism this step destroys --- */
      var g;
      if (variant === 0) {                                  /* the seam splits */
        D.line(cx - 420, cy - 40 + hit * 20, cx + 420, cy - 40 - hit * 20, col, 2, a);
      } else if (variant === 1) {                           /* a grid is rastered */
        for (g = 0; g <= 14; g++) {
          var xx = cx - 420 + g * 60;
          D.line(xx, cy - 150, xx + C.sym(g + step, 5) * 40 * heat, cy + 150, col, 1, a * 0.6);
        }
      } else if (variant === 2) {                           /* a circle is broken */
        var brk = 0.35 + 0.6 * heat;
        for (g = 0; g < 10; g++) {
          if (g / 10 < brk) continue;
          D.arc(cx, cy, 170, g * TAU / 10 + 0.06, (g + 1) * TAU / 10 - 0.06, col, 2, a);
        }
      } else if (variant === 3) {                           /* bolts in a ring */
        for (g = 0; g < 16; g++) {
          var th = g * TAU / 16;
          D.disc(cx + Math.cos(th) * 230, cy + Math.sin(th) * 150, 3 + 4 * hit, col, a * 0.9);
        }
      } else if (variant === 4) {                           /* the stamp comes down */
        var sq = C.smooth(hit);
        D.rect(cx - 250 * sq, cy - 110 * sq, 500 * sq, 220 * sq, col, 2.4, a);
      } else if (variant === 5) {                           /* the word is struck out */
        D.line(x0 - 20, cy - 6, x0 + wd + 20, cy - 6, P.alarm, 3, a * (0.4 + 0.6 * heat));
      } else if (variant === 6) {                           /* the frame is sheared */
        D.poly([[cx - 430, cy - 150], [cx + 400 + heat * 90, cy - 150],
          [cx + 430, cy + 150], [cx - 400 - heat * 90, cy + 150]], col, 1.4, a * 0.7, true);
      } else if (variant === 7) {                           /* the rulers collapse in */
        D.span(cx - 460 + heat * 200, cx + 460 - heat * 200, cy + 150, col, a * 0.8, 'span');
      } else if (variant === 8) {                           /* the counter starts */
        D.mono('CALL ' + (step + 1) + ' / ' + total, cx - 460, cy - 190, 16, col, 'left', a);
      } else if (variant === 9) {                           /* everything is halved */
        for (g = 0; g < 8; g++) D.line(cx - 400 + g * 114, cy + 120, cx - 400 + g * 114, cy + 120 - 40 * (1 - heat), col, 1.4, a * 0.7);
      } else if (variant === 10) {                          /* the seams separate */
        for (g = 0; g < 6; g++) {
          D.line(cx - 400, cy - 90 + g * 36, cx - 400 + 800 * (1 - heat * 0.7), cy - 90 + g * 36, col, 1, a * 0.55);
        }
      } else if (variant === 11) {                          /* a hole is punched */
        var c = D.ctx;
        c.save(); c.globalCompositeOperation = 'destination-out';
        c.beginPath(); c.arc(cx + (variant - 8) * 40, cy, 40 + 90 * heat, 0, TAU); c.fill();
        c.restore(); D.ink++;
      } else if (variant === 12) {                          /* it is rotated off true */
        D.line(cx - 380, cy + 30 + heat * 120, cx + 380, cy + 30 - heat * 120, col, 1.6, a * 0.8);
      } else if (variant === 13) {                          /* the mechanism burns out */
        D.disc(cx, cy, 120 + 60 * heat, C.mix(P.alarm, P.bg, 0.55), a * 0.5 * (1 - heat * 0.4));
      } else if (variant === 14) {                          /* only the chassis left */
        D.rect(cx - 430, cy - 150, 860, 300, col, 1.2, a * 0.4);
      } else {                                              /* the word alone */
        a *= 1;
      }

      /* --- the constant layer: the same on all sixteen --- */
      D.mono(word, cx, y0, size, col, 'center', a);
      if (n0) {
        var pk = C.clamp((n0.pitch - EM.MIDI.pitchLo) /
          Math.max(1, EM.MIDI.pitchHi - EM.MIDI.pitchLo), 0, 1);
        var hx = cx - wd / 2 + wd * (0.05 + 0.90 * pk);
        D.line(hx, cy - size * 0.62, hx, cy + size * 0.42, P.paper,
          1 + 3 * noteHit, a * (0.25 + 0.75 * noteHit));
        D.mono(n0.vel + '', hx, cy + size * 0.42 + 16, 10, P.paper, 'center', a * noteHit);
      }
      var dots = total;
      for (g = 0; g < dots; g++) {
        var dx = cx - (dots - 1) * 9 + g * 18;
        D.disc(dx, cy + 168, g <= step ? 3.2 : 2, g <= step ? col : P.dim, g <= step ? a : a * 0.4);
      }
      M.chrome(D, S, {});
      /* the label hangs under the word, not on the note rail: EM.H-96 is
         exactly where the rail's own baseline runs, so the two were written on
         top of each other in every labelled shot */
      if (o && o.label) D.mono(o.label, cx, cy + 86, 13, P.silk, 'center', a * 0.7);
    };
  }

  function countdown(D, S, o) {
    var P = pal(S), a = 0.7 * S.world.breath + 0.3;
    var cx = EM.W / 2, cy = EM.H / 2 - 6;
    D.mono((o && o.w) || S.text, cx, cy + 26, 78, C.mix(P.paper, P.alarm, 0.5), 'center', a);
    /* One step of the countdown per NOTE — it counts in the units the music
       gives it, which is why the count itself is in a language it does not own.
       Two things had to be true for that to be visible. The dial has no fixed
       zero: where it starts is the PITCH of the note that just sounded, so the
       count begins wherever the performance put it. And it is drawn as nine
       separate steps rather than one sweep, so the count can be READ off the
       picture instead of inferred from an angle. */
    var n0 = S.K.sinceNote(S.t);
    var zero = -Math.PI / 2 + (n0 ? (n0.pitch % 12) / 12 * TAU : 0);
    var steps = S.K.countFrom(S.cue.t, S.t);
    for (var i = 0; i < 9; i++) {
      var on = i < steps;
      D.arc(cx, cy - 10, 150, zero + i * TAU / 9 + 0.035,
        zero + (i + 1) * TAU / 9 - 0.035, P.alarm, on ? 3 : 1.1, a * (on ? 0.85 : 0.16));
    }
    /* and the dial reads back the two numbers it is made of */
    D.mono('note ' + (n0 ? n0.pitch : '—') + '   steps ' + Math.min(9, steps) + ' / 9',
      cx, cy + 214, 13, P.silk, 'center', a * 0.8);
    M.chrome(D, S, {});
  }

  /* ---------- ACT VI · love ----------------------------------------------- */
  function molecule(D, S, o) {
    var P = pal(S), a = 0.6 * S.world.breath + 0.3;
    var cx = EM.W / 2, cy = EM.H / 2 - 10;
    var nodes = [[-90, -40], [10, 0], [110, -50], [130, 60], [0, 90], [-120, 60]];
    var links = [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5], [5, 0]];
    for (var i = 0; i < links.length; i++) {
      var A = nodes[links[i][0]], B = nodes[links[i][1]];
      D.line(cx + A[0] * 1.6, cy + A[1] * 1.6, cx + B[0] * 1.6, cy + B[1] * 1.6, P.trace, 1.6, a * 0.85);
    }
    for (i = 0; i < nodes.length; i++) {
      var r = i === 1 ? 15 : 11;
      D.circle(cx + nodes[i][0] * 1.6, cy + nodes[i][1] * 1.6, r, i === 1 ? P.pad : P.trace, 1.6, a);
      D.mono(i === 1 ? 'C' : ['H', 'O', 'H', 'H', 'O'][i % 5], cx + nodes[i][0] * 1.6, cy + nodes[i][1] * 1.6 + 5, 13,
        i === 1 ? P.pad : P.trace, 'center', a);
    }
    D.mono('structure: C6H' + (6 + S.repeat) + 'O2   (approx.)', cx, cy + 230, 13, P.silk, 'center', a * 0.8);
    M.chrome(D, S, {});
  }

  function algebra(D, S, o) {
    var P = pal(S), a = 0.6 * S.world.breath + 0.28;
    var cx = EM.W / 2, cy = EM.H / 2 - 10;
    var flying = ['lim', '∫', 'Σ', 'dx', 'd/dt', '√', '∂'];
    /* the operators arrive ONE PER NOTE, in the order they were played, and
       each one stands where its own note's pitch puts it and is weighted by
       that note's velocity. So the row of symbols on stage at any instant is
       the row of notes that has been played to the machine since this line
       began — play a different performance and the same instant holds a
       different row. */
    var hits = S.K.notesBetween(S.cue.t, S.t);
    for (var i = 0; i < flying.length && i < hits.length; i++) {
      var h = hits[i];
      var u = C.clamp((h.pitch - EM.MIDI.pitchLo) /
        Math.max(1, EM.MIDI.pitchHi - EM.MIDI.pitchLo), 0, 1);
      var ph = C.saw(S.t * 0.35 + i / flying.length);
      var x = cx + (ph * 2 - 1) * 640;
      var y = cy - 150 + 300 * u;
      D.mono(flying[i], x, y, 40, C.mix(P.trace, P.pad, h.vel / 127), 'center',
        a * (0.3 + 0.7 * (1 - Math.abs(ph * 2 - 1))) * (0.45 + 0.55 * h.vel / 127));
    }
    D.mono('operators ' + Math.min(flying.length, hits.length) + ' / ' + flying.length +
      '   (one per note)', cx, cy + 148, 13, P.silk, 'center', a * 0.8);
    D.mono('love  =  lim  1/(1-λ)   as  λ -> 1', cx, cy + 30, 26, P.paper, 'center', a);
    D.line(cx - 300, cy + 52, cx + 300, cy + 52, P.paper, 1.4, a * 0.7);
    D.mono('(evaluates to: undefined)', cx, cy + 92, 15, P.alarm, 'center', a * 0.9);
    M.chrome(D, S, {});
  }

  /* the first thing in the whole film that is not computed */
  function handLine(D, S, o) {
    var P = pal(S), a = 0.75 * S.world.breath + 0.3;
    var str = (o && o.w) || S.text;
    var cx = EM.W / 2, cy = EM.H / 2 - 10, size = (o && o.size) || 84;
    var wd = D.width(str, size);
    var x0 = cx - wd / 2;
    var c = D.ctx;
    c.save(); c.globalAlpha = a;
    c.font = '700 ' + size + 'px "Segoe UI","Microsoft YaHei",system-ui,sans-serif';
    c.fillStyle = C.rgba(P.paper);
    c.textAlign = 'left';
    for (var i = 0; i < str.length; i++) {
      var chx = c.measureText(str.slice(0, i)).width;
      var jx = C.sym(i, 97) * 3.4, jy = C.sym(i, 99) * 5.2, rot = C.sym(i, 101) * 0.035;
      c.save();
      c.translate(x0 + chx, cy);
      c.rotate(rot);
      c.fillText(str[i], jx, jy + size * 0.32);
      c.restore();
    }
    c.restore(); D.ink++;
    /* This is the one line in the film that is not computed: the letters are
       placed by a fixed hash — never by the clock, never by an equation — and
       that has to stay true. But it is written by a hand that is LISTENING, so
       the pressure of the stroke is the last note it heard: how hard the pen
       is pressed and how far the underline wanders. The line is not derived
       from the music; its pressure is. */
    var press = 0.80 + 0.45 * S.velocity / 127;
    /* the underline that will not stay straight */
    var pts = [];
    for (i = 0; i <= 40; i++) {
      pts.push([x0 + wd * i / 40, cy + size * 0.46 + C.sym(i * 3, 103) * 4.5 * press]);
    }
    D.poly(pts, P.paper, 2.2 * press, a * 0.85);
    D.mono('(no equation required)', cx, cy + size * 0.46 + 40, 15, P.silk, 'center', a * 0.85);
    D.mono('the hand is listening:  press ' + S.velocity + ' / 127',
      cx, cy + size * 0.46 + 62, 13, P.paper, 'center', a * 0.8);
    M.chrome(D, S, {});
  }

  function heartbeat(D, S, o) {
    var P = pal(S), a = 0.7 * S.world.breath + 0.3;
    var mid = EM.H / 2, pts = [];
    for (var i = 0; i <= 400; i++) {
      var x = 140 + (EM.W - 280) * i / 400;
      var ph = (x / (EM.W - 280)) * 8 + S.t * 0.4;
      var base = Math.sin(ph * TAU) * 26;
      /* irregular on purpose: the beat is not a metronome, and neither is this */
      var noise = C.wiggle(i, S.t, 26, 107) * 30;
      var spike = Math.pow(Math.abs(Math.sin(ph * Math.PI)), 24) * 120;
      pts.push([x, mid - base - noise - spike]);
    }
    D.poly(pts, P.love, 1.8, a);
    var bpm = S.tempo;
    D.mono('interval ' + (S.beatPeriod ? S.beatPeriod.toFixed(3) + ' s' : '—') +
      (bpm ? '   (' + bpm.toFixed(1) + ' bpm)' : ''), 140, mid + 140, 13, P.silk, 'left', a * 0.85);
    M.chrome(D, S, {});
  }

  /* ---------- the self-purge ---------------------------------------------- */
  function purgeSeq(D, S, o) {
    var P = pal(S), w = S.world;
    var a = 0.7 * w.breath + 0.3;
    var x = 200, y = 210;
    var pg = w.purge;
    /* The manifest is a readout OF the board, and the line takes it with the
       rest of the instruments: by the time the erase completes it is gone. It
       used to come back at full strength the instant the line left the frame,
       which is exactly the thing the board is not allowed to do — the panel is
       erased, so the panel stays erased. */
    var mg = 1 - C.smooth(C.clamp((pg - 0.90) / 0.09, 0, 1));

    /* the deletion manifest. The ORDER is the argument: the borrowed faces go
       first because they were never his, then the only thing that ever was. */
    var items = [
      ['identity       9   released', C.clamp(pg / 0.34, 0, 1), C.mix(P.trace, P.pad, 0.6)],
      ['joints       615   removed', C.clamp((pg - 0.18) / 0.78, 0, 1), P.pad],
      ['cues         131   cleared', C.clamp((pg - 0.75) / 0.22, 0, 1), P.trace],
      ['anchors       46   dropped', C.clamp((pg - 0.88) / 0.12, 0, 1), P.trace]
    ];
    for (var i = 0; i < items.length; i++) {
      var yy = y + i * 46;
      var k = items[i][1];
      D.mono(items[i][0], x, yy, 16, items[i][2], 'left', a * mg * (0.45 + 0.55 * k));
      if (k > 0.02) {
        var wd = D.width(items[i][0], 16);
        /* struck out from the left, in step with the real counters */
        D.line(x, yy - 5, x + wd * k, yy - 5, P.alarm, 2.2, a * mg);
      }
      if (k >= 1) D.mono('✔', x + 360, yy, 16, P.pad, 'left', a * mg);
    }

    /* The list is being READ, not merely displayed: a reticle walks down it on
       its own clock. purgeSeq carries the whole of the first and third
       movements of the self-deletion, and at 3:15 nothing has been deleted
       yet — without this the passage opened on a panel that was not moving at
       all, which is the dead air the suite exists to remove. */
    var readY = y - 18 + C.saw(S.t / 5.2) * 4 * 46;
    D.rect(x - 16, readY, 424, 40, P.dim, 1, a * mg * 0.45);
    D.line(x - 32, readY + 20, x - 16, readY + 20, P.trace, 1.4, a * mg * 0.7);

    /* live counters, from the world, not from a script */
    D.mono('JOINTS REMAINING  ' + S.jointsLive + ' / ' + S.jointsTotal, x, y + 250, 18, P.trace, 'left', a * mg);
    /* what it is deleting, right now: the last note it was played, and the sum
       of the velocities it has been asked to forget. Both come from the note
       table, so this panel is about the performance and not about a progress
       bar. */
    var n = S.K.sinceNote(S.t);
    D.mono('last played  pitch ' + (n ? n.pitch : '—') + '   vel ' + (n ? n.vel : '—') +
      '   voices ' + (n ? n.voices : '—'), x, y + 280, 13, P.pad, 'left', a * mg * 0.95);
    var sum = 0, hits = S.K.notesBetween(0, S.t);
    for (var h = 0; h < hits.length; h++) sum += hits[h].vel;
    D.mono('velocity sum to be released   ' + sum, x, y + 304, 13, P.silk, 'left', a * mg * 0.85);
    var barW = 460;
    D.rect(x, y + 268, barW, 12, P.dim, 1, a * mg * 0.6);
    var rem = S.jointsTotal ? S.jointsLive / S.jointsTotal : 0;
    D.fillRect(x, y + 268, barW * rem, 12, P.pad, a * mg * 0.9);

    /* the front itself is drawn by the board; here is what it says */
    if (pg > 0.02 && pg < 0.995) {
      D.mono('ERASE  ' + (pg * 100).toFixed(1) + ' %', EM.W - 420, y, 18, P.paper, 'left', a);
    }

    /* The verdict used to be stamped here, keyed to the purge reading passing
       0.985 — but this movement is handed off at 202.72 and the reading does not
       pass 0.985 until 202.9, so the stamp was never once drawn. It lives in the
       movement the score calls "self-test ok" now (padField, label 'empty'). */
    M.chrome(D, S, {});
  }

  /* ---------- the last shot ----------------------------------------------- */
  function finalExec(D, S, o) {
    var P = pal(S), a = 0.75 * S.world.breath + 0.3;
    var cx = EM.W / 2, cy = EM.H / 2 - 6;
    var QUIET = 1.0;                           /* the lone word, before it starts */
    var rt0 = 1.9;                             /* seconds into the shot */
    var since = S.t - S.cue.t;
    var RATE = 2.55, FROM = 0.0;

    if (since < QUIET) {
      /* the nineteenth, quiet: one word, on the origin of an empty board */
      var size = 116, wd = D.width('EXECUTION', size);
      D.mono('EXECUTION', cx, cy + size * 0.34, size, P.paper, 'center', a);
      D.line(cx - wd, cy + size * 0.34 + 20, cx + wd, cy + size * 0.34 + 20, P.dim, 1, a * 0.35);
      /* crosshair: the centre is being measured, not decorated — and a
         measurement you cannot read is not a measurement. The reticle stays on
         the origin, where the word is written over it; the LABEL is hung off it
         into the one clear corner of the shot, with a leader, instead of being
         typed across the middle of the word. */
      D.line(cx - 52, cy, cx - 14, cy, P.alarm, 1.6, a * 0.95);
      D.line(cx + 14, cy, cx + 52, cy, P.alarm, 1.6, a * 0.95);
      D.line(cx, cy - 52, cx, cy - 14, P.alarm, 1.6, a * 0.95);
      D.line(cx, cy + 14, cx, cy + 52, P.alarm, 1.6, a * 0.95);
      D.circle(cx, cy, 9, P.alarm, 1.2, a * 0.8);
      D.callout(cx, cy, cx + 152, cy + 116, 'origin (0,0)', P.alarm, a * 0.95, 13);

    } else {
      /* ---- THE MACHINE DOES NOT STOP AT NINETEEN ---------------------------
         The nineteenth is written quietly on the origin, and then the machine
         runs it again, and again, and does not stop: every one lands HOT (the
         alarm colour) and cools to paper, the word written on the origin is
         joined by more of them, and the count grows until the frame is nothing
         else. The picture washes red on the beat while that happens — the alarm
         is not a state the world is in, it is what this shot does.

         All of it is a function of t: where the i-th word lands, how big it is,
         how far it is tilted and how hot it still is come from hash01(i, salt),
         so a seek restores the same screen and the same count. */
      var BIRTH = QUIET, STEP = 0.055, CAP = 84;
      var n = Math.min(CAP, Math.floor((since - BIRTH) / STEP) + 1);
      var ramp = C.smooth(C.clamp((since - BIRTH) / 0.8, 0, 1));
      var pulse = (0.12 + 0.34 * S.beatPulse) * ramp;
      D.fillRect(0, 0, EM.W, EM.H, P.alarm, a * (0.04 + 0.15 * S.beatPulse) * ramp);
      for (var i = 0; i < n; i++) {
        var age = since - (BIRTH + i * STEP);
        var cool = C.clamp(age / 0.55, 0, 1);            /* red … paper */
        var al = a * (0.30 + 0.70 * C.smooth(C.clamp(age / 0.16, 0, 1)));
        if (i === 0) {
          /* the one that was written on the origin stays where it was written */
          D.mono('EXECUTION', cx, cy + 116 * 0.34, 116, C.mix(P.alarm, P.paper, cool),
            'center', al);
          continue;
        }
        var size = 24 + 62 * C.hash01(i, 1457);
        var ex = 70 + C.hash01(i, 1451) * (EM.W - 140);
        var ey = 130 + C.hash01(i, 1453) * (EM.H - 260);
        var c = D.ctx;
        c.save();
        c.translate(ex, ey);
        c.rotate(C.sym(i, 1459) * 0.24);
        D.mono('EXECUTION', 0, 0, size, C.mix(P.alarm, P.paper, cool), 'center', al);
        c.restore();
      }
      /* and the frame itself is under the alarm */
      D.line(0, 0, EM.W, 0, P.alarm, 9, a * pulse);
      D.line(0, EM.H, EM.W, EM.H, P.alarm, 9, a * pulse);
      D.line(0, 0, 0, EM.H, P.alarm, 9, a * pulse);
      D.line(EM.W, 0, EM.W, EM.H, P.alarm, 9, a * pulse);
    }

    /* --- the replay ---------------------------------------------------------
       The film is a pure function of t, so it can call itself. This is not a
       recording and not a metaphor: it is a second evaluation of the same
       function, and the verification proves it lands on identical frames. */
    S.replayFrom = S.cue.t + rt0;
    if (since >= rt0) {
      var grow = C.smooth(C.clamp((since - rt0) / 1.1, 0, 1));
      var iw = C.lerp(180, 980, grow), ih = iw * 9 / 16;
      var ix = cx - iw / 2, iy = cy - ih / 2;
      var rt = EM.drawReplay(D, S, [ix, iy, iw, ih], RATE, FROM);

      D.rect(ix - 8, iy - 8, iw + 16, ih + 16, P.trace, 1.4, a * 0.8);
      D.mono('REPLAY · RUN 2', ix, iy - 18, 15, P.alarm, 'left', a);
      D.mono('t = ' + rt.toFixed(2) + ' s of ' + FROM + ' s', ix + iw, iy - 18, 13, P.silk, 'right', a * 0.9);
      D.mono('the same function, evaluated again', cx, EM.H - 116, 14, P.paper, 'center', a * 0.9);

      /* the board is being written on again, and the counter says so */
      D.mono('JOINTS  ' + S.jointsLive, cx - 470, 132, 14, P.pad, 'left', a * 0.9);
    }

    /* the verdict sits on top of all of it: the machine keeps reporting.
       It lives above the caption band, not under it — at EM.H-120 it collided
       with the band's own line and the outgoing shot's "movement n / 4". */
    D.mono('state: EMPTY     exit: TAKEN', cx, EM.H - 164, 14, P.silk, 'center', a * 0.85);
    M.chrome(D, S, {});
  }

  /* --- fill the instrumental stretches ------------------------------------
     The three thirteen-second passages used to be ONE motif each, held for
     their whole length, which is why they read as dead air. A suite runs a
     sequence of moves across the passage, cutting hard between them, so the
     longest stretches of the song are the ones that develop most. */
  function suite(D, S, o) {
    var moves = (o && o.moves) || [];
    if (!moves.length) return;
    var total = 0, i;
    for (i = 0; i < moves.length; i++) total += (moves[i][2] || 1);
    var k = S.p * total, acc = 0, idx = moves.length - 1, local = 1;
    for (i = 0; i < moves.length; i++) {
      var wt = moves[i][2] || 1;
      if (k < acc + wt) { idx = i; local = (k - acc) / wt; break; }
      acc += wt;
    }
    /* ---- THE HAND-OFF, AND WHY IT IS A CUT --------------------------------
       A movement in a suite is a SHOT. Handing it the raw 0..1 of its own span
       does not make it one: every sub-motive that carries an entrance envelope
       fades ITSELF out over its last third, so the picture went nearly blank at
       each seam. Sampled across the boot passage, 19.4 s and 26.3 s came back
       almost empty — the instrumental's longest stretch still read as the dead
       air the suite exists to prevent. The old hand-off to the outgoing
       movement made it worse: it ran the outgoing's progress 1 -> 0, which took
       it out of view, brought it back, and took it out again.
       The score calls these passages "four shots, hard cut", so that is what
       they are: a movement is handed a progress inside the plateau of its own
       envelope — full strength on its first frame and on its last — and the
       seam is a cut, between two different shot sizes from the camera's list.
       ---------------------------------------------------------------------- */
    var ENTER = 0.34, EXIT = 0.66;      /* the plateau ends of these envelopes */
    var inside = C.lerp(ENTER, EXIT, local);
    /* ---- THE CAMERA -------------------------------------------------------
       A suite without a camera is four pictures dissolving into each other,
       which is exactly the dead air these passages were accused of. Each
       movement gets a shot: how big the subject is, and where the frame is
       looking. The scale and the offset are the same two variables the subject
       system uses, so the whole film is filmed with one camera.

       The gestures repeat across all three passages on purpose: the boot and
       the self-deletion are meant to be the same shot list, which is what makes
       the third thirteen seconds read as the first one's reflection.
       ---------------------------------------------------------------------- */
    var c = D.ctx;
    var cam = (o.cams && o.cams[idx]) || ['push', 'pan', 'pull', 'gate'][idx % 4];
    var shot = CAM(cam, local);
    c.save();
    /* no rotation branch: none of the nine shots rotates the frame, and a dead
       branch here only tripped the film's own "no plate pivots the stage"
       rule — a rule that exists to keep the skeleton still, not to catch the
       camera doing its job. */
    c.translate(EM.W / 2 + shot.x, EM.H / 2 + shot.y);
    c.scale(shot.s, shot.s);
    c.translate(-EM.W / 2, -EM.H / 2);
    var S2 = shallow(S, inside);
    EM.M[moves[idx][0]](D, S2, moves[idx][1] || {});
    c.restore();
    /* the camera's own log line, so a movement with no motion is visible */
    var P0 = pal(S);
    D.mono('cam ' + cam + '  scale ' + shot.s.toFixed(2) +
      '  pan ' + Math.round(shot.x) + ',' + Math.round(shot.y),
      EM.W / 2, EM.H - 156, 11, P0.silk, 'center', 0.6);
    /* a legible movement marker, because a suite with no movement numbers is
       just a longer plate */
    var P = pal(S), n = moves.length;
    for (i = 0; i < n; i++) {
      D.disc(EM.W / 2 - (n - 1) * 11 + i * 22, EM.H - 132, i === idx ? 4 : 2.4,
        i <= idx ? P.pad : P.dim, i === idx ? 0.95 : 0.45);
    }
    D.mono('movement ' + (idx + 1) + ' / ' + n + '   ' + (moves[idx][3] || ''),
      EM.W / 2, EM.H - 112, 12, P.silk, 'center', 0.8);
  }
  /* a view of the same state with a different progress, so a sub-motive can be
     drawn at its own local entrance while the parent keeps its own clock */
  /* The shot list. Each takes the movement's own progress k and returns a scale
     and a frame offset. They are pure functions of k, so a seek restores the
     exact camera position. */
  function CAM(name, k) {
    var s = C.smooth(k);
    switch (name) {
      case 'push':   return { s: 0.60 + 0.42 * s, x: 0, y: 0 };
      case 'pan':    return { s: 1.06, x: (0.5 - s) * 460, y: 0 };
      case 'pull':   return { s: 1.34 - 0.34 * s, x: 0, y: 0 };
      case 'gate':   return { s: 1.0 + 0.10 * Math.sin(k * Math.PI), x: 0, y: (0.5 - s) * 240 };
      case 'follow': return { s: 0.94 + 0.20 * k, x: 0, y: (0.5 - k) * 210 };
      case 'over':   return { s: 1.0 + 0.62 * Math.sin(k * Math.PI), x: 0, y: 0 };
      case 'fault':  return { s: 1.0, x: C.sym(Math.floor(k * 14), 771) * 30, y: 0 };
      case 'freeze': return { s: 1.30 - 0.32 * s, x: 0, y: 0 };
      case 'press':  return { s: 1.0 + 1.25 * C.smooth(Math.min(1, k * 1.7)), x: 0, y: 0 };
      case 'strip':  return { s: 1.0, x: s * 300, y: 0 };
      case 'empty':  return { s: 0.54 + 0.12 * s, x: 0, y: 0 };
    }
    return { s: 1, x: 0, y: 0 };
  }
  function shallow(S, p) {
    var o = {};
    for (var k2 in S) if (Object.prototype.hasOwnProperty.call(S, k2)) o[k2] = S[k2];
    o.p = p;
    o.__suite = true;
    return o;
  }
  function titleCard(D, S, o) {
    var P = pal(S), a = 0.9;
    var cx = EM.W / 2, cy = EM.H / 2;
    D.mono('world.execute(me);', cx, cy - 10, 62, P.paper, 'center', a);
    D.line(cx - 300, cy + 26, cx + 300, cy + 26, P.paper, 1.6, a * 0.7);
    D.mono('run 2', cx, cy + 66, 18, P.silk, 'center', a * 0.8);
    /* The card is not decorative: it states the performance it was made from.
       The last note of the song is printed on the last frame of the film, so
       the two ends of the piece are the same fact. */
    var first = EM.ONSETS[0], last = EM.ONSETS[EM.ONSETS.length - 1];
    D.mono('note-ons ' + EM.ONSETS.length + '   first ' + first[0] + ' ms   last ' + last[0] + ' ms',
      cx, cy + 116, 13, P.silk, 'center', a * 0.75);
    D.mono('the last thing you played:  pitch ' + last[1] + '   vel ' + last[4] +
      '   ' + last[3] + ' voice' + (last[3] > 1 ? 's' : ''),
      cx, cy + 140, 14, P.pad, 'center', a * 0.9);
    D.mono('a film made of the notes you played and the words you timed', cx, EM.H - 120, 14, P.silk, 'center', a * 0.7);
    M.chrome(D, S, {});
  }

  M.hole = hole;
  M.emptyHand = emptyHand;
  M.coolMark = coolMark;
  M.echoes = echoes;
  M.undefinedVar = undefinedVar;
  M.isolation = isolation;
  M.typeError = typeError;
  M.eraseStack = eraseStack;
  M.execPlate = execPlate;
  M.countdown = countdown;
  M.molecule = molecule;
  M.algebra = algebra;
  M.handLine = handLine;
  M.heartbeat = heartbeat;
  M.purgeSeq = purgeSeq;
  M.finalExec = finalExec;
  M.titleCard = titleCard;
  M.suite = suite;
})(window.EM = window.EM || {});
