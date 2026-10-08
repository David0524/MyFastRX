#!/usr/bin/env python3
"""UGC Video 1 "The group chat": the edit. Builds the overlays (group-chat mock-up, real offer-page screens, captions,
price line, CTA chip, end card) and composes the 1080x1920 cut with ffmpeg.
  python3 tools/vid1-edit.py   -> out/ugc/vid1_group_chat/MyFastRx_UGC1_GroupChat_v1.mp4 (+ previews/ugc/ review copy)
Picture: Seedance 2.5 takes (kitchen + sofa finalized natively at 1080p, door = 480p draft scaled), see footage/gen/README.md.
Kitchen: the model said "GLP1 S"; the stray "S" is cut (src 3.34 -> 4.05) and the cut sits under the group-chat B-roll.
Captions are word for word; whenever "$69" is on screen "Introductory offer" sits beneath it; the end card carries the
client's Oct 2026 disclaimer + Rx line."""
import json, os, subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
W, H = 1080, 1920
OUT = 'out/ugc/vid1_group_chat'; OV = f'{OUT}/overlays'; os.makedirs(OV, exist_ok=True); os.makedirs('previews/ugc', exist_ok=True)
F = lambda wt, px: ImageFont.truetype(f'assets/fonts/Geist-{wt}.ttf', px)
NAVY, WHITE = (0, 29, 69), (255, 255, 255)
CX = 510                      # visual centre (right-hand button rail)
CAP_Y = 1236                  # caption bottom, as on the car rant

KITCHEN, SOFA, DOOR = 'footage/gen/vid1_kitchen_1080p.mp4', 'footage/gen/vid1_sofa_1080p.mp4', 'footage/gen/vid1_door_draft1.mp4'
# film segments: (file, src_in, src_out)
SEGS = [(KITCHEN, 0.00, 3.34), (KITCHEN, 4.05, 8.00), (SOFA, 0.00, 7.90), (DOOR, 0.00, 4.90)]
END = 2.5
starts = []; t = 0.0
for f, a, b in SEGS: starts.append(t); t += b - a
TOTAL_A = t; TOTAL = t + END
K2, S0, D0 = starts[1] - SEGS[1][1], starts[2], starts[3]   # src -> film offsets (film = src + offset)

CHAT = (starts[1], starts[1] + 1.96)                    # group chat covers the "S" cut, >= 2 s with the hook before it
HERO = (S0 + 2.00, S0 + 4.00)                           # "compounded GLP1," over the real hero
CARD = (S0 + 4.00, S0 + 6.10)                           # "$69 for the first month." over the real price card
QUAL = 'Introductory offer'
CAPS = [
    ['My group chat', 0.00, 0.92], ['will NOT stop', 0.92, 1.82], ['talking about GLP-1.', 1.82, starts[1]],
    ['and I just figured', starts[1], K2 + 4.78], ['it was, like...', K2 + 4.78, K2 + 6.71],
    ['crazy expensive.', K2 + 6.71, S0],
    ['So I looked.', S0, S0 + 0.88], ['This is MyFastRx...', S0 + 0.88, S0 + 2.20], ['compounded GLP-1,', S0 + 2.20, CARD[0]],
    ['$69 for the first month.', CARD[0], CARD[1]], ['Like... $69.', CARD[1], D0],
    ['No subscription either.', D0, D0 + 2.73], ['Anyway.', D0 + 2.73, D0 + 3.30], ["Link's there.", D0 + 3.30, TOTAL_A],
]
PRICE = (HERO[0], CARD[1])    # the price line while the page is on screen
CTA = (D0 + 3.30, TOTAL_A)

def caption_png(text, path, qual=False):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im); f = F('Bold', 64)
    w = d.textlength(text, font=f)
    d.text((CX - w / 2, CAP_Y - 64), text, font=f, fill=WHITE, stroke_width=7, stroke_fill=(0, 0, 0))
    if qual:
        fq = F('Medium', 34); qw = d.textlength(QUAL, font=fq); y = CAP_Y + 26
        d.rounded_rectangle((CX - qw / 2 - 16, y - 8, CX + qw / 2 + 16, y + 46), 12, fill=(0, 0, 0, 170))
        d.text((CX - qw / 2, y), QUAL, font=fq, fill=WHITE)
    im.save(path)

