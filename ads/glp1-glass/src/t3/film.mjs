// MyFastRx "Liquid Glass" Version A v4 - "Everything on the table", built on PHOTO PLATES.
// Every real object (table, notepad, tag, cards, Rx pad, membership card, box, vial) is a photograph (plates/*.png|jpg,
// cut by tools/prep-plates.py) laid on the table at its real thickness, with soft contact shadows. Only the glass pieces
// (pill, heartbeat, toggle, button, checks, slider, CTA) and the twine are 3D. One continuous three.js camera:
//  0.00-4.25  the fly-over: in low from the far side, round the gliding pill, over the top (macro depth of field)
//  A  4.25    notepad: a doctor's scrawl flows into "GLP-1 care, / no strings attached."; the tag's twine pulls free
//  B  7.72    the pill knocks the membership card away; the auto-refill toggle flips off; "Request refill" is pressed
//  C  12.62   "One price covers": Rx-pad scrawl -> "Provider review"; the vial and the box drop in; glass checks
//  D  17.15   back to the tag; the pill lands on $69; the dose slider moves and the price holds
//  E  21.05   the end card: the camera settles so the card fills the frame exactly (logo and badge pixels untouched)
// The camera tilts a few degrees at the stations (depth, parallax on the pans) and is exactly top-down on the end card.
// HUD (2D): fine film grain (frozen for the final hold), the caption, the end-card fine print.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {BokehPass} from 'three/addons/postprocessing/BokehPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import * as TL from '../timeline.mjs';
import {softDisc, setFont, maskLine, NAVY, BLUE} from './tex.mjs';
import {makeInk} from './ink.mjs';

const {W, H, CUES: C, OPEN: O, STATIONS: ST, CAPTIONS} = TL;
const TOP = {h: 5.8, fov: 36, tilt: 4};                                             // tilt: degrees, at stations A-D
const VIS_H = 2 * TOP.h * Math.tan(TOP.fov / 2 * Math.PI / 180), PX = VIS_H / H;   // metres per layout px on the table
const CX = 510;                                                                     // visual centre of the safe area
export const COPY = {
  disclaimer: 'Compounded medication. Not FDA-approved. Results may vary. Not all patients qualify. Prescription issued only if medically appropriate following provider review. MyFastRx does not manufacture medications; product appearance and labeling may vary. Actor portrayal.',
  qual: ['Introductory offer.', 'Regular pricing', 'varies by plan.'],
  startingAt: 'Starting at', price: '$69',
  head1: ['GLP-1 care,', 'no strings attached.'],
  head2: ['No membership fees.', 'No automatic refills.'],
  autoRefill: 'Auto-refill', button: 'Request refill',
  covers: 'One price covers',
  checks: ['Provider review', 'Medication', 'Shipping'],
  claim24: 'Online visit in minutes. Review typically within 24 hours.',
  noIns: 'No insurance needed. No contracts.',
  dose: ['Lower dose', 'Higher dose'],
  doseLine: ["Your price doesn't climb", 'as your dose does.'],
  tag: ['Clear pricing.', 'Clear care.'],
  cta: 'See if you qualify', url: 'MyFastRx.com',
};
const DISC = {w: 820, pad: 14, size: 22, lh: 1.25, bottom: 1236, r: 12};

