// Version A v3 "No strings attached" - single source of truth for timing. Shared by the 3D opening (src/opening3d.mjs),
// the overhead table film (src/scene.mjs), and the audio build (audio/compose.mjs, tools/build-vo.mjs).
// (v2, the price-led cut, is commit f2a6a1b; its sources are kept in src/v2/ for reference.)
//
// 0.00 - 4.25  3D opening: a glass pill touches down (tap on frame 1), glides, settles over $69; the camera cranes
//              overhead and dives into the glass. No VO, no logo, no pitch.
// 4.25 - 27.5  overhead: the table seen from above. Glass objects, a glass digital photo frame for the footage.
//
// VO v2: vo/body_v2.wav = the ElevenLabs read (vo/body_v2_src.mp3) at 1.15x tempo (client direction), pitch kept.
// The read ends line 4 at "starting at $69." (no "your price doesn't climb..."), so the flat-price-across-doses claim is
// on-screen text on the dose-slider beat, not a caption. Word times: python3 tools/transcribe.py vo/body_v2.wav.
export const INTRO = 'glass3d';
export const FPS = 30, DURATION = 27.0, W = 1080, H = 1920;
export const BPM = 96, BEAT = 60 / BPM;
export const b = n => +(n * BEAT).toFixed(4);

export const OPEN = {touch: 0, land: 2.8, startX: 1.15, crane: [2.8, 3.75], dive: 4.25};

export const SCENES = [
  {id: 'open3d',  t0: 0,     t1: 4.25},
  {id: 'strings', t0: 4.25,  t1: 7.30},    // "GLP-1 care, with no strings attached,"
  {id: 'control', t0: 7.30,  t1: 12.20},   // "no membership fees, no automatic refills. You request each one when you're ready."
  {id: 'covers',  t0: 12.20, t1: 16.85},   // "One price covers your provider review, medication, and shipping,"
  {id: 'price',   t0: 16.85, t1: 20.80},   // "starting at $69."  + the dose slider (on-screen: your price doesn't climb...)
  {id: 'end',     t0: 20.80, t1: 27.0},    // "Clear pricing, clear care. See if you qualify at MyFastRx.com."
];

// the take is cut only in its pauses (speech edges from tools/vo-env.mjs: 11.04 | 11.37 and 12.85 | 13.16)
export const VO_EDIT = [
  {file: 'vo/body_v2.wav', src: [0, 11.20],     at: 4.60},    // lines 1-3, as read
  {file: 'vo/body_v2.wav', src: [11.20, 13.00], at: 16.80},   // "starting at $69." once the price pill has formed
  {file: 'vo/body_v2.wav', src: [13.00, 17.828], at: 20.80},  // the close, on the end card
];
export const VO = [          // measured speech windows (music ducks under these)
  {t0: 4.61,  t1: 7.26,  text: 'GLP-1 care, with no strings attached,'},
  {t0: 7.54,  t1: 12.04, text: "no membership fees, no automatic refills. You request each one when you're ready."},
  {t0: 12.48, t1: 15.64, text: 'One price covers your provider review, medication, and shipping,'},
  {t0: 16.97, t1: 18.45, text: 'starting at $69.'},
  {t0: 20.96, t1: 25.53, text: 'Clear pricing, clear care. See if you qualify at MyFastRx.com.'},
];
// captions only where the on-screen card doesn't already say the line (max two lines; verbatim VO)
export const CAPTIONS = [
  {t0: 10.20, t1: 12.05, lines: ['You request each one', "when you're ready."]},
];

