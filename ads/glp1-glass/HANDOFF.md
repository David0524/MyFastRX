# Handoff: MyFastRx ad work (October 2026)

Read this first. **Then `CLIENT_BRIEF_GLP1_2026-10.md`: the client's GLP-1 video brief.** It was drafted with ChatGPT, so treat it as strong
guidance, not gospel; the decisions below (Oct 7) override it where they differ. Then `HANDOVER.md` **section 2**; for UGC work, `UGC_PLAYBOOK.md`. Section 2 holds the brand and compliance rules, which still apply to
everything. The rest of `HANDOVER.md` is history from v3–v5.

- Repo: `david0524/myfastrx`. Branch: `claude/relaxed-archimedes-fiuecm`. Work folder: `ads/glp1-glass/`.
- Everything below is committed and pushed. Commit and push after every change; the session stop hook enforces this.
- Don't open a PR unless asked.

## Generation: Higgsfield (decided Oct 29, 2026); OpenRouter as a tested-later alternative

- **Higgsfield stays the generator.** All the videos above are complete (client, Oct 29). The client is buying the
  Higgsfield monthly plan (~$50) and connecting it to this account (connectors at https://claude.ai/customize/connectors;
  a new session picks it up). Reason: at ~5-6 videos a month (~180 credits a video in the logs) OpenRouter would save
  only ~$15-20 a month, and the things that made the UGC work (Dana's AI face accepted, `omni_reference` voice
  reference, native 1080p finalize, Seed Audio) are proven on Higgsfield and untested on OpenRouter.
- **Spend rule (unchanged):** preflight every Higgsfield job with `get_cost: true` and tell the client before spending;
  never `use_unlim: true` unless the client asks. Monthly credits expire in 30 days.
