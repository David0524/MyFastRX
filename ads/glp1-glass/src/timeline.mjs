// Version A v4 "Everything on the table" - single source of truth for timing. Shared by the 3D film (src/t3/*.mjs),
// the audio build (audio/compose.mjs, tools/build-vo.mjs) and verify.mjs. (v3 = commit cbd39d2; its sources are in src/v2/.)//
// 0.00 - 4.25  3D opening: a glass pill touches down (tap on frame 1), glides, settles over $69; the camera cranes
//              overhead and dives into the glass. No VO, no logo, no pitch.
// 4.25 - 27.5  overhead: the table seen from above. Glass objects, a glass digital photo frame for the footage.
//
// VO v2: vo/body_v2.wav = the ElevenLabs read (vo/body_v2_src.mp3) at 1.15x tempo (client direction), pitch kept.
// The read ends line 4 at "starting at $69." (no "your price doesn't climb..."), so the flat-price-across-doses claim is
// on-screen text on the dose-slider beat, not a caption. Word times: python3 tools/transcribe.py vo/body_v2.wav.
export const INTRO = 'table3d';
export const FPS = 30, DURATION = 27.0, W = 1080, H = 1920;
export const BPM = 96, BEAT = 60 / BPM;
export const b = n => +(n * BEAT).toFixed(4);

// one continuous 3D camera. 0-4.25 s the fly-over: in low from the far side of the table, around the gliding pill,
// over the top to the top-down view. Then top-down "stations" on the same table, joined by pans the pill leads.
export const OPEN = {touch: 0, land: 2.9, swirl: [1.0, 2.9], over: [2.9, 4.2], dive: 4.25};
export const STATIONS = {A: [0, 0], B: [0, 3.9], C: [0, 7.8], D: [0, .9], E: [2.75, .9]};   // camera centres (x, z), metres

export const SCENES = [
  {id: 'open3d',  t0: 0,     t1: 4.25},
  {id: 'strings', t0: 4.25,  t1: 7.30},    // A: "GLP-1 care, with no strings attached,"
  {id: 'control', t0: 7.30,  t1: 12.20},   // B: "no membership fees, no automatic refills. You request each one when you're ready."
  {id: 'covers',  t0: 12.20, t1: 16.85},   // C: "One price covers your provider review, medication, and shipping,"
  {id: 'price',   t0: 16.85, t1: 20.80},   // D: "starting at $69."  + the dose slider (on-screen: your price doesn't climb...)
  {id: 'end',     t0: 20.80, t1: 27.0},    // E: "Clear pricing, clear care. See if you qualify at MyFastRx.com."
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
  // A - the notepad: a doctor's scrawl writes itself, then its ink flows into the headline; the price tag's string pulls free
  inkA:      [{t0: 4.30, t1: 4.95, morph: [4.90, 5.35]}, {t0: 5.30, t1: 5.95, morph: [5.90, 6.35]}],   // "GLP-1 care," / "no strings attached." (6.08)
  unstring:  {t0: 6.30, t1: 7.10},              // the twine slides out through the tag's eyelet and whips off the table
  pan:       [{t0: 7.05, t1: 7.72, from: 'A', to: 'B'}, {t0: 11.95, t1: 12.62, from: 'B', to: 'C'},
              {t0: 16.45, t1: 17.15, from: 'C', to: 'D'}, {t0: 20.38, t1: 21.05, from: 'D', to: 'E'}],
  // B
  head2:     [{t0: 7.56, land: 7.92}, {t0: 8.72, land: 9.08}],   // "No membership fees." / "No automatic refills." (7.60 / 8.78)
  cardPush:  7.90,                               // the pill knocks the membership card off the table ("no membership fees")
  toggleOff: {t0: 8.86, t1: 9.12},              // the glass auto-refill toggle flips off ("no automatic refills")
  btnIn:     {t0: 9.10, land: 9.55},             // the glass "Request refill" button slides in
  btnPress:  10.40,                              // "YOU request each one" (10.32)
  checkPop:  10.46,
  head2Out:  {t0: 11.95, t1: 12.20},
  // C
  coversIn:  {t0: 12.45, land: 12.80},           // "One price covers" (12.50)
  inkC:      {t0: 12.62, t1: 13.12, morph: [13.08, 13.48]},   // scrawl on the Rx pad -> "Provider review" (13.40)
  claim24:   {t0: 13.55, land: 13.85},           // "Online visit in minutes. / Review typically within 24 hours."
  vialIn:    {t0: 13.90, land: 14.34},           // the vial rolls in ("medication" 14.32)
  boxIn:     {t0: 14.78, land: 15.20},           // the box drops in ("shipping" 15.18)
  checks:    [13.48, 14.36, 15.22],
  noIns:     {t0: 15.50, land: 15.85},           // "No insurance needed. No contracts."
  // D
  pillLand:  17.25,                              // back onto the $69 ("starting at" 16.97, "$69" 17.40)
  sliderIn:  {t0: 18.20, land: 18.62},           // the glass dose slider
  doseLine:  {t0: 18.45, land: 18.80},           // printed: "Your price doesn't climb / as your dose does."
  drag:      {t0: 19.00, t1: 20.10},             // the knob slides to the higher dose; the price holds
  // E - the end card (the camera settles so the card exactly fills the frame)
  tag:       [{t0: 20.95, land: 21.30}, {t0: 21.90, land: 22.25}],   // "Clear pricing." / "Clear care." (20.96 / 21.93)
  discIn:    {t0: 21.30, land: 21.60},           // fine print: end card only, then still to the last frame
  ctaIn:     {t0: 22.70, land: 23.10},           // "See if you qualify" (22.82)
  ctaClick:  23.55,
  urlIn:     {t0: 24.00, land: 24.35},           // "MyFastRx.com" (24.06)
  badgePop:  24.75,
  finalStill: 25.60,
};

