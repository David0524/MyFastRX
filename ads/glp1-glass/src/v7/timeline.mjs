// Version v7 "Without the strings" - the performance cut. Single source of truth for timing, shared by the film
// (src/v7/scene.mjs), the audio (audio/compose_v7.mjs, tools/music-from-track.py, tools/build-vo.mjs) and verify_v7.mjs.
// Built from v6 "Touch" (src/v6/) to the client's redesign brief: proposition first, one claim per beat, the flat
// price across doses as the hero proof point, her as the connective tissue. (v6 = the Touch cut, src/v6/.)
//
//  0.0 - 2.9   HOOK     her at the island, "GLP-1 care / without the strings." on screen within ~0.2 s, a sound cue
//  2.9 - 7.3   PRICE    cut on the action to her tap; the glass ring opens from her fingertip and a teal drop grows into
//                       the price pill: "Starting at $69" + its qualification, held ~2.5 s
//  7.0 - 12.8  NO STRINGS  "No / membership / fees." - the "Automatic refills" row flicks OFF - it becomes "Request
//                       refill", a fingertip presses it ("You request treatment / when you're ready.")
// 12.6 - 14.4  HER      a quiet cutaway: tea at home, an easy smile
// 14.0 - 17.6  INCLUDES "One price covers" + provider review / medication / shipping
// 17.6 - 21.0  PROOF    the frame snaps into the price pill (the music drops); the dose slider steps from lower to
//                       higher dose while "$69" holds: "Your price doesn't increase / as your dose does."
// 20.8 - 23.9  PAYOFF   her walk outdoors (no copy)
// 23.4 - 28.0  CTA      logo, "GLP-1 care / without the strings.", "See if you qualify", MyFastRx.com, disclaimer
//
// Footage: Higgsfield (Seedance 2.0) clips in footage/gen/, frames by tools/extract-gen.sh. Lifestyle character only:
// she never uses the app or any medication on screen.
export const SHIFT = 0;
export const FPS = 30, DURATION = 28.0, W = 1080, H = 1920;
export const BPM = 120, BEAT = 60 / BPM;

export const OPEN = {cut: 2.9, dive: 7.0};                // dive: the glass world takes over (the UI section starts)
export const OPENING = {dir: 'open', fps: 24, n: 121, from: 0.8};   // she reaches for the phone, picks it up, looks at it
// the tap clip: 24 fps, her fingertip touches the screen on frame 41 (0-based) at (271, 657) in the 720p source
export const TAP = {dir: 'tap', fps: 24, n: 121, contact: 41, at: 3.3, finger: [271 * 1.5, 657 * 1.5]};
export const HOOK = {ring: [3.3, 4.25], bead: {t0: 3.34, land: 3.6}, glide: [3.6, 4.3], qualIn: [4.22, 4.48], priceIn: [4.28, 4.54]};
export const TEA = {dir: 'tea', fps: 24, n: 121, from: 2.55};   // the cutaway from 2.55 s: the mug lowered, her smile widening

export const SCENES = [
  {id: 'hook',     t0: 0,     t1: 7.3},
  {id: 'control',  t0: 7.0,   t1: 13.0},
  {id: 'tea',      t0: 12.6,  t1: 14.4},
  {id: 'covers',   t0: 14.0,  t1: 21.3},
  {id: 'walk',     t0: 20.8,  t1: 23.9},
  {id: 'end',      t0: 23.4,  t1: DURATION},
];

// the VO (vo/body_v3.wav, one take; vo/ELEVENLABS_PROMPT_v3.md). Until it arrives these are the planned windows: the
// picture is cut to them, and VO_EDIT stays empty (silent placeholder). On delivery each line is cut at its pause and
// placed at its `at`; the windows below are then re-measured.
export const VO_FILE = 'vo/body_v3.wav';
export const VO_EDIT = [];
export const VO = [
  {t0: 0.30,  t1: 2.45,  text: 'GLP-1 care, without the strings.'},
  {t0: 4.40,  t1: 5.90,  text: 'Starting at $69.'},
  {t0: 7.10,  t1: 12.40, text: "No membership fees. No automatic refills. You request treatment when you're ready."},
  {t0: 14.20, t1: 17.00, text: 'One price covers your provider review, medication, and shipping.'},
  {t0: 18.00, t1: 20.60, text: "And your price doesn't increase as your dose does."},
  {t0: 24.20, t1: 26.40, text: 'See if you qualify at MyFastRx.com.'},
];
// word onsets the picture cuts on (planned; re-measured from the take)
export const WORDS = {
  glp: 0.30, without: 1.30, starting: 4.40, price69: 5.05,
  noFees: 7.10, membership: 7.30, fees: 7.80, noAuto: 8.70, refills: 9.55, you: 10.30, when: 11.30,
  one: 14.20, provider: 14.95, medication: 15.80, shipping: 16.55,
  andYour: 18.00, asYourDose: 19.30, see: 24.20, url: 25.30,
};
export const CAPTIONS = [];
const Wd = WORDS;

