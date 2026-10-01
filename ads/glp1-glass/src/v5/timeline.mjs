// Version v5 "Hype" - single source of truth for timing. Shared by the 3D hook (src/v5/opening3d.mjs), the 2D glass film
// (src/v5/scene.mjs), the audio build (audio/compose_v5.mjs, tools/build-vo.mjs) and verify_v5.mjs.
// (v3 = commit cbd39d2, sources in src/v2/*_v3.mjs; v4 = the 3D tabletop, src/t3/.)
//
// 0.00 - 3.00  HOOK (three.js): a teal glass pill taps down on frame 1, glides, settles over the printed "$69" (its
//              qualification printed beneath it), a glint crosses it, the camera whips overhead and dives into the glass.
//              No VO, no logo, no pitch.
// 3.00 - end   2D Liquid Glass film on the beat (120 BPM): kinetic type, glass UI, the photo plates as product shots.
//
// VO: vo/body_v2.wav (ElevenLabs read at 1.15x), cut only in its pauses (speech edges: tools/vo-env.mjs) and placed on
// downbeats. Word times below are faster-whisper on the file (tools/transcribe.py), shifted by each segment's offset.
export const FPS = 30, DURATION = 25.5, W = 1080, H = 1920;
export const BPM = 120, BEAT = 60 / BPM;          // a bar = 2 s; downbeats at 3, 5, 7 ... (hook ends on one)

export const OPEN = {touch: 0, land: 1.45, startX: 1.15, glint: [1.70, 2.25], crane: [2.15, 2.62], dive: 3.0};

export const SCENES = [
  {id: 'hook',    t0: 0,     t1: 3.0},
  {id: 'strings', t0: 3.0,   t1: 5.85},    // "GLP-1 care, with no strings attached,"
  {id: 'control', t0: 5.85,  t1: 8.45},    // "no membership fees, no automatic refills."
  {id: 'request', t0: 8.45,  t1: 10.80},   // "You request each one when you're ready."
  {id: 'covers',  t0: 10.80, t1: 14.60},   // "One price covers your provider review, medication, and shipping,"
  {id: 'price',   t0: 14.60, t1: 18.90},   // "starting at $69." + the dose slider (on-screen: your price doesn't climb...)
  {id: 'end',     t0: 18.90, t1: 25.5},    // "Clear pricing, clear care. See if you qualify at MyFastRx.com."
];

// cut points sit in measured pauses: 7.44|7.88, 11.04|11.37, 12.85|13.16 (file time)
export const VO_EDIT = [
  {file: 'vo/body_v2.wav', src: [0, 7.66],      at: 3.00},    // lines 1-3, as read          (+3.00)
  {file: 'vo/body_v2.wav', src: [7.66, 11.20],  at: 11.00},   // "One price covers ..."      (+3.34)
  {file: 'vo/body_v2.wav', src: [11.20, 13.00], at: 15.00},   // "starting at $69."          (+3.80)
  {file: 'vo/body_v2.wav', src: [13.00, 17.828], at: 19.00},  // the close, on the end card  (+6.00)
];
export const VO = [          // measured speech windows (video time); the music ducks under these
  {t0: 3.01,  t1: 5.66,  text: 'GLP-1 care, with no strings attached,'},
  {t0: 5.94,  t1: 10.44, text: "no membership fees, no automatic refills. You request each one when you're ready."},
  {t0: 11.22, t1: 14.38, text: 'One price covers your provider review, medication, and shipping,'},
  {t0: 15.17, t1: 16.65, text: 'starting at $69.'},
  {t0: 19.16, t1: 23.73, text: 'Clear pricing, clear care. See if you qualify at MyFastRx.com.'},
];
// word onsets (video time) the picture cuts on
export const WORDS = {
  glp: 3.00, care: 3.88, noStrings: 4.56, attached: 5.10,
  membership: 6.02, noAuto: 7.18, refills: 7.68, you: 8.66, request: 8.72, ready: 10.14,
  one: 11.24, provider: 12.12, medication: 13.06, shipping: 13.92,
  starting: 15.17, price69: 15.60,
  clear1: 19.16, clear2: 20.24, see: 21.18, qualify: 21.54, url: 22.26,
};
// captions only where the on-screen type doesn't already say the line (verbatim VO). In v5 every line is set as
// kinetic type on screen ("You request each one / when you're ready." is a headline), so there are none.
export const CAPTIONS = [];