// ---------- math ----------
const clamp = (v, a = 0, z = 1) => Math.min(z, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOut = u => u >= 1 ? 1 : (1 - 2 ** (-10 * u)) / (1 - 2 ** -10);
const eIn = u => u <= 0 ? 0 : (2 ** (10 * u - 10) - 2 ** -10) / (1 - 2 ** -10);
const eIO = u => u < .5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
const e2 = u => u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
const spring = (t, t0, per = .34, dec = .085) => { const d = t - t0; return d <= 0 ? 0 : 1 - Math.exp(-d / dec) * Math.cos(2 * Math.PI * d / per); };
const wob = (t, t0, a, dec, per) => { const d = t - t0; return d < 0 ? 0 : a * Math.exp(-d / dec) * Math.sin(2 * Math.PI * d / per); };
const deg = Math.PI / 180;
const wp = (st, sx, sy) => [ST[st][0] + (sx - 540) * PX, ST[st][1] + (sy - 960) * PX];   // station layout px -> world x, z
const pxm = p => p * PX;

let renderer, scene, camera, composer, bokeh, glCanvas, out, octx, disc, ENV = null, grain = [];
const img = {}, M = {};
const ENV_ROT = new THREE.Euler(0, Math.PI / 2, 0);

// ---------- glass ----------
// (the env map is set on each material: in three r16x+ envMapIntensity only scales a material's own envMap)
const glassMat = (o = {}) => new THREE.MeshPhysicalMaterial({envMap: ENV, envMapRotation: ENV_ROT, color: '#ffffff', transmission: 1, thickness: .05, roughness: .06, ior: 1.45, dispersion: .08,
  clearcoat: 0, specularIntensity: .5, envMapIntensity: .35, ...o});
const tealGlass = () => glassMat({thickness: .07, ior: 1.38, dispersion: .1, attenuationColor: new THREE.Color('#1FA9C2'), attenuationDistance: .6, specularIntensity: .35, envMapIntensity: .25, roughness: .05});
const readGlass = (o = {}) => glassMat({thickness: .03, envMapIntensity: .1, specularIntensity: .3, dispersion: .04, ...o});   // glass you read print through
const blueGlass = () => glassMat({attenuationColor: new THREE.Color('#7CAEFF'), attenuationDistance: .35, thickness: .06, envMapIntensity: .6, specularIntensity: .8, roughness: .04});

// ---------- capsule / rounded glass slab (heightfield: plan footprint with quarter-round bevel, gently domed top) ----------
const PILL = {L: 1.0, D: 0.56, R: 0.28, H: 0.16, B: 0.09};
function pillGeometry({L, D, R, H: Hm, B} = PILL, nx = 200, nz = 112) {
  const sd = (x, z) => Math.hypot(Math.max(Math.abs(x) - (L / 2 - R), 0), Math.max(Math.abs(z) - (D / 2 - R), 0)) - R;
  const pos = [], idx = [], ti = (i, j) => j * (nx + 1) + i;
  for (const side of [0, 1]) for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    let x = lerp(-L / 2, L / 2, i / nx), z = lerp(-D / 2, D / 2, j / nz), d = sd(x, z);
    if (d > 0) { const cx = clamp(x, -(L / 2 - R), L / 2 - R), cz = clamp(z, -(D / 2 - R), D / 2 - R), vx = x - cx, vz = z - cz, l = Math.hypot(vx, vz) || 1; x = cx + vx / l * R; z = cz + vz / l * R; d = 0; }
    const s = clamp(-d / B), bev = Math.sqrt(1 - (1 - s) ** 2), dome = .97 + .03 * clamp(-d / Math.min(R, D / 2)) ** .7;
    pos.push(x, side ? 0 : Hm * bev * dome, z);
  }
  const off = (nx + 1) * (nz + 1);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = ti(i, j), b = ti(i + 1, j), c = ti(i, j + 1), e = ti(i + 1, j + 1); idx.push(a, c, b, b, c, e, off + a, off + b, off + c, off + b, off + e, off + c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const slab = (wPx, hPx, rPx, h) => pillGeometry({L: pxm(wPx), D: pxm(hPx), R: pxm(rPx), H: h, B: Math.min(h * .75, pxm(rPx))}, 140, 60);

// ---------- soft contact shadow (light from the upper left: shadows fall down-right) ----------
function shadowTex(wPx, hPx, rPx, blurPx) {
  const pad = blurPx * 3, c = document.createElement('canvas'); c.width = Math.ceil(wPx + 2 * pad); c.height = Math.ceil(hPx + 2 * pad); const x = c.getContext('2d');
  x.filter = `blur(${blurPx}px)`; x.fillStyle = 'rgba(58,44,30,1)'; x.beginPath(); x.roundRect(pad, pad, wPx, hPx, rPx); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return {t, pad};
}
function shadow(wPx, hPx, {r = 12, blur = 10, alpha = .26, height = .006} = {}) {   // a decal under an object; returns a group to move with it
  const {t, pad} = shadowTex(wPx, hPx, r, blur);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(pxm(wPx + 2 * pad), pxm(hPx + 2 * pad)), new THREE.MeshBasicMaterial({map: t, transparent: true, opacity: alpha, depthWrite: false, toneMapped: false}));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 1;
  const g = new THREE.Group(); g.add(m); m.position.set(height * 1.1 + .006, .0006, height * 1.6 + .01); scene.add(g); return g;
}

// ---------- a photo plate lying on the table: its photo on top (canvas, so print/ink can be added), a thin body, a shadow ----------
// src: {img, rot: 0|90 (CW), flipY, nine: border px (9-slice stretch of a blank card)}
function plate(wPx, hPx, src, {k = 2, thick = .006, edge = '#EDEAE4', r = 12, shadowOpts = {}} = {}) {
  const cw = Math.round(wPx * k), ch = Math.round(hPx * k);
  const base = document.createElement('canvas'); base.width = cw; base.height = ch; const bx = base.getContext('2d'); bx.imageSmoothingQuality = 'high';
  const im = src.img;
  if (src.nine) {        // 9-slice: corners and edges of the photo kept at their scale, the middle stretched
    const b = src.nine, s = src.nineScale || .5, D = b * s * k, sw = im.width, sh = im.height;
    const P = [[0, b, 0, D], [b, sw - b, D, cw - D], [sw - b, sw, cw - D, cw]], Q = [[0, b, 0, D], [b, sh - b, D, ch - D], [sh - b, sh, ch - D, ch]];
    for (const [sx0, sx1, dx0, dx1] of P) for (const [sy0, sy1, dy0, dy1] of Q) bx.drawImage(im, sx0, sy0, sx1 - sx0, sy1 - sy0, dx0, dy0, dx1 - dx0, dy1 - dy0);
  } else {
    bx.save(); bx.translate(cw / 2, ch / 2); if (src.flipY) bx.scale(1, -1); if (src.rot) bx.rotate(src.rot * deg);
    const rw = src.rot ? ch : cw, rh = src.rot ? cw : ch; bx.drawImage(im, -rw / 2, -rh / 2, rw, rh); bx.restore();
  }
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
  const w = pxm(wPx), h = pxm(hPx), grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w * .985, thick, h * .985), new THREE.MeshStandardMaterial({color: edge, roughness: .9})); body.position.y = thick / 2; grp.add(body);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map: tex, toneMapped: false, alphaTest: .5})   // opaque (alpha-cut), so the glass refracts it);
  top.rotation.x = -Math.PI / 2; top.position.y = thick + .0015; top.renderOrder = 2; grp.add(top);
  const sh = shadow(wPx, hPx, {r, height: thick, ...shadowOpts}); grp.userData.shadow = sh;
  scene.add(grp);
  const o = {grp, ctx, tex, cw, ch, k, w, h, base, key: null, thick, top, sh, body};
  o.paint = (keyStr, fn = () => {}) => { if (keyStr === o.key) return; o.key = keyStr; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cw, ch); ctx.drawImage(base, 0, 0); ctx.setTransform(k, 0, 0, k, 0, 0); fn(ctx); tex.needsUpdate = true; };
  o.at = (x, y, z, rotY = 0) => { grp.position.set(x, y, z); grp.rotation.y = rotY; sh.position.set(x, y, z); sh.rotation.y = rotY; };
  o.place = (st, sx, sy, rotDeg = 0, y = 0) => { const [x, z] = wp(st, sx, sy); o.at(x, y, z, -rotDeg * deg); return o; };
  o.show = v => { grp.visible = v; sh.visible = v; };
  o.paint('init');
  return o;
}
function drawCheck(ctx, cx, cy, s, lw = 6, col = NAVY) {
  if (s <= 0) return; ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-12, 1); ctx.lineTo(-3.5, 9.5); ctx.lineTo(13, -9); ctx.stroke(); ctx.restore();
}
const text = (ctx, s, x, y, px, wt, col = NAVY, align = 'center') => { setFont(ctx, px, wt); ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x, y); };
const printed = (ctx, fn) => { ctx.save(); ctx.globalAlpha = .94; fn(); ctx.restore(); };   // ink on paper is never 100% opaque

// ---------- heartbeat (the logo's pulse) as a glass tube ----------
function pulsePts(cx, cy, w) { const u = w / 520; return [[-260, 0], [-90, 0], [-60, 0], [-40, -26], [-22, 30], [4, -84], [30, 40], [52, 0], [90, 0], [260, 0]].map(([x, y]) => [cx + x * u, cy + y * u]); }

