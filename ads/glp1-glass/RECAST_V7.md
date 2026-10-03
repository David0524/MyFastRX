# v7 recast: casting option B (prompt pack and cost plan)

The client picked `footage/gen/cast2_b.png` (Higgsfield job `c31cff41-fab2-44c6-aede-2c5aaa3d5238`). This file holds
everything needed to regenerate v7's four shots of her, so the Higgsfield calls can run straight from here. Nothing in
this file has been generated yet.

Rules that apply to every prompt (HANDOVER section 2): she is a lifestyle character only. No medication, vial,
needles, scales or body close-ups. No logos or text, and the phone screen stays black (the UI is coded). Spell out the
full wardrobe and framing every time; the first casting batch came back without trousers.

## Wardrobe (same in all four shots, for continuity)

Relaxed off-white linen button shirt, sleeves rolled, over a soft pale blue knit top. Light-wash straight-leg jeans.
Small gold hoop earrings. Natural dark curly hair with a few grey strands, loose to the shoulders. Fuller, curvy build,
soft rounded face, warm medium-brown skin.

## Cost plan (estimates from past jobs; each one gets a `get_cost: true` preflight before it runs)

| Step | Model | Est. credits |
|---|---|---|
| Opening: start frame = `cast2_b.png` as is (no new still) | — | 0 |
| Tap, tea, walk first frames: 2 options each | Nano Banana Pro, ref `cast2_b.png` | ~6 (about 1 per image) |
| 4 takes, 720p, 5 s, `generate_audio: false` | Seedance 2.0 fast | 50 (12.5 each) |
| 4 upscales to 1080p, preset aigc | ByteDance upscaler | ~0.4 |
| **Total** | | **~56.4** |

Retakes cost 12.5 each. With one first-frame option per shot instead of two, the total drops to ~53.4.
Never pass `use_unlim: true` unless the client asks.

## 1. Opening: she reaches for and picks up her phone (replaces `open_take1`)

- **Start frame:** `cast2_b.png` directly. It is the same kitchen island, and it's the frame the client approved.
- **Seedance 2.0 fast** (720p, 5 s, 9:16, no audio): "Slow, gentle camera push-in. The woman at the kitchen island
  glances down, reaches for a smartphone lying face-down on the oak counter, picks it up at chest height and looks
  at it with a warm, relaxed smile. Natural, unhurried movement, soft morning light, realistic. Phone back is plain,
  no logos. No text."
- **Need:** the reach at ~1.7 s, the phone up by ~2.9 s (v7 uses it from 0.8 s, `OPENING` in `src/v7/timeline.mjs`).

## 2. Tap: her fingertip touches the black phone screen (replaces `tap_take1`)

- **First frame, Nano Banana Pro**, ref `cast2_b.png`, 9:16: "Photorealistic over-the-shoulder close shot of the same
  woman from the reference image (same face, curly hair with grey strands, warm medium-brown skin, off-white linen
  shirt with rolled sleeves over a pale blue knit top), standing at the light oak kitchen island in the same bright
  kitchen. She holds a modern black smartphone upright in her left hand, the screen fully black and blank, facing the
  camera. Her right index finger is raised just above the screen, about to tap it. Phone in the centre-left of the frame,
  hands and phone sharp, kitchen softly blurred behind, soft morning window light. No text, no logos, no reflections
  on the screen."
- **Seedance 2.0 fast:** "Locked-off camera, no camera movement. Her index finger moves in and gently taps the centre
  of the black phone screen once, then rests. The screen stays completely black the whole time. Subtle natural hand
  movement only. No text, no UI."
- **After:** find the contact frame, re-track the phone with `tools/track-phone.py` (→ `footage/tap_screen_quad.json`),
  and update `TAP.contact` and `TAP.finger` (720p coordinates × 1.5).

## 3. Tea: sipping at the living-room window (replaces `tea_take1`)

- **First frame, Nano Banana Pro**, ref `cast2_b.png`, 9:16: "Photorealistic candid lifestyle photo, medium shot from
  the waist up, of the same woman from the reference image (same face, curly hair with grey strands, warm medium-brown
  skin, off-white linen shirt with rolled sleeves over a pale blue knit top, light-wash jeans), standing by a large
  window in a bright, airy living room with a pale blue sofa and plants, holding a white ceramic mug of tea in both
  hands near her chest. Relaxed, content expression, looking out the window. Soft morning light, pale blue and white
  palette, shallow depth of field. No text, no logos."
- **Seedance 2.0 fast:** "Static camera with a very slight drift. She takes a slow sip of tea, lowers the mug to chest
  height, and her smile slowly widens as she looks out of the window. Calm, natural, realistic."
- **Need:** the mug lowered and the smile widening in the back half (v7 uses it from 2.55 s, `TEA.from`).

## 4. Walk: the phone goes into her tote, she looks up and smiles (replaces `walk_take1`)

- **First frame, Nano Banana Pro**, ref `cast2_b.png`, 9:16: "Photorealistic candid lifestyle photo, full-length to
  knees, of the same woman from the reference image (same face, curly hair with grey strands, warm medium-brown skin),
  fully dressed in an off-white linen shirt with rolled sleeves over a pale blue knit top, light-wash straight-leg
  jeans and white sneakers, a canvas tote bag on her shoulder. She walks along a sunny tree-lined suburban sidewalk,
  holding a smartphone in one hand at waist height, looking down at it. Bright spring morning, green lawns, white
  houses, soft depth of field. No text, no logos."
- **Seedance 2.0 fast:** "Camera tracks backwards slowly in front of her as she walks. She slips the phone into her
  tote bag, then looks up and ahead with a warm, easy smile and keeps walking. Natural gait, realistic, sunny morning."
- **Need:** the phone in the tote at ~2–3 s, the smile from ~3.3 s (v7's walk scene starts at 21.3 s).

## After each take

1. Upscale to 1080p (ByteDance, preset aigc), then `tools/extract-gen.sh <file>_1080p <dir>`.
2. Log the file names and job ids in `footage/gen/README.md`.
3. When all four are in: re-time `OPENING` / `TAP` / `TEA` / `WALK` in `src/v7/timeline.mjs` and `src/v7/scene.mjs`,
   then `./render-v7.sh && ./mix_v7.sh`, `node verify_v7.mjs`, and the review copy (command in `HANDOFF.md`).
