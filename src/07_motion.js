/* ============================================================================
   src/07_motion.js — the motion and typography language.

   Three laws, taken from the brief:

     ENTRANCE   words are typed, boxes are stroked before they are lettered,
                and anything that arrives from a side arrives on a slide.
     LOOP       a sweep crosses at constant speed, gauges fill slowly, and a
                light glitch lands every few seconds. The glitch is an EVENT,
                not a texture — the frame is otherwise held perfectly still.
     EXIT       text leaves line by line, boxes retract the way they opened,
                and the gap between paragraphs is a black frame with one line
                of code in it.

   Everything here is a pure function of (t, progress), so a seek at any point
   restores the exact same typewriter state. None of it uses a timer.
   ========================================================================== */
(function (EM) {
  'use strict';
  var C = EM.C;

  /* ---------- ENTRANCE ---------- */

  /* ONE CHARACTER PER NOTE.

     The typewriter is not on a timer and not on a linear ramp: it advances
     when a note is played. The rate therefore IS the performance — dense
     passages type fast, the 13-second instrumentals type slowly, and a seek
     lands on exactly the character the note table says should be there.

     A line shorter than its own note count would never finish typing, so the
     line's own progress is kept as a floor. In every dense passage the notes
     win; the floor only ever applies to the longest words in the shortest
     cues. */
  function typedByNotes(str, t, t0, p) {
    var viaNotes = EM.clock ? EM.clock.countFrom(t0, t) : 0;
    var viaLine = Math.floor(C.clamp((p - 0.06) / 0.58, 0, 1) * str.length);
    var n = Math.max(viaNotes, viaLine);
    return str.slice(0, Math.max(0, Math.min(str.length, n)));
  }
  /* kept for lines with no cue of their own (the frame, the terminal) */
  function typed(str, p, lead) {
    var k = C.clamp((p - (lead === undefined ? 0.10 : lead)) / 0.55, 0, 1);
    return str.slice(0, Math.max(0, Math.min(str.length, Math.floor(k * str.length * 1.35))));
  }
  /* the caret that sits at the end of a typed line, blinking off the clock */
  function caret(D, str, x, y, size, col, a, t) {
    if (Math.floor(t * 3) % 2) return;
    D.fillRect(x + D.width(str, size) + 3, y - size * 0.82, size * 0.52, size, col, a);
  }
  /* slide: from `dist` to 0 across the entrance, never overshooting */
  function slide(p, dist, frac) {
    return dist * (1 - C.smooth(C.clamp(p / (frac || 0.22), 0, 1)));
  }
  /* a box that is stroked open first, and only then lettered. On the way out
     it retracts in the same order, so the two halves of the gesture match. */
  function phases(p) {
    var open = C.smooth(C.clamp(p / 0.30, 0, 1));
    var letter = C.smooth(C.clamp((p - 0.26) / 0.30, 0, 1));
    var close = C.smooth(C.clamp((1 - p) / 0.22, 0, 1));
    return { open: Math.min(open, close), letter: Math.min(letter, close), a: Math.min(open, close) };
  }
  /* draw a framed information box under that protocol.
     `from` = which end it grows from: -1 left, 1 right, 0 both. */
  function box(D, S, x, y, w, h, ph, col, from, lw) {
    if (ph.a <= 0.002) return;
    var x0 = from < 0 ? x : (from > 0 ? x + w - w * ph.open : x + w * (1 - ph.open) / 2);
    var ww = from === 0 ? w * ph.open : w * ph.open;
    D.rect(x0, y, ww, h, col, lw || 1, ph.a * 0.75);
  }

  /* ---------- LOOP ---------- */

  /* A glitch every `period` seconds. Its position inside the period comes from
     a hash of the period index, so it is never on a round number and never
     lands twice in the same place. Returns 0 for almost the whole period. */
  /* The glitch fires on the PERFORMANCE's accents — the notes that were struck
     as a chord or struck hard — with a refractory gap so they stay a few
     seconds apart. It lands where the music actually hits, and nowhere else. */
  var ACC = null;
  function glitch(t, len) {
    if (!ACC && EM.clock) ACC = EM.clock.accents(3.4, 104);
    if (!ACC || !ACC.length) return { on: 0, seed: 0 };
    len = (len === undefined ? 0.19 : len);
    var lo = 0, hi = ACC.length - 1, best = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (EM.clock.ms[ACC[mid]] <= t) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    if (best < 0) return { on: 0, seed: 0 };
    var idx = ACC[best], ms = EM.clock.ms[idx], age = t - ms;
    if (age < 0 || age > len) return { on: 0, seed: best };
    /* a hard note tears harder than a soft one */
    var amp = (EM.ONSETS[idx][4] / 127) * (1 + 0.35 * (EM.ONSETS[idx][3] - 1));
    return { on: Math.sin(age / len * Math.PI) * C.clamp(amp, 0.3, 1.4), seed: best, idx: idx };
  }

  /* the sweep: constant speed, top to bottom, so it reads as a device and not
     as a reaction to anything */
  function scanY(t, period) {
    return C.saw(t / (period || 7.6)) * (EM.H + 160) - 80;
  }
  /* a gauge that fills slowly and then resets — quantised, so it steps */
  function gauge(t, period, steps) {
    steps = steps || 24;
    return Math.floor(C.saw(t / period) * steps) / steps;
  }
  /* a readout that jumps rather than counts, but jumps to a REAL value:
     the value is passed in, only its quantisation is theatrical. */
  function jumpy(v, t, salt) {
    var q = C.hash01(Math.floor(t * 7) + (salt | 0), 701);
    return q < 0.5 ? v : v;
  }

  /* ---------- EXIT ---------- */

  /* lines leave one at a time, the first line first */
  function lineOut(p, index, count) {
    var span = 0.34 / Math.max(1, count);
    var start = 1 - 0.34 - index * span;
    return C.smooth(C.clamp((p - start) / span, 0, 1));
  }
  /* the code line that lives in the black between paragraphs */
  function intertitle(t, cue, dur) {
    dur = dur || 0.30;
    var age = t - cue.t;
    if (age > dur) return null;
    return { a: Math.sin(C.clamp(age / dur, 0, 1) * Math.PI), seed: cue.i };
  }

  EM.MO = {
    typed: typed, caret: caret, slide: slide, phases: phases, box: box,
    typedByNotes: typedByNotes,
    glitch: glitch, scanY: scanY, gauge: gauge, jumpy: jumpy,
    lineOut: lineOut, intertitle: intertitle
  };
})(window.EM = window.EM || {});