const Wd = WORDS;
export const CUES = {
  // strings
  paneForm:   {t0: 3.00, land: 3.42},             // the glass we dived into contracts into the title pane
  head1:      [{t0: 3.04, land: 3.30}, {t0: Wd.noStrings - .06, land: Wd.noStrings + .20}, {t0: Wd.attached - .06, land: Wd.attached + .20}],
  twineIn:    {t0: 4.40, land: 4.80},             // a taut string under the title
  snap:       5.42,                               // ...snaps at the end of "attached"
  wipeA:      {t0: 5.66, t1: 6.00},               // a glass bar sweeps across: new scene left of it (cut on the downbeat... 6.0)
  // control
  cardIn:     {t0: 5.90, land: 6.30},             // the navy card slides in ("no membership fees")
  head2:      [{t0: Wd.membership - .04, land: Wd.membership + .24}],
  cardOut:    {t0: 6.86, t1: 7.12},               // ...and is flicked away
  head2Out:   {t0: 6.92, t1: 7.08},
  toggleIn:   {t0: 7.00, land: 7.36},
  head3:      [{t0: Wd.noAuto - .04, land: Wd.noAuto + .24}],
  toggleOff:  {t0: 7.66, t1: 7.86},               // flicks OFF on "refills"
  head3Out:   {t0: 8.30, t1: 8.46},
  // request
  morphBtn:   {t0: 8.30, land: 8.66},             // the toggle becomes the "Request refill" button
  btnPress:   9.02,                               // "you request" -> the cursor presses it
  checkPop:   9.08,
  wipeB:      {t0: 10.50, t1: 11.10},             // a glass heartbeat sweeps up: the old scene above it, the new one below
  // covers
  coversIn:   {t0: 11.18, land: 11.44},           // "One price covers" (11.24)
  frameIn:    {t0: 11.02, land: 11.50},           // the glass product frame
  shots:      [{t0: 11.40, id: 'rx'}, {t0: 12.98, id: 'vial'}, {t0: 13.84, id: 'box'}],   // glint swaps just before each word
  labels:     [{t0: Wd.provider - .06, land: Wd.provider + .20}, {t0: Wd.medication - .06, land: Wd.medication + .20}, {t0: Wd.shipping - .06, land: Wd.shipping + .20}],
  coversOut:  {t0: 14.40, t1: 14.56},
  // price
  morphPill:  {t0: 14.42, land: 15.00},           // the frame contracts into the teal price pill, landing on the downbeat
  priceIn:    {t0: 15.06, land: 15.32},           // "starting at" 15.17, "$69" 15.60
  sliderIn:   {t0: 16.45, land: 16.85},
  doseLine:   {t0: 16.60, land: 16.90},           // on-screen: "Your price doesn't climb / as your dose does."
  drag:       {t0: 17.15, t1: 18.05},
  priceOut:   {t0: 18.45, t1: 18.58},             // the $69 leaves first, then its qualification, before the wipe reaches them
  qualOut:    {t0: 18.58, t1: 18.70},
  wipeC:      {t0: 18.55, t1: 19.15},
  // end card (v3's, re-timed)
  logoIn:     {t0: 18.98, land: 19.32},
  tag:        [{t0: 19.10, land: 19.40}, {t0: 20.18, land: 20.48}],   // "Clear pricing." / "Clear care."
  discIn:     {t0: 19.30, land: 19.60},           // fine print: end card only, then still to the last frame
  ctaIn:      {t0: 21.02, land: 21.40},           // "See if you qualify" (21.18)
  ctaClick:   21.86,
  urlIn:      {t0: 22.20, land: 22.52},           // "MyFastRx.com" (22.26)
  badgePop:   22.95,
  finalStill: 23.60,
};

