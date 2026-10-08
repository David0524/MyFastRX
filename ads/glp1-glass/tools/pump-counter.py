#!/usr/bin/env python3
"""Video 4's B-roll (weathered: grime, scratches, chipped lettering, aged LCD, smudged glass): the client's pump close-up (footage/broll/pump_plate.png, made in ChatGPT, blank LCDs) with coded
seven-segment digits composited INTO its two LCD windows: perspective-matched (homography to each window's corners),
italic LCD slant, unlit "ghost" segments, the plate's glass reflection kept over the digits (multiply + reflection
back on top), focus matched, then a slow handheld drift / focus breathe / grain so it reads as phone footage.
The TOTAL SALE counts up and stops at --stop; GALLONS follows at --ppg dollars per gallon.
  python3 tools/pump-counter.py [--stop 3.4] [--final 48.73] [--dur 5]  -> footage/broll/pump_counter.mp4 (1080x1920, 30 fps)"""
import argparse, os, subprocess, math
import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser(); ap.add_argument('--stop', type=float, default=3.4); ap.add_argument('--final', type=float, default=48.73)
ap.add_argument('--ppg', type=float, default=3.89); ap.add_argument('--dur', type=float, default=5.0)
ap.add_argument('--still', type=float, default=None, help='write one frame at this time to --out-png instead of the video')
ap.add_argument('--out-png', default=None); a = ap.parse_args()
W, H, FPS = 1080, 1920, 30
plate = cv2.imread('footage/broll/pump_plate.png').astype(np.float32) / 255.0      # 941 x 1672, BGR
PH, PW = plate.shape[:2]
# LCD glass corners in the plate (TL, TR, BR, BL), measured on a pixel grid
WINDOWS = {'sale': np.float32([[104, 412], [792, 534], [802, 736], [100, 688]]),
           'gal': np.float32([[99, 874], [811, 885], [815, 1081], [97, 1140]])}
