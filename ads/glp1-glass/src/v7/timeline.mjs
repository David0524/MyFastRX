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
export const FPS = 30, DURATION = 28.8, W = 1080, H = 1920;
export const BPM = 120, BEAT = 60 / BPM;

export const OPEN = {cut: 2.9, dive: 7.0};                // dive: the glass world takes over (the UI section starts)
export const OPENING = {dir: 'open', fps: 24, n: 121, from: 0.8};   // she reaches for the phone, picks it up, looks at it
// the tap clip: 24 fps, her fingertip touches the screen on frame 41 (0-based) at (271, 657) in the 720p source
export const TAP = {dir: 'tap', fps: 24, n: 121, contact: 41, at: 3.3, finger: [271 * 1.5, 657 * 1.5]};
export const HOOK = {ring: [3.3, 4.25], bead: {t0: 3.34, land: 3.6}, glide: [3.6, 4.3], qualIn: [4.22, 4.48], priceIn: [4.28, 4.54]};
export const TEA = {dir: 'tea', fps: 24, n: 121, from: 2.55};   // the cutaway from 2.55 s: the mug lowered, her smile widening

export const SCENES = [
  {id: 'hook',     t0: 0,     t1: 7.3},
  {id: 'control',  t0: 7.0,   t1: 12.75},
  {id: 'tea',      t0: 12.3,  t1: 13.87},
  {id: 'covers',   t0: 13.45, t1: 21.8},
  {id: 'walk',     t0: 21.3,  t1: 24.4},
  {id: 'end',      t0: 23.9,  t1: DURATION},
];

// the VO: vo/body_v3.wav (ElevenLabs, Susan Kathleen, one take, 2026-10-02; vo/ELEVENLABS_PROMPT_v3.md), cut at its
// measured pauses (silencedetect -42 dB) and placed line by line. `src` = file time, `at` = film time of src[0].
export const VO_FILE = 'vo/body_v3.wav';
const VOL = [   // [src0, src1, at]  speech inside each cut: src0 + ~.04 .. src1 - ~.05
  [0.00, 2.454, 0.40, 'vo/body_v3_l1.wav'],   // "GLP-1 care, without the strings." - the tightened "G-L-P-1" (tools/tighten-glp.py):
                                              //   it starts 0.3 s later and "care" (0.85 s in this file) still lands at 1.25
  [3.05, 4.90, 4.25],     // "Starting at $69."
  [5.13, 6.42, 7.05],     // "No membership fees."
  [6.48, 8.05, 8.62],     // "No automatic refills."
  [8.38, 10.35, 10.30],   // "You request treatment when you're ready."
  [10.74, 14.52, 13.75],  // "One price covers your provider review, medication, and shipping." (starts over her cutaway)
  [14.63, 17.20, 18.35],  // "And your price doesn't increase as your dose does."
  [17.49, 20.62, 24.55],  // "See if you qualify at MyFastRx.com."
];
export const VO_EDIT = VOL.map(([a, b, at, file]) => ({file: file || VO_FILE, src: [a, b], at}));
const sp = (k, a, b) => +(VOL[k][2] + (a - VOL[k][0])).toFixed(2), win = (k, a, b, text) => ({t0: sp(k, a), t1: sp(k, b), text});
export const VO = [   // measured speech windows (the music ducks under these)
  win(0, 0.02, 2.40, 'GLP-1 care, without the strings.'),
  win(1, 3.09, 4.85, 'Starting at $69.'),
  {t0: sp(2, 5.17), t1: sp(4, 10.30), text: "No membership fees. No automatic refills. You request treatment when you're ready."},
  win(5, 10.79, 14.47, 'One price covers your provider review, medication, and shipping.'),
  win(6, 14.68, 17.15, "And your price doesn't increase as your dose does."),
  win(7, 17.54, 20.56, 'See if you qualify at MyFastRx.com.'),
];
// word onsets (film time; faster-whisper word times, onsets snapped to the measured pauses)
export const WORDS = {
  glp: sp(0, .02), without: sp(0, 1.46), starting: sp(1, 3.09), price69: sp(1, 3.62),
  noFees: sp(2, 5.17), membership: sp(2, 5.42), fees: sp(2, 5.78), noAuto: sp(3, 6.53), refills: sp(3, 7.32),
  you: sp(4, 8.43), when: sp(4, 9.38),
  one: sp(5, 10.79), provider: sp(5, 11.84), medication: sp(5, 12.98), shipping: sp(5, 13.90),
  andYour: sp(6, 14.68), asYourDose: sp(6, 16.06), see: sp(7, 17.54), qualify: sp(7, 17.98), url: sp(7, 18.82),
};
export const CAPTIONS = [];
const Wd = WORDS;

