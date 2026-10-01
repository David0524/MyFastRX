# Handover: MyFastRx video work

The project moves to a new chat. The new direction is a **modern hype video with SaaS-launch energy**. Keep the
**hook-first opening**: the first seconds should stop the scroll without reading as a pharma ad.

- Repo: `david0524/myfastrx`. Branch: `claude/relaxed-archimedes-fiuecm`. Work folder: `ads/glp1-glass/`.
- Last shipped, verified cut: **v3**, commit `cbd39d2`. File: `out/MyFastRx_LiquidGlass_A.mp4` (27 s, 1080×1920).
  Review copy: `previews/A_review_copy.mp4`.

---

## 1. The new direction (from the client)

- **Modern hype / SaaS launch.** Fast and confident, kinetic type, product moments, cuts on the beat, glass UI.
  Think a product keynote sizzle, not a clinic.
- **Hook first.** The opening seconds hook the viewer without screaming "pharma ad". What worked: an "oddly
  satisfying" glass moment with no pitch and no logo. A teal glass pill touches down with a crisp glass tap on
  frame 1, glides, squishes, and settles over "$69", magnifying it. The pitch comes after.
- **Use the new photos** (section 4) where they help: the vial, the box, the cards and the table read as real.
- **Tool choice.** The client concluded that in-browser 3D can't reach photoreal. Real-time three.js on CPU always
  read as CG. They're considering **Seedance** (or a similar generative video model) for photographic shots.
  Recommended split:
  - The generative model makes the footage, with blank cards and tags and no text.
  - Code adds everything that must be exact: price plus qualification, claims, captions, logo, badge, disclaimer
    and timing.
  - Motion-graphic glass (section 6) is the house style for type and UI moments.

## 2. Brand and compliance rules (non-negotiable; they applied to every cut)

**Audience, tone and positioning**
- Audience: women 35–64.
- Tone: calm, warm, clear, "affordable premium", in control, transparent. Never discount-retail, clinical, Gen-Z
  or diet imagery. A hype edit can be energetic, but keep it premium.
- Message: control and transparency.
- Differentiators:
  - no membership fees, and no auto-refills (you request each refill);
  - one price covers provider review, medication and shipping;
  - no insurance needed, no contracts;
  - flat price across doses.
  - Speed ("review typically within 24 hours") is supporting proof only.

**Imagery**
- **Logo:** the official file only, exactly as-is (`images/logo_myfastrx_official.jpg`). Never on or touching the
  vial. No glass logo.
- **Never show:** needles, syringes, scales, before/after, body close-ups, or pounds-lost claims.
- **People:** a person may appear only as a lifestyle character. No implied medication use, no testimonials.
  v3/v4 used no people.
- **Glass never distorts a person** (the protect zones in the glass shader).

**Claims and price**
- **Never imply everyone qualifies.**
- **No other brands or drug names, no competitors, no "unlike others".** Never mention Apple or iOS.
  **No tirzepatide.** The vial says SEMAGLUTIDE (the client-supplied asset).
- **Price wording:** only "Starting at $69". Never "trial", "/month" or "first month".
- **Price qualification:** "Introductory offer. Regular pricing varies by plan." sits directly beneath $69
  (32–36 px) whenever $69 is visible, on every frame. In v3 it's set in three lines ("Introductory offer." /
  "Regular pricing" / "varies by plan.") so no line is wider than "$69". Then, whenever the whole price is in frame
  during a camera move, so is the whole qualification.

