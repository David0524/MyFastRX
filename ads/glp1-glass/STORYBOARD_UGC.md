# Storyboards: three UGC videos (Oct 2026, v2: rewritten as real talk, one location move per video)
Three separate posts, same host. Each re-hooks with a change of place where the story turns (UGC_PLAYBOOK.md section 4).

Format: the line she says | the shots for it (tick when generated / approved). **AI UGC** = Dana on camera talking (A-roll),
**B-roll** = what she films around the line, **Screen** = real MyFastRx page captured in code, **Anim** = house-style
animation. Rules: UGC_PLAYBOOK.md section 0 + the client brief. Hook shot ~1.5 s; every shot after holds 2 s or more.
Dana: 46, Latina, shoulder-length dark brown waves, fit, gold hoops, glasses on her head, black clip-on mic
(`footage/ref/dana_v2_1.png`). Never a patient: she is a friend who looked into it, not someone on it.

**Script spelling (for pronunciation):** spoken lines, video-model prompts and voice prompts always write **GLP1** (no
space, no hyphen) and **My Fast Rx**. Captions and on-screen text use the written forms GLP-1 and MyFastRx. She says
"GLP1", never "semaglutide"; the on-screen price line keeps the promo's product name (Compounded Semaglutide $69).

**Voice rules (client, Oct 7):** one thought per breath, a reason she's talking, a reaction beat. Compliance details
live on screen and on the end card, not in her mouth. No feature lists.

## Locked video prompt (every AI UGC clip, all three videos)
**Model locked (client, Oct 8): Seedance 2.5 `omni_reference`**, 480p draft, start image = the location still, then
ByteDance upscale (car-rant recipe). Won the A/B against Gemini Omni Flash 1.1 (footage/gen/README.md).
The camera never moves in any shot: no zoom, no push-in, no pan, no drift, no reframing (car-rant clip A drifted and
had to be stabilized; we prevent it at the source). Only the scene line and the dialogue change between clips.

```
Static, locked-off shot. The camera does not move, zoom, pan or reframe at any point.
UGC iPhone footage, front camera.
[Scene line, per location:]
  kitchen: She stands at her kitchen counter, phone propped in front of her.
  sofa:    Evening, she sits on her sofa holding the phone at arm's length; the frame stays perfectly steady.
  door:    She stands at her front door in her jacket, keys in hand, holding the phone; the frame stays perfectly steady.
Body mostly still, mouth moves naturally, eye contact with the camera. Relaxed, warm, conversational, not salesy.

Dialogue: "[exact line, GLP1 / My Fast Rx spelling, stress word in CAPS]"

Rules:
- The camera stays completely still for the whole clip. No zoom in or out.
- One continuous take, no jump cuts.
- [corrections stacked while iterating]
```

## Video 1: "The group chat" (approved Oct 7, trimmed Oct 8) ~18-20 s + end card (client: slightly long is OK)
Locations: **kitchen** (afternoon) → **sofa** (that evening) → **front door** (heading out). Outfit: grey sweatshirt; a jacket goes on for the door.

| She says | Shots |
|---|---|
| "My group chat will NOT stop talking about GLP1s." | ☑ **AI UGC** kitchen (A/B Seedance draft covers lines 1-2: `footage/gen/ab_seedance25_draft480p.mp4`), mid-task (wiping the counter), glances up at the camera (hook, 1.5 s) |
| "And I just figured it was, like... crazy expensive." | ☐ **B-roll** her phone in her hand: group chat ("ok has anyone looked into the GLP-1 thing" / "isn't it like a fortune"), coded mock-up<br>☐ **AI UGC** back to her, small eye-roll |
| "So I looked. This is My Fast Rx..." | ☐ **AI UGC** MOVE → sofa that evening, lamp on, arm's-length selfie (`dana_vid1_sofa_4`)<br>☐ **Screen** cut straight to the real offer page |
| "...compounded GLP1, sixty-nine for the first month." | ☐ on-screen: Compounded Semaglutide · $69 first month · Introductory offer |
| "Like... sixty-nine." | ☐ **AI UGC** beat of disbelief, small laugh |
| (cut from her lines, Oct 8) | ☐ **B-roll** her thumb scrolling "what's included", on-screen: Provider review · Medication if prescribed · Shipping |
| "No subscription either." | ☐ **AI UGC** MOVE → front door, jacket on, keys in hand, shrug |
| "Anyway. Link's there." | ☐ **AI UGC** already reaching for the door handle<br>☐ caption: Check if you qualify ↓ |
| — | ☐ **End card** logo, Check if I qualify, MyFastRx.com, small vial, BBB badge, disclaimer + Rx line |