export const CUES = {
  // hook
  head0:      [{t0: 0.12, land: 0.40}, {t0: 0.24, land: 0.52}],   // "GLP-1 care," / "without the strings."
  head0Out:   {t0: 2.76, t1: 2.89},
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
  head3Out:   {t0: 10.04, t1: 10.20},
  morphBtn:   {t0: 10.04, land: 10.40},
  btnPress:   10.92,                              // once the button has settled, on "you request ..."
  checkPop:   10.98,
  wipe1:      {t0: 12.30, t1: 12.75},          // a glass bar sweeps down: her (tea) above it
  // her
  wipe2:      {t0: 13.45, t1: 13.87},          // and up: the covers scene below it ("One price covers" starts over her)
  // includes
  coversIn:   {t0: 13.72, land: 13.98},
  frameIn:    {t0: 13.45, land: 13.85},
  shots:      [{t0: 13.75, id: 'rx'}, {t0: Wd.medication - .12, id: 'vial'}, {t0: Wd.shipping - .12, id: 'box'}],
  labels:     [{t0: Wd.provider - .06, land: Wd.provider + .20}, {t0: Wd.medication - .06, land: Wd.medication + .20}, {t0: Wd.shipping - .06, land: Wd.shipping + .20}],
  coversOut:  {t0: 17.50, t1: 17.66},
  // proof
  morphPill:  {t0: 17.52, land: 18.10},          // the frame snaps into the pill on the music's drop
  priceIn:    {t0: 18.16, land: 18.42},
  sliderIn:   {t0: 18.24, land: 18.60},
  doseLine:   [{t0: Wd.andYour - .04, land: Wd.andYour + .24}, {t0: Wd.asYourDose - .04, land: Wd.asYourDose + .24}],
  drag:       {t0: 18.90, t1: 20.70},            // four detents, lower -> higher dose; the price holds on each
  detents:    4,
  priceOut:   {t0: 21.24, t1: 21.37},
  qualOut:    {t0: 21.37, t1: 21.50},
  wipe3:      {t0: 21.30, t1: 21.80},            // a glass bar sweeps down: her walk above it
  // payoff
  wipe4:      {t0: 23.90, t1: 24.40},            // up: the end card below it
  // end card
  logoIn:     {t0: 24.12, land: 24.44},
  tag:        [{t0: 24.20, land: 24.50}, {t0: 24.30, land: 24.60}],   // "GLP-1 care" / "without the strings."
  discIn:     {t0: 24.42, land: 24.72},
  ctaIn:      {t0: 24.28, land: 24.64},          // "See if you qualify" (24.59)
  ctaClick:   25.12,
  urlIn:      {t0: Wd.url - .06, land: Wd.url + .26},
  badgePop:   26.60,
  vialIn:     {t0: 26.66, land: 27.04},
  vialGlint:  [27.04, 27.46],
  finalStill: 27.70,
};
CUES.pulseIn = {t0: 1e9, land: 1e9};          // (v6 heartbeat cues, unused)
CUES.wipeA = CUES.wipe1;

// touches: a glass fingertip disc lands, presses, and leaves a glass ripple - the request button, each dose detent
// (held through the drag), the CTA
export const TOUCHES = [{at: CUES.btnPress, target: 'btn'}, {at: CUES.ctaClick, target: 'cta'}];   // (the dose steps light on their own)
const detentT = k => +(CUES.drag.t0 + (CUES.drag.t1 - CUES.drag.t0) * k / (CUES.detents - 1)).toFixed(3);   // each step lights at its slot
export const DETENTS = Array.from({length: CUES.detents}, (_, k) => detentT(k));

export const SFX = [
  {id: 'impact',     at: 0.30, gain: -13},                 // the hook's sonic cue as the headline lands (not on the first frames)
  {id: 'whoosh',     at: 0.24, gain: -24},
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
  {id: 'toggle',     at: CUES.drag.t0 - .06, gain: -12},       // the padlock clicks shut on the price
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
