# Handoff: MyFastRx ad work (October 2026)

Read this first, then `HANDOVER.md` **section 2**. Section 2 holds the brand and compliance rules, which still apply to
everything. The rest of `HANDOVER.md` is history from v3–v5.

- Repo: `david0524/myfastrx`. Branch: `claude/relaxed-archimedes-fiuecm`. Work folder: `ads/glp1-glass/`.
- Everything below is committed and pushed. Commit and push after every change; the session stop hook enforces this.
- Don't open a PR unless asked.

## Where things stand

| Piece | State | Files |
|---|---|---|
| **v7 "Without the strings"** (28.8 s, the main film) | Approved cut, **but the actress must be recast** (next task) | `out/MyFastRx_WithoutStrings_v7.mp4`, review copy `previews/v7_review_copy.mp4`, source `src/v7/`, `./render-v7.sh && ./mix_v7.sh`, `node verify_v7.mjs` (41 pass, 0 fail, 4 notes at last full verify) |
| **v8 "No strings"** (10 s product-hero spot) | Done on a scratch VO; waiting for the client's dedicated read | `out/MyFastRx_NoStrings_10s_v8.mp4`, `previews/v8_review_copy.mp4`, `src/v8/`, `./render-v8.sh && ./mix_v8.sh`, brief `V8_10S_BRIEF.md`, VO script `vo/ELEVENLABS_PROMPT_10s.md` |
| **UGC plan** (about 16 ads a month) | Drafted; the client is reviewing it | Summarised below. The full doc is a Claude Doc in the old account and may not be visible to the new one |

## Next task: recast v7's actress

- **The client picked casting option B:** `footage/gen/cast2_b.png` (Higgsfield job `c31cff41-fab2-44c6-aede-2c5aaa3d5238`).
  - Race-neutral; reads Afro-Latina or mixed Black and Hispanic.
  - Around 50, heavier but not fat.
  - Off-white linen shirt over a pale blue top, at a kitchen island.
  - The prompt is in `footage/gen/README.md`.
- **Replace all four of her shots.** Same beats as the current takes (`footage/gen/README.md` has the old prompts and
  timings):
  1. opening: she reaches for and picks up her phone (`open_take1`);
  2. tap: her fingertip touches the black phone screen, camera locked (`tap_take1`);
  3. tea: sipping at the living-room window, smile widens (`tea_take1`);
  4. walk: the phone goes into her tote, she looks up and smiles (`walk_take1`).
- **Recipe per shot:**
  - a Nano Banana Pro first frame, using `cast2_b.png` as the image reference;
  - Seedance 2.0 fast, 720p, 5 s, `generate_audio: false` (12.5 credits);
  - a ByteDance upscale to 1080p, preset aigc (~0.1 credits);
  - `tools/extract-gen.sh <file>_1080p <dir>`.
- **After the new tap take:** re-track the phone with `tools/track-phone.py` (→ `footage/tap_screen_quad.json`).
  Then re-time `TAP` / `OPENING` / `TEA` / `WALK` in `src/v7/timeline.mjs` and `src/v7/scene.mjs` to the new takes'
  action frames.
- **Then:** re-render, mix, `verify_v7.mjs`, and make the review copy.
  - Review-copy command: `ffmpeg -i out/MyFastRx_WithoutStrings_v7.mp4 -vf scale=720:1280:flags=lanczos -c:v libx264 -crf 24 -preset medium -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart previews/v7_review_copy.mp4`.
- **Credits:**
  - The recast needs ~55. At last check the account had ~17.
  - The client was deciding on the Higgsfield Plus plan (1,000 credits a month).
  - **Spend cautiously:** preflight every generation with `get_cost: true` and say what each step costs.
  - Never pass `use_unlim: true` unless the client asks.
- **Casting gotcha:** the first casting batch came back without trousers on 3 of 4 images. Always spell out the full
  wardrobe and the framing (waist-up).

## Client feedback to remember (beyond HANDOVER section 2)

- **Product placement:** the product is **never placed in a real-life setting.** The vial lives in the brand's glass
  world: the #F7F7F7 → #EEF3FA gradient, soft teal and blue light, the faint grid.
  - A bathroom-counter plate was tried for v8 and rejected; the unused files are `footage/gen/counter_*`.
