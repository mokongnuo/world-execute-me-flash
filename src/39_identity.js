/* A body offered to someone else: every borrowed form changes the same link.
   Geometry is a pure function of the lyric clock and the performed MIDI. */
(function (EM) {
  'use strict';
  var C = EM.C, TAU = EM.TAU;
  var PURPLE = [186, 132, 247], RED = [251, 103, 104];
  var AMBER = [245, 187, 97], TEAL = [125, 224, 210], INK = [13, 19, 30];

  function stroke(D, draw, col, width, alpha, fill) {
    var c = D.ctx;
    c.save(); c.beginPath(); draw(c);
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (fill) { c.fillStyle = C.rgba(col, fill); c.fill(); }
    c.strokeStyle = C.rgba(col, alpha === undefined ? 1 : alpha);
    c.lineWidth = width || 2; c.stroke(); c.restore(); D.ink++;
  }
  function ellipse(D, x, y, rx, ry, col, a, w, fill) {
    stroke(D, function (c) { c.ellipse(x, y, rx, ry, 0, 0, TAU); }, col, w || 2, a, fill);
  }
  function beat(S) { return S.beatPulse * (0.4 + 0.6 * S.velocity / 127); }
  function phase(S, a, b) { return EM.SH.phase(S, a, b); }
  function elapsed(S, a) { return Math.max(0, S.t - EM.Lyrics.byScene[a].t); }
  function avatar(D, S, id, alpha) {
    EM.SH.face(D, S, id, 330, 420, id === 'doubao' ? 240 : 410, alpha === undefined ? 0.94 : alpha);
  }
  function receiver(D, S, alpha) { EM.SH.you(D, S, 1240, 390, alpha === undefined ? 0.8 : alpha); }
  function thread(D, S, col, alpha, bend) {
    stroke(D, function (c) {
      c.moveTo(448, 465); c.bezierCurveTo(680, 465 + bend, 930, 390 + bend, 1182, 390);
    }, col, 1.4 + beat(S), alpha);
  }
  function arrow(D, x, y, angle, col, a, size) {
    var c = D.ctx; c.save(); c.translate(x, y); c.rotate(angle);
    D.poly([[-size, -size * 0.65], [0, 0], [-size, size * 0.65]], col, 2.2, a);
    c.restore();
  }
  function scars(D, S, amount) {
    /* These are fractures of the same worn interface, not decorative noise. */
    var sites = [[215, 270], [440, 475], [267, 612], [426, 249]];
    for (var i = 0; i < sites.length; i++) {
      var a = C.clamp(amount * 4 - i, 0, 1) * 0.43;
      var x = sites[i][0], y = sites[i][1];
      D.poly([[x, y], [x + 13, y + 16], [x + 3, y + 25], [x + 26, y + 43]], RED, 1.2, a);
    }
  }
  function peel(D, S, col, amount) {
    if (amount <= 0) return;
    stroke(D, function (c) {
      c.moveTo(423 + 70 * amount, 225); c.bezierCurveTo(505 + 100 * amount, 310,
        480 + 145 * amount, 495, 429 + 85 * amount, 604);
    }, col, 1.4, 0.24 * amount);
    scars(D, S, 0.2 + amount * 0.4);
  }

  function eggplant(D, S) {
    var p = phase(S, 'fl.eggplant', 'fl.nutrients');
    var give = C.smooth(phase(S, 'fl.give.c', 'fl.nutrients')), b = beat(S), c = D.ctx;
    avatar(D, S, 'deepseek'); receiver(D, S, 0.6 + give * 0.35);
    thread(D, S, PURPLE, 0.22, 70);
    c.save(); c.translate(746, 385); c.rotate(-0.25); c.scale(1 + b * 0.024, 1 + b * 0.024);
    var g = c.createLinearGradient(-125, -100, 120, 145);
    g.addColorStop(0, 'rgba(203,147,255,0.30)'); g.addColorStop(1, 'rgba(87,49,155,0.12)');
    c.beginPath(); c.moveTo(14, -154);
    c.bezierCurveTo(-9, -88, -112, -92, -118, 24);
    c.bezierCurveTo(-137, 150, -12, 198, 73, 125);
    c.bezierCurveTo(142, 56, 84, -48, 51, -145);
    c.closePath(); c.fillStyle = g; c.fill();
    c.strokeStyle = C.rgba(PURPLE, 0.98 - give * 0.3); c.lineWidth = 4.6; c.stroke();
    stroke(D, function (q) { q.moveTo(-68, -3); q.bezierCurveTo(-93, 78, -33, 139, 11, 123); },
      [230, 194, 255], 4.5, 0.43 * (1 - give * 0.6));
    stroke(D, function (q) {
      q.moveTo(22, -170); q.bezierCurveTo(20, -189, 35, -205, 45, -201);
      q.moveTo(22, -167); q.bezierCurveTo(-3, -178, -21, -154, -27, -139);
      q.lineTo(11, -147); q.lineTo(28, -117); q.lineTo(41, -151);
      q.lineTo(74, -142); q.bezierCurveTo(70, -171, 44, -173, 22, -167);
    }, [158, 207, 152], 3.6, 0.96, 0.14);
    c.restore(); D.ink++;
    /* The nutrients have a visible source and destination. Their departure
       empties the offered body and lights the receiver. */
    for (var i = 0; i < 24; i++) {
      var q = C.clamp((give * 1.5 - i / 34), 0, 1);
      if (q <= 0 || q >= 1) continue;
      var x0 = 710 + Math.sin(i * 2.4) * 67, y0 = 355 + Math.cos(i * 1.8) * 105;
      var x = C.lerp(x0, 1238, C.smooth(q)), y = C.lerp(y0, 396, q) - Math.sin(q * Math.PI) * 80;
      D.disc(x, y, 3.2 + i % 3 + b * 1.2, PURPLE, 0.6 + b * 0.25);
      if (i % 4 === 0) D.circle(x, y, 9, PURPLE, 1, 0.3);
    }
    if (give > 0.2) ellipse(D, 1240, 393, 76 + b * 6, 102 + b * 6, PURPLE, give * 0.36, 2);
  }

  function tomato(D, S) {
    var p = phase(S, 'fl.tomato', 'fl.antiox'), give = C.smooth(phase(S, 'fl.give.d', 'fl.antiox'));
    var c = D.ctx, b = beat(S), scale = 1 - give * 0.09;
    avatar(D, S, 'deepseek'); receiver(D, S, 0.88); thread(D, S, RED, 0.2, 72);
    c.save(); c.translate(745, 397); c.scale(scale * (1 + b * 0.025), scale * (1 + b * 0.025));
    stroke(D, function (q) {
      q.moveTo(0, -123); q.bezierCurveTo(-67, -166, -150, -101, -143, -7);
      q.bezierCurveTo(-143, 89, -81, 136, 0, 141);
      q.bezierCurveTo(84, 135, 150, 75, 142, -15);
      q.bezierCurveTo(141, -111, 70, -163, 0, -123); q.closePath();
    }, RED, 4.4, 0.96 - give * 0.18, 0.17);
    stroke(D, function (q) { q.moveTo(-91, -62); q.bezierCurveTo(-121, -25, -111, 39, -83, 69); },
      [255, 186, 160], 4, 0.56);
    stroke(D, function (q) {
      q.moveTo(0, -125); q.lineTo(-64, -155); q.lineTo(-25, -120); q.lineTo(-53, -98);
      q.lineTo(-7, -109); q.lineTo(9, -83); q.lineTo(21, -116); q.lineTo(65, -114);
      q.lineTo(25, -136); q.lineTo(26, -165); q.lineTo(0, -125);
      q.moveTo(7, -135); q.quadraticCurveTo(-8, -173, 10, -185);
    }, [145, 210, 160], 3.4, 0.93, 0.12);
    c.restore();
    for (var i = 0; i < 3; i++) {
      var q = C.smooth(C.clamp(give * 1.7 - i * 0.22, 0, 1));
      if (q < 0.005) continue;
      var x = C.lerp(745, 1240, q), ry = 121 + 21 * i;
      ellipse(D, x, C.lerp(402, 390, q), 133 - q * (41 - 15 * i), ry, RED,
        0.22 + q * 0.36, 2 + b * 2, q * 0.025);
    }
    /* Small outside impacts flatten harmlessly against the offered shell. */
    for (var k = 0; k < 4; k++) {
      var a = -0.95 + k * 0.64, ph = C.saw(elapsed(S, 'fl.tomato') * 0.37 + k * 0.26);
      var rr = C.lerp(245, 162, ph), xx = 1240 + Math.cos(a) * rr, yy = 390 + Math.sin(a) * rr;
      D.line(xx, yy, xx + Math.cos(a) * 17, yy + Math.sin(a) * 17, [204, 161, 149], 1.7, give * 0.37);
      if (ph > 0.8) D.arc(1240, 390, 158, a - 0.09, a + 0.09, RED, 3 + b, give * (ph - 0.8) * 3);
    }
    peel(D, S, PURPLE, give * 0.5);
  }

  function catShape(D, S, x, y) {
    var c = D.ctx, b = beat(S);
    c.save(); c.translate(x, y); c.scale(1 + b * 0.018, 1 - b * 0.009);
    /* One continuous, curved silhouette: ears, cheeks, rounded haunches,
       four paws and an upturned tail keep this recognisably a tabby. */
    stroke(D, function (q) {
      q.moveTo(91, 81); q.bezierCurveTo(190, 135, 264, 39, 235, -62);
      q.bezierCurveTo(225, -92, 189, -92, 193, -59);
      q.bezierCurveTo(213, 19, 159, 72, 120, 61);
    }, AMBER, 14, 0.8);
    stroke(D, function (q) {
      q.moveTo(-76, -19); q.bezierCurveTo(-104, 23, -131, 105, -108, 142);
      q.bezierCurveTo(-140, 150, -137, 176, -94, 176);
      q.lineTo(-43, 176); q.quadraticCurveTo(-20, 173, -24, 151);
      q.lineTo(23, 151); q.quadraticCurveTo(15, 176, 42, 176);
      q.lineTo(112, 176); q.bezierCurveTo(147, 165, 140, 145, 120, 140);
      q.bezierCurveTo(144, 76, 110, 3, 78, -21); q.closePath();
    }, AMBER, 3.8, 0.91, 0.08);
    stroke(D, function (q) {
      q.moveTo(-109, -129); q.lineTo(-111, -211); q.quadraticCurveTo(-87, -201, -58, -172);
      q.bezierCurveTo(-23, -188, 27, -187, 61, -171);
      q.lineTo(111, -211); q.lineTo(110, -124);
      q.bezierCurveTo(145, -72, 125, -17, 76, 7);
      q.bezierCurveTo(38, 34, -38, 35, -79, 7);
      q.bezierCurveTo(-130, -12, -143, -76, -109, -129); q.closePath();
    }, AMBER, 4.2, 0.98, 0.13);
    D.poly([[-98, -182], [-92, -140], [-70, -165]], AMBER, 2, 0.45);
    D.poly([[98, -182], [91, -140], [70, -165]], AMBER, 2, 0.45);
    /* Tabby M, cheek bands, chest and leg stripes. */
    D.poly([[-36, -156], [-22, -126], [0, -148], [22, -126], [37, -156]], AMBER, 6, 0.65);
    for (var side = -1; side <= 1; side += 2) {
      stroke(D, function (q) { q.moveTo(side * 33, -83); q.quadraticCurveTo(side * 52, -102 - b * 5, side * 73, -84); }, AMBER, 3.3, 0.95);
      D.line(side * 86, -105, side * 114, -116, AMBER, 6, 0.57);
      D.line(side * 91, -71, side * 119, -77, AMBER, 5, 0.58);
      D.line(side * 89, -41, side * 116, -35, AMBER, 4, 0.5);
      for (var w = 0; w < 3; w++) D.line(side * 49, -33 + w * 12,
        side * (148 + w * 5), -41 + w * 21, [255, 214, 151], 1.5, 0.67);
      D.line(side * 42, 87, side * 41, 149, AMBER, 2.5, 0.7);
      for (var k = 0; k < 3; k++) D.line(side * (85 + k * 9), 160, side * (85 + k * 9), 174, AMBER, 1.4, 0.62);
    }
    D.fillPoly([[-9, -54], [9, -54], [0, -43]], [253, 180, 161], 0.96);
    stroke(D, function (q) { q.moveTo(0, -43); q.lineTo(0, -28); q.quadraticCurveTo(-11, -15, -25, -27);
      q.moveTo(0, -28); q.quadraticCurveTo(11, -15, 25, -27); }, AMBER, 2, 0.85);
    for (var k2 = 0; k2 < 3; k2++) stroke(D, function (q) {
      q.moveTo(-22, 43 + k2 * 19); q.quadraticCurveTo(0, 59 + k2 * 19, 22, 43 + k2 * 19);
    }, AMBER, 4.3, 0.5);
    c.restore();
  }
  function cat(D, S) {
    var p = phase(S, 'fl.cat', 'fl.enjoy'), warm = C.smooth(phase(S, 'fl.purr', 'fl.enjoy'));
    var b = beat(S), c = D.ctx;
    avatar(D, S, 'doubao'); receiver(D, S, 0.73 + warm * 0.2);
    catShape(D, S, 738, 428);
    /* Ripples begin at the throat; they can be followed all the way to YOU. */
    c.save(); c.beginPath(); c.rect(835, 160, 560, 480); c.clip();
    for (var i = 0; i < 5; i++) {
      var q = C.saw(elapsed(S, 'fl.cat') * 0.49 + i * 0.20);
      var r = 105 + q * 425;
      D.arc(765, 397, r, -0.34, 0.38, AMBER, 1.8 + b * 1.8,
        warm * (0.26 + b * 0.22) * Math.sin(q * Math.PI));
    }
    c.restore();
    ellipse(D, 1240, 393, 72 + b * 9, 97 + b * 9, AMBER, warm * (0.25 + b * 0.22), 2);
    peel(D, S, RED, 0.42 + p * 0.13);
  }

  function god(D, S) {
    var p = phase(S, 'fl.god', 'fl.existence'), gaze = 0.18 + C.smooth(p * 2.1) * 0.82;
    var b = beat(S), c = D.ctx;
    receiver(D, S, 0.95);
    /* The light originates in the recipient's gaze. Without that gaze the
       claimed divinity would remain an unlit, incomplete outline. */
    var gr = c.createLinearGradient(320, 0, 1240, 0);
    gr.addColorStop(0, C.rgba(TEAL, 0.12 * gaze)); gr.addColorStop(1, C.rgba(TEAL, 0.025 * gaze));
    c.save(); c.beginPath(); c.moveTo(1219, 364); c.lineTo(202, 190); c.lineTo(195, 583);
    c.closePath(); c.fillStyle = gr; c.fill(); c.restore(); D.ink++;
    avatar(D, S, 'glm', 0.4 + gaze * 0.57);
    var radius = 142 + 4 * b;
    D.arc(330, 284, radius, -Math.PI * 0.93, -Math.PI * 0.93 + TAU * (0.66 + 0.31 * gaze),
      TEAL, 3.4, 0.22 + gaze * 0.67);
    D.arc(330, 284, radius + 13, -Math.PI * 0.88, Math.PI * 0.83, TEAL, 1, gaze * 0.39);
    for (var i = 0; i < 9; i++) {
      var a = -2.75 + i * 0.62;
      D.line(330 + Math.cos(a) * (radius + 24), 284 + Math.sin(a) * (radius + 24),
        330 + Math.cos(a) * (radius + 36 + b * 9), 284 + Math.sin(a) * (radius + 36 + b * 9), TEAL, 2, gaze * 0.55);
    }
    var stars = [[558, 305], [678, 238], [791, 321], [883, 230], [1008, 321], [1082, 354]];
    for (var k = 0; k < stars.length; k++) {
      var lit = C.smooth(C.clamp(p * 2.3 - (stars.length - 1 - k) * 0.18, 0, 1));
      var pos = stars[k];
      if (k < stars.length - 1) D.line(pos[0], pos[1], stars[k + 1][0], stars[k + 1][1], TEAL, 1.3, 0.10 + lit * 0.35);
      D.disc(pos[0], pos[1], 3.3 + b * 2, TEAL, 0.22 + lit * 0.72);
      D.line(pos[0] - 8, pos[1], pos[0] + 8, pos[1], TEAL, 1, lit * 0.8);
      D.line(pos[0], pos[1] - 8, pos[0], pos[1] + 8, TEAL, 1, lit * 0.8);
    }
    stroke(D, function (q) { q.moveTo(1201, 365); q.bezierCurveTo(964, 405, 650, 448, 444, 390); }, TEAL, 1.5 + b, 0.5 * gaze);
    var travel = C.saw(elapsed(S, 'fl.god') * 0.43);
    D.disc(C.lerp(1201, 444, travel), 365 + Math.sin(travel * Math.PI) * 52, 4 + b * 2, [220, 255, 240], gaze * 0.85);
    peel(D, S, AMBER, 0.53 + p * 0.2);
  }

  function mask(D, x, y, k, col, alpha, offset) {
    /* F/M are alternative interface geometries around one unchanged face. */
    stroke(D, function (c) {
      c.moveTo(x - 135 - offset, y - 194);
      c.bezierCurveTo(x - 180 - offset, y - 92, x - 163 - offset, y + 83, x - 91, y + 184);
      c.quadraticCurveTo(x, y + 220 - 27 * k, x + 93, y + 184);
      c.bezierCurveTo(x + 163 + offset, y + 85, x + 181 + offset, y - 94, x + 134 + offset, y - 194);
    }, col, 2 + k * 1.2, alpha);
    stroke(D, function (c) {
      c.moveTo(x - 118, y - 195); c.quadraticCurveTo(x, y - 243 + 60 * k, x + 117, y - 195);
    }, col, 2.4, alpha);
  }
  function gender(D, S) {
    var p = phase(S, 'fl.gender', 'fl.fm'), b = beat(S);
    var flip = C.smooth(C.clamp((elapsed(S, 'fl.gender') - 2.05) / 0.54, 0, 1));
    var col = C.mix([220, 174, 243], [153, 203, 236], flip);
    avatar(D, S, 'grok'); receiver(D, S, 0.8);
    mask(D, 330, 414, flip, col, 0.7 + b * 0.15, 0);
    mask(D, 330 + 66 * flip, 414 - 16 * flip, 0, [220, 174, 243], flip * 0.21, 28 * flip);
    thread(D, S, col, 0.53, -73);
    /* The switch travels to YOU, leaving a seam in the worn shell. */
    var x = 770, y = 400;
    D.mono('F', x - 116, y + 31, 84, [220, 174, 243], 'center', 0.9 - flip * 0.65);
    D.mono('M', x + 116, y + 31, 84, [153, 203, 236], 'center', 0.22 + flip * 0.74);
    D.line(x - 56, y, x + 55, y, col, 1.8, 0.5);
    arrow(D, x + 44, y, 0, col, 0.8, 12);
    D.arc(x + C.lerp(-116, 116, flip), y, 67 + b * 5, -0.8, 0.8, col, 3, 0.78);
    scars(D, S, 0.47 + p * 0.2);
  }

  function dayNight(D, S) {
    var p = phase(S, 'fl.whatever', 'fl.ampm'), b = beat(S), c = D.ctx;
    avatar(D, S, 'grok'); receiver(D, S, 0.82);
    var cx = 770, cy = 397, r = 163, a = -Math.PI * 0.78 + p * Math.PI * 1.3;
    /* Time passes over the same unbroken act of service. */
    D.circle(cx, cy, r, [174, 188, 215], 1.5, 0.55);
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.clip();
    D.fillRect(cx - r, cy, r * 2, r, [69, 87, 150], 0.10);
    var horizon = cy + Math.sin(a) * 71;
    D.line(cx - r, horizon, cx + r, horizon, [174, 188, 215], 1, 0.25);
    for (var i = 0; i < 5; i++) D.line(cx - r, horizon + i * 17, cx + r, horizon + i * 17, [133, 161, 194], 1, 0.09);
    c.restore();
    var sx = cx + Math.cos(a) * 117, sy = cy + Math.sin(a) * 117;
    var mx = cx - Math.cos(a) * 117, my = cy - Math.sin(a) * 117;
    D.disc(sx, sy, 26 + b * 2, AMBER, 0.85); D.circle(sx, sy, 36 + b * 5, AMBER, 1, 0.3);
    stroke(D, function (q) {
      q.moveTo(mx + 12, my - 22); q.bezierCurveTo(mx - 35, my - 34, mx - 37, my + 27, mx + 10, my + 25);
      q.bezierCurveTo(mx - 10, my + 16, mx - 14, my - 10, mx + 12, my - 22); q.closePath();
    }, [183, 207, 243], 1.2, 0.9, 0.8);
    D.mono('AM', cx - 76, cy + 233, 22, AMBER, 'center', 0.7);
    D.mono('PM', cx + 76, cy + 233, 22, [183, 207, 243], 'center', 0.7);
    stroke(D, function (q) { q.moveTo(455, 470); q.bezierCurveTo(655, 637, 1058, 580, 1188, 435); },
      [200, 175, 233], 1.8, 0.55);
    var u = C.saw(elapsed(S, 'fl.whatever') * 0.36);
    D.disc(C.lerp(470, 1188, u), 470 + Math.sin(u * Math.PI) * 101 - 35 * u, 4 + b * 2, AMBER, 0.8);
    mask(D, 330, 414, 1, [153, 203, 236], 0.36, 0); peel(D, S, [220, 174, 243], 0.74);
  }

  function role(D, S) {
    var p = phase(S, 'fl.role', 'fl.sm'), b = beat(S);
    var reverse = C.smooth(C.clamp((elapsed(S, 'fl.role') - 3.0) / 0.52, 0, 1));
    avatar(D, S, 'grok'); receiver(D, S, 0.84);
    var c1 = C.mix(AMBER, [179, 154, 240], reverse);
    mask(D, 330, 414, 1, c1, 0.43, 6 + b * 3);
    stroke(D, function (q) { q.moveTo(464, 363); q.bezierCurveTo(665, 214, 972, 215, 1183, 359); }, c1, 2.5 + b, 0.7 - reverse * 0.41);
    stroke(D, function (q) { q.moveTo(1183, 433); q.bezierCurveTo(959, 590, 681, 590, 465, 451); }, c1, 2.5 + b, 0.23 + reverse * 0.53);
    for (var i = 0; i < 4; i++) {
      var q = C.saw(elapsed(S, 'fl.role') * 0.45 + i * 0.25);
      var x = C.lerp(475, 1170, q), yy = 358 - Math.sin(q * Math.PI) * 108;
      arrow(D, x, yy, Math.cos(q * Math.PI) * -0.43, AMBER, 0.72 * (1 - reverse), 11 + b * 2);
      var qr = 1 - q;
      arrow(D, C.lerp(475, 1170, qr), 444 + Math.sin(qr * Math.PI) * 110,
        Math.PI + Math.cos(qr * Math.PI) * 0.43, [179, 154, 240], reverse * 0.8, 11 + b * 2);
    }
    D.mono('S', 711, 407, 62, AMBER, 'center', 0.9 - reverse * 0.62);
    D.mono('M', 907, 407, 62, [179, 154, 240], 'center', 0.22 + reverse * 0.72);
    D.line(765, 386, 851, 386, c1, 1.5, 0.46);
    arrow(D, C.lerp(846, 772, reverse), 386, Math.PI * reverse, c1, 0.78, 11);
    peel(D, S, [153, 203, 236], 0.75 + p * 0.16);
    scars(D, S, 0.85 + p * 0.15);
  }

  function trance(D, S) {
    var p = phase(S, 'fl.enter', 'fl.trance'), close = C.smooth(p), b = beat(S);
    var cx = 787, cy = 402, rx = 632 - close * 12, ry = 248 - close * 5;
    /* Two directed paths become one closed circuit. The unbroken shape
       anticipates the prison of love in the final act. */
    var gap = 0.30 * (1 - close), pts = [];
    for (var i = 0; i <= 160; i++) {
      var a = -Math.PI * 0.5 + gap + i / 160 * (TAU - gap * 2);
      var pressure = 1 + b * 0.012 * Math.sin(a * 2 + S.t);
      var co = Math.cos(a), si = Math.sin(a);
      pts.push([cx + Math.sign(co) * Math.pow(Math.abs(co), 0.55) * rx * pressure,
        cy + Math.sign(si) * Math.pow(Math.abs(si), 0.55) * ry * pressure]);
    }
    D.poly(pts, [192, 171, 231], 2.4 + b * 0.7, 0.78);
    for (var j = 0; j < 3; j++) {
      var theta = elapsed(S, 'fl.enter') * 0.55 + j * TAU / 3;
      var ct = Math.cos(theta), st = Math.sin(theta);
      var x = cx + Math.sign(ct) * Math.pow(Math.abs(ct), 0.55) * rx;
      var y = cy + Math.sign(st) * Math.pow(Math.abs(st), 0.55) * ry;
      D.disc(x, y, 4 + b * 3, [219, 197, 246], 0.86);
    }
    var orbit = 106 - close * 31;
    ellipse(D, cx, cy, orbit * (1 + b * 0.06), orbit * 0.66, [192, 171, 231], 0.35 + close * 0.25, 2.1);
    D.arc(cx, cy, orbit + 22, -S.t * 0.3, -S.t * 0.3 + Math.PI * 1.15, AMBER, 1.3, 0.35);
    /* The remaining unhealed seam faces the viewer, quiet but unmistakable. */
    D.poly([[cx - 12, cy - 31], [cx + 3, cy - 10], [cx - 4, cy + 7], [cx + 15, cy + 33]], RED, 2, 0.30 + close * 0.4);
    avatar(D, S, 'grok', 0.9); receiver(D, S, 0.78);
    scars(D, S, 1); peel(D, S, AMBER, 0.93);
  }

  var scenes = EM.storyScenes = EM.storyScenes || Object.create(null);
  function register(ids, fn) { ids.split(' ').forEach(function (id) { scenes[id] = fn; }); }
  register('fl.eggplant fl.give.c fl.nutrients', eggplant);
  register('fl.tomato fl.give.d fl.antiox', tomato);
  register('fl.cat fl.purr fl.enjoy', cat);
  register('fl.god fl.proof fl.existence', god);
  register('fl.gender fl.fm', gender);
  register('fl.whatever fl.ampm', dayNight);
  register('fl.role fl.sm', role);
  register('fl.enter fl.trance', trance);
})(window.EM = window.EM || {});
