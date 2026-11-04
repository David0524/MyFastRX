# New UGC host: casting plan (Nov 4, 2026)

Brief (client, Nov 4): race neutral, about 35-45, attractive, not overweight at all and not super skinny. She should
look like someone who is in good shape and looks good right now.

This replaces the Oct casting rule ("Black or Hispanic woman, about 45-55") for this host. It's younger than Dana
(46, `footage/ref/dana_v2_1.png`), and a different face from both Dana and the car host (`car_cast_3`).

**The look only, never the claim:** the brief (section 7) says "Do not imply a model's appearance is the result of
our treatment", and she is a presenter, never a patient. She can look like she got in shape. No ad, line, caption or
B-roll says or suggests she lost weight or uses the product.

## Round 1: four directions, one image each

- **Model:** Higgsfield `nano_banana_pro`, 9:16, 2k, text only (no reference image).
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

## Open question for the client
Does she replace Dana on new ads, or join her as a second host? If she replaces Dana, Video 6 is cast with her.