**Fine print and text**
- **Disclaimer, exact text:** "Compounded medication. Not FDA-approved. Results may vary. Not all patients qualify.
  Prescription issued only if medically appropriate following provider review. MyFastRx does not manufacture
  medications; product appearance and labeling may vary. Actor portrayal."
  - Set at 22 px fine print, end card only, in a solid navy (#001D45) panel spanning x 100–920 with its bottom at
    y 1236.
  - Flag: with no actor on screen, "Actor portrayal" may not apply. Ask counsel; don't change the text unilaterally.
- **On-screen text** holds still while it's read.
- **Captions** match the VO word for word.
- **Safe area:** keep text inside the Reels/Stories safe zone, x 100–920 and y up to ~1236. Visual centre x = 510,
  because of the right-hand button rail.

**Background and transitions**
- The background is never plain white. Use a gradient #F7F7F7 → #EEF3FA, soft teal (#14A3B8) and blue (#0071FE)
  blurred shapes at 15–25% drifting where glass passes, and a faint grid. Keep calm, clear areas behind all text.
- Transitions are glass-based.

**Colours and type**
- Colours: navy #001D45, blue #0071FE, teal #14A3B8, off-white #F7F7F7.
- Type: Geist (`assets/fonts/`, OFL), 700 for headlines and 500/600 for body.

**Delivery spec**
- 9:16, 1080×1920, 30 fps CFR, H.264 High at 10–15 Mbps (shipped at 12.5 CBR with nal-hrd=cbr).
- Audio: AAC 48 kHz, −16 LUFS / −1.5 dBTP. Rec.709.

**Flag for counsel before any paid run**
- The claims: flat price across doses, no insurance/contracts, 24 h review.
- The disclaimer placement (end card only) and its size.
- The vial label wording.

## 3. Voiceover (recorded, in use)

- Source: `vo/body_v2_src.mp3`, an ElevenLabs read by Susan Kathleen.
- In use: `vo/body_v2.wav`, the same take at **1.15× tempo** (atempo, pitch kept), per the client.
- What she says:
  > GLP-1 care, with no strings attached, no membership fees, no automatic refills. You request each one when you're
  > ready. One price covers your provider review, medication, and shipping, starting at $69. Clear pricing, clear
  > care. See if you qualify at MyFastRX.com.
- Gap: she never says "your price doesn't climb as your dose does". In v3 that line is on-screen text, not a
  caption.
- Script and direction: `vo/ELEVENLABS_PROMPT_v2.md`.
- Word timings: `python3 tools/transcribe.py vo/body_v2.wav` (faster-whisper).
- Speech edges: `node tools/vo-env.mjs vo/body_v2.wav`.
- Cut points v3 used (in pauses): 11.20 s and 13.00 s of the 1.15× file.

## 4. Assets

**`images/`** (client-supplied, unaltered)
- `logo_myfastrx_official.jpg` (1600×532, #F7F7F7 background).
- `badge_bbb_a_rating_horizontal.jpg`.
- `vial_semaglutide.png`: the original photo vial, used pixel-exact in v2.
- `ref_glass_ui_set.png`, `ref_glass_pulse_line.png` (the heartbeat wave; the client especially likes it),
  `ref_teal_pill_blank.png`.
- `UNUSED_ref_price_pills_1st_month.png`: **do not use** ("1ST MONTH", $129).

**`plates/`** (new photoreal images the client generated)
- Prompts used: `plates/IMAGE_PROMPTS.md`. Originals: `plates/src/`. Cut by `python3 tools/prep-plates.py`.

| File | Size | Notes |
|---|---|---|
| `vial_lying.png` | 447×1212 | Upright front view, real alpha. Label reads SEMAGLUTIDE / Compounded Medication / Rx Only. Grey stopper, matte aluminium crimp, teal flip-off cap. Looks genuinely photographic. |
| `vial_lying_blank.png` | 483×1205 | Same vial with a blank white-and-teal label (print your own). |
| `ship_box.png` | 999×709 | Kraft mailer box with a blank label, top-down. Cut from a fake checkerboard. |
| `member_card.png` | 1103×665 | Navy card with a chip, no text. Cut from a checkerboard. |
| `price_tag.png` | 1124×691 | Card hang tag with a silver eyelet. The hole is punched transparent. |
| `notepad.png` | 1160×860 | Ruled pad with a navy binding. Real alpha. |
| `rx_pad.png` | 711×1058 | ℞ pad. Real alpha. |
| `card_blank.png` | 1250×832 | Blank card stock. 9-slice it to any size. |
| `twine.png` | 1317×86 | A strip of cotton twine. |
| `table_top.jpg` | 1672×941 | Light whitewashed oak, top-down. Low resolution: upscale before close-ups. |
| `table_tile.jpg` | 1432×705 | The oak made tileable (2 boards; seams wrap, ends cross-faded). |
| `room_back.jpg` | 1671×941 | Soft-focus bright room past a table edge (pale blue pillows, window light). |

**Elsewhere**
- `audio/`: music and SFX composed in code (`audio/compose.mjs`); `audio/sfx_onsets.json` holds measured onsets.
- `footage/`: Mixkit clips (laptop hands, package at door, latte, kitchen). Mixkit Free License; see
  `footage_sources.txt`. The client found the footage didn't make sense; it was dropped in v3/v4.

## 5. What was built, and verdicts

| Cut | What | Verdict |
|---|---|---|
| v2 (`f2a6a1b`) | 25 s, 2D motion graphics + WebGL glass. Price pill → photo frame → toggle → CTA. Cursor-driven. | Client liked the Apple-like premium direction once cartoony bits were removed. |
| v3 (`cbd39d2`), **shipped** | 27 s. A three.js 3D opening (pill glides over the price, camera cranes overhead and dives into the glass), match-cut into the 2D glass film. Heartbeat wipes, "Request refill" button, photo-frame footage, dose slider, end card. Real VO at 1.15×. 39/39 automated checks pass. | The best finished piece. The opening hook concept is liked. |
| v4 CG (`8ea0ef3`) | Everything as a 3D tabletop: scrawl-to-type ink morph, twine pulled through a tag, membership card knocked away, toggles, vial and box drop in. | "Cartoon", "not realistic". Real-time three.js can't sell photoreal wood or props. |
| v4 plates (`a347c2a`) | The same tabletop rebuilt with the photo plates; only glass and twine in 3D. | Props looked real, but the client called it "not realistic at all" and stopped. Glass and camera still read as CG. |

**Ideas the client responded to:**
- the oddly satisfying glass hook;
- the heartbeat wave as a glass object and transition;
- a doctor's scrawl morphing into clean type (`src/t3/ink.mjs`);
- "no strings attached" told literally with a string;
- price-led, with control and transparency.

## 6. Liquid Glass techniques (reusable)

### 6a. 2D WebGL glass shader: `src/glass.mjs` (the house look; worked well)

- **How it works:** each glass object is a full-screen WebGL2 pass that reads the frame rendered so far (ping-pong
  textures). Glass refracts everything beneath it, including other glass. Draw order: background → glass passes in
  order → foreground text → HUD.
- **Shapes:** signed-distance fields. `uType` 0 is a rounded rect (`uC`, `uHalf`, `uRad`); 1 is a capsule
  polyline (up to 10 points, `uPts`): the heartbeat tube.
- **Bevel:** a quarter-circle profile over `uBevel` px gives a per-pixel normal; the flat top has normal (0,0,1).
- **Refraction:** sample the backdrop at `p − n.xy·uRefr`, strongest at the rim and zero on the flat top, so text
  under the glass stays crisp. For dispersion, R and B sample at offsets ×(1 ± `uDisp`): chromatic fringes at the
  edges only.
- **Tint:** Beer–Lambert, `exp(−uSigma · thickness)`. Thickness comes from the bevel height. The teal pill used
  `uSigma = [.19, .01, 0]`.
- **Light:** a Fresnel rim (`uRim`); one sharp Blinn specular from a single upper-left key light (`uSpec`); a
  hairline edge; an inner glow (`uGlow`, `uGlowCol`); a slight lift (`uLift`) that brightens the body.
- **Shadow:** two layers, a tinted soft shadow (`uShOff`, `uShBlur`, `uShAmt`, `uShCol`) plus a tight contact
  shadow. The shadow is coloured by the glass tint, never grey.
- **Extras:**
  - `uMag`: flat-top magnification, a lens over the price;
  - `uSheen`/`uSheenAmt`: a moving light band, the glint sweep;
  - `uCaustic`: a crescent of focused light on the table just past the rim;
  - `uClip`: the object exists only between two y values, for wipes where a pane passes over;
  - `uScale`/`uAnchor`: squish and spring about a point;
  - `uProtect`: a no-refraction rectangle, so glass never bends a person.
- **Photo-vial pass** (same file):
  - inputs: a photo plus a mask/normal map from `tools/prep-vial.mjs`;
  - the clear glass areas refract the live backdrop through a cylinder model, using the photo's own glass detail as
    a transmission factor, plus a moving specular band;
  - cap, crimp and label pixels are copied untouched, so the label stays pixel-exact;
  - a reflection on the floor line, and a rise out of a surface line (`uClipY`).
- **Presets** (in `src/v2/scene_v3.mjs`):
  - `CLEAR`: sigma [.02, .013, .006], refr 24, disp .22, rim .9;
  - `TEAL`: the price pill;
  - `PULSE`: blue heartbeat, sigma [1.6, .8, .08], refr 9.

### 6b. Motion language (the client's "Apple keynote" brief)

- **One continuous take:** no fades or crossfades. Objects morph into the next object: price pill → photo frame →
  toggle track → CTA button, or "Request refill" button → photo frame → price pill.
- **Text** rises out of a mask line under its baseline (`maskLine`). No opacity fades. It exits the same way.
- **Springs:** `spring(t, t0, period .34, decay .085)`. Squish on landing: damped sine. Easing: `eIO` cubic for
  moves, `eOut` expo for arrivals.
- **Cursor-driven UI:** an arrow cursor clicks and drags, with a press-scale on the button. Screen-Studio-style
  zoom pushes.
- **Heartbeat wipe:** the glass heartbeat tube sweeps up the frame; above it the old scene, below it the new
  (`uClip`).
- **Glint sweep:** a sheen band crosses a pane while its content swaps behind it.
- **Background system:** gradient + blobs + world-space grid, so the grid curves through every glass piece.
  **Calm zones** are blurred `destination-out` rects behind text that fade in just before the text arrives.
- **Match-cut from 3D into 2D:** the 3D camera dives into the pill's glass. The 2D camera starts at s ≈ 34 inside
  the pill at the same world point, with the grid line, line width, teal tint and highlight matched.

### 6c. The 3D opening, three.js (v3: `src/v2/opening3d_v3.mjs`)

- **Pill:** heightfield geometry (capsule footprint, quarter-round bevel, near-flat dome) with
  `MeshPhysicalMaterial`: transmission 1, thickness .07, ior 1.38, dispersion .14, teal attenuation, low
  clearcoat.
- **Table:** a CanvasTexture tabletop carries the printed price and the grid. Lighting is a RoomEnvironment PMREM;
  tone mapping NeutralToneMapping.
- **Performance:** about 10 s/frame in SwiftShader.

### 6d. Pipeline (deterministic, frame-exact)

- **Render:** headless Chromium (Playwright, `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, SwiftShader).
  The page draws frame i at t = i/30 and POSTs raw RGBA to a local server, which pipes it into ffmpeg (crf 6
  yuv444 intermediate).
  - `render.mjs` flags: `--page <name>`, `--only 0,60,…` (stills), `--from/--to` (parts).
  - `render-parallel.sh` renders parts in parallel, then joins them with the concat demuxer.
- **Audio** (`audio/compose.mjs`):
  - music in code: a Karplus–Strong pluck, an additive piano, glass keys above 3.5 kHz;
  - ducked under the VO windows; SFX placed by measured onset;
  - `tools/build-vo.mjs` places VO segments per `VO_EDIT`, one ffmpeg input per segment (a shared input
    deadlocks);
  - `mix.sh` runs a two-pass loudnorm, then the final encode.
- **Verify** (`verify.mjs`): stream spec, bitrate, loudness, the price → qualification check on every frame (ink
  boxes tracked through the camera), OCR (tesseract) of every line, a faster-whisper transcript vs the script,
  disclaimer and final-hold byte-identity on lossless stills, logo/badge colours and box-edge checks.
- **Other tools:** `tools/preview.sh` makes safe-zone previews; `tools/proof.sh` makes refraction proofs.

## 7. Lessons and pitfalls

- **Real-time CG on CPU won't pass as photographic.** Use real or generated photography for physical things, and
  keep code for graphic, typographic and glass-UI moments, where "designed" is the point.
- **AI image tools:**
  - they misspell labels (check every letter);
  - they often fake transparency with a baked checkerboard (`tools/prep-plates.py` cuts those);
  - they deliver low resolution (upscale the table before close-ups).
- **three.js transmission** only refracts **opaque** objects. Photo plates must be alpha-tested, not transparent,
  or glass hides them.
- **three.js r16x:** `envMapIntensity` only scales a material's **own** `envMap`. Set `envMap` on each material,
  or the reflections can't be turned down (the cause of a grey haze over "$69").
- **Depth fighting:** keep printed faces ≥ 2 mm above what's under them, and use a near plane ≥ .05.
- **Price qualification during camera moves:** any sideways or zoom move can show the whole "$69" before the whole
  qualification line. The fixes are narrower qualification lines and a pull-back camera clamp.
- **Glass and readability:** glass over text needs low reflections (the read-glass preset) or the text washes out.
- **Process:** `pkill -f` can kill your own shell; kill by PID. Commit often: the container can restart mid-task.

## 8. Hook ideas for the hype cut (no pharma tells)

1. **The glass tap.** Black or soft-white void. A teal glass pill drops and taps (a crisp glass SFX on frame 1),
   squishes and slides. It lands on "$69", magnifying it, with the qualification beneath. Hard cut to the beat.
2. **The receipt that won't print.** A receipt printer feeds paper. The printed fees ("membership fee", "auto-refill
   fee"…) get struck through by a glass heartbeat line one by one, leaving one line: "Starting at $69" plus its
   qualification.
   - Keep it about us, not competitors.
   - Don't imply others charge these; phrase it as "No membership fees" rather than "unlike others".
3. **The scrawl.** Macro of a doctor's illegible scrawl. The ink lifts off the paper and reforms as clean type:
   "GLP-1 care, no strings attached." Then a string snaps away.
4. **The toggle.** A huge glass "Auto-refill" toggle flicks OFF with a satisfying click, then a smash-cut into the
   kinetic title.

## 9. A starting point for the hype cut (about 20–30 s, on the VO)

- **0–3 s:** the hook (pick one from section 8). No logo, no pitch.
- **3–12 s:** kinetic glass typography on the beat, with the claims as punchy cards: "No membership fees." /
  "No auto-refills." / "You request each refill." (match the VO wording for captions).
- **12–18 s:** product-shot montage from the plates, each with a light sweep or glint, a push-in and a cut on the
  beat: the vial, the box and the Rx pad. "One price covers provider review, medication, shipping."
- **18–22 s:** the price moment, "Starting at $69" plus the qualification, and the dose slider beat ("Your price
  doesn't climb as your dose does", on screen).
- **22–27 s:** the end card, exactly as v3: the official logo, "Clear pricing. Clear care.", the blue glass CTA
  "See if you qualify", MyFastRx.com, the BBB badge, and the 22 px disclaimer panel, held still.

## 10. Starter prompt for the new chat

> Read `ads/glp1-glass/HANDOVER.md` in `david0524/myfastrx` (branch `claude/relaxed-archimedes-fiuecm`). I want a
> modern, SaaS-launch-style hype video for MyFastRx, 9:16, about 25 s, cut to the existing VO
> (`vo/body_v2.wav`). Keep a hook-first opening that doesn't feel like a pharma ad. Use the Liquid Glass
> motion-graphic style (section 6) for type and UI, and the photo plates in `plates/` for product shots. All brand
> and compliance rules in section 2 apply. Start by proposing 2–3 hook options and a beat-by-beat edit plan before
> building.
