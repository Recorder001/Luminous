// HUD — 1080×120 (9:1) — PNG output via Sharp
const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');
const { setCors } = require('../lib/validate');
const { dayToPlanet, PLANET_INFO } = require('../lib/constants');

// 서브셋 폰트 base64 (한글+라틴) — 모듈 로드 시 1회만 읽음
const FONT_B64 = fs.readFileSync(
  path.join(__dirname, '../lib/fonts/cjk-subset.ttf')
).toString('base64');
const FONT_FACE = `@font-face {
  font-family: 'HudFont';
  src: url('data:font/truetype;base64,${FONT_B64}') format('truetype');
}`;

const W              = 1080;
const H              = 120;
const PLANET_STRIP_W = 108;
const CONTENT_W      = W - PLANET_STRIP_W;
const MIN_COL_W      = 90;
const V_SZ           = 54;   // 값 폰트 크기
const L_SZ           = 9;    // 레이블 폰트 크기
const VALUE_Y        = 88;
const LABEL_Y        = 15;
// feMerge 없이 glow: blur 전용 필터 + 동일 텍스트 두 번 렌더
const BLUR_STD       = 4;

function e(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── 글자 폭 추정 ────────────────────────────────────────────
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

// ── 동적 컬럼 폭 계산 ────────────────────────────────────────
function calcColumns(fields) {
  const PAD = 28;
  const raw = fields.map(f =>
    Math.max(MIN_COL_W, estimateW(f.value, V_SZ) + PAD)
  );
  const total = raw.reduce((a, b) => a + b, 0);
  const scale = CONTENT_W / total;
  const widths = raw.map(w => Math.round(w * scale));

  // 반올림 오차 보정
  const diff = CONTENT_W - widths.reduce((a, b) => a + b, 0);
  widths[widths.length - 1] += diff;

  let cx = 0;
  return widths.map(w => {
    const center = cx + w / 2;
    cx += w;
    return { cx: Math.round(center), w, maxTextW: w - PAD };
  });
}

// ── SVG 빌드 ─────────────────────────────────────────────────
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

  // ── defs: 폰트 + blur 전용 필터 (feMerge 없음) ───────────
  const defs = `<defs>
    <style>${FONT_FACE}</style>
    <clipPath id="hc"><rect width="${W}" height="${H}"/></clipPath>
    <filter id="blur-v">
      <feGaussianBlur stdDeviation="${BLUR_STD}"/>
    </filter>
    <filter id="blur-p">
      <feGaussianBlur stdDeviation="${BLUR_STD * 1.4}"/>
    </filter>
    <filter id="blur-line">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
  </defs>`;

  // ── 배경 원 장식 ──────────────────────────────────────────
  const circles = `<g clip-path="url(#hc)">
    <circle cx="-18"        cy="60" r="168" fill="${pcol}" opacity="0.04"/>
    <circle cx="${W + 18}"  cy="60" r="168" fill="${pcol}" opacity="0.04"/>
    <circle cx="-18"        cy="60" r="168" fill="none" stroke="${pcol}" stroke-width="1"   opacity="0.18"/>
    <circle cx="-18"        cy="60" r="126" fill="none" stroke="${pcol}" stroke-width="0.6" opacity="0.10"/>
    <circle cx="285"        cy="-52" r="148" fill="none" stroke="${pcol}" stroke-width="0.7" opacity="0.10"/>
    <circle cx="540"        cy="192" r="210" fill="none" stroke="${pcol}" stroke-width="0.8" opacity="0.08"/>
    <circle cx="808"        cy="-58" r="155" fill="none" stroke="${pcol}" stroke-width="0.7" opacity="0.10"/>
    <circle cx="${W + 18}"  cy="60"  r="168" fill="none" stroke="${pcol}" stroke-width="1"   opacity="0.18"/>
    <circle cx="${W + 18}"  cy="60"  r="126" fill="none" stroke="${pcol}" stroke-width="0.6" opacity="0.10"/>
  </g>`;

  // ── 구분선 ────────────────────────────────────────────────
  let bx = 0;
  const dividers = cols.slice(0, -1).map(({ w }) => {
    bx += w;
    return `<line x1="${bx}" y1="16" x2="${bx}" y2="${H - 16}"
      stroke="${pcol}" stroke-width="0.6" opacity="0.28"/>`;
  }).join('\n');

  const planetDiv = `<line x1="${CONTENT_W}" y1="12" x2="${CONTENT_W}" y2="${H - 12}"
    stroke="${pcol}" stroke-width="0.8" opacity="0.35"/>`;

  // ── 컬럼 텍스트 (glow = blur 레이어 + 선명 레이어) ────────
  const cells = fields.map((f, i) => {
    const { cx, maxTextW } = cols[i];
    const val  = e(f.value);
    const estPx = estimateW(f.value, V_SZ);
    const tl   = estPx > maxTextW
      ? `textLength="${Math.round(maxTextW)}" lengthAdjust="spacingAndGlyphs"`
      : '';
    const txtAttrs = `x="${cx}" y="${VALUE_Y}" text-anchor="middle"
      font-family="HudFont,serif" font-size="${V_SZ}" font-weight="bold" ${tl}`;

    return `
  <text ${txtAttrs} fill="${pcol}" opacity="0.35" filter="url(#blur-v)">${val}</text>
  <text ${txtAttrs} fill="#f4f0ea">${val}</text>
  <text x="${cx}" y="${LABEL_Y}" text-anchor="middle"
    font-family="sans-serif" font-size="${L_SZ}"
    fill="${pcol}" opacity="0.65" letter-spacing="3">${f.label}</text>`;
  }).join('');

  // ── 행성 스트립 ───────────────────────────────────────────
  const pCx  = CONTENT_W + PLANET_STRIP_W / 2;
  const pVal = e(planet.name);
  const planetStrip = `
  <text x="${pCx}" y="${VALUE_Y - 18}" text-anchor="middle"
    font-family="sans-serif" font-size="${L_SZ}"
    fill="${pcol}" opacity="0.65" letter-spacing="3">PLANET</text>
  <text x="${pCx}" y="${VALUE_Y}" text-anchor="middle"
    font-family="HudFont,serif" font-size="24" font-weight="bold"
    fill="${pcol}" opacity="0.45" filter="url(#blur-p)">${pVal}</text>
  <text x="${pCx}" y="${VALUE_Y}" text-anchor="middle"
    font-family="HudFont,serif" font-size="24" font-weight="bold"
    fill="${pcol}">${pVal}</text>`;

  // ── 상하 강조선 ───────────────────────────────────────────
  const accent = `
  <rect x="0" y="0" width="${W}" height="2" fill="${pcol}" opacity="0.5" filter="url(#blur-line)"/>
  <rect x="0" y="0" width="${W}" height="2.5" fill="${pcol}"/>
  <rect x="0" y="${H - 1.5}" width="${W}" height="1.5" fill="${pcol}" opacity="0.28"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs}
  <rect width="${W}" height="${H}" fill="#0a0a12"/>
  ${circles}
  ${accent}
  ${dividers}
  ${planetDiv}
  ${cells}
  ${planetStrip}
</svg>`;
}

// ── 핸들러 ────────────────────────────────────────────────────
module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { turn, time, loc, date, day } = req.query;

  try {
    const svg = buildSVG({ turn, time, loc, date, day });
    const png = await sharp(Buffer.from(svg), { density: 150 })
      .resize(W, H)
      .png()
      .toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(png);
  } catch (err) {
    // SVG 폴백
    const svg = buildSVG({ turn, time, loc, date, day });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(svg);
  }
};