export const CUES = {
  // hook
  head0:      [{t0: 0.12, land: 0.40}, {t0: 0.24, land: 0.52}],   // "GLP-1 care," / "without the strings."
  head0Out:   {t0: 2.74, t1: 2.88},
  scrim:      [0.0, 0.25],
  priceOut0:  {t0: 6.86, t1: 7.00},
  qualOut0:   {t0: 6.98, t1: 7.12},
  pillOut:    {t0: 7.00, t1: 7.30},
  // no strings
  head2:      [{t0: Wd.noFees - .04, land: Wd.noFees + .22}, {t0: Wd.membership - .02, land: Wd.membership + .24}, {t0: Wd.fees - .04, land: Wd.fees + .22}],
  head2Out:   {t0: 8.40, t1: 8.56},
  toggleIn:   {t0: 8.56, land: 8.92},
  head3:      [{t0: Wd.noAuto - .04, land: Wd.noAuto + .24}],
  toggleOff:  {t0: Wd.refills, t1: Wd.refills + .2},
  head3Out:   {t0: 10.06, t1: 10.22},
  morphBtn:   {t0: 10.06, land: 10.42},
  btnPress:   10.80,
  checkPop:   10.86,
  wipe1:      {t0: 12.55, t1: 13.0},           // a glass bar sweeps down: her (tea) above it
  // her
  wipe2:      {t0: 14.0, t1: 14.42},           // and up: the covers scene below it
  // includes
  coversIn:   {t0: 14.16, land: 14.42},
  frameIn:    {t0: 14.0, land: 14.4},
  shots:      [{t0: 14.20, id: 'rx'}, {t0: Wd.medication - .12, id: 'vial'}, {t0: Wd.shipping - .12, id: 'box'}],
  labels:     [{t0: Wd.provider - .06, land: Wd.provider + .20}, {t0: Wd.medication - .06, land: Wd.medication + .20}, {t0: Wd.shipping - .06, land: Wd.shipping + .20}],
  coversOut:  {t0: 17.00, t1: 17.16},
  // proof
  morphPill:  {t0: 17.02, land: 17.60},          // the frame snaps into the pill on the music's drop
  priceIn:    {t0: 17.66, land: 17.92},
  sliderIn:   {t0: 17.80, land: 18.16},
  doseLine:   [{t0: Wd.andYour - .04, land: Wd.andYour + .24}, {t0: Wd.asYourDose - .04, land: Wd.asYourDose + .24}],
  drag:       {t0: 18.40, t1: 20.20},            // four detents, lower -> higher dose; the price holds on each
  detents:    4,
  priceOut:   {t0: 20.74, t1: 20.87},
  qualOut:    {t0: 20.87, t1: 21.00},
  wipe3:      {t0: 20.80, t1: 21.30},            // a glass bar sweeps down: her walk above it
  // payoff
  wipe4:      {t0: 23.40, t1: 23.90},            // up: the end card below it
  // end card
  logoIn:     {t0: 23.62, land: 23.94},
  tag:        [{t0: 23.70, land: 24.00}, {t0: 23.80, land: 24.10}],   // "GLP-1 care" / "without the strings."
  discIn:     {t0: 23.92, land: 24.22},
  ctaIn:      {t0: 23.78, land: 24.14},          // "See if you qualify" (24.2)
  ctaClick:   24.62,
  urlIn:      {t0: Wd.url - .06, land: Wd.url + .26},
  badgePop:   25.70,
  vialIn:     {t0: 25.76, land: 26.14},
  vialGlint:  [26.14, 26.56],
  finalStill: 26.60,
};
CUES.pulseIn = {t0: 1e9, land: 1e9};          // (v6 heartbeat cues, unused)
CUES.wipeA = CUES.wipe1;

// touches: a glass fingertip disc lands, presses, and leaves a glass ripple - the request button, each dose detent
// (held through the drag), the CTA
export const TOUCHES = [{at: CUES.btnPress, target: 'btn'}, {at: CUES.drag.t0, hold: CUES.drag.t1, target: 'knob'}, {at: CUES.ctaClick, target: 'cta'}];
const detentT = k => +(CUES.drag.t0 + (CUES.drag.t1 - CUES.drag.t0) * k / (CUES.detents - 1)).toFixed(3);
export const DETENTS = Array.from({length: CUES.detents}, (_, k) => detentT(k));