# ---- wear and grime (client: "more beat up, less polished"). Deterministic: same dirt every frame and every render.
RNG = np.random.default_rng(7)
def _noise(scale, octaves=4):
    out = np.zeros((PH, PW), np.float32); amp = 1.0; tot = 0
    for o in range(octaves):
        s_ = max(2, int(scale / 2 ** o))
        small = RNG.random((PH // s_ + 2, PW // s_ + 2)).astype(np.float32)
        out += amp * cv2.resize(small, (PW, PH), interpolation=cv2.INTER_CUBIC)[:PH, :PW]; tot += amp; amp *= 0.5
    out /= tot; return (out - out.min()) / (out.max() - out.min() + 1e-6)
WIN_MASK = np.zeros((PH, PW), np.float32)
for q in WINDOWS.values(): cv2.fillPoly(WIN_MASK, [q.astype(np.int32)], 1.0, cv2.LINE_AA)
WIN_MASK = cv2.GaussianBlur(WIN_MASK, (0, 0), 1.5)
# grime: blotchy darkening, heavier toward the bottom and edges, and packed into the window recesses
yy, xx = np.mgrid[0:PH, 0:PW].astype(np.float32)
edge = np.clip(np.maximum(np.abs(xx / PW - 0.5) * 2, (yy / PH) ** 1.5) - 0.35, 0, 1)
blotch = np.clip((_noise(220) - 0.45) * 2.2, 0, 1)
recess = np.zeros((PH, PW), np.float32)
for q in WINDOWS.values(): cv2.polylines(recess, [q.astype(np.int32)], True, 1.0, 9, cv2.LINE_AA)
recess = cv2.GaussianBlur(recess, (0, 0), 6) * (0.6 + 0.8 * _noise(60))
streak = cv2.resize(RNG.random((6, PW // 7)).astype(np.float32), (PW, PH), interpolation=cv2.INTER_CUBIC)   # vertical run-off stains
streak = np.clip((streak - 0.55) * 2.5, 0, 1) * np.clip((yy - 380) / 900, 0, 1)
speck = cv2.GaussianBlur((RNG.random((PH, PW)) < 0.004 + 0.03 * edge).astype(np.float32), (0, 0), 0.9) * 1.6   # dirt specks, dense at edges
grime = np.clip(0.75 * blotch * _noise(120) + 0.6 * edge * _noise(90) + 0.75 * recess + 0.40 * streak * _noise(40) + 0.5 * speck, 0, 0.85) * (1 - WIN_MASK)
GRIME_COL = np.float32([0.10, 0.15, 0.20])           # brown-grey road dirt (BGR)
# scratches and scuffs on the metal: short light and dark strokes, mostly near-horizontal like the brushing
scr = np.zeros((PH, PW), np.float32)
for _ in range(320):
    x0, y0 = RNG.uniform(0, PW), RNG.uniform(0, PH); L = RNG.uniform(8, 90); ang = RNG.normal(0, 0.5) + (np.pi / 2 if RNG.random() < 0.15 else 0)
    cv2.line(scr, (int(x0), int(y0)), (int(x0 + L * np.cos(ang)), int(y0 + L * np.sin(ang))), float(RNG.choice([-1, 1])) * RNG.uniform(0.3, 1), 1, cv2.LINE_AA)
SCRATCH = cv2.GaussianBlur(scr, (0, 0), 0.7) * (1 - WIN_MASK) * 0.18 * (0.4 + _noise(70))
# chipped lettering: light specks only where the printed letters are dark
lum = plate.mean(axis=2); around = cv2.blur(lum, (31, 31))
letters = ((lum < 0.25) & (around > 0.33)).astype(np.float32) * (yy < 860) * (yy > 300) * (1 - WIN_MASK)
CHIPS = letters * np.clip((_noise(10) - 0.5) * 3, 0, 1)     # worn patches inside the strokes
CHIPS = cv2.GaussianBlur(CHIPS, (0, 0), 0.8)
METAL = cv2.GaussianBlur(cv2.inpaint((plate * 255).astype(np.uint8), (letters * 255).astype(np.uint8), 5, cv2.INPAINT_TELEA), (0, 0), 1).astype(np.float32) / 255
# glass: fingerprint smudges (haze), dust specks, water spots: applied OVER the digits
smudge = np.zeros((PH, PW), np.float32)
for _ in range(14):
    c = (int(RNG.uniform(90, 820)), int(RNG.uniform(420, 1130))); ax = (int(RNG.uniform(18, 40)), int(RNG.uniform(26, 55)))
    cv2.ellipse(smudge, c, ax, RNG.uniform(0, 180), 0, 360, RNG.uniform(0.4, 1.0), -1, cv2.LINE_AA)
smudge = cv2.GaussianBlur(smudge, (0, 0), 10) * (0.5 + _noise(25)) + 0.25 * np.clip(_noise(160) - 0.5, 0, 1)
dust = (RNG.random((PH, PW)) < 0.0007).astype(np.float32) * RNG.random((PH, PW)).astype(np.float32); dust = cv2.GaussianBlur(dust, (0, 0), 1.1) * 2.5
spots = np.zeros((PH, PW), np.float32)
for _ in range(22):
    c = (int(RNG.uniform(100, 810)), int(RNG.uniform(415, 1140))); r = int(RNG.uniform(4, 13))
    cv2.circle(spots, c, r, RNG.uniform(0.4, 0.9), 1, cv2.LINE_AA)
spots = cv2.GaussianBlur(spots, (0, 0), 1.0)
gscr = np.zeros((PH, PW), np.float32)                         # hairline scratches in the glass
for _ in range(70):
    x0, y0 = RNG.uniform(100, 810), RNG.uniform(420, 1140); L = RNG.uniform(15, 120); ang = RNG.uniform(0, np.pi)
    cv2.line(gscr, (int(x0), int(y0)), (int(x0 + L * np.cos(ang)), int(y0 + L * np.sin(ang))), RNG.uniform(0.4, 1), 1, cv2.LINE_AA)
gscr = cv2.GaussianBlur(gscr, (0, 0), 0.5)
GLASS = np.clip(0.6 * smudge + 0.45 * dust + 0.3 * spots + 0.35 * gscr, 0, 0.7) * WIN_MASK
LCD_AGE = np.float32([0.86, 0.97, 1.0])            # aged LCD: slightly yellowed (BGR multiplier)
plate = plate * (1 - grime[..., None]) + GRIME_COL * grime[..., None]
plate = plate * (1 - 0.9 * CHIPS[..., None]) + METAL * 0.9 * CHIPS[..., None]
plate = plate + SCRATCH[..., None]
plate = plate * (1 - WIN_MASK[..., None]) + plate * LCD_AGE * WIN_MASK[..., None]
# sticker-glue residue: a torn, yellowed rectangle where a sticker was peeled off (beside GALLONS)
res = np.zeros((PH, PW), np.float32)
cv2.fillPoly(res, [np.int32([[668, 778], [828, 766], [836, 846], [662, 858]])], 1.0, cv2.LINE_AA)   # slightly skewed, torn
edge_n = cv2.GaussianBlur(res, (0, 0), 9); res = res * (_noise(18) > 0.42) * (edge_n + 0.25 * _noise(6) > 0.62)
res = cv2.GaussianBlur(res, (0, 0), 1.4) * (1 - WIN_MASK)
plate = plate * (1 - 0.40 * res[..., None]) + np.float32([0.52, 0.62, 0.66]) * 0.40 * res[..., None]
plate = np.clip(plate * 0.95 + 0.015, 0, 1)        # flatter: weathered, not showroom
SEG = {'0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg'}
FW, FH = 1400, 560        # flat LCD canvas per window

def lcd_mask(text):
    """Flat canvas: 1.0 = lit segment, 0.055 = unlit ghost segment, 0 = glass. Italic slant like real pump LCDs."""
    m = np.zeros((FH, FW), np.float32)
    n = len([c for c in text if c != '.'])
    mx, my = 120, 95; dw = (FW - 2 * mx) / n; dh = FH - 2 * my; t = dw * 0.15; x = mx
    for c in text:
        if c == '.':
            cv2.circle(m, (int(x - dw * 0.06), int(my + dh - t * 0.5)), int(t * 0.55), 1.0, -1, cv2.LINE_AA); continue
        x0, w_ = x + dw * 0.14, dw * 0.66; on = SEG.get(c, '')
        segs = {'a': ((x0 + t, my), (x0 + w_ - t, my + t)), 'g': ((x0 + t, my + dh / 2 - t / 2), (x0 + w_ - t, my + dh / 2 + t / 2)),
                'd': ((x0 + t, my + dh - t), (x0 + w_ - t, my + dh)), 'f': ((x0, my + t), (x0 + t, my + dh / 2 - t * 0.3)),
                'b': ((x0 + w_ - t, my + t), (x0 + w_, my + dh / 2 - t * 0.3)), 'e': ((x0, my + dh / 2 + t * 0.3), (x0 + t, my + dh - t)),
                'c': ((x0 + w_ - t, my + dh / 2 + t * 0.3), (x0 + w_, my + dh - t))}
        for s_, (p0, p1) in segs.items():
            cv2.rectangle(m, (int(p0[0]), int(p0[1])), (int(p1[0]), int(p1[1])), 1.0 if s_ in on else 0.055, -1, cv2.LINE_AA)
        x += dw
    shear = np.float32([[1, -0.10, 0.10 * FH * 0.6], [0, 1, 0]])                      # forward italic slant
    m = cv2.warpAffine(m, shear, (FW, FH), flags=cv2.INTER_LINEAR)
    return cv2.GaussianBlur(m, (0, 0), 1.2)

HOMS = {k: cv2.getPerspectiveTransform(np.float32([[0, 0], [FW, 0], [FW, FH], [0, FH]]), q) for k, q in WINDOWS.items()}
REFL = np.clip(cv2.GaussianBlur(plate, (0, 0), 3) - 0.55, 0, 1)                     # the bright reflection in the glass

def composite(sale, gal):
    out = plate.copy()
    for key, txt in (('sale', sale), ('gal', gal)):
        m = cv2.warpPerspective(lcd_mask(txt), HOMS[key], (PW, PH), flags=cv2.INTER_LINEAR)
        m = cv2.GaussianBlur(m, (0, 0), 0.9)[..., None]                               # focus matched to the plate
        ink = np.float32([0.10, 0.11, 0.10])                                          # near-black LCD segment (BGR)
        out = out * (1 - 0.92 * m) + ink * 0.92 * m
        out = out + REFL * m * 0.45                                                    # reflection stays on top of the digits
    out = out + (0.85 - out) * GLASS[..., None]                                      # smudges / dust / spots over the digits
    return np.clip(out, 0, 1)

def frame(t):
    v = a.final * min(1.0, t / a.stop) ** 0.92 if t < a.stop else a.final
    img = composite(f'{v:6.2f}', f'{v / a.ppg:6.3f}')
    s = 1.25 + 0.010 * math.sin(t * 0.9)                                               # slight push and breathe
    cx = PW / 2 + 9 * math.sin(t * 1.3) + 4 * math.sin(t * 3.1); cy = PH * 0.40 + 7 * math.cos(t * 1.1)
    k = s * W / PW
    M = np.float32([[k, 0, W / 2 - k * cx], [0, k, H / 2 - k * cy]])
    f = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    f = f + np.random.normal(0, 0.018, f.shape).astype(np.float32)                    # sensor grain
    return (np.clip(f, 0, 1) * 255).astype(np.uint8)

if a.still is not None:
    cv2.imwrite(a.out_png, frame(a.still)); raise SystemExit
n = int(a.dur * FPS)
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                      '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', 'footage/broll/pump_counter.mp4'], stdin=subprocess.PIPE)
for i in range(n): p.stdin.write(frame(i / FPS).tobytes())
p.stdin.close(); p.wait()
print('footage/broll/pump_counter.mp4')