// ---------- the twine (3D so it can be pulled through the eyelet; its surface is the twine photo) ----------
function makeRope(ptsXZ, radius = .016) {
  const curve = new THREE.CatmullRomCurve3(ptsXZ.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const c = document.createElement('canvas'); c.width = 1024; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#DCCDB3'; x.fillRect(0, 0, 1024, 64); x.drawImage(img.twine, 150, 22, 1000, 42, 0, 0, 1024, 64);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(curve.getLength() / .5, 1);
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({map: tex, roughness: .95, color: '#FFFFFF'})); mesh.castShadow = false; scene.add(mesh);
  return {mesh, curve, L: curve.getLength(), radius};
}
function ropeFrame(r, shift, lift) {
  const pts = [], n = 110, end = r.curve.getPointAt(1), endT = r.curve.getTangentAt(1).normalize();
  for (let i = 0; i <= n; i++) {
    const s = i / n * r.L + shift, p = s <= r.L ? r.curve.getPointAt(clamp(s / r.L)) : end.clone().addScaledVector(endT, s - r.L);
    p.y = r.radius + lift(p); pts.push(p);
  }
  r.mesh.geometry.dispose(); r.mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 220, r.radius, 8, false);
}

// ---------- init ----------
export async function init() {
  for (const [wt, f] of [[500, 'Medium'], [600, 'SemiBold'], [700, 'Bold']]) { const ff = new FontFace('G' + wt, `url(../../assets/fonts/Geist-${f}.ttf)`); await ff.load(); document.fonts.add(ff); }
  { const ff = new FontFace('HA', 'url(../../assets/fonts/HomemadeApple.woff2)'); await ff.load(); document.fonts.add(ff); }
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load ' + src)); i.src = src; });
  const P = '../../plates/';
  Object.assign(img, Object.fromEntries(await Promise.all([
    ['tile', 'table_tile.jpg'], ['room', 'room_back.jpg'], ['pad', 'notepad.png'], ['tag', 'price_tag.png'], ['card', 'card_blank.png'], ['rx', 'rx_pad.png'],
    ['member', 'member_card.png'], ['box', 'ship_box.png'], ['vial', 'vial_lying.png'], ['twine', 'twine.png'],
  ].map(async ([k, f]) => [k, await load(P + f)]))));
  img.logo = await load('../../images/logo_myfastrx_official.jpg');
  img.badge = await load('../../images/badge_bbb_a_rating_horizontal.jpg');

  glCanvas = document.createElement('canvas'); glCanvas.width = W; glCanvas.height = H;
  renderer = new THREE.WebGLRenderer({canvas: glCanvas, antialias: true, preserveDrawingBuffer: true});
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene(); scene.background = new THREE.Color('#EEF1F4');
  const pm = new THREE.PMREMGenerator(renderer);
  ENV = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environment = ENV; scene.environmentIntensity = .6;
  scene.add(new THREE.HemisphereLight('#FFFFFF', '#E6DDCF', .9));
  const key = new THREE.DirectionalLight('#FFF7EC', 1.6); key.position.set(-4, 8, -5); scene.add(key);

  // the table: two-board photo strips, each shifted along the grain so the repeat never lines up. Boards run along z.
  { const tpx = img.tile.width, tpy = img.tile.height, boardW = .62;                   // one photo board ~ .62 m (~316 px at the stations)
    const stripW = boardW * 2 * (tpy / 628), stripL = stripW * tpx / tpy;               // strip = the 2-board tile, rotated
    for (let i = -6; i <= 7; i++) {
      const t = new THREE.Texture(img.tile); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16;
      t.center.set(.5, .5); t.rotation = Math.PI / 2; const LEN = 34; t.repeat.set(LEN / stripL, 1); t.offset.set(((i * 0.37) % 1 + 1) % 1, 0); t.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(stripW, LEN), new THREE.MeshBasicMaterial({map: t, toneMapped: false}));
      m.rotation.x = -Math.PI / 2; m.position.set(i * stripW + .05, 0, 6); scene.add(m);
    }
    // window light: the table is a touch brighter towards the upper left, a touch deeper towards the lower right
    const c = document.createElement('canvas'); c.width = 512; c.height = 1024; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 512, 1024); g.addColorStop(0, 'rgba(255,252,246,0.10)'); g.addColorStop(.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(60,45,30,0.10)'); x.fillStyle = g; x.fillRect(0, 0, 512, 1024);
    const lt = new THREE.CanvasTexture(c); lt.colorSpace = THREE.SRGBColorSpace;
    for (const st of ['A', 'B', 'C']) { const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5.6), new THREE.MeshBasicMaterial({map: lt, transparent: true, depthWrite: false, toneMapped: false})); m.rotation.x = -Math.PI / 2; m.position.set(ST[st][0], .0003, ST[st][1] + .1); m.renderOrder = 0; scene.add(m); }
    // the table's far edge and the room beyond it (soft focus), seen only in the low opening
    const slab = new THREE.Mesh(new THREE.BoxGeometry(14 * 1.2, .12, 34), new THREE.MeshStandardMaterial({color: '#CFC3B2', roughness: .8})); slab.position.set(.05, -.0605, 6); scene.add(slab);
    const rc = document.createElement('canvas'); rc.width = img.room.width; rc.height = Math.round(img.room.height * .66); rc.getContext('2d').drawImage(img.room, 0, 0);   // the room only (above its table edge)
    const rt = new THREE.CanvasTexture(rc); rt.colorSpace = THREE.SRGBColorSpace;
    const room = new THREE.Mesh(new THREE.PlaneGeometry(64, 64 * rc.height / rc.width), new THREE.MeshBasicMaterial({map: rt, toneMapped: false}));
    room.position.set(-2, 64 * rc.height / rc.width / 2 - 2.5, 30); room.rotation.y = Math.PI; scene.add(room); M.room = room;
  }

  buildA(); buildB(); buildC(); buildD(); buildE();
  M.pill = new THREE.Mesh(pillGeometry(), tealGlass()); scene.add(M.pill);
  M.pillShadow = decal(1.4, .9, softDisc([[0, 'rgba(24,60,70,0.26)'], [.6, 'rgba(30,76,86,0.09)'], [1, 'rgba(30,80,90,0)']]));
  M.pillCaustic = decal(.62, .30, softDisc([[0, 'rgba(70,205,228,0.16)'], [.5, 'rgba(40,180,210,0.05)'], [1, 'rgba(40,180,210,0)']]), THREE.AdditiveBlending);

  camera = new THREE.PerspectiveCamera(40, W / H, .05, 120);
  composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  bokeh = new BokehPass(scene, camera, {focus: 2.5, aperture: 0, maxblur: .01}); composer.addPass(bokeh);
  composer.addPass(new OutputPass());

  out = document.createElement('canvas'); out.width = W; out.height = H; octx = out.getContext('2d', {willReadFrequently: true});
  { const c = octx; setFont(c, DISC.size, 500); const words = COPY.disclaimer.split(' '), lines = []; let cur = '';
    for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (c.measureText(tt).width <= DISC.w - 2 * DISC.pad) cur = tt; else { lines.push(cur); cur = w; } } lines.push(cur);
    const lh = Math.round(DISC.size * DISC.lh), h = lines.length * lh + 2 * DISC.pad + 4; disc = {lines, lh, h, w: DISC.w, x: CX - DISC.w / 2, y: DISC.bottom - h}; }
  // film grain: a few fixed, deterministic frames of fine luminance noise (applied under the HUD)
  let s = 12345; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let n = 0; n < 6; n++) { const c = document.createElement('canvas'); c.width = W / 2; c.height = H / 2; const x = c.getContext('2d'), d = x.createImageData(W / 2, H / 2);
    for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (rnd() + rnd() + rnd() - 1.5) * 26; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); grain.push(c); }
  return true;
}
function decal(w, h, map, blending = THREE.NormalBlending) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map, transparent: true, depthWrite: false, toneMapped: false, blending}));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 3; scene.add(m); return m;
}