// cursor: [t, x, y, pressed, target?] (screen coords; targets resolved in scene.mjs)
export const CURSOR = [
  [8.40, 1160, 1000, 0], [8.88, 0, 0, 0, 'btn'], [8.96, 0, 0, 1, 'btn'], [9.08, 0, 0, 0, 'btn'], [9.90, 1160, 1060, 0],
  [16.70, 1160, 1060, 0], [17.05, 0, 0, 0, 'knob0'], [17.15, 0, 0, 1, 'knob0'], [18.05, 0, 0, 1, 'knob1'], [18.15, 0, 0, 0, 'knob1'], [18.60, 1160, 1080, 0],
  [21.10, 1160, 820, 0], [21.72, 0, 0, 0, 'cta'], [21.82, 0, 0, 1, 'cta'], [21.92, 0, 0, 0, 'cta'], [22.70, 1160, 760, 0],
];

export const SFX = [
  {id: 'tap_glass',  at: 0.0, gain: -7},           // the glass tap, heard on frame 1
  {id: 'slide_long', at: 0.04, gain: -25},         // gliding on the table
  {id: 'tap_low',    at: OPEN.land, gain: -16},    // it settles on the price
  {id: 'tap_glass',  at: OPEN.land + .02, gain: -23},
  {id: 'shimmer',    at: OPEN.glint[0] + .1, gain: -27},
  {id: 'whoosh',     at: OPEN.crane[0], gain: -19},  // whip overhead, dive
  {id: 'impact',     at: 3.0, gain: -11},          // the drop: into the glass
  {id: 'tap_glass',  at: CUES.paneForm.land, gain: -22},
  {id: 'tick',       at: CUES.twineIn.land, gain: -24},
  {id: 'snap',       at: CUES.snap, gain: -13},
  {id: 'whoosh',     at: CUES.wipeA.t0 - .05, gain: -21},
  {id: 'tap_low',    at: CUES.cardIn.land, gain: -18},
  {id: 'swish',      at: CUES.cardOut.t0, gain: -18},
  {id: 'tap_low',    at: CUES.toggleIn.land, gain: -19},
  {id: 'toggle',     at: CUES.toggleOff.t1 - .05, gain: -11},
  {id: 'slide_soft', at: CUES.morphBtn.t0, gain: -22},
  {id: 'press',      at: CUES.btnPress, gain: -12},
  {id: 'tap_glass',  at: CUES.checkPop + .02, gain: -18},
  {id: 'whoosh',     at: CUES.wipeB.t0, gain: -19},
  {id: 'tap_low',    at: CUES.frameIn.land, gain: -18},
  {id: 'shimmer',    at: CUES.shots[1].t0 - .06, gain: -25},
  {id: 'shimmer',    at: CUES.shots[2].t0 - .06, gain: -25},
  {id: 'tick',       at: CUES.labels[0].land - .1, gain: -22},
  {id: 'tick',       at: CUES.labels[1].land - .1, gain: -22},
  {id: 'tick',       at: CUES.labels[2].land - .1, gain: -22},
  {id: 'slide_soft', at: CUES.morphPill.t0, gain: -21},
  {id: 'impact',     at: CUES.morphPill.land, gain: -14},
  {id: 'tap_glass',  at: CUES.morphPill.land + .01, gain: -15},
  {id: 'tap_low',    at: CUES.sliderIn.land, gain: -19},
  {id: 'slide_long', at: CUES.drag.t0, gain: -27},
  {id: 'tap_glass',  at: CUES.drag.t1, gain: -19},
  {id: 'whoosh',     at: CUES.wipeC.t0, gain: -20},
  {id: 'tap_low',    at: CUES.ctaIn.land, gain: -18},
  {id: 'click',      at: CUES.ctaClick, gain: -14},
  {id: 'chime_end',  at: CUES.badgePop, gain: -24},
];
// music arrangement marks (audio/compose_v5.mjs)
export const MUSIC = {riser: [1.9, 3.0], drop: 3.0, fill: [[10.25, 11.0], [14.55, 15.0]], breakAt: 14.6, endAt: 19.0};
