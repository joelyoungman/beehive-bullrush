/* Bullrush on the Parliament Lawn — a satirical playground game.
   World: x 0..W across the lawn, y 0..L from the North End (far, by the Beehive) to the South End (near). */
(() => {
'use strict';
window.__dodge = 0.7; window.__leash = 24; window.__tspd = 0.7; window.__hunt = 120;   // chance a Runner slips a tackle on top of their stiff-arm strength
const D = window.BULLRUSH_DATA;
let W = 160, L = 100, ZN = 13, ZS = 87, HZ = false;
const V = { farY: 0.43, nearY: 0.955, farH: 0.30, nearH: 0.415, s0: 0.6 };
// Wide screens play left-to-right (North End on the left); tall screens play top-to-bottom.
function setLayout() {
  HZ = window.innerWidth / window.innerHeight >= 1.2;
  if (HZ) { W = 84; L = 190; ZN = 17; ZS = 173; Object.assign(V, { farY: 0.5, nearY: 0.925, farH: 0.365, nearH: 0.455, s0: 0.72 }); }
  else { W = 160; L = 100; ZN = 13; ZS = 87; Object.assign(V, { farY: 0.43, nearY: 0.955, farH: 0.30, nearH: 0.415, s0: 0.6 }); }
  placeCameos();
}
const depth = o => HZ ? o.x : o.y;
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const pick = a => a[Math.floor(Math.random() * a.length)];
const TAU = Math.PI * 2;
const INK = '#1B2A41', PAPER = '#F3E9D2', RED = '#E4572E', GOLD = '#F2B134';
const SHOUT = '"Bowlby One", ${SHOUT}, sans-serif', LABEL = '"Barlow Condensed", "Arial Narrow", "Trebuchet MS", sans-serif';
if (document.fonts && document.fonts.load) { document.fonts.load('20px "Bowlby One"'); document.fonts.load('700 20px "Barlow Condensed"'); }

/* ---------- view ---------- */
let VW = 1, VH = 1, DPR = 1, K = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = window.innerWidth; VH = window.innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  K = clamp(Math.min(VH / 720, VW / 1150), 0.42, 1.7);
  document.documentElement.style.setProperty('--ui', clamp(K, 0.75, 1.6).toFixed(2));
}
window.addEventListener('resize', resize); resize();
function proj(x, y) {
  const a = HZ ? y / L : x / W, d = HZ ? x / W : y / L, farY = VH * V.farY, nearY = VH * V.nearY;
  const half = lerp(VW * V.farH, VW * V.nearH, d);
  return { x: VW / 2 + (a - 0.5) * 2 * half, y: farY + (nearY - farY) * d, s: lerp(V.s0, 1, clamp(d, -0.3, 1.2)) * K };
}

/* ---------- portraits ---------- */
const sprites = {};      // name -> 160px circular canvas
const hasPhoto = {};
const listeners = [];
// Optional per-photo crop tweaks: centre x, centre y, size (fractions of image width/height/width).
const CROP = {
  'Craig Renney': { cx: 0.49, cy: 0.3, s: 0.5 }, 'Jessica Rowe': { cx: 0.52, cy: 0.31, s: 0.26 }, 'Daniel Eb': { cx: 0.49, cy: 0.28, s: 0.3 },
  'Eden Skipper': { cx: 0.5, cy: 0.32, s: 0.27 },
  'Sarah Lucas': { cx: 0.51, cy: 0.29, s: 0.25 }, 'Taine Randell': { cx: 0.757, cy: 0.34, s: 0.11 }, 'Craig Stobo': { cx: 0.735, cy: 0.31, s: 0.11 },
  'Paul Henry': { cx: 0.5, cy: 0.45, s: 0.62 },
  'Todd McClay': { cx: 0.5, cy: 0.4, s: 0.7 },
  'Andrew Hoggard': { cx: 0.5, cy: 0.4, s: 0.75 },
};
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// Give each head a printed-programme finish: a little faded, warm, with a faint dot screen.
let dotScreen = null;
function gloss(g) {
  g.save();
  g.globalCompositeOperation = 'saturation'; g.fillStyle = 'rgba(128,128,128,.22)'; g.fillRect(0, 0, 160, 160);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(243,226,190,.55)'; g.fillRect(0, 0, 160, 160);
  g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(27,42,65,.16)'; g.fillRect(0, 0, 160, 160);
  if (!dotScreen) { const c = document.createElement('canvas'); c.width = c.height = 5; const d = c.getContext('2d'); d.fillStyle = 'rgba(27,42,65,.5)'; d.beginPath(); d.arc(2.5, 2.5, 0.9, 0, TAU); d.fill(); dotScreen = c; }
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.35; g.fillStyle = g.createPattern(dotScreen, 'repeat'); g.fillRect(0, 0, 160, 160);
  g.restore();
}
function standIn(p, color) {
  // A cardboard cut-out mask with a name tag, used when no verified photo exists.
  const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d');
  let h = hash(p.name); const r = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000) / 1000;
  g.beginPath(); g.arc(80, 80, 80, 0, TAU); g.clip();
  g.fillStyle = color; g.fillRect(0, 0, 160, 160);
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, 160, 160);
  g.fillStyle = '#d2a56d'; g.strokeStyle = '#7a5630'; g.lineWidth = 4;
  g.beginPath(); g.ellipse(80, 78, 52, 62, 0, 0, TAU); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(122,86,48,.35)'; g.lineWidth = 1.5;
  for (let y = 30; y < 135; y += 9) { g.beginPath(); g.moveTo(34, y); g.lineTo(126, y); g.stroke(); }
  g.strokeStyle = '#3b2a1c'; g.lineWidth = 6; g.lineCap = 'round';
  const style = Math.floor(r() * 4), n = 7 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (1.08 + 0.84 * i / (n - 1)), len = style === 0 ? 10 : style === 1 ? 22 : style === 2 ? 34 : 16 + r() * 22;
    const x0 = 80 + Math.cos(a) * 50, y0 = 74 + Math.sin(a) * 58;
    g.beginPath(); g.moveTo(x0, y0);
    g.quadraticCurveTo(x0 + Math.cos(a) * len + (r() - 0.5) * 16, y0 + Math.sin(a) * len * 0.6, x0 + Math.cos(a) * len * (style === 2 ? 0.4 : 1) + (style === 2 ? Math.sign(Math.cos(a)) * 10 : 0), y0 + (style === 2 ? len : Math.sin(a) * len));
    g.stroke();
  }
  g.fillStyle = '#fff'; g.strokeStyle = '#3b2a1c'; g.lineWidth = 3;
  for (const s of [-1, 1]) { g.beginPath(); g.arc(80 + s * 20, 66, 12, 0, TAU); g.fill(); g.stroke(); }
  g.fillStyle = INK; for (const s of [-1, 1]) { g.beginPath(); g.arc(80 + s * 20 + (r() - 0.5) * 8, 68, 5, 0, TAU); g.fill(); }
  g.strokeStyle = '#3b2a1c'; g.lineWidth = 4; g.beginPath(); g.arc(80, 88, 24, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 3; g.fillRect(14, 118, 132, 26); g.strokeRect(14, 118, 132, 26);
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 20; g.font = `900 ${fs}px Arial`; while (g.measureText(p.short.toUpperCase()).width > 122 && fs > 9) { fs--; g.font = `900 ${fs}px Arial`; }
  g.fillText(p.short.toUpperCase(), 80, 132);
  gloss(g);
  return c;
}
function rawCrop(img, name) {   // the square head crop, unclipped
  const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d');
  const w = img.naturalWidth, h = img.naturalHeight, o = CROP[name];
  let s = Math.min(w, h * 0.8) * 0.86, cx = w / 2, top = Math.max(0, h * 0.36 - s / 2);
  if (o) { s = o.s * w; cx = o.cx * w; top = Math.max(0, o.cy * h - s / 2); }
  g.fillStyle = '#ccc'; g.fillRect(0, 0, 160, 160);
  g.drawImage(img, cx - s / 2, top, s, s, 0, 0, 160, 160);
  return c;
}
function photoSprite(raw) {       // the round face disc
  const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d');
  g.beginPath(); g.arc(80, 80, 80, 0, TAU); g.clip();
  g.drawImage(raw, 0, 0);
  gloss(g);
  return c;
}
/* ---------- bobbleheads (Sarah's prototype, in the programme style) ---------- */
// Bobble mode cuts each head out of its photo (egg-shaped mask plus a flood-fill of the plain background),
// then bakes a cream sticker edge and an ink outline into a 200px sprite. Falls back to the face disc when
// the photo's pixels can't be read.
let BOBBLE = true;
try { const q = new URLSearchParams(location.search).get('bobble'); if (q !== null) BOBBLE = q !== '0'; else if (localStorage.getItem('bullrush.bobble') === '0') BOBBLE = false; } catch (e) {}
const bobbles = {};      // name -> 200px cut-out head canvas (transparent background)
function eggMask(N) {
  // 1 inside a head-shaped egg (wide crown, narrower jaw), feathered over ~3px.
  const a = new Float32Array(N * N), cx = N / 2, cy = N * 0.47, rx = N * 0.4, ryT = N * 0.46, ryB = N * 0.45;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dy = y - cy, ny = dy / (dy < 0 ? ryT : ryB), t = Math.max(0, ny);
    const rxy = rx * (1 - 0.28 * t * t), nx = (x - cx) / rxy, d = Math.sqrt(nx * nx + ny * ny);
    a[y * N + x] = clamp((1 - d) * Math.min(rxy, ryB) / 3 + 0.5, 0, 1);
  }
  return a;
}
let EGG = null;
function cutHead(src) {
  // src: 160px square crop (same framing as the disc). Returns a 200px canvas, or null if unreadable.
  const N = 160, w = document.createElement('canvas'); w.width = w.height = N; const g = w.getContext('2d', { willReadFrequently: true });
  g.drawImage(src, 0, 0);
  let id; try { id = g.getImageData(0, 0, N, N); } catch (e) { return null; }
  const px = id.data; EGG = EGG || eggMask(N);
  // background colours: sample the top edge and the upper part of both sides
  const bg = [];
  for (let i = 0; i < N; i += 6) {
    bg.push(i * 4);
    if (i < N * 0.62) bg.push((i * N + 1) * 4, (i * N + N - 2) * 4);
  }
  const cols = bg.map(o => [px[o], px[o + 1], px[o + 2]]);
  const near = o => { const r = px[o], gg = px[o + 1], b = px[o + 2]; for (const c of cols) { if ((r - c[0]) ** 2 + (gg - c[1]) ** 2 + (b - c[2]) ** 2 < 900) return true; } return false; };
  // flood from the border through background-coloured pixels; never into the protected face core
  const gone = new Uint8Array(N * N), seen = new Uint8Array(N * N), stack = [];
  const core = (x, y) => ((x - 80) / 40) ** 2 + ((y - 78) / 50) ** 2 < 1;
  for (let i = 0; i < N; i++) stack.push(i, 0, 0, i, N - 1, i);
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || y < 0 || x >= N || y >= N) continue;
    const k = y * N + x; if (seen[k]) continue; seen[k] = 1;
    if (core(x, y) || !near(k * 4)) continue;
    gone[k] = 1; stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  let inEgg = 0, cut = 0; for (let k = 0; k < N * N; k++) if (EGG[k] > 0.5) { inEgg++; if (gone[k]) cut++; }
  const useFill = cut / inEgg < 0.42;   // it ate too much: skin or hair matches the backdrop, so trust the egg alone
  // Heads have no holes in them: keep every pixel between the outermost kept pixels on each row, which
  // closes notches the flood bit into bald heads and sky-coloured shirts. Then smooth the outline.
  let keep = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    let a = -1, b = -1;
    for (let x = 0; x < N; x++) if (!(useFill && gone[y * N + x]) && EGG[y * N + x] > 0.5) { if (a < 0) a = x; b = x; }
    for (let x = 0; x < N; x++) keep[y * N + x] = !useFill || (a >= 0 && x >= a - 2 && x <= b + 2) ? 1 : 0;
  }
  const box = (m, r) => { const o = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let t = 0, n = 0; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < N && yy < N) { t += m[yy * N + xx]; n++; } } o[y * N + x] = t / n; } return o; };
  if (useFill) { keep = box(keep, 3); for (let k = 0; k < N * N; k++) keep[k] = keep[k] > 0.5 ? 1 : 0; keep = box(keep, 1); }
  // print finish on the whole crop first, then cut it to the head shape
  g.drawImage(src, 0, 0); gloss(g);
  const fin = g.getImageData(0, 0, N, N), fp = fin.data;
  for (let k = 0; k < N * N; k++) fp[k * 4 + 3] = Math.round(255 * EGG[k] * keep[k]);
  g.clearRect(0, 0, N, N); g.putImageData(fin, 0, 0);
  // compose like a cut-out sticker: ink outline, cream paper edge, then the head
  const M = 200, out = document.createElement('canvas'); out.width = out.height = M; const o = out.getContext('2d');
  const stamp = (col, r) => { const sil = document.createElement('canvas'); sil.width = sil.height = N; const sg = sil.getContext('2d');
    sg.drawImage(w, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = col; sg.fillRect(0, 0, N, N);
    for (let a = 0; a < TAU; a += TAU / 20) o.drawImage(sil, off + Math.cos(a) * r, off + Math.sin(a) * r); };
  const off = (M - N) / 2;
  stamp(INK, 9); stamp('#FBF6EA', 6.5);
  o.drawImage(w, off, off);
  out.dataset.cut = useFill ? 'fill' : 'egg';
  return out;
}
const headSprite = name => (BOBBLE && bobbles[name]) || sprites[name];
const queue = [];
let loading = 0;
function pump() {
  while (loading < 4 && queue.length) {
    const job = queue.shift(); loading++;
    const img = new Image(); if (job.cors) img.crossOrigin = 'anonymous';
    img.onload = () => { loading--; job.ok(img); pump(); };
    img.onerror = () => { loading--; if (job.tries++ < 1) setTimeout(() => { queue.push(job); pump(); }, 1800); else if (job.fail) job.fail(); else { console.warn('Bullrush: using a stand-in, photo did not load for', job.label); } pump(); };
    img.src = job.url;
  }
}
function loadPortrait(p, color) {
  sprites[p.name] = standIn(p, color);
  if (!p.img) return;
  const ok = img => { const raw = rawCrop(img, p.name); sprites[p.name] = photoSprite(raw); hasPhoto[p.name] = true; const b = cutHead(raw); if (b) bobbles[p.name] = b; listeners.forEach(f => f(p.name)); };
  // Try the CORS-enabled thumbnail first (needed for the cut-out); fall back to the plain photo URL.
  if (p.cors) queue.push({ url: p.cors, cors: true, label: p.name, tries: 1, ok, fail: () => queue.push({ url: p.img, label: p.name, tries: 0, ok }) });
  else queue.push({ url: p.img, label: p.name, tries: 0, ok });
}
for (const pt of D.parties) for (const m of pt.members) loadPortrait(m, pt.color);
for (const m of D.departed) loadPortrait(m, '#888888');
let bgImg = null;
queue.push({ url: D.env.backgrounds[0].url, label: 'background', tries: 0, ok: img => { bgImg = img; } });
pump();
const depName = k => (D.departed.find(d => d.name.includes(k)) || {}).name;

