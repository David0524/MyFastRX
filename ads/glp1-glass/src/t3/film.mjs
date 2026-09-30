// MyFastRx "Liquid Glass" Version A v4 - "Everything on the table". One continuous three.js camera over a real table.
//  0.00-4.25  the fly-over: in low from the far side, round the gliding glass pill, over the top to top-down
//  A  4.25    notepad: a doctor's scrawl flows into "GLP-1 care, / no strings attached."; the tag's twine pulls free
//  B  7.72    the pill knocks a membership card off the table; the glass auto-refill toggle flips off; "Request refill"
//  C  12.62   "One price covers": Rx-pad scrawl -> "Provider review", the vial rolls in, the box drops in, glass checks
//  D  17.15   back to the price tag; the pill lands on $69; a glass dose slider moves and the price holds
//  E  21.05   the end card: the camera settles so the card fills the frame exactly (logo and badge pixels untouched)
// HUD (2D, screen space): the one caption and the end-card fine print.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as TL from '../timeline.mjs';
import {oak, paperCanvas, kraftCanvas, twineTexture, softDisc, setFont, maskLine, NAVY, BLUE} from './tex.mjs';
import {makeInk} from './ink.mjs';

const {W, H, CUES: C, OPEN: O, STATIONS: ST, CAPTIONS} = TL;
const TOP = {h: 5.8, fov: 36};
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
  claim24: ['Online visit in minutes.', 'Review typically', 'within 24 hours.'],
  noIns: 'No insurance needed. No contracts.',
  dose: ['Lower dose', 'Higher dose'],
  doseLine: ["Your price doesn't climb", 'as your dose does.'],
  tag: ['Clear pricing.', 'Clear care.'],
  cta: 'See if you qualify', url: 'MyFastRx.com',
  membership: 'MEMBERSHIP',
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
// layout px (as seen from the top-down camera at a station) -> world x, z
const wp = (st, sx, sy) => [ST[st][0] + (sx - 540) * PX, ST[st][1] + (sy - 960) * PX];
const pxm = p => p * PX;

let renderer, scene, camera, key, glCanvas, out, octx, img = {}, disc;
const M = {};   // meshes and state

// ---------- materials ----------
const glassMat = (o = {}) => new THREE.MeshPhysicalMaterial({color: '#ffffff', transmission: 1, thickness: .05, roughness: .04, ior: 1.42, dispersion: .12,
  clearcoat: .4, clearcoatRoughness: .05, specularIntensity: .7, envMapIntensity: .8, ...o});
const tealGlass = () => glassMat({thickness: .07, ior: 1.38, dispersion: .14, attenuationColor: new THREE.Color('#14A3B8'), attenuationDistance: .42, specularIntensity: .55, envMapIntensity: .55, clearcoat: .35, roughness: .03});
const blueGlass = () => glassMat({attenuationColor: new THREE.Color('#5AA2FF'), attenuationDistance: .5});

// ---------- the pill (heightfield slab: capsule footprint, quarter-round bevel, gently domed top) ----------
const PILL = {L: 1.0, D: 0.56, R: 0.28, H: 0.16, B: 0.09};
function pillGeometry() {
  const {L, D, R, H: Hm, B} = PILL, nx = 200, nz = 112;
  const sd = (x, z) => Math.hypot(Math.max(Math.abs(x) - (L / 2 - R), 0), z) - R;
  const pos = [], idx = [], ti = (i, j) => j * (nx + 1) + i;
  for (const side of [0, 1]) for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    let x = lerp(-L / 2, L / 2, i / nx), z = lerp(-D / 2, D / 2, j / nz), d = sd(x, z);
    if (d > 0) { const cx = clamp(x, -(L / 2 - R), L / 2 - R), vx = x - cx, l = Math.hypot(vx, z) || 1; x = cx + vx / l * R; z = z / l * R; d = 0; }
    const s = clamp(-d / B), bev = Math.sqrt(1 - (1 - s) ** 2), dome = .97 + .03 * clamp(-d / R) ** .7;
    pos.push(x, side ? 0 : Hm * bev * dome, z);
  }
  const off = (nx + 1) * (nz + 1);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = ti(i, j), b = ti(i + 1, j), c = ti(i, j + 1), e = ti(i + 1, j + 1); idx.push(a, c, b, b, c, e, off + a, off + b, off + c, off + b, off + e, off + c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

// ---------- a paper card lying on the table: printed top (canvas texture) + thin body that casts a shadow ----------
function card(wPx, hPx, {color = '#FBFAF7', ruled = null, thick = .006, k = 2, fibers = true, rough = .9, radius = 10} = {}) {
  const cw = Math.round(wPx * k), ch = Math.round(hPx * k);
  const base = paperCanvas(cw, ch, {color, fibers, ruled: ruled && {...ruled, top: ruled.top * k, step: ruled.step * k, margin: ruled.margin && ruled.margin * k, width: 2}});
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
  const w = pxm(wPx), h = pxm(hPx);
  const grp = new THREE.Group();
  const shape = new THREE.Shape(), r = pxm(radius);
  shape.moveTo(-w / 2 + r, -h / 2); shape.lineTo(w / 2 - r, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); shape.lineTo(w / 2, h / 2 - r); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); shape.lineTo(-w / 2, -h / 2 + r); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {depth: thick, bevelEnabled: false}), new THREE.MeshStandardMaterial({color, roughness: rough}));
  body.rotation.x = -Math.PI / 2; body.castShadow = true; body.receiveShadow = true; grp.add(body);
  const topG = new THREE.ShapeGeometry(shape); const uv = topG.attributes.uv, p = topG.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5);
  const top = new THREE.Mesh(topG, new THREE.MeshStandardMaterial({map: tex, roughness: rough}));
  top.rotation.x = -Math.PI / 2; top.position.y = thick + .0004; top.receiveShadow = true; grp.add(top);
  const o = {grp, ctx, tex, cw, ch, k, w, h, base, key: null, thick, top, body};
  // redraw with fn(ctx) in layout px (origin = card top-left) when the key changes
  o.paint = (keyStr, fn) => { if (keyStr === o.key) return; o.key = keyStr; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(base, 0, 0); ctx.setTransform(k, 0, 0, k, 0, 0); fn(ctx); tex.needsUpdate = true; };
  return o;
}
function place(obj, st, sx, sy, rotDeg = 0, y = 0) { const [x, z] = wp(st, sx, sy); obj.position.set(x, y, z); obj.rotation.y = -rotDeg * deg; return obj; }
function drawCheck(ctx, cx, cy, s, lw = 7, col = NAVY) {
  if (s <= 0) return; ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-14, 1); ctx.lineTo(-4, 11); ctx.lineTo(15, -10); ctx.stroke(); ctx.restore();
}
const text = (ctx, s, x, y, px, wt, col = NAVY, align = 'center') => { setFont(ctx, px, wt); ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x, y); };