export const CUES = {
  pullBack:   {t0: 4.25, t1: 5.15},                // out of the pill's glass to the overhead layout
  head1:      [{t0: 4.62, land: 4.97}, {t0: 5.90, land: 6.25}],   // "GLP-1 care," / "no strings attached." (on "with no strings")
  pulseIn:    {t0: 6.20, land: 6.90},              // the glass heartbeat glides in under the headline
  price1Out:  {t0: 6.90, t1: 7.05},                // the $69 leaves first, then its qualification, before the wipe reaches them
  qual1Out:   {t0: 7.05, t1: 7.20},
  wipe1:      {t0: 7.08, t1: 7.78},                // a glass heartbeat sweeps up the table: behind it, the next scene
  head2:      [{t0: 7.56, land: 7.92}, {t0: 8.72, land: 9.08}],   // "No membership fees." / "No automatic refills." (7.60 / 8.78)
  btnIn:      {t0: 9.10, land: 9.55},              // the "Request refill" glass button
  btnPress:   10.40,                               // "YOU request each one" (10.32): the cursor presses it
  checkPop:   10.46,
  head2Out:   {t0: 11.95, t1: 12.20},
  morphFrame: {t0: 12.00, land: 12.65},            // the button becomes the glass photo frame
  coversIn:   {t0: 12.45, land: 12.80},            // "One price covers" (12.50)
  claim24:    {t0: 12.75, t1: 14.22},              // "Online visit in minutes. Review typically within 24 hours." on the laptop photo
  checks:     [13.45, 14.34, 15.20],               // provider review / medication / shipping (13.40 / 14.32 / 15.18)
  frameSwap:  [14.30, 15.12],                      // photo glints: laptop -> vial -> package
  noIns:      {t0: 15.50, land: 15.85},            // "No insurance needed. No contracts."
  coversOut:  {t0: 16.60, t1: 16.85},
  morphPill:  {t0: 16.55, land: 17.15},            // the frame contracts into the teal price pill
  priceIn:    {t0: 17.00, land: 17.25},            // "starting at" 16.97, "$69" 17.40
  sliderIn:   {t0: 18.25, land: 18.65},            // the dose slider
  doseLine:   {t0: 18.45, land: 18.80},            // on-screen: "Your price doesn't climb / as your dose does."
  drag:       {t0: 19.00, t1: 20.10},              // the cursor drags the dose up; the price holds
  priceOut:   {t0: 20.35, t1: 20.50},
  qualOut:    {t0: 20.50, t1: 20.65},
  wipe2:      {t0: 20.45, t1: 21.15},              // the heartbeat sweeps up again into the end card
  logoIn:     {t0: 20.95, land: 21.30},
  tag:        [{t0: 20.95, land: 21.30}, {t0: 21.90, land: 22.25}],   // "Clear pricing." / "Clear care." (20.96 / 21.93)
  discIn:     {t0: 21.30, land: 21.60},            // fine print: end card only, then still to the last frame
  ctaIn:      {t0: 22.70, land: 23.10},            // "See if you qualify" (22.82)
  ctaClick:   23.55,
  urlIn:      {t0: 24.00, land: 24.35},            // "MyFastRx.com" (24.06)
  badgePop:   24.75,
  finalStill: 25.60,
};

// cursor: [t, x, y, pressed, target?] (world coords; targets resolved in scene.mjs)
export const CURSOR = [
  [9.50, 1160, 900, 0], [10.22, 0, 0, 0, 'btn'], [10.34, 0, 0, 1, 'btn'], [10.46, 0, 0, 0, 'btn'], [11.20, 1160, 980, 0],
  [18.40, 1160, 1060, 0], [18.85, 0, 0, 0, 'knob0'], [19.00, 0, 0, 1, 'knob0'], [20.10, 0, 0, 1, 'knob1'], [20.20, 0, 0, 0, 'knob1'], [20.75, 1160, 1080, 0],
  [22.95, 1160, 820, 0], [23.40, 0, 0, 0, 'cta'], [23.50, 0, 0, 1, 'cta'], [23.60, 0, 0, 0, 'cta'], [24.30, 1160, 760, 0],
];

export const MUSIC_IN = {t0: 0.55, t1: 1.60};      // the opening is just the tap and the glide; the bed eases in
export const SFX = [
  {id: 'tap_glass',  at: 0.0, gain: -8},          // the glass tap, heard on frame 1
  {id: 'slide_long', at: 0.05, gain: -26},        // gliding on the table
  {id: 'tap_low',    at: OPEN.land, gain: -17},   // it settles
  {id: 'tap_glass',  at: OPEN.land + .02, gain: -24},
  {id: 'slide_air',  at: OPEN.crane[0] + .1, gain: -24},   // crane up
  {id: 'slide_air',  at: OPEN.dive - .25, gain: -20},      // dive into the glass
  {id: 'tap_low',    at: CUES.pullBack.t0, gain: -20},
  {id: 'tap_glass',  at: CUES.pulseIn.land, gain: -21},
  {id: 'slide_air',  at: CUES.wipe1.t0, gain: -20},
  {id: 'tap_low',    at: CUES.btnIn.land, gain: -19},
  {id: 'press',      at: CUES.btnPress, gain: -13},
  {id: 'tap_glass',  at: CUES.checkPop + .02, gain: -18},
  {id: 'slide_soft', at: CUES.morphFrame.t0, gain: -21},
  {id: 'tap_low',    at: CUES.morphFrame.land, gain: -18},
  {id: 'press',      at: CUES.checks[0], gain: -14},
  {id: 'press',      at: CUES.checks[1], gain: -14},
  {id: 'press',      at: CUES.checks[2], gain: -14},
  {id: 'slide_soft', at: CUES.morphPill.t0, gain: -21},
  {id: 'tap_glass',  at: CUES.morphPill.land, gain: -15},
  {id: 'tap_low',    at: CUES.sliderIn.land, gain: -19},
  {id: 'slide_long', at: CUES.drag.t0, gain: -28},
  {id: 'tap_glass',  at: CUES.drag.t1, gain: -19},
  {id: 'slide_air',  at: CUES.wipe2.t0, gain: -20},
  {id: 'tap_low',    at: CUES.ctaIn.land, gain: -18},
  {id: 'click',      at: CUES.ctaClick, gain: -14},
  {id: 'chime_end',  at: CUES.badgePop, gain: -25},
];
