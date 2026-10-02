#!/usr/bin/env python3
"""Track the black phone screen in the tap clip (footage/frames/tap) -> footage/tap_screen_quad.json.
Per frame: the dark connected component around the phone (her phone is black and held fairly steady), its outline
fitted to 4 corners (TL, TR, BR, BL in 1080x1920 frame px). The fingertip covers part of the screen from ~frame 36,
so corners are fitted to the hull and then smoothed over time (and frames whose fit jumps are interpolated)."""
import json, glob, numpy as np, cv2
fs = sorted(glob.glob('footage/frames/tap/*.jpg')); out = []
for f in fs:
    g = cv2.cvtColor(cv2.imread(f), cv2.COLOR_BGR2GRAY)
    m = (g < 48).astype(np.uint8)
    m[:, 600:] = 0; m[:500] = 0; m[1350:] = 0                       # the phone lives in the left-centre
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    cnt, _ = cv2.findContours((lab == k).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    hull = cv2.convexHull(max(cnt, key=cv2.contourArea)).reshape(-1, 2).astype(float)
    # corners: extreme points along the diagonals of the (tilted) screen
    s, d = hull.sum(1), hull[:, 0] - hull[:, 1]
    q = [hull[np.argmin(s)], hull[np.argmax(d)], hull[np.argmax(s)], hull[np.argmin(d)]]
    out.append([[round(x, 1), round(y, 1)] for x, y in q])
Q = np.array(out)                                                    # (n, 4, 2)
# reject jumps (finger merging into the blob), then smooth
med = np.median(Q, axis=0)
for i in range(len(Q)):
    if np.abs(Q[i] - (Q[i - 1] if i else med)).max() > 18: Q[i] = Q[i - 1] if i else med
kern = np.ones(5) / 5
S = np.stack([np.convolve(np.pad(Q[:, c, a], 2, mode='edge'), kern, 'valid') for c in range(4) for a in range(2)], 1).reshape(-1, 4, 2)
json.dump({'frames': len(S), 'quad': np.round(S, 1).tolist()}, open('footage/tap_screen_quad.json', 'w'))
print(len(S), 'frames; frame 41 quad', np.round(S[41]).tolist())