// ===== A: the notepad (headline), the price tag on its twine =====
const TAG = {w: 400, h: 651, c: [510, 985]};          // portrait tag (the photo turned, eyelet near the bottom)
const PRICE0 = [510, 830];                           // the price block's origin = the pill's rest point
function buildA() {
  M.pad = plate(760, 564, {img: img.pad}, {thick: .012, edge: '#F1F1EE', r: 6}).place('A', CX, 372, -1.2);
  const k = M.pad.k;
  M.inkA = [0, 1].map(i => makeInk({w: M.pad.cw, h: M.pad.ch, seedN: 11 + i, inkColor: '#1E2B4A',
    scrawl: [{s: COPY.head1[i], x: (i ? 110 : 130) * k, y: [250, 330][i] * k, px: [48, 44][i] * k, flourish: i === 1}],
    target: [{s: COPY.head1[i], x: 380 * k, y: [240, 322][i] * k, px: 70 * k, wt: 700}]}));
  M.tag = plate(TAG.w, TAG.h, {img: img.tag, rot: 90, flipY: true}, {thick: .008, edge: '#ECE9E3', r: 18}).place('A', TAG.c[0], TAG.c[1]);
  M.tag.paint('print', x => printed(x, () => {
    const ox = PRICE0[0] - (TAG.c[0] - TAG.w / 2), oy = PRICE0[1] - (TAG.c[1] - TAG.h / 2);
    text(x, COPY.startingAt, ox, oy - 66, 44, 500); text(x, COPY.price, ox, oy + 88, 172, 700);
    COPY.qual.forEach((q, i) => text(x, q, ox, oy + 186 + 42 * i, 34, 500));
  }));
  // the twine: knotted through the eyelet (photo hole at tag-local (254, 479)), trailing off the lower right
  const ey = [TAG.c[0] - TAG.w / 2 + 254, TAG.c[1] - TAG.h / 2 + 479];
  const tp = [[ey[0], ey[1]], [ey[0] + 26, ey[1] + 30], [ey[0] + 70, ey[1] + 70], [ey[0] + 150, ey[1] + 110], [ey[0] + 280, ey[1] + 150], [ey[0] + 440, ey[1] + 160], [ey[0] + 640, ey[1] + 150], [ey[0] + 900, ey[1] + 120]].map(([sx, sy]) => wp('A', sx, sy));
  M.rope = makeRope(tp);
  // the glass heartbeat: lying across the table between A and B, so the pans fly over it
  const hp = pulsePts(CX, 2030, 980).map(([sx, sy]) => { const [x, z] = wp('A', sx, sy); return new THREE.Vector3(x, .03, z); });
  M.pulse = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp, false, 'catmullrom', .08), 300, .03, 24, false), blueGlass()); scene.add(M.pulse);
  const [px, pz] = wp('A', CX + 24, 2052);
  M.pulseShadow = decal(pxm(1100), pxm(220), softDisc([[0, 'rgba(40,70,120,0.16)'], [.6, 'rgba(40,70,120,0.05)'], [1, 'rgba(40,70,120,0)']])); M.pulseShadow.position.set(px, .0012, pz);
}

// ===== B =====
const CARD9 = {nine: 70, nineScale: .5};
function buildB() {
  M.head2 = plate(860, 250, {img: img.card, ...CARD9}, {thick: .008, r: 10}).place('B', CX, 398, .8);
  M.member = plate(400, 241, {img: img.member}, {thick: .01, edge: '#1E2B45', r: 16});
  M.togCard = plate(300, 230, {img: img.card, ...CARD9}, {thick: .008, r: 10}).place('B', 300, 700, -1.5);
  M.togTrack = new THREE.Mesh(slab(220, 110, 55, .05), readGlass()); scene.add(M.togTrack);
  M.togKnob = new THREE.Mesh(new THREE.SphereGeometry(pxm(44), 48, 24), new THREE.MeshPhysicalMaterial({envMap: ENV, envMapRotation: ENV_ROT, envMapIntensity: .5, color: '#FFFFFF', roughness: .25})); M.togKnob.scale.y = .55; scene.add(M.togKnob);
  M.togKnobShadow = decal(pxm(120), pxm(120), softDisc([[0, 'rgba(40,40,50,0.22)'], [1, 'rgba(40,40,50,0)']]));
  M.btnCard = plate(700, 190, {img: img.card, ...CARD9}, {thick: .008, r: 10});
  M.btnGlass = new THREE.Mesh(slab(560, 150, 60, .07), readGlass()); scene.add(M.btnGlass);
  M.btnCheck = new THREE.Mesh(new THREE.CylinderGeometry(pxm(34), pxm(34), .03, 48), blueGlass()); scene.add(M.btnCheck);
}

