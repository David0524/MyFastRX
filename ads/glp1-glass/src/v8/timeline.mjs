// v8 "No strings" - the 10 s product-hero spot (Mochi-style performance unit: the whole offer readable on frame 1).
// One locked shot: the client's vial (images/vial_semaglutide.png, label pixel-exact) on a sunlit bathroom counter
// (Higgsfield plate, footage/gen/counter_take1_1080p.mp4), tied with two twine "strings" whose tags read
// "Membership fees" and "Automatic refills". Each string falls away as the VO says "No ...", then the price lands and
// the frosted end card rises with the logo, MyFastRx.com and the disclaimer.
export const W = 1080, H = 1920, FPS = 30, DURATION = 10.0, INTRO = 0;

// VO (scratch): the client's existing ElevenLabs takes (Susan Kathleen), cut in their pauses. [src0, src1, at, file]
// The final read (vo/ELEVENLABS_PROMPT_10s.md) replaces these; only these numbers and WORDS move.
const VOL = [
  [0.00, 2.76, 0.12, 'vo/body_v3.wav'],    // "GLP-1 care, without the strings."
  [5.13, 6.40, 2.95, 'vo/body_v3.wav'],    // "No membership fees."
  [6.49, 8.02, 4.25, 'vo/body_v3.wav'],    // "No automatic refills."
  [3.00, 4.90, 5.82, 'vo/body_v3.wav'],    // "Starting at $69."
  [18.80, 20.58, 7.80, 'vo/body_v3.wav'],  // "MyFastRx.com." (the tail of "See if you qualify at MyFastRx.com", cut in the dip after "at")
];
export const VO_EDIT = VOL.map(([a, b, at, file]) => ({file, src: [a, b], at}));
const sp = (k, s) => +(VOL[k][2] + (s - VOL[k][0])).toFixed(2);
export const VO = [   // measured speech windows (the music ducks under these)
  {t0: sp(0, 0.02), t1: sp(0, 2.70), text: 'GLP-1 care, without the strings.'},
  {t0: sp(1, 5.17), t1: sp(1, 6.36), text: 'No membership fees.'},
  {t0: sp(2, 6.53), t1: sp(2, 7.98), text: 'No automatic refills.'},
  {t0: sp(3, 3.09), t1: sp(3, 4.85), text: 'Starting at $69.'},
  {t0: sp(4, 18.84), t1: sp(4, 20.50), text: 'MyFastRx.com.'},
];
export const WORDS = {strings: sp(0, 2.18), noFees: sp(1, 5.17), noAuto: sp(2, 6.53), price69: sp(3, 3.62), brand: sp(4, 18.84)};

export const CUES = {
  drop1: WORDS.noFees + .10,                       // string 1 ("Membership fees") lets go on "No"
  drop2: WORDS.noAuto + .10,                       // string 2 ("Automatic refills")
  chip1: {t0: WORDS.noFees - .05, land: WORDS.noFees + .35},   // the spoken line as a glass chip (word for word)
  chip2: {t0: WORDS.noAuto - .05, land: WORDS.noAuto + .35},
  glint: [WORDS.noAuto + .75, WORDS.noAuto + 1.45],            // the vial, free: one light across its glass
  pricePop: WORDS.price69,                                     // "$69" springs once (it is on screen from frame 0)
  sheet: [7.64, 8.12],                                         // the frosted end card rises over the counter
  logoIn: {t0: 7.86, land: 8.22}, urlIn: {t0: WORDS.brand - .05, land: WORDS.brand + .30},
  discIn: {t0: 7.96, land: 8.26},
  finalStill: 9.70,                                            // nothing moves after this
  push: [0, 7.6],                                              // the slow camera push on the counter
};
// the client's music track, its drop on the first string falling
export const MUSIC_TRACK = {src: 'audio/src/music_user.flac', drop: 21.10, at: CUES.drop1, duckDb: -7, lufs: -24.1, fadeOut: .9,
  lift: [[0, 8], [3, 4], [6, 0]], endDuckDb: -10, stem: 'audio/stems/v8_music_track.wav'};
export const SFX = [
  {id: 'snap', at: CUES.drop1 - .01, gain: -14}, {id: 'swish', at: CUES.drop1 + .04, gain: -20},
  {id: 'snap', at: CUES.drop2 - .01, gain: -14}, {id: 'swish', at: CUES.drop2 + .04, gain: -20},
  {id: 'shimmer', at: CUES.glint[0], gain: -22},
  {id: 'tap_glass', at: CUES.pricePop, gain: -18},
  {id: 'whoosh', at: CUES.sheet[0], gain: -20},
  {id: 'chime_end', at: CUES.logoIn.land, gain: -18},
];
