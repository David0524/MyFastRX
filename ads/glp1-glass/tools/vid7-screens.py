#!/usr/bin/env python3
"""Video 7 "Tirzepatide online, step by step": the MyFastRx checkout walkthrough as a coded phone screen recording (client,
Nov 4: "create your own website screens... be intentional about that design").
Design system read off the live checkout (checkout.myfastrx.com/onboard/, Nov 4): DM Sans (OFL, assets/fonts/DMSans-*), ink
#0F1729, button blue #3C83F6, borders #E1E7EF, light-grey inputs, 8 px radius, the official logo centred on top, a numbered
"Step N of 4" tracker. The flow follows the client's brief: about you -> choose your plan -> checkout -> medical intake ->
licensed provider review. Sample data only (Jane Sample, example.com, card 4242); no regular price, no MY70, no claims beyond the
brief's approved list ("Same price at any provider-approved dose", "No subscription or membership fees", "Prescription required.
Subject to provider approval."). Recording look: iOS status bar, the address pill, touch indicators, typing, page slides.
Layout keeps everything between the status bar and y ~1420 px: the edit puts the step banner and captions below that.
  python3 tools/vid7-screens.py --durs 3.6 2.6 2.8 3.4 2.6 -> footage/broll/vid7_screens.mp4 (+ vid7_screen_<n>.png stills)"""
import argparse, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser(); ap.add_argument('--durs', type=float, nargs=5, default=[3.6, 2.6, 2.8, 3.4, 2.6])
ap.add_argument('--out', default='footage/broll/vid7_screens.mp4'); a = ap.parse_args()
W, H, FPS = 1080, 1920, 30
K = 1080 / 360                                     # 360 pt wide page (the real site is 390 pt; we crop its padding: "tightly cropped")
def p(v): return round(v * K)
FONT = {w: f'assets/fonts/DMSans-{w}.ttf' for w in ('Regular', 'Medium', 'SemiBold', 'Bold')}
def F(w, pt): return ImageFont.truetype(FONT[w], p(pt))
INK, INK2, MUTED = (15, 23, 41), (71, 85, 105), (100, 116, 139)
BLUE, BLUE_T, BORDER, FIELD, WHITE = (60, 131, 246), (60, 131, 246, 28), (225, 231, 239), (246, 248, 251), (255, 255, 255)
GREEN = (22, 163, 74)
PADX = 16

# ---- the official logo, as-is (light background matches the page)
LOGO = Image.open('images/logo_myfastrx_official.jpg').convert('RGB')
lg = np.asarray(LOGO).astype(int); m = lg.min(2) < 235
ys, xs = np.where(m); LOGO = LOGO.crop((xs.min() - 6, ys.min() - 6, xs.max() + 6, ys.max() + 6))
LOGO = LOGO.resize((p(118), round(p(118) * LOGO.height / LOGO.width)), Image.LANCZOS)

def ease(x): x = min(max(x, 0), 1); return 1 - (1 - x) ** 3
def rr(d, box, r, **kw): d.rounded_rectangle([round(v) for v in box], radius=p(r), **kw)
def text(d, xy, s, f, fill): d.text((p(xy[0]), p(xy[1])), s, font=f, fill=fill)

def chrome(im):
    """iOS status bar + the address pill (screen-recording look)."""
    d = ImageDraw.Draw(im); f = F('SemiBold', 15)
    d.text((p(26), p(14)), '9:41', font=f, fill=INK)
    for i in range(4): d.rounded_rectangle((p(290 + i * 6), p(25 - i * 2.5), p(294 + i * 6), p(30)), p(1), fill=INK)
    rr(d, (p(318), p(17), p(340), p(29)), 3, outline=INK, width=p(1)); d.rectangle((p(320), p(19), p(334), p(27)), fill=INK)
    rr(d, (p(PADX), p(40), p(360 - PADX), p(68)), 14, fill=(239, 241, 245))
    fu = F('Medium', 13); u = 'checkout.myfastrx.com'; w = d.textlength(u, font=fu)
    x = (W - w) / 2; d.text((x, p(46)), u, font=fu, fill=INK2)
    lx, ly = x - p(14), p(49)                                    # padlock
    d.rounded_rectangle((lx, ly + p(4), lx + p(9), ly + p(11)), p(1.5), fill=INK2)
    d.arc((lx + p(1.5), ly, lx + p(7.5), ly + p(8)), 180, 360, fill=INK2, width=max(2, p(1.4)))

