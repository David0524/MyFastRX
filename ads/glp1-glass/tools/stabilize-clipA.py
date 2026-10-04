#!/usr/bin/env python3
"""Car rant clip A: undo the camera's slow zoom-out / drift as she reaches for the wheel (from ~6.7 s).
Camera path = per-frame similarity transforms of the car interior (ORB + RANSAC, 540-px analysis), accumulated, then
smoothed (only the slow drift is corrected; handheld jitter stays). From REF on, each frame is warped back to the REF
framing; where that would need pixels outside the frame, a minimal extra zoom about the frame centre covers it.
  python3 tools/stabilize-clipA.py -> footage/gen/car_clipA_1080p_stab.mp4 (video only)"""
import cv2, numpy as np, subprocess, os
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC, OUT = 'footage/gen/car_clipA_1080p.mp4', 'footage/gen/car_clipA_1080p_stab.mp4'
REF, RAMP = 6.70, 0.25                 # framing to hold (s), and a short ease into the correction
cap = cv2.VideoCapture(SRC); fps = cap.get(5); frames = []
while True:
    ok, f = cap.read()
    if not ok: break
    frames.append(f)
H, W = frames[0].shape[:2]; k = W / 540
orb = cv2.ORB_create(3000); bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
S, TX, TY = [1.0], [0.0], [0.0]; prev = None
for f in frames:
    g = cv2.cvtColor(cv2.resize(f, (540, round(H / k))), cv2.COLOR_BGR2GRAY); kp, des = orb.detectAndCompute(g, None)
    if prev is not None:
        m = sorted(bf.match(prev[1], des), key=lambda x: x.distance)[:600]
        p0 = np.float32([prev[0][x.queryIdx].pt for x in m]); p1 = np.float32([kp[x.trainIdx].pt for x in m])
        M, _ = cv2.estimateAffinePartial2D(p0, p1, method=cv2.RANSAC, ransacReprojThreshold=2.0)
        sc, dx, dy = (np.hypot(M[0, 0], M[1, 0]), M[0, 2] * k, M[1, 2] * k) if M is not None else (1, 0, 0)
        S.append(S[-1] * sc); TX.append(TX[-1] * sc + dx); TY.append(TY[-1] * sc + dy)
    prev = (kp, des)
S, TX, TY = (np.array(a[:len(frames)]) for a in (S, TX, TY))
sm = lambda a, n=9: np.convolve(np.pad(a, n // 2, mode='edge'), np.ones(n) / n, 'valid')
S, TX, TY = sm(S), sm(TX), sm(TY)
r = int(round(REF * fps)); sr, txr, tyr = S[r], TX[r], TY[r]
writer = cv2.VideoWriter(OUT + '.tmp.mp4', cv2.VideoWriter_fourcc(*'mp4v'), fps, (W, H)); extra_max = 1.0
for i, f in enumerate(frames):
    t = i / fps; u = 0 if t < REF else min(1, (t - REF) / RAMP); u = u * u * (3 - 2 * u)
    if u == 0: writer.write(f); continue
    c = sr / S[i]                                   # current -> REF:  p_ref = (p_cur - T_cur) * c + T_ref
    A = np.array([[c, 0, TX[0] * 0 + txr - TX[i] * c], [0, c, tyr - TY[i] * c]], float)
    A = (1 - u) * np.array([[1, 0, 0], [0, 1, 0]], float) + u * A
    # minimal extra zoom about the centre so no edge of the source frame shows
    corners = np.array([[0, 0, 1], [W, 0, 1], [0, H, 1], [W, H, 1]], float) @ A.T
    need = max(1.0, *[(W / 2) / max(1e-6, W / 2 - (corners[:, 0].min())), (W / 2) / max(1e-6, corners[:, 0].max() - W / 2),
                      (H / 2) / max(1e-6, H / 2 - corners[:, 1].min()), (H / 2) / max(1e-6, corners[:, 1].max() - H / 2)])
    need = 1 / min(1, 1 / need) if need > 1 else 1.0
    Z = np.array([[need, 0, (1 - need) * W / 2], [0, need, (1 - need) * H / 2], [0, 0, 1]])
    A2 = (Z @ np.vstack([A, [0, 0, 1]]))[:2]; extra_max = max(extra_max, need)
    writer.write(cv2.warpAffine(f, A2, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE))
writer.release()
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', OUT + '.tmp.mp4', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', OUT], check=True)
os.remove(OUT + '.tmp.mp4')
print('frames', len(frames), 'REF scale', round(sr, 3), 'final scale', round(S[-1], 3), 'correction zoom', round(sr / S[-1], 3), 'extra zoom max', round(extra_max, 3))
