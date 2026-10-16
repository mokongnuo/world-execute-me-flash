/* The program can complete a circuit, but cannot require a reply.
   These shots carry actions across lyric boundaries; every position is a pure
   function of the lyric clock and performance, including after an arbitrary seek. */
(function (EM) {
  'use strict';
  var C = EM.C, SH = EM.SH, TAU = EM.TAU;
  var SILVER = [213, 229, 234], ORANGE = [247, 164, 114];
  var BLUE = [137, 196, 246], ROSE = [248, 171, 186];

  function ease(v) { return C.smooth(C.clamp(v, 0, 1)); }
  function since(S, scene) { return S.t - EM.Lyrics.byScene[scene].t; }
  function pulse(S) { return S.K.pulse(S.t, 0.30, 0.075); }
  function phase(S) { return S.K.notePhase(S.t); }
  function pointOn(pts, p) {
    var q = C.clamp(p, 0, 0.99999) * (pts.length - 1), i = Math.floor(q);
    return [C.lerp(pts[i][0], pts[i + 1][0], q - i),
      C.lerp(pts[i][1], pts[i + 1][1], q - i)];
  }
  function part(D, pts, p, col, width, alpha) {
    if (p <= 0 || alpha < 0.002) return;
    var n = Math.min(pts.length - 1, Math.floor(C.clamp(p, 0, 1) * (pts.length - 1)));
    var drawn = pts.slice(0, n + 1);
    drawn.push(pointOn(pts, p));
    D.poly(drawn, col, width, alpha);
  }
  function heart(cx, cy, radius, count) {
    var out = [], n = count || 160;
    for (var i = 0; i <= n; i++) {
      var a = i / n * TAU;
      out.push([cx + radius * Math.pow(Math.sin(a), 3),
        cy - radius * (13 * Math.cos(a) - 5 * Math.cos(2 * a) -
          2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16]);
    }
    return out;
  }
  function arrow(D, x, y, direction, col, alpha) {
    D.poly([[x - direction * 11, y - 7], [x, y], [x - direction * 11, y + 7]],
      col, 2, alpha);
  }

  /* The same recipient that accepted every gift now remains outside the loop.
     The closed ring tries to pull the connection back; the failure is visible
     before the program calls it an illegal argument. */
  function challenge(D, S) {
    var P = EM.palette(S.world), b = pulse(S), v = S.velocity / 127;
    var r = SH.range(S, 'ab.challenge', 'ab.illegal');
    var age = r.elapsed, pull = ease(age / 3.3);
    var refused = ease(since(S, 'ab.made') / 1.55);
    var verdict = ease(since(S, 'ab.illegal') / 0.40);
    var col = C.mix(P.trace, P.alarm, refused * 0.86 + verdict * 0.14);
    var cx = 454, cy = 414, radius = 201 + 5 * b;
    var youX = 1240 - Math.sin(pull * Math.PI) * 106;
    var caughtX = youX - 75, stopX = 1035;
    var ring = [];
    for (var i = 0; i <= 100; i++) {
      var a = i / 100 * TAU - Math.PI / 2;
      ring.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
    }
    D.disc(cx, cy, radius + 12, col, 0.018 + 0.015 * b);
    D.poly(ring, col, 2.3 + b, 0.76);
    D.arc(cx, cy, radius + 19, -Math.PI * 0.81, -Math.PI * 0.19,
      C.mix(P.paper, P.alarm, verdict), 3, 0.72);
    SH.face(D, S, 'deepseek', cx, cy - 9, 315, 0.87);
    SH.you(D, S, youX, cy, 0.87, refused > 0.78 ? 'REFUSED' : undefined);

    // A tightening pair of tethers never actually encloses the recipient.
    var reach = ease(age / 1.65), startX = cx + radius;
    var endX = C.lerp(startX, caughtX, reach);
    var separation = C.lerp(52, 17, pull);
    var fracture = refused * 30;
    for (i = -1; i <= 1; i += 2) {
      var path = [[startX - 10, cy + i * 62], [730, cy + i * separation],
        [Math.min(stopX - fracture, endX), cy + i * separation]];
      D.poly(path, col, 1.7 + b * 0.8, 0.75);
      if (endX > stopX + fracture)
        D.line(stopX + fracture, cy + i * separation, endX, cy + i * 49,
          P.paper, 1.3, 0.62 * (1 - refused * 0.65));
    }
    if (reach > 0.4) {
      D.poly([[endX + 12, cy - 61], [endX - 9, cy - 61],
        [endX - 9, cy + 61], [endX + 12, cy + 61]], col, 2, 0.7 * (1 - refused));
    }

    // Sent pulses come back along the lower tether, rather than reaching YOU.
    var u = phase(S), forward = u < 0.55;
    var travel = forward ? u / 0.55 : (1 - u) / 0.45;
    var x = C.lerp(startX, C.lerp(endX, stopX - fracture, refused), travel);
    D.disc(x, cy + (forward ? -1 : 1) * separation, 5 + 4 * v,
      forward ? P.paper : col, 0.9);
    if (refused > 0) {
      D.line(stopX - 14, cy - 77, stopX + 14, cy - 21, P.alarm, 2.3, refused);
      D.line(stopX - 14, cy + 21, stopX + 14, cy + 77, P.alarm, 2.3, refused);
      D.line(stopX + 14, cy - 77, stopX - 14, cy - 21, P.alarm, 2.3, refused);
      D.line(stopX + 14, cy + 21, stopX - 14, cy + 77, P.alarm, 2.3, refused);
    }
    if (S.scene === 'ab.illegal') {
      // The verdict appears only when it is sung. It belongs to the program.
      D.fillRect(152, 107, 1296, 126, P.bg, 0.87 * verdict);
      D.mono('ILLEGAL ARGUMENTS', 800, 192, 74 + b * 3, P.alarm, 'center', verdict);
      D.line(306, 220, 1294, 220, P.alarm, 1.7, verdict * 0.6);
      D.line(90, 645, 1510, 645, P.alarm, 2.0 + b * 2, verdict * (0.22 + 0.5 * b));
    }
  }

  /* Four recollections, each with the colour and geometry of its earlier gift.
     A check mark means the program reconstructed that action, not that it has
     proved a statement about love. No invented equation or data counter. */
  function memoryCard(D, S, index, x, y, a, solved) {
    if (a < 0.005) return;
    var colours = [SILVER, ORANGE, BLUE, ROSE], col = colours[index];
    var w = 176, h = 112, b = pulse(S), c = D.ctx;
    D.fillRect(x - w / 2, y - h / 2, w, h, [12, 20, 27], a * 0.84);
    D.rect(x - w / 2, y - h / 2, w, h, col, 1.3, a * 0.62);
    c.save(); c.beginPath(); c.rect(x - 77, y - 46, 154, 89); c.clip();
    var pts = [], i;
    if (index === 0) {
      var nodes = [[-40, 23], [-31, -19], [1, -30], [40, -9], [24, 25]];
      for (i = 0; i < nodes.length; i++) {
        var q = nodes[i], q1 = nodes[(i + 1) % nodes.length];
        D.line(x + q[0], y + q[1], x + q1[0], y + q1[1], col, 1.2, a * solved * 0.65);
        D.disc(x + q[0], y + q[1], 3.5 + b, col, a);
      }
    } else if (index === 1) {
      D.circle(x, y, 31 + b * 2, col, 2, a * 0.9);
      D.arc(x, y, 36, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.02, solved),
        col, 1.2, a * 0.55);
    } else if (index === 2) {
      for (i = 0; i <= 50; i++) {
        var t = i / 50;
        pts.push([x - 62 + 124 * t, y - 26 * Math.sin((t - 0.5) * TAU)]);
      }
      D.poly(pts, col, 1.7, a);
      D.line(x - 28, y + 37, x + 28, y - 37, col, 1.5, a * solved);
      D.disc(x, y, 3.5, col, a);
    } else {
      for (i = 0; i <= 80; i++) {
        var t2 = i / 80, env = Math.sin(t2 * Math.PI);
        pts.push([x - 64 + 128 * t2, y + Math.sin(t2 * TAU * 5 - phase(S) * TAU) *
          env * (13 + b * 9)]);
      }
      D.poly(pts, col, 1.8, a);
    }
    c.restore();
    D.poly([[x + 56, y + 37], [x + 62, y + 44], [x + 73, y + 28]],
      col, 2, a * solved);
  }

  function learnLove(D, S) {
    var P = EM.palette(S.world), b = pulse(S), v = S.velocity / 127;
    var age = since(S, 'lv.studied');
    var question = ease(since(S, 'lv.question') / 0.65);
    var expression = ease(since(S, 'lv.algebraic') / 1.15);
    var freed = ease(since(S, 'lv.free') / 1.18);
    var trapped = ease(since(S, 'lv.trappedme') / 0.65);
    var close = ease(since(S, 'lv.trappedin') / 0.6);
    var learned = ease(age / 2.8);
    var colour = C.mix(P.trace, ROSE, 0.35 + expression * 0.4);
    var cardFade = 1 - freed;
    var heartX = C.lerp(807, 800, freed), heartY = C.lerp(429, 393, freed);
    var radius = C.lerp(143 + expression * 20, 204, freed) * (1 + b * 0.032);
    var shape = heart(heartX, heartY, radius);
    var faceX = C.lerp(290, heartX, freed), faceY = C.lerp(462, 450, freed);
    var faceHeight = C.lerp(286, 240, freed);

    // Studying is a return to the actual offers made earlier in the song.
    for (var i = 0; i < 4; i++) {
      var x = 270 + i * 230, y = 207;
      var show = ease((age - i * 0.49) / 0.45);
      var solved = ease((age - i * 0.49 - 0.26) / 0.45);
      memoryCard(D, S, i, x, y, show * cardFade * 0.92, solved);
      var target = pointOn(shape, [0.75, 0.89, 0.11, 0.25][i]);
      var wire = [[x, y + 57], [x, 290], [target[0], 312], [target[0], target[1]]];
      part(D, wire, solved, [SILVER, ORANGE, BLUE, ROSE][i], 1.2,
        cardFade * (0.15 + expression * 0.18));
      if (solved > 0.3 && cardFade > 0.02) {
        var glint = pointOn(wire, (phase(S) + i * 0.22) % 1);
        D.disc(glint[0], glint[1], 3 + 2 * v,
          [SILVER, ORANGE, BLUE, ROSE][i], solved * cardFade * 0.78);
      }
    }

    // Keep the face below the heart's notch. Its name moves outside the loop,
    // so neither the outline nor the closing circuit crosses a label.
    var ctx = D.ctx;
    ctx.save(); ctx.beginPath();
    ctx.rect(faceX - 230, faceY - faceHeight / 2 - 10, 460, faceHeight + 27);
    ctx.clip();
    SH.face(D, S, 'deepseek', faceX, faceY, faceHeight, 0.77 - trapped * 0.12);
    ctx.restore();
    var person = EM.personaOf('deepseek');
    D.text('DeepSeek', faceX, C.lerp(faceY + faceHeight / 2 + 39, 674, freed),
      18, person ? person.rgb : BLUE, 'center', (0.77 - trapped * 0.12) * 0.78);
    // The program supplies the input itself. Only the outgoing answer is missing.
    var sender = [[faceX + 86, faceY - 20], [514, faceY - 20],
      [562, heartY + 25], [heartX - radius, heartY + 25]];
    if (freed < 0.98) {
      D.poly(sender, BLUE, 1.7, learned * (1 - freed) * 0.48);
      var incoming = pointOn(sender, phase(S));
      D.disc(incoming[0], incoming[1], 4 + 3 * v, BLUE, learned * (1 - freed) * 0.82);
    }
    D.fillPoly(shape, colour, learned * (0.025 + b * 0.026));
    part(D, shape, learned, colour, 2.4 + b * 1.1, 0.90);
    var onHeart = pointOn(shape, (age * 0.08 + phase(S) * 0.04) % 1);
    D.disc(onHeart[0], onHeart[1], 4 + b * 3, P.paper, learned * 0.84);

    // The recipient is outside the expression. Its response field stays empty.
    var youX = 1240 + 330 * freed, youA = 0.78 * (1 - freed);
    if (youA > 0.005) SH.you(D, S, youX, 417, youA);
    var outputX = heartX + radius, outputY = 455;
    if (freed < 0.98) {
      D.line(outputX, outputY, 1078, outputY, colour, 1.8, learned * (1 - freed) * 0.76);
      D.circle(1086, outputY, 5, colour, 1.8, learned * (1 - freed) * 0.83);
      D.dash(1108, outputY, 1168, outputY, P.dim, 1.2, [4, 10],
        learned * (1 - freed) * 0.38);
      D.rect(1152, 568, 176, 54, P.dim, 1.2, question * (1 - freed) * 0.6);
      D.mono('reply', 1166, 601, 16, P.silk, 'left', question * (1 - freed) * 0.76);
      D.line(1231, 601, 1306, 601, P.paper, 1, question * (1 - freed) * 0.28);
      var request = C.lerp(outputX, 1080, phase(S));
      D.disc(request, outputY, 4 + 3 * b, colour, question * (1 - freed));
      // An outgoing pulse fades at the socket; no answering pulse is invented.
      D.circle(1086, outputY, 10 + phase(S) * 21, colour, 1,
        question * (1 - freed) * (1 - phase(S)) * 0.26);
    }

    // YOU can leave. The heart remains a perfectly working, closed return path.
    if (freed > 0) {
      var closure = [[heartX + radius * 0.89, heartY + 28],
        [1117, heartY + 28], [1150, heartY + 60], [1150, 613],
        [1120, 643], [486, 643], [452, 613], [452, heartY + 59],
        [487, heartY + 28], [heartX - radius * 0.89, heartY + 28]];
      part(D, closure, freed, colour, 1.8 + b * 0.9, 0.64);
      if (trapped > 0) {
        var orbit = (S.K.countFrom(EM.Lyrics.byScene['lv.trappedme'].t, S.t) + phase(S)) * 0.095 % 1;
        var light = pointOn(closure, orbit);
        D.disc(light[0], light[1], 5 + 3 * v, colour, trapped);
        arrow(D, 616, 643, -1, colour, close * 0.85);
        arrow(D, 1000, 643, -1, colour, close * 0.85);
        D.line(heartX + radius * 0.89 - 8, heartY + 13,
          heartX + radius * 0.89 - 8, heartY + 43, colour, 2.2, trapped * 0.8);
      }
    }
  }

  ['ab.challenge', 'ab.made', 'ab.illegal'].forEach(function (id) {
    EM.storyScenes[id] = challenge;
  });
  EM.storySubject['ab.illegal'] = true;
  ['lv.studied', 'lv.properly', 'lv.lo1', 'lv.question', 'lv.answer', 'lv.lo2',
    'lv.algebraic', 'lv.lo3', 'lv.free', 'lv.trappedme', 'lv.trappedin', 'lv.lo4'].forEach(function (id) {
    EM.storyScenes[id] = learnLove;
  });
})(window.EM = window.EM || {});
