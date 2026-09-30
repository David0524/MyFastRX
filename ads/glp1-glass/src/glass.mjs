// Liquid-glass renderer (WebGL2). Each glass object is one pass that reads the frame rendered so far
// and writes a new one (ping-pong), so a glass object refracts everything behind it, including other glass.
//
// Shape model: a 2D signed-distance shape (rounded rect, capsule polyline) extruded into a slab whose edge is a
// quarter-circle bevel. The bevel gives a height field h and a normal n. Per pixel:
//   - refraction: the backdrop is sampled at p - n.xy * refr (strongest on the rounded rim, zero on the flat top)
//   - dispersion: R and B are sampled with slightly different offsets on the rim
//   - absorption: Beer-Lambert tint through the slab thickness
//   - Fresnel rim light, a Blinn specular from ONE fixed key light (upper left), an inner exit glow (lower right)
//   - a soft tinted contact shadow cast down-right, drawn outside the shape
// The vial uses its own pass: its clear-glass pixels (mask G) refract the live backdrop through a cylinder model and
// keep the photo's own glass detail as a transmission factor; cap, crimp and label pixels are copied untouched.

const VS = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

const COMMON = `#version 300 es
precision highp float;
uniform sampler2D uSrc;      // frame so far (y up, like gl_FragCoord)
uniform vec2 uRes;
out vec4 o;
vec2 P(){ return vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y); }     // pixel coords, y down
vec3 srcAt(vec2 p){ return texture(uSrc, vec2(p.x, uRes.y - p.y) / uRes).rgb; }
const vec3 KEY = normalize(vec3(-0.55, -0.72, 0.42));                  // key light from the upper left (y down)
`;

const FS_COPY = `#version 300 es
precision highp float; uniform sampler2D uSrc; uniform vec2 uRes; out vec4 o;
void main(){ o = vec4(texture(uSrc, gl_FragCoord.xy / uRes).rgb, 1.); }`;