/* ---------- audio (all synthesised) ----------
   One palette: marimba-like plucks tuned to a C pentatonic scale, soft pops, airy whooshes and low thumps,
   all through a small warm room and a gentle compressor so nothing is ever harsh. */
const PENTA = [0, 2, 4, 7, 9];
const Snd = {
  ac: null, out: null, bus: null, send: null, muted: false, music: null, combo: 0, lastSafe: 0, last: {},
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = this.ac = new AC();
    this.out = ac.createGain(); this.out.gain.value = this.muted ? 0 : 0.9;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
    const soft = ac.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 9000;
    this.bus = ac.createGain(); this.bus.connect(comp);
    const len = Math.floor(ac.sampleRate * 1.6), ir = ac.createBuffer(2, len, ac.sampleRate);   // a small, dark room
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let lp = 0; for (let i = 0; i < len; i++) { lp += ((Math.random() * 2 - 1) - lp) * 0.3; d[i] = lp * Math.pow(1 - i / len, 3.4); } }
    const rev = ac.createConvolver(); rev.buffer = ir; this.send = ac.createGain(); this.send.gain.value = 1; this.send.connect(rev); rev.connect(comp);
    comp.connect(soft); soft.connect(this.out); this.out.connect(ac.destination);
    const n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
    this.ambience();
  },
  setMuted(m) { this.muted = m; if (this.out) this.out.gain.value = m ? 0 : 0.9; },
  ok(key, ms) { const t = performance.now(); if (t - (this.last[key] || 0) < ms) return false; this.last[key] = t; return true; },   // stops pile-ups stacking the same sound
  hz(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  scale(i) { return 60 + 12 * Math.floor(i / 5) + PENTA[i % 5]; },
  wire(g, rev) { g.connect(this.bus); if (rev) { const sd = this.ac.createGain(); sd.gain.value = rev; g.connect(sd); sd.connect(this.send); } },
  v(freq, o = {}) {      // one pitched voice
    if (!this.ac) return; const ac = this.ac, t = ac.currentTime + Math.max(0, o.when || 0), osc = ac.createOscillator(), g = ac.createGain(), d = o.d || 0.3, vol = o.vol || 0.2;
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || d));
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (o.a || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    let node = osc; if (o.lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; osc.connect(fl); node = fl; }
    node.connect(g); this.wire(g, o.rev); osc.start(t); osc.stop(t + d + 0.05);
  },
  n(o = {}) {            // one filtered-noise voice
    if (!this.ac) return; const ac = this.ac, t = ac.currentTime + Math.max(0, o.when || 0), src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(), d = o.d || 0.2, vol = o.vol || 0.1;
    src.buffer = this.noiseBuf; src.loop = true; fl.type = o.type || 'bandpass'; fl.frequency.setValueAtTime(o.f || 1000, t); if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + d); fl.Q.value = o.q || 1;
    g.gain.setValueAtTime(0.0001, t);
    if (o.swell) { g.gain.linearRampToValueAtTime(vol, t + d * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + d); }
    else { g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d); }
    src.connect(fl); fl.connect(g); this.wire(g, o.rev); src.start(t, Math.random() * 1.5); src.stop(t + d + 0.05);
  },
  tone(fq, dur, type = 'sine', vol = 0.2, when = 0, f2 = null, lp = 0) { this.v(fq, { d: dur, type, vol, when, to: f2, lp, rev: 0.15 }); },
  noise(dur, vol, freq, q = 1, when = 0, swell = false) { this.n({ d: dur, vol, f: freq, q, when, swell, rev: 0.2 }); },
  pluck(m, vol = 0.2, when = 0) { const fq = this.hz(m); this.v(fq, { d: 0.6, vol, when, rev: 0.35 }); this.v(fq * 4, { d: 0.1, vol: vol * 0.28, when, rev: 0.2 }); this.v(fq * 2, { d: 0.24, vol: vol * 0.14, when, type: 'triangle' }); },
  pop(when = 0, fq = 520, vol = 0.25) { this.v(fq, { d: 0.09, to: fq * 0.35, vol, when }); },
  thump(when = 0, vol = 0.28) { this.v(92, { d: 0.22, to: 52, vol, when }); },
  ui() { this.init(); this.pop(0, 680 + Math.random() * 140, 0.11); this.pluck(this.scale(5 + Math.floor(Math.random() * 5)), 0.06, 0.01); },
  go() { for (let i = 0; i < 6; i++) this.pluck(this.scale(i + 3), 0.15, i * 0.07); this.n({ d: 0.55, vol: 0.05, f: 1200, to: 5200, q: 0.8, rev: 0.3 }); },
  boing() { if (!this.ok('boing', 70)) return; const fq = 170 + Math.random() * 50; this.v(fq, { d: 0.34, to: fq * 2.2, glide: 0.1, vol: 0.18, lp: 1400, rev: 0.2 }); this.v(fq * 2.2, { d: 0.3, to: fq * 1.2, vol: 0.1, when: 0.09, lp: 1600 }); this.pop(0, 300, 0.14); },
  juke() { if (!this.ok('juke', 60)) return; this.n({ d: 0.22, vol: 0.06, f: 900, to: 3200, q: 1.2, rev: 0.2 }); this.pluck(this.scale(7 + Math.floor(Math.random() * 3)), 0.08, 0.03); },
  tag() { if (!this.ok('tag', 70)) return; this.pop(0, 420, 0.26); this.n({ d: 0.12, vol: 0.08, f: 500, q: 0.7 }); this.thump(0, 0.26); this.pluck(67, 0.11, 0.06); this.pluck(60, 0.13, 0.17); },
  safe() {   // each Runner home in quick succession climbs the scale
    if (!this.ok('safe', 45)) return; const now = performance.now(); if (now - this.lastSafe > 2600) this.combo = 0; this.lastSafe = now;
    const i = Math.min(this.combo++, 14); this.pluck(this.scale(i + 2), 0.19); this.pluck(this.scale(i + 4), 0.11, 0.07); this.v(this.hz(this.scale(i + 2) + 24), { d: 0.7, vol: 0.028, rev: 0.6, when: 0.02 });
  },
  bonk() { const m = this.scale(4 + Math.floor(Math.random() * 4)); this.v(this.hz(m) * 2, { d: 0.07, vol: 0.22, type: 'triangle', lp: 3000 }); this.pop(0, 480, 0.26); this.pluck(m + 12, 0.1, 0.05); this.thump(0, 0.18); },
  trip() { this.v(300, { d: 0.3, to: 90, vol: 0.18, lp: 1200, rev: 0.2 }); this.thump(0.2, 0.26); this.n({ d: 0.15, vol: 0.05, f: 400, q: 0.6, when: 0.2 }); },
  slip() { this.trip(); },
  groan() {},
  paper() { if (!this.ok('paper', 120)) return; for (let i = 0; i < 4; i++) this.n({ d: 0.05 + Math.random() * 0.05, vol: 0.045, f: 3500 + Math.random() * 2500, q: 0.6, when: i * 0.07 + Math.random() * 0.03 }); this.pluck(64, 0.07, 0.32); this.pluck(62, 0.07, 0.47); },
  toss() { this.n({ d: 0.35, vol: 0.07, f: 1500, to: 4500, q: 0.9, rev: 0.2 }); for (let i = 0; i < 5; i++) this.n({ d: 0.04, vol: 0.035, f: 4000 + Math.random() * 2000, q: 0.7, when: 0.08 + i * 0.06 }); },
  whistle(len = 0.7) {   // a pea whistle heard across a field, not in your ear
    if (!this.ac) return; const ac = this.ac, t = ac.currentTime;
    for (const fq of [2250, 2330]) {
      const o = ac.createOscillator(), g = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain();
      o.type = 'sine'; o.frequency.value = fq; l.frequency.value = 27; lg.gain.value = 0.025; l.connect(lg); lg.connect(g.gain);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.04, t + 0.03); g.gain.setValueAtTime(0.04, t + len - 0.08); g.gain.linearRampToValueAtTime(0.0001, t + len);
      o.connect(g); this.wire(g, 0.6); o.start(t); l.start(t); o.stop(t + len + 0.05); l.stop(t + len + 0.05);
    }
    this.n({ d: len, vol: 0.01, f: 4200, q: 2 });
  },
  cheer(v = 0.25, dur = 1.6) { this.n({ d: dur, vol: v * 0.3, f: 1000, q: 0.4, swell: true, rev: 0.4 }); this.n({ d: dur, vol: v * 0.16, f: 2600, q: 0.6, swell: true, when: 0.05 }); },
  win() { [0, 2, 4, 5, 7, 9].forEach((st, i) => this.pluck(this.scale(st + 2), 0.19, i * 0.11)); [72, 76, 79, 84].forEach(m => this.v(this.hz(m), { d: 2, vol: 0.045, when: 0.7, rev: 0.7, a: 0.06 })); },
  ambience() {   // a quiet lawn: a breath of wind and the odd bird
    const ac = this.ac, src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = this.noiseBuf; src.loop = true; fl.type = 'lowpass'; fl.frequency.value = 380; g.gain.value = 0.018; src.connect(fl); fl.connect(g); g.connect(this.bus); src.start();
    const bird = () => { if (this.ac.state === 'running' && !document.hidden) { const base = 2600 + Math.random() * 1500, k = 2 + Math.floor(Math.random() * 4); for (let i = 0; i < k; i++) this.v(base * (1 + Math.random() * 0.12), { d: 0.09, to: base * 1.32, vol: 0.016, when: i * 0.13, rev: 0.8 }); } setTimeout(bird, 3500 + Math.random() * 7000); };
    setTimeout(bird, 2500);
  },
  startMusic() {   // a lazy toy-band shuffle: marimba tune, soft tuba, brushed shaker
    if (!this.ac || this.music) return;
    const beat = 60 / 104 / 2;
    const mel = [[67, 72, 76, 72, 79, 0, 76, 0], [74, 72, 71, 72, 76, 0, 0, 0], [69, 72, 77, 72, 81, 0, 77, 0], [79, 77, 74, 71, 67, 0, 0, 0],
                 [67, 72, 76, 72, 79, 0, 84, 0], [81, 79, 76, 72, 69, 0, 0, 0], [74, 77, 81, 77, 79, 74, 71, 67], [72, 0, 76, 0, 72, 0, 0, 0]];
    const bass = [[36, 43], [36, 43], [41, 36], [43, 38], [36, 43], [45, 40], [38, 43], [36, 43]];
    const chord = [[60, 64, 67], [60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67], [60, 64, 69], [62, 65, 69], [60, 64, 67]];
    let step = 0, next = this.ac.currentTime + 0.1;
    this.music = setInterval(() => {
      while (next < this.ac.currentTime + 0.25) {
        const bar = Math.floor(step / 8) % 8, i = step % 8, w = next - this.ac.currentTime + (i % 2 ? beat * 0.16 : 0);
        const nt = mel[bar][i]; if (nt) this.pluck(nt, 0.075, w);
        if (i % 4 === 0) { const b = this.hz(bass[bar][(i / 4) % 2]); this.v(b, { d: beat * 2.2, vol: 0.15, when: w, type: 'triangle', lp: 420 }); this.v(b, { d: beat * 1.6, vol: 0.09, when: w }); }
        if (i % 4 === 2) { for (const c of chord[bar]) this.v(this.hz(c), { d: beat * 1.1, vol: 0.016, when: w, type: 'triangle', lp: 1100, rev: 0.3 }); this.n({ d: 0.07, vol: 0.018, f: 5200, q: 0.7, when: w }); }
        else if (i % 2) this.n({ d: 0.04, vol: 0.011, f: 7000, q: 0.8, when: w });
        step++; next += beat;
      }
    }, 60);
  },
  stopMusic() { if (this.music) { clearInterval(this.music); this.music = null; } },
};

