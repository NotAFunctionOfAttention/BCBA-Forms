// Draws a multielement graph (one data path per condition) as SVG, used both
// on screen and in the PDF. Black and white with distinct markers, as graphs
// in clinical records usually are.

import { esc } from './util.js';

const MARKERS = [
  (x, y) => `<circle cx="${x}" cy="${y}" r="4" fill="#000"/>`,
  (x, y) => `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="#fff" stroke="#000" stroke-width="1.3"/>`,
  (x, y) => `<path d="M${x} ${y - 5} L${x + 5} ${y + 4} L${x - 5} ${y + 4} Z" fill="#000"/>`,
  (x, y) => `<path d="M${x} ${y - 5} L${x + 5} ${y} L${x} ${y + 5} L${x - 5} ${y} Z" fill="#fff" stroke="#000" stroke-width="1.3"/>`,
  (x, y) => `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="#000" stroke-width="1.3"/>`,
  (x, y) => `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="#000"/>`,
  (x, y) => `<path d="M${x - 4} ${y - 4} L${x + 4} ${y + 4} M${x + 4} ${y - 4} L${x - 4} ${y + 4}" stroke="#000" stroke-width="1.6"/>`,
];
const DASH = ['', '4 3', '', '2 2', '6 3', '', '1 2'];

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

// series: [{ label, values: [numbers in session order] }]
// Sessions are numbered as if conditions were run in rotating order.
export function multielementSVG(series, { yLabel = 'Responses', percent = false } = {}) {
  const S = series.filter((s) => s.values.length);
  if (!S.length) return '';
  const W = 680, H = 300, L = 56, R = 190, T = 14, B = 44;
  const pw = W - L - R, ph = H - T - B;
  // Assign session numbers in rotating order.
  const points = S.map(() => []);
  let n = 0;
  const most = Math.max(...S.map((s) => s.values.length));
  for (let k = 0; k < most; k++) S.forEach((s, i) => { if (k < s.values.length) points[i].push([++n, s.values[k]]); });
  const yMax = percent ? 100 : niceMax(Math.max(...S.flatMap((s) => s.values)));
  const x = (i) => L + (pw * (i - 0.5)) / n;
  const y = (v) => T + ph - (ph * v) / yMax;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Roboto" font-size="11">`);
  out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>`);
  // Axes and ticks
  out.push(`<path d="M${L} ${T} L${L} ${T + ph} L${L + pw} ${T + ph}" fill="none" stroke="#000" stroke-width="1.2"/>`);
  for (let t = 0; t <= 5; t++) {
    const v = (yMax * t) / 5, yy = y(v);
    out.push(`<path d="M${L - 4} ${yy} L${L} ${yy}" stroke="#000"/><text x="${L - 7}" y="${yy + 4}" text-anchor="end">${Math.round(v * 10) / 10}${percent ? '%' : ''}</text>`);
  }
  const step = n <= 20 ? 1 : n <= 40 ? 2 : 5;
  for (let i = 1; i <= n; i++) {
    if (i % step && i !== 1) continue;
    out.push(`<path d="M${x(i)} ${T + ph} L${x(i)} ${T + ph + 4}" stroke="#000"/><text x="${x(i)}" y="${T + ph + 16}" text-anchor="middle">${i}</text>`);
  }
  out.push(`<text x="${L + pw / 2}" y="${H - 6}" text-anchor="middle">Session</text>`);
  out.push(`<text x="14" y="${T + ph / 2}" text-anchor="middle" transform="rotate(-90 14 ${T + ph / 2})">${esc(yLabel)}</text>`);
  // Data paths
  S.forEach((s, i) => {
    const pts = points[i].map(([sx, v]) => [x(sx), y(v)]);
    if (pts.length > 1) out.push(`<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#000" stroke-width="1.1"${DASH[i % DASH.length] ? ` stroke-dasharray="${DASH[i % DASH.length]}"` : ''}/>`);
    pts.forEach(([px, py]) => out.push(MARKERS[i % MARKERS.length](px, py)));
  });
  // Legend
  S.forEach((s, i) => {
    const ly = T + 10 + i * 20, lx = L + pw + 18;
    out.push(`<path d="M${lx} ${ly} L${lx + 22} ${ly}" stroke="#000" stroke-width="1.1"${DASH[i % DASH.length] ? ` stroke-dasharray="${DASH[i % DASH.length]}"` : ''}/>`);
    out.push(MARKERS[i % MARKERS.length](lx + 11, ly));
    out.push(`<text x="${lx + 30}" y="${ly + 4}">${esc(s.label)}</text>`);
  });
  out.push('</svg>');
  return out.join('');
}