// ===== C =====
const COLS = [240, 510, 790], LABEL_Y = 905;
function buildC() {
  M.coverCard = plate(700, 150, {img: img.card, ...CARD9}, {thick: .008, r: 10}).place('C', CX, 300, -.6);
  M.rx = plate(230, 342, {img: img.rx}, {thick: .014, edge: '#F2F2F0', r: 4}).place('C', COLS[0], 600, -3);
  M.vial = plate(150, 406, {img: img.vial}, {thick: .002, edge: '#FFFFFF', r: 30, shadowOpts: {alpha: .30, blur: 16, height: .15}}); M.vial.body.visible = false;
  M.box = plate(260, 185, {img: img.box}, {thick: .2, edge: '#B98E62', r: 4, shadowOpts: {alpha: .32, blur: 18, height: .2}});
  M.list = plate(820, 330, {img: img.card, ...CARD9}, {thick: .008, r: 10}).place('C', CX, 1000, .4);
  // label groups: [check + label] centred on each column
  const cx = M.list.ctx; setFont(cx, 34, 600);
  M.labels = COPY.checks.map((s, i) => { const w = cx.measureText(s).width, gw = 40 + 12 + w, x0 = COLS[i] - gw / 2; return {s, check: x0 + 20, x: x0 + 52}; });
  M.checks = M.labels.map(L => { const m = new THREE.Mesh(new THREE.CylinderGeometry(pxm(24), pxm(24), .022, 48), blueGlass()); scene.add(m); return m; });
  // the morph overlay: a transparent ink plane over the Rx pad and the first label (scrawl on the pad -> the label)
  { const wpx = 820, hpx = 520, k = 2, c = document.createElement('canvas'); c.width = wpx * k; c.height = hpx * k;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(pxm(wpx), pxm(hpx)), new THREE.MeshBasicMaterial({map: t, transparent: true, depthWrite: false, toneMapped: false}));
    m.rotation.x = -Math.PI / 2; const [x, z] = wp('C', 100 + wpx / 2, 420 + hpx / 2); m.position.set(x, .018, z); m.renderOrder = 4; scene.add(m);
    M.inkCv = {c, ctx: c.getContext('2d'), t, key: null};
    const L0 = M.labels[0];
    M.inkC = makeInk({w: c.width, h: c.height, seedN: 23, step: 2, inkColor: '#1E2B4A',
      scrawl: [{s: 'Pt rvw ok', x: (150 - 100) * k, y: (575 - 420) * k, px: 30 * k}, {s: 'q24h Dx', x: (158 - 100) * k, y: (628 - 420) * k, px: 26 * k, flourish: true}],
      target: [{s: L0.s, x: (L0.x - 100) * k, y: (LABEL_Y - 420) * k, px: 34 * k, wt: 600, align: 'left'}]}); }
}

// ===== D: the dose slider card =====
function buildD() {
  M.slider = plate(720, 300, {img: img.card, ...CARD9}, {thick: .008, r: 10});
  M.rail = new THREE.Mesh(slab(620, 46, 23, .04), readGlass()); scene.add(M.rail);
  M.knob = new THREE.Mesh(new THREE.SphereGeometry(pxm(40), 48, 24), glassMat({thickness: .08, attenuationColor: new THREE.Color('#9fd8ff'), attenuationDistance: .3, envMapIntensity: .5})); M.knob.scale.y = .75; scene.add(M.knob);
  M.knobShadow = decal(pxm(110), pxm(110), softDisc([[0, 'rgba(30,60,110,0.22)'], [1, 'rgba(30,60,110,0)']]));
}

// ===== E: the end card (unlit, exact pixels), with a glass CTA key =====
function buildE() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  const y = .004, d = TOP.h - y, vh = 2 * d * Math.tan(TOP.fov / 2 * deg), vw = vh * W / H;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(vw, vh), new THREE.MeshBasicMaterial({map: t, toneMapped: false}));
  m.rotation.x = -Math.PI / 2; m.position.set(ST.E[0], y, ST.E[1]); scene.add(m);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(vw, y - .002, vh), new THREE.MeshStandardMaterial({color: '#F2F2F2', roughness: .9})); edge.position.set(ST.E[0], (y - .002) / 2, ST.E[1]); scene.add(edge);
  M.endShadow = shadow(vw / PX, vh / PX, {r: 6, blur: 14, alpha: .22, height: .004}); M.endShadow.position.set(ST.E[0], 0, ST.E[1]);
  M.end = {c, ctx: c.getContext('2d'), t, key: null, pxE: vw / W, y};
  M.cta = new THREE.Mesh(pillGeometry({L: vw / W * 668, D: vw / W * 144, R: vw / W * 72, H: .06, B: .045}, 160, 48), readGlass({attenuationColor: new THREE.Color('#cfe3ff'), attenuationDistance: .8})); scene.add(M.cta);
}

// ---------- the pill's path ----------
const TAG0 = wp('A', PRICE0[0], PRICE0[1]);
function path(K, t) {   // one eased move through waypoints (Catmull-Rom in time)
  const t0 = K[0][0], t1 = K[K.length - 1][0], u = e2(prog(t, t0, t1)), tt = lerp(t0, t1, u);
  let i = 0; while (i < K.length - 2 && tt > K[i + 1][0]) i++;
  const a = K[Math.max(0, i - 1)], b = K[i], c = K[i + 1], d = K[Math.min(K.length - 1, i + 2)], s = clamp((tt - b[0]) / (c[0] - b[0]));
  const cr = (p0, p1, p2, p3) => .5 * ((2 * p1) + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s + (-p0 + 3 * p1 - 3 * p2 + p3) * s * s * s);
  return {x: cr(a[1], b[1], c[1], d[1]), z: cr(a[2], b[2], c[2], d[2])};
}
function pillPose(t) {
  let x, z, yaw = 0, sq = 0;
  if (t < O.land) { const u = eOut(prog(t, O.touch, O.land)); x = lerp(-2.6, TAG0[0], u); z = TAG0[1]; yaw = -6 * deg * (1 - u); }
  else if (t < C.pan[0].t0) { x = TAG0[0]; z = TAG0[1]; }
  else if (t < 8.6) {
    const K = [[C.pan[0].t0, TAG0[0], TAG0[1]], [7.35, 1.2, 2.0], [7.62, 1.05, 2.95], [C.cardPush, .74, 3.40], [8.6, 1.8, 4.70]];
    ({x, z} = path(K, t)); yaw = t < C.cardPush ? lerp(0, -38, prog(t, C.pan[0].t0, 7.62)) * deg : lerp(-38, -62, prog(t, C.cardPush, 8.6)) * deg;
  } else if (t < C.pan[2].t0) { x = 1.8; z = 4.70; yaw = -62 * deg; }
  else if (t < C.pillLand) {
    const K = [[C.pan[2].t0, 1.8, 4.70], [16.85, 1.2, 2.1], [C.pillLand, TAG0[0], TAG0[1]]];
    ({x, z} = path(K, t)); yaw = lerp(-62, 0, eIO(prog(t, C.pan[2].t0, C.pillLand))) * deg;
  } else { x = TAG0[0]; z = TAG0[1]; }
  sq += wob(t, O.touch - .02, .11, .11, .28) + wob(t, O.land - .04, .07, .17, .25) + wob(t, C.cardPush, .05, .1, .22) + wob(t, C.pillLand - .03, .07, .15, .25);
  sq += .024 * Math.sin(2 * Math.PI * t / 1.2) * (t < O.land ? 1 : .45) * (t < C.finalStill ? 1 : 0);
  const onTag = Math.abs(x - M.tag.grp.position.x) < M.tag.w / 2 + .1 && Math.abs(z - M.tag.grp.position.z) < M.tag.h / 2 + .1;
  return {x, z, yaw, y: onTag ? M.tag.thick + .002 : 0, sy: 1 - sq, sxz: 1 + sq * .5};
}

