// v5 hook, 0 - 4.0 s (three.js, rendered frame by frame in headless Chromium): an action shot.
// A teal glass pill touches down on the tabletop (glass tap on frame 1) and races across it, swerving; the camera chases
// it low, swings round beside it and ends in front as it lands on the printed "$69" (qualification printed beneath it)
// at 2.5 s, which it magnifies; the shot sits on it for a second while a glint sweeps the glass, then the camera cranes up to a locked top-down view that is
// the 2D film's first frame exactly (pill at (510, 820), 500 px per metre, same gradient, light and grid): the cut at
// 4.0 s is a match-cut and the 2D film carries on from it.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import * as TL from './timeline.mjs';
import {blobsAt, drawBlobs, drawGradient, GRID} from './backdrop.mjs';

const {W, H} = TL;
const O = TL.OPEN;                                     // opening cues (timeline.mjs)
const PILL = {L: 1.0, D: 0.56, R: 0.28, H: 0.16, B: 0.09};   // metres: length (x), depth (z), end radius, max height, bevel
const clamp = (v, a = 0, z = 1) => Math.min(z, Math.max(a, v));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOut = u => u >= 1 ? 1 : (1 - 2 ** (-10 * u)) / (1 - 2 ** -10);
const eIO = u => u < .5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
const lerp = (a, b, t) => a + (b - a) * t;

let renderer, scene, camera, pill, shadow, caustic, canvas;

