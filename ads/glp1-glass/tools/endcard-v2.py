#!/usr/bin/env python3
"""End card v2 (client, Oct 11: "completely redo the end card... same bottle and badge, much more aesthetically pleasing").
Animated, 2.5 s, 1080x1920 @ 30 fps, coded (no generations):
  - warm ivory -> soft blue gradient, a soft blue glow behind the vial, the logo's heartbeat line drawing across behind it
  - the same vial (images/vial_semaglutide_v2_cutout.png), floating slightly over a soft reflection and floor shadow
  - price block: Compounded Semaglutide / $69 first month / Introductory offer (beneath $69, compliance)
  - CTA button "Check if I qualify", MyFastRx.com, the same BBB badge (images/badge_bbb_a_rating_horizontal.jpg)
  - the client's disclaimer verbatim + Rx line + AI-portrayal note (on screen the whole time)
  - elements ease in one after another over the first second; the button gives one soft pulse
Content is centred on CX = 510 (kept clear of the TikTok/Reels right-hand buttons), important content above y = 1520.
  python3 tools/endcard-v2.py [--dur 2.5] -> footage/broll/endcard_v2.mp4 (+ footage/broll/endcard_v2_still.png)"""
import argparse, math, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser(); ap.add_argument('--dur', type=float, default=2.5); a = ap.parse_args()
W, H, FPS, CX = 1080, 1920, 30, 510
F = lambda wt, px: ImageFont.truetype(f'assets/fonts/Geist-{wt}.ttf', px)
NAVY, BLUE, INK2 = (0, 29, 69), (32, 99, 235), (84, 98, 120)

def layer(): return Image.new('RGBA', (W, H), (0, 0, 0, 0))

# ---- background: gradient + glow (static)
yy = np.linspace(0, 1, H)[:, None, None]
top, bot = np.array([251, 249, 245]), np.array([228, 238, 252])
bg = (top + (bot - top) * yy ** 1.3) * np.ones((1, W, 1))
bg = Image.fromarray(bg.astype(np.uint8), 'RGB').convert('RGBA')
VIAL_CY = 500
gm = Image.new('L', (W, H), 0); ImageDraw.Draw(gm).ellipse((CX - 290, VIAL_CY - 290, CX + 290, VIAL_CY + 290), fill=105)
glow = Image.new('RGBA', (W, H), (120, 168, 255, 0)); glow.putalpha(gm.filter(ImageFilter.GaussianBlur(95)))   # colour everywhere: no grey fringe
ring = layer(); ImageDraw.Draw(ring).ellipse((CX - 250, VIAL_CY - 250, CX + 250, VIAL_CY + 250), outline=(32, 99, 235, 34), width=2)

# ---- heartbeat line (drawn progressively)
def heartbeat_pts():
    pts = []; y0 = VIAL_CY + 40
    for x in range(-20, W + 21, 4):
        dx = x - (CX + 190); y = y0
        if -60 < dx < 100:                                   # the spike sits just right of the vial, like the logo mark
            u = (dx + 60) / 160
            y = y0 + np.interp(u, [0, .18, .32, .5, .68, .82, 1], [0, 0, -40, 120, -190, 0, 0]) * 0.75
        pts.append((x, y))
    return pts
HB = heartbeat_pts()
def heartbeat(p):
    im = layer(); n = max(2, int(len(HB) * p))
    d = ImageDraw.Draw(im); d.line(HB[:n], fill=(32, 99, 235, 70), width=5, joint='curve')
    g = im.filter(ImageFilter.GaussianBlur(6)); g.alpha_composite(im); return g

