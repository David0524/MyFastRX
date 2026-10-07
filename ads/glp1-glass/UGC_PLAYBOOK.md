# UGC playbook (standing rules for every AI UGC ad)

Distilled from a creator's two-part AI UGC workflow (client-supplied, Oct 2026), adapted to MyFastRx's compliance rules
(HANDOVER.md section 2, HANDOFF.md casting rules). Read this before planning any UGC ad.

## 0. House rules (client notes, Oct 2026): these override anything below
- **Relaxed pacing.** Nothing rushed; let lines breathe.
- **Conversational, fully.** Talk like a person on the phone to a friend: half-sentences, "okay so", "honestly", "yeah".
- **Slower cuts:** the hook shot holds about **1.5 s**, every shot after it holds **2 s or more**.
- **The host is present throughout:** frequent touch points back to her face; B-roll never runs long without her.
- **She films herself on location to give proof:** the real website on her phone or laptop, real places she goes.
- **She wears a small wireless clip-on mic** (DJI Mic Mini style, no visible logo): the creator tell.
- **She introduces the product herself** (holds up her phone on MyFastRx, points at it), not a title card.
- **B-roll feels real:** her hands, her screen, her house. Not TikTok meme style (stickers, zooms, emoji pops), not
  studio product shots.
- **Animations share one cohesive art style** (any process or biomedical animation). Biomedical/mechanism visuals only with
  client-approved wording (the brief bans clinical claims without it).
- **Show what she's saying, KISS:** every line has one literal visual; no clever metaphors.
- **Never imply she is a patient:** no unboxing her own order, no "my medication". Delivery shots show a parcel on a
  doorstep without her claiming it.

## 1. A-roll is the base, never the ad
- Don't ship the talking head alone ("yapper" ads can work, but B-roll raises the hit rate).
- Build the full script as **A-roll from first frame to last** (the host delivering every line), then **stack B-roll on top**.
  Remove the B-roll track and the ad still plays.
- Cheaper fallback: generate A-roll only for on-camera lines and cover B-roll sections with the same voice. Slower and a
  little worse; fine when credits are tight.

## 2. Cut back to the A-roll often, never linger
- Stare at any AI face long enough and the tells show. Cover with B-roll, but **return to the host frequently and briefly**:
  the viewer should feel told a story by a person, with B-roll keeping it visually interesting.
- Each A-roll stretch about 2-4 s once the hook is done; shots hold 2 s or more (house rules).

## 3. B-roll matches who the host is
- Decide the host's "creator profile" first: age, how tech-savvy, how much effort they put into content.
  A late-40s woman films plainer, less "aesthetic" B-roll than a 25-year-old fitness creator.
- B-roll is what *that person* would film: phone propped on a counter while she does something, a slightly awkward
  acted-out moment, a phone-screen recording. Awkward on purpose is fine; it reads as real.
- **Change the outfit between scenes** (same outfit everywhere is a tell), but keep the consistent details (same earrings,
  ring, hair).

## 4. Re-hook with a change of place
- Top creators move location mid-video (bedroom -> walking outside -> park) to open a curiosity loop
  ("where is she going?"). For anything over ~15 s, plan at least one location change, ideally where the product or the
  key claim lands.

## 5. Voice consistency: lock the prompt
- Spend real time on the **first** take (energy, delivery, accent). Regenerate the same take ~3x to confirm it is stable.
- Then **lock the prompt**: for every later clip change only the dialogue (and the reference image for a new outfit or
  scene). Same prompt + same host reference = same voice and register across the whole ad and future ads.
- Car rant host (car_cast_3): her locked voice is Seedance 2.5's own voice from the clip A/B drafts (client preferred it).
  Reuse those exact prompts from `footage/gen/README.md` with new dialogue.

## 6. Reference images decide everything; prompts stay short
- Quality comes from the reference image, not the prompt. **Prompts are one or two plain sentences** describing the change
  or the action. No "realistic, visible pores, natural lighting" padding: that is "act natural" and it hurts.
  (Our early prompts were too long. Keep them short from now on.)
- What makes a good host reference image:
  - **Lighting is the most important:** muted, even, no overexposed skin, nose, forehead or eye highlights (those animate as
    waxy, glassy skin). Too dark beats too bright.
  - **Background:** neutral and believable for the scene; nothing identifying (names, logos, specific decor). A plant for
    interest is fine.
  - **Framing:** not right up against the lens; a little distance buys margin for AI imperfections.
- B-roll scenes: put the same host reference into the new scene with a short prompt (e.g. "She sits on her porch with a
  cup of tea, wearing a denim jacket, looking out at the street, relaxed.") and let the model fill in the world.

## 7. Recipe discipline
- Once a pipeline works, change one thing at a time. A different model or a skipped reference step gives a different
  result.
- Current recipe (car rant): host frame from Nano Banana Pro -> Seedance 2.5 `omni_reference` draft (480p, start image +
  audio reference) -> ByteDance upscale (ugc) -> coded captions, price line, end card (`tools/car-rant-edit.py`) ->
  stabilize camera drift if needed (`tools/stabilize-clipA.py`).
- The creator says his "Omni" model beats Seedance on realism and price. Higgsfield lists a `gemini_omni` (Gemini Omni
  Flash: image references, native audio, 4-10 s, 720p). Worth one A/B test on the next ad before switching.

## Where we do NOT follow the source (MyFastRx rules win)
- **No first-person patient content.** The source's examples ("I'm having more hair fallout... look at these baby hairs")
  are testimonials. Our hosts are presenters: no "I'm on it", no results, no progress, no before/after.
- **No product in hand or in use**, no needles, scales or body close-ups. B-roll shows the *service* (her phone on the
  MyFastRx page, a parcel arriving, the coded price card), never the medication being taken.
- **Reference images from real creators:** the source starts from a real creator's frame and changes them "genetically"
  to avoid a deepfake. We don't use a real person's image as a base without a licence: legal and likeness risk for a
  regulated health brand. Use our own generated bases (as with car_cast_3) or licensed stock, and keep the casting rules
  (Black or Hispanic women, 45-55, average healthy build).
- AI-content labels stay on (TikTok, Meta); the disclaimer and "$69" qualification rules are unchanged.

## Checklist for the next UGC ad
1. Host and creator profile decided (age, effort level, B-roll style).
2. Full script as A-roll, one locked prompt; first take tested 3x.
3. B-roll list per line (2-4 shots for a 20 s ad), each with an outfit or scene change, matched to the host's style.
4. At least one location change for anything over ~15 s.
5. Edit: A-roll touchpoints every few seconds, captions word for word, price line under every "$69", end card.
6. Compliance pass against the "do NOT follow" list above.