// ---------- heartbeat (the logo's pulse) as a glass tube lying on the table ----------
function pulsePts(cx, cy, w) { const u = w / 520; return [[-260, 0], [-90, 0], [-60, 0], [-40, -26], [-22, 30], [4, -84], [30, 40], [52, 0], [90, 0], [260, 0]].map(([x, y]) => [cx + x * u, cy + y * u]); }

// ---------- the vial: lathe glass body, aluminium crimp, teal cap, and the supplied label wrapped so that seen
// straight on it reads as the photo (u = (sin theta + 1) / 2). It lies on the table, cap towards the top of frame.
const VIAL = {s: .6 / 980};    // metres per photo px (photo: cap top y 250 .. base y 1230)
function vial() {
  const s = VIAL.s, g = new THREE.Group();
  const prof = (pts) => pts.map(([r, y]) => new THREE.Vector2(r * s, (1230 - y) * s));
  // body + shoulder + neck (outer profile from the photo), as glass
  const bodyP = prof([[0, 1230], [196, 1228], [214, 1215], [217, 1180], [217, 640], [214, 600], [196, 565], [150, 545], [132, 520], [130, 420], [140, 412], [0, 412]]);
  const glassM = glassMat({thickness: .04, ior: 1.5, attenuationColor: new THREE.Color('#dff4f6'), attenuationDistance: 1.2, envMapIntensity: 1.0});
  const body = new THREE.Mesh(new THREE.LatheGeometry(bodyP, 64), glassM); g.add(body);
  const crimp = new THREE.Mesh(new THREE.LatheGeometry(prof([[0, 412], [168, 412], [172, 395], [172, 312], [166, 300], [0, 300]]), 64),
    new THREE.MeshStandardMaterial({color: '#B9BEC3', metalness: 1, roughness: .32})); crimp.castShadow = true; g.add(crimp);
  const cap = new THREE.Mesh(new THREE.LatheGeometry(prof([[0, 300], [178, 300], [180, 290], [178, 256], [168, 250], [0, 250]]), 64),
    new THREE.MeshPhysicalMaterial({color: '#129BA7', roughness: .18, clearcoat: .8, clearcoatRoughness: .08})); cap.castShadow = true; g.add(cap);
  // label: a cylinder band just outside the glass, front half mapped from the photo crop (x 292..726, y 660..1075)
  const lc = document.createElement('canvas'); lc.width = 434; lc.height = 415; lc.getContext('2d').drawImage(img.vial, 292, 660, 434, 415, 0, 0, 434, 415);
  const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 16;
  const R = 218.5 * s, y0 = (1230 - 1075) * s, y1 = (1230 - 660) * s, seg = 96, rows = 8, pos = [], uvs = [], idx = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= seg; i++) {
    const th = lerp(-Math.PI / 2, Math.PI / 2, i / seg), y = lerp(y0, y1, j / rows);
    pos.push(R * Math.sin(th), y, R * Math.cos(th)); uvs.push((Math.sin(th) + 1) / 2, j / rows);
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); lg.setIndex(idx);
  const label = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({map: lt, toneMapped: false})); g.add(label);
  // back of the label (teal) so the roll never shows a hole
  const back = new THREE.Mesh(new THREE.CylinderGeometry(R * .998, R * .998, y1 - y0, 48, 1, true, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({color: '#23A8B2', roughness: .6}));
  back.position.y = (y0 + y1) / 2; g.add(back);
  // lie it down: vial axis (lathe y) -> world -z (cap towards the top of frame); label front (lathe +z) -> world +y (up)
  const lying = new THREE.Group(); g.rotation.x = -Math.PI / 2; g.position.z = (1230 - 740) * s; lying.add(g);
  // roll pivot: the axis sits one body radius above the table
  const roll = new THREE.Group(); roll.add(lying); lying.position.y = 0;
  const outer = new THREE.Group(); outer.add(roll); roll.position.y = 217 * s;
  outer.userData = {roll, R: 217 * s}; return outer;
}

// ---------- the twine: a rope lying on the table, slid along its own path when pulled ----------
function makeRope(ptsXZ, radius = .011) {
  const curve = new THREE.CatmullRomCurve3(ptsXZ.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const Lr = curve.getLength(), N = 160, samples = [];
  for (let i = 0; i <= N; i++) samples.push(curve.getPointAt(i / N));
  const tex = twineTexture(); tex.repeat.set(1, Lr / .05);
  const mat = new THREE.MeshStandardMaterial({map: tex, roughness: .95});
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat); mesh.castShadow = true;
  return {mesh, curve, L: Lr, radius, samples};
}
function ropeFrame(r, shift, lift) {   // shift: metres the rope has slid past its far end (it exits along the extended path)
  const pts = [], n = 90, len = r.L;
  const endT = r.curve.getTangentAt(1).normalize(), end = r.curve.getPointAt(1);
  for (let i = 0; i <= n; i++) {
    const s = i / n * len + shift;
    let p; if (s <= len) p = r.curve.getPointAt(clamp(s / len)); else p = end.clone().addScaledVector(endT, s - len);
    const q = p.clone(); q.y = r.radius + lift(q); pts.push(q);
  }
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  r.mesh.geometry.dispose(); r.mesh.geometry = new THREE.TubeGeometry(c, 180, r.radius, 7, false);
}

