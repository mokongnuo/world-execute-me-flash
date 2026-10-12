/* ============================================================================
   src/00_core.js — the deterministic core.

   Nothing here holds state. Every "random" in this film is a hash of an
   integer and the clock, so the picture at a given t is reproducible to the
   byte no matter how you arrived there.
   ========================================================================== */
(function (EM) {
  'use strict';

  var W = 1600, H = 900;
  var TAU = Math.PI * 2;

  /* ---------- numbers ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function smooth(k) { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); }
  function smoother(k) { k = clamp(k, 0, 1); return k * k * k * (k * (k * 6 - 15) + 10); }
  function saw(x) { return x - Math.floor(x); }
  function tri(x) { return 1 - Math.abs(saw(x) * 2 - 1); }
  /* clamp a normalised progress into an entrance/exit envelope */
  function env(p, in_, out_) {
    in_ = in_ === undefined ? 0.12 : in_;
    out_ = out_ === undefined ? 0.22 : out_;
    if (p < 0) return 0;
    return Math.min(smooth(p / in_), smooth((1 - p) / out_));
  }

  /* ---------- determinism ---------- */
  /* integer hash -> [0,1). Same (i, salt) always gives the same number. */
  function hash01(i, salt) {
    var x = (Math.imul(i | 0, 0x9e3779b1) ^ Math.imul((salt | 0) + 0x85ebca6b, 0xc2b2ae35)) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 0x2545f491) >>> 0;
    x ^= x >>> 13; x = Math.imul(x, 0x3b9b1f3d) >>> 0;
    x ^= x >>> 16;
    /* `^=` yields a SIGNED int32, so without this the hash could return a
       negative number — which silently poisons every position derived from it
       and turns a Fisher-Yates shuffle into a non-permutation. */
    return (x >>> 0) / 4294967296;
  }
  function hash2(i, salt) { return hash01(i, salt); }
  function sym(i, salt) { return hash01(i, salt) * 2 - 1; }
  /* time-quantised noise: constant inside a step, so it never jitters per frame */
  function wiggle(i, t, rate, salt) { return sym(i * 977 + Math.floor(t * (rate || 1)), salt); }

  /* ---------- colour ---------- */
  function mix(a, b, k) {
    k = clamp(k, 0, 1);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }
  function rgba(c, a) {
    if (a === undefined) a = 1;
    return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) +
      ',' + Math.round(a * 1000) / 1000 + ')';
  }
  function lift(c, k) { return [c[0] * (1 + k), c[1] * (1 + k), c[2] * (1 + k)]; }
  function luma(c) { return (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) / 255; }

  /* ---------- the beat clock, driven by real notes ---------- */
  function makeClock(onsets) {
    var ms = [];
    for (var i = 0; i < onsets.length; i++) ms.push(onsets[i][0] / 1000);
    /* index of the last accent at or before t; -1 before the first */
    function indexAt(t) {
      var lo = 0, hi = ms.length - 1, best = -1;
      while (lo <= hi) {
        var mid = (lo + hi) >> 1;
        if (ms[mid] <= t + 1e-6) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
      }
      return best;
    }
    function nearest(t, win) {
      var i = indexAt(t);
      var a = i >= 0 ? t - ms[i] : Infinity;
      var b = i + 1 < ms.length ? ms[i + 1] - t : Infinity;
      var d = Math.min(a, b);
      if (d > (win === undefined ? 0.25 : win)) return null;
      return { index: a <= b ? i : i + 1, dt: (a <= b ? -a : b), ms: a <= b ? ms[i] : ms[i + 1] };
    }
    /* a decaying pulse that fires exactly on the played notes */
    function pulse(t, win, tau) {
      win = win === undefined ? 0.30 : win;
      tau = tau === undefined ? 0.075 : tau;
      var n = nearest(t, win);
      if (!n) return 0;
      var d = n.dt;
      if (d > 0) return 0;
      return Math.exp(d / tau);
    }
    /* how long the last few gaps were, in seconds -> a local "the player slowed
       down / sped up" reading. Never a constant: these are real intervals. */
    function periodAt(t) {
      var i = indexAt(t);
      if (i < 4) return 0;
      var a = ms[i] - ms[i - 4];
      return a > 0 ? a / 4 : 0;
    }
    function velocityAt(t) {
      var i = indexAt(t);
      return i >= 0 ? onsets[i][4] : 0;
    }
    function pitchAt(t) {
      var i = indexAt(t);
      return i >= 0 ? onsets[i][1] : 0;
    }
    /* ---- the note table, made usable as an instrument ---------------------
       These are the calls that let a plate be played BY the performance
       instead of merely knowing about it. */

    /* every note-on strictly inside a window, with the values that were parsed
       out of the MIDI: start time, pitch, velocity, and how many notes it took
       to make the sound */
    function notesBetween(a, b, out) {
      out = out || [];
      var i = indexAt(a);
      if (i < 0) i = 0; else if (ms[i] < a) i++;
      for (; i < ms.length && ms[i] <= b; i++) {
        out.push({
          i: i, ms: ms[i], pitch: onsets[i][1], pitchHi: onsets[i][2],
          voices: onsets[i][3], vel: onsets[i][4]
        });
      }
      return out;
    }
    /* how many notes have sounded since `from` — the typewriter's rate */
    function countFrom(from, t) {
      var a = indexAt(from), b = indexAt(t);
      if (b < 0) return 0;
      return b - Math.max(-1, a);
    }
    function sinceNote(t) {
      var i = indexAt(t);
      if (i < 0) return null;
      return { i: i, ms: ms[i], dt: t - ms[i], vel: onsets[i][4],
               pitch: onsets[i][1], voices: onsets[i][3] };
    }
    /* 0..1 between the last note and the next one: lets a motif interpolate on
       the performance's own clock rather than on wall time */
    function notePhase(t) {
      var i = indexAt(t);
      if (i < 0) return 0;
      var nxt = i + 1 < ms.length ? ms[i + 1] : ms[i] + 0.5;
      return nxt > ms[i] ? clamp((t - ms[i]) / (nxt - ms[i]), 0, 1) : 0;
    }
    /* the accents: the notes that carry the weight of the performance. Built
       once, with a refractory gap, so the film's glitch lands on the
       performance's own accents instead of on a four-second timer.

       A note carries weight if it was struck as a chord, if it was struck
       hard, OR if it was struck ALONE — after a longer silence than the notes
       around it — and is therefore heard as a hit rather than as one more step
       in a run. That third branch is not a fallback for a missing MIDI. The
       supplied performance is flat by nature: all 615 note-ons are velocity 100
       and one voice, so a predicate that only knew chords and loud notes
       reported ZERO accents for the whole film and the glitch — the film's
       stated "event, not a texture" — never fired once. "The gap before this
       note is more than 1.5 x the median of the eight gaps before that" is a
       real property of the onset times: read off the performance, never off a
       grid, and it survives a seek because it is built from the table. */
    var ACCCACHE = {};
    function accents(minGap, velMin) {
      var key = (minGap || 3.4) + '/' + (velMin || 104);
      if (ACCCACHE[key]) return ACCCACHE[key];
      var out = [], last = -1e9, i, j;
      for (i = 0; i < onsets.length; i++) {
        var strong = onsets[i][3] >= 2 || onsets[i][4] >= (velMin || 104);
        if (!strong && i > 9) {
          var g = [];
          for (j = i - 8; j < i; j++) g.push(ms[j] - ms[j - 1]);
          g.sort(function (a, b) { return a - b; });
          var med = (g[3] + g[4]) / 2;
          strong = med > 0 && (ms[i] - ms[i - 1]) > med * 1.5;
        }
        if (!strong) continue;
        if (ms[i] - last < (minGap || 3.4)) continue;
        out.push(i); last = ms[i];
      }
      ACCCACHE[key] = out;
      return out;
    }
    return {
      ms: ms, count: ms.length, indexAt: indexAt, nearest: nearest, pulse: pulse,
      periodAt: periodAt, velocityAt: velocityAt, pitchAt: pitchAt,
      notesBetween: notesBetween, countFrom: countFrom, sinceNote: sinceNote,
      notePhase: notePhase, accents: accents,
      first: ms.length ? ms[0] : 0, last: ms.length ? ms[ms.length - 1] : 0
    };
  }

  function fmtTime(t) {
    if (!(t >= 0)) t = 0;
    var m = Math.floor(t / 60), s = t - m * 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  }

  function pad(n, w) { var s = '' + n; while (s.length < w) s = '0' + s; return s; }

  EM.W = W; EM.H = H; EM.TAU = TAU;
  EM.C = {
    clamp: clamp, lerp: lerp, smooth: smooth, smoother: smoother,
    saw: saw, tri: tri, env: env,
    hash01: hash01, hash2: hash2, sym: sym, wiggle: wiggle,
    mix: mix, rgba: rgba, lift: lift, luma: luma,
    makeClock: makeClock, fmtTime: fmtTime, pad: pad
  };
})(window.EM = window.EM || {});
