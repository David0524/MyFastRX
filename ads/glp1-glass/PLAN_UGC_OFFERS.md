# Plan: three UGC videos (v4, Oct 2026). Nothing is generated until this is approved.

Rules, in order: UGC_PLAYBOOK.md section 0 (house rules), CLIENT_BRIEF_GLP1_2026-10.md + HANDOFF decisions, the rest of
UGC_PLAYBOOK.md. One hook per video. She is a presenter or a curious shopper, never a patient.

## House rules applied
- Relaxed and conversational: written as she'd say it, with "okay so", "honestly", "yeah", trailing pauses.
- Hook shot ~1.5 s, every shot after holds 2 s or more. About 7-9 shots per video, not 15.
- Dana is on screen for most of each video; B-roll covers a line, then straight back to her.
- Proof on location: the real MyFastRx pages on her phone and laptop (real captures, no patient data), her real kitchen,
  car, sofa. She films herself; small black clip-on mic on her collar in every A-roll shot.
- She introduces MyFastRx herself: turns her phone to the lens, points at the page.
- B-roll is what she'd film: her hands, her screen, her house, a parcel on a doorstep. No stickers, no meme zooms, no
  studio packshots.
- One animation style (navy line art on off-white, the brand's teal as the single accent) for anything that can't be
  filmed: the provider review and the pharmacy. Same style in all three videos.
- Every line has one literal visual. KISS.
- Never her own order or medication: the delivery shot is a parcel on a doorstep, no hands, no "mine".

## Dana (host)
46, Latina (or race-neutral), naturally pretty, shoulder-length dark brown wavy hair, fit and toned (not skinny, not heavy), small gold hoops,
reading glasses on her head, black clip-on mic. Office manager, two teens, practical, dry humour, hates fine print.
Phone propped on the fridge, car dash or coffee table. Wardrobe changes per location; hoops, glasses, mic constant.
Voice: her first approved take, then a locked prompt (only the words change).

## The three videos
Scripts and shots live in STORYBOARD_UGC.md (v2, rewritten Oct 7 after the client called v1 "forced and corporate"):
1. "The group chat" (approved): her friends keep talking about GLP1s, she assumed it was out of reach, looked it up.
   Tirzepatide twin swaps the price lines.
2. "Lunch break" (draft): she spends her lunch break in the car hunting for the catch in the FAQ.
3. "No office visit" (draft): from the sofa, surprised it's three steps and no office visit.
Script spelling: GLP1 and My Fast Rx in anything spoken or prompted (see STORYBOARD_UGC.md).

## Every video
- Captions word for word, native style (white, black outline), in the safe zone; no stickers or emoji pops.
- Sound: her voice, the room, small real sounds (car door, mug on the table). No music under her; optional soft licensed
  bed on the end card.
- End card: logo, "Check if I qualify", MyFastRx.com, the small approved vial (semaglutide videos only), BBB badge, the
  brief's intro-offer disclaimer + "Prescription required. Subject to provider approval."
- Deliver 9:16 MP4 + editable source; 4:5 on request, re-laid out.

## Pipeline (playbook section 8)
1. **Reference frame:** 3-5 candidate stills from real creator videos (Facebook / Instagram for this age group): a woman
   in her 40s, kitchen or sofa, muted even light (no blown-out highlights), background with some depth, hands visible,
   phone at eye level and not too close. I screen them against the guide's criteria.
2. **Dana avatar:** one Nano Banana Pro edit per candidate (new person per the casting rules, twist-out, gold hoops,
   glasses on head, black clip-on mic, a plant behind), regenerated until right. Then the location variants (car, sofa)
   from the approved Dana image, outfit changed in the same single edit.
3. **Model A/B:** one line ("My group chat will NOT stop talking about GLP1s. And I just figured it was, like... crazy expensive.") on Gemini
   Omni Flash 1.1 vs Seedance 2.5, same image and same three-part prompt. Pick the winner; lock the prompt.
4. **The rest of the script:** swap only the dialogue; capitalise stress words; pad lines to the model's lengths.

## Production (re-priced before every spend)
| Step | Credits |
|---|---|
| Casting Dana with the clip-on mic, 4 options | 8 |
| Location stills (kitchen, car, sofa; outfit per location) | ~12 |
| Her A-roll: ~45 s of dialogue in ~10 s clips (Seedance 2.5 draft) | ~140 |
| Tirz twin price line | ~15 |
| B-roll she films (thumb scrolling, laptop in car, over-the-shoulder phone, doorstep parcel) ~5 x 5 s | ~75 |
| Provider-review animation: coded in house style | 0 |
| Retakes (about one in four) | ~60 |
| **Total** | **~310** of ~824 |
Real site captures and the animation are made in code (free, exact wording).

## Open items
1. Doorstep parcel is AI packaging: still to the client for approval first (or a photo they supply).
2. Tirzepatide vial: none yet; the twin's end card runs without one.
3. Confirm the intake length ("a few minutes") and that the ad accounts are cleared for prescription weight-loss ads.
4. Biomedical (mechanism) animation is out until the client gives approved wording.
