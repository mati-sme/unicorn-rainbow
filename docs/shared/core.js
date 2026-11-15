// Shared engine for the kid games: bundled bilingual voice (Hebrew then Spanish), synth SFX + music box,
// parent gate, drag helper, particles, rewards, sticker book, progress in localStorage. No text needed by the child.
import { icon, svg, starPath, heartPath } from './art.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
export const wait = ms => new Promise(r => setTimeout(r, ms));
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------------- storage ---------------- */
export function store(key, defaults) {
  let d; try { d = JSON.parse(localStorage.getItem(key)) || {}; } catch { d = {}; }
  const data = Object.assign(structuredClone(defaults), d);
  return { data, save() { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} }, reset() { localStorage.removeItem(key); location.reload(); } };
}
export const settings = store('kidgames_settings', { music: true, sfx: true, voice: 'both', vol: 1 });

/* ---------------- audio ---------------- */
let ctx, master, musicBus, sfxBus, voiceBus, unlocked = false;
const bufs = new Map();
export const audioState = { failed: [], loaded: 0 };
function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; ctx = new AC();
  master = ctx.createGain(); master.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = .16; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = .5; sfxBus.connect(master);
  voiceBus = ctx.createGain(); voiceBus.gain.value = 1.15; voiceBus.connect(master);
  return ctx;
}
export function unlockAudio() {
  ensureCtx(); if (ctx.state !== 'running') ctx.resume();
  if (!unlocked) { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); unlocked = true; }
}
function decode(ab) { return new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }); }
export function loadClip(lang, id) {
  const k = lang + '/' + id; if (bufs.has(k)) return bufs.get(k);
  ensureCtx();
  const p = fetch(`audio/${k}.mp3`).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(decode)
    .then(b => { audioState.loaded++; return b; }).catch(e => { audioState.failed.push(k); bufs.delete(k); return null; });
  bufs.set(k, p); return p;
}
export const preload = ids => Promise.all(ids.flatMap(i => [loadClip('he', i), loadClip('es', i)]));
let sayToken = 0, curSrc = null;
function playBuf(b) {
  return new Promise(res => {
    if (!b) return res();
    const s = ctx.createBufferSource(); s.buffer = b; s.connect(voiceBus); s.onended = () => res(); curSrc = s; s.start();
  });
}
function duck(on) { if (!ctx) return; musicBus.gain.setTargetAtTime(settings.data.music ? (on ? .05 : .16) : 0, ctx.currentTime, .08); }
// say a word: Hebrew, short pause, Spanish. onPart(lang) lets callers animate the object in sync.
export async function say(id, { onPart, gap = 280 } = {}) {
  ensureCtx(); const t = ++sayToken; try { curSrc && curSrc.stop(); } catch {}
  const mode = settings.data.voice; duck(true);
  const [bh, be] = await Promise.all([mode !== 'es' ? loadClip('he', id) : null, mode !== 'he' ? loadClip('es', id) : null]);
  if (t !== sayToken) return false;
  if (bh) { onPart && onPart('he'); await playBuf(bh); if (t !== sayToken) return false; }
  if (bh && be) await wait(gap);
  if (t !== sayToken) return false;
  if (be) { onPart && onPart('es'); await playBuf(be); }
  if (t === sayToken) { duck(false); onPart && onPart(null); }
  return t === sayToken;
}
export function hush() { sayToken++; try { curSrc && curSrc.stop(); } catch {} duck(false); }
export const PRAISE = ['great', 'wow', 'yay', 'amazing', 'sopretty'];
export const praise = () => say(pick(PRAISE));

