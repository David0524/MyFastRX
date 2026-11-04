# New UGC host: casting plan (Nov 4, 2026)

Brief (client, Nov 4): race neutral, about 35-45, attractive, not overweight at all and not super skinny. She should
look like someone who is in good shape and looks good right now.

This replaces the Oct casting rule ("Black or Hispanic woman, about 45-55") for this host. It's younger than Dana
(46, `footage/ref/dana_v2_1.png`), and a different face from both Dana and the car host (`car_cast_3`).

**The look only, never the claim:** the brief (section 7) says "Do not imply a model's appearance is the result of
our treatment", and she is a presenter, never a patient. She can look like she got in shape. No ad, line, caption or
B-roll says or suggests she lost weight or uses the product.

**Decided Nov 4:** she replaces Dana on all new ads (Video 6 onward). Dana's finished ads stay as they are.

## Round 0: real source frames (the method that avoids the waxy AI look)
Image models can't invent real sensor noise, pores and uneven light, and a video model can only animate what's in
the still. So each look starts from **a still of a real creator filmed on a real phone**, and Nano Banana Pro turns
her into a genuinely different woman in one edit (references/kristian_jennings_ai_ugc_workflow.md; how Dana was made).
- **Where:** Instagram (millennial creators) or Facebook. Pinterest is now full of AI images.
- **What to look for:** a woman about 35-45 talking to her phone; the framing we want for each direction below;
  no blown-out highlights (zoom in: detail must survive in the brightest skin); a background with depth and a bit of
  personality; both hands natural; ideally no captions over her face.
- **How:** download the video, export one frame (Premiere: Shift + E), save it in `footage/ref/` as
  `host2_src_A.jpg` and so on. Note where it came from in `footage/ref/README.md`.
- **Legal and ethical line:** the frame is structure only. The new woman must be someone the source person could
  not be (different eyes, nose, skin, face shape), and nothing identifying is kept (brands, captions, tattoos, decor).
  Never a real person's likeness.

## Source frames picked (Nov 4, from 5 the client sent)
The frames are third-party creators' content: **kept out of git** (the repo is public). App overlays were cropped
off; copies are in the session scratchpad and must be re-supplied in a new session.

| Frame | Verdict | Why |
|---|---|---|
| Kitchen, bangs, cream sweater, mic in hand | **Pick 1 (direction A)** | The best structure: waist-up, leaning on a counter at a natural distance, a real kitchen with window depth, mic in hand (audio logic), skin highlights intact. Fixes in the edit: the motion-blurred raised hand, the chunky knit (shimmers), the glasses, the "They" caption. |
| Living room, staircase behind, gold glasses, mic | **Pick 2 (direction B)** | The best background (depth, stairs, a lived-in room) and even light. Too close to the lens: the edit pulls her back to show the shoulders. Lose the glasses (green screen reflections animate badly). |
| Desk, wood wall, framed landscape, mic | **Pick 3 (direction D)** | Good medium framing and a background with personality. The framed photo is someone's artwork: replace it with a neutral abstract print. Lose the striped tee, patterned nails and the blurred gesture. |
| Home office, ponytail, big smile | Backup | Lovely expression and even light, but a flat grey wall, a caption across her chest and tight framing. |
| Red hair, burgundy tank | Reject | Looks off camera, no mic, low-cut top, a paid-partnership caption. |

### One-shot edit prompts (Nano Banana Pro, the frame as the image, 9:16, 2k; ~2 credits each)
**A, kitchen:** "Turn this woman into a different woman: around 40, race neutral with warm olive skin (she could be
Latina, Mediterranean or mixed), dark brown eyes, a straighter nose and fuller lips, shoulder-length dark brown hair
with soft loose waves and no bangs, no glasses. Naturally attractive in an everyday way, not a model: light everyday
makeup, matte skin with real texture. Fit, healthy, toned build, slim but not skinny. Same pose leaning on the
counter, but both hands relaxed: one holds the small fluffy grey clip-on mic near her chin, the other rests on the
counter. She wears a plain fitted crewneck tee in solid dusty rose, small gold hoop earrings and a thin gold chain.
Keep the kitchen, the window and the light. Remove the caption. Add a small potted herb plant on the counter behind
her. No text, no logos."

**B, living room:** "Turn this woman into a different woman: around 40, light golden-brown skin with a few faint
freckles across her nose, hazel-brown eyes, a softer jaw and a different nose, shoulder-length loose dark curls with
subtle caramel tones; a mixed-heritage look. No glasses. Naturally attractive in an everyday way, not a model: light
makeup, matte skin with real texture. Fit, healthy, toned build, slim but not skinny. Show her a little further from
the camera, so her shoulders and upper arms are in frame. She holds the small fluffy grey clip-on mic at chest height.
She wears a plain fitted long-sleeve top in solid sage green and small gold huggie earrings. Keep the staircase and
the living room behind her and the soft daylight. No text, no logos."

