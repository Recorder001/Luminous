// HUD — 1080×120 (9:1) — PNG via @resvg/resvg-js
const { Resvg } = require('@resvg/resvg-js');
const { setCors } = require('../lib/validate');
const { dayToPlanet, PLANET_INFO } = require('../lib/constants');

const FONT_BUF = require('../lib/fonts/font-data');

const W              = 1080;
const H              = 120;
const PLANET_STRIP_W = 108;
const CONTENT_W      = W - PLANET_STRIP_W;
const MIN_COL_W      = 90;
const V_SZ           = 54;
const L_SZ           = 9;
const VALUE_Y        = 88;
const LABEL_Y        = 15;
const FONT           = "'WenQuanYi Zen Hei',serif";

function e(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function charPx(ch, sz) {
  if (/[가-힯]/.test(ch)) return sz * 0.90;
  if (/[A-Z]/.test(ch))   return sz * 0.68;
  if (/[a-z]/.test(ch))   return sz * 0.52;
  if (/[0-9]/.test(ch))   return sz * 0.56;
  if (ch === ' ')          return sz * 0.30;
  return sz * 0.42;
}
function estimateW(str, sz) {
  return Array.from(String(str || '')).reduce((s, c) => s + charPx(c, sz), 0);
}

function calcColumns(fields) {
  const PAD = 28;
  const raw = fields.map(f =>
    Math.max(MIN_COL_W, estimateW(f.value, V_SZ) + PAD)
  );
  const total = raw.reduce((a, b) => a + b, 0);
  const scale = CONTENT_W / total;
  const widths = raw.map(w => Math.round(w * scale));
  widths[widths.length - 1] += CONTENT_W - widths.reduce((a, b) => a + b, 0);

  let cx = 0;
  return widths.map(w => {
    const center = cx + w / 2;
    cx += w;
    return { cx: Math.round(center), w, maxTextW: w - PAD };
  });
}

function buildSVG({ turn, time, loc, date, day }) {
  const pl     = dayToPlanet(day);
  const planet = PLANET_INFO[pl];
  const pcol   = planet.color;

  const fields = [
    { label: 'TURN',     value: String(turn || '—') },
    { label: 'TIME',     value: String(time || '—') },
    { label: 'LOCATION', value: String(loc  || '—') },
    { label: 'DATE',     value: String(date || '—') },
    { label: 'DAY',      value: String(day  || '—') },
  ];

  const cols = calcColumns(fields);

  // ── 배경 원 장식 (clipPath 없이, SVG 뷰박스가 자연스럽게 자름) ──
  const circles = [
    { cx: -18,      cy: 60,   r: 168, fill: pcol, fo: 0.04 },
    { cx: W + 18,   cy: 60,   r: 168, fill: pcol, fo: 0.04 },
    { cx: 540,      cy: 200,  r: 210, fill: pcol, fo: 0.02 },
  ].map(c => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${c.fill}" opacity="${c.fo}"/>`)
  .join('\n  ');

  const circleStrokes = [
    { cx: -18,    cy: 60,   r: 168, sw: 1,   op: 0.18 },
    { cx: -18,    cy: 60,   r: 126, sw: 0.6, op: 0.10 },
    { cx: 285,    cy: -52,  r: 148, sw: 0.7, op: 0.10 },
    { cx: 540,    cy: 200,  r: 210, sw: 0.8, op: 0.08 },
    { cx: 808,    cy: -58,  r: 155, sw: 0.7, op: 0.10 },
    { cx: W + 18, cy: 60,   r: 168, sw: 1,   op: 0.18 },
    { cx: W + 18, cy: 60,   r: 126, sw: 0.6, op: 0.10 },
  ].map(c =>
    `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="none"
      stroke="${pcol}" stroke-width="${c.sw}" opacity="${c.op}"/>`
  ).join('\n  ');

  // ── 구분선 ────────────────────────────────────────────────
  let bx = 0;
  const dividers = cols.slice(0, -1).map(({ w }) => {
    bx += w;
    return `<line x1="${bx}" y1="16" x2="${bx}" y2="${H - 16}"
      stroke="${pcol}" stroke-width="0.6" opacity="0.28"/>`;
  }).join('\n  ');

  const planetDiv = `<line x1="${CONTENT_W}" y1="12" x2="${CONTENT_W}" y2="${H - 12}"
    stroke="${pcol}" stroke-width="0.8" opacity="0.35"/>`;

  // ── 컬럼 텍스트 (필터 없음 — resvg 호환 2레이어 글로우) ────
  const cells = fields.map((f, i) => {
    const { cx, maxTextW } = cols[i];
    const val   = e(f.value);
    const estPx = estimateW(f.value, V_SZ);
    const tl    = estPx > maxTextW
      ? `textLength="${Math.round(maxTextW)}" lengthAdjust="spacingAndGlyphs"`
      : '';

    return `
  <!-- ${f.label} glow layer -->
  <text x="${cx}" y="${VALUE_Y}" text-anchor="middle"
    font-family="${FONT}" font-size="${V_SZ + 6}" font-weight="bold"
    fill="${pcol}" opacity="0.18" ${tl}>${val}</text>
  <!-- ${f.label} sharp layer -->
  <text x="${cx}" y="${VALUE_Y}" text-anchor="middle"
    font-family="${FONT}" font-size="${V_SZ}" font-weight="bold"
    fill="#f4f0ea" ${tl}>${val}</text>
  <!-- ${f.label} label -->
  <text x="${cx}" y="${LABEL_Y}" text-anchor="middle"
    font-family="${FONT}" font-size="${L_SZ}"
    fill="${pcol}" opacity="0.65" letter-spacing="3">${f.label}</text>`;
  }).join('');

  // ── 행성 스트립 ───────────────────────────────────────────
  const pCx  = CONTENT_W + PLANET_STRIP_W / 2;
  const pVal = e(planet.name);
  const planetStrip = `
  <text x="${pCx}" y="${LABEL_Y}" text-anchor="middle"
    font-family="${FONT}" font-size="${L_SZ}"
    fill="${pcol}" opacity="0.65" letter-spacing="3">PLANET</text>
  <text x="${pCx}" y="${VALUE_Y}" text-anchor="middle"
    font-family="${FONT}" font-size="24" font-weight="bold"
    fill="${pcol}" opacity="0.25">${pVal}</text>
  <text x="${pCx}" y="${VALUE_Y}" text-anchor="middle"
    font-family="${FONT}" font-size="24" font-weight="bold"
    fill="${pcol}">${pVal}</text>`;

  // ── 상하 강조선 (필터 없이 2레이어) ─────────────────────────
  const accent = `
  <rect x="0" y="0" width="${W}" height="4" fill="${pcol}" opacity="0.3"/>
  <rect x="0" y="0" width="${W}" height="2.5" fill="${pcol}"/>
  <rect x="0" y="${H - 1.5}" width="${W}" height="1.5" fill="${pcol}" opacity="0.28"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- background -->
  <rect width="${W}" height="${H}" fill="#0a0a12"/>
  <!-- circle fills -->
  ${circles}
  <!-- circle strokes -->
  ${circleStrokes}
  <!-- accent lines -->
  ${accent}
  <!-- column dividers -->
  ${dividers}
  ${planetDiv}
  <!-- text -->
  ${cells}
  ${planetStrip}
</svg>`;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { turn, time, loc, date, day } = req.query;

  try {
    const svg = buildSVG({ turn, time, loc, date, day });
    const resvg = new Resvg(svg, {
      font: {
        fontBuffers: [FONT_BUF],
        defaultFontFamily: 'WenQuanYi Zen Hei',
        loadSystemFonts: false,
      },
      fitTo: { mode: 'width', value: W },
    });
    const png = resvg.render().asPng();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(Buffer.from(png));
  } catch (err) {
    const svg = buildSVG({ turn, time, loc, date, day });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(svg);
  }
};