// synthesized sound effects
function tone(f, t0, dur, { type = 'sine', vol = .5, slide = 0, bus = sfxBus } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t0 + dur);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .012); g.gain.exponentialRampToValueAtTime(.001, t0 + dur);
  o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + dur + .05);
}
function noise(t0, dur, vol = .3, freq = 1800) {
  const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t0);
}
const SFX = {
  pop: t => tone(520, t, .14, { type: 'triangle', slide: 2.2, vol: .5 }),
  tap: t => tone(880, t, .08, { type: 'sine', vol: .3 }),
  chime: t => [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * .07, .5, { type: 'sine', vol: .28 })),
  sparkle: t => [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, t + i * .045, .25, { type: 'sine', vol: .14 })),
  boing: t => tone(220, t, .32, { type: 'sine', slide: 2.6, vol: .45 }),
  jump: t => tone(330, t, .22, { type: 'square', slide: 2.4, vol: .1 }),
  munch: t => { noise(t, .09, .35, 900); noise(t + .14, .09, .35, 800); noise(t + .28, .09, .3, 700); },
  whoosh: t => noise(t, .4, .22, 2400),
  snap: t => { tone(660, t, .1, { type: 'triangle', vol: .4 }); tone(990, t + .06, .16, { type: 'triangle', vol: .3 }); },
  soft: t => tone(300, t, .2, { type: 'sine', slide: .8, vol: .25 }),
  flip: t => noise(t, .07, .25, 3000),
  tada: t => [523, 659, 784, 1047].forEach((f, i) => { tone(f, t + i * .1, .7, { type: 'triangle', vol: .25 }); tone(f * 2, t + i * .1, .5, { type: 'sine', vol: .08 }); }),
  splash: t => { noise(t, .35, .3, 1200); tone(900, t, .2, { slide: .4, vol: .15 }); },
  brush: t => noise(t, .18, .14, 4000),
};
export function sfx(name) { if (!settings.data.sfx || !ctx || ctx.state !== 'running') return; SFX[name] && SFX[name](ctx.currentTime + .005); }

// gentle generated music-box loop (pentatonic, changes every few bars)
let musicTimer = null, musicStep = 0, nextNote = 0;
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
const PROG = [[0, 2, 4], [1, 3, 5], [2, 4, 6], [0, 3, 5]];
export function startMusic() {
  ensureCtx(); if (musicTimer || !settings.data.music) return; duck(false); nextNote = ctx.currentTime + .1;
  musicTimer = setInterval(() => {
    while (nextNote < ctx.currentTime + .4) {
      const bar = Math.floor(musicStep / 8) % PROG.length, ch = PROG[bar], beat = musicStep % 8;
      const f = SCALE[ch[[0, 1, 2, 1, 2, 0, 1, 2][beat]] + (beat === 4 ? 1 : 0)] || SCALE[ch[0]];
      tone(f, nextNote, .9, { type: 'sine', vol: .5, bus: musicBus }); tone(f * 2, nextNote, .35, { type: 'sine', vol: .08, bus: musicBus });
      if (beat === 0) tone(SCALE[ch[0]] / 2, nextNote, 1.6, { type: 'triangle', vol: .3, bus: musicBus });
      musicStep++; nextNote += .34;
    }
  }, 120);
}
export function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
export function applySettings() { if (!ctx) return; if (settings.data.music) startMusic(); else stopMusic(); duck(false); }

