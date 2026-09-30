// Single source of truth for timing (Version A, continuous take). Shared by the renderer (src/scene.mjs) and audio/compose.mjs.
// Tempo 96 BPM -> one beat = 0.625 s, 40 beats = 25.0 s. Scene changes, clicks and glass landings sit on beats.
// Two openings share everything after 4.4 s:
//   INTRO=glass (default) "oddly satisfying": a macro shot of the price pill sliding across the table and magnifying $69
//   INTRO=latte           native footage opener (latte pour, word stickers, pill drops onto the screen)
// Select with the env var INTRO (node) or ?intro= on the page (the renderer passes it through).
export const INTRO = (globalThis.process?.env?.INTRO) || globalThis.__INTRO || 'glass';
const GLASS = INTRO === 'glass';
export const FPS = 30, DURATION = 25, W = 1080, H = 1920;
export const BPM = 96, BEAT = 60 / BPM;
export const b = n => +(n * BEAT).toFixed(4);          // beat number -> seconds
export const LEAD = 0.14;                              // moves start their final approach this early so they land on the beat

export const SCENES = [
  {id: 'price',  t0: 0,     t1: b(15)},              // 0.000 - 9.375  hook + online visit (one set: price carries forward)
  {id: 'checks', t0: b(15), t1: b(24)},              // 9.375 - 15.000 provider review / medication / shipping
  {id: 'nofees', t0: b(24), t1: b(30)},              // 15.000 - 18.750 no membership fees / no automatic refills
  {id: 'end',    t0: b(30), t1: DURATION},           // 18.750 - 25.000 end card
];

// VO: ElevenLabs reads delivered 2026-09-30 (vo/hook_A.wav, vo/body.wav; transcribed with faster-whisper = script, word for word).
// body.wav is one take; each line is placed on its scene by cutting in the breaths between lines (no time-stretch, no speed change).
// src = [from, to] seconds in the file, at = where `from` lands in the ad. Speech windows below are measured (10 ms RMS envelope).
export const VO_EDIT = [
  {file: 'vo/hook_A.wav', src: [0.00, 3.92],  at: GLASS ? 0.75 : 0.30},   // "GLP-1 care, starting at $69."  speech +0.02 .. +3.77 (glass intro: the first 0.75 s is just the tap and the slide)
  {file: 'vo/body.wav',   src: [0.00, 4.42],  at: GLASS ? 4.75 : 4.60},   // "Start with an online visit ..." speech +0.02 .. +4.18
  {file: 'vo/body.wav',   src: [4.42, 8.50],  at: 9.99},   // "Provider review, medication, ..."       speech 10.25 - 13.92
  {file: 'vo/body.wav',   src: [8.50, 12.35], at: 14.94},  // "No membership fees, and you choose ..." speech 15.10 - 18.63
  {file: 'vo/body.wav',   src: [12.35, 15.84], at: 19.30}, // "See if you qualify at MyFastRx.com."   speech 19.40 - 22.65
];
export const VO = [
  {t0: GLASS ? 0.77 : 0.32, t1: GLASS ? 4.52 : 4.07, text: 'GLP-1 care, starting at $69.'},
  {t0: GLASS ? 4.77 : 4.62, t1: GLASS ? 8.93 : 8.78, text: 'Start with an online visit and provider-guided care from MyFastRx.'},
  {t0: 10.25, t1: 13.92, text: 'Provider review, medication, and shipping are all included.'},
  {t0: 15.10, t1: 18.63, text: 'No membership fees, and you choose when to request your next refill.'},
  {t0: 19.40, t1: 22.65, text: 'See if you qualify at MyFastRx.com.'},
];
// Word onsets used to sync picture (ad time): "and provider" 5.94 | Provider 10.26, medication 11.27, shipping 12.22 |
// "and you choose" 16.06 | "MyFastRx.com" 20.79

