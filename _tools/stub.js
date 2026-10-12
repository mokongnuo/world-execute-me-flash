/* A headless canvas that records every call instead of painting it.
   It is deliberately NOT a browser: text is measured, not shaped, and no
   blur or blend is emulated. What it gives us is the thing composition review
   needs — the call stream, its order, and a hash of it. */
'use strict';

function makeCtx(log) {
  const rec = (name, args) => { if (log) log.push(name + '(' + args.join(',') + ')'); };
  const ctx = {
    font: '400 12px sans-serif', fillStyle: '#000', strokeStyle: '#000',
    lineWidth: 1, globalAlpha: 1, globalCompositeOperation: 'source-over',
    textAlign: 'left', textBaseline: 'alphabetic', lineJoin: 'miter', lineCap: 'butt',
    beginPath() { rec('bp', []); },
    closePath() { rec('cp', []); },
    moveTo(x, y) { rec('m', [Math.round(x * 100) / 100, Math.round(y * 100) / 100]); },
    lineTo(x, y) { rec('l', [Math.round(x * 100) / 100, Math.round(y * 100) / 100]); },
    arc(x, y, r) { rec('a', [Math.round(x * 100) / 100, Math.round(y * 100) / 100, Math.round(r * 100) / 100]); },
    rect(x, y, w, h) { rec('r', [Math.round(x * 100) / 100, Math.round(y * 100) / 100, Math.round(w * 100) / 100, Math.round(h * 100) / 100]); },
    fillRect(x, y, w, h) { rec('fr', [Math.round(x * 100) / 100, Math.round(y * 100) / 100, Math.round(w * 100) / 100, Math.round(h * 100) / 100]); },
    fill() { rec('f', []); }, stroke() { rec('s', []); },
    save() { rec('sv', []); }, restore() { rec('rs', []); },
    translate(x, y) { rec('t', [Math.round(x * 100) / 100, Math.round(y * 100) / 100]); },
    scale(x, y) { rec('sc', [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]); },
    rotate(a) { rec('ro', [Math.round(a * 10000) / 10000]); },
    transform(a, b, c, d, e, f) {
      rec('tf', [a, b, c, d, e, f].map((v) => Math.round(v * 10000) / 10000));
    },
    clip() { rec('cl', []); },
    setLineDash(d) { rec('dash', [d.join('-')]); },
    fillText(str, x, y) { rec('ft', [str, Math.round(x * 100) / 100, Math.round(y * 100) / 100]); },
    drawImage(img, x, y, w, h) { rec('di', [Math.round(x), Math.round(y), Math.round(w || 0), Math.round(h || 0)]); },
    measureText(str) {
      const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
      const size = m ? +m[1] : 12;
      return { width: str.length * size * 0.58 };
    },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; }
  };
  return ctx;
}

module.exports = { makeCtx };
