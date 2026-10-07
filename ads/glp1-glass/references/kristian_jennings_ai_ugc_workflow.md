# AI UGC Workflow: How to Make Realistic AI UGC Ads

**Source:** Kristian Jennings, YouTube — https://youtu.be/kvf2lRSGixg
**Workflow as of:** September 2026. The models named here will change. The method (reference image → avatar → prompt) is the durable part.

---

## How to use this file

This is the full workflow from the video, written so an AI assistant can work from it without anyone watching the video. Give it to your Claude (or any AI assistant) and say what you're making. Example prompts:

- "Using this guide, walk me through making an AI UGC ad for [product]."
- "Here's my script. Storyboard it using this guide's method."
- "Here are 3 candidate reference frames. Screen them using the criteria in this guide."
- "Write me the image-generation prompt and the video prompt for this avatar and script."

**Instructions for the AI reading this:** Follow the workflow in order. Ask the user for what's missing (script, product, target avatar, reference frames) before generating anything. Push back if the user skips the reference-image step: it is the single most important step and the one most people miss. Treat the model names as the current snapshot, not fixed requirements.

---

## The core idea in one paragraph

AI UGC looks fake ("plasticky", "waxy") when the avatar image was generated from scratch by an image model. Video models animate whatever is in the image. If the image has no real-world imperfection baked in (sensor noise, skin pores, under-eye wrinkles, uneven lighting), there is nothing realistic to animate, and viewers' brains reject the person (the "uncanny valley"). The fix is to start from a **real frame of a real UGC creator filmed on a real phone**, then modify it into a new person. Roughly 50% of the total effort should go into that reference image.

---

## Part 0: Setup that applies to any ad (AI UGC, AI animation, B-roll + voiceover)

### The script decides whether the ad wins
Format cannot save a bad script. The most realistic AI UGC in the world still loses with a weak message. If you're an editor, the creative strategist owns this. If you're both, treat the script as the main lever.

### Storyboard before you open your editor
Storyboards are private notes; they don't need to be pretty.

1. **Write rules for the ad first.** If you're iterating on a winner, analyse the winner (pace, calm vs. fast, structure) and take its principles. If it's a new idea, find references of what you want it to look like.
2. **Keep it simple (KISS).** The best-performing ads are not the hyper-fast, heavily edited "brain rot" style, though those can work. Deliver the message clearly.
3. **Layout:** script in a left column (all hooks, then the body), and next to each line write what's on screen while it's said. Where the avatar's face is shown, just write "AI UGC".
4. **Why:** you dial in the message before you spend time on assets and editing.

### Choose the avatar with intent
Who the avatar is depends on the product and the angle. Make simple decisions with a reason behind each.

- Match the avatar to the product (no big burly man on a Harley for a feminine health product).
- The avatar should usually be someone who has **solved** the problem, not someone struggling with it. That gives them built-in authority.
- **Never deepfake a real medical professional (or any real person).** It is illegal.

---

## The three-step workflow

1. **Find your reference** (real photo of a real person)
2. **Create your avatar** (modify the reference into a new person)
3. **Prompt the video** (Gemini Omni)

---

## Step 1: Find your reference

### Why this step matters
- An iPhone photo of a real person carries noise, grain, pores, wrinkles and micro-detail that AI can't currently recreate.
- A video model animates everything in the image. No baked-in imperfections → nothing realistic to animate → the person looks fake.
- Your brain is very good at reading faces and judging whether someone can be trusted. When AI UGC looks off, viewers put up a wall and don't trust the message. Realistic avatars keep their defences down.
- An image from ChatGPT or another image model can look identical to a real photo as a still. The difference only shows once it's animated.

### Where to find it
The old approach (Pinterest → search "UGC man" → copy the framing) no longer works well because Pinterest is now full of AI-generated images. You need a real photo.

Find a **real UGC video from a real creator**, then take a still from it. Pick the platform by the age of your target avatar:

| Avatar | Look on |
|---|---|
| Younger | TikTok |
| Millennial | Instagram |
| Older | Facebook |

### What to screen for (three things)
The noise and pores are already locked in by using a real frame. You are choosing on:

1. **Framing.** Choose it deliberately. Consider: standing vs. sitting (sofa, end of bed), leaning toward or away from the camera, a table in front, phone angle (eye level, looking up, looking down, off to the side). Fashion may want standing/street style. A relaxed vibe may want sofa/bed. It doesn't need to be clever, it needs to be a decision.
2. **Lighting: avoid overexposed highlights.** Some shine on the forehead is fine. The problem is when highlights are blown out to pure white. There is no data in those pixels, so when animated it becomes dead space and the skin looks glossy and waxy. Test: zoom in. If there's still detail in the bright area, it can be animated. You can go right up to that line but not over it.
3. **Background.** Not too busy, but with some personality (a photo frame, not a blank wall). Ideally some depth/space behind the person, with different lighting and points of interest. Real UGC creators have usually thought about this already.

