import { $, $$, h, wait, rnd, pick, shuffle, store, say, sayWith, hush, praise, sfx, preload, burst, burstAt, confetti, bounce,
  draggable, centerOf, inside, makeShell, hub, makeRewards, stickerBook, callout, UI, registerSW, audioState } from '../shared/core.js';
import { icon, svg, COLORS, RAINBOW, starPath, heartPath, cloud as cloudArt } from '../shared/art.js';
import { unicornSVG, BODIES, MANES } from './unicorn.js';

const prog = store('unicorn_progress', { coins: 0, stickers: [], runLv: 0, puzzles: 0, clouds: 3, feeds: 0, spas: 0, look: { body: 'white', mane: 'rainbow', acc: {} }, seenUnlock: 0 });
const L = '#4a2c5a';
// unlock ladder (total stars earned). Nothing is ever taken away.
const UNLOCKS = [
  { t: 0, body: ['white', 'pink', 'lightblue'], mane: ['rainbow'], acc: ['bow'] },
  { t: 5, body: ['purple'], acc: ['crown'] }, { t: 10, mane: ['pastel'], acc: ['flower'] }, { t: 16, body: ['yellow'], acc: ['glasses'] },
  { t: 22, mane: ['sunset'], acc: ['necklace'] }, { t: 30, body: ['blue'], acc: ['wings'] }, { t: 38, mane: ['ocean'], acc: ['hat'] },
  { t: 46, body: ['green', 'orange'], mane: ['candy'] }, { t: 56, body: ['gold'], mane: ['galaxy'] }, { t: 68, body: ['black'] },
];
const ACC_WORD = { bow: 'bow', crown: 'crown', flower: 'flower', glasses: 'glasses', necklace: 'necklace', wings: 'wings', hat: 'hat' };
const MANE_COLOR = { rainbow: 'rainbow', pastel: 'pink', sunset: 'orange', ocean: 'blue', candy: 'red', galaxy: 'purple' };
const unlocked = () => { const u = { body: [], mane: [], acc: [] }; for (const s of UNLOCKS) if (prog.data.coins >= s.t) for (const k of ['body', 'mane', 'acc']) (s[k] || []).forEach(x => u[k].push(x)); return u; };
const look = (extra = {}) => ({ ...prog.data.look, ...extra });

const STICKERS = ['unicorn', 'rainbow', 'star', 'heart', 'moon', 'sun', 'cloud', 'castle', 'butterfly', 'bunny', 'cat', 'dog', 'owl', 'frog', 'duck', 'bear',
  'fish', 'bird', 'horse', 'flower', 'tree', 'balloon', 'gift', 'crown', 'apple', 'strawberry', 'cake', 'icecream', 'cookie', 'cherry', 'watermelon', 'grapes',
  'banana', 'carrot', 'candy', 'pear', 'circle', 'triangle', 'diamond', 'mountain', 'sea', 'house', 'teddy', 'ball', 'bow', 'necklace', 'glasses', 'hat'];

const shell = makeShell({ title: 'Unicorn', currencyIcon: UI.star, getCurrency: () => prog.data.coins });
shell.parentInfo = () => `Unicorn Rainbow · ${prog.data.coins}★ · ${prog.data.stickers.length}/${STICKERS.length} stickers · voice: Hebrew (Hila) then Spanish (Elena, AR). Hold the gear 3s to open this panel.`;
shell.resetProgress = () => { localStorage.removeItem('unicorn_progress'); location.reload(); };
const rewards = makeRewards({ prog, pool: STICKERS, shell, onUnlock: checkUnlock });
shell.updateCoins(); shell.onHome = () => home();