/* ---------- game state ---------- */
const G = { phase: 'builder', dir: 1, round: 0, t: 0, time: 0, mps: [], sheets: [], flying: [], fx: [], waves: [], puffs: [], init: 0, shake: 0, endT: 0, assign: {} };
const partyOf = id => D.parties.find(p => p.id === id);

function makeMP(m, party, team) {
  const h = hash(m.name);
  return { name: m.name, short: m.short, party, team, role: team === 1 ? 'runner' : 'tagger', x: 0, y: 0, vx: 0, vy: 0, pvx: 0, pvy: 0,
    spd: 15.5 + (h % 100) / 100 * 4.5 + (m.leader ? 0.8 : 0), str: 0.1 + ((h >> 8) % 100) / 100 * 0.2,
    state: 'idle', stun: 0, safe: false, conv: false, joined: false, delay: 0, saCd: 0, lunge: 0, lungeCd: rand(0, 1), tgt: null, think: 0,
    jf: rand(1.5, 3.2), jp: rand(TAU), phase: rand(TAU), side: h % 2 ? 1 : -1, pose: '', poseT: 0, hop: 0,
    hd: { ox: 0, oy: 0, vx: 0, vy: 0, a: 0, va: 0 }, tx: 0, ty: 0, sx: 0, sy: 0, U: 1 };
}
function startMatch() {
  Snd.init();
  setLayout(); G.puffs = [];
  G.mps = [];
  for (const p of D.parties) { const t = G.assign[p.id]; if (t) for (const m of p.members) G.mps.push(makeMP(m, p, t)); }
  G.sheets = []; G.flying = []; G.fx = []; G.waves = []; G.round = 1; G.dir = 1;
  G.init = G.mps.filter(m => m.role === 'runner').length;
  formation(true); G.phase = 'call'; G.t = 0; callRound();
  $('builder').classList.add('hidden'); $('over').classList.add('hidden'); $('hud').classList.remove('hidden'); $('menu').classList.remove('hidden'); $('hint').classList.remove('hidden');
  Snd.init(); Snd.go(); Snd.startMusic(); hud();
}
function formation(snap) {
  const runners = G.mps.filter(m => m.role === 'runner').sort((a, b) => a.x - b.x || a.name.localeCompare(b.name));
  const taggers = G.mps.filter(m => m.role === 'tagger').sort((a, b) => a.x - b.x || a.name.localeCompare(b.name));
  const zy = G.dir > 0 ? ZN * 0.5 : (ZS + L) / 2;
  if (snap) { runners.sort(() => rand() - 0.5); taggers.sort(() => rand() - 0.5); }
  const tight = (W - 16) / Math.max(1, runners.length) < 4.2;
  runners.forEach((m, i) => { m.tx = lerp(8, W - 8, runners.length > 1 ? i / (runners.length - 1) : 0.5); m.ty = zy + (tight ? ((i % 3) - 1) * 4 : (i % 2 ? 2.4 : -2.4) * (runners.length > 12 ? 1 : 0.3)); });
  const rows = Math.max(1, Math.ceil(taggers.length / Math.max(5, Math.round(W / 12))));
  taggers.forEach((m, i) => { const r = i % rows, n = Math.ceil(taggers.length / rows), c = Math.floor(i / rows);
    m.tx = lerp(9, W - 12, n > 1 ? c / (n - 1) : 0.5) + (r % 2 ? 3 : 0); m.ty = L / 2 + (r - (rows - 1) / 2) * (HZ ? 11 : 8); });
  for (const m of G.mps) { m.safe = false; m.conv = false; m.joined = m.role === 'tagger'; if (snap) { m.x = m.tx; m.y = m.ty; m.vx = m.vy = 0; } m.state = 'idle'; m.stun = 0; }
}
function callRound() {
  Snd.whistle(0.9); cam.gerry.blow = 1.2;
  banner('BULLRUSH!', G.round === 1 ? 'Runners: get to the South End!' : `Round ${G.round} — back to the ${G.dir > 0 ? 'South' : 'North'} End!`);
  setTimeout(() => Snd.cheer(0.22, 1.8), 350);
  for (const m of G.mps) { m.delay = m.role === 'runner' ? rand(0, 0.9) : rand(0, 0.3); m.saCd = 0; m.tgt = null; }
  Snd.combo = 0;
}
function banner(big, small) { const b = $('banner'); b.innerHTML = big + (small ? `<small>${small}</small>` : ''); b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); }
function fx(x, y, text, color = '#fff', size = 1) { G.fx.push({ x, y, text, color, size, t: 0 }); }
function knock(m, t, state = 'down') { if (state === 'down' && m.state !== 'down') m.kt = G.time; m.stun = Math.max(m.stun, t); m.state = state; m.lunge = 0; }
function bump(m, ix, iy, spin) { m.hd.vx += ix; m.hd.vy += iy; m.hd.va += spin; }

function hud() {
  const runners = G.mps.filter(m => m.role === 'runner' && !m.conv), taggers = G.mps.filter(m => m.role === 'tagger' || m.conv);
  $('n1').textContent = runners.length; $('n2').textContent = taggers.length;
  const badges = list => D.parties.map(p => { const n = list.filter(m => m.party === p).length; return n ? `<span class="badge" style="background:${p.color};color:${p.text}">${p.name} ${n}</span>` : ''; }).join('');
  $('b1').innerHTML = badges(runners) || '<span class="badge" style="background:#444">nobody left</span>'; $('b2').innerHTML = badges(taggers);
  $('rnd').textContent = 'Round ' + G.round; $('dir').textContent = HZ ? (G.dir > 0 ? 'to the South End ▶' : '◀ to the North End') : (G.dir > 0 ? '▼ to the South End' : '▲ to the North End');
}

/* ---------- sideline cameos ---------- */
const cam = {
  gerry: { x: -15, y: 50, cd: 0, blow: 0, order: 0, orderCd: 0 },
  nicola: { x: W + 15, y: 57, cd: 0, toss: 0, auto: 4 },
  bishop: { x: W + 12, y: 25, say: '', sayT: 0, next: 3 },
  gold: { x: W + 6.5, y: 78, dir: 1, shake: 0 },
  penk: { x: -9.5, y: 85, sip: 0, next: 5 },
  ferris: { x: -17, y: 9, fist: 0 }, kapa: { x: W + 17, y: 7, fist: 0 },
};
function placeCameos() {
  const c = cam, set = (o, x, y) => { o.x = x; o.y = y; };
  if (HZ) { set(c.gerry, -10, L / 2); set(c.nicola, -9, L * 0.8); set(c.bishop, -9, L * 0.2); set(c.penk, W + 4, L * 0.1); set(c.ferris, -8, -15); set(c.kapa, -8, L + 15);
    c.trees = [[W * 0.62, -16, 37], [W * 0.56, L + 16, 58]]; c.flags = [[-15, L * 0.36], [-15, L * 0.64]]; }
  else { set(c.gerry, -15, 50); set(c.nicola, W + 15, 57); set(c.bishop, W + 12, 25); set(c.penk, -9.5, 85); set(c.ferris, -17, 9); set(c.kapa, W + 17, 7);
    c.trees = [[-25, 31, 37], [W + 26, 40, 58]]; c.flags = [[-7, -3], [W + 7, -3]]; }
  c.gold.p = 0.5; c.gold.dir = 1;
}
const HECKLES = ['Keep left!', 'Call that a tackle?', 'Merge like a zip!', 'Traffic is backing up!', 'Move it, Taggers!', 'Eyes on the road!', 'That lane is closed!', 'Faster! Faster!'];
function tossSheet(n) {
  for (let i = 0; i < n; i++) G.flying.push({ x0: cam.nicola.x, y0: cam.nicola.y, x1: rand(8, W - 8), y1: rand(ZN + 6, ZS - 6), t: -i * 0.15, rot: rand(TAU) });
  cam.nicola.toss = 0.6;
}
function shockwave() {
  G.waves.push({ x: cam.gerry.x, y: cam.gerry.y, r: 0, hit: new Set() });
  Snd.whistle(1.1); cam.gerry.blow = 1.3; cam.gerry.order = 1.6; G.shake = 0.5;
}
function updateCameos(dt) {
  const g = cam.gerry, n = cam.nicola, b = cam.bishop, go = cam.gold, pk = cam.penk, run = G.phase === 'run';
  g.cd = Math.max(0, g.cd - dt); g.blow = Math.max(0, g.blow - dt); g.order = Math.max(0, g.order - dt); g.orderCd = Math.max(0, g.orderCd - dt);
  n.cd = Math.max(0, n.cd - dt); n.toss = Math.max(0, n.toss - dt);
  if (run) {
    n.auto -= dt; if (n.auto <= 0) { n.auto = rand(4, 7); tossSheet(1); }
    if (g.orderCd <= 0) {   // pile-up check
      const down = G.mps.filter(m => m.state === 'down');
      for (const a of down) { let c = 0; for (const o of down) if (Math.hypot(a.x - o.x, a.y - o.y) < 13) c++; if (c >= 4) { g.order = 2; g.orderCd = 5; fx(a.x, a.y - 6, 'PILE-UP!', GOLD, 1.3); break; } }
    }
    b.next -= dt; if (b.next <= 0) { b.next = rand(3.5, 6); b.say = pick(HECKLES); b.sayT = 2.2; }
  }
  b.sayT = Math.max(0, b.sayT - dt);
  go.p += go.dir * dt * 0.12; if (go.p > 1) go.dir = -1; if (go.p < 0) go.dir = 1;
  if (HZ) { go.x = W + 5.5; go.y = lerp(L * 0.48, L * 0.86, go.p); } else { go.x = W + 6.5; go.y = lerp(68, 95, go.p); }
  go.shake = Math.max(0, go.shake - dt);
  if (run && go.shake <= 0) for (const m of G.mps) if (m.party.id === 'act' && m.state === 'run' && Math.abs(m.vy) > 6 && Math.hypot(m.x - go.x, m.y - go.y) < 30) { go.shake = 1.6; break; }
  pk.sip = Math.max(0, pk.sip - dt); pk.next -= dt; if (pk.next <= 0) { pk.next = rand(6, 11); pk.sip = 1.4; }
  cam.ferris.fist = Math.max(0, cam.ferris.fist - dt); cam.kapa.fist = Math.max(0, cam.kapa.fist - dt);
}

