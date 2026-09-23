---
name: brand-animation-prompts
description: Research a brand, business, creator, or organization and write the image-generation prompts (ChatGPT, DALL-E, Midjourney, etc.) and the final Claude Code prompt for a short animated video about them. Use whenever someone wants an animated intro, show opener, ad, promo, explainer, product demo, announcement, social clip, TikTok, Reel, Short, or sign-off animation for any company or person, and needs character art, a mascot, a stylized logo, or the prompt that makes the video. Also use when they want to adapt an animation they already made to a new brand, topic, length, or format, or say anything like "write the animation prompt," "make a cartoon of our founder," "prompt Claude Code to animate this," or "do this for another client," even if they don't mention prompts. Not for rendering the animation itself, UI motion, or charts.
---

# Brand Animation Prompts

You produce the **prompts**, not the video. The user runs the image prompts in an image generator, pastes the resulting images into Claude Code as attachments, then runs your video prompt there. Every output must survive that hand-off with no extra explanation.

## The deliverable

Reply with these parts, in this order:

1. **Brand brief:** 5–8 lines. What they do, audience, tone, colors with hex codes, visual world, chosen style and one sentence on why. Put sources and any unconfirmed items directly under it.
2. **Images to make:** a one-line list of each image and what it's for, then one code block per image prompt. Include only images the video actually needs.
3. **Paste order:** the order to attach images in Claude Code, so `[Image #N]` references line up.
4. **Video prompt:** one code block, ready to paste into Claude Code.
5. **Before posting:** 3–5 checks specific to this video.

No other sections. Keep prose between blocks to a sentence or two.

## Step 1: Get the inputs

You need: brand, task type, platform/format, length, the message, and any content (script, facts, offer). Pull everything you can from the conversation. If brand or task is missing, ask one question. Otherwise, pick sensible defaults, state them in one line, and proceed.

Defaults when unstated: intro 10–15s; ad 15–30s; explainer 30–60s; TikTok/Reels/Shorts → 9:16 at 1080x1920; YouTube/website → 16:9 at 1920x1080.

## Step 2: Research the brand

Search the web. Build the brief from what you find, not from the brand's name alone. If the business has little online presence, build the brief from what the user tells you, and ask for their logo and colors rather than guessing.

- **Colors:** Look for official brand guidelines or a press kit first. If none exist, sample from the logo and say so. Mark guessed colors as guesses. Every image and video prompt uses these hex codes.
- **Tone:** Take it from the brand's real content (their site, posts, video titles), not the category. A funeral home and a candy shop both get "warm," but they mean different things.
- **Visual world:** List 5–10 props, settings, and symbols that instantly read as this brand's world.
- **Claims:** If the video states facts, statistics, prices, or offers, verify each against a source and flag anything unconfirmed. Keep time-sensitive claims ("new," "this week") out unless they're current.
- **Watch-outs:** Third-party trademarks, competitors, regulated topics (health, finance, legal, kids), and anything the brand clearly avoids.

## Step 3: Choose the style and cast

**Style follows tone.** Don't default to cute. Match the look to how the brand actually feels, then state the fit in one sentence. See `references/styles.md` for the style menu and tone mapping.

**Cast:** Decide who carries the video.
- A real person (founder, host, creator) → cartoon version, from their photo
- A mascot or the product itself as a character
- No character: objects, type, and motion only, when a character would feel off-brand

Add a supporting character only if the story needs one (villain, customer, sidekick).

## Step 4: Write the image prompts

Use the templates in `references/templates.md`. Required every time:
- **The first image anchors the style.** Every later image prompt attaches it and says "same style and palette."
- Exact hex codes in every prompt.
- Characters built as **separate cutout parts** (head, torso, limbs) so they can be animated.
- Plain background, full body, neutral pose, nothing else in frame.
- A logo prop is optional and only for inside the scene. Tell the user to check its lettering against the original.

## Step 5: Write the video prompt

Use the video template in `references/templates.md` and task guidance in `references/task-types.md`. The template's required slots exist because each one fixed a real failure; fill all of them:

- **Goal, not shot list.** Describe what the video must *feel like* and *make the viewer understand*, then give creative freedom over story, pacing, camera, and transitions. For explainers, give a story spine (the order of ideas), never a timed beat sheet.
- **Reference images are references.** Say that character images show the look, not frames to copy, and that style references show rendering, not composition.
- **Attached images by number.** List each `[Image #N]` in paste order with its role. Don't reference files on disk.
- **Motion.** A moving camera, moving background, and transitions built from the brand's own props.
- **Format rules.** For vertical video, add the safe zone and the two-second hook.
- **Audio from the web.** No synthesized audio. Only commercially licensed sources (such as CC0 or the Pixabay license), logged in `audio_sources.txt` with URLs and licenses.
- **Logo rule.** Official logo used exactly as-is for the sign-off. If the brand has no logo, sign off on the brand name in clean type in the brand colors. Stop if any attached image is missing; never substitute.
- **Third-party IP.** Other brands' names as plain text only, never their logos; no real URLs.

If the user's Claude Code has an animation skill (for example `hand-drawn-canvas-animation`), name it in the style line as the base.

## Revisions

When the user reports a problem with a render ("doesn't feel like an intro," "too chaotic," "wrong vibe"), change only the lines that cause it and deliver just those lines, unless they ask for the full prompt. Common fixes are in `references/task-types.md` under "Render problems."