// ---------- init ----------
export async function init() {
  for (const [wt, f] of [[500, 'Medium'], [600, 'SemiBold'], [700, 'Bold']]) { const ff = new FontFace('G' + wt, `url(../../assets/fonts/Geist-${f}.ttf)`); await ff.load(); document.fonts.add(ff); }
  { const ff = new FontFace('HA', 'url(../../assets/fonts/HomemadeApple.woff2)'); await ff.load(); document.fonts.add(ff); }
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  img.logo = await load('../../images/logo_myfastrx_official.jpg');
  img.badge = await load('../../images/badge_bbb_a_rating_horizontal.jpg');
  img.vial = await load('../../images/vial_semaglutide.png');

  glCanvas = document.createElement('canvas'); glCanvas.width = W; glCanvas.height = H;
  renderer = new THREE.WebGLRenderer({canvas: glCanvas, antialias: true, preserveDrawingBuffer: true});
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .75;
  scene.environmentRotation = new THREE.Euler(0, Math.PI / 2, 0);
  // the room: a soft studio sphere in the ad's palette (off-white to pale blue with teal/blue light)
  { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#EEF3FA'); g.addColorStop(.5, '#F7F7F7'); g.addColorStop(1, '#E9EDF3'); x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
    for (const [cx, cy, r, col] of [[260, 250, 200, '20,163,184,0.16'], [700, 240, 230, '0,113,254,0.12'], [930, 280, 160, '20,163,184,0.10']]) { const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, `rgba(${col})`); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, 1024, 512); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), new THREE.MeshBasicMaterial({map: t, side: THREE.BackSide, toneMapped: false})); scene.add(sky); }
  // the table: whitewashed oak, satin lacquer
  { const o = await oak(), TW = 12, TD = 30;
    for (const t of [o.map, o.rough]) t.repeat.set(TW / o.size[0], TD / o.size[1]);
    const mat = new THREE.MeshPhysicalMaterial({map: o.map, roughnessMap: o.rough, roughness: .62, clearcoat: .45, clearcoatRoughness: .22, envMapIntensity: .6});
    const top = new THREE.Mesh(new THREE.PlaneGeometry(TW, TD), mat); top.rotation.x = -Math.PI / 2; top.position.set(0, 0, 5); top.receiveShadow = true; scene.add(top);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(TW, .14, TD), new THREE.MeshStandardMaterial({color: '#D8CDBB', roughness: .7})); slab.position.set(0, -.0705, 5); scene.add(slab); }
  // light: a soft window key from the upper left of frame (shadows fall down-right), sky fill
  key = new THREE.DirectionalLight('#FFF9F1', 2.1); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {left: -3.2, right: 3.2, top: 3.2, bottom: -3.2, near: .5, far: 20}); key.shadow.bias = -.0004; key.shadow.normalBias = .01; key.shadow.radius = 5;
  scene.add(key); scene.add(key.target);
  scene.add(new THREE.HemisphereLight('#FFFFFF', '#E6DDCF', .55));

  buildA(); buildB(); buildC(); buildD(); buildE();
  // the pill + its tinted soft shadow and caustic (glass casts light, not a hard shadow)
  M.pill = new THREE.Mesh(pillGeometry(), tealGlass()); scene.add(M.pill);
  M.pillShadow = decal(1.45, .95, softDisc([[0, 'rgba(24,64,74,0.30)'], [.6, 'rgba(30,80,90,0.10)'], [1, 'rgba(30,80,90,0)']]));
  M.pillCaustic = decal(.8, .46, softDisc([[0, 'rgba(120,235,245,0.55)'], [.5, 'rgba(60,200,220,0.16)'], [1, 'rgba(60,200,220,0)']]), THREE.AdditiveBlending);

  camera = new THREE.PerspectiveCamera(40, W / H, .01, 120);
  out = document.createElement('canvas'); out.width = W; out.height = H; octx = out.getContext('2d', {willReadFrequently: true});
  { const c = octx; setFont(c, DISC.size, 500); const words = COPY.disclaimer.split(' '), lines = []; let cur = '';
    for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (c.measureText(tt).width <= DISC.w - 2 * DISC.pad) cur = tt; else { lines.push(cur); cur = w; } } lines.push(cur);
    const lh = Math.round(DISC.size * DISC.lh), h = lines.length * lh + 2 * DISC.pad + 4; disc = {lines, lh, h, w: DISC.w, x: CX - DISC.w / 2, y: DISC.bottom - h}; }
  return true;
}
function decal(w, h, map, blending = THREE.NormalBlending) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map, transparent: true, depthWrite: false, toneMapped: false, blending}));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 2; scene.add(m); return m;
}

