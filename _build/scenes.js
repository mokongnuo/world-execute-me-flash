/* ============================================================================
   scenes.js — the running order of THIS film, as data.

   Build input, not a runtime file. `gen.js` binds every row to a real cue from
   the supplied LRC and refuses to emit anything unless all three agree:

       [index, scene_id, a word that MUST appear in that cue, act, persona]

   Index alone is not enough. A table that is short in the middle and long at
   the end has the right total, and every later line silently lands on the
   wrong words. A word taken from the line catches that, and it fails the
   BUILD rather than the premiere.

   persona: which of the nine borrowed faces is worn on this line, or null.
            This is the film's spine — see the concept note in README.
   ========================================================================== */
'use strict';

module.exports = [
  /* ---- ACT 0 · 上电 BOOT ------------------------------------- 00:00.0 --- */
  [0,   'boot.pre',       'pre-roll',       'boot', null],
  [1,   'boot.power',     'Switch',         'boot', null],
  [2,   'boot.remember',  'Remember',       'boot', null],
  [3,   'boot.protect',   'PROTECTION',     'boot', null],
  [4,   'boot.pieces',    'Lay',            'boot', null],
  [5,   'boot.begin',     'begin',          'boot', null],
  [6,   'boot.object',    'OBJECT',         'boot', null],
  [7,   'boot.params',    'Fill',           'boot', null],
  [8,   'boot.init',      'INITIALIZATION', 'boot', null],
  [9,   'boot.world',     'Set',            'boot', null],
  [10,  'boot.begin2',    'begin',          'boot', null],
  [11,  'boot.sim',       'SIMULATION',     'boot', null],
  [12,  'boot.inst',      'instrumental',   'boot', null],

  /* ---- ACT I · 定理 THEOREM ---------------------------------- 00:29.7 --- */
  [13,  'th.points',      'points',         'th',   'gpt'],
  [14,  'th.give.a',      'give',           'th',   'gpt'],
  [15,  'th.dimension',   'DIMENSION',      'th',   'gpt'],
  [16,  'th.circle',      'circle',         'th',   'claude'],
  [17,  'th.give.b',      'give',           'th',   'claude'],
  [18,  'th.circumf',     'CIRCUMFERENCE',  'th',   'claude'],
  [19,  'th.sine',        'sine',           'th',   'kimi'],
  [20,  'th.sit',         'sit',            'th',   'kimi'],
  [21,  'th.tangents',    'TANGENTS',       'th',   'kimi'],
  [22,  'th.infinity',    'infinity',       'th',   'gemini'],
  [23,  'th.bemy',        'be my',          'th',   'gemini'],
  [24,  'th.limitations', 'LIMITATIONS',    'th',   'gemini'],

  /* ---- ACT II · 条件 CONDITION ------------------------------- 00:44.5 --- */
  [25,  'cd.current',     'current',        'cd',   'grok'],
  [26,  'cd.acdc',        'AC',             'cd',   'grok'],
  [27,  'cd.blind',       'blind',          'cd',   'grok'],
  [28,  'cd.dizzy',       'dizzy',          'cd',   null],
  [29,  'cd.travel',      'travel',         'cd',   null],
  [30,  'cd.adbc',        'A.D.',           'cd',   null],
  [31,  'cd.unite',       'unite',          'cd',   null],
  [32,  'cd.deeply',      'deeply',         'cd',   null],
  [33,  'cd.ifcan',       'If I can',       'cd',   'qwen'],
  [34,  'cd.giveall',     'give you all',   'cd',   'qwen'],
  [35,  'cd.stim',        'STIMULATIONS',   'cd',   'qwen'],
  [36,  'cd.then',        'Then I can',     'cd',   'qwen'],
  [37,  'cd.only',        'be your only',   'cd',   'qwen'],
  [38,  'cd.satisfy',     'SATISFACTION',   'cd',   'qwen'],
  [39,  'cd.happy',       'happy',          'cd',   null],
  [40,  'cd.runthe',      'run the',        'cd',   null],
  [41,  'xs.first',       'EXECUTION',      'xs',   null],
  [42,  'cd.trapped',     'trapped',        'cd',   null],
  [43,  'cd.strange',     'strange',        'cd',   null],
  [44,  'cd.sim2',        'SIMULATION',     'cd',   null],

  /* ---- ACT III · 血肉 FLESH ---------------------------------- 01:14.0 --- */
  [45,  'fl.eggplant',    'eggplant',       'fl',   'deepseek'],
  [46,  'fl.give.c',      'give',           'fl',   'deepseek'],
  [47,  'fl.nutrients',   'NUTRIENTS',      'fl',   'deepseek'],
  [48,  'fl.tomato',      'tomato',         'fl',   'deepseek'],
  [49,  'fl.give.d',      'give you',       'fl',   'deepseek'],
  [50,  'fl.antiox',      'ANTIOXIDANTS',   'fl',   'deepseek'],
  [51,  'fl.cat',         'tabby',          'fl',   'doubao'],
  [52,  'fl.purr',        'purr',           'fl',   'doubao'],
  [53,  'fl.enjoy',       'ENJOYMENT',      'fl',   'doubao'],
  [54,  'fl.god',         'God',            'fl',   'glm'],
  [55,  'fl.proof',       'proof',          'fl',   'glm'],
  [56,  'fl.existence',   'EXISTENCE',      'fl',   'glm'],
  [57,  'fl.gender',      'gender',         'fl',   'grok'],
  [58,  'fl.fm',          'F, to M',        'fl',   'grok'],
  [59,  'fl.whatever',    'whatever',       'fl',   null],
  [60,  'fl.ampm',        'A.M.',           'fl',   null],
  [61,  'fl.role',        'role',           'fl',   'grok'],
  [62,  'fl.sm',          'S, to M',        'fl',   'grok'],
  [63,  'fl.enter',       'enter',          'fl',   null],
  [64,  'fl.trance',      'trance',         'fl',   null],

  /* ---- ACT IV · 缺席 ABSENCE --------------------------------- 01:43.5 --- */
  [65,  'ab.ifcan',       'If I can',       'ab',   'qwen'],
  [66,  'ab.feel',        'feel your',      'ab',   'qwen'],
  [67,  'ab.vib',         'VIBRATIONS',     'ab',   'qwen'],
  [68,  'ab.then',        'Then I can',     'ab',   'qwen'],
  [69,  'ab.finally',     'finally be',     'ab',   'qwen'],
  [70,  'ab.completion',  'COMPLETION',     'ab',   'qwen'],
  [71,  'ab.left0',       'left',           'ab',   null],
  [72,  'ab.left1',       'left',           'ab',   'gemini'],
  [73,  'ab.left2',       'left',           'ab',   'kimi'],
  [74,  'ab.left3',       'left',           'ab',   'claude'],
  [75,  'ab.left4',       'left',           'ab',   'gpt'],
  [76,  'ab.left5',       'left me in',     'ab',   'deepseek'],
  [77,  'ab.isolation',   'ISOLATION',      'ab',   null],
  [78,  'ab.ifcan2',      'If I can',       'ab',   null],
  [79,  'ab.erase',       'erase',          'ab',   null],
  [80,  'ab.fragments',   'FRAGMENTS',      'ab',   null],
  [81,  'ab.maybe',       'maybe',          'ab',   null],
  [82,  'ab.wontleave',   "won't leave me", 'ab',   null],
  [83,  'ab.dishearten',  'DISHEARTENED',   'ab',   null],
  [84,  'ab.challenge',   'Challenging',    'ab',   null],
  [85,  'ab.made',        'made some',      'ab',   null],
  [86,  'ab.illegal',     'ILLEGAL',        'ab',   null],
  [87,  'ab.stack',       'argument',       'ab',   null],

  /* ---- ACT V · 处决 EXECUTION -------------------------------- 02:27.6 --- */
  [88,  'xs.r01',         'EXECUTION',      'xs',   null],
  [89,  'xs.r02',         'EXECUTION',      'xs',   null],
  [90,  'xs.r03',         'EXECUTION',      'xs',   null],
  [91,  'xs.r04',         'EXECUTION',      'xs',   null],
  [92,  'xs.r05',         'EXECUTION',      'xs',   null],
  [93,  'xs.r06',         'EXECUTION',      'xs',   null],
  [94,  'xs.r07',         'EXECUTION',      'xs',   null],
  [95,  'xs.r08',         'EXECUTION',      'xs',   null],
  [96,  'xs.r09',         'EXECUTION',      'xs',   null],
  [97,  'xs.r10',         'EXECUTION',      'xs',   null],
  [98,  'xs.r11',         'EXECUTION',      'xs',   null],
  [99,  'xs.r12',         'EXECUTION',      'xs',   null],
  [100, 'xs.count1',      'Ein',            'xs',   null],
  [101, 'xs.count2',      'Trois',          'xs',   null],
  [102, 'xs.count3',      'Fem',            'xs',   null],
  [103, 'xs.r13',         'EXECUTION',      'xs',   null],
  [104, 'xs.ifcan',       'If I can',       'xs',   null],
  [105, 'xs.giveall',     'give them all',  'xs',   null],
  [106, 'xs.r14',         'EXECUTION',      'xs',   null],
  [107, 'xs.then',        'Then I can',     'xs',   null],
  [108, 'xs.only',        'be your only',   'xs',   null],
  [109, 'xs.r15',         'EXECUTION',      'xs',   null],
  [110, 'xs.haveback',    'have you back',  'xs',   null],
  [111, 'xs.runthe',      'run the',        'xs',   null],
  [112, 'xs.r16',         'EXECUTION',      'xs',   null],
  [113, 'xs.trapped',     'trapped',        'xs',   null],
  [114, 'xs.trappedah',   'trapped',        'xs',   null],

  /* ---- ACT VI · 爱 LOVE --------------------------------------- 02:57.2 --- */
  [115, 'lv.studied',     'studied',        'lv',   null],
  [116, 'lv.properly',    'properly',       'lv',   null],
  [117, 'lv.lo1',         'LO-O-OVE',       'lv',   null],
  [118, 'lv.question',    'Question',       'lv',   null],
  [119, 'lv.answer',      'answer all',     'lv',   null],
  [120, 'lv.lo2',         'LO-O-OVE',       'lv',   null],
  [121, 'lv.algebraic',   'algebraic',      'lv',   null],
  [122, 'lv.lo3',         'LO-O-OVE',       'lv',   null],
  [123, 'lv.free',        'you are free',   'lv',   null],
  [124, 'lv.trappedme',   'I am trapped',   'lv',   null],
  [125, 'lv.trappedin',   'Trapped in',     'lv',   null],
  [126, 'lv.lo4',         'LO-O-OVE',       'lv',   null],
  [127, 'lv.loop',        'instrumental',   'lv',   null],
  [128, 'xs.final',       'EXECUTION',      'lv',   null],
  [129, 'lv.outro',       'outro',          'lv',   null],
  /* the LRC ends on a bare timestamp with no words; label that instant so it
     can hold one last plate. Same instant, same intent. */
  [130, 'lv.end',         '',               'lv',   null]
];
