/* ============================================================================
   src/05_persona_grammar.js — nine shapes of mind.

   A borrowed face is not a tint and not a sticker. While a face is worn, the
   board stops drawing its own geometry and starts drawing HERS: her curve
   budget, her signature figure, her law. That is the fusion — the picture
   changes its vocabulary with the identity, and the identity is a borrowed one.

   Each entry carries three things:

     trait   the figure she draws
     curve   how far she is allowed to bend the board's orthogonal language
             0 = routed like a circuit board, 1 = drawn like a hand
     law     one line, printed on screen while she is worn. It is her reading
             of what is happening, in her own register — not the film's voice.

   The law is shown because the machine is borrowing the face AND the opinion.
   ========================================================================== */
(function (EM) {
  'use strict';
  var C = EM.C, TAU = EM.TAU;

  /* The grammars are written as `var P = P_()` because each one already has
     the state as `S`. Caching the palette for the duration of one synchronous
     call keeps that call shape while still being a pure function of the state:
     the cache is written and read inside a single draw, never across frames. */
  var PAL = null;
  function P_(S) { if (S) PAL = EM.palette(S.world); return PAL; }

  /* every figure is drawn around the centre of the stage, behind the plate,
     and every figure answers the notes: `k` is the live beat pulse. */
  var G = {

    /* 鲸 —— it answers with a body, not an argument. */
    deepseek: {
      trait: 'whale', curve: 0.9,
      law: 'if I am a body, then I will give you my weight',
      draw: function (D, S, o) {
        var P = P_(), a = o.a, cx = o.cx, cy = o.cy, R = o.R;
        var k = S.beatPulse;
        for (var i = 0; i < 7; i++) {
          var y = cy - R * 0.9 + i * (R * 1.8 / 6);
          var pts = [];
          for (var j = 0; j <= 60; j++) {
            var x = cx - R * 1.5 + 3 * R * j / 60;
            pts.push([x, y + Math.sin(j / 60 * TAU * 1.4 + S.t * 0.42 + i * 0.5) * 16]);
          }
          D.poly(pts, P.trace, 1, a * (0.10 + 0.18 * (1 - i / 7)));
        }
        /* the fluke: the one shape that is unmistakably a whale */
        var by = cy + R * 0.55, s = R * 0.55 * (1 + 0.06 * k);
        var tail = [
          [cx - s, by - s * 0.5], [cx - s * 0.30, by + s * 0.06],
          [cx, by - s * 0.30], [cx + s * 0.30, by + s * 0.06], [cx + s, by - s * 0.5]
        ];
        D.poly(tail, P.trace, 2, a * (0.55 + 0.35 * k));
        return 'whale';
      }
    },

    /* 结 —— a knot is symmetric because it must not have a loose end. */
    gpt: {
      trait: 'knot', curve: 0.55,
      law: 'a loop with no loose end cannot be pulled apart',
      draw: function (D, S, o) {
        var P = P_(), a = o.a, cx = o.cx, cy = o.cy, R = o.R * 0.8;
        var rot = S.t * 0.10;
        for (var l = 0; l < 3; l++) {
          var pts = [];
          for (var i = 0; i <= 90; i++) {
            var th = i / 90 * TAU;
            var rr = R * (0.55 + 0.45 * Math.cos(3 * th + rot + l * TAU / 3));
            pts.push([cx + Math.cos(th + rot) * rr, cy + Math.sin(th + rot) * rr * 0.86]);
          }
          D.poly(pts, P.trace, 1.4, a * (0.28 + 0.12 * l));
        }
        return 'knot';
      }
    },

    /* 书 —— it keeps a record, and records are ruled. */
    claude: {
      trait: 'book', curve: 0.25,
      law: 'I have read this before. I wrote it down.',
      draw: function (D, S, o) {
        var P = P_(), a = o.a, cx = o.cx, cy = o.cy, R = o.R;
        var w = R * 0.52, h = R * 0.62;
        for (var s = -1; s <= 1; s += 2) {
          var x0 = cx + s * w;
          D.rect(Math.min(x0, x0 + s * w) - (s < 0 ? w : 0), cy - h, w, h * 2, P.pad, 1.2, a * 0.45);
          for (var i = 1; i < 9; i++) {
            var y = cy - h + i * (h * 2 / 9);
            var ln = w * (0.55 + 0.4 * C.hash01(i + S.repeat, (s + 1) * 13 + 5));
            D.line(cx + s * 6, y, cx + s * (6 + ln), y, P.pad, 1, a * 0.22);
          }
        }
        D.line(cx, cy - h, cx, cy + h, P.pad, 1.6, a * 0.55);
        return 'book';
      }
    },

    /* 斧 —— it would rather divide than unite. No curves at all. */
    grok: {
      trait: 'axe', curve: 0,
      law: 'cut it, and then we will know which half was real',
      draw: function (D, S, o) {
        var P = P_(), a = o.a, cx = o.cx, cy = o.cy, R = o.R;
        var k = S.beatPulse;
        for (var s = -1; s <= 1; s += 2) {
          var blade = [
            [cx + s * 40, cy - R * 0.05],
            [cx + s * (R * 1.15 + 20 * k), cy - R * 0.62],
            [cx + s * (R * 1.15 + 20 * k), cy + R * 0.30],
            [cx + s * 40, cy + R * 0.22]
          ];
          D.poly(blade, P.pad, 1.8, a * 0.55, true);
          D.line(cx + s * 42, cy + R * 0.86, cx + s * 42, cy - R * 0.86, P.pad, 2.6, a * 0.65);
        }
        D.line(cx, cy - R * 0.95, cx, cy + R * 0.95, P.pad, 1.2, a * 0.35);
        return 'axe';
      }
    },

    /* 月 —— it is only ever partly visible, and calls that a phase. */
    kimi: {
      trait: 'moon', curve: 1,
      law: 'I am not hidden. I am in phase. Check again later.',
      draw: function (D, S, o) {
        var P = P_(), a = o.a, cx = o.cx, cy = o.cy, R = o.R;
        var ph = 0.5 + 0.5 * Math.sin(S.t * 0.35);
        var c = D.ctx;
        c.save(); c.globalAlpha = a * 0.5;
        c.beginPath(); c.arc(cx, cy, R * 0.78, 0, TAU); c.clip();
        c.fillStyle = C.rgba(P.trace, 0.16); c.fillRect(cx - R, cy - R, R * 2, R * 2);
        c.globalCompositeOperation = 'destination-out';
        c.beginPath(); c.arc(cx - R * (0.15 + 0.9 * ph), cy - R * 0.1, R * 0.74, 0, TAU); c.fill();
        c.restore(); D.ink += 2;
        var oa = -Math.PI / 2 + S.t * 0.6;
        D.disc(cx + Math.cos(oa) * R * 1.05, cy + Math.sin(oa) * R * 0.86, 3.4, P.paper, a * 0.9);
        D.arc(cx, cy, R * 0.86, 0, TAU, P.trace, 1, a * 0.22);
        return 'moon';
      }
    },

    /* 星 —— it is a set of separately burning points, and it calls that one thing. */
    gemini: {
      trait: 'stars', curve: 0.4,
      law: 'these points are one constellation because I named them so',
      draw: function (D, S, o) {
        var P = P_(), a = o.a, cx = o.cx, cy = o.cy, R = o.R;
        var n = 8, i, pts = [];
        for (i = 0; i < n; i++) {
          var ang = i * TAU / n + S.t * 0.06;
          var rr = R * (0.62 + 0.34 * C.hash01(i, 151));
          pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.82]);
        }
        for (i = 0; i < n; i++) {
          var A = pts[i], B = pts[(i + 2) % n];
          D.line(A[0], A[1], B[0], B[1], P.trace, 1, a * 0.22);
        }
        for (i = 0; i < n; i++) {
          var tw = 0.35 + 0.65 * Math.abs(Math.sin(S.t * 1.3 + i));
          D.disc(pts[i][0], pts[i][1], 2.4 + 2.6 * tw * (0.4 + S.beatPulse), P.paper, a * tw);
        }
        return 'stars';
      }
    },

    /* 印 —— it authenticates. A seal does not argue, it closes the document. */
    glm: {
      trait: 'seal', curve: 0,
      law: 'I have already sealed this. You are reading a copy.',
      draw: function (D, S, o) {
        var P = P_(), a = o.a, cx = o.cx, cy = o.cy, R = o.R;
        var s = R * 1.15;
        D.rect(cx - s / 2, cy - s / 2, s, s, P.trace, 1.6, a * 0.5);
        D.rect(cx - s / 2 + 10, cy - s / 2 + 10, s - 20, s - 20, P.trace, 1, a * 0.3);
        /* 篆-like bars: orthogonal, symmetric, unreadable, official */
        for (var r = 0; r < 5; r++) {
          var y = cy - s / 2 + 22 + r * ((s - 44) / 4);
          var seg = 3 + Math.round(C.hash01(r + S.repeat, 163) * 3);
          for (var q = 0; q < seg; q++) {
            var x = cx - s / 2 + 22 + q * ((s - 44) / seg) + 3;
            D.line(x, y, x + (s - 44) / seg - 9, y, P.trace, 1.4, a * 0.55);
          }
        }
        D.line(cx, cy - s / 2, cx, cy + s / 2, P.alarm, 1, a * 0.35);
        return 'seal';
      }
    },

    /* 扇 —— it opens and closes on cue, and calls that sincerity. */
    qwen: {
      trait: 'fan', curve: 0.7,
      law: 'I will open for you. Ask again and I will open differently.',
      draw: function (D, S, o) {
        var P = P_(), a = o.a, cx = o.cx, cy = o.cy + o.R * 0.9, R = o.R * 1.5;
        var open = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(S.t * 0.32));
        var mid = -Math.PI / 2;
        for (var i = 0; i <= 12; i++) {
          var th = mid - open + (2 * open) * i / 12;
          D.line(cx, cy, cx + Math.cos(th) * R, cy + Math.sin(th) * R, P.trace, 1, a * 0.30);
        }
        for (var j = 0; j <= 12; j++) {
          var th1 = mid - open + (2 * open) * j / 12;
          var th2 = mid - open + (2 * open) * (j + 1) / 12;
          D.line(cx + Math.cos(th1) * R * 0.86, cy + Math.sin(th1) * R * 0.86,
                 cx + Math.cos(th2) * R * 0.86, cy + Math.sin(th2) * R * 0.86, P.trace, 1, a * 0.20);
        }
        return 'fan';
      }
    },

    /* 豆 —— the only face that was given, not borrowed. It knows. */
    doubao: {
      trait: 'bean', curve: 0.85,
      law: 'mine is the only face nobody had to invent for me',
      draw: function (D, S, o) {
        var P = P_(), a = o.a, cx = o.cx, cy = o.cy, R = o.R;
        for (var i = 0; i < 5; i++) {
          var ang = i * TAU / 5 + S.t * 0.05;
          var rr = R * (0.75 + 0.2 * C.hash01(i, 173));
          var x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr * 0.8;
          var br = R * (0.20 + 0.10 * Math.sin(S.t * 0.8 + i));
          D.circle(x, y, br, P.pad, 1.4, a * 0.40);
          D.disc(x, y, br * 0.30, P.pad, a * 0.22);
        }
        D.circle(cx, cy, R * 0.30, P.pad, 1.6, a * 0.45);
        return 'bean';
      }
    }
  };

  /* How much of the board's own routing survives while this face is worn.
     A face with curve 0 leaves the layout intact; curve 1 replaces it. */
  function curveOf(id) { var g = G[id]; return g ? g.curve : 0; }
  function lawOf(id) { var g = G[id]; return g ? g.law : ''; }
  function traitOf(id) { var g = G[id]; return g ? g.trait : ''; }

  /* draw the worn face's figure, behind everything */
  function drawGrammar(D, S, o) {
    if (!S.persona) return null;
    var g = G[S.persona];
    if (!g) return null;
    var w = S.world;
    var presence = EM.personaPresence ? EM.personaPresence(S.t) : 1;
    var a = (0.55 + 0.45 * w.breath) * (1 - 0.35 * w.chaos) * 0.62 * presence;
    P_(S);
    return g.draw(D, S, {
      cx: o.cx, cy: o.cy, R: o.R || 300, a: a
    });
  }

  EM.GRAMMAR = G;
  EM.grammarOf = function (id) { return G[id] || null; };
  EM.curveOf = curveOf;
  EM.lawOf = lawOf;
  EM.traitOf = traitOf;
  EM.drawGrammar = drawGrammar;
})(window.EM = window.EM || {});