**D, desk:** "Turn this woman into a different woman: around 40, tan skin, dark brown eyes, a rounder face shape and
a different nose, sleek collarbone-length dark brown hair tucked behind one ear, no glasses. Naturally attractive in
an everyday way, not a model: light makeup, matte skin with real texture. Fit, healthy, toned build, slim but not
skinny. Both hands relaxed: one holds the small fluffy grey clip-on mic at chest height, plain short natural nails.
She wears a smooth, solid terracotta button-up shirt with the sleeves rolled and small gold hoop earrings. Keep the
wood wall; replace the framed landscape photo with a framed neutral abstract print. Keep the light. No text, no
logos."

Run each 2x (about 12 credits) and screen as below. The Higgsfield connector on this account is read-only (balance,
models, past generations), so these run in the Higgsfield web app unless a generating connector is added.

## Round 1: four directions, one image each
The prompts below become one-shot edits of the four source frames ("Turn this woman into a different woman: ..."
plus every change in one prompt; stacked edits leave seams that show once animated). Text only is the fallback if a
direction has no good source frame.

- **Model:** Higgsfield `nano_banana_pro` (the original, not Nano Banana 2), 9:16, 2k, the source frame as the image.
- **Cost:** about 2 credits each, so **about 8 credits**. Preflight with `get_cost: true` first.
- **Why four separate directions:** one batch of four from a single prompt tends to return four sisters. Four prompts
  give us real range to choose from.

### Shared prompt (only the bracketed parts change)
```
Photorealistic iPhone front-camera photo, framed from the waist up, of a woman around 40, [LOOK]. Naturally attractive
in an everyday way, not a model: real skin texture, light everyday makeup, matte skin with no shine. Fit, healthy,
toned build, slim but not skinny. She wears [WARDROBE], small gold hoop earrings, and a small plain matte black clip-on
mic with no logo or text on her collar. [SETTING]. Soft, even daylight from a window to one side, no harsh highlights.
Relaxed, warm half smile, looking into the camera as if she is about to talk to her followers. Not glamorous, no
filter. No text, no logos, no tattoos.
```

| | Look | Wardrobe | Setting |
|---|---|---|---|
| **A** (closest to the client's preferred lead) | warm olive skin, dark brown eyes, shoulder-length dark brown hair with soft loose waves; she could be Latina, Mediterranean or mixed | a plain fitted crewneck tee in solid dusty rose | standing at a bright kitchen counter, a small potted plant behind her |
| **B** | light golden-brown skin, a few faint freckles across her nose, shoulder-length loose dark curls with subtle caramel tones; a mixed-heritage look | a plain fitted solid sage-green long-sleeve top | sitting on a light sofa in a calm living room, a lamp and a bookshelf softly blurred behind her |
| **C** (sportier, "just back from a walk") | tan skin, hazel eyes, dark brown hair in a loose low ponytail with a few face-framing strands, fresh-faced | a plain solid navy zip-up athletic jacket, half zipped over a plain white tee | standing in a bright entryway by the front door, keys in one hand |
| **D** | medium-tan skin, dark brown eyes, a sleek collarbone-length dark brown cut tucked behind one ear | a smooth solid terracotta button-up shirt, sleeves rolled | sitting at a home desk by a window, laptop closed, a mug beside it |

**Wardrobe rule (playbook):** plain, smooth, solid mid-tone fabrics only. No heather, fine knits, stripes or prints;
they shimmer once animated.

**Framing rule (Oct casting gotcha):** keep the waist-up framing and the full wardrobe spelled out. An earlier batch
came back half-dressed when this was loose.

## Screening each image (UGC_PLAYBOOK.md section 8)
- **Highlights:** under about 0.5% of face pixels blown. Shiny skin animates as wax.
- **The mic:** clean, with no fake glyphs. Nano Banana often adds them; they can be painted out if needed.
- **Hands:** natural, five fingers each. **Background:** depth and some personality, nothing identifying.
- **A different person:** not Dana, not the car host, and no real person's likeness.
- **Reads 35-45 and fit, not "model":** the brief says no overly glamorous models.

## Round 2: refine the pick (about 8 credits)
- Four variations of the chosen face: Nano Banana Pro edit with the pick as the reference.
- Change one thing at a time (smile, hair, wardrobe colour); stacked edits leave seams that show once animated.
- If it reads too clean or "AI", re-seat her onto a real phone-photo structure, as we did for Dana (playbook
  section 8).

## Round 3: lock her (Video 6 and onward)
1. **Location stills:** kitchen and front steps for "Higher dose. Same price." (STORYBOARD_UGC.md, Video 6), about
   8 credits.
2. **Voice:** one 5 s Seedance 2.5 test line (about 35 credits), regenerated 2-3 times to confirm the voice holds.
   Then lock the prompt (playbook section 5).
3. **Log** every job id in `footage/ref/README.md`, as for Dana.

**Budget to a locked host:** about 8 + 8 + 8 + 35-105 = **about 60-130 credits.**

