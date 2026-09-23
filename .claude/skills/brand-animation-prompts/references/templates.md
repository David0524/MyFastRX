# Templates

Fill every `{{slot}}`. Delete optional lines that don't apply. Keep the wording otherwise; each line fixes a known failure.

## Image 1: Main character (the style anchor)

Tell the user to attach: a photo of the person (or a mascot/product reference) and the official logo.

```
Create a cartoon character for an animated video, based on the {{person / mascot / product}} in the first image. Use the logo only to match its exact colors.

STYLE: {{full style description from styles.md, e.g. flat bold shapes, halftone dot texture, slightly misregistered color layers, paper grain}}
PALETTE: only these colors: {{hex codes with names}}, plus {{neutral, e.g. black and warm cream}}. No other colors.

CHARACTER:
- Keep them recognizable: {{distinguishing features: hairstyle, face shape, signature clothing or accessory}}, simplified into bold shapes
- {{Proportions and personality matched to tone, e.g. "cute and chunky: oversized head, short limbs, dot eyes, confident smile" or "clean and poised: balanced proportions, calm expression"}}
- Wearing {{outfit}}, holding {{signature prop, if any}}
- Built like a paper-cutout puppet: head, torso, arms, and legs as clearly separate shapes, for jointed animation

OUTPUT: full body, three-quarters view, neutral standing pose, plain {{background color}} background, nothing else in the frame.
```

Follow-up to request: "Same character, same style, new pose: {{pose the video needs}}." Suggest one or two poses.

For a product-as-character, replace CHARACTER with the product's shape, key design details to keep, and simple face and limbs if appropriate.

## Supporting character

Tell the user to attach: the finished main character.

```
Create a new character in the exact same style and palette as the attached character.

CHARACTER: {{role}}. {{Shape, expression, outfit, prop}}. {{"Cute, not scary" or the tone equivalent}}.

Built like a paper-cutout puppet with clearly separate head, body, arms, and legs. About {{relative size}} the height of the attached character.

OUTPUT: full body, three-quarters view, neutral pose, plain {{background color}} background, nothing else in the frame.
```

## Logo prop (optional, in-scene only)

Tell the user to attach: the official logo.

```
Redraw the attached logo in this style: {{style}}. Keep the exact wording, letterforms, layout, and proportions. Use only its original colors, with {{texture}}. Transparent background. Do not add anything.
```

## Scene props (optional)

Only when a prop recurs, must look consistent, or is brand-specific (a signature product, storefront, vehicle). Attach the main character.

```
Create {{prop}} in the exact same style and palette as the attached character. {{Key details}}. Isolated on a plain {{background color}} background, nothing else in the frame.
```

## Video prompt (Claude Code)

