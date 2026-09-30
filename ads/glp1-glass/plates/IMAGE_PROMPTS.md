# Image prompts: photo plates for Version A v4 ("Everything on the table")

The photos carry the realism. Only the glass pieces (pill, heartbeat, button, toggle, slider, checks) and the twine stay 3D,
lit to match these plates. Please generate each image below and drop the files in `ads/glp1-glass/plates/` with the
file names given.

## Rules for every image

1. **Straight top-down (overhead, orthographic look).** No perspective and no tilted camera. Objects lie flat on the
   table. The one exception is the background plate (#2).
2. **One light for everything:** soft daylight from the **upper left** of the frame, like a large window. Gentle and
   bright, not hard studio light. Same light direction in every image, so the pieces sit together.
3. **Objects (#3 to #9) on a transparent background, with no drop shadow.** I add the contact shadows in 3D so they
   match the scene. If your tool can't do transparency, use plain flat #FFFFFF and I'll cut them out.
4. **No text unless the prompt asks for it.** No logos, brands or watermarks. I print all the ad copy myself, so it's
   exact.
5. **Largest size your tool allows.** Upscale to at least the size listed if you can (Magnific, Topaz, etc.).
6. **Photographic, not CGI:** real materials, fine natural imperfections, true-to-life colour, slight lens softness
   at the edges. Nothing glossy-plastic or "3D render".

Suffix to add to every object prompt:
> *overhead flat-lay product photograph, shot straight down, soft natural window light from the upper left, true-to-life
> color, fine real-world surface detail and subtle imperfections, photographed with a medium-format camera, 100mm lens,
> f/8, isolated on a transparent background, no drop shadow, no text, no logo, not a 3D render*

---

## 1. `table_top.jpg`: the tabletop (the most important plate)
**Size:** 6000 × 6000 px or larger. It must be **seamless / tileable** on all four edges.
> Seamless tileable overhead photograph of a real solid light oak dining table top, pale natural white-oiled oak with a
> soft matte-satin finish, straight grain with gentle cathedral figure and a few tiny natural pores and flecks, two
> or three long boards with fine tight seams, bright airy Scandinavian interior, very soft even daylight, no objects,
> no shadows, no reflections, no vignette, no perspective, ultra-detailed high-resolution wood texture photograph, true
> to life color, slightly cool neutral tone rather than yellow or orange

Check before sending: when tiled 2×2 there should be no visible seam or repeated "eye". The colour should be close to
warm white or pale beige, not honey.

## 2. `room_back.jpg`: what you see past the far edge in the low opening shot
**Size:** 4000 × 2250 px (landscape).
> Photograph of a bright, calm, modern interior seen past the edge of a table, extremely shallow depth of field so the
> room is a soft creamy blur, pale walls, a large window with soft daylight on the left, hints of pale blue and soft
> teal in the blur, no people, no recognizable objects or brands, premium airy wellness feel, 85mm lens at f/1.4,
> natural light, photographic, not a render

## 3. `vial_lying.png`: the vial (lying on its side, label facing up)
**Size:** 4000 px on the long side. Transparent background.
> A single clear glass pharmaceutical injection vial lying on its side, photographed straight from above, cap end
> pointing to the top of the frame, label facing the camera. Proportions of a standard 10 ml serum vial: squat
> cylindrical body, short neck. Authentic pharmaceutical closure: a grey butyl rubber stopper under a thin matte
> brushed-aluminum crimp seal with a small teal flip-off plastic cap, realistic and understated, not glossy or
> cosmetic. Clear glass with true thickness, faint natural reflections and refraction at the edges, a small amount of
> clear liquid inside. A white-and-teal pharmacy label wrapped naturally around the curved glass, the print following
> the curve, very slight edge lift and natural paper texture, printed in a clean sans-serif: "SEMAGLUTIDE" (large),
> a thin rule, "Compounded Medication", "Rx Only". No other text, no logo, no brand, no dosage, no barcode.
> Professional pharmaceutical product photography, bright, clean, premium, medical but warm (append the suffix)

Please check the spelling on the label exactly: **SEMAGLUTIDE / Compounded Medication / Rx Only**. If your tool keeps
misspelling it, generate the same vial with a **blank** white-and-teal label (`vial_lying_blank.png`) and I'll print the
words onto the curve myself.

Optional (for a possible hero moment): `vial_standing.png`, the same vial standing upright, shot straight down at a 30°
angle from the front, transparent background.

## 4. `notepad.png`: the notepad (the doctor's scrawl turns into the headline here)
**Size:** 3000 × 1500 px. Transparent background.
> A blank ruled paper notepad pad lying flat, landscape orientation, bright white paper with very faint pale blue
> rules and a faint pink margin line, a dark navy glued top binding edge, a few sheets visibly stacked at the edge,
> natural paper texture, no writing (append the suffix)

## 5. `price_tag.png`: the price tag (the twine gets pulled out of this)
**Size:** 2000 × 1750 px. Transparent background.
> A blank rectangular heavy cotton card price hang tag with softly rounded corners, bright warm-white card stock, a
> small silver metal eyelet reinforcing a punched hole near the top left corner, subtle fibrous paper texture, lying
> flat, completely blank (append the suffix)

## 6. `card_blank.png`: blank card stock (headline cards, checklist card, strips)
**Size:** 3000 × 2000 px. Transparent background.
> A single blank sheet of thick bright-white matte card stock with crisp slightly rounded corners, lying perfectly
> flat, subtle premium paper fibre texture, no marks (append the suffix)

(I cut this to each card's size, so one good sheet is enough.)

## 7. `rx_pad.png`: prescription pad
**Size:** 1600 × 1250 px. Transparent background.
> A small blank prescription pad lying flat, bright white paper with a few faint pale grey ruled lines, a subtle
> printed "℞" symbol in the top left corner in muted navy, a thin glued top edge, natural paper texture, no other text
> (append the suffix)

## 8. `member_card.png`: the membership card (gets knocked off the table)
**Size:** 2000 × 1260 px. Transparent background.
> A generic plastic membership card lying flat, standard credit-card proportions with rounded corners, muted slate
> navy with a subtle satin finish and soft light sheen, a small gold contact chip, no text, no numbers, no logo, no
> brand (append the suffix)

## 9. `ship_box.png`: the shipping box
**Size:** 2400 × 1700 px. Transparent background.
> A small closed kraft cardboard mailer box photographed straight from above, clean new corrugated kraft, a strip of
> pale brown paper packing tape across the middle, a small plain white shipping label with only faint grey placeholder
> lines (no readable text, no barcode, no logo), crisp edges, realistic cardboard texture (append the suffix)

---

## Not needed as images
- **End card:** stays flat, with the official logo and badge files used exactly as supplied.
- **Glass pieces:** stay 3D, so they can move and refract whatever lies under them.
- **Twine:** stays 3D, so it can be pulled out through the eyelet. If you'd like it to look more real, a close-up
  `twine.png` of a short length of natural cotton butcher's twine, lying straight, transparent background, gives me
  its texture.

## Brand guardrails (already built into the prompts)
- No MyFastRx logo on the vial, box or any object. The medication stays generic.
- SEMAGLUTIDE only. No tirzepatide, no other drug or brand names, no dosage.
- No people, no hands, no needles or syringes.