function checkUnlock() {
  const fresh = UNLOCKS.filter(s => s.t > 0 && s.t <= prog.data.coins && s.t > prog.data.seenUnlock);
  if (!fresh.length) return false;
  prog.data.seenUnlock = fresh[fresh.length - 1].t; prog.save();
  const s = fresh[fresh.length - 1], what = s.acc ? { acc: { [s.acc[0]]: true } } : s.body ? { body: s.body[0] } : { mane: s.mane[0] };
  const word = s.acc ? ACC_WORD[s.acc[0]] : s.body ? s.body[0] : MANE_COLOR[s.mane[0]];
  setTimeout(async () => {
    const ov = h(`<div class="reward unlock"><div class="rstar uni">${unicornSVG(look({ ...what, acc: { ...prog.data.look.acc, ...(what.acc || {}) } }))}</div><button class="uibtn rnext">${UI.next}</button></div>`);
    shell.root.appendChild(ov); sfx('tada'); confetti();
    $('.rnext', ov).onclick = () => { sfx('pop'); hush(); ov.remove(); };
    await say('unlocked'); await wait(200); await sayWith($('.rstar', ov), word);
  }, 500);
  return true;
}

/* ---------- scenery ---------- */
const sky = (night, noDrift) => `<div class="sky ${night ? 'night' : ''}"><div class="sun">${icon(night ? 'moon' : 'sun')}</div>
  ${(noDrift ? [] : [0, 1, 2, 3]).map(i => `<div class="drift" style="top:${8 + i * 9}%;animation-duration:${50 + i * 17}s;animation-delay:-${i * 13}s;width:${130 + i * 30}px">${svg(cloudArt(), '0 20 110 60')}</div>`).join('')}
  <svg class="hills" viewBox="0 0 1000 300" preserveAspectRatio="none"><path d="M0 170 Q160 90 330 160 T680 150 T1000 140 L1000 300 L0 300Z" fill="#a8e88f"/><path d="M0 220 Q220 150 450 210 T1000 200 L1000 300 L0 300Z" fill="#7fd36b"/></svg></div>`;

/* ---------- HOME ---------- */
function home() {
  const tiles = [
    { color: '#ffd1e3', art: icon('rainbow'), go: run },
    { color: '#d6e8ff', art: puzzleTileArt(), go: puzzle },
    { color: '#ffe6b8', art: icon('apple'), go: feed },
    { color: '#d9f7f0', art: icon('comb'), go: spa },
    { color: '#e2f4ff', art: svg(`<g transform="translate(-4 -14)">${cloudArt()}</g>${[25,50,75].map(x=>`<circle cx="${x}" cy="82" r="9" fill="#ff7eb9" stroke="${L}" stroke-width="3"/>`).join('')}`), go: clouds },
    { color: '#efe0ff', art: icon('crown'), go: stable },
    { color: '#fff3c4', art: UI.book, go: book, badge: prog.data.stickers.length || '' },
  ];
  const el = hub({ bg: sky(false) + `<div class="hero">${unicornSVG(look())}</div>`, tiles });
  el.classList.add('home');
  const hero = $('.hero', el);
  hero.onclick = () => { sfx('boing'); hero.classList.remove('hop'); void hero.offsetWidth; hero.classList.add('hop'); burstAt(hero, 14, { kind: 'heart' }); sayWith(hero, pick(['unicorn', 'hello', 'iloveyou'])); };
  shell.show(el, { home: false });
}
shell.onStart = () => { sayWith($('.hero'), 'hello'); preload(['hello', 'unicorn', ...PRE]); };
const PRE = ['great', 'wow', 'yay', 'amazing', 'sopretty', 'newsticker', 'letsplay'];

