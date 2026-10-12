/* ============================================================================
   src/10_draw.js — the drawing kernel.

   The film's discipline lives here. Traces are routed the way a board is
   routed: orthogonal, with 45-degree bevels at the corners. A curve is not a
   prettier line — in this film a curve means something has left the layout.
   ========================================================================== */
(function (EM) {
  'use strict';
  var C = EM.C;

  function Draw(ctx) {
    this.ctx = ctx;
    this.ink = 0;              // every primitive lands here, so "did it draw?"
                      // is a question about pixels, not registrations
  }
  var P = Draw.prototype;

  P.reset = function () { this.ink = 0; };

  /* ---------- primitives ---------- */
  P.line = function (x1, y1, x2, y2, col, w, a) {
    var c = this.ctx;
    c.beginPath();
    c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.strokeStyle = C.rgba(col, a === undefined ? 1 : a);
    c.lineWidth = w || 1;
    c.lineCap = 'butt';
    c.stroke();
    this.ink++;
  };

  P.poly = function (pts, col, w, a, close) {
    if (pts.length < 2) return;
    var c = this.ctx;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    if (close) c.closePath();
    c.strokeStyle = C.rgba(col, a === undefined ? 1 : a);
    c.lineWidth = w || 1;
    c.lineJoin = 'miter';
    c.stroke();
    this.ink++;
  };

  P.fillPoly = function (pts, col, a) {
    if (pts.length < 3) return;
    var c = this.ctx;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
    c.fillStyle = C.rgba(col, a === undefined ? 1 : a);
    c.fill();
    this.ink++;
  };

  P.rect = function (x, y, w, h, col, lw, a) {
    this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], col, lw, a, true);
  };

  P.fillRect = function (x, y, w, h, col, a) {
    var c = this.ctx;
    c.fillStyle = C.rgba(col, a === undefined ? 1 : a);
    c.fillRect(x, y, w, h);
    this.ink++;
  };

  P.circle = function (x, y, r, col, lw, a) {
    var c = this.ctx;
    c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, EM.TAU);
    c.strokeStyle = C.rgba(col, a === undefined ? 1 : a);
    c.lineWidth = lw || 1;
    c.stroke();
    this.ink++;
  };

  P.disc = function (x, y, r, col, a) {
    var c = this.ctx;
    c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, EM.TAU);
    c.fillStyle = C.rgba(col, a === undefined ? 1 : a);
    c.fill();
    this.ink++;
  };

  P.arc = function (x, y, r, a0, a1, col, lw, a) {
    var c = this.ctx;
    c.beginPath(); c.arc(x, y, Math.max(0.1, r), a0, a1);
    c.strokeStyle = C.rgba(col, a === undefined ? 1 : a);
    c.lineWidth = lw || 1;
    c.stroke();
    this.ink++;
  };

  P.dash = function (x1, y1, x2, y2, col, w, dash, a) {
    var c = this.ctx;
    c.save();
    c.setLineDash(dash || [6, 5]);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.strokeStyle = C.rgba(col, a === undefined ? 1 : a);
    c.lineWidth = w || 1;
    c.stroke();
    c.restore();
    this.ink++;
  };

  /* ---------- text ---------- */
  P.text = function (str, x, y, size, col, align, a, weight) {
    size = Math.max(9, size);      // a readability floor: nothing smaller ships
    var c = this.ctx;
    c.font = (weight || 400) + ' ' + size + 'px "Segoe UI","Microsoft YaHei",system-ui,sans-serif';
    c.textAlign = align || 'left';
    c.textBaseline = 'alphabetic';
    c.fillStyle = C.rgba(col, a === undefined ? 1 : a);
    c.fillText(str, x, y);
    this.ink++;
  };

  P.mono = function (str, x, y, size, col, align, a) {
    size = Math.max(9, size);
    var c = this.ctx;
    c.font = '600 ' + size + 'px ui-monospace,Consolas,"Courier New",monospace';
    c.textAlign = align || 'left';
    c.textBaseline = 'alphabetic';
    c.fillStyle = C.rgba(col, a === undefined ? 1 : a);
    c.fillText(str, x, y);
    this.ink++;
  };

  P.width = function (str, size) {
    this.ctx.font = '600 ' + size + 'px ui-monospace,Consolas,monospace';
    return this.ctx.measureText(str).width;
  };

  /* ---------- the board language ---------- */

  /* Route a wire from A to B the way a board is routed: mostly orthogonal,
     with a 45-degree bevel at each corner. `skew` chooses the mid axis. */
  P.wire = function (x1, y1, x2, y2, col, w, a, bevel) {
    var dx = x2 - x1, dy = y2 - y1;
    if (Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5) {
      this.line(x1, y1, x2, y2, col, w, a);
      return;
    }
    bevel = bevel === undefined ? Math.min(26, Math.abs(dx) * 0.4, Math.abs(dy) * 0.4) : bevel;
    var sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
    this.poly([
      [x1, y1],
      [x2 - sx * (bevel + Math.abs(dy)) * 0, y1],
      [x2 - sx * bevel, y1 + sy * (Math.abs(dy) - bevel)],
      [x2, y2]
    ], col, w, a);
  };

  /* a right-angle corner with both legs bevelled */
  P.wireZ = function (x1, y1, x2, y2, col, w, a) {
    var mx = (x1 + x2) / 2, b = Math.min(22, Math.abs(y2 - y1) * 0.4, Math.abs(x2 - x1) * 0.25);
    var sx = x2 > x1 ? 1 : -1, sy = y2 > y1 ? 1 : -1;
    this.poly([
      [x1, y1], [mx - sx * b, y1], [mx - sx * 0, y1], [mx, y1],
      [mx, y2 - sy * 0], [mx, y2]
    ], col, w, a);
    this.poly([[x1, y1], [mx - b * 0.7 * sx, y1], [mx, y1 + b]], col, w, a);
    this.poly([[mx, y2 - b], [mx + b * 0.7 * sx, y2], [x2, y2]], col, w, a);
  };

  /* SMD pad: a filled rounded slab with a brighter rim */
  P.pad = function (x, y, s, col, a) {
    a = a === undefined ? 1 : a;
    this.fillRect(x - s / 2, y - s / 2, s, s, col, a * 0.85);
    this.rect(x - s / 2, y - s / 2, s, s, C.lift(col, 0.5), 1, a);
  };

  /* through-hole via: copper annulus around a drilled hole */
  P.via = function (x, y, r, col, a) {
    a = a === undefined ? 1 : a;
    this.circle(x, y, r, col, Math.max(1, r * 0.42), a);
    this.disc(x, y, Math.max(0.8, r * 0.30), [4, 7, 10], a);
  };

  /* solder ball: heat 1 = just reflowed (bright, fat), 0 = long cooled */
  P.ball = function (x, y, r, heat, col) {
    heat = C.clamp(heat, 0, 1);
    var c = C.mix([96, 104, 112], col, heat);
    this.disc(x, y, r, c, 0.30 + 0.55 * heat);
    if (heat > 0.05) this.disc(x - r * 0.25, y - r * 0.25, r * 0.42, C.lift(c, 0.9), 0.35 * heat);
    this.ink++;
  };

  /* a measured span: end ticks and a scale of real seconds */
  P.span = function (x1, x2, y, col, a, label) {
    this.line(x1, y - 6, x1, y + 6, col, 1, a);
    this.line(x2, y - 6, x2, y + 6, col, 1, a);
    this.line(x1, y, x2, y, col, 1, a * 0.6);
    if (label) this.mono(label, (x1 + x2) / 2, y - 10, 11, col, 'center', a);
  };

  /* engineering callout: a leader line to a framed label */
  P.callout = function (x, y, tx, ty, str, col, a, size) {
    size = size || 12;
    this.line(x, y, tx, ty, col, 1, a * 0.75);
    this.disc(x, y, 2.2, col, a);
    var wd = Math.max(34, this.width(str, size) + 16);
    var up = ty < y;
    var bx = tx, by = ty + (up ? -16 : 16);
    this.rect(bx - 6, by - size - 3, wd, size + 11, col, 1, a * 0.55);
    this.mono(str, bx + 2, by + 1, size, col, 'left', a);
  };

  EM.Draw = Draw;
  EM.newDraw = function (ctx) { return new Draw(ctx); };
})(window.EM = window.EM || {});