/* ---------- simulation ---------- */
function update(dt) {
  G.time += dt; G.t += dt; G.shake = Math.max(0, G.shake - dt);
  updateCameos(dt);
  for (const f of G.fx) f.t += dt; G.fx = G.fx.filter(f => f.t < 1.3);
  for (const f of G.puffs) f.t += dt; G.puffs = G.puffs.filter(f => f.t < 0.55);
  for (const s of G.flying) { s.t += dt / 0.8; if (s.t >= 1) G.sheets.push({ x: s.x1, y: s.y1, rot: s.rot, life: 16 }); }
  G.flying = G.flying.filter(s => s.t < 1);
  for (const s of G.sheets) s.life -= dt; G.sheets = G.sheets.filter(s => s.life > 0);
  for (const w of G.waves) {
    w.r += 120 * dt;
    for (const m of G.mps) if (!w.hit.has(m)) { const d = Math.hypot(m.x - w.x, m.y - w.y); if (d < w.r) { w.hit.add(m);
      if (G.phase === 'run' && !m.safe && !m.conv) { knock(m, 0.9, m.state === 'down' ? 'down' : 'stumble'); m.vx += (m.x - w.x) / (d || 1) * 9; bump(m, 7, -5, rand(-9, 9)); } else bump(m, 4, -3, rand(-5, 5)); } }
  }
  G.waves = G.waves.filter(w => w.r < 240);

  if (G.phase === 'builder' || G.phase === 'over') { for (const m of G.mps) body(m, dt); return; }
  const runners = G.mps.filter(m => m.role === 'runner'), taggers = G.mps.filter(m => m.role === 'tagger');

  if (G.phase === 'between') {
    let far = 0;
    for (const m of G.mps) { const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy); far = Math.max(far, d);
      const sp = Math.min(30, d * 4); m.vx = lerp(m.vx, d > 0.3 ? dx / d * sp : 0, Math.min(1, dt * 8)); m.vy = lerp(m.vy, d > 0.3 ? dy / d * sp : 0, Math.min(1, dt * 8));
      m.state = d > 0.6 ? 'run' : 'idle'; m.stun = 0; }
    if (far < 1 || G.t > 6) { G.phase = 'call'; G.t = 0; callRound(); }
  } else if (G.phase === 'call') {
    for (const m of G.mps) { m.vx *= 0.8; m.vy *= 0.8; m.state = 'idle'; if (m.role === 'runner') m.hop = Math.abs(Math.sin(G.time * 9 + m.jp)) * 1.5; }
    if (G.t > 1.5) { G.phase = 'run'; G.t = 0; for (const m of G.mps) m.hop = 0; }
  } else if (G.phase === 'run') {
    const live = runners.filter(m => !m.safe && !m.conv);
    const upT = taggers.filter(m => m.stun <= 0);
    G.leash = window.__leash + window.__hunt * Math.pow(1 - live.length / Math.max(1, G.init), 2);   // the fewer Runners left, the further Taggers roam
    for (const m of runners) runnerAI(m, dt, upT);
    const load = new Map();
    for (const m of taggers) if (m.tgt && live.includes(m.tgt)) load.set(m.tgt, (load.get(m.tgt) || 0) + 1); else m.tgt = null;
    for (const m of taggers) taggerAI(m, dt, live, load);
    // contact
    for (const t of taggers) { if (t.stun > 0) continue;
      for (const r of live) { if (r.conv || r.safe) continue; const d = Math.hypot(t.x - r.x, t.y - r.y); if (d > 2.7) continue;
        const roll = rand(); if (r.imm > 0) continue;
        if (r.stun <= 0 && roll < r.str + window.__dodge) {      // stiff-arm or sidestep
          r.imm = 0.45; const stiff = roll < r.str;
          r.saCd = 2.2; r.pose = 'stiff'; r.poseT = 0.5; r.side = t.x > r.x ? 1 : -1;
          knock(t, 1.3); t.vx = (t.x - r.x) / (d || 1) * 14; t.vy = (t.y - r.y) / (d || 1) * 10; bump(t, rand(-8, 8), -9, rand(-12, 12));
          fx(r.x, r.y - 8, stiff ? 'STIFF-ARM!' : pick(['JUKED!', 'SIDESTEP!', 'MISSED!']), '#FBF6EA'); if (stiff) Snd.boing(); else Snd.juke();
        } else {                                                   // tackled
          r.conv = true; knock(r, 2.2); r.vx = t.vx * 0.6; r.vy = t.vy * 0.6; bump(r, rand(-10, 10), -12, rand(-14, 14));
          knock(t, 0.55, 'stumble'); bump(t, 0, -6, rand(-6, 6)); t.tgt = null;
          fx(r.x, r.y - 8, pick(['TAGGED!', 'TACKLED!', 'GOTCHA!', 'CONVERTED!']), RED, 1.15);
          Snd.tag(); hud();
        }
        break; } }
    // spreadsheets
    for (const s of G.sheets) for (const m of G.mps) if (m.stun <= 0 && !m.safe && Math.hypot(m.vx, m.vy) > 5 && Math.hypot(m.x - s.x, m.y - s.y) < 2.7) {
      s.life = 0; knock(m, 2.8, 'read'); m.vx = m.vy = 0; bump(m, 0, 6, 0);   // sits down to read the budget
      fx(m.x, m.y - 8, pick(['READS THE BUDGET', 'OOH, A SPREADSHEET', 'CHECKS THE NUMBERS', 'JUST A QUICK LOOK']), '#8EC5E8'); Snd.paper(); break; }
    if (!live.length && !G.endT) G.endT = 1.4;
    if (G.t > (HZ ? 36 : 24) && !G.endT) { for (const r of live) { r.conv = true; knock(r, 1.5); } G.endT = 1.2; hud(); }
    if (G.endT) { G.endT -= dt; if (G.endT <= 0) { G.endT = 0; endRound(); } }
  }
  separate(dt);
  for (const m of G.mps) body(m, dt);
}
function runnerAI(m, dt, taggers) {
  m.saCd -= dt; m.imm = (m.imm || 0) - dt; m.poseT -= dt; if (m.poseT <= 0) m.pose = '';
  if (m.conv) { m.stun -= dt; m.vx *= 1 - Math.min(1, dt * 3); m.vy *= 1 - Math.min(1, dt * 3); if (m.stun <= 0) { m.state = 'idle'; m.pose = 'sad'; } return; }
  if (m.stun > 0) { m.stun -= dt; const f = m.state === 'down' ? 2.2 : 5; m.vx *= 1 - Math.min(1, dt * f); m.vy *= 1 - Math.min(1, dt * f); if (m.stun <= 0) m.state = 'run'; return; }
  const dir = G.dir;
  if (m.safe) { const gy = dir > 0 ? ZS + 6.5 : ZN - 6.5; m.vx *= 0.9; m.vy = lerp(m.vy, (gy - m.y) * 2, Math.min(1, dt * 5)); m.state = Math.abs(gy - m.y) > 0.6 ? 'run' : 'idle'; m.hop = Math.abs(Math.sin(G.time * 8 + m.jp)) * 2.2; m.pose = 'up'; m.poseT = 0.2; return; }
  if (m.delay > 0) { m.delay -= dt; m.state = 'idle'; return; }
  let ax = Math.sin(G.time * m.jf + m.jp) * 0.3, ay = 0;
  for (const t of taggers) { const dx = m.x - t.x, dy = m.y - t.y, d = Math.hypot(dx, dy); if (d > 27) continue;
    const ahead = (t.y - m.y) * dir, w = (27 - d) / 27 * (ahead > -3 ? 1 : 0.25);
    ax += (dx === 0 ? m.side : Math.sign(dx)) * w * (1.2 + 6 / (Math.abs(dx) + 4)); ay += dy / (d || 1) * w * 0.45; }
  if (m.x < 7) ax += (7 - m.x) * 0.5; if (m.x > W - 7) ax -= (m.x - (W - 7)) * 0.5;
  let dx = clamp(ax, -1.5, 1.5), dy = dir + ay; if (dy * dir < 0.3) dy = 0.3 * dir;
  const n = Math.hypot(dx, dy), near = dir > 0 ? ZS - m.y : m.y - ZN, sp = m.spd * (near < 14 ? 1.15 : 1);
  m.vx = lerp(m.vx, dx / n * sp, Math.min(1, dt * 7)); m.vy = lerp(m.vy, dy / n * sp, Math.min(1, dt * 7)); m.state = 'run';
  if (dir > 0 ? m.y >= ZS + 1 : m.y <= ZN - 1) {
    m.safe = true; fx(m.x, m.y - 8, 'SAFE!', GOLD); Snd.safe(); bump(m, 0, -8, 0);
    if (m.party.id === 'tpm') { cam.ferris.fist = 2.2; cam.kapa.fist = 2.2; }
  }
}
function taggerAI(m, dt, live, load) {
  m.lungeCd -= dt;
  if (m.stun > 0) { m.stun -= dt; const f = m.state === 'down' ? 2.2 : 5; m.vx *= 1 - Math.min(1, dt * f); m.vy *= 1 - Math.min(1, dt * f); if (m.stun <= 0) m.state = 'run'; return; }
  if (m.delay > 0) { m.delay -= dt; return; }
  m.think -= dt;
  if (m.think <= 0 || !m.tgt) { m.think = rand(0.25, 0.5); let best = null, bs = 1e9;
    for (const r of live) { if (r.delay > 0.4 || Math.hypot(r.x - m.tx, r.y - m.ty) > G.leash) continue;   /* taggers guard their own patch */ const d = Math.hypot(r.x - m.x, r.y - m.y), behind = (r.y - m.y) * G.dir > 3 ? 18 : 0;
      const s = d + behind + (load.get(r) || 0) * 11 - (m.tgt === r ? 9 : 0); if (s < bs) { bs = s; best = r; } }
    if (best !== m.tgt) { if (m.tgt) load.set(m.tgt, (load.get(m.tgt) || 1) - 1); if (best) load.set(best, (load.get(best) || 0) + 1); m.tgt = best; } }
  const r = m.tgt;
  if (!r) { const hx = m.tx - m.x, hy = m.ty - m.y, hd = Math.hypot(hx, hy), hs = Math.min(m.spd * 0.6, hd * 2); m.vx = lerp(m.vx, hd > 0.5 ? hx / hd * hs : 0, Math.min(1, dt * 5)); m.vy = lerp(m.vy, hd > 0.5 ? hy / hd * hs : 0, Math.min(1, dt * 5)); m.state = hd > 1 ? 'run' : 'idle'; return; }
  const d = Math.hypot(r.x - m.x, r.y - m.y), lead = Math.min(0.7, d / 20);
  let gx = r.x + r.vx * lead, gy = clamp(r.y + r.vy * lead, ZN + 1.5, ZS - 1.5);
  let sp = m.spd * window.__tspd;
  if (m.lunge > 0) { m.lunge -= dt; sp *= 1.55; if (m.lunge <= 0) { knock(m, 0.5, 'stumble'); m.lungeCd = 1.6; } }
  else if (d < 7.5 && m.lungeCd <= 0 && r.stun <= 0) { m.lunge = 0.34; m.pose = 'dive'; m.poseT = 0.4; }
  m.poseT -= dt; if (m.poseT <= 0) m.pose = '';
  const dx = gx - m.x, dy = gy - m.y, n = Math.hypot(dx, dy) || 1;
  m.vx = lerp(m.vx, dx / n * sp, Math.min(1, dt * 6)); m.vy = lerp(m.vy, dy / n * sp, Math.min(1, dt * 6)); m.state = 'run';
}
function separate(dt) {
  const a = G.mps;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { const p = a[i], q = a[j];
    if (G.phase === 'run' && p.role !== q.role && !p.conv && !q.conv) continue;
    let dx = q.x - p.x, dy = q.y - p.y; const d = Math.hypot(dx, dy); if (d > 3.4) continue;
    if (d < 0.01) { dx = 1; dy = 0; } const f = (3.4 - d) * 6 * dt / (d || 1);
    p.x -= dx * f; p.y -= dy * f; q.x += dx * f; q.y += dy * f; }
}
function body(m, dt) {
  m.x += m.vx * dt; m.y += m.vy * dt;
  m.x = clamp(m.x, 1.5, W - 1.5); m.y = clamp(m.y, 1, L - 1);
  if (m.role === 'tagger' && G.phase === 'run') m.y = clamp(m.y, ZN + 1, ZS - 1);
  const sp = Math.hypot(m.vx, m.vy), was = Math.sin(m.phase);
  const av = HZ ? m.vy : m.vx;
  if (sp > 1.5) { m.phase += dt * (5 + sp * 0.5); if (Math.abs(av) > 2) m.face = Math.sign(av); }
  if (was * Math.sin(m.phase) < 0 && sp > 3) { m.hd.vy += 3.4; if (sp > 10 && rand() < 0.7) G.puffs.push({ x: m.x, y: m.y, t: 0 }); }
  if (rand() < dt * 1.2) { m.hd.vx += rand(-1.6, 1.6); m.hd.va += rand(-1.4, 1.4); }   // idle jiggle      // footfall bounce
  const h = m.hd, wx = (m.vx - m.pvx) / dt, wy = (m.vy - m.pvy) / dt, axx = HZ ? wy : wx, ayy = HZ ? wx : wy; m.pvx = m.vx; m.pvy = m.vy;
  const k = 150, c = 6.5;
  h.vx += (-k * h.ox - c * h.vx - clamp(axx, -90, 90) * 0.085) * dt; h.vy += (-k * h.oy - c * h.vy - clamp(ayy, -90, 90) * 0.03) * dt;
  h.va += (-110 * h.a - 5.5 * h.va - clamp(axx, -90, 90) * 0.05) * dt;
  h.ox += h.vx * dt; h.oy += h.vy * dt; h.a += h.va * dt;
  h.ox = clamp(h.ox, -0.7, 0.7); h.oy = clamp(h.oy, -0.6, 0.45); h.a = clamp(h.a, -0.9, 0.9);
}
function endRound() {
  let newbies = 0;
  for (const m of G.mps) if (m.conv) { m.role = 'tagger'; m.conv = false; m.pose = ''; newbies++; }
  const left = G.mps.filter(m => m.role === 'runner');
  hud();
  if (left.length === 0) return gameOver(null);
  if (left.length === 1 && (G.init > 1 || G.round >= 5)) return gameOver(left[0]);
  G.round++; G.dir *= -1; G.phase = 'between'; G.t = 0; formation(false); hud();
}
function gameOver(last) {
  G.phase = 'over'; Snd.stopMusic(); Snd.cheer(0.4, 3); Snd.whistle(0.9); Snd.win();
  const t1 = D.parties.filter(p => G.assign[p.id] === 1).map(p => p.name).join(' + '), t2 = D.parties.filter(p => G.assign[p.id] === 2).map(p => p.name).join(' + ');
  const c = $('ovC'), g = c.getContext('2d'); g.clearRect(0, 0, 160, 160);
  if (last) { g.drawImage(sprites[last.name], 0, 0); c.style.borderColor = last.party.color;
    $('ovT').textContent = 'LAST MP STANDING'; $('ovH').textContent = last.name; $('ovP').textContent = `${last.party.name} outlasted everyone in ${G.round} round${G.round > 1 ? 's' : ''}. Team 1 (${t1}) takes the lawn.`;
    for (const m of G.mps) { m.state = 'idle'; m.vx = m.vy = 0; } last.pose = 'up'; last.poseT = 99;
  } else { g.drawImage(sprites[depName('Brownlee')], 0, 0); c.style.borderColor = INK;
    $('ovT').textContent = 'TOTAL CONVERSION'; $('ovH').textContent = 'Team 2 swallowed the House'; $('ovP').textContent = `${t2} tagged every last Runner from ${t1} in ${G.round} round${G.round > 1 ? 's' : ''}.`; }
  setTimeout(() => { if (G.phase === 'over') $('over').classList.remove('hidden'); }, 1300);
}