const FS_GLASS = COMMON + `
uniform int uType;            // 0 rounded rect, 1 capsule polyline
uniform vec2 uC;              // center (px)
uniform vec2 uHalf;           // half size (rect)
uniform float uRad;           // corner radius (rect) / tube radius (polyline)
uniform float uBevel;         // bevel width (px)
uniform vec2 uScale;          // squish (x, y) about uAnchor
uniform vec2 uAnchor;
uniform vec2 uPts[10]; uniform int uN;
uniform vec3 uSigma;          // absorption per unit thickness
uniform float uRefr, uDisp, uRim, uSpec, uGlow, uAlpha, uLift;
uniform float uMag, uSheen, uSheenAmt, uCaustic;
uniform vec2 uClip;            // object exists only for uClip.x <= y <= uClip.y (a glass pane passing over it)   // flat-top magnification, moving sheen band (pos, amount), focused light on the table
uniform vec3 uGlowCol;
uniform vec2 uShOff; uniform float uShBlur, uShAmt; uniform vec3 uShCol;
uniform sampler2D uContent; uniform float uContentOn;   // under-glass content (premultiplied, y up)
uniform vec4 uProtect;        // x0,y0,x1,y1 : no refraction inside (faces in footage)

float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
float shape(vec2 p){
  vec2 q = (p - uAnchor) / uScale + uAnchor;
  float d;
  if (uType == 0) d = sdRR(q - uC, uHalf, uRad);
  else { d = 1e9; for (int i = 0; i < 9; i++) { if (i + 1 >= uN) break; d = min(d, sdSeg(q, uC + uPts[i], uC + uPts[i + 1])); } d -= uRad; }
  return d * min(uScale.x, uScale.y);
}
vec3 contentOver(vec3 c, vec2 p){
  if (uContentOn < .5) return c;
  vec4 t = texture(uContent, vec2(p.x, uRes.y - p.y) / uRes);
  return c * (1. - t.a) + t.rgb;
}
void main(){
  vec2 p = P();
  vec3 bg = srcAt(p);
  if (p.y < uClip.x || p.y > uClip.y) { o = vec4(bg, 1.); return; }
  float d = shape(p);
  // two-layer shadow: a tight contact shadow + a wide, faint ambient one (both cast down, away from the key light)
  float ds = shape(p - uShOff);
  float sh = uShAmt * (1. - smoothstep(-uShBlur * .5, uShBlur, ds));
  float da = shape(p - uShOff * 2.6);
  float amb = uShAmt * .45 * (1. - smoothstep(-uShBlur * 1.5, uShBlur * 3.2, da));
  vec3 outside = bg * mix(vec3(1.), uShCol, clamp((sh + amb) * uAlpha, 0., 1.) * step(-.5, d));
  // caustic: light focused through the glass lands as a soft tinted pool inside the shadow
  if (uCaustic > 0.) {
    // the key light (upper left) is focused by the lens and lands just past the lower-right rim: a bright crescent
    float dc = shape(p - uShOff * 2.8) + uBevel * .7;
    float c1 = 1. - smoothstep(-uBevel * 1.1, uBevel * .9, dc);
    float rimBand = exp(-pow(max(d, 0.) / (uBevel * .9), 2.));
    outside += uGlowCol * uCaustic * uAlpha * c1 * rimBand * step(0., d);
  }
  if (d > 1.) { o = vec4(outside, 1.); return; }
  vec2 e = vec2(1., 0.);
  vec2 g = vec2(shape(p + e.xy) - shape(p - e.xy), shape(p + e.yx) - shape(p - e.yx));
  vec2 dir = length(g) > 1e-4 ? normalize(g) : vec2(0.);
  float s = clamp(-d / uBevel, 0., 1.);
  float q = 1. - s;                                  // 1 at the rim, 0 on the flat top
  float nz = sqrt(max(1. - q * q, 0.));
  vec3 n = normalize(vec3(dir * q, max(nz, 1e-3)));
  // refraction concentrated in the rounded rim, zero on the flat top
  vec2 off = -dir * uRefr * q * q;
  vec2 cS = (uC - uAnchor) * uScale + uAnchor;       // lens center follows the squish
  off += (cS - p) * (1. - 1. / uMag) * nz;           // the flat top is a magnifying lens (uMag = 1: plain slab)
  if (p.x > uProtect.x && p.x < uProtect.z && p.y > uProtect.y && p.y < uProtect.w) off = vec2(0.);
  float k = uDisp * q;
  vec3 refr = vec3(srcAt(p + off * (1. + k)).r, srcAt(p + off).g, srcAt(p + off * (1. - k)).b);
  float thick = .25 + .75 * nz;
  vec3 col = refr * exp(-uSigma * thick) + uLift * (1. - q);
  col = contentOver(col, p + off);
  vec2 kd = normalize(vec2(-.55, -.72));
  float lit = max(dot(dir, kd), 0.), shade = max(dot(dir, -kd), 0.);
  // rim: bright on the key-light side, a touch darker on the far side (defines the edge on a white canvas)
  float fr = pow(q, 4.);
  col = mix(col, vec3(1.), clamp(uRim * fr * (.35 + .65 * lit), 0., .85));
  col *= 1. - .10 * uRim * fr * shade;
  // sharp specular from the single key light + a broad sheen
  vec3 hv = normalize(KEY + vec3(0., 0., 1.));
  float nh = max(dot(n, hv), 0.);
  col += uSpec * (pow(nh, 160.) * 1.0 + pow(nh, 20.) * .06);
  // a soft reflected sheen band across the top face; its position is driven by the object's motion
  if (uSheenAmt > 0. && uType == 0) { vec2 lp = (p - cS) / (uHalf * uScale); float v = lp.x * .8 + lp.y * .45; col += uSheenAmt * nz * (exp(-pow((v - uSheen) / .10, 2.)) + .5 * exp(-pow((v - uSheen - .22) / .035, 2.))); }
  // hairline edges: a white inner line and a faint dark outer line
  col = mix(col, vec3(1.), .55 * uRim * (1. - smoothstep(0., 1.8, -d)) * (.4 + .6 * lit));
  col += uGlowCol * uGlow * pow(shade, 2.) * q;      // faint colored light exiting the far rim (no outer glow)
  float edgeDark = .10 * uRim * (1. - smoothstep(0., 1.2, abs(d + .6)));
  vec3 gl = clamp(col, 0., 1.) * (1. - edgeDark);
  float cov = clamp(.5 - d, 0., 1.) * uAlpha;
  o = vec4(mix(outside, gl, cov), 1.);
}`;