// ===== A: notepad + heartbeat + the price tag on its twine =====
function buildA() {
  M.pad = card(860, 420, {ruled: {top: 110, step: 42, margin: 70}, rough: .92});
  place(M.pad.grp, 'A', CX, 400, -1.2); scene.add(M.pad.grp);
  { const x = M.pad; x.ctxBinding = true; }
  const k = M.pad.k;
  M.inkA = [0, 1].map(i => makeInk({w: M.pad.cw, h: M.pad.ch, seedN: 11 + i,
    scrawl: [{s: ['GLP-1 care,', 'no strings attached.'][i], x: (i ? 150 : 170) * k, y: [176, 258][i] * k, px: [50, 46][i] * k, flourish: i === 1}],
    target: [{s: COPY.head1[i], x: 430 * k, y: [166, 248][i] * k, px: 72 * k, wt: 700}]}));
  // price tag: price origin (the pill's rest point) at layout (510, 830)
  M.tag = card(520, 450, {rough: .88, radius: 16}); place(M.tag.grp, 'A', CX, 905); scene.add(M.tag.grp);
  M.tag.paint('static', x => {
    text(x, COPY.startingAt, 260, 84, 44, 500); text(x, COPY.price, 260, 238, 172, 700);
    COPY.qual.forEach((q, i) => text(x, q, 260, 336 + 42 * i, 34, 500));
    // eyelet
    x.fillStyle = '#C8CDD2'; x.beginPath(); x.arc(40, 40, 17, 0, 7); x.fill(); x.fillStyle = '#8E969E'; x.beginPath(); x.arc(40, 40, 11, 0, 7); x.fill(); x.fillStyle = '#6B5A45'; x.beginPath(); x.arc(40, 40, 8, 0, 7); x.fill();
  });
  // twine: knotted at the eyelet, trailing off the left of frame in a loose curve
  const tp = [[290, 725], [262, 716], [236, 722], [214, 748], [196, 790], [150, 842], [70, 876], [-40, 900], [-170, 950], [-320, 1040], [-520, 1120], [-760, 1160]].map(([sx, sy]) => wp('A', sx, sy));
  M.rope = makeRope(tp); scene.add(M.rope.mesh);
  // the glass heartbeat lying across the table between the notepad and the tag
  const hp = pulsePts(CX, 650, 560).map(([sx, sy]) => { const [x, z] = wp('A', sx, sy); return new THREE.Vector3(x, .026, z); });
  M.pulse = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp, false, 'catmullrom', .08), 260, .026, 20, false), blueGlass()); scene.add(M.pulse);
  M.pulseCaustic = decal(pxm(640), pxm(150), softDisc([[0, 'rgba(90,150,255,0.30)'], [.6, 'rgba(90,150,255,0.08)'], [1, 'rgba(90,150,255,0)']]), THREE.AdditiveBlending);
  { const [x, z] = wp('A', CX + 18, 668); M.pulseCaustic.position.set(x, .0015, z); }
}

// ===== B: headline card, membership card, auto-refill toggle, Request refill button =====
function buildB() {
  M.head2 = card(880, 250, {rough: .9}); place(M.head2.grp, 'B', CX, 398, .8); scene.add(M.head2.grp);
  // membership card (plastic)
  { const c = document.createElement('canvas'); c.width = 800; c.height = 504; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 800, 504); g.addColorStop(0, '#2B3B57'); g.addColorStop(1, '#55657F'); x.fillStyle = g; x.beginPath(); x.roundRect(0, 0, 800, 504, 44); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.06)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(700, 520, 140 + i * 70, 0, 7); x.lineWidth = 18; x.strokeStyle = 'rgba(255,255,255,0.04)'; x.stroke(); }
    const cg = x.createLinearGradient(70, 180, 170, 260); cg.addColorStop(0, '#E9D39A'); cg.addColorStop(1, '#B8995A'); x.fillStyle = cg; x.beginPath(); x.roundRect(70, 176, 104, 80, 12); x.fill();
    x.strokeStyle = 'rgba(90,70,30,0.5)'; x.lineWidth = 2; for (const yy of [202, 230]) { x.beginPath(); x.moveTo(70, yy); x.lineTo(174, yy); x.stroke(); }
    setFont(x, 40, 600); x.letterSpacing = '10px'; x.fillStyle = 'rgba(255,255,255,0.92)'; x.textAlign = 'left'; x.fillText(COPY.membership, 70, 110);
    setFont(x, 30, 500); x.letterSpacing = '6px'; x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillText('•••• •••• •••• 2024', 70, 400);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
    const w = pxm(400), h = pxm(252), grp = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(w, .012, h, 2, .004), new THREE.MeshPhysicalMaterial({color: '#34445F', roughness: .3, clearcoat: .8})); body.position.y = .006; body.castShadow = true; grp.add(body);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(w * .995, h * .995), new THREE.MeshPhysicalMaterial({map: t, transparent: true, roughness: .28, clearcoat: .9, clearcoatRoughness: .06}));
    top.rotation.x = -Math.PI / 2; top.position.y = .0125; grp.add(top);
    M.member = grp; scene.add(grp); }
  // auto-refill toggle on its card
  M.togCard = card(300, 230, {rough: .9}); place(M.togCard.grp, 'B', 300, 700, -1.5); scene.add(M.togCard.grp);
  M.togTrack = new THREE.Mesh(new RoundedBoxGeometry(pxm(220), .05, pxm(110), 6, pxm(54)), glassMat({thickness: .03})); scene.add(M.togTrack);
  M.togKnob = new THREE.Mesh(new THREE.SphereGeometry(pxm(44), 48, 24), new THREE.MeshPhysicalMaterial({color: '#FFFFFF', roughness: .15, clearcoat: 1})); M.togKnob.scale.y = .55; M.togKnob.castShadow = true; scene.add(M.togKnob);
  // Request refill: printed card + a glass key over it
  M.btnCard = card(700, 190, {rough: .9}); scene.add(M.btnCard.grp);
  M.btnGlass = new THREE.Mesh(new RoundedBoxGeometry(pxm(560), .07, pxm(150), 6, pxm(60)), glassMat({thickness: .05})); scene.add(M.btnGlass);
  M.btnCheck = new THREE.Mesh(new THREE.CylinderGeometry(pxm(34), pxm(34), .03, 48), blueGlass()); scene.add(M.btnCheck);
}

