# Reference frames for AI UGC hosts (UGC_PLAYBOOK.md section 8)

Structural references only (framing, light, phone texture). Every avatar made from one must be a clearly different
person, with nothing identifying kept (brands, captions, tattoos, decor).

| File | Source | Screening (Oct 7, 2026) |
|---|---|---|
| dana_ref_1_source.jpg | Supplied by the client contact (a creator's video frame) | Framing, hands and kitchen background good; highlights keep detail (0% of face pixels at full white) but glossy makeup and ring-light catchlights; compressed / softened; glam styling. Must remove: Humann SuperBeets bag, "COQ10" caption, wrist tattoo, held item. Usable; more candidates preferred. |

## Dana avatar edit, round 1 (Oct 7, 2026)
One-shot edit of `dana_ref_1_source.jpg` (Higgsfield media c9ce58e7-e2a9-4013-9ffb-66cff735cad4), nano_banana_pro
(job status reports nano_banana_2), 9:16 2k, 4 x 2 credits = 8. Prompt: "Turn this woman into a different woman: a Black
woman in her mid-40s with a rounder face, a broader nose, deep brown skin and shoulder-length dark brown hair in a soft
twist-out, average build. Everyday look: light makeup, matte skin, a heather-grey crewneck sweatshirt, small gold hoop
earrings, reading glasses pushed up on her head, a small black wireless mic clipped to her collar. Calm, warm half smile,
both hands resting on the counter. Remove the red bag, the caption and the tattoo. Add a small potted plant on the counter
behind her."

| File | Job | Notes |
|---|---|---|
| dana_v1_1.png | aca8c350-7036-41a0-b5c1-fe0750751171 | Mid-distance, both hands on counter, terracotta herb plant, cleanest light (0.19% blown). Mic has a small glyph. |
| dana_v1_2.png | 840a4264-37d8-43b5-b7ca-09dba026f25c | Original warm-wood kitchen, plant in front-right. Mic carries fake-brand text + blue LED: paint out if picked. |
| dana_v1_3.png | 017743b0-1c6c-44ba-be92-9362a2a5af43 | Window light, closer; forehead/nose shine (0.90% blown, the most). Mic has fake glyphs. |
| dana_v1_4.png | 7cf9c9cf-f5af-4cfc-8240-4e5942869ff2 | REJECT: the red bag from the source is still in frame (left edge). |
Contact sheet: dana_v1_contact.jpg.

## Dana avatar edit, round 2 (Oct 7, 2026): recast per client
Client rejected round 1: "Keep the woman hispanic or race neutral. Make her more attractive. Maybe a 7/10 age adjusted.
Not skinny but not heavy either." Same source and settings, 4 x 2 credits = 8. Prompt: "Turn this woman into a different
woman: a Latina woman in her mid-40s, naturally pretty in an everyday way (not a model), warm olive skin, soft brown eyes
and shoulder-length dark brown hair with loose soft waves. Fit, healthy, toned build, neither skinny nor heavy. Light
everyday makeup, matte skin. A fitted heather-grey crewneck sweatshirt, small gold hoop earrings, reading glasses pushed
up on her head, a small plain matte black clip-on mic with no logo or text on her collar. Calm, warm half smile, both
hands resting on the counter. Remove the red bag, the caption, the tattoo and anything she is holding. Add a small potted
plant on the counter behind her."

| File | Job | Notes |
|---|---|---|
| dana_v2_1.png | 9cb12ba2-f8b6-4dd6-9d10-8b368fb55e45 | Soft smile, most even light (0.15% blown). Mic clean. |
| dana_v2_2.png | e36d1dd7-d866-420b-addb-f9886e2464d9 | Big toothy smile, warmest. Mic has fake glyphs. Fine gold necklace. |
| dana_v2_3.png | 8086f2c7-0105-41d2-9031-59a850eea54f | Slimmest face, heavier eye makeup. Mic has fake glyphs. |
| dana_v2_4.png | 2f550ace-ad8c-4cb7-86e7-f26216f16a1d | Closest, hands clasped. Mic clean. |
All four: same modern kitchen, no bag, caption or tattoo left; mic reads a little large. Contact sheet: dana_v2_contact.jpg.

## Video 1 location stills (Oct 7, 2026)
Input: dana_v2_1 (job 9cb12ba2-f8b6-4dd6-9d10-8b368fb55e45) only. nano_banana_pro 9:16 2k, 4 x 2 credits = 8.
Sofa prompt: "Same woman, that evening, sitting on her living-room sofa with a warm lamp on beside her, holding her phone,
phone propped on the coffee table filming her. Same grey sweatshirt, same hoops, glasses on her head, same black clip-on
mic. Relaxed, half smile." Door prompt: "Same woman at her front door, about to head out, a light olive utility jacket on
over the grey sweatshirt, keys in hand, same hoops, glasses on her head, same black clip-on mic on the jacket collar. Soft
daylight from the door's window. Relaxed, mid-shrug."

| File | Job | Notes |
|---|---|---|
| dana_vid1_sofa_1.png | 2798f3e4-866d-4422-9bb8-2b35e4973850 | REJECT: third-person view, the filming phone is in frame (not her phone's POV); not holding a phone. |
| dana_vid1_sofa_2.png | 2c913d19-6daa-4f78-b6c4-2da6cfffbc74 | REJECT: same problem (phone on tripod in frame, showing her on its screen). |
| dana_vid1_door_1.png | a111eeb0-1d77-41f2-ab9c-2eac47913d4e | Good: mid-distance, shrug, keys, olive jacket, mic on collar. Same woman. |
| dana_vid1_door_2.png | 2f448f91-40f5-4c0a-b791-fb43ff7be2e8 | Good: closer, handheld-selfie feel, unimpressed shrug; more UGC. Same woman. |
Lesson: say the frame IS the phone's view ("seen from her phone propped on the coffee table"), never "phone filming her".
Contact sheet: dana_vid1_locations_contact.jpg.

Sofa redo (4 credits), prompt: "Same woman, that evening, sitting on her living-room sofa with a warm lamp on beside her,
holding her phone in one hand at chest height. The image is what her phone camera sees, propped on the coffee table in
front of her; no other phone or tripod in the picture. Same grey sweatshirt, same hoops, glasses on her head, same black
clip-on mic. Relaxed, half smile, looking at the camera."

| File | Job | Notes |
|---|---|---|
| dana_vid1_sofa_3.png | b995a184-7c2a-4d0b-af9e-e02c0516f384 | REJECT: tripod phone in frame again. |
| dana_vid1_sofa_4.png | 66715e2f-7f97-4363-b1bc-096759b35e92 | PICK: arm's-length selfie from the sofa, lamp, mug on the table. Same woman. Shot change: she holds the camera phone, so "This is My Fast Rx" cuts straight to the Screen shot instead of her turning a phone round. |
Picked for Video 1: kitchen dana_v2_1, sofa dana_vid1_sofa_4, door dana_vid1_door_2.
