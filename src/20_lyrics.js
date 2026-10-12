/* ============================================================================
   src/20_lyrics.js — the running order at runtime.

   Times come from the supplied LRC, measured. The MIDI never touches this
   file: it supplies the accents, this supplies the words, and the two stay on
   separate sources on purpose.

   HELD CUES. "(outro)" has no picture of its own — the shot before it keeps
   playing through it. `at(t)` RESOLVES a held cue away and returns the cue
   that actually owns the picture, so the renderer, the overlay and the
   verifier all see one continuous shot and no plate has to know it is being
   stretched.
   ========================================================================== */
(function (EM) {
  'use strict';
  var C0 = EM.C;

  var RAW = EM.CUES || [];
  var END = EM.AUDIO_END || 0;

  var HOLD = { 'lv.outro': true };

  var C = [];
  for (var i = 0; i < RAW.length; i++) {
    C.push({
      i: i, t: RAW[i][0], text: RAW[i][1], scene: RAW[i][2], act: RAW[i][3],
      persona: RAW[i][4] || '', repeat: RAW[i][5],
      bleed: RAW[i].length < 7 ? true : !!RAW[i][6],
      held: !!HOLD[RAW[i][2]],
      end: END, dur: 0
    });
  }
  for (i = 0; i < C.length; i++) {
    C[i].end = (i + 1 < C.length) ? C[i + 1].t : END;
    C[i].dur = Math.max(0.12, C[i].end - C[i].t);
  }
  /* an owner's span runs through every held cue that follows it */
  for (i = 0; i < C.length; i++) {
    if (C[i].held) continue;
    var j = i + 1;
    while (j < C.length && C[j].held) j++;
    if (j > i + 1) {
      C[i].end = (j < C.length) ? C[j].t : END;
      C[i].dur = Math.max(0.12, C[i].end - C[i].t);
    }
  }
  var OWNER = new Array(C.length), last = 0;
  for (i = 0; i < C.length; i++) { if (!C[i].held) last = i; OWNER[i] = last; }

  /* how many times this exact line is sung across the whole song */
  var TOTAL = Object.create(null);
  for (i = 0; i < C.length; i++) {
    var k = C[i].text.replace(/[^A-Za-z]/g, '').toUpperCase() || ('_' + C[i].scene);
    TOTAL[k] = (TOTAL[k] || 0) + 1;
  }
  function key(cue) {
    return cue.text.replace(/[^A-Za-z]/g, '').toUpperCase() || ('_' + cue.scene);
  }

  function indexAt(t) {
    if (!C.length) return -1;
    var lo = 0, hi = C.length - 1, best = 0;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (C[mid].t <= t + 1e-6) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return OWNER[best];
  }
  function at(t) { return C[indexAt(t)]; }

  var BY_SCENE = Object.create(null);
  for (i = 0; i < C.length; i++) BY_SCENE[C[i].scene] = C[i];

  /* the next cue that owns a picture, for the debug overlay */
  function next(t) {
    var i = indexAt(t) + 1;
    while (i < C.length && C[i].held) i++;
    return i < C.length ? C[i] : null;
  }

  EM.Lyrics = {
    cues: C, count: C.length, duration: END,
    at: at, indexAt: indexAt, next: next, byScene: BY_SCENE, held: HOLD,
    repeatTotal: function (cue) { return cue ? (TOTAL[key(cue)] || 1) : 1; },
    progress: function (t) { var c = at(t); return c ? C0.clamp((t - c.t) / c.dur, 0, 1) : 0; }
  };
})(window.EM = window.EM || {});