const FS_VIAL = COMMON + `
uniform sampler2D uColor, uMask;   // vial photo (half size) and its mask/normal map; row 0 = top
uniform vec2 uSize;                // texture size (px)
uniform vec2 uPos;                 // screen position of the texture's top-left at rest
uniform float uRot;                // radians, about the base center
uniform float uScl;
uniform float uAlpha;
uniform vec3 uBackdrop;            // the photo's own backdrop color (for the transmission factor)
uniform float uSpecU;              // where the moving highlight sits across the glass (-1..1)
uniform float uRefr;
uniform float uFloorY;             // reflection surface (screen y of the base)
uniform vec4 uProtect;
uniform float uClipY, uReflA;             // vial pixels below this screen y are hidden (rising out of the surface line)
vec2 toLocal(vec2 p){
  vec2 pivot = uPos + vec2(uSize.x * .5, uSize.y);
  vec2 r = p - pivot; float c = cos(-uRot), s = sin(-uRot);
  r = vec2(c * r.x - s * r.y, s * r.x + c * r.y) / uScl;
  return r + vec2(uSize.x * .5, uSize.y);
}
vec4 vialAt(vec2 p, out vec4 m){
  vec2 l = toLocal(p);
  vec2 uv = l / uSize;
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) { m = vec4(0.); return vec4(0.); }
  m = texture(uMask, uv);
  return texture(uColor, uv);
}
vec3 glassPix(vec2 p, vec4 col, vec4 m, float hwPx){
  float nx = m.b * 2. - 1., ny = m.a * 2. - 1.;
  // rotate the normal back to screen space
  float c = cos(uRot), s = sin(uRot);
  vec2 n2 = vec2(c * nx - s * ny, s * nx + c * ny);
  // cylinder lens: slight magnification in the middle, strong bending toward the walls
  float u = nx;
  float du = (-.16 * u + .55 * u * u * u * u * u) * hwPx;
  vec2 off = vec2(c, s) * du + vec2(-s, c) * ny * uRefr * .5;
  if (p.x > uProtect.x && p.x < uProtect.z && p.y > uProtect.y && p.y < uProtect.w) off = vec2(0.);
  float k = .045 * u * u * u * u;
  vec3 behind = vec3(srcAt(p + off * (1. + k)).r, srcAt(p + off).g, srcAt(p + off * (1. - k)).b);
  // the photo's glass detail as a transmission factor (walls, liquid tint, edge lines), applied to the live backdrop
  vec3 T = col.rgb / uBackdrop;
  vec3 g = behind * min(T, vec3(1.)) + max(T - 1., 0.) * .9;
  // moving specular band, tied to the key light and the vial's pose
  float band = exp(-pow((u - uSpecU) / .085, 2.)) * .55 + exp(-pow((u - uSpecU - .16) / .03, 2.)) * .35;
  g += band * m.g;
  return g;
}
void main(){
  vec2 p = P();
  vec3 bg = srcAt(p);
  float hwPx = uSize.x * .5 * uScl;
  // soft contact shadow and a faint reflection on the surface
  vec2 base = uPos + vec2(uSize.x * .5, uSize.y);
  vec2 dq = (p - base - vec2(10., 0.)) / vec2(hwPx * 1.15, 16.);
  float sh = exp(-dot(dq, dq) * 1.4) * .22 * step(base.y - 8., p.y) * uReflA;
  vec3 outCol = bg * mix(vec3(1.), vec3(.55, .78, .82), sh * uAlpha);
  if (p.y > uFloorY) {
    vec2 pr = vec2(p.x, 2. * uFloorY - p.y);
    vec4 mr; vec4 cr = vialAt(pr, mr);
    float fade = exp(-(p.y - uFloorY) / 38.) * .16 * mr.r * uAlpha * uReflA;
    outCol = mix(outCol, cr.rgb, fade);
  }
  vec4 m; vec4 col = vialAt(p, m);
  if (m.r <= 0. || p.y > uClipY) { o = vec4(outCol, 1.); return; }
  vec3 opaque = col.rgb;                                  // cap, crimp, label: copied as-is
  vec3 glass = glassPix(p, col, m, hwPx);
  float gw = m.r > 0. ? clamp(m.g / m.r, 0., 1.) : 0.;
  vec3 v = mix(opaque, glass, gw);
  o = vec4(mix(outCol, v, m.r * uAlpha), 1.);
}`;