// ---------- the pill: a heightfield slab (capsule footprint, quarter-round bevel, gently domed top) ----------
function pillGeometry() {
  const {L, D, R, H: Hm, B} = PILL, nx = 220, nz = 124;
  const sd = (x, z) => Math.hypot(Math.max(Math.abs(x) - (L / 2 - R), 0), z) - R;
  const pos = [], idx = [];
  const topIndex = (i, j) => j * (nx + 1) + i;
  for (const side of [0, 1]) {                         // 0 = top surface, 1 = bottom (flat, y = 0)
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      let x = lerp(-L / 2, L / 2, i / nx), z = lerp(-D / 2, D / 2, j / nz);
      let d = sd(x, z);
      if (d > 0) {                                     // outside the footprint: pull onto the edge
        const cx = clamp(x, -(L / 2 - R), L / 2 - R), vx = x - cx, vz = z, l = Math.hypot(vx, vz) || 1;
        x = cx + vx / l * R; z = vz / l * R; d = 0;
      }
      const s = clamp(-d / B), bev = Math.sqrt(1 - (1 - s) ** 2);
      const dome = .97 + .03 * clamp(-d / R) ** .7;
      pos.push(x, side ? 0 : Hm * bev * dome, z);
    }
  }
  const off = (nx + 1) * (nz + 1);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = topIndex(i, j), b = topIndex(i + 1, j), c = topIndex(i, j + 1), e = topIndex(i + 1, j + 1);
    idx.push(a, c, b, b, c, e);                         // top faces up
    idx.push(off + a, off + b, off + c, off + b, off + e, off + c);   // bottom faces down
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------- the tabletop: the 2D film's background printed on it (gradient, light, grid) + the printed price ----------
// 2D screen px <-> table metres at the handoff: X = (x - 510) / 500, Z = (y - 820) / 500 (screen right = +x, down = +z)
const SC = {cx: 510, cy: 820, ppm2d: 500};
async function tableTexture() {
  const S = 6144, M = 7.0, ppm = S / M;                // 7 m square around the price, 878 px per metre
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const k = ppm / SC.ppm2d;                             // texture px per 2D px
  x.setTransform(k, 0, 0, k, S / 2 - SC.cx * k, S / 2 - SC.cy * k);   // draw in 2D screen coordinates
  drawGradient(x, -6000, 7000);
  drawBlobs(x, blobsAt(O.dive));                        // the 2D film's light at 3.0 s
  x.strokeStyle = 'rgba(0,29,69,0.075)'; x.lineWidth = 1.5; x.beginPath();
  for (let gx = GRID.x0 - GRID.step * 60; gx < 6000; gx += GRID.step) { x.moveTo(gx, -6000); x.lineTo(gx, 8000); }
  for (let gy = GRID.y0 - GRID.step * 80; gy < 8000; gy += GRID.step) { x.moveTo(-6000, gy); x.lineTo(7000, gy); }
  x.stroke();
  // printed price, in 2D px: sizes under the pill are the 2D layout's divided by the lens power (the pill shows them at
  // layout size); the qualification sits outside the lens, at layout size. Three lines, each no wider than "$69".
  const mag = 1.0, cy = SC.cy;                          // measured: from the locked overhead the dome barely magnifies
  const txt = (s, y, px, wt) => { x.font = `${wt} ${px}px G${wt}`; x.letterSpacing = px * mag >= 64 ? `${(-0.022 * px).toFixed(2)}px` : '0px'; x.fillStyle = '#001D45'; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText(s, SC.cx, y); };
  txt('Starting at', cy - 66 / mag + 5, 44 / mag, 500);   // +5 / +12 px: where the 2D layout's lines sit, seen through the dome
  txt('$69', cy + 88 / mag + 12, 172 / mag, 700);
  txt('Introductory offer.', cy + 186, 34, 500); txt('Regular pricing', cy + 228, 34, 500); txt('varies by plan.', cy + 270, 34, 500);
  // fade the far edges into the floor colour, so a low camera never sees where the print ends
  x.setTransform(1, 0, 0, 1, 0, 0);
  for (const [x0, y0, x1, y1] of [[0, 0, S * .14, 0], [S, 0, S * .86, 0], [0, 0, 0, S * .14], [0, S, 0, S * .86]]) {
    const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(242,245,249,1)'); g.addColorStop(1, 'rgba(242,245,249,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  return {tex: t, size: M};
}
function softTexture(draw) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); draw(x);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function init() {
  for (const [wt, f] of [[500, 'Medium'], [700, 'Bold']]) { const ff = new FontFace('G' + wt, `url(../../assets/fonts/Geist-${f}.ttf)`); await ff.load(); document.fonts.add(ff); }
  canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true, alpha: false});
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene(); scene.background = new THREE.Color('#EEF3FA');
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .9;
  scene.environmentRotation = new THREE.Euler(0, Math.PI / 2, 0);
  // the studio behind the table: the ad's own palette - off-white to pale blue, with soft teal/blue light
  const room = softTexture(x => {
    const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#F7F7F7'); g.addColorStop(1, '#EEF3FA'); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    for (const [cx, cy, r, c] of [[380, 250, 260, '20,163,184,0.16'], [120, 330, 240, '0,113,254,0.12']]) { const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, `rgba(${c})`); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, 512, 512); }
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshBasicMaterial({map: room, toneMapped: false}));
  back.position.set(0, 3.0, -9); scene.add(back);
  // the table prints the 2D background unlit (MeshBasic, no tone mapping), so its colours are the 2D film's at the cut
  const {tex, size} = await tableTexture();
  const top = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({map: tex, toneMapped: false}));
  top.rotation.x = -Math.PI / 2; scene.add(top);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({color: new THREE.Color('#F2F5F9'), toneMapped: false}));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.002; scene.add(floor);
  const key = new THREE.DirectionalLight('#ffffff', 1.4); key.position.set(-2, 4, -1.5); scene.add(key);
  scene.add(new THREE.HemisphereLight('#ffffff', '#dfe6ee', .55));
  pill = new THREE.Mesh(pillGeometry(), new THREE.MeshPhysicalMaterial({
    color: '#ffffff', transmission: 1, thickness: .07, roughness: .03, ior: 1.38, dispersion: .14,
    attenuationColor: new THREE.Color('#14A3B8'), attenuationDistance: .42, clearcoat: .35, clearcoatRoughness: .04,
    specularIntensity: .55, envMapIntensity: .5}));
  pill.material.envMap = scene.environment;            // its own env map, so envMapIntensity really scales the reflections
  scene.add(pill);
  shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshBasicMaterial({transparent: true, depthWrite: false, toneMapped: false,
    map: softTexture(x => { const g = x.createRadialGradient(256, 256, 40, 256, 256, 250); g.addColorStop(0, 'rgba(30,70,80,0.30)'); g.addColorStop(.6, 'rgba(40,90,100,0.10)'); g.addColorStop(1, 'rgba(40,90,100,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 512); })}));
  shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = -1; scene.add(shadow);
  caustic = new THREE.Mesh(new THREE.PlaneGeometry(.55, .32), new THREE.MeshBasicMaterial({transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending,
    map: softTexture(x => { const g = x.createRadialGradient(256, 256, 10, 256, 256, 250); g.addColorStop(0, 'rgba(120,235,245,0.55)'); g.addColorStop(.5, 'rgba(60,200,220,0.18)'); g.addColorStop(1, 'rgba(60,200,220,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 512); })}));
  caustic.rotation.x = -Math.PI / 2; scene.add(caustic);
  camera = new THREE.PerspectiveCamera(40, W / H, .005, 80);
  return true;
}

// ---------- the pill: races in from the right, swerving, and lands on the price ----------
const ease = u => 1 - (1 - u) ** 2.4;                    // fast off the line, a long braking glide into the price
function pillPath(t) {
  const u = prog(t, O.touch, O.land), e = ease(u);
  return {x: O.startX * (1 - e), z: -.26 * Math.sin(Math.PI * e) * (1 - e) ** .4, speed: 2.4 * (1 - u) ** 1.4 * (u < 1 ? 1 : 0)};
}
function pillPose(t) {
  const a = pillPath(t), b = pillPath(t + 1 / 60);
  const yaw = Math.atan2(-(b.z - a.z), -(b.x - a.x) + 1e-6) * .5 * Math.min(1, a.speed * 3);   // noses into the swerve
  const wob = (t0, amp, dec, per) => { const d = t - t0; return d < 0 ? 0 : amp * Math.exp(-d / dec) * Math.sin(2 * Math.PI * d / per); };
  const sq = wob(O.touch - .02, .11, .11, .28) + wob(O.land - .04, .08, .17, .25) + .02 * Math.sin(2 * Math.PI * t / .9) * a.speed / 2.4;
  return {x: a.x, z: a.z, yaw, speed: a.speed, sy: 1 - sq, sxz: 1 + sq * .5};
}
const camQ = (pos, look, up) => { const m = new THREE.Matrix4().lookAt(pos, look, up); return new THREE.Quaternion().setFromRotationMatrix(m); };
// the chase: camera offset around the pill [t, azimuth deg (0 = in front, + = toward +x), elevation deg, distance m]
// (smooth: one C1 spline, no handheld shake - the motion comes from the swing and the pill's own speed)
// it starts ahead of the pill, which races toward the lens (the price is behind the camera), then swings round in front
const ORBIT = [[0, -72, 8, 1.8], [.7, -62, 10, 1.9], [1.4, -46, 13, 2.0], [2.0, -26, 18, 2.2], [2.5, -10, 27, 2.45], [3.4, -6, 30, 2.28], [4.0, -5, 32, 2.2]];
function orbitAt(t) {
  // Hermite spline with tangents scaled by the (uneven) key spacing, so the camera's velocity is continuous through
  // every key (a plain Catmull-Rom on uneven keys changes speed abruptly at each one: a hitch every key)
  const K = ORBIT, n = K.length; let i = 0; while (i < n - 2 && t > K[i + 1][0]) i++;
  const tg = (k, j) => { const a = K[Math.max(0, k - 1)], b = K[Math.min(n - 1, k + 1)]; return (b[j] - a[j]) / (b[0] - a[0]); };
  const t0 = K[i][0], t1 = K[i + 1][0], h = t1 - t0, u = clamp((t - t0) / h), u2 = u * u, u3 = u2 * u;
  return [1, 2, 3].map(j => (2 * u3 - 3 * u2 + 1) * K[i][j] + (u3 - 2 * u2 + u) * h * tg(i, j) + (-2 * u3 + 3 * u2) * K[i + 1][j] + (u3 - u2) * h * tg(i + 1, j));
}
// the locked overhead at the handoff: the 2D layout exactly (500 px per metre at the table, pill centre at (510, 820))
const LOCK_FOV = 62, LOCK_H = H / (2 * Math.tan(LOCK_FOV / 2 * Math.PI / 180) * SC.ppm2d);   // low and wide: a crisp lens through the pill
const LOCK = {pos: new THREE.Vector3((W / 2 - SC.cx) / SC.ppm2d, LOCK_H, (H / 2 - SC.cy) / SC.ppm2d)};
LOCK.look = new THREE.Vector3(LOCK.pos.x, 0, LOCK.pos.z);
function chase(t, p) {
  const [az, el, d] = orbitAt(t), A = az * Math.PI / 180, E = el * Math.PI / 180;
  const pos = new THREE.Vector3(p.x + d * Math.sin(A) * Math.cos(E), d * Math.sin(E) + .03, p.z + d * Math.cos(A) * Math.cos(E));
  // aim a little ahead of the pill while it moves, then at the middle of the price block, where the shot sits
  const settle = eIO(prog(t, O.land - .6, O.land + .2));
  const look = new THREE.Vector3(p.x - .16 * p.speed / 2.4, .05, p.z).lerp(new THREE.Vector3(0, 0, .22), settle);
  return {pos, look};
}
// projected screen boxes of the printed price and qualification (verify_v5.mjs: whole price on screen => whole qualification)
const BOX = {price: [[-.32, -.10], [.32, .22]], qual: [[-.29, .31], [.29, .56]]};   // [x, z] metres
let lastMeta = null;
function boxOnScreen([[x0, z0], [x1, z1]]) {
  return [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].every(([x, z]) => { const v = new THREE.Vector3(x, 0, z).project(camera); return v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1; });
}
export const frameMeta = () => lastMeta;

const smoother = u => u * u * u * (u * (6 * u - 15) + 10);   // smootherstep: no jump in acceleration (the crane's mid-move kick)
const QC = new THREE.Vector3(0, 0, .44);                 // the qualification's centre
function camBase(t) {
  const p = pillPose(t), c = chase(t, p), m = smoother(prog(t, ...O.crane));
  // crane: position, aim and roll blend together, so the pill and the price stay framed all the way up
  return {m, pos: new THREE.Vector3().lerpVectors(c.pos, LOCK.pos, m), look: new THREE.Vector3().lerpVectors(c.look, LOCK.look, m),
    up: new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1), m).normalize(), fov: lerp(50, LOCK_FOV, m)};
}
function applyCam(b, a) {   // a: how far the aim leans toward the qualification (0 = the planned shot)
  camera.fov = b.fov; camera.position.copy(b.pos); camera.quaternion.copy(camQ(b.pos, b.look.clone().lerp(QC, a), b.up));
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
}
const violates = () => boxOnScreen(BOX.price) && !boxOnScreen(BOX.qual);
// framing rule: whenever the whole price is on screen, the whole qualification must be too. Where the planned shot
// would break it, the aim leans toward the qualification - eased in and out over half a second (planned from the
// frames around it), never snapped per frame, which is what made the camera judder.
const alphaCache = new Map();
function alphaAt(t) {
  const key = Math.round(t * 600); if (alphaCache.has(key)) return alphaCache.get(key);
  // leaning toward the qualification frames it more (monotonic) but can also bring the whole price into view, so plan on
  // the qualification: the least lean that frames it whole, needed wherever the price is whole with or without that lean
  const b = camBase(t), qualAt = a => { applyCam(b, a); return boxOnScreen(BOX.qual); }, priceAt = a => { applyCam(b, a); return boxOnScreen(BOX.price); };
  let aq = 0;
  if (!qualAt(0)) { let lo = 0, hi = 1; for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (qualAt(mid)) hi = mid; else lo = mid; } aq = hi; }
  const r = aq > 0 && (priceAt(0) || priceAt(aq) || priceAt(aq / 2)) ? Math.min(1, aq + .04) : 0;
  alphaCache.set(key, r); return r;
}
function leanAt(t) {
  let a = 0;
  for (let d = -.5; d <= .5 + 1e-9; d += 1 / 60) { const w = .5 + .5 * Math.cos(Math.PI * d / .5); a = Math.max(a, alphaAt(t + d) * w); }
  return a;
}
function setup(t) {
  const p = pillPose(t);
  pill.position.set(p.x, 0, p.z); pill.rotation.y = p.yaw; pill.scale.set(p.sxz, p.sy, p.sxz);
  shadow.position.set(p.x + .07, .0008, p.z + .06); shadow.rotation.z = p.yaw; shadow.scale.set(p.sxz, 1, p.sxz);
  caustic.position.set(p.x + .44, .0012, p.z + .06); caustic.rotation.z = p.yaw; caustic.scale.set(p.sxz, 1, p.sxz);   // past the right end, clear of the printed lines
  // the glint: the studio's light strips slide across the pill's top while the shot sits on the price
  const gm = eIO(prog(t, ...O.glint));
  // reflections: lively during the chase, then turned down over the price as the camera locks (text stays crisp)
  pill.material.envMapIntensity = lerp(.55, .16, eIO(prog(t, O.glint[1] - .1, O.dive - .1)));
  scene.environmentRotation.set(0, Math.PI / 2 - .9 * (1 - gm), 0);   // ends at the clean orientation (no light strip across the price)
  const lean = leanAt(t), b = camBase(t);
  applyCam(b, lean);
  let k = 0;   // a last safety net (should never run: the lean above already covers every frame)
  for (; k < 40 && violates(); k++) applyCam(b, Math.min(1, lean + (k + 1) * .03));
  return {lean, k};
}
// the camera pose without rendering (smoothness checks)
export function pose(t) { const dbg = setup(t); const d = new THREE.Vector3(); camera.getWorldDirection(d); return {p: camera.position.toArray(), d: d.toArray(), pill: pill.position.toArray(), dbg: {...dbg, pw: boxOnScreen(BOX.price), qw: boxOnScreen(BOX.qual)}}; }
export function render(t) {
  const {lean, k} = setup(t);
  renderer.render(scene, camera);
  lastMeta = {t, priceWhole: boxOnScreen(BOX.price), qualWhole: boxOnScreen(BOX.qual), lean: +lean.toFixed(3), clamp: k};
  return canvas;
}
