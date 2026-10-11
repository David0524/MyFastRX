#!/usr/bin/env python3
"""Video 5 cutaway: autumn -> winter time-lapse of the same street, built from two stills (no video generation):
footage/ref/vid5_street_autumn.png (A3) and footage/ref/vid5_street_winter.png (A4, an edit of A3: same framing).
  - stage 1 (leaves): the canopy above the horizon turns to the bare winter tree in a patchy, leaf-by-leaf dissolve while
    coded leaves fall;
  - stage 2 (snow): the ground below the horizon whitens in patches that grow to full cover while snow falls;
  - time-lapse feel: the picture updates in steps (8 per second, like interval shooting), each step with its own small
    exposure / white-balance flicker; slow push-in; sensor grain.
  python3 tools/vid5-timelapse.py [--dur 3.0] -> footage/broll/vid5_timelapse.mp4 (1080x1920, 30 fps)"""
import argparse, os, subprocess, math
import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ap = argparse.ArgumentParser(); ap.add_argument('--dur', type=float, default=3.0); a = ap.parse_args()
W, H, FPS, STEP_FPS = 1080, 1920, 30, 8
A = cv2.imread('footage/ref/vid5_street_autumn.png').astype(np.float32) / 255
B = cv2.imread('footage/ref/vid5_street_winter.png').astype(np.float32) / 255
PH, PW = A.shape[:2]
rng = np.random.default_rng(5)
yy, xx = np.mgrid[0:PH, 0:PW].astype(np.float32)
HORIZON = 0.475 * PH                                        # where the far street / house line sits

def noise(scale, oct_=4):
    out = np.zeros((PH, PW), np.float32); amp = 1.0; tot = 0
    for o in range(oct_):
        s = max(2, int(scale / 2 ** o)); sm = rng.random((PH // s + 2, PW // s + 2)).astype(np.float32)
        out += amp * cv2.resize(sm, (PW, PH), interpolation=cv2.INTER_CUBIC)[:PH, :PW]; tot += amp; amp *= 0.5
    out /= tot; return (out - out.min()) / (out.max() - out.min() + 1e-6)

upper = np.clip((HORIZON + 60 - yy) / 120, 0, 1)            # soft split between canopy/sky and ground
N_LEAF, N_SNOW = noise(18), noise(28)
# leaf mask: saturated orange/yellow foliage in the autumn plate (only these pixels dissolve leaf-by-leaf)
hsv = cv2.cvtColor((A * 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
LEAF = ((hsv[..., 1] > 90) & (hsv[..., 0] < 35) & (hsv[..., 2] > 70)).astype(np.float32)
LEAF = cv2.GaussianBlur(cv2.dilate(LEAF, np.ones((5, 5))), (0, 0), 2) * upper
# snow settles first at the edges and far away, last on the near sidewalk
snow_bias = 0.35 * (1 - np.clip((yy - HORIZON) / (PH - HORIZON), 0, 1))
def uniform(x):
    r = np.empty(x.size, np.float32); r[np.argsort(x, axis=None)] = np.linspace(0, 1, x.size, dtype=np.float32); return r.reshape(x.shape)
# snow lands everywhere at once as a fine dusting that thickens (client: the creeping patches looked bad).
# Fine speckle (2-6 px grains), with a slight head start for grass/far ground over the near concrete.
GRAIN = cv2.GaussianBlur(rng.random((PH, PW)).astype(np.float32), (0, 0), 1.6)   # soft, round flakes (not blocky noise)
grass = ((hsv[..., 1] > 60) & (hsv[..., 0] > 30) & (hsv[..., 0] < 90)).astype(np.float32)
SNOW_ORDER = uniform(GRAIN * 0.8 + 0.12 * (1 - snow_bias / 0.35) - 0.10 * cv2.GaussianBlur(grass, (0, 0), 6))

def ease(x): return 0.5 - 0.5 * math.cos(math.pi * min(max(x, 0), 1))

def state(p):
    """p in [0,1]: 0 = autumn, 1 = winter."""
    pl = ease(p / 0.5); ps = ease((p - 0.3) / 0.65)             # leaves first, snow overlaps then finishes
    m_leaf = np.clip((pl * 1.25 - N_LEAF) * 6, 0, 1)            # foliage: leaf-by-leaf
    m_sky = pl                                                  # sky, houses, branches: smooth
    m_up = LEAF * m_leaf + (1 - LEAF) * m_sky
    cover = np.clip((ps * 1.1 - SNOW_ORDER) * 14, 0, 1)        # flecks switch on: density grows evenly
    m_dn = np.clip(cover * 0.85 + ease((p - 0.75) / 0.25) * 0.6, 0, 1)   # then the last of the ground fills in
    m = upper * m_up + (1 - upper) * m_dn
    img = A * (1 - m[..., None]) + B * m[..., None]
    return img

def particles(img, t, p):
    """Falling leaves early, snow later (drawn at plate resolution)."""
    out = img.copy(); nl = int(40 * (1 - ease(p / 0.6))); ns = int(520 * ease((p - 0.3) / 0.4))
    r = np.random.default_rng(int(t * STEP_FPS) + 99)
    for _ in range(nl):
        x, y = r.uniform(0, PW), r.uniform(0, PH * 0.8); c = r.choice([(0.12, 0.45, 0.85), (0.10, 0.35, 0.75), (0.15, 0.60, 0.90)])
        cv2.ellipse(out, (int(x), int(y)), (int(r.uniform(5, 11)), int(r.uniform(3, 6))), r.uniform(0, 180), 0, 360, c, -1, cv2.LINE_AA)
    for _ in range(ns):
        x, y = r.uniform(0, PW), r.uniform(0, PH); rad = r.uniform(1.2, 3.2)
        cv2.circle(out, (int(x), int(y)), int(rad), (0.97, 0.97, 0.97), -1, cv2.LINE_AA)
    return cv2.addWeighted(img, 0.15, out, 0.85, 0) if (nl or ns) else img

cache = {}
def frame(t):
    step = int(t * STEP_FPS); ts = step / STEP_FPS
    if step not in cache:
        p = min(1.0, ts / (a.dur * 0.85))                      # hold the full winter for the last ~15%
        img = particles(state(p), ts, p)
        fr = np.random.default_rng(step)                        # per-shot exposure / white-balance flicker
        img = img * (1 + fr.normal(0, 0.035)) * np.float32([1 + fr.normal(0, 0.012), 1, 1 + fr.normal(0, 0.012)])
        cache[step] = np.clip(img, 0, 1)
    img = cache[step]
    s = 1.0 + 0.06 * (t / a.dur)                                # slow push-in
    k = s * W / PW; cx, cy = PW / 2, PH * 0.52
    M = np.float32([[k, 0, W / 2 - k * cx], [0, k, H / 2 - k * cy]])
    f = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    f = f + np.random.normal(0, 0.012, f.shape).astype(np.float32)
    return (np.clip(f, 0, 1) * 255).astype(np.uint8)

n = int(a.dur * FPS); out = 'footage/broll/vid5_timelapse.mp4'
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                      '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
for i in range(n): p.stdin.write(frame(i / FPS).tobytes())
p.stdin.close(); p.wait(); print(out)