- **When to revisit OpenRouter:** volume near the 16-ads-a-month plan (~3,000 credits), slow months wasting credits,
  or faceless B-roll / Seedance 2.0 takes (about half Higgsfield's price there).

### OpenRouter alternative (`tools/gen.py`, built Oct 29, not yet run)

- `tools/gen.py` generates through OpenRouter at list prices (one key, pay per use, no expiring credits).
- **Key:** `OPENROUTER_API_KEY`, an environment secret (never in chat or the repo). Put a spend limit on the key.
- **Spend rule (unchanged):** quote first, tell the client the cost, then spend. `gen.py` only quotes unless given
  `--yes`, and refuses any single job over `--max-usd` (default $3).
- **Usage:** `python3 tools/gen.py --help`. `models [filter]` lists live prices; `video` / `image` quote (and with
  `--yes` submit, poll, download and log to `footage/gen/jobs.jsonl` with the billed cost); `fetch <job> --out` resumes.
- **Live prices (Oct 29, 2026, 9:16):**

  | Model | 480p | 720p | 1080p | Notes |
  |---|---|---|---|---|
  | `bytedance/seedance-2.5` | $0.10/s | $0.23/s | n/a | the UGC A-roll model; 4-30 s; audio free |
  | `bytedance/seedance-2.0` | $0.07/s | $0.15/s | $0.37/s | v7/v8-style takes |
  | `bytedance/seedance-2.0-fast` | $0.04/s | $0.09/s | n/a | |
  | `kwaivgi/kling-v3.0-std` | | $0.13/s with audio | | fallback for hosts if Seedance refuses faces |
  | `google/veo-3.1-fast` | | $0.10/s with audio | $0.12/s | 4/6/8 s only; fallback |
  | `google/gemini-3-pro-image` (Nano Banana Pro) | | | $0.134 per 1K/2K still | up to 14 references |

  Higgsfield equivalents for comparison: Seedance 2.5 720p was 7 cr/s (~$0.34/s), the 480p draft 3 cr/s (~$0.15/s).
- **Untested (do these first, ~$1-2):**
  1. *Face filter.* ByteDance's API refuses input images with real human faces; whether it flags our photoreal AI hosts
     (Dana) is unknown. Test: `dana_v2_1.png` as the first frame, Seedance 2.5, 480p, 4 s (quote $0.41). If refused,
     Kling 3.0 / Veo 3.1 for host shots; Seedance stays for faceless B-roll.
  2. *Voice reference.* Dana's voice came from an audio reference (Higgsfield `omni_reference`). OpenRouter passes
     audio `--ref`s to Seedance, but its docs say `frame_images` wins when both are sent. Try the still as `--ref`
     together with the voice `--ref`. Fallback: Seedance's own voice, converted with ElevenLabs speech-to-speech.
  3. *Data URLs.* Local files go up as base64 data URLs; if a provider rejects them, `--media github` (public repo only).
- **No 1080p "finalize" for Seedance 2.5 on OpenRouter.** Videos 4 and 5 shipped from 720p takes, which is the plan.
  Don't use the ByteDance upscaler on Dana (client rejected it).

## Where things stand

| Piece | State | Files |
|---|---|---|
| **v7 "Without the strings"** (28.8 s, the main film) | **Recast done (casting option B), waiting on client review** | `out/MyFastRx_WithoutStrings_v7.mp4`, review copy `previews/v7_review_copy.mp4`, source `src/v7/`, `./render-v7.sh && ./mix_v7.sh`, `node verify_v7.mjs` (39 pass, 0 fail, 6 notes after the recast; the notes are OCR misreads, encoder noise, and no transcriber in this container) |
| **v8 "No strings"** (10 s product-hero spot) | Done on a scratch VO; waiting for the client's dedicated read | `out/MyFastRx_NoStrings_10s_v8.mp4`, `previews/v8_review_copy.mp4`, `src/v8/`, `./render-v8.sh && ./mix_v8.sh`, brief `V8_10S_BRIEF.md`, VO script `vo/ELEVENLABS_PROMPT_10s.md` |
| **UGC plan** (about 16 ads a month) | Drafted; the client is reviewing it | Summarised below. The full doc is a Claude Doc in the old account and may not be visible to the new one |

## Done: recast v7's actress (Oct 3, 2026; see `RECAST_V7.md` and `footage/gen/README.md`)

- New takes `footage/gen/recast_*`; ~102 credits spent (Seedance 2.0 std, the fast mode is not on this account).
- Timings: OPENING.from 1.15, TAP.contact 15, TEA.from 2.8, WALK.from 0.3; phone re-tracked.

### The original brief

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

## What the client brief (Oct 7, 2026) changes
- **Disclaimer text is new** (section 9 of the brief), plus "Prescription required. Subject to provider approval."
  The old text ("...Not all patients qualify... Actor portrayal.") is retired. v7, v8, static A and the car rant still
  carry the old text.
- **"Compounded" must be in the main on-screen copy:** "Compounded Semaglutide starting at $69" with an "Introductory
  offer" qualifier near the price.
- **Tirzepatide is now allowed** ($129 intro). The old "no tirzepatide" rule is lifted.
- **"No subscription or membership fees" is approved** (no longer a counsel question).
- **CTA is "Check if I qualify"**, landing page https://www.myfastrx.com/weight-loss/special/.
- **Logo:** keep `images/logo_myfastrx_official.jpg` (blue "Fast" and pulse) unaltered. Ignore the brief's red-logo line.
- **AI-generated medication imagery needs client approval.** `images/vial_semaglutide_v2.png` is approved. There is no
  Tirzepatide vial yet: get one from the client (or generate one and get it approved) before showing a Tirz vial.
- **Active promotions confirmed Oct 7, 2026:** Compounded Semaglutide $69 and Compounded Tirzepatide $129 first month. Never a logo on a vial; no fixed bottle counts.
- **Length 15–20 s** (the car rant is 24.4 s). Deliver MP4 + editable source; 4:5 on request, adapted not cropped.
- **Preferred lead:** mid-40s, shoulder-length dark brown hair, average or mid-size build (combine with the casting rule
  below).
- **Music:** subtle and licensed for paid ads.
- First concepts to produce: Semaglutide $69 offer, Tirzepatide $129 offer, three-step process.

## Casting rules (client, Oct 2026)

- **Every host is a Black or Hispanic woman** (or reads as mixed Black and Hispanic), about 45-55.
- **Build: average and healthy, neither thin nor heavy.** The client's critique of casting option B (the v7 recast):
  too heavy, so she reads as the "before" rather than the "after". This may also mean v7 needs another recast; ask
  the client before touching it.
- **UGC host Dana (Oct 7, 2026 update):** Hispanic or race-neutral, mid-40s, attractive in an everyday way ("a 7/10,
  age-adjusted"), fit and toned, neither skinny nor heavy: the look of someone who has got in shape. The look only:
  the ad never says or implies she lost weight or uses the product (no results, no before/after). Round 1 (Black,
  twist-out) was rejected; **round 2 option 1 picked: `footage/ref/dana_v2_1.png`**.
- **Spoken scripts write GLP1 and My Fast Rx** (pronunciation); she says GLP1, not semaglutide. See UGC_PLAYBOOK.md section 0.
- **The raw car-selfie format's host is `footage/gen/car_cast_3.png`** (job c202c84c-dfba-40bf-bf85-b6833f9160b0):
  short natural curls, deep brown skin, rust quarter-zip, parked car in daylight. She is a new host, not Renee.

## Client feedback to remember (beyond HANDOVER section 2)

- **Product placement:** the product is **never placed in a real-life setting.** The vial lives in the brand's glass
  world: the #F7F7F7 → #EEF3FA gradient, soft teal and blue light, the faint grid.
  - A bathroom-counter plate was tried for v8 and rejected; the unused files are `footage/gen/counter_*`.
- **The vial (new shape, Oct 2026):** use only the client's new file `images/vial_semaglutide_v2.png` (white backdrop),
  label pixel-exact. `tools/cutout-vial-v2.py` keys out the backdrop -> `images/vial_semaglutide_v2_cutout.png` (RGBA;
  the clear glass keeps its photographed look, so place it on a light background). The old `vial_semaglutide.png` and
  the glass-engine assets in `assets/vial/` (v7, v8, static A) are the previous shape and need redoing before reuse.
- **The previous vial:** `images/vial_semaglutide.png`, with the label pixel-exact.
  - **Keep it small** (client, Oct 2026: "we've generally been making it too large"). The car-rant end card uses about
    300 px tall on a 1920 frame, beside the BBB A rating card, with the disclaimer below both.
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
- [ ] Higgsfield monthly plan bought and connected to this account (Oct 29)
- [ ] Answers to the 9 questions in `PLAN_TIRZ_NAD_2026-10.md` (2 Tirzepatide + 2 NAD+ videos, Oct 29)
- [ ] The 10 s ElevenLabs read (`vo/ELEVENLABS_PROMPT_10s.md`; 3 takes, Speed 1.05)
- [ ] Approval of the UGC formats and Host A; Host B as a woman or a man
- [ ] Counsel: the claims above, the disclaimer hold on the 10 s spot (~1.8 s), and "Actor portrayal" when no actor is shown

## Starter prompt for a new session
> Continue the MyFastRx ad work in `david0524/myfastrx`, branch `claude/relaxed-archimedes-fiuecm`, folder
> `ads/glp1-glass/`. Read `HANDOFF.md` first (generation is Higgsfield; `tools/gen.py` is the OpenRouter fallback), then
> `HANDOVER.md` section 2 (the brand and compliance rules) and `UGC_PLAYBOOK.md`. Quote every generation's cost and
> tell me before spending. Commit and push after each step.