// Burned-in captions only where the on-screen card does not already say the line. Max two lines each.
export const CAPTIONS = [
  {t0: GLASS ? 4.77 : 4.62, t1: GLASS ? 6.09 : 5.94, lines: ['Start with an online visit']},
  {t0: GLASS ? 6.09 : 5.94, t1: 8.90, lines: ['and provider-guided care', 'from MyFastRx.']},
  {t0: 16.06, t1: 18.62, lines: ['and you choose when to', 'request your next refill.']},   // "No membership fees" is the card itself
];

export const MUSIC_IN = GLASS ? {t0: 0.55, t1: 1.60} : null;   // glass intro: the first half second is just the tap

export const CUES = {
  hookWords:  [{w: 'GLP-1', t: 0.32}, {w: 'care,', t: 1.40}],   // native word stickers, on the measured VO words
  qualIn:     GLASS ? {t0: -1, land: -.9} : {t0: 1.72, land: 2.00},   // up BEFORE any part of $69 can show (glass: from frame 1)
  pillSlide:  GLASS ? {t0: -0.03, land: b(4)} : {t0: 1.95, land: b(4)},  // glass: touches down on frame 1, slides, settles on $69 at 2.5 s
  pillCrisp:  GLASS ? 3.10 : b(4),                 // price drawn sharp once the pill has stopped wobbling
  macro:      {s: 1.6, g: [540, 860], t0: b(7), t1: 5.00},   // glass intro: macro camera on the pill, pulls back 4.375 -> 5.0
  footOut:    {t0: b(7), t1: 4.85},                // latte card pushes up, revealing the glass world
  vialRise:   {t0: 4.62, land: b(8)},              // 5.000  rises once the card's edge has cleared it
  headSwap:   {t0: 4.74, land: b(8)},              // 5.000 'GLP-1 weight-loss care' rises
  tubeSlide:  {t0: 5.10, land: b(10)},             // 6.250  glass pulse tube slides in behind the vial
  vialSway:   {t0: 6.40, t1: 8.20},                // gentle tilt, back to exact rest
  pillClick:  b(14),                               // 8.750  cursor clicks the price pill
  priceOut:   {t0: b(14), t1: b(14) + 0.16},       // $69 leaves first ...
  qualOut:    {t0: b(14) + 0.16, t1: b(14) + 0.32},//  ... then its qualification
  pushOut:    {t0: 8.90, t1: 9.35},                // headline, vial, tube push out left
  zoom:       {t0: 8.30, peak: b(14), t1: 9.65, s: 1.14},
  morphFrame: {t0: 8.92, land: b(15)},             // 9.375  pill becomes the photo frame
  checks:     [10.26, 11.27, 12.22],               // clicks land on 'Provider' / 'medication' / 'shipping'
  footPush:   {t0: 11.62, t1: 11.98},              // photo A pushes out, photo B (package) in, before 'shipping'
  checksOut:  {t0: 14.50, t1: 14.78},
  morphTrack: {t0: 14.72, land: b(25)},            // 15.625 photo frame contracts into the toggle track
  knobPop:    b(25),
  drag:       {t0: 15.86, t1: b(26)},              // 16.250 snap on
  feesIn:     [{t0: 15.30, land: b(25)}, {t0: 15.42, land: b(25) + 0.12}],   // with 'No membership fees'
  feesOut:    {t0: 18.45, t1: 18.62},
  flood:      {t0: 18.62, full: 18.98, t1: 19.62}, // navy floods from the knob after the line ends, then contracts into the CTA
  discIn:     {t0: 19.62, land: 19.90},            // fine print rises in with the end card, then holds still to the last frame
  logoIn:     {t0: 19.55, land: b(32)},            // 20.000
  ctaText:    {t0: 19.65, land: b(32)},
  urlIn:      {t0: 20.45, land: 20.79},            // with 'MyFastRx.com'
  ctaClick:   b(33.5),                             // 20.938
  badgePop:   b(34),                               // 21.250 ; everything is still from finalStill to the last frame
  finalStill: 21.60,
};