export function createGlass(canvas) {
  const gl = canvas.getContext('webgl2', {antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false, alpha: false});
  if (!gl) throw new Error('WebGL2 unavailable');
  const W = canvas.width, H = canvas.height;
  const compile = (fs) => {
    const pr = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(pr, s);
    }
    gl.bindAttribLocation(pr, 0, 'a'); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    const loc = {}; const n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(pr, i); loc[u.name.replace('[0]', '')] = gl.getUniformLocation(pr, u.name); }
    return {pr, loc};
  };
  const P = {copy: compile(FS_COPY), glass: compile(FS_GLASS), vial: compile(FS_VIAL)};
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tex = (w, h, data = null, filter = gl.LINEAR) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const targets = [0, 1].map(() => { const t = tex(W, H); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return {t, f}; });
  const bgTex = tex(W, H), contentTex = tex(W, H);
  let cur = 0;
  const upload = (t, source, flip) => {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
  };
  let vialTex = null;
  function setVial(color, mask, w, h) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    vialTex = {color: tex(w, h, color), mask: tex(w, h, mask), w, h};
  }
  function begin(bgCanvas, contentCanvas) {
    upload(bgTex, bgCanvas, true); upload(contentTex, contentCanvas, true);
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets[0].f); gl.viewport(0, 0, W, H); gl.disable(gl.SCISSOR_TEST);
    gl.useProgram(P.copy.pr); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bgTex);
    gl.uniform1i(P.copy.loc.uSrc, 0); gl.uniform2f(P.copy.loc.uRes, W, H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); cur = 0;
  }
  function pass(prog, bounds, setU) {
    const src = targets[cur], dst = targets[1 - cur];
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, src.f); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dst.f);
    gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.f);
    const [x0, y0, x1, y1] = bounds.map(Math.round);
    const sx = Math.max(0, x0), sy = Math.max(0, H - y1), sw = Math.min(W, x1) - sx, sh = Math.min(H, H - y0) - sy;
    if (sw <= 0 || sh <= 0) return;
    gl.enable(gl.SCISSOR_TEST); gl.scissor(sx, sy, sw, sh);
    gl.useProgram(prog.pr);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.t); gl.uniform1i(prog.loc.uSrc, 0);
    gl.uniform2f(prog.loc.uRes, W, H);
    setU(prog.loc);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.SCISSOR_TEST);
    cur = 1 - cur;
  }
  const NOPROTECT = [-1, -1, -1, -1];
  // o: {type:'rect'|'tube', c:[x,y], half:[w,h], r, bevel, pts:[[x,y]..], scale:[sx,sy], anchor:[x,y], tint:{sigma:[..]}, ...}
  function glass(o) {
    const sc = o.scale || [1, 1], an = o.anchor || o.c;
    let ext;
    if (o.type === 'tube') { const xs = o.pts.map(p => p[0]), ys = o.pts.map(p => p[1]); ext = [o.c[0] + Math.min(...xs) - o.r, o.c[1] + Math.min(...ys) - o.r, o.c[0] + Math.max(...xs) + o.r, o.c[1] + Math.max(...ys) + o.r]; }
    else ext = [o.c[0] - o.half[0], o.c[1] - o.half[1], o.c[0] + o.half[0], o.c[1] + o.half[1]];
    const sxf = v => (v - an[0]) * sc[0] + an[0], syf = v => (v - an[1]) * sc[1] + an[1];
    const sh = o.shadow || {off: [5, 12], blur: 18, amt: .16, col: [.70, .74, .82]};
    const m = 12 + sh.blur * 3.4 + Math.hypot(...sh.off) * 2.8;
    const bounds = [sxf(ext[0]) - m, syf(ext[1]) - m, sxf(ext[2]) + m, syf(ext[3]) + m];
    pass(P.glass, bounds, L => {
      gl.uniform1i(L.uType, o.type === 'tube' ? 1 : 0);
      gl.uniform2f(L.uC, ...o.c); gl.uniform2f(L.uHalf, ...(o.half || [0, 0]));
      gl.uniform1f(L.uRad, o.r); gl.uniform1f(L.uBevel, o.bevel ?? o.r);
      gl.uniform2f(L.uScale, ...sc); gl.uniform2f(L.uAnchor, ...an);
      if (o.type === 'tube') { const f = new Float32Array(20); o.pts.forEach((p, i) => { f[2 * i] = p[0]; f[2 * i + 1] = p[1]; }); gl.uniform2fv(L.uPts, f); gl.uniform1i(L.uN, o.pts.length); }
      else gl.uniform1i(L.uN, 0);
      gl.uniform3f(L.uSigma, ...(o.sigma || [.02, .015, .01]));
      gl.uniform1f(L.uRefr, o.refr ?? 26); gl.uniform1f(L.uDisp, o.disp ?? .12);
      gl.uniform1f(L.uRim, o.rim ?? .7); gl.uniform1f(L.uSpec, o.spec ?? .9); gl.uniform1f(L.uGlow, o.glow ?? .04);
      gl.uniform3f(L.uGlowCol, ...(o.glowCol || [.55, .8, 1])); gl.uniform1f(L.uLift, o.lift ?? .015);
      gl.uniform2f(L.uClip, ...(o.clip || [-1e6, 1e6])); gl.uniform1f(L.uMag, o.mag ?? 1); gl.uniform1f(L.uSheen, o.sheen ?? 0); gl.uniform1f(L.uSheenAmt, o.sheenAmt ?? 0); gl.uniform1f(L.uCaustic, o.caustic ?? 0);
      gl.uniform1f(L.uAlpha, o.alpha ?? 1);
      gl.uniform2f(L.uShOff, ...sh.off); gl.uniform1f(L.uShBlur, sh.blur); gl.uniform1f(L.uShAmt, sh.amt); gl.uniform3f(L.uShCol, ...sh.col);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, contentTex); gl.uniform1i(L.uContent, 1);
      gl.uniform1f(L.uContentOn, o.content ? 1 : 0);
      gl.uniform4f(L.uProtect, ...(o.protect || NOPROTECT));
    });
  }
  function vial(v) {
    const {w, h} = vialTex; const s = v.scale ?? 1;
    const pad = 40 + h * .12;
    const bounds = [v.pos[0] - 80, v.pos[1] - 30, v.pos[0] + w + 80, v.pos[1] + h + pad + 40];
    pass(P.vial, bounds, L => {
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, vialTex.color); gl.uniform1i(L.uColor, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, vialTex.mask); gl.uniform1i(L.uMask, 2);
      gl.uniform2f(L.uSize, w, h); gl.uniform2f(L.uPos, ...v.pos);
      gl.uniform1f(L.uRot, v.rot || 0); gl.uniform1f(L.uScl, s); gl.uniform1f(L.uAlpha, v.alpha ?? 1);
      gl.uniform3f(L.uBackdrop, 238 / 255, 242 / 255, 245 / 255);
      gl.uniform1f(L.uSpecU, v.specU ?? -.45); gl.uniform1f(L.uRefr, v.refr ?? 10);
      gl.uniform1f(L.uFloorY, v.floorY ?? v.pos[1] + h); gl.uniform1f(L.uClipY, v.clipY ?? 1e6); gl.uniform1f(L.uReflA, v.reflA ?? 1);
      gl.uniform4f(L.uProtect, ...(v.protect || NOPROTECT));
    });
  }
  function finish() {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, targets[cur].f); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  }
  return {setVial, begin, glass, vial, finish, gl};
}