// ---------- the camera ----------
const _m = new THREE.Matrix4();
function lookQ(pos, look, up) { _m.lookAt(pos, look, up); return new THREE.Quaternion().setFromRotationMatrix(_m); }
function camAt(t, pill) {
  const upZ = new THREE.Vector3(0, 0, -1);
  if (t < O.dive) {
    const th = t < O.swirl[0] ? lerp(1.18 * Math.PI, .80 * Math.PI, eOut(prog(t, 0, O.swirl[0]))) : t < O.over[0] ? lerp(.80 * Math.PI, .14 * Math.PI, eIO(prog(t, ...O.swirl))) : lerp(.14 * Math.PI, 0, eIO(prog(t, ...O.over)));
    const el = (t < O.swirl[0] ? lerp(7, 11, prog(t, 0, O.swirl[0])) : t < O.over[0] ? lerp(11, 30, e2(prog(t, ...O.swirl))) : lerp(30, 90 - TOP.tilt, eIO(prog(t, ...O.over)))) * deg;
    const r = t < O.swirl[0] ? lerp(2.7, 2.3, eOut(prog(t, 0, O.swirl[0]))) : t < O.over[0] ? lerp(2.4, 2.15, prog(t, ...O.swirl)) : lerp(2.15, TOP.h / Math.cos(TOP.tilt * deg), eIO(prog(t, ...O.over)));
    const k = eIO(prog(t, ...O.over));
    const tgt = new THREE.Vector3(lerp(pill.x, ST.A[0], k), lerp(.08, 0, k), lerp(pill.z, ST.A[1], k));
    const pos = tgt.clone().add(new THREE.Vector3(r * Math.cos(el) * Math.sin(th), r * Math.sin(el), r * Math.cos(el) * Math.cos(th)));
    const hf = new THREE.Vector3(-Math.sin(th), 0, -Math.cos(th)), ku = clamp((el / deg - 50) / 36);
    const up = new THREE.Vector3(0, 1, 0).multiplyScalar(1 - ku).addScaledVector(hf, ku).normalize();
    return {pos, q: lookQ(pos, tgt, up), fov: lerp(40, TOP.fov, k), tgt, focus: pos.distanceTo(new THREE.Vector3(pill.x, .08, pill.z)), dof: 1 - k};
  }
  // stations: a few degrees of tilt (the camera sits a little towards the viewer) for depth; exactly top-down on E
  let cx = ST.A[0], cz = ST.A[1], lift = 0, tilt = TOP.tilt;
  for (const Pn of C.pan) {
    if (t >= Pn.t1) { cx = ST[Pn.to][0]; cz = ST[Pn.to][1]; if (Pn.to === 'E') tilt = 0; }
    else if (t >= Pn.t0) { const u = eIO(prog(t, Pn.t0, Pn.t1)); cx = lerp(ST[Pn.from][0], ST[Pn.to][0], u); cz = lerp(ST[Pn.from][1], ST[Pn.to][1], u); lift = .8 * Math.sin(Math.PI * u); if (Pn.to === 'E') tilt = lerp(TOP.tilt, 0, u); break; }
    else break;
  }
  const d = TOP.h + lift, a = tilt * deg;
  const pos = new THREE.Vector3(cx, d * Math.cos(a), cz + d * Math.sin(a)), tgt = new THREE.Vector3(cx, 0, cz);
  return {pos, q: lookQ(pos, tgt, upZ), fov: TOP.fov, tgt, focus: d, dof: 0};
}

