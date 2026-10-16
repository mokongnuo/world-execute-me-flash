/* ============================================================================
   src/15_sceneapi.js — the plate registry and the cross-fade protocol.

   A plate is a function of (draw, state). It owns no memory between frames and
   reads nothing but `state`. If it throws, the fault is recorded and the loop
   carries on — one bad plate must never poison the whole film.
   ========================================================================== */
(function (EM) {
  'use strict';
  var C = EM.C;

  var PLATES = Object.create(null);
  var FAULTS = [];

  function Plate(id, fn) {
    if (PLATES[id]) FAULTS.push({ id: id, why: 'registered twice' });
    PLATES[id] = fn;
  }

  /* state handed to every plate. Built fresh each frame, from `t` alone. */
  function state(t) {
    var L = EM.Lyrics;
    var cue = L.at(t);
    var K = EM.clock;
    var p = cue ? C.clamp((t - cue.t) / cue.dur, 0, 1) : 0;
    return {
      t: t, p: p, cue: cue, scene: cue ? cue.scene : '', act: cue ? cue.act : '',
      text: cue ? cue.text : '', dur: cue ? cue.dur : 0,
      repeat: cue ? cue.repeat : 0,
      total: cue ? L.repeatTotal(cue) : 1,
      persona: cue ? cue.persona : '',
      worn: (cue && cue.persona) ? EM.personaOf(cue.persona) : null,
      index: L.indexAt(t),
      line: L.progress(t),
      world: EM.world(t),
      K: K, EM: EM, W: EM.W, H: EM.H,
      /* real readings, all of them traceable to the inputs */
      beat: K.indexAt(t),
      beatPulse: K.pulse(t, 0.3, 0.075),
      beatPeriod: K.periodAt(t),
      tempo: K.periodAt(t) > 0 ? 60 / K.periodAt(t) : 0,
      pitch: K.pitchAt(t),
      velocity: K.velocityAt(t),
      onset: K.nearest(t, 0.4),
      breath: EM.breath(t),
      hash: C.hash01,
      sym: C.sym
    };
  }

  /* how far into a line's entrance we are; used to fade a plate in and out */
  function alphaOf(p) { return C.env(p, 0.14, 0.26); }

  /* --------------------------------------------------------------------------
     THE BEAT WARP.

     The frame never moves. What moves is the pattern inside it, and it moves
     using the three values that were parsed out of the MIDI and baked into
     assets/onsets.js:

       onset time -> when the deformation happens. `beatPulse` is exp(dt/tau)
                     from the last REAL note-on, so it fires on the
                     performance, not on a metronome.
       velocity   -> how hard the deformation is. A soft note barely stirs.
       pitch      -> which way it goes. Low notes stretch the pattern
                     vertically, high notes stretch it horizontally.

     The pivot is the centre of the stage, and the warp is applied around the
     plate only — the board, the sockets and the registers stay put, because a
     picture that shakes cannot be read.
     ------------------------------------------------------------------------ */
  function beatWarp(D, S, amount) {
    var k = S.beatPulse;                       /* timing  — from the onset   */
    var v = S.velocity / 127;                  /* strength — from the MIDI   */
    var p = C.clamp((S.pitch - EM.MIDI.pitchLo) /
                    Math.max(1, EM.MIDI.pitchHi - EM.MIDI.pitchLo), 0, 1);
    var a = k * v * (amount === undefined ? 1 : amount);
    if (a < 0.002) return 0;
    var c = D.ctx;
    c.save();
    c.translate(EM.W / 2, EM.H / 2);
    /* pitch chooses the axis: 0 = tall, 1 = wide */
    var sx = 1 + a * (p - 0.35) * 0.075;
    var sy = 1 - a * (p - 0.35) * 0.075;
    c.scale(sx, sy);
    c.rotate(a * (0.5 - p) * 0.030);
    c.translate(-EM.W / 2, -EM.H / 2);
    return 1;
  }
  function endWarp(D, on) { if (on) D.ctx.restore(); }

  function safe(id, D, S, alpha) {
    var fn = PLATES[id];
    if (!fn) return false;
    var c = D.ctx;
    c.save();
    c.globalAlpha = alpha;
    try {
      fn(D, S);
    } catch (e) {
      FAULTS.push({ id: id, why: String(e && e.message || e) });
      c.restore();
      return false;
    }
    c.restore();
    return true;
  }

  /* Draw the shot at t. `bleed` plates fade out THROUGH the next one so a line
     boundary is never an empty frame; a plate whose picture IS the sung word
     is cut instead (cues.js carries that flag). */
  /* `S` may be handed in by the caller so that the board and the plate share
     ONE state object — the plate needs the live joint count, and the board is
     what computes it. Passing it keeps both halves describing the same frame. */
  function drawSequence(D, t, S) {
    var L = EM.Lyrics;
    S = S || state(t);
    var cue = S.cue;
    if (!cue) return;

    // Hold the restored chat and warning field through the final audio frame.
    // A normal lyric envelope would fade away the story's last image.
    if (cue.scene === 'xs.final') { safe(cue.scene, D, S, 1); return; }

    var c = D.ctx;

    /* the outgoing shot */
    var pi = cue.i - 1;
    if (pi >= 0 && L.cues[pi] && L.cues[pi].bleed &&
        !(EM.storyScenes && EM.storyScenes[L.cues[pi].scene])) {
      var out = Math.exp(-Math.max(0, t - cue.t) / 0.30);
      if (out > 0.01) {
        var on0 = beatWarp(D, S, 0.45);
        safe(L.cues[pi].scene, D, S, out * 0.85);
        endWarp(D, on0);
      }
    }

    /* ---- THE SEAM MORPH ----------------------------------------------------
       A cross-fade on its own is two pictures overlapping, and two pictures
       overlapping do not read as a change of state — they read as a dissolve
       in a slide show. What makes a line change read as ONE object deforming
       is a short morph phase on the seam: the incoming shot arrives a little
       small and a little turned, about the centre of the stage, where the
       viewer is already looking, and settles back. Borrowed from the sibling
       implementation of this song (see the transition notes in HANDOFF.md).

       It is a pure function of the cue's own progress, so a seek restores it,
       and it is applied to the PLATE only — the frame, the board and the
       sockets stay exactly where they were. */
    var kMorph = C.smooth(C.clamp((t - cue.t) / 0.5, 0, 1));
    var mm = 1 - kMorph;
    var c2 = D.ctx;
    var morphing = mm > 0.004;
    if (morphing) {
      c2.save();
      c2.translate(EM.W / 2, EM.H / 2);
      c2.scale(1 - 0.075 * mm, 1 - 0.075 * mm);
      c2.rotate(0.019 * mm * (cue.i % 2 ? 1 : -1));
      c2.translate(-EM.W / 2, -EM.H / 2);
    }
    var on = beatWarp(D, S, 1);
    safe(cue.scene, D, S, alphaOf(S.p));
    endWarp(D, on);
    if (morphing) c2.restore();
  }

  EM.Plate = Plate;
  EM.plates = PLATES;
  EM.plateFaults = FAULTS;
  EM.state = state;
  EM.drawSequence = drawSequence;
  EM.alphaOf = alphaOf;
  EM.beatWarp = beatWarp;
  EM.endWarp = endWarp;
})(window.EM = window.EM || {});