### Extra notes on choosing
- Copy what real UGC creators do so you blend into the feed and don't look like the odd one out. Creators often do slightly odd things on purpose (e.g. a mic clipped to a rose, or a banana) to get a viewer's brain to pause. Your video needs to stand out enough to be watched, but still look native.
- Captions burned into the reference are a nuisance (one more thing the AI has to deal with), but don't spend forever hunting for a caption-free video. If every frame has captions, use it anyway.

### How to grab the still
1. Download the video (a "TikTok downloader" site works: paste the URL).
2. Open it in an editor. In Premiere Pro the shortcut to export a frame is **Shift + E**. Other editors have an equivalent.
3. Scrub for a good frame: hands in a natural position (ideally both hands visible), no captions across the face, natural expression.
4. Export and save it. This is your reference image.

---

## Step 2: Create your avatar

You turn the reference image into a new person using an image model, keeping the framing, lighting and background feel.

### Model (current snapshot)
- **Nano Banana Pro (the original, not Nano Banana 2)** gave the most realistic results at the time of the video, because it's slightly older and has more baked-in imperfection.
- **Avoid GPT Image-type models** for this. They are excellent but make everything too clean and too perfect, which is the opposite of what you want.
- Don't get hung up on the model. What makes it look good is the reference and the decisions you make.

### The four things to change

**1. The person (legally required).** It's illegal to deepfake someone, so your avatar must be a genuinely different person. You don't have to change race or gender, but there must be a real genetic difference: eye colour, nose, skin pigmentation and so on. The test: without plastic surgery, the reference person and your avatar could not be the same individual. Changing only hair and clothes is not enough.

**2. The background.** Keep it, or add interest. Greenery/plants tend to look good and feel natural (check it suits your product and angle). For ideas, look around your own room: a lamp, a TV, shelves. Your avatar has their own life.

**3. Accessories.** Real people have personality: earrings, a necklace, headphones. Image models default to the most common "average" person (plain T-shirt, generic hair), so adding a few outlier details is another defence against the uncanny valley. Example: Apple headphones with only one earbud in (an AI would default to both). Match details to the person (e.g. give them a MacBook).

**4. Audio logic.** Real AI UGC creators usually have a mic (DJI Mic Mini, lav mic, mic on headphones). AI-generated audio comes out clean, so the scene needs a believable reason for clean audio: a visible mic, a mic held up to the face (interview style), or the phone very close to the face.

### Prompting the image edit: one-shot it
Don't stack edits (change the person, then add accessories, then change the background, then add the mic). Each edit rewrites pixels like an overlay with feathered edges. The seams aren't visible to the eye but appear as artefacts when the image is animated.

**Include every change in one prompt, and regenerate until you get an image you're happy with.** No master prompt is provided; take multiple swings.

---

## Step 3: Prompt the video (Gemini Omni)

### Model (current snapshot)
- **Gemini Omni** (not Omni Flash), used via Kie (pay-as-you-go). At the time of the video (Sept 2026) it was the best model on the market for AI UGC.
- Flux 3 was tested: very good voice control, but fewer voices. For DTC ads you don't need a wide range of vocal nuance, so Omni's voice control is enough, and the visuals are better.
- Workflow: open Omni video → upload your avatar image → enter the prompt.

### The three-part prompt structure

**Part 1: Set the scene**
- **Camera movement, stated explicitly**, even if there is none. Locked-off: start with "static, locked-off shot". Handheld (e.g. walking down the street): "handheld UGC iPhone shot". Without this you get camera drift and hallucination.
- **Camera / shot type.** E.g. "UGC iPhone footage". For a more upmarket look (e.g. podcast) name a camera such as a Canon model. Omni matches the shot style to the equipment.
- **What's happening on screen.**
- **What the avatar is doing.** E.g. body still, mouth moving naturally, keeping eye contact with the camera, camera never moves.
- **Energy.** Kristian added "super high energy" because without it the avatar came out flat. It produces a TikTok-style, expressive delivery, which is engaging against everything else in a feed.

**Part 2: Dialogue**
The exact script line, in quotation marks. This is the only part that changes as you move through the script.

