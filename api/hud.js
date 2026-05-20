// HUD — 1080×120 (9:1) — PNG via @resvg/resvg-js
const fs   = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { setCors } = require('../lib/validate');
const { dayToPlanet, PLANET_INFO } = require('../lib/constants');

const FONT_SRC  = path.join(__dirname, '../lib/fonts/nanum-subset.ttf');
const FONT_PATH = '/tmp/nm-hud.ttf';
let fontReady = false;
function ensureFont() {
  if (!fontReady) {
    fs.writeFileSync(FONT_PATH, fs.readFileSync(FONT_SRC));
    fontReady = true;
  }
}

const W              = 1080;
const H              = 120;
const PLANET_STRIP_W = 108;
const CONTENT_W      = W - PLANET_STRIP_W;
const MIN_COL_W      = 90;
const V_SZ           = 54;
const L_SZ           = 9;
const VALUE_Y        = 88;
const LABEL_Y        = 15;
const FONT           = "'NanumMyeongjo',serif";

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

// ── 모래시계 아이콘 ───────────────────────────────────────────
function drawHourglass(cx, cy, col) {
  const h = 10, w = 7;
  return `<path d="M ${cx-w},${cy-h} L ${cx+w},${cy-h} L ${cx},${cy} L ${cx+w},${cy+h} L ${cx-w},${cy+h} L ${cx},${cy} Z"
    fill="none" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/>
  <line x1="${cx-w-1}" y1="${cy-h}" x2="${cx+w+1}" y2="${cy-h}" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="${cx-w-1}" y1="${cy+h}" x2="${cx+w+1}" y2="${cy+h}" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M ${cx-w+1},${cy-h+1} L ${cx+w-1},${cy-h+1} L ${cx+3},${cy-3} L ${cx-3},${cy-3} Z" fill="${col}" opacity="0.45"/>
  <path d="M ${cx-3},${cy+h-2} L ${cx+3},${cy+h-2} L ${cx},${cy+3} Z" fill="${col}" opacity="0.6"/>`;
}

