#!/usr/bin/env python3
"""UGC car rant: the edit. Builds the overlay PNGs (captions, hook text box, price qualification, end card) and
composes the final 1080x1920 cut with ffmpeg.
  python3 tools/car-rant-edit.py          -> out/ugc/car_rant/MyFastRx_CarRant_v1.mp4 (+ previews/car_rant/ review copy)
Picture: Seedance 2.5 drafts upscaled to 1080p (footage/gen/car_clip{A,B}_1080p.mp4), clip A to its cut, a jump cut,
clip B. Sound: the clips' own generated voice (the client preferred it to the ElevenLabs read), normalized to
-16 LUFS / -1.5 dBTP. Captions say what she says word for word (faster-whisper on each clip's audio); whenever "$69" is
on screen the qualification sits directly beneath it; the end card carries the approved disclaimer."""
import json, os, subprocess, textwrap
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
W, H = 1080, 1920
OUT = 'out/ugc/car_rant'; OV = f'{OUT}/overlays'; os.makedirs(OV, exist_ok=True)
F = lambda wt, px: ImageFont.truetype(f'assets/fonts/Geist-{wt}.ttf', px)
NAVY, SAND, WHITE = (0, 29, 69), (239, 230, 216), (255, 255, 255)
CUT_A = 10.85                 # clip A ends here (after "...the GLP-1 one."), clip B follows
LEN_B = 11.0
END = 2.5                     # end card
TOTAL = CUT_A + LEN_B + END

# captions: [text, t0, t1] in film time (clip B words + CUT_A); chunks follow the speech, each held until the next
CAPS = [
    ['Can we talk about', 0.00, 0.96], ["how everything's", 0.96, 1.90], ['a subscription now?', 1.90, 3.70],
    ['Like... everything.', 4.05, 5.70],
    ['So I went looking', 6.74, 7.82], ['for the catch', 7.82, 8.40], ['with MyFastRx,', 8.40, 9.80], ['the GLP-1.', 9.84, CUT_A],
    ['Read the whole page.', CUT_A + 0.00, CUT_A + 1.40], ['No subscription.', CUT_A + 1.48, CUT_A + 2.60],
    ['No membership fee.', CUT_A + 2.68, CUT_A + 4.05], ['Nothing auto-refills,', CUT_A + 4.14, CUT_A + 5.40],
    ["you just ask when", CUT_A + 5.44, CUT_A + 5.95], ["you're ready.", CUT_A + 5.95, CUT_A + 6.90],
    ['$69 to start.', CUT_A + 6.94, CUT_A + 9.30], ['I kind of love that!', CUT_A + 9.40, CUT_A + LEN_B],
]
QUAL = 'Introductory offer. Regular pricing varies by plan.'
HOOK = ['everything is a', 'subscription now'], 0.0, 4.0
CAP_Y = 1236                  # caption bottom (client: lower); the $69 qualification beneath it reaches ~1290
ZOOM = dict(t=7.82, k=1.0, cy=0.5)   # no punch-in: her hand sits right under her chin, so any zoom that hides it is an extreme close-up
CX = 510                      # visual centre (right-hand button rail)

def caption_png(text, path, qual=False):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = F('Bold', 64)
    w = d.textlength(text, font=f)
    d.text((CX - w / 2, CAP_Y - 64), text, font=f, fill=WHITE, stroke_width=7, stroke_fill=(0, 0, 0))
    if qual:   # the price qualification, directly beneath "$69", on a dark chip so it reads on any frame
        fq = F('Medium', 34); qw = d.textlength(QUAL, font=fq); y = CAP_Y + 26
        d.rounded_rectangle((CX - qw / 2 - 16, y - 8, CX + qw / 2 + 16, y + 46), 12, fill=(0, 0, 0, 170))
        d.text((CX - qw / 2, y), QUAL, font=fq, fill=WHITE)
    im.save(path)

def hook_png(path):   # the native text box: white rounded box, black text, upper third
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); f = F('SemiBold', 50)
    lines = HOOK[0]; lh = 66; ws = [d.textlength(s, font=f) for s in lines]; y0 = 330
    for i, (s, w) in enumerate(zip(lines, ws)):
        d.rounded_rectangle((CX - w / 2 - 22, y0 + i * lh - 10, CX + w / 2 + 22, y0 + i * lh + lh - 4), 14, fill=WHITE)
    for i, (s, w) in enumerate(zip(lines, ws)):
        d.text((CX - w / 2, y0 + i * lh), s, font=f, fill=(0, 0, 0))
    im.save(path)

