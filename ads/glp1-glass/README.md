# MyFastRx "Liquid Glass" - Version A (25 s, 1080x1920)

One continuous take in a bright glass world: nothing crossfades or cuts. Text rises out of mask lines, objects pop on
springs, the teal price pill morphs into the photo frame, the frame contracts into the toggle track, and a navy flood
contracts into the CTA button. A cursor drives the clicks and the drag. Geist type, #F7F7F7 canvas, navy #001D45.

## Status

| Item | State |
|---|---|
| Version A video | `out/MyFastRx_LiquidGlass_A.mp4` |
| Version B | not built (asked for A only) |
| Voiceover | **not delivered**. Timing, captions and ducking use planned VO windows in `src/timeline.mjs` |
| Footage | **placeholders** (labeled slates inside the photo frame). No person is generated |
| Stems | `out/stems/A_music.wav`, `out/stems/A_sfx.wav` (no VO stem until VO exists) |
| Safe-zone previews | `previews/A_reels_safezones.png`, `previews/A_stories_safezones.png` |
| Refraction proof | `previews/A_refraction_proof.png` |
| Verification | `node verify.mjs` -> `out/verify_A.json` |

## Build

```
node tools/prep-vial.mjs        # vial color (2x2 box-averaged crop of the supplied PNG) + mask/normal map
node audio/compose.mjs          # music + SFX stems (all composed in code)
./render-parallel.sh            # 750 frames, deterministic, headless Chromium + WebGL2 -> out/A_video_only.mp4
./mix.sh                        # mix + final H.264/AAC encode -> out/MyFastRx_LiquidGlass_A.mp4
node render.mjs --only 120 && node verify.mjs
tools/preview.sh out/MyFastRx_LiquidGlass_A.mp4 A && tools/proof.sh
```

## When the VO arrives

1. Put `hook_A.wav` and `body.wav` in `vo/`.
2. Measure each phrase's start and end, then update `VO[]`, `CAPTIONS[]` and, if needed, `CUES` in `src/timeline.mjs`.
   Scene boundaries are on a 96 BPM grid (0.625 s), so shift them by whole beats.
3. Run `node audio/compose.mjs`, render, then `HOOK_AT=<s> BODY_AT=<s> ./mix.sh`. That script side-chain ducks the music
   from the VO and normalizes the mix to -16 LUFS integrated, -1.5 dBTP.

## When footage arrives

`tools/extract-footage.sh <clip> laptop|package <start-s>` writes graded-ready frames. Then set `FOOTAGE[id].frames` and
`FOOTAGE[id].protect` (the person's box) in `src/scene.mjs`. Glass never refracts inside `protect`. The frame's rim is the
only glass that touches footage.

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