/* ---------- drawing ---------- */
function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, TAU); }
function limb(x0, y0, x1, y1, w, col) { ctx.strokeStyle = INK; ctx.lineWidth = w + 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); }
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function bubble(x, y, text, U, col = '#FBF6EA') {
  ctx.font = `700 ${Math.max(11, 15 * U)}px ${LABEL}`; const w = ctx.measureText(text).width + 14 * U, h = 22 * U;
  x = clamp(x, w / 2 + 4, VW - w / 2 - 4);
  ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(x - w / 2, y - h, w, h, 8 * U); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 5 * U, y - 1); ctx.lineTo(x, y + 7 * U); ctx.lineTo(x + 5 * U, y - 1); ctx.fill();
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y - h / 2);
}
const tints = new Map();
function tint(hex, f) {
  const k = hex + f; let v = tints.get(k); if (v) return v;
  const n = parseInt(hex.slice(1), 16), m = c => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f);
  v = `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`; tints.set(k, v); return v;
}
function seg(x0, y0, x1, y1, x2, y2, w, col) {   // a two-bone limb with a soft joint
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = w + 2.4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
}
/* One cartoon body with an oversized sprung head. (x,y) = feet on screen, U = pixel unit. */
function person(x, y, U, o) {
  const P = o.party || {}, suit = o.suit || P.color || '#555555', trim = o.trim || P.trim || '#222222', tie = o.tie || P.tie || '#ffffff';
  const hd = o.hd || { ox: 0, oy: 0, a: 0 }, st = o.state || 'idle', face = o.face || 1, ph = o.phase || 0;
  const run = o.moving ? clamp(o.run === undefined ? 0.7 : o.run, 0.25, 1) : 0, hop = (o.hop || 0) * U;
  const dive = o.pose === 'dive';
  ctx.save(); ctx.translate(x, y);
  const sh = clamp(1 - hop / (30 * U), 0.5, 1);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ell(0, 0, 15 * U * sh, 4.8 * U * sh); ctx.fill();
  if (o.ring) { ctx.strokeStyle = o.ring; ctx.lineWidth = 2.2 * U; ctx.globalAlpha = 0.9; ell(0, 0, 17 * U, 5.8 * U); ctx.stroke(); ctx.globalAlpha = 1; }
  const lie = st === 'down' ? (o.lie === undefined ? 1 : o.lie) : 0;
  if (lie) { ctx.translate(0, -6 * U * lie); ctx.rotate(lie * 1.45 * (o.side || 1)); }
  if (st === 'stumble') ctx.rotate(Math.sin(G.time * 21) * 0.2);
  const bob = run ? Math.abs(Math.sin(ph)) * 2.6 * U * run : 0;
  ctx.translate(0, -bob - hop);
  const onGrass = o.sit === 'ground', hipY = (onGrass ? -4 : o.sit ? -11 : -15) * U, shY = hipY - 19 * U, far = tint(trim, -0.25);
  // ---- legs ----
  if (o.sit) {
    for (const s of [-1, 1]) { const hx0 = s * 4 * U; if (onGrass) { seg(hx0, hipY, hx0 + face * 9 * U, hipY - (s > 0 ? 3 : 1) * U, hx0 + face * 17 * U, hipY + 2 * U, 5.2 * U, s < 0 ? far : trim); ctx.fillStyle = INK; ell(hx0 + face * 18.5 * U, hipY + 0.5 * U, 2.8 * U, 4.2 * U); ctx.fill(); }
      else { seg(hx0, hipY, hx0 + face * 9 * U, hipY + U, hx0 + face * 10 * U, hipY + 10 * U, 5.2 * U, s < 0 ? far : trim); ctx.fillStyle = INK; ell(hx0 + face * 12 * U, hipY + 11 * U, 4.4 * U, 2.5 * U); ctx.fill(); } }
  } else for (const s of [-1, 1]) {
    const cyc = ph + (s > 0 ? 0 : Math.PI), th = Math.sin(cyc) * 0.95 * run + (dive ? -0.9 : 0), bend = run * (0.18 + 1.25 * Math.max(0, Math.cos(cyc + 0.5))) + (dive ? 0.3 : 0);
    const hx0 = s * lerp(3.6, 1.4, run) * U, kx = hx0 + Math.sin(th) * face * 7.6 * U, ky = hipY + Math.cos(th) * 7.6 * U;
    const fx0 = kx + Math.sin(th - bend) * face * 7.6 * U, fy = ky + Math.cos(th - bend) * 7.6 * U;
    seg(hx0, hipY, kx, ky, fx0, fy, 5.4 * U, s < 0 ? far : trim);
    ctx.save(); ctx.translate(fx0, fy); ctx.rotate(-(th - bend) * face * 0.7); ctx.fillStyle = INK; ell(face * 2.2 * U, 0.6 * U, 4.8 * U, 2.6 * U); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ell(face * 3.6 * U, -0.3 * U, 1.6 * U, 0.8 * U); ctx.fill(); ctx.restore();
  }
  // ---- upper body leans into the run ----
  const lean = dive ? face * 1.15 : face * 0.2 * run;
  ctx.translate(0, hipY); ctx.rotate(lean); ctx.translate(0, -hipY);
  const glove = (hx, hy) => { ctx.fillStyle = '#FBF6EA'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ell(hx, hy, 3.9 * U, 3.7 * U); ctx.fill(); ctx.stroke(); };
  const arm = (s, A, col) => {   // s: -1 far/left, 1 near/right. A: fixed pose angle, or undefined for the run cycle
    const sx0 = s * lerp(9.5, 4, run) * U, sy0 = shY + 3.5 * U; let ex, ey, hx, hy;
    if (A !== undefined) { const dx = o.poseFwd ? face : s; ex = sx0 + Math.sin(A) * dx * 7 * U; ey = sy0 + Math.cos(A) * 7 * U; hx = sx0 + Math.sin(A) * dx * 14.5 * U; hy = sy0 + Math.cos(A) * 14.5 * U; }
    else if (run) { const u = -Math.sin(ph + (s > 0 ? 0 : Math.PI)) * 1.05 * run, f = u + 1.35; ex = sx0 + Math.sin(u) * face * 7 * U; ey = sy0 + Math.cos(u) * 7 * U; hx = ex + Math.sin(f) * face * 7 * U; hy = ey + Math.cos(f) * 7 * U; }
    else { const br = Math.sin(G.time * 2 + (o.seed || 0)) * 0.03; ex = sx0 + Math.sin(0.16 + br) * s * 7 * U; ey = sy0 + Math.cos(0.16) * 7 * U; hx = sx0 + Math.sin(0.1 + br) * s * 14.5 * U; hy = sy0 + Math.cos(0.1) * 14.5 * U; }
    seg(sx0, sy0, ex, ey, hx, hy, 4.9 * U, col); glove(hx, hy); return [hx, hy];
  };
  let aL, aR;
  if (o.pose === 'up') aL = aR = 2.65 + Math.sin(G.time * 14) * 0.25;
  if (o.pose === 'stiff') { if ((o.side || 1) > 0) aR = 1.6; else aL = 1.6; }
  if (dive) aL = aR = 2.2;
  if (o.aL !== undefined) aL = o.aL; if (o.aR !== undefined) aR = o.aR;
  o.poseFwd = dive || o.fwd;
  const backArm = face > 0 ? -1 : 1;
  const h1 = arm(backArm, backArm < 0 ? aL : aR, tint(suit, -0.22));
  // ---- jacket ----
  if (run > 0.5 && !dive) { const fl = Math.sin(ph * 2) * 2 * U; ctx.fillStyle = tint(suit, -0.18); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-face * 6 * U, hipY - 4 * U); ctx.lineTo(-face * 15 * U, hipY + 3 * U + fl); ctx.lineTo(-face * 5 * U, hipY + 3 * U); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = suit; ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-7 * U, shY); ctx.quadraticCurveTo(-11.5 * U, shY, -11 * U, shY + 5 * U); ctx.lineTo(-8 * U, hipY + 2 * U); ctx.quadraticCurveTo(0, hipY + 4.5 * U, 8 * U, hipY + 2 * U); ctx.lineTo(11 * U, shY + 5 * U); ctx.quadraticCurveTo(11.5 * U, shY, 7 * U, shY); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FBF6EA'; ctx.beginPath(); ctx.moveTo(-4.4 * U, shY + 0.6 * U); ctx.lineTo(4.4 * U, shY + 0.6 * U); ctx.lineTo(0, shY + 12 * U); ctx.closePath(); ctx.fill();
  const tf = -face * run * 5 * U + Math.sin(ph * 2) * run * 1.5 * U;
  ctx.fillStyle = tie; ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-1.7 * U, shY + 1.6 * U); ctx.lineTo(1.7 * U, shY + 1.6 * U); ctx.lineTo(2.3 * U + tf * 0.7, shY + 10 * U); ctx.lineTo(tf, shY + 13.5 * U); ctx.lineTo(-2.3 * U + tf * 0.7, shY + 10 * U); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = tint(trim, 0.05); ctx.strokeStyle = INK; ctx.lineWidth = 1;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 4.6 * U, shY + 0.3 * U); ctx.lineTo(s * 7.4 * U, shY + 1.2 * U); ctx.lineTo(s * 1.6 * U, shY + 13 * U); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = tie; ctx.fillRect(4.6 * U, shY + 7 * U, 3.6 * U, 1.6 * U);
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ell(0, shY + 15.5 * U, 0.9 * U, 0.9 * U); ctx.fill(); ell(0, shY + 18.5 * U, 0.9 * U, 0.9 * U); ctx.fill();
  if (o.vest) { ctx.fillStyle = '#e6e6e6'; ctx.fillRect(-9.6 * U, shY + 8.5 * U, 19.2 * U, 2.3 * U); ctx.fillRect(-8.8 * U, shY + 13.5 * U, 17.6 * U, 2.3 * U); }
  // ---- bobblehead: pivots on a coil spring at the collar ----
  const bh = !!(BOBBLE && o.sprite && o.sprite.width === 200);
  const R = (o.headR || 16.5) * U * (bh ? 1.2 : 1), a = hd.a + (o.headRot || 0) - face * run * 0.1 - lean * 0.55;
  const nl = R * 0.98 + 3.5 * U, hx = Math.sin(a) * nl + hd.ox * R, hy = shY - Math.cos(a) * nl + hd.oy * R;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ell(0, shY + 0.8 * U, 7 * U, 2.2 * U); ctx.fill();
  for (let i = 0; i < 4; i++) { const t = (i + 0.5) / 4, cx = lerp(0, hx, t * 0.5), cy = lerp(shY, hy + R * 0.92, t); ctx.strokeStyle = INK; ctx.lineWidth = 2.6 * U; ell(cx, cy, 3.6 * U, 1.3 * U); ctx.stroke(); ctx.strokeStyle = PAPER; ctx.lineWidth = 1.3 * U; ctx.stroke(); }
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(a * 1.25);
  const sq = clamp((hd.vy || 0) * 0.014, -0.17, 0.17); ctx.scale(1 - sq, 1 + sq);
  if (bh) { const S = R * 2 * 200 / 160; ctx.drawImage(o.sprite, -S / 2, -S / 2, S, S); }
  else {
    ctx.fillStyle = 'rgba(27,42,65,.45)'; ell(2 * U, 2.6 * U, R + 4.4 * U, R + 4.4 * U); ctx.fill();
    ctx.fillStyle = INK; ell(0, 0, R + 4.4 * U, R + 4.4 * U); ctx.fill();
    ctx.fillStyle = '#FBF6EA'; ell(0, 0, R + 3 * U, R + 3 * U); ctx.fill();
    ctx.fillStyle = suit; ell(0, 0, R + 0.9 * U, R + 0.9 * U); ctx.fill();
    if (o.sprite) ctx.drawImage(o.sprite, -R, -R, R * 2, R * 2);
  }
  if (st === 'down') { ctx.strokeStyle = INK; ctx.lineWidth = 2.8 * U; ctx.lineCap = 'round'; for (const s of [-1, 1]) { const ex = s * R * 0.34, ey = -R * 0.12, q = R * 0.17; ctx.beginPath(); ctx.moveTo(ex - q, ey - q); ctx.lineTo(ex + q, ey + q); ctx.moveTo(ex + q, ey - q); ctx.lineTo(ex - q, ey + q); ctx.stroke(); } }
  else if (st === 'stumble') { ctx.strokeStyle = INK; ctx.lineWidth = 1.9 * U; for (const s of [-1, 1]) { ctx.beginPath(); for (let i = 0; i < 14; i++) { const an = i * 0.7 + G.time * 9 * s, r2 = i * R * 0.017; ctx.lineTo(s * R * 0.34 + Math.cos(an) * r2, -R * 0.12 + Math.sin(an) * r2); } ctx.stroke(); } }
  if (o.shades) { ctx.fillStyle = '#111'; rr(-R * 0.66, -R * 0.3, R * 0.58, R * 0.34, R * 0.1); ctx.fill(); rr(R * 0.08, -R * 0.3, R * 0.58, R * 0.34, R * 0.1); ctx.fill(); ctx.fillRect(-R * 0.1, -R * 0.24, R * 0.2, R * 0.07); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(-R * 0.58, -R * 0.25, R * 0.16, R * 0.07); ctx.fillRect(R * 0.16, -R * 0.25, R * 0.16, R * 0.07); }
  if (o.binos) { ctx.fillStyle = '#222'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; for (const s of [-1, 1]) { ell(s * R * 0.36, -R * 0.1, R * 0.34, R * 0.34); ctx.fill(); ctx.stroke(); } ctx.fillStyle = '#9fd8ff'; for (const s of [-1, 1]) { ell(s * R * 0.36, -R * 0.1, R * 0.22, R * 0.22); ctx.fill(); } ctx.fillStyle = '#fff'; for (const s of [-1, 1]) { ell(s * R * 0.36 - R * 0.08, -R * 0.18, R * 0.06, R * 0.06); ctx.fill(); } }
  ctx.restore();
  if (st === 'down') for (let i = 0; i < 3; i++) { const an = G.time * 5 + i * 2.1; star(hx + Math.cos(an) * R * 1.05, hy - R * 0.95 + Math.sin(an) * R * 0.3, 3.6 * U, '#ffd84a'); }
  if (o.sweat) for (let i = 0; i < 3; i++) { const t = (G.time * 2.6 + i * 0.33 + (o.seed || 0)) % 1; ctx.fillStyle = `rgba(170,225,255,${1 - t})`; ctx.strokeStyle = `rgba(20,60,90,${0.6 * (1 - t)})`; ctx.lineWidth = 1; ell(hx - face * (R * 0.9 + t * 16 * U), hy - R * 0.55 + i * 6 * U - t * 5 * U, 2.1 * U, 3.1 * U); ctx.fill(); ctx.stroke(); }
  const frontArm = -backArm, h2 = arm(frontArm, frontArm < 0 ? aL : aR, suit);
  ctx.restore();
  return { hL: backArm < 0 ? h1 : h2, hR: backArm < 0 ? h2 : h1, shY, R, hx, hy };
}
function star(x, y, r, col) { ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); ctx.fill(); ctx.stroke(); }