// ===== C: header, Rx pad (scrawl -> "Provider review"), vial, box, the checklist card =====
function buildC() {
  M.coverCard = card(700, 150, {rough: .9}); place(M.coverCard.grp, 'C', CX, 300, -.6); scene.add(M.coverCard.grp);
  M.rx = card(300, 230, {ruled: {top: 92, step: 34}, rough: .92}); place(M.rx.grp, 'C', 285, 520, -3); scene.add(M.rx.grp);
  M.rx.paint('static', x => { x.font = '600 58px Georgia, serif'; x.fillStyle = 'rgba(0,29,69,0.75)'; x.textAlign = 'left'; x.fillText('℞', 22, 70); x.fillStyle = 'rgba(0,29,69,0.35)'; x.fillRect(96, 54, 180, 3); });
  M.list = card(470, 790, {rough: .9}); place(M.list.grp, 'C', 700, 805, .5); scene.add(M.list.grp);
  // the morph overlay: a transparent ink plane over the pad and the list's first row (scrawl on the pad -> label on the list)
  { const wpx = 860, hpx = 260, k = 2, c = document.createElement('canvas'); c.width = wpx * k; c.height = hpx * k;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(pxm(wpx), pxm(hpx)), new THREE.MeshStandardMaterial({map: t, transparent: true, roughness: .9, depthWrite: false}));
    m.rotation.x = -Math.PI / 2; const [x, z] = wp('C', 100 + wpx / 2, 400 + hpx / 2); m.position.set(x, .0135, z); m.renderOrder = 3; scene.add(m);
    M.inkCv = {c, ctx: c.getContext('2d'), t, k, x0: 100, y0: 400, key: null};
    M.inkC = makeInk({w: c.width, h: c.height, seedN: 23, step: 2,
      scrawl: [{s: 'Pt rvw ok', x: (150 - 100) * k, y: (505 - 400) * k, px: 34 * k}, {s: 'q24h Dx', x: (160 - 100) * k, y: (560 - 400) * k, px: 30 * k, flourish: true}],
      target: [{s: COPY.checks[0], x: (560 - 100) * k, y: (535 - 400) * k, px: 44 * k, wt: 600, align: 'left'}]}); }
  M.vial = vial(); scene.add(M.vial);
  M.vialShadow = decal(pxm(190), pxm(360), softDisc([[0, 'rgba(40,60,70,0.28)'], [.7, 'rgba(40,60,70,0.08)'], [1, 'rgba(40,60,70,0)']]));
  // box
  { const kc = kraftCanvas(560, 380), x = kc.getContext('2d');
    x.fillStyle = 'rgba(214,186,140,0.85)'; x.fillRect(0, 160, 560, 60);                   // tape
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(0, 164, 560, 6);
    x.fillStyle = '#FBFAF6'; x.fillRect(318, 40, 200, 110); x.fillStyle = 'rgba(0,29,69,0.55)';   // shipping label (no text)
    for (let i = 0; i < 4; i++) x.fillRect(334, 58 + i * 14, [120, 150, 90, 130][i], 5);
    for (let i = 0; i < 34; i++) x.fillRect(334 + i * 5, 122, (i * 7) % 3 + 1, 20);
    const t = new THREE.CanvasTexture(kc); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const kraft = new THREE.MeshStandardMaterial({color: '#C9A274', roughness: .9}), topM = new THREE.MeshStandardMaterial({map: t, roughness: .88});
    M.box = new THREE.Mesh(new THREE.BoxGeometry(pxm(280), .25, pxm(190)), [kraft, kraft, topM, kraft, kraft, kraft]); M.box.castShadow = true; M.box.receiveShadow = true; scene.add(M.box); }
  M.checks = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(pxm(28), pxm(28), .026, 48), blueGlass()); scene.add(m); return m; });
  M.noIns = card(660, 76, {rough: .9}); scene.add(M.noIns.grp);
}

// ===== D: the dose slider card =====
function buildD() {
  M.slider = card(720, 360, {rough: .9}); scene.add(M.slider.grp);
  M.rail = new THREE.Mesh(new RoundedBoxGeometry(pxm(620), .04, pxm(46), 6, pxm(22)), glassMat({thickness: .03})); scene.add(M.rail);
  M.knob = new THREE.Mesh(new THREE.SphereGeometry(pxm(40), 48, 24), glassMat({thickness: .08, attenuationColor: new THREE.Color('#9fd8ff'), attenuationDistance: .3})); M.knob.scale.y = .75; scene.add(M.knob);
}

// ===== E: the end card (unlit, exact pixels), with a glass CTA key =====
function buildE() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  const y = .004, d = TOP.h - y, vh = 2 * d * Math.tan(TOP.fov / 2 * deg), vw = vh * W / H;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(vw, vh), new THREE.MeshBasicMaterial({map: t, toneMapped: false}));
  m.rotation.x = -Math.PI / 2; m.position.set(ST.E[0], y, ST.E[1]); scene.add(m);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(vw, y, vh), new THREE.MeshStandardMaterial({color: '#F7F7F7', roughness: .9})); edge.position.set(ST.E[0], y / 2 - .0002, ST.E[1]); edge.castShadow = true; scene.add(edge);
  M.end = {c, ctx: c.getContext('2d'), t, key: null, pxE: vw / W, y};
  M.cta = new THREE.Mesh(new RoundedBoxGeometry(vw / W * 660, .06, vw / W * 140, 8, vw / W * 68), glassMat({thickness: .04, attenuationColor: new THREE.Color('#cfe3ff'), attenuationDistance: .8})); scene.add(M.cta);
}