/* ---------- 1. RAINBOW RUN: tap to jump, collect coloured stars (colour words) ---------- */
function run() {
  const lv = prog.data.runLv, palette = Object.keys(COLORS).filter(c => c !== 'white' && c !== 'black').slice(0, Math.min(10, 3 + lv * 2));
  const GOAL = 10;
  const el = h(`<section class="screen run">${sky(false)}<div class="ground"></div><div class="world"></div>
    <div class="runner">${unicornSVG(look())}</div><div class="goal">${Array.from({ length: GOAL }, () => `<i>${svg(`<path d="${starPath(50, 54, 44, 20)}" fill="#fff" stroke="${L}" stroke-width="5" stroke-linejoin="round" opacity=".6"/>`)}</i>`).join('')}</div></section>`);
  shell.show(el); preload(palette.concat(['rainbow', 'jump', 'collectstars']));
  const world = $('.world', el), runner = $('.runner', el), goal = $$('.goal i', el);
  runner.classList.add('running');
  let W = innerWidth, H = innerHeight, groundY = H * .8, uy = 0, vy = 0, onPlat = null, jumps = 0, got = 0, t = 0, lastSpawn = 0, lastPlat = -2, alive = true, lastRainbowSay = 0, jumpsSaid = 0;
  const objs = [], speed = 4.2 + lv * .5, UW = Math.min(220, H * .32), UH = UW * .89;
  runner.style.width = UW + 'px';
  const ux = W * .16;
  const spawnStar = () => {
    const c = pick(palette), lvl = Math.random();
    const y = lvl < .55 ? UH * .45 : lvl < .85 ? UH * 1.2 + rnd(0, 40) : UH * 1.9;
    const s = h(`<div class="ostar" style="--c:${COLORS[c]}">${svg(`<path d="${starPath(50, 54, 44, 20)}" fill="${COLORS[c]}" stroke="${L}" stroke-width="5" stroke-linejoin="round"/><circle cx="38" cy="46" r="4" fill="${L}"/><circle cx="62" cy="46" r="4" fill="${L}"/><path d="M42 60 Q50 66 58 60" fill="none" stroke="${L}" stroke-width="4" stroke-linecap="round"/>`)}</div>`);
    world.appendChild(s); objs.push({ k: 'star', el: s, x: W + 60, y, w: 84, c });
    if (y > UH * 1.6 && t - lastPlat > 1.5) spawnPlat(W - 60, UH * 1.15);
  };
  const spawnPlat = (x, y) => {
    lastPlat = t;
    const p = h(`<div class="plat">${svg(RAINBOW.map((c, i) => `<path d="M${10 + i * 7} 90 A${110 - i * 7} 70 0 0 1 ${230 - i * 7} 90" fill="none" stroke="${c}" stroke-width="8"/>`).join('') + `<g transform="translate(-10 62) scale(.5)">${cloudArt()}</g><g transform="translate(190 62) scale(.5)">${cloudArt()}</g>`, '0 0 250 110')}</div>`);
    world.appendChild(p); objs.push({ k: 'plat', el: p, x, y, w: 250 });
  };
  const tapJump = e => {
    if (e.target.closest('.uibtn,.gate')) return;
    if (onPlat || uy <= 0.5 || jumps < 2) {
      vy = jumps === 0 ? 15.5 : 13; jumps++; onPlat = null; sfx('jump'); runner.classList.add('air');
      if (jumpsSaid < 2 && Math.random() < .35) { jumpsSaid++; say('jump'); }
    }
  };
  el.addEventListener('pointerdown', tapJump);
  say('collectstars');
  let last = performance.now();
  const loop = now => {
    if (!alive) return; const dt = Math.min(2, (now - last) / 16.67); last = now; t += dt / 60;
    W = innerWidth; H = innerHeight; groundY = H * .8;
    if (t - lastSpawn > 2.7 && got + objs.filter(o => o.k === 'star').length < GOAL + 3) { lastSpawn = t; spawnStar(); }
    if (Math.random() < .004 * dt && t - lastPlat > 4) spawnPlat(W + 40, UH * rnd(.9, 1.3));
    // physics
    vy -= .62 * dt; uy += vy * dt;
    if (onPlat) { uy = onPlat.y + 4; vy = 0; if (ux + UW * .5 < onPlat.x || ux + UW * .4 > onPlat.x + onPlat.w) { onPlat = null; } }
    if (!onPlat && vy < 0) for (const o of objs) if (o.k === 'plat' && ux + UW * .55 > o.x + 20 && ux + UW * .45 < o.x + o.w - 20 && uy <= o.y + 6 && uy - vy * dt >= o.y - 4) {
      onPlat = o; uy = o.y + 4; vy = 0; jumps = 0; runner.classList.remove('air'); sfx('boing'); burst(ux + UW / 2, groundY - uy, 10, { colors: RAINBOW });
      if (t - lastRainbowSay > 9) { lastRainbowSay = t; sayWith(o.el, 'rainbow'); }
    }
    if (uy <= 0 && !onPlat) { if (vy < -2) sfx('soft'); uy = 0; vy = 0; jumps = 0; runner.classList.remove('air'); }
    runner.style.transform = `translate(${ux}px, ${groundY - uy - UH}px)`;
    for (const o of objs.slice()) {
      o.x -= speed * dt * (o.k === 'plat' ? 1 : 1);
      o.el.style.transform = `translate(${o.x}px, ${groundY - o.y - (o.k === 'plat' ? 24 : 42)}px)`;
      if (o.k === 'star' && !o.got) {
        const sx = o.x + 42, sy = o.y;
        if (Math.abs(sx - (ux + UW * .62)) < UW * .45 && sy > uy - 20 && sy < uy + UH + 30) {
          o.got = true; got++; sfx('sparkle'); const c = centerOf(o.el); burst(c.x, c.y, 16, { colors: [COLORS[o.c], '#fff'] });
          o.el.classList.add('gotit'); setTimeout(() => o.el.remove(), 500); objs.splice(objs.indexOf(o), 1);
          const g = goal[got - 1]; if (g) { g.innerHTML = svg(`<path d="${starPath(50, 54, 44, 20)}" fill="${COLORS[o.c]}" stroke="${L}" stroke-width="5" stroke-linejoin="round"/>`); bounce(g); }
          callout(shell, svg(`<path d="${starPath(50, 54, 44, 20)}" fill="${COLORS[o.c]}" stroke="${L}" stroke-width="4" stroke-linejoin="round"/>`), o.c, { from: c });
          if (got >= GOAL) finish();
        }
      }
      if (o.x < -300) { o.el.remove(); objs.splice(objs.indexOf(o), 1); }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  const finish = async () => {
    await wait(2200); if (!alive) return; alive = false; runner.classList.remove('running'); runner.classList.add('hop');
    prog.data.runLv = Math.min(5, lv + 1); prog.save();
    await rewards.give({ coins: 3, el }); if (shell.current === el) run();
  };
  el.cleanup = () => { alive = false; };
}

/* ---------- 2. PUZZLES: 2 → 4 → 6 → 9 pieces ---------- */
const nest = (id, x, y, s, o) => `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 100 100">${icon(id, o).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`;
const uniNest = (x, y, w, o = {}) => `<svg x="${x}" y="${y}" width="${w}" height="${w * .89}" viewBox="0 -12 200 178">${unicornSVG(look(o)).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`;
const bgDay = `<rect width="400" height="300" fill="#bfe9ff"/><path d="M0 200 Q100 150 200 190 T400 180 L400 300 L0 300Z" fill="#a8e88f"/><path d="M0 240 Q140 200 260 240 T400 230 L400 300 L0 300Z" fill="#7fd36b"/>`;
const SCENES = [
  { word: 'rainbow', art: () => bgDay + `<g transform="translate(40 -10) scale(3.2)">${icon('rainbow').replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>` + uniNest(120, 150, 150) },
  { word: 'castle', art: () => bgDay + nest('castle', 210, 40, 180) + uniNest(30, 140, 160) + nest('cloud', 20, 10, 80) },
  { word: 'sun', art: () => bgDay + nest('sun', 290, 10, 100) + uniNest(90, 120, 190) + nest('flower', 20, 220, 60) + nest('flower', 320, 220, 60, { fill: '#ffd93d' }) },
  { word: 'butterfly', art: () => bgDay + uniNest(30, 120, 180) + nest('butterfly', 240, 50, 110) + nest('butterfly', 300, 170, 70) + nest('tree', 300, 140, 100) },
  { word: 'balloon', art: () => `<rect width="400" height="300" fill="#ffe0ef"/>` + nest('balloon', 230, 10, 90) + nest('balloon', 290, 30, 90, { fill: '#3d8bff' }) + nest('balloon', 250, 80, 80, { fill: '#ffd93d' }) + `<rect y="250" width="400" height="50" fill="#ffc4dd"/>` + uniNest(40, 110, 200) + nest('gift', 300, 200, 80) },
  { word: 'moon', art: () => `<rect width="400" height="300" fill="#2b2a6b"/>` + Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 137) % 400}" cy="${(i * 71) % 200}" r="${1 + (i % 3)}" fill="#fff"/>`).join('') + nest('moon', 280, 20, 90) + `<path d="M0 230 Q200 190 400 230 L400 300 L0 300Z" fill="#4a3f8a"/>` + uniNest(70, 120, 190, { eyes: 'happy' }) },
  { word: 'sea', art: () => `<rect width="400" height="300" fill="#bfe9ff"/><rect y="170" width="400" height="130" fill="#3d8bff"/><path d="M0 180 Q50 165 100 180 T200 180 T300 180 T400 180" fill="none" stroke="#fff" stroke-width="6"/>` + nest('fish', 40, 210, 70) + nest('fish', 290, 230, 60) + nest('sun', 300, 10, 80) + uniNest(110, 70, 170) },
  { word: 'flower', art: () => bgDay + Array.from({ length: 7 }, (_, i) => nest('flower', 10 + i * 56, 210 + (i % 2) * 20, 70, { fill: RAINBOW[i % 6] })).join('') + uniNest(100, 70, 190) + nest('bunny', 300, 120, 80) },
];
function puzzleTileArt() { return svg(`<rect x="8" y="8" width="40" height="40" rx="6" fill="#ff7eb9" stroke="${L}" stroke-width="4"/><rect x="52" y="8" width="40" height="40" rx="6" fill="#ffd93d" stroke="${L}" stroke-width="4"/><rect x="8" y="52" width="40" height="40" rx="6" fill="#7fd8ff" stroke="${L}" stroke-width="4"/><rect x="58" y="58" width="40" height="40" rx="6" fill="#5ccf6a" stroke="${L}" stroke-width="4" transform="rotate(12 78 78)"/>`); }
function puzzle() {
  const n = prog.data.puzzles, sizes = [[2, 1], [2, 2], [3, 2], [3, 3]], [cols, rows] = sizes[Math.min(3, Math.floor(n / 2))];
  const scene = SCENES[n % SCENES.length], src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(scene.art(), '0 0 400 300'));
  const el = h(`<section class="screen puzzle"><div class="board"><div class="ghost" style="background-image:url(&quot;${src}&quot;)"></div></div><div class="tray"></div></section>`);
  shell.show(el); preload([scene.word, 'puzzle']); say('puzzle');
  const board = $('.board', el), tray = $('.tray', el);
  const bh = Math.min(innerHeight * .7, innerWidth * .52 * .75), bw = bh * 4 / 3; board.style.width = bw + 'px'; board.style.height = bh + 'px';
  const pw = bw / cols, ph = bh / rows; let placed = 0;
  const slots = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const s = h(`<div class="slot" style="left:${c * pw}px;top:${r * ph}px;width:${pw}px;height:${ph}px"></div>`); board.appendChild(s); slots.push({ s, r, c }); }
  const N = cols * rows, TW = innerWidth * .4 - 20, TH = innerHeight - 160; let scale = 0;
  for (let c = 1; c <= N; c++) { const rN = Math.ceil(N / c); scale = Math.max(scale, Math.min((TW - 18 * (c - 1)) / c / pw, (TH - 18 * (rN - 1)) / rN / ph) * .9); }
  scale = Math.min(.85, scale);
  shuffle(slots).forEach(({ s, r, c }, i) => {
    const k = scale, p = h(`<div class="piece" style="width:${pw * k}px;height:${ph * k}px;background-image:url(&quot;${src}&quot;);background-size:${bw * k}px ${bh * k}px;background-position:${-c * pw * k}px ${-r * ph * k}px;--rot:${rnd(-8, 8).toFixed(1)}deg"></div>`);
    tray.appendChild(p);
    draggable(p, {
      onStart: () => sfx('tap'),
      onDrop: (x, y) => {
        const rect = s.getBoundingClientRect();
        if (Math.abs(x - (rect.left + rect.width / 2)) < Math.max(70, pw * .5) && Math.abs(y - (rect.top + rect.height / 2)) < Math.max(70, ph * .5)) {
          p.style.transition = 'none'; p.style.transform = ''; p.classList.add('placed'); Object.assign(p.style, { left: s.style.left, top: s.style.top, width: pw + 'px', height: ph + 'px', backgroundSize: `${bw}px ${bh}px`, backgroundPosition: `${-c * pw}px ${-r * ph}px` }); board.appendChild(p);
          sfx('snap'); burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 12); placed++;
          if (placed === cols * rows) done(); return true;
        }
        sfx('soft'); return false;
      },
    });
  });
  const done = async () => {
    board.classList.add('done'); confetti(); sfx('chime'); await wait(500);
    await sayWith(board, scene.word); await praise();
    prog.data.puzzles++; prog.save(); await rewards.give({ coins: 2 + Math.floor(cols * rows / 4), el }); if (shell.current === el) puzzle();
  };
}

