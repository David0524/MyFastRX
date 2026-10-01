// v5 hook, 0 - 3.0 s (three.js, rendered frame by frame in headless Chromium): an action shot.
// A teal glass pill touches down on the tabletop (glass tap on frame 1) and races across it, swerving; the camera chases
// it low, swings round beside it and ends in front as it lands on the printed "$69" (qualification printed beneath it)
// at 2.5 s, which it magnifies. A glint sweeps the glass, then the camera cranes up to a locked top-down view that is
// the 2D film's first frame exactly (pill at (510, 820), 500 px per metre, same gradient, light and grid): the cut at
// 3.0 s is a match-cut and the 2D film carries on from it.
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
const ORBIT = [[0, 78, 8, 1.75], [.7, 52, 10, 1.8], [1.4, 18, 12, 1.95], [2.0, -16, 16, 2.15], [2.5, -9, 30, 2.5], [3.0, -5, 40, 2.8]];
function orbitAt(t) {
  let i = 0; while (i < ORBIT.length - 2 && t > ORBIT[i + 1][0]) i++;
  const P = k => ORBIT[clamp(k, 0, ORBIT.length - 1)], p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
  const u = clamp((t - p1[0]) / (p2[0] - p1[0])), cr = (a, b, c, d) => .5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u ** 3);
  return [1, 2, 3].map(j => cr(p0[j], p1[j], p2[j], p3[j]));
}
// the locked overhead at the handoff: the 2D layout exactly (500 px per metre at the table, pill centre at (510, 820))
const LOCK_FOV = 62, LOCK_H = H / (2 * Math.tan(LOCK_FOV / 2 * Math.PI / 180) * SC.ppm2d);   // low and wide: a crisp lens through the pill
const LOCK = {pos: new THREE.Vector3((W / 2 - SC.cx) / SC.ppm2d, LOCK_H, (H / 2 - SC.cy) / SC.ppm2d)};
LOCK.look = new THREE.Vector3(LOCK.pos.x, 0, LOCK.pos.z);
function chase(t, p) {
  const [az, el, d] = orbitAt(t), A = az * Math.PI / 180, E = el * Math.PI / 180;
  const pos = new THREE.Vector3(p.x + d * Math.sin(A) * Math.cos(E), d * Math.sin(E) + .03, p.z + d * Math.cos(A) * Math.cos(E));
  // aim a little ahead of the pill while it moves, then at the middle of the price block once it has landed
  const settle = eIO(prog(t, O.land - .5, O.land + .3));
  const look = new THREE.Vector3(p.x - .16 * p.speed / 2.4, .05, p.z).lerp(new THREE.Vector3(0, 0, .2), settle);
  // handheld: a little drift and shake, strongest at speed
  const sh = (.004 + .006 * p.speed / 2.4) * (1 - prog(t, O.crane[0], O.crane[0] + .3));
  pos.x += sh * Math.sin(t * 23.1) + sh * .6 * Math.sin(t * 41.7); pos.y += sh * Math.sin(t * 31.3 + 1);
  return {pos, look};
}
// projected screen boxes of the printed price and qualification (verify_v5.mjs: whole price on screen => whole qualification)
const BOX = {price: [[-.32, -.10], [.32, .22]], qual: [[-.29, .31], [.29, .56]]};   // [x, z] metres
let lastMeta = null;
function boxOnScreen([[x0, z0], [x1, z1]]) {
  return [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].every(([x, z]) => { const v = new THREE.Vector3(x, 0, z).project(camera); return v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1; });
}
export const frameMeta = () => lastMeta;

export function render(t) {
  const p = pillPose(t);
  pill.position.set(p.x, 0, p.z); pill.rotation.y = p.yaw; pill.scale.set(p.sxz, p.sy, p.sxz);
  shadow.position.set(p.x + .07, .0008, p.z + .06); shadow.rotation.z = p.yaw; shadow.scale.set(p.sxz, 1, p.sxz);
  caustic.position.set(p.x + .44, .0012, p.z + .06);   // past the right end, clear of the printed lines caustic.rotation.z = p.yaw; caustic.scale.set(p.sxz, 1, p.sxz);
  // the glint: the studio's light strips slide across the pill's top once it has landed
  const gm = eIO(prog(t, ...O.glint));
  // reflections: lively during the chase, then turned down over the price as the camera locks (text stays crisp)
  pill.material.envMapIntensity = lerp(.55, .16, eIO(prog(t, O.glint[1] - .1, O.dive - .1)));
  scene.environmentRotation.set(0, Math.PI / 2 - .9 * (1 - gm), 0);   // ends at the clean orientation (no light strip across the price)
  const c = chase(t, p), upY = new THREE.Vector3(0, 1, 0), upZ = new THREE.Vector3(0, 0, -1);
  const m = eIO(prog(t, ...O.crane));
  // crane: position, aim and roll blend together, so the pill and the price stay framed all the way up
  const pos = new THREE.Vector3().lerpVectors(c.pos, LOCK.pos, m);
  const look = new THREE.Vector3().lerpVectors(c.look, LOCK.look, m), up = new THREE.Vector3().lerpVectors(upY, upZ, m).normalize();
  const q = camQ(pos, look, up);
  camera.fov = lerp(50, LOCK_FOV, m);
  camera.position.copy(pos); camera.quaternion.copy(q); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  // framing clamp: whenever the whole price is on screen, the whole qualification must be too - aim toward it until it is
  const qc = new THREE.Vector3(0, 0, .44);
  for (let k = 0; k < 40 && boxOnScreen(BOX.price) && !boxOnScreen(BOX.qual); k++) {
    look.lerp(qc, .06); camera.quaternion.copy(camQ(pos, look, up)); camera.updateMatrixWorld();
  }
  renderer.render(scene, camera);
  lastMeta = {t, priceWhole: boxOnScreen(BOX.price), qualWhole: boxOnScreen(BOX.qual)};
  return canvas;
}
