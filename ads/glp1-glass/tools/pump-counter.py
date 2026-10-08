#!/usr/bin/env python3
"""Video 4's B-roll: the client's pump close-up (footage/broll/pump_plate.png, made in ChatGPT, blank LCDs) with coded
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
