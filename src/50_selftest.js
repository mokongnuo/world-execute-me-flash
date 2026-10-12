/* ============================================================================
   src/50_selftest.js — the film checks its own lyric copy on every load.

   The timeline lives in two independent places: assets/cues.js and a verbatim
   copy embedded in index.html. If either is edited the two drift, and a film
   whose words do not match its own timing is worse than one that refuses to
   start. So the copies are compared, and the difference is reported in
   milliseconds rather than hidden.
   ========================================================================== */
(function (EM) {
  'use strict';

  function readEmbedded() {
    if (typeof document === 'undefined') return null;
    var el = document.getElementById('lrc-source');
    if (!el) return null;
    return el.textContent || '';
  }

  function parse(text) {
    var re = /^\[(\d+):(\d+)[.:](\d{1,3})\](.*)$/;
    var out = [];
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(re);
      if (!m) continue;
      var frac = (m[3] + '00').slice(0, 3);
      out.push({ t: (+m[1]) * 60 + (+m[2]) + (+frac) / 1000, text: m[4].trim() });
    }
    return out;
  }

  function run() {
    var text = readEmbedded();
    var res = { ran: !!text, count: 0, worstMs: 0, textOk: true, ok: false, why: '' };
    if (!text) { res.why = 'no embedded copy (headless or missing block)'; res.ok = EM.CUES && EM.CUES.length > 0; return res; }
    var emb = parse(text);
    res.count = emb.length;
    if (emb.length !== EM.CUES.length) {
      res.ok = false; res.why = 'embedded ' + emb.length + ' vs table ' + EM.CUES.length;
      return res;
    }
    for (var i = 0; i < emb.length; i++) {
      var d = Math.abs(emb[i].t - EM.CUES[i][0]) * 1000;
      if (d > res.worstMs) res.worstMs = d;
      if (emb[i].text !== EM.CUES[i][1]) {
        res.textOk = false;
        res.why = 'text mismatch at ' + i + ': "' + emb[i].text + '" vs "' + EM.CUES[i][1] + '"';
        break;
      }
    }
    res.ok = res.textOk && res.worstMs <= 0.5;
    if (!res.ok && !res.why) res.why = 'worst delta ' + res.worstMs.toFixed(3) + ' ms';
    return res;
  }

  EM.SELFTEST = run();
  if (typeof console !== 'undefined' && EM.SELFTEST.ran && !EM.SELFTEST.ok) {
    console.error('SELF-TEST FAILED: ' + EM.SELFTEST.why);
  }
})(window.EM = window.EM || {});