Tirzepatide twin: only the price lines change ("...compounded GLP1, one twenty-nine for the first month." / "Like... one
twenty-nine.") ☐ on-screen: Compounded Tirzepatide · $129 first month · Introductory offer ☐ end card without a vial.
To check with the client: the group-chat mock-up (neutral text, no results, no other brands).

## Video 2: "Lunch break" (trust; approved Oct 7) ~19 s + end card
Locations: **parked car** (lunch break) → **walking back into the office**. Outfit: work blouse + blazer.

| She says | Shots |
|---|---|
| "Okay, I spent my ENTIRE lunch break trying to find the catch." | ☐ **AI UGC** parked car, phone on the dash, sandwich on the seat (hook, 1.5 s) |
| "'Cause sixty-nine dollars? For a GLP1? Come on." | ☐ **AI UGC** same, eyebrow up |
| "So I'm reading the FAQ like it's a lease agreement." | ☐ **B-roll** glasses come down; her phone, scrolling the FAQ, squinting (2-3 holds of 2 s) |
| "No membership. No subscription. No auto-refills." | ☐ **Screen** the real FAQ lines, her finger under each |
| "A licensed provider actually reviews it first..." | ☐ **Anim** a provider reviewing an intake form (house style) |
| "...and it's filled by U.S. pharmacies." | ☐ **AI UGC** nodding slowly, unconvinced-to-convinced |
| "So... yeah. Didn't find one." | ☐ **AI UGC** MOVE → walking back into the office building, phone held up, glasses on her head, small laugh |
| "It's sixty-nine for the first month if you qualify. Link's there." | ☐ **AI UGC** at the office door, to camera<br>☐ on-screen: Compounded Semaglutide · $69 first month · Introductory offer |
| — | ☐ **End card** |

## Video 3: "No office visit" (process; approved Oct 7) ~18 s + end card
Locations: **neighbourhood walk** → **home on the sofa**. Outfit: zip-up athleisure jacket, then the same with tea.

| She says | Shots |
|---|---|
| "Okay, so you don't actually go into an office for this. I did NOT know that." | ☐ **AI UGC** walking in her neighbourhood, phone held up, daylight (hook, 1.5 s) |
| "It's three steps. Like, three." | ☐ **AI UGC** MOVE → home on the sofa, mug, phone propped on the coffee table; holds up three fingers, laughs |
| "You fill out a form online... takes a few minutes, apparently." | ☐ **B-roll** over her shoulder, her phone on the real intake start screen (nothing filled in)<br>☐ **Screen** the screen itself, full frame |
| "A licensed provider looks it over." | ☐ **Anim** provider reviewing (same as video 2) |
| "And if they prescribe it, it just ships to your house." | ☐ **B-roll** plain parcel on a doorstep, no one in shot |
| "That's it. From the couch." | ☐ **AI UGC** sips her tea, shrugs |
| "GLP1 for sixty-nine the first month, if you qualify. Link's right there." | ☐ **AI UGC** to camera<br>☐ on-screen: Compounded Semaglutide · $69 first month · Introductory offer |
| — | ☐ **End card** |
"Takes a few minutes": confirm with the client (the NAD+ page says 3 minutes; the GLP-1 intake length is not stated).

## Shared assets (made once)
☑ Dana casting (`footage/ref/dana_v2_1.png`, kitchen)
Location stills (2 options each, ~2 cr per image): ☑ V1 sofa evening (`dana_vid1_sofa_4`) ☑ V1 front door (`dana_vid1_door_2`) ☐ V2 car ☐ V2 office walk
☐ V3 neighbourhood walk ☐ V3 sofa (different outfit from V1). Walking shots: keep to ~2 s holds; if one will not animate
cleanly, swap for a static shot.
☐ group-chat mock-up (coded) ☐ doorstep parcel still (client approval) ☐ real page captures: offer page, FAQ, intake start
☐ provider-review animation (house style) ☐ end card ×2 (with / without vial)
☐ client confirms "takes a few minutes" for the GLP-1 intake