def endcard_png(path):
    """Logo chip, "See if you qualify", MyFastRx.com, the client's vial (small; label pixel-exact: the source pixels with
    the prep-vial silhouette as alpha) beside the BBB A rating badge (larger, white surround keyed out), and the approved disclaimer
    below them in black text, no card (bottom at y 1236)."""
    im = Image.new('RGB', (W, H)); px_ = im.load()   # the brand off-white: #F7F7F7 -> #EEF3FA top to bottom
    for y in range(H):
        u = max(0, (y / H - .55) / .45); c = tuple(round(a + (b - a) * u) for a, b in zip((247, 247, 247), (238, 243, 250)))
        for x in range(W): px_[x, y] = c
    d = ImageDraw.Draw(im)
    logo = Image.open('images/logo_myfastrx_official.jpg').convert('RGB').crop((136, 141, 136 + 1278, 141 + 261))
    lh = 84; lw = round(lh * logo.width / logo.height); logo = logo.resize((lw, lh), Image.LANCZOS)
    cw, ch = lw + 72, lh + 44; x0, y0 = CX - cw // 2, 330
    d.rounded_rectangle((x0, y0, x0 + cw, y0 + ch), 38, fill=(247, 247, 247)); im.paste(logo, (x0 + 36, y0 + 22))
    for s_, px, wt, y in [('See if you qualify', 72, 'Bold', 530), ('MyFastRx.com', 46, 'SemiBold', 620)]:
        f = F(wt, px); w = d.textlength(s_, font=f); d.text((CX - w / 2, y), s_, font=f, fill=NAVY)
    # the vial, small (about a fifth of the frame height), standing on a soft contact shadow
    vw, vh = 460, 1018
    col = Image.frombytes('RGBA', (vw, vh), open('assets/vial/vial_color_full.rgba', 'rb').read())
    msk = Image.frombytes('RGBA', (vw, vh), open('assets/vial/vial_mask_full.rgba', 'rb').read()).split()[0]
    col.putalpha(msk); th = 190; tw = round(vw * th / vh); vial = col.resize((tw, th), Image.LANCZOS)
    # the BBB A rating badge, larger, without its white surround: the white connected to the image border is keyed out
    from PIL import ImageFilter
    bd = Image.open('images/badge_bbb_a_rating_horizontal.jpg').convert('RGB')
    import numpy as np
    arr = np.array(bd).astype(int); white = (arr.min(axis=2) > 228).astype(np.uint8) * 255
    fill = Image.fromarray(white, 'L'); ImageDraw.floodfill(fill, (0, 0), 128); ImageDraw.floodfill(fill, (bd.width - 1, bd.height - 1), 128)
    ImageDraw.floodfill(fill, (bd.width - 1, 0), 128); ImageDraw.floodfill(fill, (0, bd.height - 1), 128)
    alpha = Image.fromarray(np.where(np.array(fill) == 128, 0, 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.8))
    badge = bd.convert('RGBA'); badge.putalpha(alpha); badge = badge.crop(alpha.point(lambda v: 255 if v > 8 else 0).getbbox())
    bw = 420; bh = round(badge.height * bw / badge.width); badge = badge.resize((bw, bh), Image.LANCZOS)
    gap = 34; gx = CX - (tw + gap + bw) // 2; vb = 960
    vx = gx; bx, by = gx + tw + gap, vb - th // 2 - bh // 2
    sh = Image.new('L', (W, H), 0); ImageDraw.Draw(sh).ellipse((vx - 8, vb - 8, vx + tw + 8, vb + 10), fill=70)
    im.paste((150, 165, 185), (0, 0), sh.filter(ImageFilter.GaussianBlur(8)))
    im.paste(vial, (vx, vb - th), vial)
    im.paste(badge, (bx, by), badge)
    # the approved disclaimer, verbatim: black text, no card, below the vial and badge (bottom at y 1236)
    disc = ('Compounded medication. Not FDA-approved. Results may vary. Not all patients qualify. Prescription issued only '
            'if medically appropriate following provider review. MyFastRx does not manufacture medications; product '
            'appearance and labeling may vary. Actor portrayal.')
    f = F('Medium', 22); words = disc.split(); lines = []; cur = ''
    for wd in words:
        t = (cur + ' ' + wd).strip()
        if d.textlength(t, font=f) <= 820: cur = t
        else: lines.append(cur); cur = wd
    lines.append(cur); lh2 = 29; top = 1236 - len(lines) * lh2
    for i, s_ in enumerate(lines):
        w = d.textlength(s_, font=f); d.text((CX - w / 2, top + i * lh2), s_, font=f, fill=(17, 17, 17))
    im.save(path)
    return top

