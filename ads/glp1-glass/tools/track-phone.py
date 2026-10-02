#!/usr/bin/env python3
"""Track her phone in the tap clip (footage/frames/tap) -> footage/tap_screen_quad.json.
Per frame: the dark connected component around the phone (the phone and its screen are both black), its convex hull
(so the fingertip's notch in the outline doesn't count), a straight line fitted to each of the four sides (Huber, the
rounded corners left out) and the lines intersected: the body's four corners (TL, TR, BR, BL in 1080x1920 frame px).
Then smoothed over time. The scene insets the bezel and rounds the screen's corners in the phone's own plane."""
import json, glob, numpy as np, cv2
def corners(f):
    g = cv2.cvtColor(cv2.imread(f), cv2.COLOR_BGR2GRAY)
    m = (g < 48).astype(np.uint8); m[:, 600:] = 0; m[:500] = 0; m[1350:] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m); k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    cnt, _ = cv2.findContours((lab == k).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cnt, key=cv2.contourArea)
    hull = cv2.convexHull(c).reshape(-1, 2).astype(np.float32)
    # densify the hull so each side has many points
    pts = np.concatenate([np.linspace(hull[i], hull[(i + 1) % len(hull)], max(2, int(np.linalg.norm(hull[(i + 1) % len(hull)] - hull[i]) / 2)), endpoint=False) for i in range(len(hull))])
    box = cv2.boxPoints(cv2.minAreaRect(pts)); s = box.sum(1); d = box[:, 0] - box[:, 1]
    B = np.array([box[np.argmin(s)], box[np.argmax(d)], box[np.argmax(s)], box[np.argmin(d)]])   # TL TR BR BL (approx)
    lines = []
    for e in range(4):
        a, b = B[e], B[(e + 1) % 4]; L = np.linalg.norm(b - a); u = (b - a) / L; nrm = np.array([-u[1], u[0]])
        t = (pts - a) @ u; dist = np.abs((pts - a) @ nrm)
        sel = pts[(t > .16 * L) & (t < .84 * L) & (dist < 25)]                     # the straight run of this side
        vx, vy, x0, y0 = cv2.fitLine(sel, cv2.DIST_HUBER, 0, .01, .01).ravel()
        lines.append((np.array([x0, y0]), np.array([vx, vy])))
    out = []
    for e in range(4):   # corner e = side (e-1) x side e
        (p1, d1), (p2, d2) = lines[(e - 1) % 4], lines[e]
        A = np.array([d1, -d2]).T; tt = np.linalg.solve(A, p2 - p1); out.append(p1 + tt[0] * d1)
    return np.array(out)
fs = sorted(glob.glob('footage/frames/tap/*.jpg')); Q = np.array([corners(f) for f in fs])   # (n, 4, 2)
for i in range(1, len(Q)):   # a fit that jumps (the hand merging into the blob) keeps the previous frame
    if np.abs(Q[i] - Q[i - 1]).max() > 14: Q[i] = Q[i - 1]
w = np.array([1, 2, 3, 2, 1], float); w /= w.sum()
S = np.stack([np.convolve(np.pad(Q[:, c, a], 2, mode='edge'), w, 'valid') for c in range(4) for a in range(2)], 1).reshape(-1, 4, 2)
json.dump({'frames': len(S), 'body': 'TL TR BR BL, phone body corners (the scene insets the bezel)', 'quad': np.round(S, 2).tolist()}, open('footage/tap_screen_quad.json', 'w'))
print(len(S), 'frames; frame 41', np.round(S[41]).tolist())