// ── 행성 일러스트 ─────────────────────────────────────────────
function drawPlanet(pl, cx, cy, pcol) {
  const r = 16;
  switch (pl) {
    case 1: { // Solaris — 태양 (원 + 방사선)
      const rays = Array.from({ length: 8 }, (_, i) => {
        const a  = (i * 45 - 22.5) * Math.PI / 180;
        const r1 = r + 4, r2 = r + 11;
        const x1 = (cx + Math.cos(a) * r1).toFixed(1), y1 = (cy + Math.sin(a) * r1).toFixed(1);
        const x2 = (cx + Math.cos(a) * r2).toFixed(1), y2 = (cy + Math.sin(a) * r2).toFixed(1);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${pcol}" stroke-width="2" stroke-linecap="round"/>`;
      }).join('');
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${pcol}" opacity="0.2"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${pcol}" stroke-width="1.5"/>
  <circle cx="${cx}" cy="${cy}" r="6" fill="${pcol}" opacity="0.8"/>
  ${rays}`;
    }
    case 2: { // Glaceon — 눈결정 (snowflake)
      const arms = Array.from({ length: 6 }, (_, i) => {
        const a  = i * 60 * Math.PI / 180;
        const x1 = (cx + Math.cos(a) * 3).toFixed(1),  y1 = (cy + Math.sin(a) * 3).toFixed(1);
        const x2 = (cx + Math.cos(a) * r).toFixed(1),  y2 = (cy + Math.sin(a) * r).toFixed(1);
        const bx = cx + Math.cos(a) * r * 0.55, by = cy + Math.sin(a) * r * 0.55;
        const b1 = a + 0.55, b2 = a - 0.55;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${pcol}" stroke-width="1.5"/>
  <line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx+Math.cos(b1)*6).toFixed(1)}" y2="${(by+Math.sin(b1)*6).toFixed(1)}" stroke="${pcol}" stroke-width="1"/>
  <line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx+Math.cos(b2)*6).toFixed(1)}" y2="${(by+Math.sin(b2)*6).toFixed(1)}" stroke="${pcol}" stroke-width="1"/>`;
      }).join('');
      return `<circle cx="${cx}" cy="${cy}" r="${r+5}" fill="none" stroke="${pcol}" stroke-width="0.5" opacity="0.3"/>
  ${arms}
  <circle cx="${cx}" cy="${cy}" r="3" fill="${pcol}"/>`;
    }
    case 3: { // Verdania — 행성 + 링 (Saturn-like)
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${pcol}" opacity="0.22" stroke="${pcol}" stroke-width="1.5"/>
  <circle cx="${cx}" cy="${cy}" r="5" fill="${pcol}" opacity="0.55"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${r+10}" ry="${Math.round(r*0.38)}" fill="none" stroke="${pcol}" stroke-width="1.8" transform="rotate(-18 ${cx} ${cy})"/>`;
    }
    case 4: { // Umbra — 초승달 + 별
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${pcol}" opacity="0.5"/>
  <circle cx="${cx+7}" cy="${cy-2}" r="${r-3}" fill="#0a0a12"/>
  <circle cx="${cx-11}" cy="${cy-9}" r="1"   fill="${pcol}" opacity="0.8"/>
  <circle cx="${cx+10}" cy="${cy+10}" r="0.8" fill="${pcol}" opacity="0.8"/>
  <circle cx="${cx-5}"  cy="${cy+11}" r="0.7" fill="${pcol}" opacity="0.6"/>
  <circle cx="${cx+4}"  cy="${cy-14}" r="0.7" fill="${pcol}" opacity="0.7"/>`;
    }
    case 5: { // Aethon — 번개
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${pcol}" opacity="0.1" stroke="${pcol}" stroke-width="1"/>
  <circle cx="${cx}" cy="${cy}" r="${r+7}" fill="none" stroke="${pcol}" stroke-width="0.6" opacity="0.3"/>
  <path d="M ${cx+5},${cy-14} L ${cx-5},${cy-1} L ${cx+3},${cy-1} L ${cx-5},${cy+14}"
    fill="none" stroke="${pcol}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    default: return '';
  }
}

function buildSVG({ turn, hour, min, loc, date, day }) {
  const pl     = dayToPlanet(day);
  const planet = PLANET_INFO[pl];
  const pcol   = planet.color;

  const h       = hour !== undefined ? String(parseInt(hour) || 0).padStart(2, '0') : '--';
  const m       = min  !== undefined ? String(parseInt(min)  || 0).padStart(2, '0') : '--';
  const timeVal = `${h};${m}`;
  const dayVal  = day ? `${parseInt(day)}일차` : '—';

  const fields = [
    { label: 'TURN',     value: String(turn || '—'), icon: 'hourglass' },
    { label: 'TIME',     value: timeVal },
    { label: 'LOCATION', value: String(loc  || '—') },
    { label: 'DATE',     value: String(date || '—') },
    { label: 'DAY',      value: dayVal },
  ];

  const cols = calcColumns(fields);

  // ── 배경 원 (stroke only, 블러 그룹) ─────────────────────────
  const circleData = [
    { cx: -22,    cy: 48,  r: 78,  sw: 1.6, op: 0.32 },
    { cx: 42,     cy: 98,  r: 118, sw: 1.0, op: 0.20 },
    { cx: -58,    cy: 12,  r: 148, sw: 0.7, op: 0.14 },
    { cx: 68,     cy: -20, r: 66,  sw: 1.3, op: 0.26 },
    { cx: 16,     cy: 25,  r: 40,  sw: 0.8, op: 0.18 },
    { cx: W+22,   cy: 48,  r: 78,  sw: 1.6, op: 0.32 },
    { cx: W-42,   cy: 98,  r: 118, sw: 1.0, op: 0.20 },
    { cx: W+58,   cy: 12,  r: 148, sw: 0.7, op: 0.14 },
    { cx: W-68,   cy: -20, r: 66,  sw: 1.3, op: 0.26 },
    { cx: W-16,   cy: 25,  r: 40,  sw: 0.8, op: 0.18 },
  ];
  const circleStrokes = circleData.map(c =>
    `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="none" stroke="${pcol}" stroke-width="${c.sw}" opacity="${c.op}"/>`
  ).join('\n    ');

  // ── 구분선 ───────────────────────────────────────────────────
  let bx = 0;
  const dividers = cols.slice(0, -1).map(({ w }) => {
    bx += w;
    return `<line x1="${bx}" y1="14" x2="${bx}" y2="${H - 14}" stroke="${pcol}" stroke-width="0.6" opacity="0.28"/>`;
  }).join('\n  ');

  const planetDiv = `<line x1="${CONTENT_W}" y1="10" x2="${CONTENT_W}" y2="${H - 10}" stroke="${pcol}" stroke-width="0.8" opacity="0.35"/>`;

  // ── 컬럼 텍스트 ──────────────────────────────────────────────
  const cells = fields.map((f, i) => {
    const { cx, maxTextW } = cols[i];
    const val   = e(f.value);
    const estPx = estimateW(f.value, V_SZ);
    const tl    = estPx > maxTextW
      ? `textLength="${Math.round(maxTextW)}" lengthAdjust="spacingAndGlyphs"`
      : '';

    const labelEl = f.icon === 'hourglass'
      ? drawHourglass(cx, 26, pcol)
      : `<text x="${cx}" y="${LABEL_Y}" text-anchor="middle"
      font-family="${FONT}" font-size="${L_SZ}" fill="${pcol}" opacity="0.7" letter-spacing="3">${f.label}</text>`;

    return `
  ${labelEl}
  <text x="${cx}" y="${VALUE_Y}" text-anchor="middle"
    font-family="${FONT}" font-size="${V_SZ}" font-weight="bold"
    fill="${pcol}" opacity="0.75" filter="url(#glow)" ${tl}>${val}</text>
  <text x="${cx}" y="${VALUE_Y}" text-anchor="middle"
    font-family="${FONT}" font-size="${V_SZ}" font-weight="bold"
    fill="#f4f0ea" ${tl}>${val}</text>`;
  }).join('');

  // ── 행성 스트립 ───────────────────────────────────────────────
  const pCx = CONTENT_W + PLANET_STRIP_W / 2;
  const planetStrip = `
  <text x="${pCx}" y="${LABEL_Y}" text-anchor="middle"
    font-family="${FONT}" font-size="${L_SZ}" fill="${pcol}" opacity="0.7" letter-spacing="3">PLANET</text>
  <circle cx="${pCx}" cy="65" r="22" fill="${pcol}" opacity="0.12" filter="url(#glow)"/>
  ${drawPlanet(pl, pCx, 65, pcol)}`;

  // ── 상하 강조선 ──────────────────────────────────────────────
  const accent = `
  <rect x="0" y="0" width="${W}" height="4" fill="${pcol}" opacity="0.3"/>
  <rect x="0" y="0" width="${W}" height="2.5" fill="${pcol}"/>
  <rect x="0" y="${H - 1.5}" width="${W}" height="1.5" fill="${pcol}" opacity="0.28"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
    <filter id="cbglow" x="-30%" y="-80%" width="160%" height="260%">
      <feGaussianBlur stdDeviation="3.5"/>
    </filter>
    <filter id="edgeglow" x="-100%" y="-100%" width="400%" height="400%">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#0a0a12"/>
  <!-- L/R 엣지 앰비언트 글로우 (고정) -->
  <rect x="-10" y="-10" width="220" height="${H + 20}" fill="${pcol}" opacity="0.13" filter="url(#edgeglow)"/>
  <rect x="${W - 210}" y="-10" width="220" height="${H + 20}" fill="${pcol}" opacity="0.13" filter="url(#edgeglow)"/>
  <!-- 배경 원 (stroke only, 블러) -->
  <g filter="url(#cbglow)">
    ${circleStrokes}
  </g>
  <!-- 상하 강조선 -->
  ${accent}
  <!-- 구분선 -->
  ${dividers}
  ${planetDiv}
  <!-- 컬럼 텍스트 -->
  ${cells}
  <!-- 행성 스트립 -->
  ${planetStrip}
</svg>`;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { turn, hour, min, loc, date, day } = req.query;

  try {
    ensureFont();
    const svg = buildSVG({ turn, hour, min, loc, date, day });
    const resvg = new Resvg(svg, {
      font: { fontFiles: [FONT_PATH], loadSystemFonts: false },
      fitTo: { mode: 'width', value: W },
    });
    const png = resvg.render().asPng();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(Buffer.from(png));
  } catch (err) {
    const errMsg = String(err?.message || err);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#1a0a0a"/>
  <rect x="0" y="0" width="${W}" height="3" fill="#d47474"/>
  <text x="20" y="75" font-family="monospace" font-size="14" fill="#d47474">${e(errMsg)}</text>
</svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(svg);
  }
};