# ---- overlays
inputs, chain = [], []
for i, (t, a, b) in enumerate(CAPS):
    p = f'{OV}/cap_{i:02d}.png'; caption_png(t, p, qual=t.startswith('$69')); inputs.append((p, a, b))
hook_png(f'{OV}/hook.png'); inputs.append((f'{OV}/hook.png', HOOK[1], HOOK[2]))
endcard_png(f'{OV}/endcard.png')

# ---- compose
A, B = 'footage/gen/car_clipA_1080p.mp4', 'footage/gen/car_clipB_1080p.mp4'
A_aud, B_aud = 'footage/gen/car_clipA_draft1.mp4', 'footage/gen/car_clipB_draft1.mp4'   # the drafts carry the voice
args = ['ffmpeg', '-v', 'error', '-y', '-i', A, '-i', B, '-i', A_aud, '-i', B_aud, '-loop', '1', '-t', str(END), '-i', f'{OV}/endcard.png']
for p, _, _ in inputs: args += ['-i', p]
Z = ZOOM; zw, zh = f'iw/{Z["k"]}', f'ih/{Z["k"]}'
fc = [f'[0:v]split[a0][a1]',
      f'[a0]trim=0:{Z["t"]},setpts=PTS-STARTPTS,scale={W}:{H},fps=30,setsar=1[va0]',
      f'[a1]trim={Z["t"]}:{CUT_A},setpts=PTS-STARTPTS,crop={zw}:{zh}:(iw-{zw})/2:ih*{Z["cy"]}-{zh}/2,scale={W}:{H}:flags=lanczos,fps=30,setsar=1[va1]',
      '[va0][va1]concat=n=2:v=1:a=0[va]',
      f'[1:v]trim=0:{LEN_B},setpts=PTS-STARTPTS,scale={W}:{H},fps=30,setsar=1[vb]',
      f'[4:v]scale={W}:{H},fps=30,format=yuv420p,setsar=1[ve]',
      '[va][vb][ve]concat=n=3:v=1:a=0[v0]']
last = 'v0'
for k, (p, a, b) in enumerate(inputs):
    fc.append(f"[{last}][{5 + k}:v]overlay=0:0:enable='between(t,{a:.2f},{b - 0.001:.3f})'[v{k + 1}]"); last = f'v{k + 1}'
fc += [f'[2:a]atrim=0:{CUT_A},asetpts=PTS-STARTPTS,afade=t=out:st={CUT_A - 0.03}:d=0.03[aa]',
       f'[3:a]atrim=0:{LEN_B},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={LEN_B - 0.3}:d=0.3[ab]',
       f'anullsrc=r=48000:cl=stereo,atrim=0:{END}[ae]',
       '[aa]aformat=sample_rates=48000:channel_layouts=stereo[aa2];[ab]aformat=sample_rates=48000:channel_layouts=stereo[ab2]',
       '[aa2][ab2][ae]concat=n=3:v=0:a=1,highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=11,volume=-0.8dB,alimiter=limit=0.83:level=false[aout]']
args += ['-filter_complex', ';'.join(fc), '-map', f'[{last}]', '-map', '[aout]', '-r', '30', '-c:v', 'libx264', '-profile:v', 'high',
         '-pix_fmt', 'yuv420p', '-b:v', '12M', '-maxrate', '12.5M', '-bufsize', '25M', '-c:a', 'aac', '-ar', '48000', '-b:a', '256k',
         '-movflags', '+faststart', f'{OUT}/MyFastRx_CarRant_v1.mp4']
subprocess.run(args, check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{OUT}/MyFastRx_CarRant_v1.mp4', '-vf', 'scale=720:1280:flags=lanczos', '-c:v', 'libx264',
                '-crf', '24', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
                'previews/car_rant/MyFastRx_CarRant_v1_review.mp4'], check=True)
print(json.dumps({'total_s': TOTAL, 'captions': len(CAPS), 'out': f'{OUT}/MyFastRx_CarRant_v1.mp4'}))