/* ---------------- screen / input ---------------- */
export async function goFullscreen() {
  const d = document.documentElement;
  try { if (!document.fullscreenElement && !document.webkitFullscreenElement) await (d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : d.webkitRequestFullscreen && d.webkitRequestFullscreen()); } catch {}
  try { await screen.orientation.lock('landscape'); } catch {}
}
// pointer drag with return-home animation. onDrop(clientX, clientY, el) -> true to accept (caller positions it)
export function draggable(el, { onStart, onMove, onDrop, ghostScale = 1.12 } = {}) {
  let sx, sy, id = null, moved = false;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => {
    if (id !== null) return; id = e.pointerId; el.setPointerCapture(id); sx = e.clientX; sy = e.clientY; moved = false;
    el.classList.add('dragging'); el.style.transition = 'none'; el.style.zIndex = 50; onStart && onStart(el, e);
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
    el.style.transform = `translate(${dx}px,${dy}px) scale(${ghostScale})`; onMove && onMove(e.clientX, e.clientY, el);
  });
  const end = async e => {
    if (e.pointerId !== id) return; id = null; el.classList.remove('dragging');
    const ok = onDrop ? await onDrop(e.clientX, e.clientY, el, moved) : false;
    if (!ok) { el.style.transition = 'transform .45s cubic-bezier(.3,1.5,.5,1)'; el.style.transform = ''; setTimeout(() => el.style.zIndex = '', 450); }
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
export const centerOf = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };
export const inside = (x, y, el, pad = 0) => { const r = el.getBoundingClientRect(); return x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad; };
export function bounce(el, cls = 'boing') { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 900); }
// speak + glow the object while each language plays
export function sayWith(el, id) {
  bounce(el, 'speak');
  return say(id, { onPart: p => { if (!el) return; el.classList.toggle('lang-he', p === 'he'); el.classList.toggle('lang-es', p === 'es'); if (p) bounce(el, 'speak'); } });
}

/* ---------------- particles ---------------- */
let fx, fctx, parts = [];
function fxInit() {
  fx = h('<canvas class="fx"></canvas>'); document.body.appendChild(fx); fctx = fx.getContext('2d');
  const rs = () => { const d = Math.min(2, devicePixelRatio || 1); fx.width = innerWidth * d; fx.height = innerHeight * d; fctx.setTransform(d, 0, 0, d, 0, 0); };
  rs(); addEventListener('resize', rs);
  const loop = () => {
    fctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => (p.life -= 1 / 60) > 0);
    for (const p of parts) {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; const a = Math.min(1, p.life * 2);
      fctx.save(); fctx.globalAlpha = a; fctx.translate(p.x, p.y); fctx.rotate(p.rot); fctx.fillStyle = p.c;
      if (p.k === 'star') { fctx.beginPath(); for (let i = 0; i < 10; i++) { const an = Math.PI / 5 * i - Math.PI / 2, r = i % 2 ? p.s * .45 : p.s; fctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } fctx.fill(); }
      else if (p.k === 'heart') { const s = p.s / 10; fctx.scale(s, s); fctx.beginPath(); fctx.moveTo(0, 6); fctx.bezierCurveTo(-12, -2, -7, -12, 0, -5); fctx.bezierCurveTo(7, -12, 12, -2, 0, 6); fctx.fill(); }
      else fctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      fctx.restore();
    }
    requestAnimationFrame(loop);
  };
  loop();
}
const PCOL = ['#ff4d5e', '#ff9a3c', '#ffd93d', '#5ccf6a', '#3d8bff', '#a066ff', '#ff7eb9', '#fff'];
export function burst(x, y, n = 18, { kind = 'star', colors = PCOL, speed = 6 } = {}) {
  if (!fx) fxInit();
  for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), v = rnd(speed * .4, speed); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, g: .18, life: rnd(.7, 1.2), s: rnd(6, 13), c: pick(colors), rot: rnd(0, 6), vr: rnd(-.2, .2), k: kind === 'mix' ? pick(['star', 'heart', 'rect']) : kind }); }
}
export function confetti() { if (!fx) fxInit(); for (let i = 0; i < 120; i++) parts.push({ x: rnd(0, innerWidth), y: rnd(-200, -10), vx: rnd(-1.5, 1.5), vy: rnd(2, 5), g: .05, life: rnd(2, 3.4), s: rnd(8, 15), c: pick(PCOL), rot: rnd(0, 6), vr: rnd(-.2, .2), k: pick(['rect', 'star', 'heart']) }); }
export function burstAt(el, n, o) { const c = centerOf(el); burst(c.x, c.y, n, o); }

