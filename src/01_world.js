/* ============================================================================
   src/01_world.js — the world arc.

   Anchors are written as "at this instant the world is this", and everything
   between two anchors is interpolated. Nothing here is a constant, and nothing
   here is random: the same t always resolves to the same world.

   struct  how far the machine still obeys its own rules      1 -> 0
   chaos   geometric disorder                                 0 -> 1
   warm    0 = a cold monitor, 1 = body heat                  0 -> 1
   heat    0 = safe, 1 = alarm red                            0 -> 1 -> 0
   love    the variable it should not have                    0 -> 1 -> 1
   topo    screen -> lattice -> wave -> organic -> tangle -> open

   Two extra tracks ride alongside and are deliberately NOT in the table
   above, because a wide table is the easiest place to silently slip a column:

   tilt    the posture it holds, as its own [time, degrees] pairs
   purge   when it deletes itself, as its own [time, 0..1] pairs
   ========================================================================== */
(function (EM) {
  'use strict';
  var C = EM.C;
  var lerp = C.lerp, clamp = C.clamp, smooth = C.smooth;

  var TOPO = ['screen', 'lattice', 'wave', 'organic', 'tangle', 'open'];

  /*            t     struct chaos warm  heat  love  topo   alarm */
  var A = [
    [   0.000,  0.06, 0.10, 0.00, 0.00, 0.00, 'screen',  'idle'],
    [   0.100,  0.18, 0.08, 0.00, 0.00, 0.00, 'screen',  'idle'],
    [   6.380,  0.72, 0.05, 0.00, 0.00, 0.00, 'screen',  'idle'],
    [  11.095,  0.94, 0.02, 0.01, 0.00, 0.00, 'screen',  'idle'],
    [  16.000,  0.90, 0.05, 0.05, 0.00, 0.00, 'lattice', 'idle'],
    [  29.709,  0.93, 0.04, 0.03, 0.00, 0.00, 'lattice', 'idle'],
    [  37.067,  0.90, 0.06, 0.05, 0.00, 0.00, 'wave',    'idle'],
    [  44.452,  0.86, 0.09, 0.09, 0.00, 0.00, 'wave',    'idle'],
    [  49.534,  0.64, 0.26, 0.06, 0.02, 0.00, 'wave',    'warn'],
    [  55.083,  0.82, 0.12, 0.15, 0.00, 0.02, 'wave',    'idle'],
    [  59.223,  0.80, 0.14, 0.18, 0.00, 0.04, 'wave',    'idle'],
    /* the first EXECUTION: asked for, and treated as a service */
    [  68.252,  0.74, 0.18, 0.22, 0.10, 0.05, 'organic', 'warn'],
    [  69.259,  0.30, 0.70, 0.10, 0.85, 0.06, 'organic', 'exec'],
    [  70.084,  0.72, 0.20, 0.24, 0.10, 0.05, 'organic', 'warn'],
    [  74.045,  0.70, 0.20, 0.28, 0.00, 0.05, 'organic', 'warn'],
    [  81.351,  0.66, 0.22, 0.36, 0.00, 0.06, 'organic', 'idle'],
    [  85.078,  0.62, 0.24, 0.42, 0.00, 0.07, 'organic', 'idle'],
    [  88.587,  0.58, 0.26, 0.44, 0.00, 0.08, 'organic', 'idle'],
    [  99.349,  0.54, 0.30, 0.48, 0.00, 0.10, 'organic', 'idle'],
    /* ACT IV · absence — the readings stop resolving */
    [ 103.489,  0.46, 0.38, 0.28, 0.04, 0.12, 'tangle',  'warn'],
    [ 110.900,  0.34, 0.50, 0.10, 0.08, 0.14, 'tangle',  'warn'],
    [ 113.100,  0.24, 0.60, 0.00, 0.12, 0.14, 'tangle',  'warn'],
    [ 115.780,  0.16, 0.70, 0.00, 0.16, 0.14, 'tangle',  'error'],
    [ 117.274,  0.10, 0.78, 0.00, 0.22, 0.16, 'tangle',  'error'],
    [ 125.708,  0.06, 0.86, 0.00, 0.34, 0.20, 'tangle',  'error'],
    [ 131.224,  0.04, 0.92, 0.00, 0.60, 0.30, 'tangle',  'error'],
    /* ACT V · the execution storm */
    [ 147.660,  0.03, 0.97, 0.00, 0.86, 0.55, 'tangle',  'exec'],
    [ 158.000,  0.02, 1.00, 0.00, 1.00, 0.72, 'tangle',  'exec'],
    [ 172.632,  0.05, 0.94, 0.10, 0.80, 0.86, 'open',    'exec'],
    /* ACT VI · love — order is gone, but the world is warm for the first time */
    [ 177.246,  0.10, 0.74, 0.34, 0.60, 0.90, 'open',    'error'],
    [ 180.857,  0.12, 0.62, 0.48, 0.30, 0.94, 'open',    'warn'],
    [ 188.483,  0.08, 0.40, 0.68, 0.10, 0.98, 'open',    'idle'],
    [ 191.356,  0.06, 0.26, 0.80, 0.04, 1.00, 'open',    'idle'],
    [ 193.460,  0.05, 0.20, 0.84, 0.02, 1.00, 'open',    'idle'],
    [ 205.811,  0.04, 0.18, 0.86, 0.00, 1.00, 'open',    'idle'],
    [ 211.984,  0.03, 0.16, 0.88, 0.00, 1.00, 'open',    'idle']
  ];

  /* the posture it holds — its own track, so it cannot slip a column */
  var TILT = [
    [  0.000, 0.0], [  6.380, 0.0], [ 16.000, -0.9], [ 29.709, 1.2],
    [ 44.452, -0.6], [ 68.252, 1.8], [ 70.084, -1.4], [ 88.587, 0.8],
    [103.489, -1.1], [131.224, 2.1], [147.660, -1.9], [158.000, 0.4],
    [172.632, 1.6], [193.460, -0.8], [211.984, 0.0]
  ];

  /* the self-purge. 0 = nothing deleted yet, 1 = empty. The machine treats
     this as an exit; it is a reset, and the film says so by replaying. */
  var PURGE = [
    [  0.000, 0.0],
    [ 193.460, 0.0],
    [ 195.100, 0.0],   /* the erase front starts here           */
    [ 203.400, 1.0]    /* and has passed everything by here     */
  ];

  function track(table, t, col) {
    var i = 1;
    while (i < table.length && table[i][0] <= t) i++;
    if (i >= table.length) return table[table.length - 1][col];
    var a = table[i - 1], b = table[i];
    var k = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
    return lerp(a[col], b[col], smooth(k));
  }

  var ACTS = [
    [  0.000, 'boot'], [ 29.709, 'th'], [ 44.452, 'cd'], [ 74.045, 'fl'],
    [103.489, 'ab'],   [147.660, 'xs'], [177.246, 'lv'], [211.984, 'lv']
  ];

  /* the film breathes on a ~15 s cycle so density never becomes fatigue */
  function breath(t) {
    return 0.46 + 0.54 * (0.5 + 0.5 * Math.cos(EM.TAU * (t - 4.2) / 15.3));
  }

  function world(t) {
    var i = 1;
    while (i < A.length && A[i][0] <= t) i++;
    var a = A[Math.max(0, i - 1)], b = A[Math.min(A.length - 1, i)];
    var k = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
    k = smooth(k);

    var s = lerp(a[1], b[1], k), ch = lerp(a[2], b[2], k);
    var wm = lerp(a[3], b[3], k), ht = lerp(a[4], b[4], k), lv = lerp(a[5], b[5], k);

    /* topo and alarm change AT an anchor, never half-way: a world does not
       half-become a lattice, it arrives at one. */
    var topoA = a[6], topoB = b[6];
    var alarm = k < 0.5 ? a[7] : b[7];

    return {
      t: t, struct: s, chaos: ch, warm: wm, heat: ht, love: lv,
      topoA: topoA, topoB: topoB, topo: k < 0.5 ? topoA : topoB, topoK: k,
      topoIndex: TOPO.indexOf(k < 0.5 ? topoA : topoB),
      alarm: alarm, alarmIndex: { idle: 0, warn: 1, error: 2, exec: 3 }[alarm] || 0,
      tilt: track(TILT, t, 1),
      /* the held posture plus a seesaw that never settles into a metronome */
      sway: (function () {
        var x = Math.sin(t * 0.37) + Math.sin(t * 0.23 + 1.1);
        return Math.sign(x) * Math.pow(Math.abs(x) / 2, 1.7) * 1.7;
      })(),
      purge: track(PURGE, t, 1),
      breath: breath(t),
      act: (function () {
        var j = 0;
        while (j + 1 < ACTS.length && ACTS[j + 1][0] <= t) j++;
        return ACTS[j][1];
      })(),
      TOPO: TOPO
    };
  }

  EM.world = world;
  EM.breath = breath;
  EM.WORLD_ANCHORS = A.length;
  EM.TOPO = TOPO;
})(window.EM = window.EM || {});