// ---------- the pill's path ----------
const TAG0 = wp('A', CX, 830);   // price origin: the pill's rest point on the tag
function pillPose(t) {
  let x, z, yaw = 0, sq = 0;
  if (t < O.land) { const u = eOut(prog(t, O.touch, O.land) * .96 + .04 * prog(t, O.touch, O.land)); x = lerp(-2.6, TAG0[0], u); z = TAG0[1]; yaw = -6 * deg * (1 - u); }
  else if (t < C.pan[0].t0) { x = TAG0[0]; z = TAG0[1]; }
  else if (t < 8.6) {   // A -> B, knocks the membership card at cardPush, deflects out of frame to the right
    const K = [[C.pan[0].t0, TAG0[0], TAG0[1]], [7.55, .98, 2.52], [C.cardPush, .66, 3.05], [8.6, 1.75, 4.35]];
    ({x, z} = path(K, t)); yaw = t < C.cardPush ? lerp(0, -38, prog(t, C.pan[0].t0, 7.55)) * deg : lerp(-38, -62, prog(t, C.cardPush, 8.6)) * deg;
  } else if (t < C.pan[2].t0) { x = 1.75; z = 4.35; yaw = -62 * deg; }
  else if (t < C.pillLand) {
    const K = [[C.pan[2].t0, 1.75, 4.35], [16.85, .62, 2.25], [C.pillLand, TAG0[0], TAG0[1]]];
    ({x, z} = path(K, t)); yaw = lerp(-62, 0, eIO(prog(t, C.pan[2].t0, C.pillLand))) * deg;
  } else { x = TAG0[0]; z = TAG0[1]; }
  // squash: the touch-down, the landings, breathing on the table
  sq += wob(t, O.touch - .02, .11, .11, .28) + wob(t, O.land - .04, .07, .17, .25) + wob(t, C.cardPush, .05, .1, .22) + wob(t, C.pillLand - .03, .07, .15, .25);
  sq += .024 * Math.sin(2 * Math.PI * t / 1.2) * (t < O.land ? 1 : .45) * (t < C.finalStill ? 1 : 0);
  return {x, z, yaw, sy: 1 - sq, sxz: 1 + sq * .5};
}
function path(K, t) {   // piecewise, eased as one move: smooth through the waypoints (Catmull-Rom in time)
  const t0 = K[0][0], t1 = K[K.length - 1][0], u = e2(prog(t, t0, t1)), tt = lerp(t0, t1, u);
  let i = 0; while (i < K.length - 2 && tt > K[i + 1][0]) i++;
  const a = K[Math.max(0, i - 1)], b = K[i], c = K[i + 1], d = K[Math.min(K.length - 1, i + 2)], s = clamp((tt - b[0]) / (c[0] - b[0]));
  const cr = (p0, p1, p2, p3) => .5 * ((2 * p1) + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s + (-p0 + 3 * p1 - 3 * p2 + p3) * s * s * s);
  return {x: cr(a[1], b[1], c[1], d[1]), z: cr(a[2], b[2], c[2], d[2])};
}

// ---------- the camera ----------
const _m = new THREE.Matrix4();
function lookQ(pos, look, up) { _m.lookAt(pos, look, up); return new THREE.Quaternion().setFromRotationMatrix(_m); }
function camAt(t, pill) {
  const upZ = new THREE.Vector3(0, 0, -1);
  if (t < O.dive) {
    // spherical orbit round the moving pill: in from the far side, around the front, over the top
    const th = t < O.swirl[0] ? lerp(Math.PI, .80 * Math.PI, eOut(prog(t, 0, O.swirl[0]))) : t < O.over[0] ? lerp(.80 * Math.PI, .14 * Math.PI, eIO(prog(t, ...O.swirl))) : lerp(.14 * Math.PI, 0, eIO(prog(t, ...O.over)));
    const el = (t < O.swirl[0] ? lerp(4, 9, prog(t, 0, O.swirl[0])) : t < O.over[0] ? lerp(9, 30, e2(prog(t, ...O.swirl))) : lerp(30, 90, eIO(prog(t, ...O.over)))) * deg;
    const r = t < O.swirl[0] ? lerp(6.2, 2.5, eOut(prog(t, 0, O.swirl[0]))) : t < O.over[0] ? lerp(2.5, 2.15, prog(t, ...O.swirl)) : lerp(2.15, TOP.h, eIO(prog(t, ...O.over)));
    const k = eIO(prog(t, ...O.over));
    const tgt = new THREE.Vector3(lerp(pill.x, ST.A[0], k), lerp(.08, 0, k), lerp(pill.z, ST.A[1], k));
    const pos = tgt.clone().add(new THREE.Vector3(r * Math.cos(el) * Math.sin(th), r * Math.sin(el), r * Math.cos(el) * Math.cos(th)));
    const hf = new THREE.Vector3(-Math.sin(th), 0, -Math.cos(th)), ku = clamp((el / deg - 50) / 38);
    const up = new THREE.Vector3(0, 1, 0).multiplyScalar(1 - ku).addScaledVector(hf, ku).normalize();
    const fov = lerp(40, TOP.fov, k);
    return {pos, q: lookQ(pos, tgt, up), fov, tgt};
  }
  // top-down: stations joined by pans (a small lift mid-pan)
  let cx = ST.A[0], cz = ST.A[1], lift = 0;
  for (const P of C.pan) {
    if (t >= P.t1) { cx = ST[P.to][0]; cz = ST[P.to][1]; }
    else if (t >= P.t0) { const u = eIO(prog(t, P.t0, P.t1)); cx = lerp(ST[P.from][0], ST[P.to][0], u); cz = lerp(ST[P.from][1], ST[P.to][1], u); lift = .7 * Math.sin(Math.PI * u); break; }
    else break;
  }
  const pos = new THREE.Vector3(cx, TOP.h + lift, cz), tgt = new THREE.Vector3(cx, 0, cz);
  return {pos, q: lookQ(pos, tgt, upZ), fov: TOP.fov, tgt};
}