/* ---------------- icons for UI chrome ---------------- */
const L = '#4a2c5a', st = `stroke="${L}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"`;
export const UI = {
  home: svg(`<path d="M14 50 L50 18 L86 50" fill="none" ${st}/><path d="M24 44 L24 86 L76 86 L76 44 L50 22Z" fill="#ffd93d" ${st}/><path d="M42 86 L42 64 L58 64 L58 86" fill="#ff7eb9" ${st}/>`),
  gear: svg(`<circle cx="50" cy="50" r="30" fill="#cfd6e6" ${st}/><circle cx="50" cy="50" r="11" fill="#fff" ${st}/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="44" y="6" width="12" height="16" rx="3" fill="#cfd6e6" ${st} transform="rotate(${i * 45} 50 50)"/>`).join('')}`),
  next: svg(`<circle cx="50" cy="50" r="40" fill="#5ccf6a" ${st}/><path d="M40 30 L64 50 L40 70Z" fill="#fff" ${st}/>`),
  again: svg(`<circle cx="50" cy="50" r="40" fill="#3d8bff" ${st}/><path d="M66 38 A20 20 0 1 0 70 56" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/><path d="M58 30 L72 36 L66 50Z" fill="#fff"/>`),
  ear: svg(`<circle cx="50" cy="50" r="40" fill="#ff9a3c" ${st}/><path d="M34 40 L46 40 L60 28 L60 72 L46 60 L34 60Z" fill="#fff" ${st}/><path d="M68 38 Q76 50 68 62" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`),
  book: svg(`<path d="M10 22 Q30 14 50 24 Q70 14 90 22 L90 84 Q70 76 50 86 Q30 76 10 84Z" fill="#ff7eb9" ${st}/><path d="M50 24 L50 86" ${st}/><path d="${starPath(30, 50, 12, 5)}" fill="#ffd93d"/><path d="${heartPath(70, 50, 11)}" fill="#fff"/>`),
  star: svg(`<path d="${starPath(50, 54, 44, 20)}" fill="#ffd93d" ${st}/>`),
  heart: svg(`<path d="${heartPath(50, 52, 40)}" fill="#ff4d5e" ${st}/>`),
  lock: svg(`<path d="M32 46 L32 32 A18 18 0 0 1 68 32 L68 46" fill="none" stroke="${L}" stroke-width="8"/><rect x="22" y="44" width="56" height="44" rx="10" fill="#ffc83d" ${st}/>`),
  trash: svg(`<path d="M24 30 L76 30 L70 88 L30 88Z" fill="#7fd8ff" ${st}/><path d="M16 30 L84 30 M40 30 L42 18 L58 18 L60 30" fill="none" ${st}/>`),
};

/* ---------------- shell: screens, top bar, parent gate ---------------- */
export function makeShell({ title, accent = '#ff7eb9', currencyIcon = UI.star, getCurrency }) {
  const root = h(`<div id="app"><div class="screens"></div>
    <button class="homeBtn uibtn" aria-label="home">${UI.home}</button>
    <div class="coins"><span class="ci">${currencyIcon}</span><b>0</b></div>
    <button class="gate uibtn" aria-label="parents">${UI.gear}<svg class="ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44"/></svg></button>
    <div class="rotate">${svg(`<rect x="30" y="12" width="40" height="70" rx="8" fill="#fff" ${st}/><path d="M18 88 Q50 104 82 88" fill="none" stroke="#fff" stroke-width="6"/><path d="M76 80 L84 88 L74 94" fill="none" stroke="#fff" stroke-width="6"/>`)}</div>
    <div class="tapstart"><div class="bigplay">${UI.next}</div></div></div>`);
  document.body.appendChild(root);
  const screens = $('.screens', root), coins = $('.coins b', root);
  const shell = {
    root, screens, current: null, onHome: null, currencyIcon,
    updateCoins() { coins.textContent = getCurrency(); bounce($('.coins', root), 'boing'); },
    show(el, { home = true } = {}) {
      hush(); $$('.reward,.callout', root).forEach(e => e.remove()); const old = shell.current; if (old && old.cleanup) old.cleanup();
      screens.innerHTML = ''; screens.appendChild(el); shell.current = el; root.classList.toggle('athome', !home);
      el.classList.add('enter'); setTimeout(() => el.classList.remove('enter'), 600);
    },
  };
  $('.homeBtn', root).onclick = () => { sfx('pop'); shell.onHome && shell.onHome(); };
  // first tap: unlock audio, go fullscreen, start music
  const ts = $('.tapstart', root);
  ts.addEventListener('pointerup', async () => { unlockAudio(); goFullscreen(); sfx('chime'); ts.classList.add('gone'); setTimeout(() => ts.remove(), 500); startMusic(); shell.onStart && shell.onStart(); }, { once: true });
  document.addEventListener('pointerdown', unlockAudio, { capture: true });
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
  // parent gate: hold 3 seconds
  const g = $('.gate', root); let gt = null;
  const startHold = e => { e.preventDefault(); g.classList.add('holding'); gt = setTimeout(() => { g.classList.remove('holding'); openParent(shell); }, 3000); };
  const stopHold = () => { clearTimeout(gt); g.classList.remove('holding'); };
  g.addEventListener('pointerdown', startHold); g.addEventListener('pointerup', stopHold); g.addEventListener('pointerleave', stopHold); g.addEventListener('pointercancel', stopHold);
  g.addEventListener('contextmenu', e => e.preventDefault());
  return shell;
}
function openParent(shell) {
  const s = settings.data;
  const p = h(`<div class="parent"><div class="pcard">
    <h2>Parents · הורים</h2>
    <label><input type="checkbox" data-k="music"> Music · מוזיקה</label>
    <label><input type="checkbox" data-k="sfx"> Sounds · צלילים</label>
    <div class="row">Voice · קול:
      <select data-k="voice"><option value="both">עברית → Español</option><option value="he">עברית בלבד</option><option value="es">Solo español</option></select></div>
    <div class="row"><button class="fs">Full screen · מסך מלא</button></div>
    <div class="row"><button class="reset">Reset progress (hold 2s) · איפוס</button></div>
    <p class="small">${shell.parentInfo ? shell.parentInfo() : ''}</p>
    <button class="close">✕</button></div></div>`);
  for (const i of $$('input[type=checkbox]', p)) { i.checked = !!s[i.dataset.k]; i.onchange = () => { s[i.dataset.k] = i.checked; settings.save(); applySettings(); }; }
  const sel = $('select', p); sel.value = s.voice; sel.onchange = () => { s.voice = sel.value; settings.save(); };
  $('.fs', p).onclick = goFullscreen;
  let rt; const rb = $('.reset', p);
  rb.onpointerdown = () => { rb.classList.add('holding'); rt = setTimeout(() => shell.resetProgress && shell.resetProgress(), 2000); };
  rb.onpointerup = rb.onpointerleave = () => { clearTimeout(rt); rb.classList.remove('holding'); };
  $('.close', p).onclick = () => p.remove(); p.onclick = e => { if (e.target === p) p.remove(); };
  shell.root.appendChild(p);
}

/* ---------------- hub tiles ---------------- */
export function hub({ bg = '', tiles, extra = '' }) {
  const el = h(`<section class="screen hub">${bg}<div class="tiles"></div>${extra}</section>`);
  const wrap = $('.tiles', el);
  tiles.forEach((t, i) => {
    const b = h(`<button class="tile" style="--c:${t.color};animation-delay:${i * 70}ms">${t.art}${t.badge ? `<span class="badge">${t.badge}</span>` : ''}</button>`);
    b.onclick = () => { sfx('pop'); burstAt(b, 10); t.go(); };
    wrap.appendChild(b);
  });
  return el;
}

/* ---------------- rewards + sticker book ---------------- */
export function makeRewards({ prog, pool, shell, onUnlock }) {
  const R = {
    nextSticker() { const left = pool.filter(i => !prog.data.stickers.includes(i)); return left.length ? pick(left) : null; },
    async give({ coins = 3, sticker = true, el } = {}) {
      if (el && shell.current !== el) return;
      prog.data.coins = (prog.data.coins || 0) + coins; prog.save(); shell.updateCoins();
      const sid = sticker ? R.nextSticker() : null;
      if (sid) { prog.data.stickers.push(sid); prog.save(); }
      confetti(); sfx('tada');
      const ov = h(`<div class="reward"><div class="rstar">${sid ? icon(sid) : UI.star}</div><div class="rcoins">${Array.from({ length: coins }, (_, i) => `<i style="animation-delay:${.3 + i * .15}s">${shell.currencyIcon || UI.star}</i>`).join('')}</div><button class="uibtn rnext">${UI.next}</button></div>`);
      shell.root.appendChild(ov);
      const done = new Promise(res => { $('.rnext', ov).onclick = () => { sfx('pop'); hush(); ov.classList.add('out'); setTimeout(() => { ov.remove(); res(); }, 300); }; });
      await wait(400);
      if (sid) { await say('newsticker'); await wait(200); await sayWith($('.rstar', ov), sid); } else await praise();
      const un = onUnlock && onUnlock(); if (un) { await wait(300); }
      return done;
    },
  };
  return R;
}
export function stickerBook({ prog, pool, perPage = 12 }) {
  const pages = []; for (let i = 0; i < pool.length; i += perPage) pages.push(pool.slice(i, i + perPage));
  let pg = 0;
  const el = h(`<section class="screen book"><button class="uibtn pg prev">${UI.next}</button><div class="pagewrap"></div><button class="uibtn pg nextp">${UI.next}</button><div class="dots"></div></section>`);
  const render = () => {
    const w = $('.pagewrap', el); w.innerHTML = '';
    const page = h(`<div class="page"></div>`);
    for (const id of pages[pg]) {
      const got = prog.data.stickers.includes(id);
      const s = h(`<button class="stk ${got ? 'got' : 'no'}" style="--r:${rnd(-8, 8).toFixed(1)}deg">${icon(id)}</button>`);
      s.onclick = () => { if (got) { sfx('sparkle'); burstAt(s, 8); sayWith(s, id); } else { sfx('soft'); bounce(s, 'wiggle'); } };
      page.appendChild(s);
    }
    w.appendChild(page);
    $('.dots', el).innerHTML = pages.map((_, i) => `<i class="${i === pg ? 'on' : ''}"></i>`).join('');
  };
  $('.prev', el).onclick = () => { pg = (pg - 1 + pages.length) % pages.length; sfx('flip'); render(); };
  $('.nextp', el).onclick = () => { pg = (pg + 1) % pages.length; sfx('flip'); render(); };
  render(); return el;
}

/* ---------------- offline ---------------- */
export function registerSW() { if ('serviceWorker' in navigator && location.protocol !== 'file:' && !window.Capacitor) navigator.serviceWorker.register('sw.js').catch(() => {}); }

/* ---------------- word callout: big picture bubble while the word is spoken ---------------- */
export async function callout(shell, artSvg, id, { from } = {}) {
  $$(".callout").forEach(e => e.remove());
  const c = h(`<div class="callout"><div class="cart">${artSvg}</div></div>`);
  shell.root.appendChild(c);
  if (from) { const r = c.getBoundingClientRect(); c.style.setProperty('--fx', (from.x - innerWidth / 2) + 'px'); c.style.setProperty('--fy', (from.y - 120) + 'px'); }
  const art = $('.cart', c);
  await say(id, { onPart: p => { art.classList.toggle('lang-he', p === 'he'); art.classList.toggle('lang-es', p === 'es'); if (p) bounce(art, 'speak'); } });
  c.classList.add('out'); setTimeout(() => c.remove(), 350);
}
