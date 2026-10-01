// Version v6 "Touch" - single source of truth for timing. Shared by the film (src/v6/scene.mjs), the audio build
// (audio/compose_v6.mjs, tools/build-vo.mjs) and verify_v6.mjs. (v5 = the 3D-hook hype cut, src/v5/.)
//
// 0.00 - 3.00  HOOK: real footage. Close on her hand over her phone in a bright kitchen; she taps the black screen at
//              1.2 s and a liquid-glass ring spreads from her fingertip across the frame - inside it the glass world,
//              outside it her kitchen. A teal glass drop left at the touch point glides up and grows into the price
//              pill, landing at 2.42 s; "$69" rises in it with its qualification (which leads). No VO, no logo.
// 3.00 - 18.6  the v5 glass film on the beat (120 BPM), the glass heartbeat living in the bottom band.
// 18.6 - 21.2  real again: the heartbeat lifts off to reveal her walking outdoors, "Clear pricing. / Clear care." on
//              frosted glass above her; a second heartbeat sweeps up into the end card.
//
// Footage: Higgsfield (Seedance 2.0) clips in footage/gen/, frames by tools/extract-gen.sh. Lifestyle character only.
export const SHIFT = 0;
export const FPS = 30, DURATION = 25.5 + SHIFT, W = 1080, H = 1920;
export const BPM = 120, BEAT = 60 / BPM;          // a bar = 2 s; downbeats at 4, 6, 8 ... (the hook ends on one)
const shiftT = v => typeof v === 'number' ? +(v + SHIFT).toFixed(4) : Array.isArray(v) ? v.map(shiftT)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ['id', 'text', 'file', 'src'].includes(k) ? x : shiftT(x)])) : v;

export const OPEN = {dive: 3.0};                 // the hook hands over to the strings scene at 3.0 s
// the tap clip: 24 fps, her fingertip touches the screen on frame 41 (0-based) at (271, 657) in the 720p source
export const TAP = {dir: 'tap', fps: 24, n: 121, contact: 41, at: 1.2, finger: [271 * 1.5, 657 * 1.5]};
export const HOOK = {ring: [1.2, 2.2], bead: {t0: 1.24, land: 1.5}, glide: [1.66, 2.42], qualIn: [2.34, 2.6], priceIn: [2.4, 2.66]};

export const SCENES = [{id: 'hook', t0: 0, t1: OPEN.dive}, ...shiftT([
  {id: 'strings', t0: 3.0,   t1: 5.85},    // "GLP-1 care, with no strings attached,"
  {id: 'control', t0: 5.85,  t1: 8.45},    // "no membership fees, no automatic refills."
  {id: 'request', t0: 8.45,  t1: 10.80},   // "You request each one when you're ready."
  {id: 'covers',  t0: 10.80, t1: 14.60},   // "One price covers your provider review, medication, and shipping,"
  {id: 'price',   t0: 14.60, t1: 18.90},   // "starting at $69." + the dose slider (on-screen: your price doesn't climb...)
  {id: 'end',     t0: 18.90, t1: 25.5},    // "Clear pricing, clear care. See if you qualify at MyFastRx.com."
])];

// cut points sit in measured pauses: 7.44|7.88, 11.04|11.37, 12.85|13.16 (file time)
export const VO_EDIT = [   // `at` below is pre-SHIFT
  {file: 'vo/body_v2.wav', src: [0, 7.66],      at: 3.00},    // lines 1-3, as read          (+3.00)
  {file: 'vo/body_v2.wav', src: [7.66, 11.20],  at: 11.00},   // "One price covers ..."      (+3.34)
  {file: 'vo/body_v2.wav', src: [11.20, 13.00], at: 15.00},   // "starting at $69."          (+3.80)
  {file: 'vo/body_v2.wav', src: [13.00, 17.828], at: 19.00},  // the close, on the end card  (+6.00)
].map(e => ({...e, at: +(e.at + SHIFT).toFixed(4)}));
export const VO = shiftT([          // measured speech windows; the music ducks under these
  {t0: 3.01,  t1: 5.66,  text: 'GLP-1 care, with no strings attached,'},
  {t0: 5.94,  t1: 10.44, text: "no membership fees, no automatic refills. You request each one when you're ready."},
  {t0: 11.22, t1: 14.38, text: 'One price covers your provider review, medication, and shipping,'},
  {t0: 15.17, t1: 16.65, text: 'starting at $69.'},
  {t0: 19.16, t1: 23.73, text: 'Clear pricing, clear care. See if you qualify at MyFastRx.com.'},
]);
// word onsets (video time) the picture cuts on
const WORDS0 = {
  glp: 3.00, care: 3.88, noStrings: 4.56, attached: 5.10,
  membership: 6.02, noAuto: 7.18, refills: 7.68, you: 8.66, request: 8.72, when: 9.68, ready: 10.14,
  one: 11.24, provider: 12.12, medication: 13.06, shipping: 13.92,
  starting: 15.17, price69: 15.60,
  clear1: 19.16, clear2: 20.24, see: 21.18, qualify: 21.54, url: 22.26,
};
// captions only where the on-screen type doesn't already say the line (verbatim VO). In v5 every line is set as
// kinetic type on screen ("You request each one / when you're ready." is a headline), so there are none.
export const CAPTIONS = [];
export const WORDS = shiftT(WORDS0);