```
Make a {{task type}} for {{brand}}, between {{length range}}. Choose the length the content actually needs; shorter is better if nothing is lost. This should be a one shot. Render {{aspect}} at {{resolution}} for {{platform}}. {{Tone adjectives from the brief}}.

STYLE: {{style description}}.{{ If available: "Use the {{look}} from the {{animation skill}} skill as the base."}} Palette: only {{hex codes}}, plus {{neutrals}}. Keep any accent color small, roughly 10% of the frame or less.

ATTACHED IMAGES:
- [Image #{{n}}]: {{main character}}. Character references for their look, not frames. Keep them consistent in every frame and animate them as a jointed paper-cutout puppet in whatever poses the scene needs.
- [Image #{{n}}]: {{supporting character}}. Same rules.
- [Image #{{n}}]: {{prop}}. Use wherever it fits.
- [Image #{{n}}]: in-scene logo prop. Use anywhere inside the scene.
- [Image #{{n}}]: official logo. Final sign-off only, held still for the last second.
{{If a separate style reference is attached: "- [Image #{{n}}]: style reference only. Match its rendering; do not copy its composition, framing, or scene."}}

WHO THIS IS FOR: {{what the brand does and who the audience is, two or three sentences}}. The visual world: {{props, settings, symbols}}. Use whatever serves the video.

WHAT IT NEEDS TO DO: {{goal paragraph from task-types.md}}

CREATIVE FREEDOM: You choose the story, visuals, pacing, and transitions. Keep the camera moving, use a scrolling or parallax background, and build transitions from the props themselves. Cut the action to the music. Surprise me.

BEFORE BUILDING: Check this brief against the attached images. Sample the official logo's actual colors. If they conflict with the palette above, or anything else in this brief contradicts the assets, stop and ask. Don't guess. Confirm every attached image is present before writing any code.

RHYTHM: Choose the tempo before drawing anything, and build every scene on that beat grid. Pick a tempo that fits the audience: {{e.g. "about 96 BPM, one idea per bar, for an older audience" or "faster and punchier for a young audience"}}. Every scene lasts a whole number of bars. Keep pacing even across the whole video; uneven pacing (one scene rushed, the next lingering) reads as wrong more than overall speed does. Anything that lands (stamps, cards, letters, a character popping in) starts moving about 0.14 s early so it arrives exactly on the beat. Place each sound effect by where its sound actually starts, not by the start of the file; trim leading silence. Repeated effects sit on the song's rhythm. Caption reading time sets the length: give each caption enough time to read comfortably.

LEGIBILITY: Stamps, labels, and text cards are fully opaque, never see-through. Nothing decorative (particles, confetti) crosses text or logos. Audit every color any shared helper or kit function draws, so nothing off-palette slips in.

{{If the video uses cutout puppets: "PUPPETS: When cutting character art into parts, a part that moves must not carry its neighbors' pixels; fill the area underneath with matching texture so no hole opens when it rotates. Anything the film animates procedurally (strings, lines, cords, liquids) should be erased from the art and drawn in code. Preview the cut parts in distinct tints and a few test poses before animating. Start entrances far enough off-screen for the character's scale."}}

{{Vertical only: "VERTICAL FORMAT: Lay out each scene for a tall frame; never crop a landscape layout. Stack action top to bottom and use vertical camera moves as well as horizontal ones. Hook the viewer in the first two seconds, with the key object on screen and legible from frame 0. Keep all text and key action clear of the top 15%, the bottom 25%, and the right 15%, where platform buttons and captions sit. That safe zone isn't centered on the frame, and content centered inside it looks off-center. Design inside the safe box, then scale the content down about the frame's center line so it's centered on the frame and still clear of the right edge zone. Backgrounds, full-frame flashes, and the logo stay full-frame. Content taller than the safe area scrolls inside a window that ends at the safe line."}}

ON-SCREEN TEXT: short, bold, a few words at a time, readable on a phone.{{ Explainers: " It must carry the explanation without narration."}}{{ Required lines: " Include: {{exact CTA, offer, or protection line}}."}}

AUDIO: Do not use synthesized audio. Search the web for real audio samples (music, hits, and sound effects) that fit the tone: {{audio direction, e.g. punchy and percussive}}. Use only sources whose license allows commercial use, such as CC0 or the Pixabay license. Save an audio_sources.txt listing each file, its source URL, and its license.{{ If voiceover will be added: " A voiceover will sit on top, so the music is a bed: arrange it differently, not just quieter. Take melodic lines out of the voice range (roughly 300–3500 Hz), and let drums and bass carry the hits. Deliver the mix at about -23 LUFS, with separate music and effects stems, plus a timed voiceover script that leaves the final logo hold clear."}}

VERIFY ON THE FINAL FILE: Measure, don't trust the plan. Check that big hits land within about 10 ms of their picture beats in the final video. Pixel-check that the final second is completely still. Compare the official logo's colors in the render against the file. For vertical, render a separate safe-zone overlay pass into its own folder, never into the final video. Before any refactor, save reference frames and diff them afterward so approved work doesn't change. When delivering, list what you verified and anything you couldn't check.

RULES:
- Use the official logo exactly as-is, drawn straight from the file and uniformly scaled, with no redrawing, recoloring, texture, or overlay effects, held completely still for at least the last second
- If any attached image is missing, stop and tell me. Do not create substitutes
{{- "{{Third-party names}} may appear as plain text only. Never draw or imitate their logos."}}
- Don't show real website addresses{{ unless: the brand's own URL, exactly: {{url}}}}; any fake URL should look obviously garbled
- No other brand logos or company names on screen
{{- Any brand-specific watch-outs from the brief}}
```