// ---------- per frame ----------
export function render(t) {
  const P = pillPose(t);
  M.pill.position.set(P.x, P.y, P.z); M.pill.rotation.y = P.yaw; M.pill.scale.set(P.sxz, P.sy, P.sxz);
  M.pill.material.envMapIntensity = lerp(.3, .03, eIO(prog(t, O.over[0], O.dive)));
  M.pillShadow.position.set(P.x + .07, P.y + .0012, P.z + .08); M.pillShadow.rotation.z = P.yaw;
  M.pillCaustic.position.set(P.x + Math.cos(P.yaw) * .52 + .08, P.y + .0016, P.z + .36); M.pillCaustic.rotation.z = P.yaw;

  // --- A ---
  M.pad.paint('A' + Math.round(t * 30), x => { x.setTransform(1, 0, 0, 1, 0, 0); M.inkA.forEach((ink, i) => { const c = C.inkA[i]; ink.draw(x, t, [c.t0, c.t1], c.morph); }); });
  { const u = prog(t, C.unstring.t0, C.unstring.t1), shift = eIn(u) * (M.rope.L + 1.4), tg = M.tag.grp.position;
    ropeFrame(M.rope, shift, q => Math.abs(q.x - tg.x) < M.tag.w / 2 && Math.abs(q.z - tg.z) < M.tag.h / 2 ? M.tag.thick : 0); M.rope.mesh.visible = u < 1; }

  // --- B ---
  M.head2.paint('B' + Math.round(t * 30), x => printed(x, () => COPY.head2.forEach((s, i) => maskLine(x, s, 430, [83, 165][i], 70, 700, NAVY, {enter: eOut(prog(t, C.head2[i].t0, C.head2[i].land))}))));
  { const [x0, z0] = wp('B', 640, 700), d = t - C.cardPush, s = d <= 0 ? 0 : (1 - Math.exp(-d / .28)) * 2.1;
    M.member.at(x0 - s * .62, 0, z0 + s * .78, -4 * deg + (d > 0 ? (1 - Math.exp(-d / .3)) * 1.9 : 0)); M.member.show(!(d > 1.3)); }
  { const off = eIO(prog(t, C.toggleOff.t0, C.toggleOff.t1)), [tx, tz] = wp('B', 300, 672), yb = M.togCard.thick;
    M.togTrack.position.set(tx, yb, tz); M.togKnob.position.set(tx + pxm(lerp(55, -55, off)), yb + pxm(44) * .55, tz); M.togKnobShadow.position.set(M.togKnob.position.x + .02, yb + .002, tz + .03);
    M.togCard.paint('T' + Math.round(off * 40), x => printed(x, () => {
      const col = off < .5 ? `rgb(${lerp(0, 196, off * 2) | 0},${lerp(113, 205, off * 2) | 0},${lerp(254, 216, off * 2) | 0})` : '#C4CDD8';
      x.fillStyle = col; x.beginPath(); x.roundRect(150 - 104, 87 - 52, 208, 104, 52); x.fill(); text(x, COPY.autoRefill, 150, 200, 34, 600); })); }
  { const u = spring(t, C.btnIn.t0, .38, .09), [bx, bz] = wp('B', CX, 960), dx = (1 - u) * 1.6, yb = M.btnCard.thick, vis = t >= C.btnIn.t0 - .01;
    M.btnCard.at(bx + dx, 0, bz); M.btnCard.show(vis);
    const press = t > C.btnPress - .09 && t < C.btnPress ? prog(t, C.btnPress - .09, C.btnPress) : t >= C.btnPress ? 1 - spring(t, C.btnPress, .26, .05) : 0;
    M.btnGlass.position.set(bx + dx - pxm(40), yb, bz); M.btnGlass.scale.y = 1 - .45 * press; M.btnGlass.visible = vis;
    const ck = spring(t, C.checkPop, .3, .07);
    M.btnCheck.position.set(bx + dx + pxm(250), yb + .015, bz); M.btnCheck.scale.set(Math.max(.001, ck), 1, Math.max(.001, ck)); M.btnCheck.visible = ck > .01;
    M.btnCard.paint('R' + Math.round(ck * 30), x => printed(x, () => { text(x, COPY.button, 310, 113, 50, 600); drawCheck(x, 600, 95, ck, 6); })); }

  // --- C ---
  M.coverCard.paint('C' + Math.round(t * 30), x => printed(x, () => maskLine(x, COPY.covers, 350, 96, 60, 700, NAVY, {enter: eOut(prog(t, C.coversIn.t0, C.coversIn.land))})));
  { const I = M.inkCv, keyS = 'I' + Math.round(t * 30);
    if (I.key !== keyS) { I.key = keyS; I.ctx.clearRect(0, 0, I.c.width, I.c.height); I.ctx.globalAlpha = .94; M.inkC.draw(I.ctx, t, [C.inkC.t0, C.inkC.t1], C.inkC.morph); I.ctx.globalAlpha = 1; I.t.needsUpdate = true; } }
  const ckS = C.checks.map(c => spring(t, c, .3, .07));
  const lblU = [1, 2].map(i => eOut(prog(t, C.checks[i] - .2, C.checks[i] + .12)));
  const clU = eOut(prog(t, C.claim24.t0, C.claim24.land)), niU = eOut(prog(t, C.noIns.t0 + .1, C.noIns.land + .1));
  M.list.paint('L' + [...ckS, ...lblU, clU, niU].map(v => Math.round(v * 30)).join('.'), x => printed(x, () => {
    const oy = 1000 - 165, ox = 100;   // card origin (layout)
    M.labels.forEach((L, i) => drawCheck(x, L.check - ox, LABEL_Y - 11 - oy, ckS[i], 5));
    [1, 2].forEach(i => maskLine(x, M.labels[i].s, M.labels[i].x - ox, LABEL_Y - oy, 34, 600, NAVY, {align: 'left', enter: lblU[i - 1]}));
    maskLine(x, COPY.claim24, CX - ox, 968 - oy, 26, 500, NAVY, {enter: clU});
    maskLine(x, COPY.noIns, CX - ox, 1050 - oy, 34, 600, NAVY, {enter: niU});
  }));
  M.labels.forEach((L, i) => { const s = ckS[i], [x, z] = wp('C', L.check, LABEL_Y - 11); M.checks[i].position.set(x, M.list.thick + .011, z); M.checks[i].scale.set(Math.max(.001, s), 1, Math.max(.001, s)); M.checks[i].visible = s > .01; });
  { // the vial drops in (from a little height: bigger, softer shadow), settles
    const [vx, vz] = wp('C', COLS[1], 600), d = t - C.vialIn.t0, fall = C.vialIn.land - C.vialIn.t0, R = .15;
    const y = d < fall ? R + .9 * (1 - (d / fall) ** 2) : R + Math.abs(wob(t, C.vialIn.land, .025, .08, .26));
    M.vial.at(vx, y - M.vial.thick, vz, (d < fall ? (1 - d / fall) * .35 : wob(t, C.vialIn.land, .03, .12, .3)) - 2 * deg); M.vial.show(d >= 0);
    M.vial.sh.position.set(vx, 0, vz); M.vial.sh.children[0].material.opacity = .30 * clamp(1 - (y - R) / 1.2); }
  { const [bx, bz] = wp('C', COLS[2], 610), d = t - C.boxIn.t0, fall = C.boxIn.land - C.boxIn.t0;
    const y = d < fall ? .8 * (1 - (d / fall) ** 2) : Math.abs(wob(t, C.boxIn.land, .04, .09, .3));
    M.box.at(bx, y, bz, -3 * deg + (d < fall ? (1 - d / fall) * .25 : 0)); M.box.show(d >= 0); M.box.sh.position.set(bx, 0, bz); M.box.sh.children[0].material.opacity = .32 * clamp(1 - y / 1.0); }

  // --- D ---
  { const u = spring(t, C.sliderIn.t0, .38, .09), [sx, sz] = wp('D', CX, 1010), dz = (1 - u) * 1.4, vis = t >= C.sliderIn.t0;
    M.slider.at(sx, 0, sz + dz); M.slider.show(vis);
    const kv = eIO(prog(t, C.drag.t0, C.drag.t1)), kxPx = lerp(-290, 290, kv), dl = C.doseLine;
    M.slider.paint('S' + Math.round(kv * 60) + '.' + Math.round(eOut(prog(t, dl.t0, dl.land + .1)) * 30), x => printed(x, () => {
      x.fillStyle = '#D9E0E8'; x.beginPath(); x.roundRect(60, 54, 600, 32, 16); x.fill();
      x.fillStyle = BLUE; x.beginPath(); x.roundRect(60, 54, Math.max(32, 300 + kxPx), 32, 16); x.fill();
      text(x, COPY.dose[0], 60, 130, 28, 500, NAVY, 'left'); text(x, COPY.dose[1], 660, 130, 28, 500, NAVY, 'right');
      COPY.doseLine.forEach((s, i) => maskLine(x, s, 360, 222 + i * 56, 46, 600, NAVY, {enter: eOut(prog(t, dl.t0 + i * .1, dl.land + i * .1))}));
    }));
    const [rx, rz] = wp('D', CX, 1010 - 150 + 70), yb = M.slider.thick; M.rail.position.set(rx, yb, rz + dz); M.rail.visible = vis;
    M.knob.position.set(rx + pxm(kxPx), yb + pxm(40) * .75, rz + dz); M.knob.visible = vis; M.knobShadow.position.set(M.knob.position.x + .03, yb + .002, rz + dz + .04); M.knobShadow.visible = vis; }

  // --- E ---
  { const E = M.end, tagU = C.tag.map(c => eOut(prog(t, c.t0, c.land))), ctaU = eOut(prog(t, C.ctaIn.t0 + .15, C.ctaIn.land + .15)), urlU = eOut(prog(t, C.urlIn.t0, C.urlIn.land));
    const bs = t >= C.finalStill - .1 ? 1 : spring(t, C.badgePop - .35, .36, .09), cs = t >= C.finalStill - .1 ? 1 : spring(t, C.ctaIn.t0, .34, .08);
    const keyS = [...tagU, ctaU, urlU, bs, cs].map(v => Math.round(v * 60)).join('.');
    if (E.key !== keyS) { E.key = keyS; const x = E.ctx; x.fillStyle = '#F7F7F7'; x.fillRect(0, 0, W, H);
      const lw = Math.round(img.logo.width * .5), lh = Math.round(img.logo.height * .5); x.imageSmoothingQuality = 'high'; x.drawImage(img.logo, Math.round(CX - lw / 2), Math.round(400 - lh / 2), lw, lh);
      COPY.tag.forEach((s, i) => maskLine(x, s, CX, [606, 682][i], 72, 700, NAVY, {enter: tagU[i]}));
      if (cs > .001) { x.fillStyle = BLUE; x.beginPath(); x.roundRect(CX - 324 * cs, 790 - 64 * cs, 648 * cs, 128 * cs, 64 * cs); x.fill(); }
      maskLine(x, COPY.cta, CX, 808, 50, 600, '#FFFFFF', {enter: ctaU});
      maskLine(x, COPY.url, CX, 930, 52, 600, NAVY, {enter: urlU});
      if (bs > .001) { const bw = 280, bh = Math.round(img.badge.height * bw / img.badge.width); if (Math.abs(bs - 1) < 1e-4) x.drawImage(img.badge, CX - bw / 2, 956, bw, bh); else { x.save(); x.translate(CX, 956 + bh / 2); x.scale(bs, bs); x.drawImage(img.badge, -bw / 2, -bh / 2, bw, bh); x.restore(); } }
      E.t.needsUpdate = true; }
    const press = t > C.ctaClick - .08 && t < C.ctaClick ? prog(t, C.ctaClick - .08, C.ctaClick) : t >= C.ctaClick && t < C.finalStill - .1 ? 1 - spring(t, C.ctaClick, .26, .05) : 0;
    M.cta.position.set(ST.E[0] + (CX - 540) * E.pxE, E.y, ST.E[1] + (790 - 960) * E.pxE); M.cta.scale.set(Math.max(.001, cs), 1 - .4 * press, Math.max(.001, cs)); M.cta.visible = cs > .01; }

  // --- camera, depth of field ---
  const cam = camAt(t, P);
  camera.position.copy(cam.pos); camera.quaternion.copy(cam.q); camera.fov = cam.fov; camera.updateProjectionMatrix();
  bokeh.enabled = cam.dof > .001;
  bokeh.uniforms.focus.value = cam.focus; bokeh.uniforms.aperture.value = .0026 * cam.dof; bokeh.uniforms.maxblur.value = .009 * cam.dof;
  composer.render();

  // --- HUD: grain (frozen for the final hold), caption, fine print ---
  octx.setTransform(1, 0, 0, 1, 0, 0); octx.globalAlpha = 1; octx.globalCompositeOperation = 'source-over'; octx.drawImage(glCanvas, 0, 0);
  const gi = t >= C.finalStill ? 0 : Math.floor(t * 30) % grain.length;
  octx.globalCompositeOperation = 'overlay'; octx.globalAlpha = .35; octx.drawImage(grain[gi], 0, 0, W, H); octx.globalAlpha = 1; octx.globalCompositeOperation = 'source-over';
  captions(octx, t); drawDisclaimer(octx, t);
  return out;
}
function captions(ctx, t) {
  const c = CAPTIONS.find(c => t >= c.t0 && t < c.t1); if (!c) return;
  const enter = eOut(prog(t, c.t0, c.t0 + .28)), exit = eIn(prog(t, c.t1 - .16, c.t1));
  c.lines.forEach((s, i) => maskLine(ctx, s, CX, 1206 - (c.lines.length - 1 - i) * 56, 44, 600, NAVY, {enter, exit}));
}
function drawDisclaimer(ctx, t) {
  if (t < C.discIn.t0) return;
  const u = eOut(prog(t, C.discIn.t0, C.discIn.land));
  ctx.save(); ctx.beginPath(); ctx.rect(disc.x - 4, disc.y - 4, DISC.w + 8, disc.h + 8); ctx.clip();
  ctx.translate(0, Math.round((1 - u) * (disc.h + 12)));
  ctx.fillStyle = NAVY; ctx.beginPath(); ctx.roundRect(disc.x, disc.y, DISC.w, disc.h, DISC.r); ctx.fill();
  setFont(ctx, DISC.size, 500); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  disc.lines.forEach((s, i) => ctx.fillText(s, disc.x + DISC.pad, disc.y + DISC.pad + 2 + DISC.size * .92 + i * disc.lh));
  ctx.restore();
}
export const info = () => ({disc, COPY, PX, TAG0, CX, PRICE0, TAG});
