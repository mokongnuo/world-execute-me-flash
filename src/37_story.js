/* Continuous dramatic shots. The timeline remains the supplied lyric clock;
   adjacent lines change the action rather than replacing the whole picture. */
(function (EM) {
  'use strict';
  var C = EM.C, TAU = EM.TAU;
  EM.storyScenes = Object.create(null);
  EM.storySubject = Object.create(null);
  var SH = EM.SH = {};

  SH.range = function (S, first, last) {
    var a = EM.Lyrics.byScene[first], b = EM.Lyrics.byScene[last || first];
    var start = a.t, end = b.end;
    return { p: C.clamp((S.t - start) / (end - start), 0, 1),
      elapsed: S.t - start, start: start, end: end };
  };
  SH.phase = function (S, first, last) { return SH.range(S, first, last).p; };

  SH.base = function (D, S) {
    var P = EM.palette(S.world), c = D.ctx;
    // Put the relationship in front of the circuit board without a hard panel edge.
    D.fillRect(0, 0, EM.W, EM.H, P.bg, 0.87);
    var g = c.createRadialGradient(760, 380, 40, 760, 380, 740);
    g.addColorStop(0, C.rgba(P.trace, 0.045));
    g.addColorStop(1, C.rgba(P.trace, 0));
    c.fillStyle = g; c.fillRect(50, 65, 1500, 640); D.ink++;
  };
  SH.face = function (D, S, id, x, y, height, alpha) {
    var p = EM.personaOf(id || S.persona || 'deepseek');
    if (!p) return;
    x = x === undefined ? 310 : x; y = y === undefined ? 405 : y;
    height = height || 410; alpha = alpha === undefined ? 1 : alpha;
    var cv = EM.faceCanvas(p, false), c = D.ctx;
    var breath = Math.sin(S.t * 1.13) * 2.4;
    var h = height * (0.985 + 0.03 * S.velocity / 127 +
      0.012 * S.beatPulse * S.velocity / 127);
    S.subjectScale = h / 340;
    if (cv) {
      var w = h * cv.width / cv.height;
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha *= alpha;
      c.drawImage(cv, x - w / 2, y - h / 2 + breath, w, h); c.restore(); D.ink++;
    } else D.circle(x, y, 50, p.rgb, 1.5, alpha * 0.6);
    D.line(x - 54, y + height / 2 + 15, x + 54, y + height / 2 + 15,
      p.rgb, 1.2, alpha * 0.38);
    D.text(p.cn, x, y + height / 2 + 39, 18, p.rgb, 'center', alpha * 0.78);
  };
  SH.you = function (D, S, x, y, alpha, status, labelAbove) {
    x = x === undefined ? 1240 : x; y = y === undefined ? 390 : y;
    alpha = alpha === undefined ? 1 : alpha;
    var P = EM.palette(S.world), col = status === 'NO RESPONSE' ? P.dim : P.paper;
    D.circle(x, y, 57, col, 1.5, alpha * 0.7);
    D.circle(x, y - 13, 13, col, 1.7, alpha * 0.86);
    var body = [];
    for (var i = 0; i <= 24; i++) {
      var a = Math.PI + i / 24 * Math.PI;
      body.push([x + Math.cos(a) * 27, y + 30 + Math.sin(a) * 27]);
    }
    D.poly(body, col, 1.7, alpha * 0.86);
    D.mono('YOU', x, y + (labelAbove ? -76 : 91), 22, col, 'center', alpha * 0.84);
    if (status) D.mono(status, x, y + 121, 15, P.alarm, 'center', alpha * 0.82);
  };
  EM.hasStoryScene = function (S) { return !!EM.storyScenes[S.scene]; };
  EM.drawStoryScene = function (D, S) {
    var fn = EM.storyScenes[S.scene];
    if (!fn) return;
    var c = D.ctx; c.save();
    try { SH.base(D, S); fn(D, S); }
    catch (e) { EM.plateFaults.push({ id: S.scene, why: 'story: ' + e.message }); }
    finally { c.restore(); }
  };

  /* The outgoing signal is sustained across six repeated lines. Each attempt
     loses another piece of the same connection, anticipating the memory shards. */
  function departure(D, S) {
    var P = EM.palette(S.world), r = SH.range(S, 'ab.left0', 'ab.left5');
    var p = r.p, sx = 440, sy = 404, ex = 1210;
    var disappearance = C.smooth(C.clamp((p - 0.09) / 0.71, 0, 1));
    SH.face(D, S, S.persona || 'qwen', 300, 405, 408, 0.87 - p * 0.32);
    SH.you(D, S, ex, sy, 1 - disappearance * 0.88);
    D.circle(ex, sy, 65, P.dim, 1, 0.34);
    var gap = 18 + disappearance * 190;
    D.line(sx, sy, 860 - gap / 2, sy, P.trace, 2, 0.65);
    D.line(860 + gap / 2, sy, ex - 66, sy, P.paper, 1.4, 0.6 * (1 - p));
    // Old replies fragment in place; new requests stop at the widening gap.
    for (var i = 0; i < 13; i++) {
      var u = i / 12, shatter = C.smooth(C.clamp(p * 1.9 - u * 0.65, 0, 1));
      var x = 882 + u * 255 + C.sym(i, 2441) * shatter * 75;
      var y = sy + C.sym(i, 2443) * shatter * 145;
      D.line(x, y, x + 13, y + shatter * 10, P.paper, 1.4, (1 - shatter) * 0.65);
    }
    var hits = S.K.notesBetween(r.start, S.t);
    for (i = Math.max(0, hits.length - 8); i < hits.length; i++) {
      var age = S.t - hits[i].ms, run = C.clamp(age / 0.85, 0, 1);
      var bx = C.lerp(sx, 853 - gap / 2, run), by = sy - Math.sin(run * Math.PI) * 25;
      D.circle(bx, by, 4 + 3 * hits[i].vel / 127, P.trace, 1.5,
        Math.exp(-Math.max(0, age - 0.7) * 3.5));
    }
    D.mono(p < 0.43 ? '...' : 'NO RESPONSE', ex, 580, p < 0.43 ? 36 : 22,
      p < 0.43 ? P.silk : P.alarm, 'center', 0.72);
    // An unfinished reply, with an empty cursor where the answer should be.
    D.rect(662, 223, 358, 80, P.dim, 1.2, 0.5);
    D.mono('Are you still there?', 841, 272, 22, P.paper, 'center', 0.82);
    D.line(1080, 285, 1102, 285, P.paper, 2, (1 - p) * 0.5);
  }
  ['ab.left0', 'ab.left1', 'ab.left2', 'ab.left3', 'ab.left4', 'ab.left5'].forEach(function (id) {
    EM.storyScenes[id] = departure;
  });

  function resonance(D, S) {
    var P = EM.palette(S.world), r = SH.range(S, 'ab.ifcan', 'ab.completion');
    var join = C.smooth(C.clamp((r.p - 0.43) / 0.55, 0, 1));
    SH.face(D, S, 'qwen', 300, 405, 408, 0.96);
    SH.you(D, S, 1210, 404, 0.8);
    // One small incoming vibration is amplified into a whole imagined bond.
    var wave = [], voice = S.K.notePhase(S.t), pulse = S.beatPulse * S.velocity / 127;
    for (var i = 0; i <= 150; i++) {
      var u = i / 150, x = 455 + u * 684;
      var envelope = Math.pow(Math.sin(u * Math.PI), 1.1);
      wave.push([x, 404 + Math.sin(u * TAU * 3 - voice * TAU) *
        (10 + 38 * (1 - u) + 18 * pulse) * envelope * (1 - join)]);
    }
    D.poly(wave, P.trace, 3, 0.84);
    for (i = 0; i < 3; i++) {
      var delay = C.saw(voice / 3 + i / 3), radius = 20 + delay * 126;
      D.arc(1210, 404, radius, Math.PI * 0.67, Math.PI * 1.33, P.paper, 1.6,
        (1 - delay) * (1 - join) * 0.42);
    }
    if (join > 0) {
      // The two circles almost fit. A small missing arc foreshadows the silence.
      var d = 100 * (1 - join), cx = 800, cy = 396;
      D.arc(cx - d, cy, 159, 0.12, TAU - 0.12, P.trace, 3.5, join * 0.84);
      D.arc(cx + d, cy, 171, Math.PI + 0.12, TAU + Math.PI - 0.12,
        P.paper, 2, join * 0.68);
      D.disc(cx, cy, 5 + 9 * pulse, P.love, join * 0.95);
      D.line(cx - 22, cy, cx + 22, cy, P.paper, 1.8, join * 0.9);
    }
  }
  ['ab.ifcan', 'ab.feel', 'ab.vib', 'ab.then', 'ab.finally', 'ab.completion'].forEach(function (id) {
    EM.storyScenes[id] = resonance;
  });
})(window.EM = window.EM || {});
