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

## Navy-tee recast of the Video 1 stills (Oct 8, 2026), 12 credits
Client flagged the heather-grey sweatshirt as "so textured" (it shimmers in video). Wardrobe rule now in UGC_PLAYBOOK.md.
Kitchen: edit of dana_v2_1, "Same woman, same kitchen, same pose, same light. Change only her top: a plain solid soft-navy
cotton crewneck t-shirt, smooth matte fabric with no texture, no heather, no pattern, relaxed fit. Keep the same hoops,
glasses on her head and the same plain black clip-on mic on the collar." Sofa / door: from dana_navy_kitchen_1.

| File | Job | Notes |
|---|---|---|
| dana_navy_kitchen_1.png | 068c5a22-ac9b-47f3-89de-c339c1d161ee | PICK. Clean smooth tee, same woman, same framing. |
| dana_navy_kitchen_2.png | 94dcc43a-36e5-4b17-a911-4be8a4b05b45 | Also clean; looser fit. |
| dana_navy_sofa_1.png | 5e8b9bc8-b2c0-4956-9653-acf68d686b3e | PICK. Arm's-length selfie POV, lamp, no phone in frame. |
| dana_navy_sofa_2.png | 82398c89-ac65-400a-8c21-0b7cd67d5b9f | REJECT: third-person view, phone in frame. |
| dana_navy_door_1.png | 636a681b-0ea0-47af-ace1-567b2e3a22ed | REJECT: third-person, she holds a phone in frame. |
| dana_navy_door_2.png | a20cea9f-4011-4bb7-ae1f-7b509da18772 | REJECT: a phone sticks into the top-left corner. |
Lesson: "holding her phone for a selfie" puts a phone in shot. Say "the image is what her phone's front camera sees".
Contact sheet: dana_navy_contact.jpg.

Door redo (4 credits), prompt: "Same woman at her front door, about to head out. The image is what her phone's front
camera sees, at arm's length; no phone visible. A smooth olive utility jacket, open, over the same plain navy t-shirt,
keys in her other hand, same hoops, glasses on her head, same black clip-on mic on the t-shirt collar. Soft daylight from
the door's window. Relaxed, mid-shrug."

| File | Job | Notes |
|---|---|---|
| dana_navy_door_3.png | 7c49ca0f-b497-46aa-89f3-84e2b7ffb23a | REJECT (client): reads as already outside the house. |
| dana_navy_door_4.png | b51674d7-8df4-4688-8d33-aae8483d5915 | Not used: client went back to the grey-sweater door (dana_vid1_door_2). Blown window behind her, posed keys. |
**Video 1 stills (navy): kitchen dana_navy_kitchen_1, sofa dana_navy_sofa_1, door dana_vid1_door_2 (grey sweater under the jacket; existing draft footage/gen/vid1_door_draft1.mp4 reused).**

## Video 4 "The pump" still (Oct 8, 2026), 2 credits
From dana_navy_kitchen_1 (068c5a22). Prompt: "Same woman, daytime at a gas station, filling up her car, the nozzle in the
tank, holding her phone at arm's length for a selfie. The image is what her phone's front camera sees; no other phone
visible. A plain smooth rust long-sleeve cotton t-shirt, same hoops, glasses on her head, same black clip-on mic on the
collar. No logos or brand names anywhere: plain pump, plain canopy. Soft overcast light. Relaxed, half smile."

| File | Job | Notes |
|---|---|---|
| dana_vid4_pump_1.png | 887e14be-0fc9-4ca9-825e-38df78ab2e15 | PICK. Selfie POV, nozzle in the tank, plain pump, no brand (only illegible fuel-door label text). Blown 4% = overcast sky, face clean. Tee smooth. |