/* ---------- 3. FEED: drag food to the unicorn (food words) ---------- */
const FOODS = ['apple', 'carrot', 'strawberry', 'banana', 'grapes', 'cake', 'cookie', 'icecream', 'watermelon', 'cherry', 'pear', 'orangefruit', 'bread', 'candy', 'water'];
function feed() {
  const foods = shuffle(FOODS).slice(0, 6), GOAL = 5; let eaten = 0;
  const el = h(`<section class="screen feed">${sky(false)}<div class="bigU">${unicornSVG(look())}</div>
    <div class="meter">${Array.from({ length: GOAL }, () => `<i>${svg(`<path d="${heartPath(50, 52, 38)}" fill="#fff" stroke="${L}" stroke-width="5" opacity=".7"/>`)}</i>`).join('')}</div>
    <div class="plate"></div></section>`);
  shell.show(el); preload(foods.concat(['hungry', 'yummy', 'eat']));
  const U = $('.bigU', el), plate = $('.plate', el);
  setTimeout(() => sayWith(U, 'hungry'), 300);
  foods.forEach((f, i) => {
    const b = h(`<div class="food" style="animation-delay:${i * 80}ms">${icon(f)}</div>`); plate.appendChild(b);
    draggable(b, {
      onStart: () => { sfx('tap'); U.classList.add('open'); },
      onDrop: async (x, y, _, moved) => {
        U.classList.remove('open');
        if (!moved) { sayWith(b, f); return false; }
        const head = $('[data-part="nose"]', U) || U;
        if (inside(x, y, head, 110) || inside(x, y, $('[data-part="head"]', U), 40)) {
          const c = centerOf(head); b.style.transition = 'transform .35s ease-in, opacity .35s'; const r = b.getBoundingClientRect();
          b.style.transform = `translate(${c.x - r.left - r.width / 2}px,${c.y - r.top - r.height / 2}px) scale(.1)`; b.style.opacity = 0;
          sfx('munch'); U.classList.add('chew'); setTimeout(() => U.classList.remove('chew'), 900); burst(c.x, c.y, 14, { kind: 'heart' });
          eaten++; const m = $$('.meter i', el)[eaten - 1]; if (m) { m.innerHTML = svg(`<path d="${heartPath(50, 52, 38)}" fill="#ff4d5e" stroke="${L}" stroke-width="5"/>`); bounce(m); }
          await callout(shell, icon(f), f, { from: c });
          setTimeout(() => b.remove(), 400);
          if (eaten === GOAL) { U.innerHTML = unicornSVG(look({ eyes: 'happy' })); await sayWith(U, 'yummy'); prog.data.feeds++; prog.save(); await rewards.give({ coins: 3, el }); if (shell.current === el) feed(); }
          return true;
        }
        return false;
      },
    });
  });
}