- **The vial:** use only the client's file `images/vial_semaglutide.png`, with the label pixel-exact.
  - `tools/prep-vial.mjs` writes half- and full-res assets.
  - `G.vial()` in `src/glass.mjs` refracts the backdrop through the clear glass.
- **v7's tea → products transition:** the full-width glass heartbeat line from the first cut (`wipePts` in `src/v7/scene.mjs`).
  - The new scene follows the line's shape: the seam runs along the polyline, and the products fill the spike.
  - Don't swap it back to the `heartbeat_glass.png` image plate.
- **Dose proof:** one liquid-glass tube filling left to right in steps. **No bar graphs.**
- **The GLP-1 line in the VO:** the client only wants "G-L-P-1" said a touch faster (current: the branded take with only
  GLP-1 at 1.2×).
  - Time-stretching whole words sounded robotic and was rejected.
- **Passed on:** Ro / Hims-style ideas (a giant wordmark set, a campaign line system). Don't re-pitch them.
- **Render speed:** for small changes use `tools/patch-render.sh v7 FROM TO [workers]`, not a full re-render.
  - Rendering is headless Chromium on SwiftShader, about 2.5 s per frame per worker, 4 cores.

## UGC plan (summary of the doc the client is reviewing)

- **Volume:** about 16 ads a month, 10–20 s, 9:16. Each ad is 2–3 Kling 3.0 clips (10 s with audio, 20 credits), a
  voice from ElevenLabs, coded captions, the coded price/answer cards, and the coded end card with the disclaimer.
- **Hosts:** two recurring AI hosts, about 50.
  - Host A = casting option B (the same woman as the v7 recast), voiced by Susan Kathleen.
  - Host B is still to be cast: the same age band, a different look, a second warm voice. Open question to the
    client: a woman or a man?
  - Each host gets a Soul ID so she stays consistent.
- **Formats:**
  1. explainer (host to camera, kitchen);
  2. POV / green screen (host in front of the MyFastRx app);
  3. street question (host with a mic, "Did you know…?");
  4. objection-buster ("What's the catch?").
- **Eight starter concepts**, two per format, each with two hooks. Examples: "Okay, the GLP-1 pricing thing nobody
  explains."; "What does sixty-nine dollars actually cover?"; "What's the catch?"; "Will they auto-ship me stuff?"
- **Guardrails (hard):**
  - Hosts are presenters, never patients.
  - No "I've been on it", results, pounds, before/after, needles, or anyone holding or taking the medication.
  - $69 always with the qualification beneath; disclaimer on the end card ("Actor portrayal" applies).
  - Platform AI-content labels on.
  - Counsel signs off once per format. Claims to clear first: no insurance or contracts needed, review within 24 h,
    flat price across doses.
- **Budget (1,000 credits):** recast ~55, Host B + Soul IDs ~10, 16 clips ~320, second-hook variants ~160, retakes ~240,
  cutaways ~120. Total ~905.
- **Testing:** launch all 16 at once, move spend to the winners after 5–7 days. Test the hook first, then the host,
  then the format.

## Waiting on the client
- [ ] Higgsfield plan and credits
- [ ] The 10 s ElevenLabs read (`vo/ELEVENLABS_PROMPT_10s.md`; 3 takes, Speed 1.05)
- [ ] Approval of the UGC formats and Host A; Host B as a woman or a man
- [ ] Counsel: the claims above, the disclaimer hold on the 10 s spot (~1.8 s), and "Actor portrayal" when no actor is shown

## Starter prompt for the new account
> Continue the MyFastRx ad work in `david0524/myfastrx`, branch `claude/relaxed-archimedes-fiuecm`, folder
> `ads/glp1-glass/`. Read `HANDOFF.md` first, then `HANDOVER.md` section 2 (the brand and compliance rules). The next
> task is recasting the actress in v7 with casting option B (`footage/gen/cast2_b.png`), using Higgsfield. Preflight
> every generation's cost and tell me before spending credits. Commit and push after each step.