def header(im, step):
    d = ImageDraw.Draw(im)
    im.paste(LOGO, ((W - LOGO.width) // 2, p(78)))
    text(d, (PADX, 124), f'Step {step} of 4', F('SemiBold', 12), INK)
    x0, x1 = 112, 330
    d.line((p(x0), p(131), p(x1), p(131)), fill=BORDER, width=p(1.5))
    for i in range(4):
        cx = x0 + (x1 - x0) * i / 3; on = i < step
        d.ellipse((p(cx - 11), p(120), p(cx + 11), p(142)), fill=BLUE if on else WHITE, outline=BLUE if on else BORDER, width=p(1.2))
        s = str(i + 1); f = F('SemiBold', 11); w = d.textlength(s, font=f)
        d.text((p(cx) - w / 2, p(124)), s, font=f, fill=WHITE if on else MUTED)

def field(d, box, value, placeholder='', caret=False, select=False):
    rr(d, (p(box[0]), p(box[1]), p(box[2]), p(box[3])), 8, fill=FIELD, outline=BORDER, width=p(1))
    f = F('Regular', 15); y = p((box[1] + box[3]) / 2) - p(10)
    if value: d.text((p(box[0] + 12), y), value, font=f, fill=INK)
    else: d.text((p(box[0] + 12), y), placeholder, font=f, fill=MUTED)
    if caret:
        cx = p(box[0] + 12) + d.textlength(value, font=f) + p(1)
        d.line((cx, y + p(1), cx, y + p(19)), fill=BLUE, width=p(1.2))
    if select:
        cx, cy = p(box[2] - 18), p((box[1] + box[3]) / 2)
        d.line((cx - p(5), cy - p(2.5), cx, cy + p(2.5), cx + p(5), cy - p(2.5)), fill=INK2, width=p(1.5), joint='curve')

def button(d, box, label, pressed=0.0):
    c = tuple(int(v * (1 - 0.12 * pressed)) for v in BLUE)
    rr(d, (p(box[0]), p(box[1]), p(box[2]), p(box[3])), 8, fill=c)
    f = F('SemiBold', 15); w = d.textlength(label, font=f)
    d.text(((p(box[0]) + p(box[2]) - w) / 2, p((box[1] + box[3]) / 2) - p(10)), label, font=f, fill=WHITE)

def check(d, cx, cy, r, fill=BLUE, tick=WHITE):
    d.ellipse((p(cx - r), p(cy - r), p(cx + r), p(cy + r)), fill=fill)
    d.line((p(cx - r * 0.45), p(cy), p(cx - r * 0.1), p(cy + r * 0.38), p(cx + r * 0.5), p(cy - r * 0.35)), fill=tick, width=max(2, p(r * 0.28)), joint='curve')

def typed(s, t, t0, t1):
    n = int(len(s) * min(max((t - t0) / (t1 - t0), 0), 1)); return s[:n], t0 <= t < t1 + 0.25

def taps_layer(taps, t):
    """Touch indicators (iOS 'show touches'): a grey dot that grows in and fades out."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for (x, y, tt) in taps:
        u = (t - tt) / 0.35
        if 0 <= u <= 1:
            r = p(16) * (0.7 + 0.3 * ease(u * 2)); al = int(110 * (1 - max(0, u - 0.4) / 0.6))
            d.ellipse((p(x) - r, p(y) - r, p(x) + r, p(y) + r), fill=(90, 90, 100, al), outline=(255, 255, 255, al), width=p(1))
    return im

# ---- the five screens: draw(t, dur) -> (RGB image, taps)
def s1(t, D):
    im = Image.new('RGB', (W, H), WHITE); chrome(im); header(im, 1); d = ImageDraw.Draw(im)
    text(d, (PADX, 160), 'Start your approval –', F('Bold', 22), INK); text(d, (PADX, 188), 'tell us about you.', F('Bold', 22), INK)
    lab = F('SemiBold', 14)
    text(d, (PADX, 232), 'Which state do you live in?', lab, INK)
    st = 'Texas' if t > 0.30 * D else ''
    field(d, (PADX, 254, 360 - PADX, 296), st, 'Select your state', select=True)
    text(d, (PADX, 312), 'What is your name?', lab, INK)
    fn, c1 = typed('Jane', t, 0.36 * D, 0.48 * D); ln, c2 = typed('Sample', t, 0.50 * D, 0.62 * D)
    field(d, (PADX, 334, 176, 376), fn, 'First name', caret=c1); field(d, (184, 334, 360 - PADX, 376), ln, 'Last name', caret=c2)
    text(d, (PADX, 392), 'What is your email address?', lab, INK)
    em, c3 = typed('jane.sample@example.com', t, 0.64 * D, 0.80 * D)
    field(d, (PADX, 414, 360 - PADX, 456), em, 'example@example.com', caret=c3)
    tb = 0.86 * D; button(d, (PADX, 470, 360 - PADX, 512), 'Next', pressed=1.0 if tb <= t < tb + 0.2 else 0)
    return im, [(180, 275, 0.22 * D), (96, 355, 0.36 * D), (272, 355, 0.50 * D), (180, 435, 0.64 * D), (180, 491, tb)]

def plan_card(d, y, name, price, sel):
    rr(d, (p(PADX), p(y), p(360 - PADX), p(y + 76)), 10, fill=(240, 246, 255) if sel else WHITE, outline=BLUE if sel else BORDER, width=p(1.6 if sel else 1))
    text(d, (PADX + 14, y + 12), 'COMPOUNDED', F('SemiBold', 10.5), MUTED); text(d, (PADX + 14, y + 26), name, F('Bold', 18), INK)
    text(d, (PADX + 14, y + 50), 'Introductory offer', F('Medium', 11.5), BLUE)
    f = F('Bold', 24); w = d.textlength(price, font=f); d.text((p(360 - PADX - 52) - w, p(y + 14)), price, font=f, fill=INK)
    fs = F('Medium', 11.5); s = 'first month'; ws = d.textlength(s, font=fs); d.text((p(360 - PADX - 52) - ws, p(y + 46)), s, font=fs, fill=MUTED)
    cx, cy = 360 - PADX - 24, y + 38
    if sel: check(d, cx, cy, 11)
    else: d.ellipse((p(cx - 11), p(cy - 11), p(cx + 11), p(cy + 11)), outline=BORDER, width=p(1.5))

def s2(t, D):
    im = Image.new('RGB', (W, H), WHITE); chrome(im); header(im, 2); d = ImageDraw.Draw(im)
    text(d, (PADX, 160), 'Choose your treatment.', F('Bold', 22), INK)
    text(d, (PADX, 190), 'Prescription required. Subject to provider approval.', F('Regular', 12.5), MUTED)
    sel = t > 0.35 * D
    plan_card(d, 218, 'Semaglutide', '$69', False); plan_card(d, 304, 'Tirzepatide', '$129', sel)
    for i, s in enumerate(['Same price at any provider-approved dose', 'No subscription or membership fees']):
        y = 396 + i * 24; check(d, PADX + 8, y + 8, 7, fill=(220, 236, 255), tick=BLUE); text(d, (PADX + 22, y), s, F('Medium', 12.5), INK2)
    tb = 0.80 * D; button(d, (PADX, 458, 360 - PADX, 500), 'Continue', pressed=1.0 if tb <= t < tb + 0.2 else 0)
    return im, [(180, 342, 0.35 * D), (180, 479, tb)]

def s3(t, D):
    im = Image.new('RGB', (W, H), WHITE); chrome(im); header(im, 3); d = ImageDraw.Draw(im)
    text(d, (PADX, 160), 'Checkout.', F('Bold', 22), INK)
    y = 196; rr(d, (p(PADX), p(y), p(360 - PADX), p(y + 170)), 10, fill=WHITE, outline=BORDER, width=p(1))
    text(d, (PADX + 14, y + 12), 'Compounded Tirzepatide', F('Bold', 15.5), INK)
    text(d, (PADX + 14, y + 33), 'First month · Introductory offer', F('Medium', 12), BLUE)
    f = F('Bold', 16); d.text((p(360 - PADX - 14) - d.textlength('$129', font=f), p(y + 12)), '$129', font=f, fill=INK)
    d.line((p(PADX + 14), p(y + 58), p(360 - PADX - 14), p(y + 58)), fill=BORDER, width=p(1))
    for i, s in enumerate(['Licensed provider review', 'Medication, if prescribed', 'Shipping']):
        yy = y + 68 + i * 22; check(d, PADX + 22, yy + 8, 7, fill=(220, 236, 255), tick=BLUE); text(d, (PADX + 36, yy), s, F('Medium', 13), INK2)
    d.line((p(PADX + 14), p(y + 136), p(360 - PADX - 14), p(y + 136)), fill=BORDER, width=p(1))
    text(d, (PADX + 14, y + 144), 'Due today', F('SemiBold', 14), INK)
    d.text((p(360 - PADX - 14) - d.textlength('$129', font=f), p(y + 143)), '$129', font=f, fill=INK)
    text(d, (PADX, 382), 'Card', F('SemiBold', 14), INK)
    card, c = typed('•••• •••• •••• 4242', t, 0.15 * D, 0.45 * D)
    field(d, (PADX, 404, 360 - PADX, 446), card, 'Card number', caret=c)
    if t > 0.5 * D:
        fm = F('Regular', 15); s = '12/28  ···'; d.text((p(360 - PADX - 12) - d.textlength(s, font=fm), p(415)), s, font=fm, fill=INK2)
    tb = 0.78 * D; button(d, (PADX, 460, 360 - PADX, 502), 'Place order', pressed=1.0 if tb <= t < tb + 0.2 else 0)
    return im, [(180, 425, 0.12 * D), (180, 481, tb)]

def opt(d, box, label, sel):
    rr(d, (p(box[0]), p(box[1]), p(box[2]), p(box[3])), 8, fill=BLUE if sel else WHITE, outline=BLUE if sel else BORDER, width=p(1))
    f = F('Regular', 15); w = d.textlength(label, font=f)
    d.text(((p(box[0]) + p(box[2]) - w) / 2, p((box[1] + box[3]) / 2) - p(10)), label, font=f, fill=WHITE if sel else INK)

def box_(d, x, y, on):
    rr(d, (p(x), p(y), p(x + 18), p(y + 18)), 4, fill=BLUE if on else WHITE, outline=BLUE if on else BORDER, width=p(1.3))
    if on: d.line((p(x + 4), p(y + 9), p(x + 8), p(y + 13), p(x + 14), p(y + 5)), fill=WHITE, width=p(2), joint='curve')

def s4(t, D):
    im = Image.new('RGB', (W, H), WHITE); chrome(im); header(im, 4); d = ImageDraw.Draw(im)
    text(d, (PADX, 160), 'Medical intake.', F('Bold', 22), INK)
    text(d, (PADX, 190), 'A licensed provider reviews your answers.', F('Regular', 12.5), MUTED)
    lab = F('SemiBold', 14)
    text(d, (PADX, 220), 'Are you currently taking any', lab, INK); text(d, (PADX, 239), 'prescription medications?', lab, INK)
    no = t > 0.25 * D
    opt(d, (PADX, 264, 112, 302), 'Yes', False); opt(d, (120, 264, 216, 302), 'No', no)
    text(d, (PADX, 318), 'Have you ever had any of these?', lab, INK)
    none = t > 0.55 * D
    for i, s in enumerate(['Pancreatitis', 'Thyroid cancer or MEN2', 'Gallbladder disease', 'None of these']):
        y = 344 + i * 26; box_(d, PADX, y, none and i == 3); text(d, (PADX + 28, y), s, F('Regular', 14), INK)
    tb = 0.82 * D; button(d, (PADX, 458, 360 - PADX, 500), 'Submit for review', pressed=1.0 if tb <= t < tb + 0.2 else 0)
    return im, [(168, 283, 0.25 * D), (25, 431, 0.55 * D), (180, 479, tb)]

def s5(t, D):
    im = Image.new('RGB', (W, H), WHITE); chrome(im); d = ImageDraw.Draw(im)
    im.paste(LOGO, ((W - LOGO.width) // 2, p(78)))
    pc = ease(t / 0.4); r = 26 * (0.6 + 0.4 * pc)
    check(d, 180, 160, r, fill=(220, 252, 231), tick=GREEN)
    f = F('Bold', 22); s = 'Intake submitted.'; d.text(((W - d.textlength(s, font=f)) / 2, p(198)), s, font=f, fill=INK)
    fb = F('Regular', 13.5)
    for i, s in enumerate(['A licensed provider will review your information', 'to determine whether treatment is appropriate.']):
        d.text(((W - d.textlength(s, font=fb)) / 2, p(232 + i * 19)), s, font=fb, fill=INK2)
    y = 290; rr(d, (p(PADX), p(y), p(360 - PADX), p(y + 150)), 10, fill=WHITE, outline=BORDER, width=p(1))
    steps = [('Order placed', 'done'), ('Intake submitted', 'done'), ('Licensed provider review', 'now'), ('Ships if prescribed', 'next')]
    for i, (s, st) in enumerate(steps):
        yy = y + 22 + i * 34; cx = PADX + 22
        if i < 3: d.line((p(cx), p(yy + 9), p(cx), p(yy + 34 - 9)), fill=BORDER, width=p(1.5))
        if st == 'done': check(d, cx, yy, 9)
        elif st == 'now':
            pulse = 0.5 + 0.5 * np.sin(t * 5); d.ellipse((p(cx - 9 - 3 * pulse), p(yy - 9 - 3 * pulse), p(cx + 9 + 3 * pulse), p(yy + 9 + 3 * pulse)), fill=(220, 236, 255))
            d.ellipse((p(cx - 6), p(yy - 6), p(cx + 6), p(yy + 6)), fill=BLUE)
        else: d.ellipse((p(cx - 9), p(yy - 9), p(cx + 9), p(yy + 9)), outline=BORDER, width=p(1.5))
        text(d, (cx + 18, yy - 9), s, F('SemiBold' if st == 'now' else 'Medium', 14), INK if st != 'next' else MUTED)
        if st == 'now': text(d, (360 - PADX - 76, yy - 8), 'In review', F('SemiBold', 12), BLUE)
    return im, []

SCREENS = [s1, s2, s3, s4, s5]
SLIDE = 0.28
os.makedirs(os.path.dirname(a.out), exist_ok=True)
proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                         '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', a.out], stdin=subprocess.PIPE)
starts = np.cumsum([0] + a.durs[:-1])
total = sum(a.durs)
for i in range(round(total * FPS)):
    t = i / FPS; k = int(np.searchsorted(starts, t, side='right') - 1); tl = t - starts[k]
    im, taps = SCREENS[k](tl, a.durs[k])
    fr = im.convert('RGBA')
    if k > 0 and tl < SLIDE:                                   # page slide from the previous screen (like a real next-page)
        prev, _ = SCREENS[k - 1](a.durs[k - 1] - 0.001, a.durs[k - 1])
        u = ease(tl / SLIDE); body = (0, p(72), W, H)            # chrome stays put; only the page slides
        canvas = fr.copy(); canvas.paste(prev.crop(body), (round(-W * u), p(72))); canvas.paste(im.crop(body), (round(W * (1 - u)), p(72)))
        fr = canvas.convert('RGBA')
    fr.alpha_composite(taps_layer(taps, tl))
    proc.stdin.write(fr.convert('RGB').tobytes())
for k, s in enumerate(SCREENS):
    im, _ = s(a.durs[k] - 0.01, a.durs[k]); im.save(f'footage/broll/vid7_screen_{k + 1}.png')
proc.stdin.close(); proc.wait()
print(a.out, f'{total:.2f} s', [round(x, 2) for x in starts])
