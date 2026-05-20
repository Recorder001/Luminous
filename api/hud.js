// HUD — 1080×120 (9:1)
const { setCors } = require('../lib/validate');
const { dayToPlanet, PLANET_INFO } = require('../lib/constants');

const W = 1080;
const H = 120;

function e(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHUD({ turn, time, loc, date, day }) {
  const pl     = dayToPlanet(day);
  const planet = PLANET_INFO[pl];
  const pcol   = planet.color;

  // ── SVG defs ──────────────────────────────────────────────
  const defs = `
  <defs>
    <clipPath id="hc"><rect width="${W}" height="${H}"/></clipPath>

    <!-- 텍스트 글로우 (약) -->
    <filter id="glow-s" x="-40%" y="-80%" width="180%" height="260%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <!-- 텍스트 글로우 (강) -->
    <filter id="glow-m" x="-40%" y="-80%" width="180%" height="260%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b1"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b2"/>
      <feMerge>
        <feMergeNode in="b1"/>
        <feMergeNode in="b2"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- 상단 라인 글로우 -->
    <filter id="glow-line" x="0%" y="-200%" width="100%" height="500%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;

  // ── 배경 원 장식 ────────────────────────────────────────────
  // 크롭된 큰 원들 — 테두리선 레이어 + 아주 옅은 채움 레이어
  const circles = `
  <g clip-path="url(#hc)">
    <!-- 채움 (매우 투명) -->
    <circle cx="-20"  cy="60"   r="170" fill="${pcol}" opacity="0.04"/>
    <circle cx="1100" cy="60"   r="170" fill="${pcol}" opacity="0.04"/>
    <circle cx="540"  cy="190"  r="200" fill="${pcol}" opacity="0.025"/>

    <!-- 테두리 원 -->
    <circle cx="-20"  cy="60"   r="170" fill="none" stroke="${pcol}" stroke-width="1"   opacity="0.18"/>
    <circle cx="-20"  cy="60"   r="130" fill="none" stroke="${pcol}" stroke-width="0.6" opacity="0.10"/>
    <circle cx="270"  cy="-55"  r="150" fill="none" stroke="${pcol}" stroke-width="0.8" opacity="0.10"/>
    <circle cx="540"  cy="190"  r="210" fill="none" stroke="${pcol}" stroke-width="1"   opacity="0.09"/>
    <circle cx="820"  cy="-60"  r="160" fill="none" stroke="${pcol}" stroke-width="0.8" opacity="0.10"/>
    <circle cx="1100" cy="60"   r="170" fill="none" stroke="${pcol}" stroke-width="1"   opacity="0.18"/>
    <circle cx="1100" cy="60"   r="130" fill="none" stroke="${pcol}" stroke-width="0.6" opacity="0.10"/>
  </g>`;

  // ── 구분선 ──────────────────────────────────────────────────
  // TURN | TIME | LOCATION | DATE | DAY | (planet strip)
  const divXs = [175, 355, 650, 835, 980];
  const dividers = divXs.map(x =>
    `<line x1="${x}" y1="16" x2="${x}" y2="${H - 16}"
       stroke="${pcol}" stroke-width="0.6" opacity="0.25"/>`
  ).join('');

  // ── 컬럼 데이터 ────────────────────────────────────────────
  // 각 컬럼: label y=18, value y=93 (64px 폰트 기준 꽉 찬 높이)
  const FONT   = "'Nanum Myeongjo','Batang','AppleMyungjo','Georgia','Times New Roman',serif";
  const LABEL_Y  = 17;
  const VALUE_Y  = 94;
  const VALUE_SZ = 64;  // 꽉 차는 크기

  // 컬럼별 x 중심, textLength(긴 텍스트 압축용)
  const cols = [
    { label: 'TURN',     value: turn || '—', x: 88,  tl: 120 },
    { label: 'TIME',     value: time || '—', x: 265, tl: 150 },
    { label: 'LOCATION', value: loc  || '—', x: 502, tl: 270 },
    { label: 'DATE',     value: date || '—', x: 742, tl: 170 },
    { label: 'DAY',      value: day  || '—', x: 907, tl: 130 },
  ];

  const cells = cols.map(c => {
    const valStr = e(c.value);
    // 긴 텍스트는 textLength로 압축
    const tl = String(c.value).length > 8 ? `textLength="${c.tl}" lengthAdjust="spacingAndGlyphs"` : '';
    return `
    <text x="${c.x}" y="${LABEL_Y}" text-anchor="middle"
      font-family="${FONT}" font-size="9" fill="${pcol}" opacity="0.65"
      letter-spacing="3">${c.label}</text>
    <text x="${c.x}" y="${VALUE_Y}" text-anchor="middle"
      font-family="${FONT}" font-size="${VALUE_SZ}" font-weight="bold"
      fill="#f4f0ea" filter="url(#glow-s)" ${tl}>${valStr}</text>`;
  }).join('');

  // ── 우측 행성 스트립 ────────────────────────────────────────
  const planet = `
    <text x="1030" y="${LABEL_Y}" text-anchor="middle"
      font-family="${FONT}" font-size="9" fill="${pcol}" opacity="0.65"
      letter-spacing="3">PLANET</text>
    <text x="1030" y="${VALUE_Y}" text-anchor="middle"
      font-family="${FONT}" font-size="26" font-weight="bold"
      fill="${pcol}" filter="url(#glow-m)">${e(PLANET_INFO[pl].name)}</text>`;

  // ── 상하 강조선 ─────────────────────────────────────────────
  const lines = `
    <rect x="0" y="0" width="${W}" height="2.5" fill="${pcol}" filter="url(#glow-line)"/>
    <rect x="0" y="${H - 1.5}" width="${W}" height="1.5" fill="${pcol}" opacity="0.3"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs}
  <rect width="${W}" height="${H}" fill="#0a0a12"/>
  ${circles}
  ${lines}
  ${dividers}
  ${cells}
  ${planet}
</svg>`;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { turn, time, loc, date, day } = req.query;
  const svg = buildHUD({ turn, time, loc, date, day });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(svg);
};