function drawMP(m) {
  const p = proj(m.x, m.y), U = p.s; m.sx = p.x; m.sy = p.y; m.U = U;
  const sp = Math.hypot(m.vx, m.vy), tagger = m.role === 'tagger' || m.conv, down = m.state === 'down' && (m.stun > 0 || m.conv);
  const reading = m.state === 'read' && m.stun > 0, fc = m.face || 1;
  const q = person(p.x, p.y, U, { sit: reading ? 'ground' : 0, fwd: reading, aL: reading ? 1.2 : undefined, aR: reading ? 1.35 : undefined, headRot: reading ? 0.26 * fc + Math.sin(G.time * 3 + m.jp) * 0.05 : 0, party: m.party, sprite: headSprite(m.name), hd: m.hd, moving: sp > 1.5 && !down, run: sp / 13, phase: m.phase, state: down ? 'down' : m.stun > 0 ? m.state : 'idle',
    lie: Math.min(1, (G.time - (m.kt || 0)) * 7, m.conv ? 1 : Math.max(0.15, m.stun * 5)), side: m.side, face: m.face || 1,
    pose: m.pose, hop: m.hop, ring: G.phase === 'builder' ? null : tagger ? RED : m.safe ? GOLD : PAPER, sweat: sp > 14 && m.stun <= 0, seed: m.jp });
  if (reading) drawSheet(p.x + (q.hL[0] + q.hR[0]) / 2 + fc * 3 * U, p.y + (q.hL[1] + q.hR[1]) / 2 - 4 * U, 0.14 * fc, U * 0.8, 0.01);
  if (!down) { ctx.font = `700 ${Math.max(9, 12 * U)}px ${LABEL}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; const nm = m.short.toUpperCase(); ctx.strokeText(nm, p.x, p.y + 5 * U); ctx.fillStyle = PAPER; ctx.fillText(nm, p.x, p.y + 5 * U); }
}
function tree(x, y, seed, peek) {
  const p = proj(x, y), U = p.s * 1.25; let h = seed; const r = () => ((h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0) % 1000) / 1000;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ell(p.x, p.y, 46 * U, 9 * U); ctx.fill();
  if (peek) { const out = 0.55 + Math.sin(G.time * 0.8 + seed) * 0.3 + (peek.c.fist > 0 ? 0.35 : 0), px = p.x + peek.side * (8 + out * 20) * U;
    const lean = peek.side * 0.2, shaking = peek.c.fist > 0;
    const q = person(px, p.y - 2 * U, U * 0.8, { suit: '#3b3b3b', trim: '#111', tie: '#d12c38', sprite: headSprite(peek.name), binos: !shaking, headRot: lean, hd: { ox: 0, oy: shaking ? Math.sin(G.time * 30) * 0.05 : 0, a: 0 },
      aL: shaking && peek.side < 0 ? 2.7 + Math.sin(G.time * 26) * 0.35 : 0.2, aR: shaking && peek.side > 0 ? 2.7 + Math.sin(G.time * 26) * 0.35 : 0.2 });
    if (shaking) bubble(px, p.y - 62 * U, pick2(seed, ['Oi!!', 'Hmph!', 'Unbelievable!']), U); }
  ctx.fillStyle = '#5a3d28'; ctx.strokeStyle = '#2b1a0f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x - 9 * U, p.y); ctx.quadraticCurveTo(p.x - 4 * U, p.y - 30 * U, p.x - 14 * U, p.y - 62 * U); ctx.lineTo(p.x + 12 * U, p.y - 62 * U); ctx.quadraticCurveTo(p.x + 3 * U, p.y - 30 * U, p.x + 10 * U, p.y); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 11; i++) { const bx = p.x + (r() - 0.5) * 78 * U, by = p.y - (58 + r() * 44) * U, br = (17 + r() * 13) * U; ctx.fillStyle = i % 3 ? '#27552f' : '#1e4526'; ell(bx, by, br, br * 0.82); ctx.fill(); }
  for (let i = 0; i < 44; i++) { const bx = p.x + (r() - 0.5) * 92 * U, by = p.y - (50 + r() * 58) * U; ctx.fillStyle = r() > 0.4 ? '#d81f2e' : '#f0475a'; ell(bx, by, 2.8 * U, 2.2 * U); ctx.fill(); }
}
const pick2 = (seed, a) => a[seed % a.length];
function flag(x, y, ph) {
  const p = proj(x, y), U = p.s * 1.1, top = p.y - 108 * U;
  ctx.strokeStyle = '#e9e9e9'; ctx.lineWidth = 2.4 * U; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, top); ctx.stroke();
  const fw = 46 * U, fh = 26 * U, seg = 10; ctx.save(); ctx.translate(p.x, top);
  for (let i = 0; i < seg; i++) { const x0 = i * fw / seg, wv = Math.sin(G.time * 4 + ph + i * 0.7) * 2.2 * U * (i / seg);
    ctx.fillStyle = '#012169'; ctx.fillRect(x0, wv, fw / seg + 0.6, fh);
    if (i < 4) { ctx.fillStyle = '#fff'; ctx.fillRect(x0, wv + fh * 0.2, fw / seg + 0.6, fh * 0.1); ctx.fillStyle = '#c8102e'; ctx.fillRect(x0, wv + fh * 0.225, fw / seg + 0.6, fh * 0.05); if (i === 1 || i === 2) { ctx.fillStyle = '#fff'; ctx.fillRect(x0 + (i === 1 ? fw / seg * 0.6 : 0), wv, fw / seg * 0.4, fh * 0.5); ctx.fillStyle = '#c8102e'; ctx.fillRect(x0 + (i === 1 ? fw / seg * 0.8 : 0), wv, fw / seg * 0.2, fh * 0.5); } }
    if (i === 6 || i === 8) { star(x0 + 2 * U, wv + fh * (i === 6 ? 0.45 : 0.3), 2.2 * U, '#c8102e'); star(x0 + 2 * U, wv + fh * (i === 6 ? 0.8 : 0.6), 2.2 * U, '#c8102e'); } }
  ctx.restore();
}
function tapTag(x, y, U, cd, max, label) {
  const ready = cd <= 0; ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = ready ? GOLD : 'rgba(20,20,20,.7)'; ctx.strokeStyle = INK; ctx.lineWidth = 2; const w = 54 * U, h = 16 * U; rr(-w / 2, -h / 2, w, h, 8 * U); ctx.fill(); ctx.stroke();
  if (!ready) { ctx.fillStyle = GOLD; rr(-w / 2, -h / 2, w * (1 - cd / max), h, 8 * U); ctx.fill(); }
  ctx.fillStyle = INK; ctx.font = `900 ${Math.max(8, 9.5 * U)}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ready ? label : '…', 0, 0.5); ctx.restore();
}
const drawCam = {
  gerry() { const c = cam.gerry, p = proj(c.x, c.y), U = p.s * 1.12, seat = 44 * U;
    ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 3.4 * U; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(p.x + s * 20 * U, p.y); ctx.lineTo(p.x + s * 12 * U, p.y - seat); ctx.stroke(); }
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(p.x - (20 - i * 2) * U, p.y - seat * i / 4); ctx.lineTo(p.x + (20 - i * 2) * U, p.y - seat * i / 4); ctx.stroke(); }
    ctx.fillStyle = '#f2f2f2'; ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(p.x - 17 * U, p.y - seat - 3 * U, 34 * U, 6 * U, 2 * U); ctx.fill(); ctx.stroke(); rr(p.x - 17 * U, p.y - seat - 34 * U, 5 * U, 32 * U, 2 * U); ctx.fill(); ctx.stroke(); rr(p.x + 12 * U, p.y - seat - 34 * U, 5 * U, 32 * U, 2 * U); ctx.fill(); ctx.stroke();
    const up = c.order > 0, q = person(p.x, p.y - seat + 8 * U, U, { suit: '#1d2a44', trim: '#0d1526', tie: '#b3261e', sprite: headSprite(depName('Brownlee')), sit: true, face: 1, headR: 16,
      hd: { ox: 0, oy: c.blow > 0 ? Math.sin(G.time * 40) * 0.04 : 0, a: 0 }, aR: up ? 2.5 + Math.sin(G.time * 16) * 0.4 : 0.5, aL: c.blow > 0 ? 2.2 : 0.4 });
    const hx = p.x + q.hR[0], hy = p.y - seat + 8 * U + q.hR[1];
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(up ? Math.sin(G.time * 16) * 0.3 + 0.3 : 0.5); ctx.fillStyle = '#8b5a2b'; ctx.fillRect(-2 * U, -16 * U, 4 * U, 18 * U); ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ell(0, -30 * U, 20 * U, 15 * U); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#b3261e'; ctx.font = `900 ${10 * U}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ORDER!', 0, -30 * U); ctx.restore();
    if (c.blow > 0) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const r = (10 + i * 9 + (G.time * 60) % 9) * U; ctx.beginPath(); ctx.arc(p.x + 12 * U, p.y - seat - 44 * U, r, -0.6, 0.6); ctx.stroke(); } }
    tapTag(p.x, p.y + 10 * U, U, c.cd, 12, 'TAP: WHISTLE'); c.hit = [p.x, p.y - seat - 20 * U, 46 * U];
  },
  nicola() { const c = cam.nicola, p = proj(c.x, c.y), U = p.s * 1.1;
    ctx.fillStyle = '#7a5230'; ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(p.x - 30 * U, p.y - 13 * U, 60 * U, 5 * U, 2 * U); ctx.fill(); ctx.stroke(); ctx.fillRect(p.x - 26 * U, p.y - 8 * U, 4 * U, 8 * U); ctx.fillRect(p.x + 22 * U, p.y - 8 * U, 4 * U, 8 * U);
    // cardboard box of office plants
    const bx = p.x + 30 * U, by = p.y + 2 * U; ctx.fillStyle = '#2f8f3e'; for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.33 + Math.sin(G.time * 2 + i) * 0.04; ctx.beginPath(); ctx.ellipse(bx + Math.cos(a) * 14 * U, by - 22 * U + Math.sin(a) * 14 * U, 9 * U, 3.2 * U, a, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#c69a5d'; ctx.strokeStyle = INK; rr(bx - 13 * U, by - 20 * U, 26 * U, 20 * U, 2 * U); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#7a5630'; ctx.font = `800 ${6 * U}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DESK', bx, by - 10 * U);
    person(p.x + 4 * U, p.y - 2 * U, U, { suit: '#0b4a8f', trim: '#06305e', tie: '#fff', sprite: headSprite(depName('Willis')), sit: true, face: -1, aL: c.toss > 0 ? 2.4 - c.toss * 2 : 0.6, aR: 0.4, hd: { ox: 0, oy: 0, a: Math.sin(G.time * 1.3) * 0.05 } });
    // giant calculator
    const cx = p.x - 24 * U, cy = p.y - 4 * U; ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.12); ctx.fillStyle = '#3a3f47'; ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(-11 * U, -36 * U, 22 * U, 34 * U, 3 * U); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#bfe6b0'; ctx.fillRect(-8 * U, -33 * U, 16 * U, 7 * U); ctx.fillStyle = INK; ctx.font = `800 ${5 * U}px monospace`; ctx.textAlign = 'right'; ctx.fillText('-9.8b', 7 * U, -29 * U);
    for (let i = 0; i < 12; i++) { ctx.fillStyle = i === 11 ? '#e2562e' : '#d9d9d9'; ctx.fillRect((-8 + (i % 3) * 5.7) * U, (-23 + Math.floor(i / 3) * 5) * U, 4.4 * U, 3.6 * U); } ctx.restore();
    tapTag(p.x, p.y + 12 * U, U, c.cd, 8, 'TAP: BUDGET'); c.hit = [p.x, p.y - 26 * U, 44 * U];
  },
  bishop() { const c = cam.bishop, p = proj(c.x, c.y), U = p.s * 1.1;
    for (let i = 0; i < 2; i++) { const bx = p.x - 34 * U + i * 46 * U, by = p.y + 4 * U; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#fff' : '#ff6a13'; ctx.fillRect(bx + k * 6 * U, by - 14 * U, 6 * U, 6 * U); } ctx.strokeRect(bx, by - 14 * U, 36 * U, 6 * U); ctx.fillStyle = '#444'; ctx.fillRect(bx + 3 * U, by - 8 * U, 2.5 * U, 8 * U); ctx.fillRect(bx + 30 * U, by - 8 * U, 2.5 * U, 8 * U); }
    const q = person(p.x, p.y - 2 * U, U, { suit: '#ff8a1f', trim: '#2a2a2a', tie: '#00529f', vest: true, sprite: headSprite(depName('Bishop')), face: -1, aL: 1.9 + Math.sin(G.time * 5) * 0.15, aR: 1.2 + Math.sin(G.time * 3.3) * 0.7, hd: { ox: 0, oy: c.sayT > 0 ? Math.sin(G.time * 28) * 0.05 : 0, a: 0 } });
    const mx = p.x + q.hL[0], my = p.y - 2 * U + q.hL[1]; ctx.fillStyle = '#e8e8e8'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx + 3 * U, my - 3 * U); ctx.lineTo(mx - 20 * U, my - 13 * U); ctx.lineTo(mx - 20 * U, my + 9 * U); ctx.lineTo(mx + 3 * U, my + 3 * U); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (c.sayT > 0) bubble(p.x - 30 * U, p.y - 74 * U, c.say, U);
  },
  gold() { const c = cam.gold, p = proj(c.x, c.y), U = p.s * 1.05, sh = c.shake > 0;
    const q = person(p.x, p.y, U, { suit: '#33415c', trim: '#1a2233', tie: '#00529f', sprite: headSprite(depName('Goldsmith')), moving: true, phase: G.time * 5, face: c.dir, aL: 1.0, aR: 1.0, headRot: sh ? Math.sin(G.time * 13) * 0.42 : 0, hd: { ox: 0, oy: 0, a: 0 } });
    const cols = ['#7a1f1f', '#1f4d7a', '#3d6b2f', '#8a6a1f']; for (let i = 0; i < 4; i++) { ctx.fillStyle = cols[i]; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(p.x - 11 * U + (i % 2) * 2 * U, p.y - 26 * U - i * 5 * U, 22 * U, 5 * U, 1); ctx.fill(); ctx.stroke(); }
    if (sh) bubble(p.x, p.y - 72 * U, 'Tsk. Not in the history books.', U);
  },
  penk() { const c = cam.penk, p = proj(c.x, c.y), U = p.s * 1.1;
    ctx.strokeStyle = '#d9d9d9'; ctx.lineWidth = 3 * U; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x - 24 * U, p.y); ctx.lineTo(p.x + 6 * U, p.y - 16 * U); ctx.moveTo(p.x + 22 * U, p.y); ctx.lineTo(p.x - 6 * U, p.y - 16 * U); ctx.stroke();
    ctx.save(); ctx.translate(p.x, p.y - 12 * U); ctx.rotate(-0.5);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#2aa7c9'; ctx.fillRect(-26 * U + i * 9 * U, -4 * U, 9 * U, 7 * U); } ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(-26 * U, -4 * U, 54 * U, 7 * U);
    const q = person(4 * U, 2 * U, U, { suit: '#5b6b7a', trim: '#2c3640', tie: GOLD, sprite: headSprite(depName('Penk')), sit: true, face: 1, shades: true, aL: 0.5, aR: c.sip > 0 ? 2.5 : 1.3, hd: { ox: 0, oy: 0, a: 0.25 } });
    const hx = 4 * U + q.hR[0], hy = 2 * U + q.hR[1]; ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(hx - 3.5 * U, hy - 9 * U, 7 * U, 9 * U, 1.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#6b3f1d'; ctx.fillRect(hx - 3.5 * U, hy - 6 * U, 7 * U, 3 * U);
    ctx.restore();
    if ((G.time % 9) < 2.5 && G.phase === 'run') bubble(p.x + 6 * U, p.y - 78 * U, pick2(Math.floor(G.time / 9), ['Lovely day.', 'Not my problem.', 'Flat white, thanks.', 'Zzz…']), U);
  },
};

