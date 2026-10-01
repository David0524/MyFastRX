# MyFastRx "Liquid Glass" - v5 "Hype" (25.5 s, 1080x1920) - current

`out/MyFastRx_Hype_v5.mp4` (review copy `previews/v5_review_copy.mp4`). A SaaS-launch-style cut on the existing VO
(`vo/body_v2.wav`), 120 BPM, cuts on the downbeats and on the words.

| Time | VO | Picture |
|---|---|---|
| 0-3.0 | none | **Hook (three.js action shot):** a teal glass pill taps down on frame 1 and races across the table, swerving; a low handheld chase camera swings round it and it lands on the printed "$69" + qualification at 2.5 s. A glint crosses it and the camera cranes up to a locked overhead that is the 2D film's first frame exactly (same framing, tint, light and grid). |
| 3.0-5.9 | "GLP-1 care, with no strings attached," | Match-cut on the drop. The price leaves through its mask line (then the qualification) and the pill grows into the teal title pane; the three lines rise on their words. A taut string under it snaps on "attached". |
| 5.9-8.5 | "no membership fees, no automatic refills." | A clear glass bar sweeps down. The navy card plate slides in and is flicked away; a glass "Automatic refills" toggle flicks OFF on "refills". |
| 8.5-10.5 | "You request each one when you're ready." | The toggle becomes the "Request refill" button; the cursor presses it; the line is set as kinetic type. |
| 10.5-14.6 | "One price covers your provider review, medication, and shipping," | Heartbeat wipe. "One price covers" over a glass product frame: Rx pad, vial, box (photo plates on the oak / room plates), push-ins, glint swaps on each word, a label per word. |
| 14.6-18.9 | "starting at $69." | The frame contracts into the teal pill on the downbeat (15.0); "Starting at $69" with its qualification; the dose slider and the on-screen "Your price doesn't climb / as your dose does." |
| 18.9-25.5 | "Clear pricing, clear care. See if you qualify at MyFastRx.com." | Heartbeat wipe into the end card (v3's, packed up): logo, tagline, CTA, URL, BBB badge, and the vial lying under the badge; the disclaimer stays at the safe-zone edge (bottom y 1236), held byte-identical from 19.6 s, the whole card from 23.9 s. |

**Build**
```
./render-v5.sh                  # 0-89 three.js hook (src/v5/opening3d.html), 90-764 2D film (src/v5/film.html) -> out/v5/video_only.mp4
node audio/compose_v5.mjs       # music + SFX stems (coded), timed from src/v5/timeline.mjs
./mix_v5.sh                     # VO stem per VO_EDIT, -16 LUFS / -1.5 dBTP, H.264 12.5 Mbps CBR -> out/MyFastRx_Hype_v5.mp4
node render.mjs --tl src/v5/timeline.mjs --page v5/film --stills v5/stills --layout v5/layout.json --only 600,650,720,740,764
node verify_v5.mjs              # -> out/v5/verify.json (43 checks: 39 pass, 0 fail, 4 notes = OCR punctuation / encoder noise)
TIMES="0.8 2.5 3.3 13.5 16.2 18.2 24.0" tools/preview.sh out/MyFastRx_Hype_v5.mp4 v5
```
Files: `src/v5/timeline.mjs` (all timing, VO edit, word times, SFX), `src/v5/scene.mjs` (2D film), `src/v5/opening3d.mjs`
(hook), `src/v5/backdrop.mjs` (the soft background light, shared by the 2D film and the 3D table so the match-cut holds), `src/glass.mjs` (shared shader). Tools need `faster-whisper` (pip) and `tesseract` (apt) for the verifier.

---

# MyFastRx "Liquid Glass" - Version A v3 (previous) "No strings attached" (27 s, 1080x1920)

**0-4.25 s, 3D opening (three.js):** an "oddly satisfying" shot with no pitch and no logo. A teal glass pill touches
down on a modern tabletop with a glass tap on frame 1. It glides with a slow breathing squeeze while the camera follows,
then settles with a jelly wobble over the printed "$69", which it magnifies. The qualification is printed beneath the
price on the same tabletop. The camera cranes overhead and dives into the pill's glass.

**4.25 s on, overhead table film:** a match-cut from inside the pill (same grid line, tint and highlight). The camera
pulls back to show the table from above, where glass pieces from the reference set carry the story:
- "GLP-1 care, no strings attached." with a glass heartbeat under it.
- A heartbeat wipe to "No membership fees. No automatic refills." A glass "Request refill" button that the cursor
  presses ("You request each one").
- The button becomes a glass digital photo frame on the table, which plays the lifestyle footage: a laptop with
  "Review typically within 24 hours", then the vial, then a package at the door. Beside it, "One price covers" checks
  off provider review, medication and shipping, plus "No insurance needed. No contracts."
- The frame contracts into the teal price pill. A dose slider is dragged up and the price holds, under the on-screen line "Your
  price doesn't climb as your dose does."
- A second heartbeat wipe into the end card: the official logo, "Clear pricing. Clear care.", a blue glass CTA,
  MyFastRx.com, the BBB badge and the fine print.

## Status

| Item | State |
|---|---|
| Version A video | `out/MyFastRx_LiquidGlass_A.mp4` (v3). v2, the price-led cut, is commit f2a6a1b; its sources are in `src/v2/` |
| Version B | not built (asked for A only) |
| Voiceover | ElevenLabs read (Susan Kathleen), `vo/body_v2_src.mp3`, played at 1.15x (`vo/body_v2.wav`, atempo, pitch kept). Cut in its pauses and placed per `VO_EDIT`; mix at -16 LUFS / -1.5 dBTP. The read ends line 4 at "starting at $69.", so "Your price doesn't climb as your dose does." is on-screen text, not a caption |
| Footage | Mixkit Free License clips (hands on a laptop, package at the door) inside the glass photo frame; see `footage_sources.txt`. No face shown |
| Stems | `out/stems/A_music.wav`, `out/stems/A_sfx.wav` , `out/stems/A_vo.wav` |
| Verification | `node verify.mjs` -> `out/verify_A.json` |

## Build

```
node tools/prep-vial.mjs        # vial color (2x2 box-averaged crop of the supplied PNG) + mask/normal map
node audio/compose.mjs          # music + SFX stems (all composed in code)
./render-parallel.sh            # 810 frames: 0-127 from src/opening3d.html (three.js), 128-809 from src/film.html -> out/A_video_only.mp4
./mix.sh                        # VO stem + mix (-16 LUFS) + final H.264/AAC encode -> out/MyFastRx_LiquidGlass_A.mp4
node render.mjs --only 423,655,700,760,790,824 && node verify.mjs
tools/preview.sh out/MyFastRx_LiquidGlass_A.mp4 A && tools/proof.sh
```

## Re-timing the VO

`python3 tools/transcribe.py vo/body_v2.wav` gives word timestamps and `node tools/vo-env.mjs vo/body_v2.wav` the exact
speech/silence edges. Lines are placed with `VO_EDIT` (source range + landing time) in `src/timeline.mjs`; picture cues
that follow words (check clicks, toggle snap, URL rise) and `CAPTIONS` sit next to it. After an edit: `node audio/compose.mjs`
(re-ducks the music under the new VO windows), render, `./mix.sh`, `node verify.mjs`.

## Footage

`tools/extract-footage.sh` trims, crops and grades `footage/src/*` into `footage/frames/<slot>/` (regenerated, not committed).
Slots and in-points are in that script; `FOOTAGE` in `src/scene.mjs` says when each plays and whether it shows a person
(glass never refracts footage with a person in it). Licenses and screening notes: `footage_sources.txt`.

## Background and transitions

Never plain white. The overhead table is a vertical gradient (#F7F7F7 to #EEF3FA) with a few large soft teal and blue
shapes drifting where glass passes. A faint graph-paper grid is phased with the 3D tabletop's grid, so the handoff
lines up. The shapes and grid clear softly behind every headline, the price, the qualification, captions and the
end-card marks (`calmZones` in `src/scene.mjs`); each zone clears just before its text arrives.

Every transition is a glass move:
- the dive into the pill and the pull-back out of it;
- a glass heartbeat that sweeps up the table between sections (old section above it, new one below);
- the button morphing into the photo frame;
- glint sweeps between photos;
- the frame contracting into the price pill;
- a second heartbeat into the end card.

## Fine print

The disclaimer appears on the end card only (client direction, 2026-09-30): it rises in at 21.3 s and holds, byte-identical,
to the last frame (~6 s). 22 px Geist Medium on a navy panel spanning the safe area (x 100-920), bottom edge at y 1236,
above the Reels caption/controls zone and left of the right-hand button rail. The price qualification ("Introductory offer. / Regular pricing / varies by plan.", 34 px, three lines so no line is
wider than "$69" and the whole qualification is in frame whenever the whole price is) is separate and
stays with $69 whenever it is on screen: it is printed with the price on the 3D table, and in the overhead film the
$69 leaves before its qualification does (verified per frame).

## How the glass works (`src/glass.mjs`)

Each glass object is a WebGL pass that reads the frame rendered so far, so glass refracts everything behind it, including
other glass. Shapes are signed-distance fields (rounded rects, capsule polylines) extruded with a quarter-circle bevel.
The bevel gives a normal per pixel. Refraction samples the backdrop at `p - n.xy * refr` (strongest at the rim, zero on the
flat top), with R/B sampled at slightly different offsets for chromatic edges. The pass adds Beer-Lambert tint, a
Fresnel rim, a sharp specular from one fixed upper-left key light, hairline edges, and a two-layer tinted shadow.

**The 3D opening** (`src/opening3d.mjs`) uses a three.js MeshPhysicalMaterial pill (transmission, dispersion,
teal attenuation, clearcoat) on a heightfield "domed tablet" geometry. It sits over a canvas-textured tabletop that
carries the grid and the printed price, lit by a RoomEnvironment with a soft studio backdrop.

**Vial:** shown as a photo in the glass frame. It is the unedited supplied PNG, scaled uniformly; no pixel is edited.

## Files

- `src/timeline.mjs`: all timing (beats, cues, cursor path, captions, planned VO, SFX placements)
- `src/opening3d.mjs`, `src/opening3d.html`: the 3D opening (three.js from node_modules)
- `src/scene.mjs`: the overhead film: layout, copy, the per-frame composition
- `src/glass.mjs`: WebGL2 glass renderer
- `src/film.html`: page the renderer drives
- `render.mjs`, `render-parallel.sh`, `mix.sh`, `verify.mjs`
- `audio/compose.mjs`, `audio/stems/`, `audio/sfx/`, `audio/sfx_onsets.json`, `audio_sources.txt`
- `images/`: supplied inputs (unaltered). `assets/`: fonts (OFL) and derived vial maps
- `images/UNUSED_ref_price_pills_1st_month.png`: supplied but **not used**, because it shows "1ST MONTH*" and $129