# ---- vial + reflection + shadow
v = Image.open('images/vial_semaglutide_v2_cutout.png').convert('RGBA')
VH = 430; VW = round(v.width * VH / v.height); vial = v.resize((VW, VH), Image.LANCZOS)
refl = vial.transpose(Image.FLIP_TOP_BOTTOM); ra = np.array(refl).astype(np.float32)
ra[..., 3] *= np.clip(0.20 * (1 - np.arange(VH)[:, None] / 80), 0, 1)
refl = Image.fromarray(ra.astype(np.uint8), 'RGBA')   # short, faint reflection (80 px)
VY = VIAL_CY - VH // 2
def vial_layer(dy, alpha):
    im = layer(); sh = layer()
    ImageDraw.Draw(sh).ellipse((CX - VW * 0.62, VY + VH - 14, CX + VW * 0.62, VY + VH + 22), fill=(20, 40, 80, int(80 * alpha)))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(12)))
    r = refl.copy(); r.putalpha(r.getchannel('A').point(lambda q: int(q * alpha)))
    im.alpha_composite(r, (CX - VW // 2, VY + VH + 4))
    vv = vial.copy(); vv.putalpha(vv.getchannel('A').point(lambda q: int(q * alpha)))
    im.alpha_composite(vv, (CX - VW // 2, int(VY + dy))); return im

# ---- logo: recover alpha from the light background of the official jpg
lg = np.array(Image.open('images/logo_myfastrx_official.jpg').convert('RGB')).astype(np.float32)
bgc = np.median(lg[:20, :20].reshape(-1, 3), 0)
al = np.clip((bgc.mean() - lg.min(2)) / (bgc.mean() - 40), 0, 1)
col = np.clip((lg - (1 - al[..., None]) * bgc) / np.maximum(al[..., None], 1e-3), 0, 255)
logo = Image.fromarray(np.dstack([col, al * 255]).astype(np.uint8), 'RGBA')
logo = logo.crop(Image.fromarray((al > 0.05).astype(np.uint8) * 255).getbbox())
LW = 470; logo = logo.resize((LW, round(logo.height * LW / logo.width)), Image.LANCZOS)
logo_l = layer(); logo_l.alpha_composite(logo, (CX - LW // 2, 130))

# ---- badge (same extraction as the v1 card)
bd = Image.open('images/badge_bbb_a_rating_horizontal.jpg').convert('RGB')
arr = np.array(bd).astype(int); white = (arr.min(axis=2) > 228).astype(np.uint8) * 255
fill = Image.fromarray(white, 'L').copy()          # .copy(): fromarray images are read-only and floodfill silently did nothing
for p in [(0, 0), (bd.width - 1, bd.height - 1), (bd.width - 1, 0), (0, bd.height - 1)]: ImageDraw.floodfill(fill, p, 128)
alpha = Image.fromarray(np.where(np.array(fill) == 128, 0, 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.8))
badge = bd.convert('RGBA'); badge.putalpha(alpha); badge = badge.crop(alpha.point(lambda q: 255 if q > 8 else 0).getbbox())
BW = 300; badge = badge.resize((BW, round(badge.height * BW / badge.width)), Image.LANCZOS)

# ---- price block
def ctext(d, y, s, f, fill):
    w = d.textlength(s, font=f); d.text((CX - w / 2, y), s, font=f, fill=fill); return w
price = layer(); d = ImageDraw.Draw(price)
ctext(d, 830, 'COMPOUNDED SEMAGLUTIDE', F('SemiBold', 30), INK2)
fp, fs = F('Bold', 150), F('SemiBold', 46)
wp = d.textlength('$69', font=fp); ws = max(d.textlength('first', font=fs), d.textlength('month', font=fs)); gap = 22
x0 = CX - (wp + gap + ws) / 2
d.text((x0, 866), '$69', font=fp, fill=NAVY)
d.text((x0 + wp + gap, 908), 'first', font=fs, fill=BLUE); d.text((x0 + wp + gap, 958), 'month', font=fs, fill=BLUE)
fi = F('Medium', 28); wi = d.textlength('Introductory offer', font=fi)
d.rounded_rectangle((CX - wi / 2 - 18, 1048, CX + wi / 2 + 18, 1092), 22, fill=(32, 99, 235, 26))
ctext(d, 1054, 'Introductory offer', fi, (32, 80, 190))

# ---- CTA
def cta(scale=1.0):
    im = layer(); f = F('Bold', 54); s = 'Check if I qualify'
    tw = ImageDraw.Draw(im).textlength(s, font=f); aw = 40; bw = (tw + 26 + aw + 120) * scale; bh = 118 * scale; y = 1146
    sh = layer(); ImageDraw.Draw(sh).rounded_rectangle((CX - bw / 2, y + 14, CX + bw / 2, y + bh + 14), bh / 2, fill=(32, 99, 235, 90))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18)))
    btn = layer(); bd_ = ImageDraw.Draw(btn); bd_.rounded_rectangle((CX - bw / 2, y, CX + bw / 2, y + bh), bh / 2, fill=BLUE + (255,))
    hl = layer(); ImageDraw.Draw(hl).rounded_rectangle((CX - bw / 2 + 6, y + 4, CX + bw / 2 - 6, y + bh * 0.5), bh / 2, fill=(255, 255, 255, 30))
    btn.alpha_composite(hl.filter(ImageFilter.GaussianBlur(10))); im.alpha_composite(btn)
    d = ImageDraw.Draw(im); tx = CX - (tw + 26 + aw) / 2; ty = y + bh / 2 - 34 * scale
    d.text((tx, ty), s, font=F('Bold', round(54 * scale)), fill=(255, 255, 255))
    axx = tx + tw * scale + 26; ay = y + bh / 2
    d.line([(axx, ay), (axx + aw, ay)], fill='white', width=7); d.line([(axx + aw - 16, ay - 16), (axx + aw, ay), (axx + aw - 16, ay + 16)], fill='white', width=7, joint='curve')
    return im

trust = layer(); d = ImageDraw.Draw(trust)
ctext(d, 1292, 'MyFastRx.com', F('SemiBold', 40), NAVY)
trust.alpha_composite(badge, (CX - BW // 2, 1356))

disc = layer(); d = ImageDraw.Draw(disc)
paras = ['Introductory pricing shown. Regular pricing applies to future orders. MyFastRx does not manufacture '
         'medications; product appearance and labeling may vary. Compounded medication. Not FDA-approved. '
         'Results may vary.', 'Prescription required. Subject to provider approval. AI-generated actor portrayal.']
f = F('Medium', 21); lines = []
for para in paras:
    cur = ''
    for wd in para.split():
        tt = (cur + ' ' + wd).strip()
        if d.textlength(tt, font=f) <= 800: cur = tt
        else: lines.append(cur); cur = wd
    lines.append(cur)
for i, s in enumerate(lines): ctext(d, 1500 + i * 29, s, f, (70, 80, 96))

# ---- animation
def ease(x): x = min(max(x, 0), 1); return 1 - (1 - x) ** 3
def fade(im, t0, t1, t, rise=24):
    p = ease((t - t0) / (t1 - t0))
    if p <= 0: return None, 0
    o = im.copy(); o.putalpha(o.getchannel('A').point(lambda q: int(q * p))); return o, int(rise * (1 - p))
n = int(a.dur * FPS); out = 'footage/broll/endcard_v2.mp4'
proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                         '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
base = bg.copy(); base.alpha_composite(glow); base.alpha_composite(ring)
for i in range(n):
    t = i / FPS; fr = base.copy()
    fr.alpha_composite(heartbeat(ease((t - 0.15) / 0.9)))
    pv = ease((t - 0.05) / 0.5); fr.alpha_composite(vial_layer(30 * (1 - pv) + 5 * math.sin(2 * math.pi * t / 2.4), pv))
    for im, t0, t1 in [(logo_l, 0.0, 0.35), (price, 0.25, 0.6), (trust, 0.5, 0.85), (disc, 0.2, 0.5)]:
        o, dy = fade(im, t0, t1, t)
        if o is not None: fr.alpha_composite(o, (0, dy))
    pulse = 1 + 0.035 * math.sin(math.pi * min(max((t - 1.35) / 0.5, 0), 1))
    o, dy = fade(cta(pulse), 0.4, 0.75, t)
    if o is not None: fr.alpha_composite(o, (0, dy))
    if i == n - 1: fr.convert('RGB').save('footage/broll/endcard_v2_still.png')
    proc.stdin.write(fr.convert('RGB').tobytes())
proc.stdin.close(); proc.wait(); print(out)