export const SFX = [
  {id: 'impact',     at: CUES.head0[0].t0 + .02, gain: -13},   // the hook's sonic cue as the headline lands
  {id: 'whoosh',     at: CUES.head0[0].t0 - .04, gain: -24},
  {id: 'tap_glass',  at: CUES.head0[1].land - .04, gain: -24},
  {id: 'swish',      at: OPEN.cut - .06, gain: -28},          // the cut on the action
  {id: 'tap_glass',  at: TAP.at, gain: -9},                   // her fingertip touches the glass
  {id: 'whoosh',     at: TAP.at + .03, gain: -21},            // the ring spreads
  {id: 'slide_soft', at: HOOK.glide[0], gain: -22},
  {id: 'impact',     at: HOOK.glide[1], gain: -15},           // the $69 reveal
  {id: 'tap_low',    at: HOOK.glide[1] + .01, gain: -16},
  {id: 'swish',      at: CUES.pillOut.t0, gain: -26},
  {id: 'tick',       at: CUES.head2[0].land - .1, gain: -24},
  {id: 'tick',       at: CUES.head2[1].land - .1, gain: -25},
  {id: 'tap_low',    at: CUES.head2[2].land - .08, gain: -20},
  {id: 'swish',      at: CUES.head2Out.t0, gain: -25},
  {id: 'tap_low',    at: CUES.toggleIn.land, gain: -19},
  {id: 'toggle',     at: CUES.toggleOff.t1 - .05, gain: -10},   // automatic refills: OFF
  {id: 'slide_soft', at: CUES.morphBtn.t0, gain: -22},
  {id: 'press',      at: CUES.btnPress, gain: -11},
  {id: 'tap_glass',  at: CUES.checkPop + .02, gain: -18},
  {id: 'whoosh',     at: CUES.wipe1.t0, gain: -22},
  {id: 'whoosh',     at: CUES.wipe2.t0, gain: -22},
  {id: 'tap_low',    at: CUES.coversIn.land, gain: -20},
  {id: 'shimmer',    at: CUES.shots[1].t0 - .06, gain: -25},
  {id: 'shimmer',    at: CUES.shots[2].t0 - .06, gain: -25},
  {id: 'tick',       at: CUES.labels[0].land - .1, gain: -22},
  {id: 'tick',       at: CUES.labels[1].land - .1, gain: -22},
  {id: 'tick',       at: CUES.labels[2].land - .1, gain: -22},
  {id: 'slide_soft', at: CUES.morphPill.t0, gain: -21},
  {id: 'tap_glass',  at: CUES.morphPill.land + .01, gain: -15},
  {id: 'tap_low',    at: CUES.sliderIn.land, gain: -20},
  ...DETENTS.slice(1).map(t => ({id: 'tick', at: t, gain: -15})),   // each dose step clicks; the price doesn't move
  {id: 'tap_glass',  at: CUES.drag.t1 + .02, gain: -17},
  {id: 'whoosh',     at: CUES.wipe3.t0, gain: -21},
  {id: 'whoosh',     at: CUES.wipe4.t0, gain: -21},
  {id: 'tap_low',    at: CUES.ctaIn.land, gain: -18},
  {id: 'click',      at: CUES.ctaClick, gain: -13},           // the CTA
  {id: 'tap_low',    at: CUES.vialIn.land, gain: -21},
];
// the music: the client's track (audio/src/music_user.flac; tools/music-from-track.py). 120 BPM on the film's grid;
// its drop (a big kick after a riser, 21.10 s in the file) lands as the frame snaps into the pill for the proof point.
export const MUSIC_TRACK = {src: 'audio/src/music_user.flac', drop: 21.10, at: CUES.morphPill.land, duckDb: -7, lufs: -24.1, fadeOut: 1.2,
  lift: [[0, 12], [7, 10], [14, 0]],   // dB over film time: the file's build starts very soft (it enters at ~2.0 s)
  endDuckDb: -12, stem: 'audio/stems/v7_music_track.wav'};
// (the coded bed in audio/compose_v7.mjs is not used by the v7 mix; these marks only keep it building)
export const MUSIC = {riser: [TAP.at + .2, OPEN.dive], drop: OPEN.dive, fill: [[12.3, 12.8], [17.1, 17.6]], breakAt: 17.1, endAt: 21.5};
