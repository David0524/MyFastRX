// Opening, 0 - 4.25 s: a real 3D shot (three.js, rendered frame by frame in headless Chromium).
// A teal glass pill touches down on a modern tabletop (glass tap on frame 1), glides across it with a slight
// breathing squeeze, and settles over the printed "$69", which it magnifies through its domed top. The camera follows
// low beside it, cranes up to overhead, then dives into the pill's glass - where the 2D overhead ad takes over.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import * as TL from './timeline.mjs';

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

// ---------- the tabletop: matte off-white with a faint graph-paper grid and the printed price ----------
async function tableTexture() {
  const S = 4096, M = 2.4, ppm = S / M;                // 2.4 m square around the price, 1707 px per metre
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = '#F4F5F7'; x.fillRect(0, 0, S, S);
  x.strokeStyle = 'rgba(0,29,69,0.075)'; x.lineWidth = 3;
  const step = .12 * ppm; x.beginPath();
  for (let p = S / 2 % step; p < S; p += step) { x.moveTo(p, 0); x.lineTo(p, S); x.moveTo(0, p); x.lineTo(S, p); }
  x.stroke();
  // printed price (sizes are the 2D layout's divided by the lens power, so the pill shows them at layout size)
  const P = (m) => S / 2 + m * ppm, mag = 1.2, pxm = 1 / 500;   // 2D: 500 px = the pill's 1.0 m length
  const txt = (s, zM, sizeM, wt) => { x.font = `${wt} ${Math.round(sizeM * ppm)}px G${wt}`; x.fillStyle = '#001D45'; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText(s, S / 2, P(zM)); };
  txt('Starting at', (657 - 712) * pxm, 44 / mag * pxm, 500);
  txt('$69', (785.3 - 712) * pxm, 172 / mag * pxm, 700);
  // the qualification in three lines, each no wider than "$69": whenever the whole price is in frame, so is the whole qualification
  txt('Introductory offer.', (898 - 712) * pxm, 34 * pxm, 500);
  txt('Regular pricing', (940 - 712) * pxm, 34 * pxm, 500);
  txt('varies by plan.', (982 - 712) * pxm, 34 * pxm, 500);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  return {tex: t, size: M};
}
function softTexture(draw) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); draw(x);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function init() {
  for (const [wt, f] of [[500, 'Medium'], [700, 'Bold']]) { const ff = new FontFace('G' + wt, `url(../assets/fonts/Geist-${f}.ttf)`); await ff.load(); document.fonts.add(ff); }
  canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true, alpha: false});
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene(); scene.background = new THREE.Color('#EEF3FA');
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .9;
  scene.environmentRotation = new THREE.Euler(0, Math.PI / 2, 0);   // the room's light strips reflect along the pill, not across the price
  // the room: softly blurred kitchen behind the table
  // the studio behind the table: the ad's own palette - off-white to pale blue, with soft teal/blue light
  const room = softTexture(x => {
    const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#F7F7F7'); g.addColorStop(1, '#EEF3FA'); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    for (const [cx, cy, r, c] of [[380, 250, 220, '20,163,184,0.20'], [120, 330, 200, '0,113,254,0.14']]) { const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, `rgba(${c})`); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, 512, 512); }
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshBasicMaterial({map: room, toneMapped: false}));
  back.position.set(.4, 2.2, -6.5); scene.add(back);
  // table: a thick white slab with a soft edge
  const {tex, size} = await tableTexture();
  const top = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({map: tex, roughness: .82, metalness: 0}));
  top.rotation.x = -Math.PI / 2; scene.add(top);
  const around = new THREE.Mesh(new THREE.BoxGeometry(6, .06, 9), new THREE.MeshStandardMaterial({color: '#F4F5F7', roughness: .82}));
  around.position.set(.6, -.0305, 3.3); scene.add(around);   // the rest of the slab (plain), its front/back edges visible at low angles
  // key light from the upper left (matches the 2D ad's key light)
  const key = new THREE.DirectionalLight('#ffffff', 1.4); key.position.set(-2, 4, -1.5); scene.add(key);
  scene.add(new THREE.HemisphereLight('#ffffff', '#dfe6ee', .55));
  // pill
  pill = new THREE.Mesh(pillGeometry(), new THREE.MeshPhysicalMaterial({
    color: '#ffffff', transmission: 1, thickness: .07, roughness: .03, ior: 1.38, dispersion: .14,
    attenuationColor: new THREE.Color('#14A3B8'), attenuationDistance: .42, clearcoat: .35, clearcoatRoughness: .04,
    specularIntensity: .55, envMapIntensity: .5}));
  scene.add(pill);
  // its soft teal contact shadow and the caustic (light focused through it) on the table
  shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshBasicMaterial({transparent: true, depthWrite: false, toneMapped: false,
    map: softTexture(x => { const g = x.createRadialGradient(256, 256, 40, 256, 256, 250); g.addColorStop(0, 'rgba(30,70,80,0.34)'); g.addColorStop(.6, 'rgba(40,90,100,0.12)'); g.addColorStop(1, 'rgba(40,90,100,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 512); })}));
  shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = -1; scene.add(shadow);
  caustic = new THREE.Mesh(new THREE.PlaneGeometry(.9, .5), new THREE.MeshBasicMaterial({transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending,
    map: softTexture(x => { const g = x.createRadialGradient(256, 256, 10, 256, 256, 250); g.addColorStop(0, 'rgba(120,235,245,0.55)'); g.addColorStop(.5, 'rgba(60,200,220,0.18)'); g.addColorStop(1, 'rgba(60,200,220,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 512); })}));
  caustic.rotation.x = -Math.PI / 2; scene.add(caustic);
  camera = new THREE.PerspectiveCamera(40, W / H, .005, 60);
  return true;
}

// pill pose at time t: x position, squash (y scale), breathing
function pillPose(t) {
  const u = eOut(prog(t, O.touch, O.land));
  const x = lerp(O.startX, 0, u);
  const wob = (t0, a, dec, per) => { const d = t - t0; return d < 0 ? 0 : a * Math.exp(-d / dec) * Math.sin(2 * Math.PI * d / per); };
  const breathe = .028 * Math.sin(2 * Math.PI * (t - O.touch) / 1.15) * (1 - .6 * prog(t, O.land, O.land + .6));
  const sq = wob(O.touch - .02, .11, .11, .28) + wob(O.land - .04, .07, .17, .25) + breathe;   // + = squashed
  return {x, sy: 1 - sq, sxz: 1 + sq * .5};
}
const camQ = (pos, look, up) => { const m = new THREE.Matrix4().lookAt(pos, look, up); return new THREE.Quaternion().setFromRotationMatrix(m); };

export function render(t) {
  const p = pillPose(t);
  pill.position.set(p.x, 0, 0); pill.scale.set(p.sxz, p.sy, p.sxz);
  shadow.position.set(p.x + .07, .0008, .06); shadow.scale.set(p.sxz, 1, p.sxz);
  caustic.position.set(p.x + .26, .0012, .24); caustic.scale.set(p.sxz, 1, p.sxz);
  // camera: low follow -> crane to overhead -> dive into the pill's left end (no text under it: pure glass)
  const follow = new THREE.Vector3(p.x + lerp(.10, 0, prog(t, 0, O.land)), .98, 2.9);
  const followLook = new THREE.Vector3(p.x, .02, .26);   // aimed nearer the viewer so the printed qualification sits above the Reels caption zone
  const over = new THREE.Vector3(0, 2.85, .28), overLook = new THREE.Vector3(0, 0, .28);   // pill above centre (as in the 2D layout), qualification clear of the Reels caption zone   // fov 40: pill ~74% of the width, as in the 2D macro
  const dive = new THREE.Vector3(-.345, .205, 0), diveLook = new THREE.Vector3(-.345, 0, 0);
  const upZ = new THREE.Vector3(0, 0, -1), upY = new THREE.Vector3(0, 1, 0);
  let pos, q;
  if (t < O.crane[0]) { pos = follow; q = camQ(follow, followLook, upY); }
  else if (t < O.crane[1]) {
    const m = eIO(prog(t, ...O.crane));
    pos = new THREE.Vector3().lerpVectors(follow, over, m); pos.y += Math.sin(Math.PI * m) * .5;
    // look at a point gliding from the follow target to the overhead one, so the price block stays framed through the move
    const look = new THREE.Vector3().lerpVectors(followLook, overLook, m), up = new THREE.Vector3().lerpVectors(upY, upZ, m).normalize();
    q = camQ(pos, look, up);
  } else {
    const m = eIO(prog(t, O.crane[1], O.dive));
    pos = new THREE.Vector3().lerpVectors(over, dive, 1 - (1 - m) ** 2);
    q = camQ(over, overLook, upZ).slerp(camQ(dive, diveLook, upZ), m);
  }
  camera.position.copy(pos); camera.quaternion.copy(q);
  renderer.render(scene, camera);
  return canvas;
}
