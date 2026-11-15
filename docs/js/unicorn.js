// Original side-view cartoon unicorn, fully parametric. Parts carry data-part so taps can name them.
import { starPath, heartPath, OUTLINE as L } from '../shared/art.js';
const st = `stroke="${L}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
export const BODIES = { white: '#ffffff', pink: '#ffc4dd', lightblue: '#c4ecff', purple: '#dcc8ff', yellow: '#fff1a8', blue: '#9fc4ff', green: '#c8f2c4', gold: '#ffe08a', black: '#5a5068', orange: '#ffd2a8' };
export const MANES = {
  rainbow: ['#ff7eb9', '#a066ff', '#7fd8ff'], sunset: ['#ff9a3c', '#ff4d5e', '#ffd93d'], pastel: ['#ffb3d9', '#c9b3ff', '#b3f0ff'],
  ocean: ['#3d8bff', '#7fd8ff', '#5ccf6a'], galaxy: ['#6a4cff', '#ff7eb9', '#2b2a6b'], candy: ['#ff4d5e', '#fff', '#ff7eb9'],
};
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = Math.round(r * k); g = Math.round(g * k); b = Math.round(b * k); return `rgb(${r},${g},${b})`; };
function leg(x, body, hoof, cls) { return `<g class="leg ${cls}" style="transform-origin:${x + 7.5}px 108px"><rect x="${x}" y="104" width="15" height="48" rx="7" fill="${body}" ${st}/><rect x="${x - 1}" y="144" width="17" height="11" rx="4" fill="${hoof}" ${st}/></g>`; }
export function unicornSVG({ body = 'white', mane = 'rainbow', acc = {}, mud = [], hoof = '#ffc83d', eyes = 'open', id = '' } = {}) {
  const b = BODIES[body] || body, m = MANES[mane] || mane, bd = shade(b.startsWith('#') ? b : '#ffffff', .88);
  const lashes = `<path d="M158 38 l-4 -4 M161 37 l-1.5 -5 M165 38 l1 -5" stroke="${L}" stroke-width="2" stroke-linecap="round"/>`;
  const eye = eyes === 'happy' ? `<path d="M157 46 Q162 39 167 46" fill="none" stroke="${L}" stroke-width="3" stroke-linecap="round"/>` :
    `<g class="eye-open" style="transform-origin:162px 44px"><ellipse cx="162" cy="44" rx="4.6" ry="6.2" fill="${L}"/><circle cx="163.6" cy="41.4" r="1.8" fill="#fff"/></g>`;
  return `<svg ${id ? `id="${id}"` : ''} class="unicorn" viewBox="0 -12 200 178" xmlns="http://www.w3.org/2000/svg">
  ${acc.wings ? `<g class="wings far" style="transform-origin:96px 78px"><path d="M96 78 C80 40 50 30 40 44 C56 50 60 60 66 66 C54 64 46 70 50 78 Z" fill="#e8f7ff" ${st} opacity=".9"/></g>` : ''}
  <g data-part="tail" class="tail" style="transform-origin:50px 92px">
    <path d="M50 88 C24 78 6 98 14 122 C18 138 36 144 42 134 C30 122 32 106 52 100 Z" fill="${m[0]}" ${st}/>
    <path d="M50 94 C34 98 26 112 30 128 C36 120 40 108 54 102 Z" fill="${m[1]}" ${st}/>
    ${acc.bow ? `<g transform="translate(46 92) scale(.32) translate(-50 -50)"><path d="M50 50 L14 26 C6 30 6 70 14 74Z M50 50 L86 26 C94 30 94 70 86 74Z" fill="#ff4d5e" stroke="${L}" stroke-width="8"/><circle cx="50" cy="50" r="12" fill="#ff4d5e" stroke="${L}" stroke-width="8"/></g>` : ''}
  </g>
  <g data-part="legs" class="legs">${leg(78, bd, hoof, 'l2')}${leg(134, bd, hoof, 'l4')}</g>
  <g data-part="belly"><ellipse cx="96" cy="100" rx="52" ry="32" fill="${b}" ${st}/><ellipse cx="92" cy="112" rx="32" ry="12" fill="#fff" opacity=".35"/>
    ${[[70, 88], [78, 98], [88, 86]].map(([x, y], i) => `<path d="${starPath(x, y, 4 - i * .6, 1.8)}" fill="${m[0]}" opacity=".7"/>`).join('')}</g>
  <g data-part="legs" class="legs">${leg(60, b, hoof, 'l1')}${leg(116, b, hoof, 'l3')}</g>
  ${acc.wings ? `<g class="wings" style="transform-origin:100px 80px"><path d="M100 80 C86 34 52 18 40 34 C58 40 62 52 66 60 C50 56 40 64 46 74 C58 70 64 74 70 80 C60 82 58 92 66 96 Z" fill="#f4fbff" ${st}/><path d="M60 42 Q76 54 84 72 M52 64 Q68 70 78 80" fill="none" stroke="#7fd8ff" stroke-width="2.5" stroke-linecap="round"/></g>` : ''}
  <g class="headgrp" style="transform-origin:140px 90px">
  <g data-part="head"><path d="M118 82 C124 58 132 44 142 34 L170 50 C160 60 152 80 148 104 C138 110 122 102 118 82 Z" fill="${b}" ${st}/>
    <ellipse cx="160" cy="46" rx="26" ry="19" transform="rotate(22 160 46)" fill="${b}" ${st}/></g>
  ${acc.necklace ? `<g><path d="M124 92 Q136 106 150 98" fill="none" stroke="${L}" stroke-width="1.5"/>${[0, 1, 2, 3, 4, 5].map(i => { const t = i / 5, x = 124 + 26 * t, y = 92 + 12 * Math.sin(Math.PI * t) + 6 * t; return `<circle cx="${x}" cy="${y}" r="3.6" fill="#fff" stroke="${L}" stroke-width="1.5"/>`; }).join('')}<path d="${heartPath(138, 108, 6)}" fill="#ff4d5e" stroke="${L}" stroke-width="1.5"/></g>` : ''}
  <g data-part="nose"><ellipse cx="178" cy="60" rx="15" ry="12" fill="${b}" ${st}/><ellipse cx="186" cy="57" rx="2" ry="2.6" fill="${L}"/></g>
  <path d="M164 52 C170 50 176 50 180 52" fill="${b}" stroke="none"/>
  <g data-part="mouth"><path d="M173 67 Q180 73 187 66" fill="none" stroke="${L}" stroke-width="2.6" stroke-linecap="round"/><rect x="170" y="62" width="20" height="14" fill="transparent"/></g>
  <circle cx="171" cy="54" r="5" fill="#ff8fb3" opacity=".55"/>
  <g data-part="eyes">${eye}${lashes}<circle cx="162" cy="44" r="10" fill="transparent"/></g>
  <g data-part="ears"><path d="M146 32 L146 10 L159 27 Z" fill="${b}" ${st}/><path d="M149 28 L149 17 L156 26 Z" fill="#ffb3cf"/></g>
  <g data-part="horn"><path d="M157 27 L174 -6 L167 30 Z" fill="#ffd93d" ${st}/><path d="M160 22 L168 20 M163 14 L170 11 M166 6 L171 4" stroke="#ff9a3c" stroke-width="2.4" stroke-linecap="round"/></g>
  <g data-part="mane" class="mane">
    <path d="M150 22 C134 20 120 38 122 58 C116 66 114 80 120 96 C128 86 130 72 136 62 C140 50 146 40 156 34 Z" fill="${m[0]}" ${st}/>
    <path d="M144 30 C132 40 128 56 130 70 C126 80 126 90 128 98 C134 84 136 70 142 60 C146 50 150 42 152 37 Z" fill="${m[1]}" ${st}/>
    <path d="M151 23 C162 13 174 22 167 35 C165 29 159 26 153 31 Z" fill="${m[2]}" ${st}/>
  </g>
  ${acc.flower ? `<g transform="translate(140 24) scale(.22) translate(-50 -36)">${[0, 72, 144, 216, 288].map(a => `<circle cx="${50 + Math.cos((a - 90) * Math.PI / 180) * 18}" cy="${36 + Math.sin((a - 90) * Math.PI / 180) * 18}" r="14" fill="#ff7eb9" stroke="${L}" stroke-width="7"/>`).join('')}<circle cx="50" cy="36" r="11" fill="#ffd93d" stroke="${L}" stroke-width="7"/></g>` : ''}
  ${acc.crown ? `<g transform="translate(150 18) rotate(18) scale(.3) translate(-50 -60)"><path d="M12 78 L8 30 L30 50 L50 18 L70 50 L92 30 L88 78Z" fill="#ffc83d" stroke="${L}" stroke-width="9" stroke-linejoin="round"/><circle cx="50" cy="60" r="8" fill="#ff4d5e" stroke="${L}" stroke-width="6"/></g>` : ''}
  ${acc.hat ? `<g transform="translate(136 6) rotate(-14)"><path d="M0 18 L10 -20 L22 18 Z" fill="#a066ff" ${st}/><circle cx="10" cy="-21" r="4.5" fill="#ffd93d" ${st}/><path d="M4 4 L17 1 M2 12 L20 10" stroke="#ffd93d" stroke-width="3"/></g>` : ''}
  ${acc.glasses ? `<g><circle cx="162" cy="45" r="10" fill="#bfefff" fill-opacity=".35" stroke="#ff4d5e" stroke-width="3.5"/><path d="M152 44 L142 40" stroke="#ff4d5e" stroke-width="3.5" stroke-linecap="round"/><path d="M172 46 L178 48" stroke="#ff4d5e" stroke-width="3" stroke-linecap="round"/></g>` : ''}
  </g>
  ${mud.map((d, i) => d ? `<g class="mud" data-mud="${i}"><ellipse cx="${d[0]}" cy="${d[1]}" rx="${d[2]}" ry="${d[2] * .75}" fill="#9b6a43" opacity=".85"/><circle cx="${d[0] + d[2] * .6}" cy="${d[1] - d[2] * .5}" r="${d[2] * .35}" fill="#9b6a43" opacity=".85"/></g>` : '').join('')}
</svg>`;
}