// Cursor path: [t, x, y, pressed]. World coordinates (the camera applies to it, and it scales with the zoom).
const CK = CUES.checks;
export const CURSOR = [
  [7.20, 1160, 1060, 0], [8.35, 700, 820, 0], [8.62, 700, 820, 1], [8.78, 700, 820, 0],
  [9.40, 470, 1040, 0],
  ...CK.flatMap((t, i) => [[t - .32, 0, 0, 0, 'c' + i], [t - .07, 0, 0, 1, 'c' + i], [t + .05, 0, 0, 0, 'c' + i]]),
  [14.85, 0, 0, 0, 'c2'], [15.25, 70, 760, 0],                     // around the left margin, never across the text
  [15.70, 0, 0, 0, 'knob0'], [15.80, 0, 0, 1, 'knob0'], [16.25, 0, 0, 1, 'knob1'], [16.34, 0, 0, 0, 'knob1'],
  [17.20, 1160, 660, 0],
  [20.20, 1160, 760, 0], [20.78, 640, 718, 0], [20.86, 640, 718, 1], [20.95, 640, 718, 0], [21.58, 1160, 790, 0],
];

// Sound effects: `at` is where the sound should be HEARD (its measured onset is aligned there, not its file start).
export const SFX = [
  ...(GLASS ? [
  {id: 'tap_glass',  at: 0.0, gain: -8},                    // the crisp glass tap, heard on frame 1
  {id: 'slide_long', at: 0.05, gain: -26},                  // glass gliding on the table, slowing with friction
  {id: 'tap_low',    at: CUES.pillSlide.land, gain: -17},   // it settles
  {id: 'tap_glass',  at: CUES.pillSlide.land + .02, gain: -24},
  {id: 'slide_air',  at: CUES.macro.t0, gain: -24},         // camera pulls back
  ] : [
  {id: 'click',      at: CUES.hookWords[0].t, gain: -24},
  {id: 'click',      at: CUES.hookWords[1].t, gain: -24},
  {id: 'slide_air',  at: CUES.pillSlide.t0 + .1, gain: -21},
  {id: 'tap_glass',  at: CUES.pillSlide.land, gain: -12},
  {id: 'slide_air',  at: CUES.footOut.t0, gain: -21},
  ]),
  {id: 'slide_soft', at: CUES.vialRise.t0, gain: -23},
  {id: 'tap_glass',  at: CUES.vialRise.land, gain: -18},
  {id: 'slide_soft', at: CUES.tubeSlide.t0, gain: -21},
  {id: 'tap_low',    at: CUES.tubeSlide.land, gain: -18},
  {id: 'click',      at: CUES.pillClick, gain: -13},
  {id: 'slide_air',  at: CUES.morphFrame.t0, gain: -21},
  {id: 'tap_low',    at: CUES.morphFrame.land, gain: -18},
  {id: 'press',      at: CUES.checks[0], gain: -14},
  {id: 'press',      at: CUES.checks[1], gain: -14},
  {id: 'press',      at: CUES.checks[2], gain: -14},
  {id: 'slide_soft', at: CUES.footPush.t0, gain: -25},
  {id: 'slide_air',  at: CUES.morphTrack.t0, gain: -22},
  {id: 'tap_low',    at: CUES.morphTrack.land, gain: -18},
  {id: 'tap_glass',  at: CUES.knobPop + 0.03, gain: -20},
  {id: 'slide_soft', at: CUES.drag.t0, gain: -24},
  {id: 'toggle',     at: CUES.drag.t1, gain: -12},
  {id: 'slide_air',  at: CUES.flood.t0, gain: -20},
  {id: 'tap_low',    at: CUES.flood.t1, gain: -17},
  {id: 'click',      at: CUES.ctaClick, gain: -14},
  {id: 'chime_end',  at: CUES.badgePop, gain: -25},
];
