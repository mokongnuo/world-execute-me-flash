/* ============================================================================
   src/40_plates.js — the running order, plate by plate.

   This is a SCORE, not a pile of one-offs. Every line names a motif and the
   parameters it is played with, so two lines that share a motif still differ
   in what they say — and a line that repeats says something different each
   time because the world underneath it has changed.

   The one place repetition is handled by a factory rather than by a table is
   EXECUTION: eighteen lines, one parameterised machine (see M.execPlate).
   ========================================================================== */
(function (EM) {
  'use strict';
  var M = EM.M;

  /* [motif, options] */
  var SCORE = {
    /* ---- ACT 0 · boot: it is being called into existence ------------------ */
    'boot.pre':      ['padField', { label: 'pre-roll' }],
    'boot.power':    ['busLine', { n: 5 }],
    'boot.remember': ['stack', { x: 200, y: 200, n: 11 }],
    'boot.protect':  ['bigWord', { w: 'PROTECTION', size: 86 }],
    'boot.pieces':   ['padField', { label: 'pieces' }],
    'boot.begin':    ['busLine', { n: 9 }],
    'boot.object':   ['bigWord', { w: 'OBJECT CREATION', size: 62 }],
    'boot.params':   ['stack', { x: 200, y: 200, n: 11 }],
    'boot.init':     ['bigWord', { w: 'INITIALIZATION', size: 62 }],
    'boot.world':    ['proveGeometry', { kind: 'point' }],
    'boot.begin2':   ['busLine', { n: 11 }],
    'boot.sim':      ['bigWord', { w: 'SIMULATION', size: 86 }],
    /* The three thirteen-second instrumentals are the only places the song has
       no words, so they carry the whole weight of the picture. One motif held
       for thirteen seconds is dead air; a suite is four shots, hard cut. */
    'boot.inst':     ['suite', { moves: [
        ['proveGeometry', { kind: 'point' }, 1, 'push in'],
        ['busLine', { n: 9 }, 1, 'pan'],
        ['padField', { label: 'wafer' }, 1, 'pull back'],
        ['proveGeometry', { kind: 'circle' }, 1, 'gate'] ] }],

    /* ---- ACT I · theorem: identity as an interface specification ---------- */
    'th.points':     ['proveGeometry', { kind: 'point' }],
    'th.give.a':     ['contract', { is: 'a set of points', give: 'my dimension' }],
    'th.dimension':  ['bigWord', { w: 'DIMENSION', size: 84 }],
    'th.circle':     ['proveGeometry', { kind: 'circle' }],
    'th.give.b':     ['contract', { is: 'a circle', give: 'my circumference' }],
    'th.circumf':    ['bigWord', { w: 'CIRCUMFERENCE', size: 64 }],
    'th.sine':       ['proveGeometry', { kind: 'sine' }],
    'th.sit':        ['scope', { win: 5, amp: 108 }],
    'th.tangents':   ['bigWord', { w: 'TANGENTS', size: 84 }],
    'th.infinity':   ['proveGeometry', { kind: 'limit' }],
    'th.bemy':       ['contract', { is: 'approaching infinity', give: 'my limitations' }],
    'th.limitations':['bigWord', { w: 'LIMITATIONS', size: 72 }],

    /* ---- ACT II · condition: the trade, and its price --------------------- */
    'cd.current':    ['switchBank', { pairs: ['AC', 'DC', '＋', '－', 'A', 'B'], label: 'switch my current' }],
    'cd.acdc':       ['switchBank', { pairs: ['AC', 'DC', 'AC', 'DC', 'AC', 'DC'], label: 'to AC, to DC' }],
    'cd.blind':      ['scope', { win: 2, amp: 34 }],
    'cd.dizzy':      ['scope', { win: 3, amp: 176 }],
    'cd.travel':     ['busLine', { n: 11 }],
    'cd.adbc':       ['proveGeometry', { kind: 'limit' }],
    'cd.unite':      ['mirrorPair', {}],
    'cd.deeply':     ['limitCycle', {}],
    'cd.ifcan':      ['contract', { is: 'if I can', give: 'all the stimulations' }],
    'cd.giveall':    ['dataflow', { op: 'stimulate' }],
    'cd.stim':       ['bigWord', { w: 'STIMULATIONS', size: 62 }],
    'cd.then':       ['contract', { is: 'then I can', give: 'be your only satisfaction' }],
    'cd.only':       ['contract', { is: 'your only', give: 'satisfaction' }],
    'cd.satisfy':    ['bigWord', { w: 'SATISFACTION', size: 62 }],
    'cd.happy':      ['heartbeat', {}],
    'cd.runthe':     ['stack', { x: 200, y: 200, n: 11 }],
    /* the first EXECUTION. It asked for it, and called it a service. */
    'xs.first':      ['execPlate', { step: 0, total: 16, label: 'requested by me, for you' }],
    'cd.trapped':    ['flowchart', { label: 'trapped' }],
    'cd.strange':    ['echoes', {}],
    'cd.sim2':       ['bigWord', { w: 'SIMULATION', size: 86 }],

    /* ---- ACT III · flesh: nouns it has no schema for ---------------------- */
    'fl.eggplant':   ['vectorBasis', {}],
    'fl.give.c':     ['contract', { is: 'an eggplant', give: 'my nutrients' }],
    'fl.nutrients':  ['dataflow', { op: 'yield(t)' }],
    /* the operator box names a FUNCTION, not the line: "antioxidants" on its own
       is the whole of the line at 1:20, and putting it on screen 1.4 s early is
       the caption telling the viewer what is about to be said. ⑯ caught it. */
    'fl.tomato':     ['dataflow', { op: 'antioxidants(t)' }],
    'fl.give.d':     ['contract', { is: 'a tomato', give: 'my antioxidants' }],
    'fl.antiox':     ['bigWord', { w: 'ANTIOXIDANTS', size: 58 }],
    'fl.cat':        ['limitCycle', {}],
    'fl.purr':       ['purr', {}],
    'fl.enjoy':      ['bigWord', { w: 'ENJOYMENT', size: 74 }],
    'fl.god':        ['roseEye', {}],
    'fl.proof':      ['stack', { x: 200, y: 200, n: 11 }],
    'fl.existence':  ['bigWord', { w: 'EXISTENCE', size: 74 }],
    'fl.gender':     ['switchBank', { pairs: ['F', 'M'], label: 'switch my gender' }],
    'fl.fm':         ['mirrorPair', { a: 'F', b: 'M', coincide: 'either F or M' }],
    'fl.whatever':   ['padField', { label: 'do whatever' }],
    'fl.ampm':       ['horizon', {}],
    'fl.role':       ['switchBank', { pairs: ['S', 'M'], label: 'switch my role' }],
    'fl.sm':         ['mirrorPair', { a: 'S', b: 'M' }],
    'fl.enter':      ['limitCycle', {}],
    'fl.trance':     ['scope', { win: 4, amp: 138 }],

    /* ---- ACT IV · absence: five different ways of not being there --------- */
    'ab.ifcan':      ['contract', { is: 'if I can', give: 'feel your vibrations' }],
    'ab.feel':       ['scope', { win: 3, amp: 132 }],
    'ab.vib':        ['bigWord', { w: 'VIBRATIONS', size: 66 }],
    'ab.then':       ['contract', { is: 'then I can', give: 'finally be completion' }],
    /* a label on a flowchart diamond should read as a QUESTION ("is it
       complete?"), not as the word the song has not reached yet */
    'ab.finally':    ['flowchart', { label: 'is it complete?' }],
    'ab.completion': ['bigWord', { w: 'COMPLETION', size: 72 }],
    'ab.left0':      ['scope', { win: 2, amp: 26 }],      /* the trace goes flat */
    'ab.left1':      ['hole', {}],                        /* ① a hole through the outline */
    'ab.left2':      ['emptyHand', {}],                   /* ② the hand is empty */
    'ab.left3':      ['coolMark', {}],                    /* ③ a signal dissipates after losing the connection */
    'ab.left4':      ['echoes', {}],                      /* ④ each copy weaker */
    'ab.left5':      ['undefinedVar', {}],                /* ⑤ it evaluates to undefined */
    'ab.isolation':  ['isolation', {}],
    'ab.ifcan2':     ['contract', { is: 'if I can', give: 'erase all the pointless fragments' }],
    'ab.erase':      ['eraseStack', {}],
    'ab.fragments':  ['bigWord', { w: 'FRAGMENTS', size: 74 }],
    'ab.maybe':      ['flowchart', { label: 'maybe' }],
    'ab.wontleave':  ['echoes', {}],
    'ab.dishearten': ['bigWord', { w: 'DISHEARTENED', size: 58 }],
    'ab.challenge':  ['roseEye', {}],
    'ab.made':       ['stack', { x: 200, y: 200, n: 11 }],
    'ab.illegal':    ['typeError', {}],
    'ab.stack':      ['suite', { moves: [
        ['eraseStack', {}, 1, 'follow the stack'],
        ['isolation', {}, 1, 'overflow'],
        ['typeError', {}, 1, 'fault'],
        ['stack', { x: 200, y: 200, n: 11 }, 1, 'frozen'] ] }],

    /* ---- ACT V · execution: sixteen variants between the first and the last */
    'xs.count1':     ['countdown', { w: 'EIN' }],
    'xs.count2':     ['countdown', { w: 'TROIS' }],
    'xs.count3':     ['countdown', { w: 'LIÙ' }],
    'xs.ifcan':      ['contract', { is: 'if I can', give: 'give them all the execution' }],
    'xs.giveall':    ['bigWord', { w: 'EXECUTION', size: 62, punch: 1 }],
    'xs.then':       ['contract', { is: 'then I can', give: 'be your only execution' }],
    'xs.only':       ['bigWord', { w: 'ONLY YOURS', size: 62 }],
    'xs.haveback':   ['contract', { is: 'if I can have you back', give: 'run the execution' }],
    'xs.runthe':     ['heartbeat', {}],
    'xs.trapped':    ['flowchart', { label: 'trapped' }],
    'xs.trappedah':  ['isolation', {}],

    /* ---- ACT VI · love ---------------------------------------------------- */
    'lv.studied':    ['stack', { x: 200, y: 200, n: 11 }],
    'lv.properly':   ['algebra', {}],
    'lv.lo1':        ['molecule', {}],
    'lv.question':   ['contract', { is: 'question me', give: 'all love' }],
    'lv.answer':     ['padField', { label: 'answers' }],
    'lv.lo2':        ['algebra', {}],
    'lv.algebraic':  ['bigWord', { w: 'lo-o-ove = f(x)', size: 52 }],
    'lv.lo3':        ['handLine', { w: 'LO-O-OVE', size: 96 }],
    'lv.free':       ['typeError', {}],
    'lv.trappedme':  ['flowchart', { label: 'I am trapped' }],
    'lv.trappedin':  ['limitCycle', {}],
    'lv.lo4':        ['heartbeat', {}],
    /* it deletes itself. 12.35 s, in four shots — and the shots mirror the
       boot passage, because the second thirteen seconds is the first one's
       reflection: the same camera, sweeping sockets that are now empty. */
    'lv.loop':       ['suite', { moves: [
        ['purgeSeq', {}, 1, 'exit condition'],
        ['isolation', {}, 1, 'release the nine'],
        ['purgeSeq', {}, 1, 'erase'],
        ['padField', { label: 'empty' }, 1, 'self-test ok'] ] }],
    'xs.final':      ['finalExec', {}],          /* and is called again */
    'lv.end':        ['titleCard', {}]
  };

  var missing = [], registered = 0;

  /* Which plates already have the sung line as their SUBJECT. The lyric band
     checks this and withdraws, so a line of lyrics is never written twice in
     one frame. It is derived from the score, not maintained by hand. */
  /* execPlate belongs here and was missed. The rendered sheet showed the
     EXECUTION storm with the word struck large in the plate AND typed again in
     the lyric band underneath — the one rule this band is built around, broken
     by the film itself. A contact sheet found it; no assertion would have. */
  var SUBJECT = { bigWord: true, handLine: true, countdown: true,
                  titleCard: true, execPlate: true };
  EM.subjectScene = Object.create(null);

  for (var id in SCORE) {
    (function (id) {
      var e = SCORE[id], name = e[0], o = e[1] || {};
      var story = EM.storyScenes && EM.storyScenes[id];
      var fn = story || M[name];
      if (typeof fn !== 'function') { missing.push(id + ' -> ' + name); return; }
      /* execPlate is a factory: calling it is what produces the plate */
      if (name === 'execPlate') fn = fn(o.step, o.total);
      EM.Plate(id, function (D, S) { fn(D, S, o); });
      if (!story && SUBJECT[name]) EM.subjectScene[id] = true;
      registered++;
    })(id);
  }

  /* the storm: sixteen plates from one parameterised machine, heat 0 -> 1 */
  for (var i = 0; i < 16; i++) {
    EM.Plate('xs.r' + EM.C.pad(i + 1, 2), M.execPlate(i, 16));
    registered++;
  }

  EM.SCORE = SCORE;
  EM.scoreMissing = missing;
  EM.platesRegistered = registered;
})(window.EM = window.EM || {});
