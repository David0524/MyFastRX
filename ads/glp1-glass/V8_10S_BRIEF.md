# v8 "No strings": the 10 s product-hero spot

A 10 s performance unit built on what works in the Mochi Health ads (sarasokhom.com/mochi-health): the whole offer is
readable on frame 1, there's one product hero, and one idea moves. It's built so variants are cheap: the copy, timing
and plate are data in `src/v8/timeline.mjs` / `src/v8/scene.mjs`.

- Film: `out/MyFastRx_NoStrings_10s_v8.mp4` (1080×1920, 30 fps, 10.0 s; −16 LUFS / −1.5 dBTP).
- Review copy: `previews/v8_review_copy.mp4`.
- Build: `./render-v8.sh && ./mix_v8.sh`.

## The idea
"Without the strings", made literal. Two strings of twine are tied round the client's vial, with tags reading
**Membership fees** and **Automatic refills**. As she says "No membership fees." / "No automatic refills.", each string
lets go and falls out of frame. The vial is left standing free, a light runs across its glass, and "$69" springs on
its word.

| Time | Picture | VO |
|---|---|---|
| 0.0 | **Frame 1 is the whole ad:** wordmark chip, headline, teal glass price pane (Starting at $69 + qualification), the vial in the brand's glass world with both strings | "GLP-1 care, without the strings." |
| 3.1 | String 1 snaps and falls; headline → "No membership fees." | "No membership fees." |
| 4.4 | String 2 snaps and falls; headline → "No automatic refills." | "No automatic refills." |
| 5.3 | The vial, free: one light across its glass | |
| 5.9 | Headline back to the tagline; "$69" springs once | "Starting at $69." |
| 7.6 | The end card rises as a sheet: logo, MyFastRx.com, BBB badge, disclaimer, the vial | "MyFastRx.com." |
| 9.7–10.0 | Still | |

A slow camera push (4.5%) runs on the backdrop, the vial and the strings throughout; the text and the price pane hold
still.

## What's real and what's coded
- **The vial** is `images/vial_semaglutide.png`, the client file, at full resolution (`tools/prep-vial.mjs` now also
  writes `assets/vial/vial_*_full.rgba`).
  - The cap, crimp and label pixels are copied untouched, so the label stays pixel-exact.
  - Only the clear glass is live: it refracts the backdrop and grid behind it, along with the strings' back loops.
  - It gets a contact shadow tinted by its teal glass (never grey) and a reflection.
- **The backdrop** is the brand's glass world from v3–v7 (no real-life setting, as in all the client's demos):
  - the #F7F7F7 → #EEF3FA gradient;
  - slow teal and blue light pools;
  - the faint grid, cleared behind the wordmark and the headline.
  - (A Higgsfield bathroom-counter plate was tried first and dropped: the product is never shown in a real-life setting.
    The plate is kept in `footage/gen/counter_*` for reference.)
- **Strings and tags**: the client's twine and price-tag photos (`plates/twine_v6.png`, `plates/price_tag.png`).
  - The tag's eyelet was moved to the top centre (`plates/hang_tag.png`) so it hangs straight.
  - The fall is coded physics: a kick up, gravity, and a spin.
- **Sound:**
  - Music: the client's track, with its drop on the first string falling.
  - SFX: the v7 set (a snap and a swish per string, a shimmer on the glint, a glass tap on "$69", a whoosh, the end chime).
- **VO (scratch):** the client's existing ElevenLabs takes, cut only in their pauses. "MyFastRx.com" is the tail of
  "See if you qualify at MyFastRx.com". A dedicated 10 s read is scripted in `vo/ELEVENLABS_PROMPT_10s.md`.

## Rules kept
- The price is "Starting at $69" with "Introductory offer. / Regular pricing / varies by plan." directly beneath it,
  on every frame where the price shows. No asterisk, and no "/month".
- The official logo file only (cropped for the chip, pixels untouched). It's never on or touching the vial.
- No people, needles, scales, before/after or competitors. The headline matches the VO word for word.
- All text sits inside x 100–920 and y 269–1236. The disclaimer is the exact text, on the end card only.

## Flag for counsel / client
- **Disclaimer hold:** about 1.8 s with the scratch VO. The dedicated read (target 7.5 s of speech) adds a little.
  If counsel wants longer, the cheapest fix is an 11–12 s version.
- **"Actor portrayal"** is in the disclaimer text, but this spot has no actor (as flagged in HANDOVER).
- **The tags literally say "Membership fees" and "Automatic refills"** (the things removed).

## Higgsfield spend
About 14.6 credits went on the counter plate, which isn't used: two stills (2), one Seedance 2.0 fast take (12.5),
one upscale (~0.1). The job IDs are in `footage/gen/README.md`.

---

## Prompt pack (for more variants)

### Product imagery
The product stays in the brand's glass world, never in a real-life setting. Product imagery comes from the client's
own vial file, composited in code. If a new product angle is ever needed, generate it on a plain studio background in
the same light as `images/vial_semaglutide.png` (soft, high-key, a reflective white floor), never in a room.

### Hook variants to A/B (headline + VO line 1 only; everything else stays)
1. "GLP-1 care, without the strings." (this cut)
2. "No membership. No auto-refills. Just GLP-1 care." (the strings fall from frame 1)
3. "Your GLP-1 care, no strings attached." (an echo of the v2 read)
4. "What's the catch? There isn't one." (a question hook; check the claim with counsel)

Each variant is a copy change plus one ElevenLabs line, then a re-render (about 4 min).