/* ---------- 4. SPA: name body parts, wash mud, brush the mane ---------- */
function spa() {
  const mud = [[84, 92, 9], [110, 108, 8], [62, 116, 7], [140, 70, 6], [100, 82, 6]];
  let left = mud.length, saidWash = false, lastBrush = 0;
  const el = h(`<section class="screen spa"><div class="tiles-bg"></div><div class="bubbles"></div><div class="bigU">${unicornSVG(look({ mud }))}</div>
    <div class="tools"><div class="tool sponge">${svg(`<rect x="12" y="26" width="76" height="50" rx="16" fill="#ffd93d" stroke="${L}" stroke-width="4"/>${[[30, 40], [56, 50], [72, 38], [40, 62], [66, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#ffb020"/>`).join('')}`)}</div>
    <div class="tool comb">${icon('comb')}</div></div></section>`);
  shell.show(el); preload(['head', 'eyes', 'ears', 'nose', 'mouth', 'mane', 'tail', 'horn', 'legs', 'belly', 'wash', 'brush', 'allclean', 'clean']);
  const U = $('.bigU', el);
  U.addEventListener('click', e => { const p = e.target.closest('[data-part]'); if (!p) return; sfx('pop'); const c = centerOf(p); burst(c.x, c.y, 8); p.classList.remove('hl'); void p.getBBox(); p.classList.add('hl'); setTimeout(() => p.classList.remove('hl'), 1800); callout(shell, icon(p.dataset.part), p.dataset.part, { from: c }); });
  const tool = (sel, onMove) => { const t = $(sel, el); draggable(t, { ghostScale: 1.25, onMove: (x, y) => onMove(x, y, t), onDrop: () => false }); };
  tool('.sponge', (x, y) => {
    for (const m of $$('.mud', U)) { if (m.dataset.gone) continue; const r = m.getBoundingClientRect(); if (x > r.left - 30 && x < r.right + 30 && y > r.top - 30 && y < r.bottom + 30) {
      m.dataset.hits = (+m.dataset.hits || 0) + 1; m.style.opacity = 1 - m.dataset.hits / 8; burst(x, y, 3, { colors: ['#fff', '#bfefff', '#7fd8ff'], speed: 3 });
      if (m.dataset.hits % 3 === 1) sfx('splash');
      if (!saidWash) { saidWash = true; say('wash'); }
      if (m.dataset.hits >= 8) { m.dataset.gone = 1; m.remove(); left--; sfx('sparkle'); if (left === 0) allClean(); }
    } }
  });
  tool('.comb', (x, y) => {
    const mane = [...$$('[data-part="mane"],[data-part="tail"]', U)].find(m => inside(x, y, m, 20));
    if (mane) { burst(x, y, 2, { colors: ['#fff', '#ffd93d', '#ff7eb9'], speed: 3 }); if (performance.now() - lastBrush > 4000) { lastBrush = performance.now(); sfx('brush'); sayWith(mane, mane.dataset.part === 'tail' ? 'tail' : 'brush'); } }
  });
  const allClean = async () => { U.classList.add('shine'); confetti(); await wait(300); await sayWith(U, 'allclean'); prog.data.spas++; prog.save(); await rewards.give({ coins: 3, el }); if (shell.current === el) spa(); };
}

/* ---------- 5. COUNT THE CLOUDS: numbers 1-10 ---------- */
function clouds() {
  const n = prog.data.clouds; let count = 0;
  const el = h(`<section class="screen clouds">${sky(false, true)}<div class="cfield"></div><div class="peek">${unicornSVG(look())}</div></section>`);
  shell.show(el); preload(Array.from({ length: 10 }, (_, i) => 'n' + (i + 1)).concat(['howmanyclouds', 'letscount']));
  const f = $('.cfield', el); const pos = [];
  for (let i = 0; i < n; i++) { let x, y, k = 0; do { x = rnd(4, 82); y = rnd(4, 56); k++; } while (k < 60 && pos.some(p => Math.abs(p[0] - x) < 17 && Math.abs(p[1] - y) < 20)); pos.push([x, y]); }
  pos.forEach(([x, y], i) => {
    const c = h(`<button class="cl" style="left:${x}%;top:${y}%;animation-delay:-${rnd(0, 3).toFixed(1)}s">${svg(cloudArt(), '0 20 110 60')}<b></b></button>`); f.appendChild(c);
    c.onclick = async () => {
      if (c.classList.contains('done')) { sayWith(c, 'n' + c.dataset.n); return; }
      count++; c.dataset.n = count; c.classList.add('done'); c.style.setProperty('--c', RAINBOW[(count - 1) % 6]); $('b', c).textContent = count; sfx('pop'); burstAt(c, 12, { colors: [RAINBOW[(count - 1) % 6], '#fff'] });
      const last = count === n; await sayWith(c, 'n' + count);
      if (last) { await wait(300); $$('.cl', f).forEach((x, j) => setTimeout(() => bounce(x), j * 90)); const big = h(`<div class="bignum">${n}</div>`); el.appendChild(big); await sayWith(big, 'n' + n); await praise(); prog.data.clouds = n >= 10 ? 5 + Math.floor(Math.random() * 6) : n + 1; prog.save(); await rewards.give({ coins: 2 + Math.floor(n / 3), el }); if (shell.current === el) clouds(); }
    };
  });
  setTimeout(() => say('howmanyclouds'), 300);
}

/* ---------- 6. STABLE: dress the unicorn, unlock colours & accessories ---------- */
function stable() {
  const u = unlocked();
  const el = h(`<section class="screen stable"><div class="barn"></div><div class="bigU">${unicornSVG(look())}</div>
    <div class="panel left"></div><div class="panel right"></div><div class="panel bottom"></div></section>`);
  shell.show(el); preload(Object.keys(BODIES).concat(Object.values(ACC_WORD), Object.values(MANE_COLOR)));
  const U = $('.bigU', el);
  const redraw = () => { U.innerHTML = unicornSVG(look()); bounce(U, 'boing'); burstAt(U, 16, { kind: 'mix' }); };
  const btn = (art, isLocked, onTap) => { const b = h(`<button class="opt ${isLocked ? 'locked' : ''}">${art}${isLocked ? `<span class="lk">${UI.lock}</span>` : ''}</button>`); b.onclick = () => { if (isLocked) { sfx('soft'); bounce(b, 'wiggle'); return; } sfx('pop'); onTap(b); }; return b; };
  for (const k of Object.keys(BODIES)) $('.left', el).appendChild(btn(svg(`<circle cx="50" cy="50" r="40" fill="${BODIES[k]}" stroke="${L}" stroke-width="5"/>`), !u.body.includes(k), b => { prog.data.look.body = k; prog.save(); redraw(); sayWith(b, k); }));
  for (const k of Object.keys(MANES)) $('.bottom', el).appendChild(btn(svg(MANES[k].map((c, i) => `<path d="M${20 + i * 18} 90 C${10 + i * 18} 60 ${30 + i * 18} 30 ${20 + i * 22} 10" fill="none" stroke="${c}" stroke-width="16" stroke-linecap="round"/>`).join('')), !u.mane.includes(k), b => { prog.data.look.mane = k; prog.save(); redraw(); sayWith(b, MANE_COLOR[k]); }));
  for (const k of Object.keys(ACC_WORD)) $('.right', el).appendChild(btn(icon(k === 'wings' ? 'wings' : k), !u.acc.includes(k), b => { const a = prog.data.look.acc; a[k] = !a[k]; prog.save(); redraw(); b.classList.toggle('on', a[k]); if (a[k]) sayWith(b, ACC_WORD[k]); else sfx('whoosh'); }));
  $$('.right .opt', el).forEach((b, i) => b.classList.toggle('on', !!prog.data.look.acc[Object.keys(ACC_WORD)[i]]));
  U.onclick = e => { const p = e.target.closest('[data-part]'); sfx('boing'); bounce(U, 'boing'); if (p) callout(shell, icon(p.dataset.part), p.dataset.part); };
}

function book() { const el = stickerBook({ prog, pool: STICKERS }); shell.show(el); preload(prog.data.stickers); }

home(); registerSW();
window.__kg = { prog, audioState, go: { run, puzzle, feed, spa, clouds, stable, book, home } };
