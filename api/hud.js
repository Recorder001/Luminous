// HUD — 1080×120 (9:1) — PNG output via Sharp
const sharp = require('sharp');
const { setCors } = require('../lib/validate');
const { dayToPlanet, PLANET_INFO } = require('../lib/constants');

const W              = 1080;
const H              = 120;
const PLANET_STRIP_W = 108;   // 우측 행성 스트립 고정폭
const CONTENT_W      = W - PLANET_STRIP_W;
const MIN_COL_W      = 90;
const V_SZ           = 56;    // 값 폰트 크기
const L_SZ           = 9;     // 레이블 폰트 크기
const VALUE_Y        = 90;
const LABEL_Y        = 15;
const FONT           = "'Georgia','Times New Roman',serif";

function e(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── 글자 폭 추정 (비례 세리프 기준) ──────────────────────────
function charPx(ch, sz) {
  if (/[가-힯぀-鿿]/.test(ch)) return sz * 0.88; // 한글/CJK
  if (/[A-Z]/.test(ch))                         return sz * 0.68;
  if (/[a-z]/.test(ch))                         return sz * 0.52;
  if (/[0-9]/.test(ch))                         return sz * 0.56;
  if (ch === ' ')                                return sz * 0.30;
  return sz * 0.42;
}
function estimateW(str, sz) {
  return Array.from(String(str || '')).reduce((s, c) => s + charPx(c, sz), 0);
}

// ── SVG 생성 ─────────────────────────────────────────────────
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

  // ── 동적 컬럼 폭 계산 ──────────────────────────────────────
  const PAD      = 24; // 컬럼 양쪽 패딩
  const rawWidths = fields.map(f =>
    Math.max(MIN_COL_W, estimateW(f.value, V_SZ) + PAD)
  );
  const totalRaw = rawWidths.reduce((a, b) => a + b, 0);
  const scale    = CONTENT_W / totalRaw;
  const colWidths = rawWidths.map(w => Math.round(w * scale));

  // 반올림 오차 보정 (마지막 컬럼에 흡수)
  const sumW = colWidths.reduce((a, b) => a + b, 0);
  colWidths[colWidths.length - 1] += CONTENT_W - sumW;

  // 각 컬럼 중심 x
  let cx = 0;
  const positions = colWidths.map(w => {
    const center = cx + w / 2;
    cx += w;
    return { cx: center, maxW: w - PAD };
  });

  // 구분선 x (경계)
  let bx = 0;
  const divXs = colWidths.slice(0, -1).map(w => { bx += w; return bx; });

  // ── defs ────────────────────────────────────────────────────
  const defs = `<defs>
    <clipPath id="hc"><rect width="${W}" height="${H}"/></clipPath>
    <filter id="gs" x="-40%" y="-100%" width="180%" height="300%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="gm" x="-40%" y="-100%" width="180%" height="300%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b1"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b2"/>
      <feMerge>
        <feMergeNode in="b1"/>
        <feMergeNode in="b2"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="gl" x="0" y="-200%" width="100%" height="500%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;

  // ── 배경 원 장식 ─────────────────────────────────────────────
  const circles = `<g clip-path="url(#hc)">
    <circle cx="-18"  cy="60"  r="168" fill="${pcol}" opacity="0.04"/>
    <circle cx="${W + 18}" cy="60" r="168" fill="${pcol}" opacity="0.04"/>
    <circle cx="-18"  cy="60"  r="168" fill="none" stroke="${pcol}" stroke-width="1"   opacity="0.18"/>
    <circle cx="-18"  cy="60"  r="126" fill="none" stroke="${pcol}" stroke-width="0.6" opacity="0.10"/>
    <circle cx="285"  cy="-52" r="148" fill="none" stroke="${pcol}" stroke-width="0.7" opacity="0.10"/>
    <circle cx="540"  cy="192" r="210" fill="none" stroke="${pcol}" stroke-width="0.8" opacity="0.08"/>
    <circle cx="808"  cy="-58" r="155" fill="none" stroke="${pcol}" stroke-width="0.7" opacity="0.10"/>
    <circle cx="${W + 18}" cy="60" r="168" fill="none" stroke="${pcol}" stroke-width="1"   opacity="0.18"/>
    <circle cx="${W + 18}" cy="60" r="126" fill="none" stroke="${pcol}" stroke-width="0.6" opacity="0.10"/>
  </g>`;

  // ── 구분선 ───────────────────────────────────────────────────
  const dividers = divXs.map(x =>
    `<line x1="${x}" y1="16" x2="${x}" y2="${H - 16}"
       stroke="${pcol}" stroke-width="0.6" opacity="0.28"/>`
  ).join('\n  ');

  // 행성 스트립 왼쪽 경계
  const planetDivider = `<line x1="${CONTENT_W}" y1="12" x2="${CONTENT_W}" y2="${H - 12}"
    stroke="${pcol}" stroke-width="0.8" opacity="0.35"/>`;

  // ── 컬럼 텍스트 ──────────────────────────────────────────────
  const cells = fields.map((f, i) => {
    const { cx, maxW } = positions[i];
    const valStr = e(f.value);
    // 추정 폭이 컬럼보다 크면 textLength로 압축
    const estPx  = estimateW(f.value, V_SZ);
    const tlAttr = estPx > maxW
      ? `textLength="${Math.round(maxW)}" lengthAdjust="spacingAndGlyphs"`
      : '';
    return `
  <text x="${cx}" y="${LABEL_Y}" text-anchor="middle"
    font-family="${FONT}" font-size="${L_SZ}"
    fill="${pcol}" opacity="0.6" letter-spacing="3">${f.label}</text>
  <text x="${cx}" y="${VALUE_Y}" text-anchor="middle"
    font-family="${FONT}" font-size="${V_SZ}" font-weight="bold"
    fill="#f4f0ea" filter="url(#gs)" ${tlAttr}>${valStr}</text>`;
  }).join('');

  // ── 행성 스트립 ──────────────────────────────────────────────
  const pCx = CONTENT_W + PLANET_STRIP_W / 2;
  const planetStrip = `
  <text x="${pCx}" y="${LABEL_Y}" text-anchor="middle"
    font-family="${FONT}" font-size="${L_SZ}"
    fill="${pcol}" opacity="0.6" letter-spacing="3">PLANET</text>
  <text x="${pCx}" y="${VALUE_Y}" text-anchor="middle"
    font-family="${FONT}" font-size="24" font-weight="bold"
    fill="${pcol}" filter="url(#gm)">${e(planet.name)}</text>`;

  // ── 상하 강조선 ──────────────────────────────────────────────
  const accent = `
  <rect x="0" y="0" width="${W}" height="2.5" fill="${pcol}" filter="url(#gl)"/>
  <rect x="0" y="${H - 1.5}" width="${W}" height="1.5" fill="${pcol}" opacity="0.28"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs}
  <rect width="${W}" height="${H}" fill="#0a0a12"/>
  ${circles}
  ${accent}
  ${dividers}
  ${planetDivider}
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
    // Sharp 실패 시 SVG 폴백
    const svg = buildSVG({ turn, time, loc, date, day });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(svg);
  }
};