// ---------- per frame ----------
export function render(t) {
  const P = pillPose(t);
  M.pill.position.set(P.x, 0, P.z); M.pill.rotation.y = P.yaw; M.pill.scale.set(P.sxz, P.sy, P.sxz);
  M.pillShadow.position.set(P.x + .07, .0012, P.z + .07); M.pillShadow.rotation.z = P.yaw;
  M.pillCaustic.position.set(P.x + .24, .0016, P.z + .2); M.pillCaustic.rotation.z = P.yaw;

  // --- A: ink, twine ---
  M.pad.paint('A' + Math.round(t * 30), x => {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = '#2F3E5A'; x.fillRect(0, 0, M.pad.cw, 24 * M.pad.k);   // the pad's glued top edge
    M.inkA.forEach((ink, i) => { const c = C.inkA[i]; ink.draw(x, t, [c.t0, c.t1], c.morph); });
  });
  { const u = prog(t, C.unstring.t0, C.unstring.t1), shift = eIn(u) * (M.rope.L + 1.2);
    const tagG = M.tag.grp, tw = M.tag.w / 2, th = M.tag.h / 2;
    ropeFrame(M.rope, shift, q => { const dx = q.x - tagG.position.x, dz = q.z - tagG.position.z; return Math.abs(dx) < tw && Math.abs(dz) < th ? M.tag.thick : 0; });
    M.rope.mesh.visible = u < 1; }

  // --- B ---
  M.head2.paint('B' + Math.round(t * 30), x => COPY.head2.forEach((s, i) => maskLine(x, s, 440, [83, 165][i], 72, 700, NAVY, {enter: eOut(prog(t, C.head2[i].t0, C.head2[i].land))})));
  { // membership card: at rest, then knocked away down-left with a spin, friction-damped
    const [x0, z0] = wp('B', 620, 690), d = t - C.cardPush, s = d <= 0 ? 0 : (1 - Math.exp(-d / .28)) * 2.1;
    M.member.position.set(x0 - s * .62, 0, z0 + s * .78); M.member.rotation.y = -4 * deg + (d > 0 ? (1 - Math.exp(-d / .3)) * 1.9 : 0);
    M.member.visible = !(d > 1.2); }
  { const off = eIO(prog(t, C.toggleOff.t0, C.toggleOff.t1)), [tx, tz] = wp('B', 300, 672);
    M.togTrack.position.set(tx, .025, tz); M.togKnob.position.set(tx + pxm(lerp(55, -55, off)), pxm(44) * .55, tz);
    M.togCard.paint('T' + Math.round(off * 40), x => {
      const col = off < .5 ? `rgb(${lerp(0, 201, off * 2) | 0},${lerp(113, 209, off * 2) | 0},${lerp(254, 220, off * 2) | 0})` : '#C9D1DC';
      x.fillStyle = col; x.beginPath(); x.roundRect(150 - 104, 87 - 52, 208, 104, 52); x.fill();
      text(x, COPY.autoRefill, 150, 200, 34, 600); }); }
  { const u = spring(t, C.btnIn.t0, .38, .09), [bx, bz] = wp('B', CX, 960), dx = (1 - u) * 1.6;
    M.btnCard.grp.position.set(bx + dx, 0, bz); M.btnCard.grp.visible = t >= C.btnIn.t0 - .01;
    const press = t > C.btnPress - .09 && t < C.btnPress ? prog(t, C.btnPress - .09, C.btnPress) : t >= C.btnPress ? 1 - spring(t, C.btnPress, .26, .05) : 0;
    M.btnGlass.position.set(bx + dx - pxm(40), .035 * (1 - .45 * press) + M.btnCard.thick, bz); M.btnGlass.scale.y = 1 - .45 * press; M.btnGlass.visible = M.btnCard.grp.visible;
    const ck = spring(t, C.checkPop, .3, .07);
    M.btnCheck.position.set(bx + dx + pxm(250), .015 + M.btnCard.thick, bz); M.btnCheck.scale.set(Math.max(.001, ck), 1, Math.max(.001, ck)); M.btnCheck.visible = ck > .01;
    M.btnCard.paint('R' + Math.round(ck * 30), x => { text(x, COPY.button, 350 - 40, 113, 50, 600); drawCheck(x, 350 + 250, 95, ck, 6); }); }

  // --- C ---
  M.coverCard.paint('C' + Math.round(t * 30), x => maskLine(x, COPY.covers, 350, 96, 60, 700, NAVY, {enter: eOut(prog(t, C.coversIn.t0, C.coversIn.land))}));
  { const I = M.inkCv, keyS = 'I' + Math.round(t * 30);
    if (I.key !== keyS) { I.key = keyS; I.ctx.clearRect(0, 0, I.c.width, I.c.height); M.inkC.draw(I.ctx, t, [C.inkC.t0, C.inkC.t1], C.inkC.morph); I.t.needsUpdate = true; } }
  M.list.paint('L' + C.checks.map(c => Math.round(spring(t, c, .3, .07) * 30)).join('.') + Math.round(eOut(prog(t, C.claim24.t0, C.claim24.land)) * 30) + (t >= C.checks[1] - .2 ? 1 : 0) + (t >= C.checks[2] - .2 ? 1 : 0), x => {
    // (card origin: layout (465, 410)) rows at 520 / 800 / 1060
    C.checks.forEach((c, i) => drawCheck(x, 510 - 465, [520, 800, 1060][i] - 410 + 4, spring(t, c, .3, .07), 5));
    COPY.claim24.forEach((s, i) => maskLine(x, s, 560 - 465, 575 - 410 + i * 32, 26, 500, NAVY, {align: 'left', enter: eOut(prog(t, C.claim24.t0 + i * .06, C.claim24.land + i * .06))}));
    maskLine(x, COPY.checks[1], 560 - 465, 815 - 410, 44, 600, NAVY, {align: 'left', enter: eOut(prog(t, C.checks[1] - .2, C.checks[1] + .12))});
    maskLine(x, COPY.checks[2], 560 - 465, 1075 - 410, 44, 600, NAVY, {align: 'left', enter: eOut(prog(t, C.checks[2] - .2, C.checks[2] + .12))});
  });
  C.checks.forEach((c, i) => { const s = spring(t, c, .3, .07), [x, z] = wp('C', 510, [520, 800, 1060][i] + 4); M.checks[i].position.set(x, M.list.thick + .013, z); M.checks[i].scale.set(Math.max(.001, s), 1, Math.max(.001, s)); M.checks[i].visible = s > .01; });
  { // the vial rolls in from the left and stops label-up
    const [vx, vz] = wp('C', 290, 800), u = eOut(prog(t, C.vialIn.t0, C.vialIn.land)), dx = (1 - u) * -1.5 + wob(t, C.vialIn.land, .012, .12, .3);
    M.vial.position.set(vx + dx, 0, vz + pxm(0)); M.vial.userData.roll.rotation.z = -dx / M.vial.userData.R;
    M.vial.visible = t >= C.vialIn.t0 - .02;
    M.vialShadow.position.set(vx + dx + .03, .0012, vz + .04); M.vialShadow.visible = M.vial.visible; }
  { // the box drops in, bounces, settles
    const [bx, bz] = wp('C', 290, 1060), d = t - C.boxIn.t0, fall = C.boxIn.land - C.boxIn.t0;
    let y = .125; if (d < fall) y = .125 + 1.8 * (1 - (d / fall) ** 2); else y = .125 + Math.abs(wob(t, C.boxIn.land, .06, .09, .3));
    M.box.position.set(bx, y, bz); M.box.rotation.set(wob(t, C.boxIn.land, .05, .1, .26), -3 * deg + (d < fall ? (1 - d / fall) * .25 : 0), wob(t, C.boxIn.land + .03, .04, .1, .3));
    M.box.visible = d >= 0; }
  { const u = spring(t, C.noIns.t0, .36, .09), [nx, nz] = wp('C', CX, 1172); M.noIns.grp.position.set(nx, 0, nz + (1 - u) * .9); M.noIns.grp.visible = t >= C.noIns.t0;
    M.noIns.paint('N' + Math.round(eOut(prog(t, C.noIns.t0 + .1, C.noIns.land + .1)) * 30), x => maskLine(x, COPY.noIns, 330, 50, 34, 600, NAVY, {enter: eOut(prog(t, C.noIns.t0 + .1, C.noIns.land + .1))})); }

  // --- D: slider ---
  { const u = spring(t, C.sliderIn.t0, .38, .09), [sx, sz] = wp('D', CX, 900), dz = (1 - u) * 1.4;
    M.slider.grp.position.set(sx, 0, sz + dz); M.slider.grp.visible = t >= C.sliderIn.t0;
    const kv = eIO(prog(t, C.drag.t0, C.drag.t1)), kxPx = lerp(-290, 290, kv);
    M.slider.paint('S' + Math.round(kv * 60) + '.' + Math.round(eOut(prog(t, C.doseLine.t0, C.doseLine.land)) * 30), x => {
      x.fillStyle = '#DDE4EC'; x.beginPath(); x.roundRect(60, 44, 600, 32, 16); x.fill();
      x.fillStyle = BLUE; x.beginPath(); x.roundRect(60, 44, Math.max(32, 300 + kxPx), 32, 16); x.fill();
      text(x, COPY.dose[0], 60, 128, 28, 500, NAVY, 'left'); text(x, COPY.dose[1], 660, 128, 28, 500, NAVY, 'right');
      COPY.doseLine.forEach((s, i) => maskLine(x, s, 360, 240 + i * 56, 46, 600, NAVY, {enter: eOut(prog(t, C.doseLine.t0 + i * .1, C.doseLine.land + i * .1))}));
    });
    const [rx, rz] = wp('D', CX, 780); M.rail.position.set(rx, M.slider.thick + .02, rz + dz); M.rail.visible = M.slider.grp.visible;
    M.knob.position.set(rx + pxm(kxPx), M.slider.thick + pxm(40) * .75, rz + dz); M.knob.visible = M.slider.grp.visible; }

  // --- E: end card ---
  { const E = M.end, tagU = C.tag.map(c => eOut(prog(t, c.t0, c.land))), ctaU = eOut(prog(t, C.ctaIn.t0 + .15, C.ctaIn.land + .15)), urlU = eOut(prog(t, C.urlIn.t0, C.urlIn.land));
    const bs = t >= C.finalStill - .1 ? 1 : spring(t, C.badgePop - .35, .36, .09), cs = t >= C.finalStill - .1 ? 1 : spring(t, C.ctaIn.t0, .34, .08);
    const keyS = [tagU, ctaU, urlU, bs, cs].map(v => Math.round(v * 60)).join('.');
    if (E.key !== keyS) { E.key = keyS; const x = E.ctx; x.fillStyle = '#F7F7F7'; x.fillRect(0, 0, W, H);
      const lw = Math.round(img.logo.width * .5), lh = Math.round(img.logo.height * .5); x.imageSmoothingQuality = 'high'; x.drawImage(img.logo, Math.round(CX - lw / 2), Math.round(400 - lh / 2), lw, lh);
      COPY.tag.forEach((s, i) => maskLine(x, s, CX, [606, 682][i], 72, 700, NAVY, {enter: tagU[i]}));
      if (cs > .001) { x.fillStyle = BLUE; x.beginPath(); x.roundRect(CX - 324 * cs, 790 - 64 * cs, 648 * cs, 128 * cs, 64 * cs); x.fill(); }
      maskLine(x, COPY.cta, CX, 808, 50, 600, '#FFFFFF', {enter: ctaU});
      maskLine(x, COPY.url, CX, 930, 52, 600, NAVY, {enter: urlU});
      if (bs > .001) { const bw = 280, bh = Math.round(img.badge.height * bw / img.badge.width); if (Math.abs(bs - 1) < 1e-4) x.drawImage(img.badge, CX - bw / 2, 956, bw, bh); else { x.save(); x.translate(CX, 956 + bh / 2); x.scale(bs, bs); x.drawImage(img.badge, -bw / 2, -bh / 2, bw, bh); x.restore(); } }
      E.t.needsUpdate = true; }
    const press = t > C.ctaClick - .08 && t < C.ctaClick ? prog(t, C.ctaClick - .08, C.ctaClick) : t >= C.ctaClick && t < C.finalStill - .1 ? 1 - spring(t, C.ctaClick, .26, .05) : 0;
    const cx = ST.E[0] + (CX - 540) * E.pxE, cz = ST.E[1] + (790 - 960) * E.pxE;
    M.cta.position.set(cx, E.y + .03 * (1 - .4 * press), cz); M.cta.scale.set(Math.max(.001, cs), 1 - .4 * press, Math.max(.001, cs)); M.cta.visible = cs > .01; }

  // --- camera + light ---
  const cam = camAt(t, P);
  camera.position.copy(cam.pos); camera.quaternion.copy(cam.q); camera.fov = cam.fov; camera.updateProjectionMatrix();
  key.target.position.copy(cam.tgt); key.position.copy(cam.tgt).add(new THREE.Vector3(-3.2, 7, -3.8));
  renderer.render(scene, camera);

  // --- HUD ---
  octx.setTransform(1, 0, 0, 1, 0, 0); octx.drawImage(glCanvas, 0, 0);
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
export const info = () => ({disc, COPY, PX, TAG0, CX});