export const MUSIC_IN = {t0: 0.55, t1: 1.60};      // the opening is just the tap and the glide; the bed eases in
export const SFX = [
  {id: 'tap_glass',  at: 0.0, gain: -8},          // the glass tap, heard on frame 1
  {id: 'slide_long', at: 0.05, gain: -24},        // gliding on the wood
  {id: 'slide_air',  at: 1.1, gain: -24},         // the camera swirls round
  {id: 'tap_low',    at: OPEN.land, gain: -16},   // it settles on the tag
  {id: 'tap_glass',  at: OPEN.land + .02, gain: -23},
  {id: 'slide_air',  at: OPEN.over[0] + .2, gain: -22},   // swing over the top
  {id: 'slide_soft', at: CUES.inkA[0].morph[0], gain: -23},
  {id: 'slide_soft', at: CUES.inkA[1].morph[0], gain: -23},
  {id: 'slide_long', at: CUES.unstring.t0, gain: -25},
  {id: 'slide_air',  at: CUES.pan[0].t0, gain: -20},
  {id: 'tap_low',    at: CUES.cardPush, gain: -15},
  {id: 'press',      at: CUES.toggleOff.t1 - .04, gain: -15},
  {id: 'tap_low',    at: CUES.btnIn.land, gain: -19},
  {id: 'press',      at: CUES.btnPress, gain: -12},
  {id: 'tap_glass',  at: CUES.checkPop + .02, gain: -18},
  {id: 'slide_air',  at: CUES.pan[1].t0, gain: -20},
  {id: 'slide_soft', at: CUES.inkC.morph[0], gain: -22},
  {id: 'press',      at: CUES.checks[0], gain: -14},
  {id: 'slide_soft', at: CUES.vialIn.t0, gain: -22},
  {id: 'tap_glass',  at: CUES.vialIn.land, gain: -19},
  {id: 'press',      at: CUES.checks[1], gain: -14},
  {id: 'tap_low',    at: CUES.boxIn.land, gain: -15},
  {id: 'press',      at: CUES.checks[2], gain: -14},
  {id: 'slide_air',  at: CUES.pan[2].t0, gain: -20},
  {id: 'tap_glass',  at: CUES.pillLand, gain: -15},
  {id: 'tap_low',    at: CUES.sliderIn.land, gain: -19},
  {id: 'slide_long', at: CUES.drag.t0, gain: -27},
  {id: 'tap_glass',  at: CUES.drag.t1, gain: -19},
  {id: 'slide_air',  at: CUES.pan[3].t0, gain: -20},
  {id: 'tap_low',    at: CUES.ctaIn.land, gain: -18},
  {id: 'click',      at: CUES.ctaClick, gain: -14},
  {id: 'chime_end',  at: CUES.badgePop, gain: -25},
];
