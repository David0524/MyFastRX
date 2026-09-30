# MyFastRx "Liquid Glass" - Version A (25 s, 1080x1920)

Opens like native content (a latte pour with word stickers; a glass price pill drops onto the screen), then one continuous take in a bright glass world: nothing crossfades or cuts. Text rises out of mask lines, objects pop on
springs, the teal price pill morphs into the photo frame, the frame contracts into the toggle track, and a navy flood
contracts into the CTA button. A cursor drives the clicks and the drag. Geist type, #F7F7F7 canvas, navy #001D45.

## Status

| Item | State |
|---|---|
| Version A video | `out/MyFastRx_LiquidGlass_A.mp4` |
| Version B | not built (asked for A only) |
| Voiceover | ElevenLabs reads (voice "Susan Kathleen"), lines placed per `VO_EDIT` in `src/timeline.mjs`; mix at -16 LUFS / -1.5 dBTP |
| Footage | Mixkit Free License clips (latte pour, hands on a laptop, package at the door); see `footage_sources.txt`. No face shown, no person generated |
| Stems | `out/stems/A_vo.wav`, `out/stems/A_music.wav`, `out/stems/A_sfx.wav` |
| Safe-zone previews | `previews/A_reels_safezones.png`, `previews/A_stories_safezones.png` |
| Refraction proof | `previews/A_refraction_proof.png` |
| Verification | `node verify.mjs` -> `out/verify_A.json` |

## Build

```
node tools/prep-vial.mjs        # vial color (2x2 box-averaged crop of the supplied PNG) + mask/normal map
node audio/compose.mjs          # music + SFX stems (all composed in code)
./render-parallel.sh            # 750 frames, deterministic, headless Chromium + WebGL2 -> out/A_video_only.mp4
./mix.sh                        # VO stem + mix (-16 LUFS) + final H.264/AAC encode -> out/MyFastRx_LiquidGlass_A.mp4
node render.mjs --only 120 && node verify.mjs
tools/preview.sh out/MyFastRx_LiquidGlass_A.mp4 A && tools/proof.sh
```

## Re-timing the VO

`python3 tools/transcribe.py vo/body.wav` gives word timestamps and `node tools/vo-env.mjs vo/body.wav` the exact
speech/silence edges. Lines are placed with `VO_EDIT` (source range + landing time) in `src/timeline.mjs`; picture cues
that follow words (check clicks, toggle snap, URL rise) and `CAPTIONS` sit next to it. After an edit: `node audio/compose.mjs`
(re-ducks the music under the new VO windows), render, `./mix.sh`, `node verify.mjs`.

## Footage

`tools/extract-footage.sh` trims, crops and grades `footage/src/*` into `footage/frames/<slot>/` (regenerated, not committed).
Slots and in-points are in that script; `FOOTAGE` in `src/scene.mjs` says when each plays and whether it shows a person
(glass never refracts footage with a person in it). Licenses and screening notes: `footage_sources.txt`.

## Fine print

The disclaimer is 22 px Geist Medium on a navy panel spanning the safe area (x 100-920), bottom edge at y 1236, so it sits
above the Reels caption/controls zone and left of the right-hand button rail on every frame.

## How the glass works (`src/glass.mjs`)

Each glass object is a WebGL pass that reads the frame rendered so far, so glass refracts everything behind it, including
other glass. Shapes are signed-distance fields (rounded rects, capsule polylines) extruded with a quarter-circle bevel.
The bevel gives a normal per pixel. Refraction samples the backdrop at `p - n.xy * refr` (strongest at the rim, zero on the
flat top), with R/B sampled at slightly different offsets for chromatic edges. The pass adds Beer-Lambert tint, a
Fresnel rim, a sharp specular from one fixed upper-left key light, hairline edges, and a two-layer tinted shadow.

**Vial:** the supplied PNG is cropped to the vial and box-averaged to exactly half size. No pixel is edited.
A mask marks the clear glass (neck, shoulder, base) versus the opaque cap, crimp and label. Glass pixels refract the live
backdrop through a cylinder model, keeping the photo's own glass detail as a transmission factor, plus a specular band
that moves with the vial's pose. Cap, crimp and label pixels are copied untouched. At rest they match the half-size
source exactly (see `verify.mjs`).

## Files

- `src/timeline.mjs`: all timing (beats, cues, cursor path, captions, planned VO, SFX placements)
- `src/scene.mjs`: layout, copy, the per-frame composition
- `src/glass.mjs`: WebGL2 glass renderer
- `src/film.html`: page the renderer drives
- `render.mjs`, `render-parallel.sh`, `mix.sh`, `verify.mjs`
- `audio/compose.mjs`, `audio/stems/`, `audio/sfx/`, `audio/sfx_onsets.json`, `audio_sources.txt`
- `images/`: supplied inputs (unaltered). `assets/`: fonts (OFL) and derived vial maps
- `images/UNUSED_ref_price_pills_1st_month.png`: supplied but **not used**, because it shows "1ST MONTH*" and $129
