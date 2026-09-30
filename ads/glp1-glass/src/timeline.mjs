// Single source of truth for timing (Version A, continuous take). Shared by the renderer (src/scene.mjs) and audio/compose.mjs.
// Tempo 96 BPM -> one beat = 0.625 s, 40 beats = 25.0 s. Scene changes, clicks and glass landings sit on beats.
// The VO files are not delivered yet, so VO windows and caption times below are PLANNED from the script.
// When vo/hook_A.wav and vo/body.wav arrive: measure their phrase starts/ends, update VO[] and CAPTIONS[], re-render.
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

// Planned VO phrase windows (music ducking until the real VO exists; mix.sh then ducks from the VO stem itself).
export const VO = [
  {file: 'vo/hook_A.wav', t0: 0.35, t1: 2.9,  text: 'GLP-1 care, starting at $69.'},
  {file: 'vo/body.wav',   t0: 4.55, t1: 8.6,  text: 'Start with an online visit and provider-guided care from MyFastRx.'},
  {file: 'vo/body.wav',   t0: 9.6,  t1: 13.9, text: 'Provider review, medication, and shipping are all included.'},
  {file: 'vo/body.wav',   t0: 15.1, t1: 18.5, text: 'No membership fees, and you choose when to request your next refill.'},
  {file: 'vo/body.wav',   t0: 19.3, t1: 21.4, text: 'See if you qualify at MyFastRx.com.'},
];

// Burned-in captions, only where the on-screen card does not already say the VO line. Max two lines each.
export const CAPTIONS = [
  {t0: 4.55,  t1: 6.5,   lines: ['Start with an online visit']},
  {t0: 6.5,   t1: 8.65,  lines: ['and provider-guided care', 'from MyFastRx.']},
  {t0: 15.1,  t1: 16.45, lines: ['No membership fees,']},
  {t0: 16.45, t1: 18.5,  lines: ['and you choose when to', 'request your next refill.']},
];

export const CUES = {
  vialRise:   {t0: 0.0,  land: b(1)},              // 0.625  vial rises out of the surface line
  headIn:     {t0: 0.85, land: b(2)},              // 1.250  "GLP-1 care" rises out of its mask line
  qualIn:     {t0: 1.18, land: 1.50},              // qualification is fully up BEFORE any part of $69 shows
  priceIn:    {t0: 1.50, land: b(3)},              // 1.875  "Starting at $69" rises
  pillSlide:  {t0: 1.60, land: b(4)},              // 2.500  teal glass pill slides over the price, lenses it, lands
  pillCrisp:  2.85,
  headSwap:   {t0: b(7), land: b(8)},              // 4.375 -> 5.000 old headline leaves up, new one rises
  tubeSlide:  {t0: 5.10, land: b(10)},             // 6.250  glass pulse tube slides in behind the vial
  vialSway:   {t0: 6.40, t1: 8.20},                // gentle tilt, back to exact rest
  pillClick:  b(14),                               // 8.750  cursor clicks the price pill
  priceOut:   {t0: b(14), t1: b(14) + 0.16},       // $69 leaves first ...
  qualOut:    {t0: b(14) + 0.16, t1: b(14) + 0.32},//  ... then its qualification
  pushOut:    {t0: 8.90, t1: 9.35},                // headline, vial, tube push out left
  zoom:       {t0: 8.30, peak: b(14), t1: 9.65, s: 1.14},
  morphFrame: {t0: 8.92, land: b(15)},             // 9.375  pill becomes the photo frame
  checks:     [b(17), b(19), b(21)],               // 10.625 / 11.875 / 13.125 clicks
  footPush:   {t0: 12.30, t1: b(20) + 0.1},        // photo A pushes out, photo B pushes in
  checksOut:  {t0: 14.50, t1: 14.78},
  morphTrack: {t0: 14.72, land: b(25)},            // 15.625 photo frame contracts into the toggle track
  knobPop:    b(25),
  drag:       {t0: 15.86, t1: b(26)},              // 16.250 snap on
  feesIn:     [{t0: 16.0, land: b(26)}, {t0: 16.1, land: b(26) + 0.12}],
  feesOut:    {t0: 18.30, t1: 18.48},
  flood:      {t0: 18.42, full: 18.84, t1: 19.62}, // navy floods from the knob, then contracts into the CTA button
  logoIn:     {t0: 19.55, land: b(32)},            // 20.000
  ctaText:    {t0: 19.65, land: b(32)},
  urlIn:      {t0: 20.28, land: b(33)},            // 20.625
  ctaClick:   b(33.5),                             // 20.938
  badgePop:   b(34),                               // 21.250 ; everything is still from finalStill to the last frame
  finalStill: 21.60,
};

// Cursor path: [t, x, y, pressed]. World coordinates (the camera applies to it, and it scales with the zoom).
export const CURSOR = [
  [7.20, 1160, 1060, 0], [8.35, 700, 820, 0], [8.62, 700, 820, 1], [8.78, 700, 820, 0],
  [9.40, 470, 1040, 0], [10.30, 0, 0, 0, 'c0'], [10.55, 0, 0, 1, 'c0'], [10.66, 0, 0, 0, 'c0'],
  [11.55, 0, 0, 0, 'c1'], [11.80, 0, 0, 1, 'c1'], [11.91, 0, 0, 0, 'c1'],
  [12.80, 0, 0, 0, 'c2'], [13.05, 0, 0, 1, 'c2'], [13.16, 0, 0, 0, 'c2'],
  [14.85, 0, 0, 0, 'c2'], [15.70, 0, 0, 0, 'knob0'], [15.80, 0, 0, 1, 'knob0'], [16.25, 0, 0, 1, 'knob1'], [16.34, 0, 0, 0, 'knob1'],
  [17.20, 1160, 660, 0],
  [20.20, 1160, 760, 0], [20.78, 640, 718, 0], [20.86, 640, 718, 1], [20.95, 640, 718, 0], [21.58, 1160, 790, 0],
];

// Sound effects: `at` is where the sound should be HEARD (its measured onset is aligned there, not its file start).
export const SFX = [
  {id: 'slide_soft', at: 0.02, gain: -22},
  {id: 'tap_glass',  at: CUES.vialRise.land, gain: -18},
  {id: 'slide_soft', at: CUES.pillSlide.t0, gain: -19},
  {id: 'tap_glass',  at: CUES.pillSlide.land, gain: -14},
  {id: 'slide_air',  at: CUES.headSwap.t0, gain: -25},
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