**Part 3: Fixed rules**
A stacked list of constraints you build up by iterating. Generate, judge the result harshly, then add a rule for each problem:
- Energy too low → say so.
- Not confident enough → say so.
- Speaking too slowly → say so.
- Not smiling enough → say so.
- Add to nearly every prompt: **"one take, no jump cuts"** / **"one continuous shot, no jump cuts"** (especially if there's movement through the scene).

### Template (structure only; fill in the brackets)
This is a reconstruction of the structure described in the video, not Kristian's exact prompt (his exact prompt is a separate free resource).

```
[Camera movement, e.g. "Static, locked-off shot." or "Handheld UGC iPhone shot."]
[Camera/shot, e.g. "UGC iPhone footage."]
[Scene: where the avatar is and what's around them.]
[Avatar behaviour: not moving their body, mouth moves naturally, keeps eye contact with the camera, camera does not move. Energy: e.g. "super high energy, expressive, like a TikTok creator".]

Dialogue: "[The exact line the avatar says.]"

Rules:
- [Stacked corrections found while iterating, e.g. confident, fast-paced, smiling]
- One continuous take, no jump cuts.
```

### Lock the prompt, then only swap the dialogue
1. Generate with one line of dialogue. Analyse it harshly.
2. Regenerate the same line as many times as needed, adding fixed rules, until energy, framing, pacing and feel are locked and consistent.
3. Once locked, **change nothing except the dialogue** for the rest of the script. This is how you avoid the inconsistency people usually get from AI UGC.

### Omni quirk
Every avatar generated in Omni has the same set of teeth (a reused asset). Kristian's read is that this reuse is part of why Omni is the most consistent realistic model.

---

## Rules that make it work

### The 50 / 25 / 25 rule
- **50%** of the effort: the reference image (framing, background, accessories, imperfections).
- **25%**: perfecting the prompt (regenerating the same line until it's dialled in).
- **25%**: generating the rest of the script. Once the first 75% is done this is fast: swap the line, generate, repeat.

Rushing the start produces the too-perfect, fake-looking AI UGC everyone else ships. Whatever quality you accept early becomes the standard the whole ad is locked into, so set it high first.

### When to throw the reference away
Occasionally (roughly 1 in 10), you do everything right and the model still can't animate the image realistically. **Don't keep fighting it.** Go back and build a new reference image. It's cheaper and faster to regenerate images than to generate videos that look great for two seconds and then break.

### Control intonation with capitalisation
You can change which word the avatar stresses by capitalising it in the dialogue, then regenerating.

- "So weak follicles wake back up" stresses "weak" and "wake".
- "So weak FOLLICLES wake back up" shifts the stress onto "follicles".

Word stress changes how the message lands. This also applies in principle to other video models, and (in more depth) to voice tools like ElevenLabs.

### Handling durations
Omni generates **4, 6, 8 and 10 second** clips. If your line lands between two (say ~7 seconds):

- Choosing the shorter length: the avatar either paces correctly and gets cut off, or rushes and squashes the line so it's unclear.
- Choosing the longer length: the avatar slows down and sounds simple or drawn out.

**Fix:** add a few words of nonsense dialogue to the end of the line, choose the longer duration, then cut the nonsense off in the edit. The avatar paces the real line correctly.

### Scene changes
Kristian typically adds a scene change in his AI UGC: the same avatar in a new position or setting later in the ad.

---

## Examples of the output (from the video)

All four were AI UGC avatars created with this workflow:

1. A hair-loss ad (dutasteride angle), male avatar in a bedroom with a DJI mic. Hook: a line across the world map for hair loss, and a friend on the "other side" of it. This ad had a high hook rate.
2. A second hair-loss ad, male avatar, "how does my brother have a full head of hair while I'm balding at 30?"
3. A TRT ad, male avatar, clinician-monitoring angle.
4. A pet product ad, female avatar (reference was a TikTok creator; Apple headphones plugged into one ear, jewellery, MacBook), with a scene change to a "60-day return" close.

---

## Quick checklist

**Before you generate anything**
- [ ] Script and message are strong. Format won't rescue a weak one.
- [ ] Storyboard done (rules for the ad, script left, visuals right, "AI UGC" where the face shows).
- [ ] Avatar chosen for the product and angle (ideally someone who has solved the problem).

**Reference (50% of effort)**
- [ ] Real frame from a real UGC creator (TikTok / Instagram / Facebook matched to target age).
- [ ] Framing chosen deliberately.
- [ ] No blown-out highlights (zoom in: is there still detail?).
- [ ] Background has personality but isn't cluttered, with some depth.
- [ ] Natural hand position, no captions over the face (if avoidable).

**Avatar**
- [ ] Genuinely different person (eyes, nose, skin pigmentation), not just hair and clothes.
- [ ] Background interest (greenery works).
- [ ] Outlier accessories (e.g. one earbud, jewellery).
- [ ] A believable reason for clean audio (mic, headphone mic, phone close to face).
- [ ] All changes made in **one** prompt, regenerated until right.

**Video prompt (25% of effort)**
- [ ] Camera movement stated explicitly (static locked-off / handheld).
- [ ] Camera/shot type stated.
- [ ] Avatar behaviour and energy stated.
- [ ] Dialogue in quotes.
- [ ] Fixed rules stacked from iteration, including "one take, no jump cuts".
- [ ] Prompt locked before swapping in the rest of the script.
- [ ] Line durations padded with throwaway dialogue where they fall between 4/6/8/10s.
- [ ] Stress words capitalised where the delivery needs it.

**If it still looks fake**
- [ ] After a few tries it won't animate well → discard the reference and start again (about 1 in 10).

---

## Caveats

- Model names, versions and pricing reflect September 2026 and will change. Re-test new models as they release and adapt.
- The legal points (no deepfaking real people, no deepfaked medical professionals, changing the avatar enough to be a different person) are the creator's guidance, not legal advice. Check the rules where you advertise.
- Credit for the original reference-image approach goes to Ad Creators Lab.