function quad(x0, y0, x1, y1) { const a = proj(x0, y0), b = proj(x1, y0), c = proj(x1, y1), d = proj(x0, y1); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); }
function drawBackground() {
  const farY = VH * V.farY, g = ctx.createLinearGradient(0, 0, 0, farY); g.addColorStop(0, '#8EC5E8'); g.addColorStop(1, '#d6e9ee'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, farY + 2);
  if (bgImg) { const bh = farY + VH * 0.07, sc = Math.max(VW / bgImg.naturalWidth, bh / bgImg.naturalHeight), dw = bgImg.naturalWidth * sc, dh = bgImg.naturalHeight * sc; ctx.drawImage(bgImg, (VW - dw) / 2, (bh - dh) * 0.62, dw, dh);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, bh); ctx.clip();
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'rgba(128,128,128,.38)'; ctx.fillRect(0, 0, VW, bh);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(243,222,178,.6)'; ctx.fillRect(0, 0, VW, bh);
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(27,42,65,.22)'; ctx.fillRect(0, 0, VW, bh); ctx.restore(); }
  const top = farY - VH * 0.065, lg = ctx.createLinearGradient(0, top, 0, VH); lg.addColorStop(0, 'rgba(63,143,78,0)'); lg.addColorStop(0.1, 'rgba(63,143,78,1)'); lg.addColorStop(1, '#3F8F4E'); ctx.fillStyle = lg; ctx.fillRect(0, top, VW, VH - top);
  for (let i = 0; i < 12; i++) { quad(0, i * L / 12, W, (i + 1) * L / 12); if (i % 2) { ctx.fillStyle = '#4B9C59'; ctx.fill(); } }
  const zone = (y0, y1, label) => { quad(0, y0, W, y1); ctx.fillStyle = 'rgba(243,233,210,.3)'; ctx.fill();
    const m = proj(W / 2, (y0 + y1) / 2); ctx.save(); ctx.translate(m.x, m.y); if (HZ) ctx.rotate(-Math.PI / 2); ctx.fillStyle = PAPER; ctx.font = `700 ${22 * m.s}px ${LABEL}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 0); ctx.restore(); };
  zone(0, ZN, 'NORTH END · SAFE'); zone(ZS, L, 'SOUTH END · SAFE');
  ctx.strokeStyle = PAPER; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; quad(0, 0, W, L); ctx.stroke();
  for (const y of [ZN, ZS, L / 2]) { const a = proj(0, y), b = proj(W, y); ctx.setLineDash(y === L / 2 ? [10, 10] : []); ctx.globalAlpha = y === L / 2 ? 0.5 : 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  for (const f of G.puffs) { const p = proj(f.x, f.y), t = f.t / 0.55; ctx.fillStyle = `rgba(235,245,225,${0.5 * (1 - t)})`; ell(p.x, p.y - t * 7 * p.s, (3 + t * 8) * p.s, (2 + t * 5) * p.s); ctx.fill(); }
}
let grain = null;
function drawSheet(x, y, rot, s, lift = 0) {
  ctx.save(); ctx.translate(x, y - lift); ctx.scale(1, lift ? 1 : 0.55); ctx.rotate(rot);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.fillRect(-9 * s, -12 * s, 18 * s, 24 * s); ctx.strokeRect(-9 * s, -12 * s, 18 * s, 24 * s);
  ctx.strokeStyle = '#2f8f3e'; ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-9 * s, -12 * s + i * 4 * s); ctx.lineTo(9 * s, -12 * s + i * 4 * s); ctx.stroke(); } for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-9 * s + i * 6 * s, -12 * s); ctx.lineTo(-9 * s + i * 6 * s, 12 * s); ctx.stroke(); }
  ctx.fillStyle = '#d82a20'; ctx.fillRect(3.5 * s, 4.5 * s, 5 * s, 3 * s); ctx.restore();
}
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.shake > 0) ctx.translate(rand(-1, 1) * G.shake * 12, rand(-1, 1) * G.shake * 8);
  drawBackground();
  for (const s of G.sheets) { const p = proj(s.x, s.y); ctx.globalAlpha = Math.min(1, s.life); drawSheet(p.x, p.y, s.rot, p.s); ctx.globalAlpha = 1; }
  { const ax = VW * (V.farH + V.nearH) / (HZ ? L : W), dz = VH * (V.nearY - V.farY) / (HZ ? W : L);
    for (const w of G.waves) { const p = proj(w.x, w.y); ctx.strokeStyle = `rgba(255,240,150,${clamp(1 - w.r / 240, 0, 1)})`; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(p.x, p.y, w.r * ax, w.r * dz, 0, 0, TAU); ctx.stroke(); } }
  const items = [];
  cam.flags.forEach((f, i) => items.push({ z: depth({ x: f[0], y: f[1] }) - 0.1 * i, f: () => flag(f[0], f[1], i * 2) }));
  cam.trees.forEach(t => items.push({ z: depth({ x: t[0], y: t[1] }), f: () => tree(t[0], t[1], t[2]) }));
  items.push({ z: depth(cam.ferris), f: () => tree(cam.ferris.x, cam.ferris.y, 11, { side: 1, c: cam.ferris, name: depName('Ferris') }) });
  items.push({ z: depth(cam.kapa), f: () => tree(cam.kapa.x, cam.kapa.y, 23, { side: -1, c: cam.kapa, name: depName('Kapa-Kingi') }) });
  for (const k of ['gerry', 'nicola', 'bishop', 'gold', 'penk']) items.push({ z: depth(cam[k]), f: drawCam[k] });
  for (const m of G.mps) items.push({ z: depth(m), f: () => drawMP(m) });
  items.sort((a, b) => a.z - b.z); for (const it of items) it.f();
  for (const s of G.flying) if (s.t > 0) { const x = lerp(s.x0, s.x1, s.t), y = lerp(s.y0, s.y1, s.t), p = proj(x, y); drawSheet(p.x, p.y, s.rot + s.t * 9, p.s, (Math.sin(s.t * Math.PI) * 90 + 30 * (1 - s.t)) * p.s); }
  for (const f of G.fx) { const p = proj(f.x, f.y), al = clamp((1.3 - f.t) * 2.5, 0, 1), pop = 1 + Math.max(0, 0.22 - f.t) * 2.6, fs = 15 * p.s * f.size * pop;
    ctx.save(); ctx.globalAlpha = al; ctx.translate(p.x, p.y - (64 + f.t * 30) * p.s); ctx.rotate(((f.x * 7 + f.y * 3) % 9 - 4) * 0.022);
    ctx.font = `400 ${fs}px ${SHOUT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(f.text).width + fs * 0.8, hh = fs * 1.5;
    ctx.fillStyle = 'rgba(27,42,65,.5)'; rr(-w / 2 + 3, -hh / 2 + 3, w, hh, 3); ctx.fill();
    ctx.fillStyle = f.color; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; rr(-w / 2, -hh / 2, w, hh, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.fillText(f.text, 0, fs * 0.06); ctx.restore(); }
  if (!grain) { const c = document.createElement('canvas'); c.width = c.height = 160; const d = c.getContext('2d'); d.fillStyle = '#fff'; d.fillRect(0, 0, 160, 160);
    for (let i = 0; i < 2600; i++) { d.fillStyle = `rgba(60,45,20,${Math.random() * 0.16})`; d.fillRect(Math.random() * 160, Math.random() * 160, 1.3, 1.3); } grain = ctx.createPattern(c, 'repeat'); }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = grain; ctx.fillRect(0, 0, VW, VH); ctx.globalCompositeOperation = 'source-over';
}

/* ---------- input ---------- */
cv.addEventListener('pointerdown', e => {
  const x = e.clientX, y = e.clientY; Snd.init();
  if (G.phase === 'builder') return;
  const g = cam.gerry, n = cam.nicola, inHit = h => h && Math.hypot(x - h[0], y - h[1]) < h[2];
  if (inHit(g.hit)) { if (g.cd <= 0 && G.phase !== 'over') { g.cd = 12; shockwave(); } return; }
  if (inHit(n.hit)) { if (n.cd <= 0 && G.phase !== 'over') { n.cd = 8; tossSheet(4); Snd.toss(); } return; }
  if (G.phase !== 'run') return;
  const list = G.mps.slice().sort((a, b) => depth(b) - depth(a));
  for (const m of list) { const U = m.U, onHead = Math.hypot(x - m.sx, y - (m.sy - 50 * U)) < 21 * U, onBody = Math.abs(x - m.sx) < 12 * U && y < m.sy + 4 * U && y > m.sy - 36 * U;
    if (!onHead && !onBody) continue; if (m.safe || m.conv || m.state === 'down') continue;
    if (m.role === 'runner') { knock(m, 1.15, 'stumble'); bump(m, rand(-6, 6), 16, rand(-16, 16)); m.vx *= 0.2; m.vy *= 0.2; fx(m.x, m.y - 10, 'BONK!', GOLD, 1.25); Snd.bonk(); }
    else { knock(m, 1.4); bump(m, rand(-8, 8), -10, rand(-14, 14)); fx(m.x, m.y - 10, 'TRIPPED!', '#8EC5E8', 1.15); Snd.trip(); }
    return; }
});

/* ---------- coalition builder ---------- */
const paintAvatar = (c, name) => { const g = c.getContext('2d'), sp = headSprite(name); g.clearRect(0, 0, 52, 52); if (sp.width === 200) g.drawImage(sp, -6, -5, 64, 64); else g.drawImage(sp, 0, 0, 52, 52); };
const avatar = name => { const c = document.createElement('canvas'); c.width = c.height = 52; c.dataset.n = name; c.title = name; paintAvatar(c, name); return c; };
listeners.push(name => document.querySelectorAll('.faces canvas').forEach(c => { if (c.dataset.n === name) paintAvatar(c, name); }));
function renderBuilder() {
  for (const k of [0, 1, 2]) { const col = $('c' + k); col.querySelectorAll('.card').forEach(n => n.remove());
    for (const p of D.parties) { if ((G.assign[p.id] || 0) !== k) continue;
      const card = document.createElement('div'); card.className = 'card'; card.style.borderColor = INK;
      const mk = (txt, to, dis, aria) => { const b = document.createElement('button'); b.className = 'mv'; b.textContent = txt; b.disabled = dis; b.setAttribute('aria-label', aria); b.onclick = () => { Snd.ui(); G.assign[p.id] = to; renderBuilder(); }; return b; };
      const left = k === 2 ? 0 : 1, right = k === 1 ? 0 : 2;
      card.append(mk('◀', left, k === 1, `Move ${p.name} left`));
      const body = document.createElement('div'); body.className = 'body'; body.innerHTML = `<div class="nm"><span class="dot" style="background:${p.color}"></span>${p.name} <span class="cnt">${p.members.length} MPs</span></div>`;
      const faces = document.createElement('div'); faces.className = 'faces'; for (const m of p.members) faces.append(avatar(m.name)); body.append(faces);
      card.append(body, mk('▶', right, k === 2, `Move ${p.name} right`)); col.append(card); } }
  const n = t => D.parties.filter(p => G.assign[p.id] === t).reduce((s, p) => s + p.members.length, 0);
  const ok = n(1) > 0 && n(2) > 0; $('go').disabled = !ok;
  $('note').innerHTML = (ok ? `<b>${n(1)} Runners v ${n(2)} Taggers.</b> ` : '<b>Put at least one party on each team.</b> ') +
    `Rosters use preliminary 7 November 2026 results (official count due 27 November)` + (D.dropped.length ? `; ${D.dropped.map(d => d.name).join(', ')} left out as not elected` : '') + '. Satire: nobody was really tackled.';
}
const PRESETS = {
  blocs: { labour: 1, green: 1, top: 1, tpm: 0, national: 2, act: 2, nzfirst: 2 },
  govt: { national: 1, act: 1, nzfirst: 1, labour: 2, green: 2, tpm: 2, top: 2 },
  clear: {},
};
document.querySelectorAll('.preset[data-p]').forEach(b => b.onclick = () => {
  const k = b.dataset.p; let a = {};
  if (PRESETS[k]) a = { ...PRESETS[k] };
  else if (k === 'rumble') { const solo = pick(D.parties).id; for (const p of D.parties) a[p.id] = p.id === solo ? 1 : 2; }
  else { for (const p of D.parties) a[p.id] = rand() < 0.5 ? 1 : 2; const ids = D.parties.map(p => p.id); a[pick(ids)] = 1; let o = pick(ids); while (a[o] === 1 && ids.filter(i => a[i] === 2).length === 0) { a[o] = 2; o = pick(ids); } if (!ids.some(i => a[i] === 2)) a[ids.find(i => a[i] === 1 && ids.filter(j => a[j] === 1).length > 1) || ids[0]] = 2; }
  G.assign = a; renderBuilder(); Snd.ui();
});
$('go').onclick = () => startMatch();
$('again').onclick = () => startMatch();
const toBuilder = () => { setLayout(); G.phase = 'builder'; G.mps = []; G.sheets = []; G.flying = []; Snd.stopMusic(); $('over').classList.add('hidden'); $('hud').classList.add('hidden'); $('menu').classList.add('hidden'); $('hint').classList.add('hidden'); $('builder').classList.remove('hidden'); renderBuilder(); };
$('back').onclick = toBuilder; $('menu').onclick = toBuilder;
const bobbleLabel = () => { $('bobble').textContent = BOBBLE ? 'Bobbleheads' : 'Face discs'; };
$('bobble').onclick = () => { BOBBLE = !BOBBLE; try { localStorage.setItem('bullrush.bobble', BOBBLE ? '1' : '0'); } catch (e) {} bobbleLabel(); document.querySelectorAll('.faces canvas').forEach(c => paintAvatar(c, c.dataset.n)); };
bobbleLabel();
$('mute').onclick = () => { Snd.setMuted(!Snd.muted); $('mute').textContent = Snd.muted ? 'Sound off' : 'Sound on'; };
$('cred').onclick = () => {
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const link = c => c.src && /^https:\/\//.test(c.src) ? ` · <a href="${esc(c.src)}" target="_blank" rel="noopener">source</a>` : '';
  const row = (n, c) => `<li><b>${esc(n)}</b>: ${c ? `${esc(c.by)} · ${esc(c.lic)}${link(c)}` : 'drawn stand-in (no verified free photo found)'}</li>`;
  const bg = D.env.backgrounds[0];
  $('credIn').innerHTML = `<p><b>Backdrop:</b> ${esc(bg.title)}, ${esc(bg.by)} · ${esc(bg.lic)}${link(bg)}</p>` +
    D.parties.map(p => `<h3 style="margin:.6em 0 .2em">${esc(p.name)}</h3><ul style="margin:0;padding-left:18px">${p.members.map(m => row(m.name, hasPhoto[m.name] ? m.credit : null)).join('')}</ul>`).join('') +
    `<h3 style="margin:.6em 0 .2em">Sideline</h3><ul style="margin:0;padding-left:18px">${D.departed.map(m => row(m.name, hasPhoto[m.name] ? m.credit : null)).join('')}</ul>` +
    `<p>Photos are cropped and cut out by the game for the bobbleheads (or shown as face discs). Music and sound effects are synthesised in the browser. This is a parody; it is not affiliated with any party or with Parliament.</p>`;
  $('credits').classList.remove('hidden');
};
$('credX').onclick = () => $('credits').classList.add('hidden');

/* ---------- loop ---------- */
setLayout(); window.addEventListener('resize', () => { if (G.phase === 'builder') setLayout(); });
G.assign = { ...PRESETS.blocs }; renderBuilder();
let last = performance.now();
function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  while (dt > 0) { const h = Math.min(dt, 1 / 60); update(h); dt -= h; }
  draw(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__bullrush = { G, cam, sprites, bobbles, hasPhoto, Snd, update, person, ctx };   // handy for debugging in the console
})();