const Wd = WORDS0;
export const CUES = shiftT({
  // strings
  priceOut0:  {t0: 3.02, t1: 3.16},               // the hook's "$69" leaves first, then its qualification
  qualOut0:   {t0: 3.14, t1: 3.28},
  paneForm:   {t0: 3.06, land: 3.50},             // the price pill grows into the title pane
  head1:      [{t0: 3.26, land: 3.52}, {t0: Wd.noStrings - .06, land: Wd.noStrings + .20}, {t0: Wd.attached - .06, land: Wd.attached + .20}],
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
  pulseIn:    {t0: 3.06, land: 3.60},             // the resident glass heartbeat rises into the bottom band
  wipeB:      {t0: 10.50, t1: 11.10},             // the heartbeat lifts off and sweeps up: the old scene above it, the new one below
  pulseBack:  {t0: 10.92, land: 11.40},           // a new one rises back into the band
  // covers
  coversIn:   {t0: 11.18, land: 11.44},           // "One price covers" (11.24)
  frameIn:    {t0: 10.74, land: 11.22},           // the glass product frame (in as the wipe passes: no empty beat)
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
  wipeC:      {t0: 18.55, t1: 19.15},             // it lifts off again: behind it, her walk
  walkTag:    [{t0: 19.08, land: 19.36}, {t0: 20.14, land: 20.42}],   // "Clear pricing." / "Clear care." on frosted glass
  wipeD:      {t0: 20.72, t1: 21.24},             // a heartbeat sweeps up from the bottom into the end card
  // end card (v3's, re-timed)
  logoIn:     {t0: 21.00, land: 21.32},
  tag:        [{t0: 21.06, land: 21.36}, {t0: 21.14, land: 21.44}],   // the tagline, set on the card after she has said it
  discIn:     {t0: 21.28, land: 21.58},           // fine print: end card only, then still to the last frame
  ctaIn:      {t0: 21.10, land: 21.46},           // "See if you qualify" (21.18)
  ctaClick:   21.86,
  urlIn:      {t0: 22.20, land: 22.52},           // "MyFastRx.com" (22.26)
  badgePop:   22.95,
  vialIn:     {t0: 23.02, land: 23.40},           // the vial rises out of a line under the disclaimer, one glint across it
  vialGlint:  [23.40, 23.85],
  finalStill: 23.90,
});

// cursor: [t, x, y, pressed, target?] (screen coords; targets resolved in scene.mjs)
export const CURSOR = [
  [8.40, 1160, 1000, 0], [8.88, 0, 0, 0, 'btn'], [8.96, 0, 0, 1, 'btn'], [9.08, 0, 0, 0, 'btn'], [9.90, 1160, 1060, 0],
  [16.70, 1160, 1060, 0], [17.05, 0, 0, 0, 'knob0'], [17.15, 0, 0, 1, 'knob0'], [18.05, 0, 0, 1, 'knob1'], [18.15, 0, 0, 0, 'knob1'], [18.60, 1160, 1080, 0],
  [21.10, 1160, 820, 0], [21.72, 0, 0, 0, 'cta'], [21.82, 0, 0, 1, 'cta'], [21.92, 0, 0, 0, 'cta'], [22.70, 1160, 760, 0],
].map(k => [+(k[0] + SHIFT).toFixed(4), ...k.slice(1)]);

export const SFX = [
  {id: 'tap_glass',  at: TAP.at, gain: -7},        // her fingertip touches the glass
  {id: 'whoosh',     at: TAP.at + .03, gain: -21}, // the ring spreads
  {id: 'shimmer',    at: TAP.at + .12, gain: -25},
  {id: 'slide_soft', at: HOOK.glide[0], gain: -22},  // the drop glides up and grows into the pill
  {id: 'tap_low',    at: HOOK.glide[1], gain: -16},
  {id: 'tap_glass',  at: HOOK.glide[1] + .02, gain: -23},
  {id: 'impact',     at: OPEN.dive, gain: -12},    // the drop
  {id: 'slide_soft', at: CUES.paneForm.t0, gain: -22},
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
  {id: 'whoosh',     at: CUES.wipeD.t0, gain: -21},
  {id: 'tap_low',    at: CUES.ctaIn.land, gain: -18},
  {id: 'click',      at: CUES.ctaClick, gain: -14},
  {id: 'chime_end',  at: CUES.badgePop, gain: -24},
  {id: 'tap_low',    at: CUES.vialIn.land, gain: -21},
  {id: 'shimmer',    at: CUES.vialGlint[0] + .05, gain: -28},
];
// music arrangement marks (audio/compose_v5.mjs)
export const MUSIC = {riser: [TAP.at + .2, OPEN.dive], drop: OPEN.dive, ...shiftT({fill: [[10.25, 11.0], [14.55, 15.0]], breakAt: 14.6, endAt: 19.0})};