def chip_png(lines, path, y0, fill=(255, 255, 255, 235), ink=NAVY):
    """Rounded chip with 1-2 lines, centred on CX (the price line, the CTA)."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    fs = [F('Bold', 44), F('Medium', 32)]; ws = [d.textlength(s, font=fs[i]) for i, s in enumerate(lines)]
    bw = max(ws) + 56; bh = 30 + sum([58, 44][i] for i in range(len(lines)))
    d.rounded_rectangle((CX - bw / 2, y0, CX + bw / 2, y0 + bh), 26, fill=fill)
    y = y0 + 16
    for i, s in enumerate(lines):
        d.text((CX - ws[i] / 2, y), s, font=fs[i], fill=ink); y += [58, 44][i]
    im.save(path)

def status_bar(d, dark=False):
    c = WHITE if dark else (17, 17, 17); f = F('SemiBold', 40)
    d.text((70, 48), '6:42', font=f, fill=c)
    for i in range(4): d.rounded_rectangle((850 + i * 18, 78 - i * 7, 862 + i * 18, 92), 3, fill=c)
    d.rounded_rectangle((940, 62, 1010, 94), 8, outline=c, width=3); d.rectangle((945, 67, 995, 89), fill=c)

def chat_png(n, path):
    """A generic messaging screen (no app branding), screen-recording look: n = number of messages shown."""
    im = Image.new('RGB', (W, H), (255, 255, 255)); d = ImageDraw.Draw(im); status_bar(d)
    d.line((0, 260, W, 260), fill=(225, 225, 230), width=2)
    for i, c in enumerate([(244, 164, 96), (120, 170, 220), (160, 200, 140)]):
        d.ellipse((430 + i * 52, 120, 510 + i * 52, 200), fill=c, outline=WHITE, width=5)
    f = F('SemiBold', 36); s = 'Sunday brunch crew'; d.text((W / 2 - d.textlength(s, font=f) / 2, 208), s, font=f, fill=(17, 17, 17))
    d.text((48, 140), '<', font=F('Medium', 64), fill=(0, 122, 255))
    msgs = [('Mel', 'ok has anyone looked into the GLP-1 thing'), ('Tanya', "isn't it like a fortune")]
    y = 430; fm = F('Medium', 46); fn = F('Medium', 30)
    for who, txt in msgs[:n]:
        words = txt.split(); lines = []; cur = ''
        for wd in words:
            tt = (cur + ' ' + wd).strip()
            if d.textlength(tt, font=fm) <= 640: cur = tt
            else: lines.append(cur); cur = wd
        lines.append(cur); bw = max(d.textlength(l, font=fm) for l in lines) + 60; bh = 40 + 60 * len(lines)
        d.text((80, y), who, font=fn, fill=(140, 140, 145)); y += 42
        d.rounded_rectangle((60, y, 60 + bw, y + bh), 44, fill=(233, 233, 235))
        for j, l in enumerate(lines): d.text((90, y + 22 + j * 60), l, font=fm, fill=(17, 17, 17))
        y += bh + 36
    d.rounded_rectangle((40, H - 190, W - 40, H - 100), 45, outline=(210, 210, 215), width=3)
    d.text((90, H - 168), 'Message', font=F('Medium', 40), fill=(170, 170, 175))
    im.save(path)

def screen_png(box, width, path, y0=330):
    """A real crop of the captured offer page, centred over a blurred, darkened copy of itself (screen-recording edit)."""
    pg = Image.open('footage/screens/offer_page_full.png').convert('RGB').crop(box)
    fg = pg.resize((width, round(pg.height * width / pg.width)), Image.LANCZOS)
    bg = pg.resize((W, round(pg.height * W / pg.width))).resize((W, H)).filter(ImageFilter.GaussianBlur(40))
    bg = Image.eval(bg, lambda v: int(v * 0.55))
    sh = Image.new('L', (W, H), 0); x0 = (W - fg.width) // 2
    ImageDraw.Draw(sh).rounded_rectangle((x0 - 6, y0 - 6, x0 + fg.width + 6, y0 + fg.height + 10), 34, fill=150)
    bg.paste((0, 0, 0), (0, 0), sh.filter(ImageFilter.GaussianBlur(18)))
    m = Image.new('L', fg.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, fg.width, fg.height), 28, fill=255)
    bg.paste(fg, (x0, y0), m); bg.save(path)

def endcard_png(path):
    im = Image.new('RGB', (W, H)); px_ = im.load()
    for y in range(H):
        u = max(0, (y / H - .55) / .45); c = tuple(round(a + (b - a) * u) for a, b in zip((247, 247, 247), (238, 243, 250)))
        for x in range(W): px_[x, y] = c
    d = ImageDraw.Draw(im)
    logo = Image.open('images/logo_myfastrx_official.jpg').convert('RGB').crop((136, 141, 136 + 1278, 141 + 261))
    lh = 84; lw = round(lh * logo.width / logo.height); logo = logo.resize((lw, lh), Image.LANCZOS)
    cw, ch = lw + 72, lh + 44; x0, y0 = CX - cw // 2, 330
    d.rounded_rectangle((x0, y0, x0 + cw, y0 + ch), 38, fill=(247, 247, 247)); im.paste(logo, (x0 + 36, y0 + 22))
    # CTA as a button (the brief's wording)
    f = F('Bold', 60); s_ = 'Check if I qualify'; w = d.textlength(s_, font=f)
    d.rounded_rectangle((CX - w / 2 - 50, 520, CX + w / 2 + 50, 640), 60, fill=(32, 99, 235))
    d.text((CX - w / 2, 543), s_, font=f, fill=WHITE)
    f = F('SemiBold', 46); s_ = 'MyFastRx.com'; w = d.textlength(s_, font=f); d.text((CX - w / 2, 680), s_, font=f, fill=NAVY)
    col = Image.open('images/vial_semaglutide_v2_cutout.png').convert('RGBA')
    th = 190; tw = round(col.width * th / col.height); vial = col.resize((tw, th), Image.LANCZOS)
    bd = Image.open('images/badge_bbb_a_rating_horizontal.jpg').convert('RGB')
    arr = np.array(bd).astype(int); white = (arr.min(axis=2) > 228).astype(np.uint8) * 255
    fill = Image.fromarray(white, 'L')
    for p in [(0, 0), (bd.width - 1, bd.height - 1), (bd.width - 1, 0), (0, bd.height - 1)]: ImageDraw.floodfill(fill, p, 128)
    alpha = Image.fromarray(np.where(np.array(fill) == 128, 0, 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.8))
    badge = bd.convert('RGBA'); badge.putalpha(alpha); badge = badge.crop(alpha.point(lambda v: 255 if v > 8 else 0).getbbox())
    bw = 420; bh = round(badge.height * bw / badge.width); badge = badge.resize((bw, bh), Image.LANCZOS)
    gap = 34; gx = CX - (tw + gap + bw) // 2; vb = 990
    vx = gx; bx, by = gx + tw + gap, vb - th // 2 - bh // 2
    sh = Image.new('L', (W, H), 0); ImageDraw.Draw(sh).ellipse((vx - 8, vb - 8, vx + tw + 8, vb + 10), fill=70)
    im.paste((150, 165, 185), (0, 0), sh.filter(ImageFilter.GaussianBlur(8)))
    im.paste(vial, (vx, vb - th), vial); im.paste(badge, (bx, by), badge)
    # the client's disclaimer (Oct 2026), verbatim, + the Rx line + AI portrayal note: black text, no card
    paras = ['Introductory pricing shown. Regular pricing applies to future orders. MyFastRx does not manufacture '
             'medications; product appearance and labeling may vary. Compounded medication. Not FDA-approved. '
             'Results may vary.', 'Prescription required. Subject to provider approval. AI-generated actor portrayal.']
    f = F('Medium', 23); lines = []
    for para in paras:
        cur = ''
        for wd in para.split():
            tt = (cur + ' ' + wd).strip()
            if d.textlength(tt, font=f) <= 830: cur = tt
            else: lines.append(cur); cur = wd
        lines.append(cur)
    lh2 = 31; top = 1250 - len(lines) * lh2
    for i, s_ in enumerate(lines):
        w = d.textlength(s_, font=f); d.text((CX - w / 2, top + i * lh2), s_, font=f, fill=(17, 17, 17))
    im.save(path)

# ---- overlays: (png, t0, t1)
ov = []
chat_png(1, f'{OV}/chat1.png'); chat_png(2, f'{OV}/chat2.png')
ov += [(f'{OV}/chat1.png', CHAT[0], CHAT[0] + 0.85), (f'{OV}/chat2.png', CHAT[0] + 0.85, CHAT[1])]
screen_png((0, 0, 1170, 1395), 780, f'{OV}/screen_hero.png', y0=220); screen_png((50, 2070, 580, 2410), 900, f'{OV}/screen_card.png')
ov += [(f'{OV}/screen_hero.png', *HERO), (f'{OV}/screen_card.png', *CARD)]
chip_png(['Compounded Semaglutide', '$69 first month · Introductory offer'], f'{OV}/price.png', 1500)
ov.append((f'{OV}/price.png', *PRICE))
for i, (tx, a, b) in enumerate(CAPS):
    p = f'{OV}/cap_{i:02d}.png'; caption_png(tx, p, qual='$69' in tx); ov.append((p, a, b))
chip_png(['Check if you qualify'], f'{OV}/cta.png', 1330, fill=(32, 99, 235, 240), ink=WHITE); ov.append((f'{OV}/cta.png', *CTA))
endcard_png(f'{OV}/endcard.png')

# ---- compose
args = ['ffmpeg', '-v', 'error', '-y']
files = [KITCHEN, SOFA, DOOR]
for f in files: args += ['-i', f]
args += ['-loop', '1', '-t', str(END), '-i', f'{OV}/endcard.png']
for p, _, _ in ov: args += ['-loop', '1', '-t', str(TOTAL), '-i', p]
fc, vl, al = [], [], []
for k, (f, a, b) in enumerate(SEGS):
    i = files.index(f)
    fc.append(f'[{i}:v]trim={a}:{b},setpts=PTS-STARTPTS,scale={W}:{H}:flags=lanczos,fps=30,setsar=1,format=yuv420p[v{k}]')
    fc.append(f'[{i}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,'
              f'afade=t=in:d=0.02,afade=t=out:st={b - a - 0.04:.3f}:d=0.04[a{k}]')
    vl.append(f'[v{k}]'); al.append(f'[a{k}]')
fc.append(f'[3:v]scale={W}:{H},fps=30,format=yuv420p,setsar=1[ve]')
fc.append(f'anullsrc=r=48000:cl=stereo,atrim=0:{END}[ae]')
fc.append(''.join(vl) + f'[ve]concat=n={len(SEGS) + 1}:v=1:a=0[b0]')
last = 'b0'
for k, (p, a, b) in enumerate(ov):
    fc.append(f"[{last}][{4 + k}:v]overlay=0:0:shortest=0:enable='between(t,{a:.3f},{b - 0.001:.3f})'[b{k + 1}]"); last = f'b{k + 1}'
fc.append(''.join(al) + f'[ae]concat=n={len(SEGS) + 1}:v=0:a=1,highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=11,'
          'alimiter=limit=0.84:level=false[aout]')
mp4 = f'{OUT}/MyFastRx_UGC1_GroupChat_v1.mp4'
args += ['-filter_complex', ';'.join(fc), '-map', f'[{last}]', '-map', '[aout]', '-t', f'{TOTAL:.3f}', '-r', '30',
         '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-b:v', '12M', '-maxrate', '12.5M', '-bufsize', '25M',
         '-c:a', 'aac', '-ar', '48000', '-b:a', '256k', '-movflags', '+faststart', mp4]
subprocess.run(args, check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', 'scale=720:1280:flags=lanczos', '-c:v', 'libx264', '-crf', '24',
                '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
                'previews/ugc/MyFastRx_UGC1_GroupChat_v1_review.mp4'], check=True)
print(json.dumps({'total_s': round(TOTAL, 2), 'segments': [round(s, 2) for s in starts], 'chat': CHAT, 'hero': HERO,
                  'card': CARD, 'captions': len(CAPS), 'out': mp4}))
