// HUD — 1080×120 (9:1) — PNG or animated GIF via @resvg/resvg-js + sharp
const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');
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

const W         = 1080;
const H         = 120;
const MIN_COL_W = 90;
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
  const scale = W / total;
  const widths = raw.map(w => Math.round(w * scale));
  widths[widths.length - 1] += W - widths.reduce((a, b) => a + b, 0);
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

// ── 시계 (TIME) — 원 + 시침/분침 ────────────────────────────
function drawClock(cx, cy, col) {
  return `<circle cx="${cx}" cy="${cy}" r="9" fill="none" stroke="${col}" stroke-width="1.5"/>
  <line x1="${cx}" y1="${cy}" x2="${cx-4}" y2="${cy-4}" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="${cx}" y1="${cy}" x2="${cx}"   y2="${cy-7}" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>`;
}

// ── 위치 마커 (LOCATION) — 물방울 path + 내부 점 ────────────
function drawPin(cx, cy, col) {
  return `<path d="M ${cx-7},${cy-3} A 7 7 0 1 1 ${cx+7},${cy-3} L ${cx},${cy+10} Z"
    fill="none" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/>
  <circle cx="${cx}" cy="${cy-4}" r="2.5" fill="${col}" opacity="0.7"/>`;
}

// ── 달력 (DATE) — 사각형 + 헤더선 + 클립 2개 ───────────────
function drawCalendar(cx, cy, col) {
  return `<rect x="${cx-8}" y="${cy-6}" width="16" height="15" rx="1.5" fill="none" stroke="${col}" stroke-width="1.5"/>
  <line x1="${cx-8}" y1="${cy-1}" x2="${cx+8}" y2="${cy-1}" stroke="${col}" stroke-width="1"/>
  <line x1="${cx-3}" y1="${cy-9}" x2="${cx-3}" y2="${cy-4}" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="${cx+3}" y1="${cy-9}" x2="${cx+3}" y2="${cy-4}" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>`;
}

// ── 깃발 (DAY) — 폴대 + 삼각 기 ────────────────────────────
function drawFlag(cx, cy, col) {
  return `<line x1="${cx-4}" y1="${cy-11}" x2="${cx-4}" y2="${cy+10}" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M ${cx-4},${cy-11} L ${cx+9},${cy-5} L ${cx-4},${cy+1} Z"
    fill="${col}" opacity="0.5" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/>`;
}

// ── 토성 (PLANET 레이블) — 원 + 링 ─────────────────────────
function drawPlanetLabel(cx, cy, col) {
  return `<circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="${col}" stroke-width="1.5"/>
  <ellipse cx="${cx}" cy="${cy}" rx="11" ry="4" fill="none" stroke="${col}" stroke-width="1.5" transform="rotate(-20 ${cx} ${cy})"/>`;
}

function drawIcon(name, cx, cy, col) {
  switch (name) {
    case 'hourglass': return drawHourglass(cx, cy, col);
    case 'clock':     return drawClock(cx, cy, col);
    case 'pin':       return drawPin(cx, cy, col);
    case 'calendar':  return drawCalendar(cx, cy, col);
    case 'flag':      return drawFlag(cx, cy, col);
    case 'planet':    return drawPlanetLabel(cx, cy, col);
    default: return '';
  }
}

// ── 행성 일러스트 ─────────────────────────────────────────────
function drawPlanet(pl, cx, cy, pcol) {
  const r = 16;
  switch (pl) {
    case 1: { // 온메르타 — 톱니바퀴 (스팀펑크)
      const n = 8, tw = 0.22, r2 = r + 7;
      const teeth = Array.from({ length: n }, (_, i) => {
        const a = i * 2 * Math.PI / n;
        const ax = (cx + Math.cos(a-tw)*r).toFixed(1),  ay = (cy + Math.sin(a-tw)*r).toFixed(1);
        const bx = (cx + Math.cos(a-tw)*r2).toFixed(1), by = (cy + Math.sin(a-tw)*r2).toFixed(1);
        const cx2= (cx + Math.cos(a+tw)*r2).toFixed(1), cy2= (cy + Math.sin(a+tw)*r2).toFixed(1);
        const dx = (cx + Math.cos(a+tw)*r).toFixed(1),  dy = (cy + Math.sin(a+tw)*r).toFixed(1);
        return `<path d="M ${ax},${ay} L ${bx},${by} L ${cx2},${cy2} L ${dx},${dy} Z" fill="${pcol}" opacity="0.5"/>`;
      }).join('');
      return `${teeth}
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${pcol}" opacity="0.12" stroke="${pcol}" stroke-width="1.5"/>
  <circle cx="${cx}" cy="${cy}" r="5" fill="none" stroke="${pcol}" stroke-width="1.5"/>`;
    }
    case 2: { // 타르미오스 — 육각형 + 크로스헤어 (사이버틱)
      const hexPts = Array.from({ length: 6 }, (_, i) => {
        const a = i * Math.PI / 3 - Math.PI / 6;
        return `${(cx + Math.cos(a)*r).toFixed(1)},${(cy + Math.sin(a)*r).toFixed(1)}`;
      }).join(' ');
      return `<polygon points="${hexPts}" fill="${pcol}" opacity="0.12" stroke="${pcol}" stroke-width="1.5"/>
  <line x1="${cx-r+2}" y1="${cy}" x2="${cx+r-2}" y2="${cy}" stroke="${pcol}" stroke-width="1" opacity="0.7"/>
  <line x1="${cx}" y1="${cy-r+2}" x2="${cx}" y2="${cy+r-2}" stroke="${pcol}" stroke-width="1" opacity="0.7"/>
  <circle cx="${cx}" cy="${cy}" r="3" fill="${pcol}" opacity="0.9"/>`;
    }
    case 3: { // 마프히트 — 방패 (중세 유럽)
      const sw = 14, top = cy - 12, mid = cy + 2, tip = cy + 18;
      return `<path d="M ${cx-sw},${top} L ${cx+sw},${top} L ${cx+sw},${mid} L ${cx},${tip} L ${cx-sw},${mid} Z"
    fill="${pcol}" opacity="0.15" stroke="${pcol}" stroke-width="1.5"/>
  <line x1="${cx}" y1="${top}" x2="${cx}" y2="${tip}" stroke="${pcol}" stroke-width="0.8" opacity="0.5"/>
  <line x1="${cx-sw}" y1="${mid-4}" x2="${cx+sw}" y2="${mid-4}" stroke="${pcol}" stroke-width="0.8" opacity="0.5"/>`;
    }
    case 4: { // 미아크 — 잎사귀 (자연)
      const lh = r + 3;
      return `<path d="M ${cx},${cy+lh} Q ${cx-r-4},${cy} ${cx},${cy-lh} Q ${cx+r+4},${cy} ${cx},${cy+lh} Z"
    fill="${pcol}" opacity="0.2" stroke="${pcol}" stroke-width="1.5"/>
  <line x1="${cx}" y1="${cy-lh}" x2="${cx}" y2="${cy+lh}" stroke="${pcol}" stroke-width="1" opacity="0.55"/>
  <line x1="${cx}" y1="${cy+2}" x2="${cx-8}" y2="${cy-5}" stroke="${pcol}" stroke-width="0.8" opacity="0.5"/>
  <line x1="${cx}" y1="${cy-4}" x2="${cx+8}" y2="${cy-11}" stroke="${pcol}" stroke-width="0.8" opacity="0.5"/>`;
    }
    case 5: { // 프레이라 — 황혼 (수평선 + 반원 + 별)
      const hY = cy + 6;
      return `<path d="M ${cx-r},${hY} A ${r} ${r} 0 0 1 ${cx+r},${hY} Z"
    fill="${pcol}" opacity="0.15" stroke="${pcol}" stroke-width="1.5"/>
  <line x1="${cx-r-5}" y1="${hY}" x2="${cx+r+5}" y2="${hY}" stroke="${pcol}" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="${cx-10}" cy="${cy-9}"  r="1"   fill="${pcol}" opacity="0.85"/>
  <circle cx="${cx+9}"  cy="${cy-12}" r="1.2" fill="${pcol}" opacity="0.9"/>
  <circle cx="${cx+15}" cy="${cy-4}"  r="0.8" fill="${pcol}" opacity="0.7"/>
  <circle cx="${cx-3}"  cy="${cy-16}" r="0.9" fill="${pcol}" opacity="0.8"/>`;
    }
    default: return '';
  }
}

function buildSVG({ turn, hour, min, loc, date, day, transparent = false }) {
  const pl     = dayToPlanet(day);
  const planet = PLANET_INFO[pl];
  const pcol   = planet.color;

  const h       = hour !== undefined ? String(parseInt(hour) || 0).padStart(2, '0') : '--';
  const m       = min  !== undefined ? String(parseInt(min)  || 0).padStart(2, '0') : '--';
  const timeVal = `${h};${m}`;
  const dayVal  = day ? `${parseInt(day)}일차` : '—';

  const fields = [
    { value: String(turn || '—'), icon: 'hourglass' },
    { value: String(date || '—'), icon: 'calendar'   },
    { value: timeVal,              icon: 'clock'     },
    { value: String(loc  || '—'), icon: 'pin'        },
    { value: dayVal,               icon: 'flag'      },
  ];

  const cols = calcColumns(fields);

  // ── 배경 원 6개 (랜덤, 프레임 가장자리에서 일부만 노출) ───────
  // resvg: filter가 걸린 그룹은 중심이 viewBox 내에 있어야 panic 없음.
  // 전략: 중심은 (0~W, 0~H) 안에 두고 반지름으로 프레임 밖으로 삐져나오게 함.
  const circleStrokes = Array.from({ length: 6 }, () => {
    const edge = Math.floor(Math.random() * 4);        // 0좌 1우 2상 3하
    let cx, cy, r;
    if (edge === 0) {           // 왼쪽 가장자리
      cx = Math.random() * W * 0.06;
      cy = Math.random() * H;
      r  = cx + 80 + Math.random() * 120;
    } else if (edge === 1) {    // 오른쪽 가장자리
      cx = W - Math.random() * W * 0.06;
      cy = Math.random() * H;
      r  = (W - cx) + 80 + Math.random() * 120;
    } else if (edge === 2) {    // 위쪽 가장자리
      cx = Math.random() * W;
      cy = Math.random() * H * 0.25;
      r  = cy + 80 + Math.random() * 100;
    } else {                    // 아래쪽 가장자리
      cx = Math.random() * W;
      cy = H - Math.random() * H * 0.25;
      r  = (H - cy) + 80 + Math.random() * 100;
    }
    const sw = (0.7 + Math.random() * 1.1).toFixed(1);
    const op = (0.15 + Math.random() * 0.20).toFixed(2);
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${pcol}" stroke-width="${sw}" opacity="${op}"/>`;
  }).join('\n    ');

  // ── 구분선 ───────────────────────────────────────────────────
  let bx = 0;
  const dividers = cols.slice(0, -1).map(({ w }) => {
    bx += w;
    return `<line x1="${bx}" y1="14" x2="${bx}" y2="${H - 14}" stroke="${pcol}" stroke-width="0.6" opacity="0.28"/>`;
  }).join('\n  ');

  // ── 컬럼 텍스트 ──────────────────────────────────────────────
  const cells = fields.map((f, i) => {
    const { cx, maxTextW } = cols[i];
    const val   = e(f.value);
    const estPx = estimateW(f.value, V_SZ);
    const tl    = estPx > maxTextW
      ? `textLength="${Math.round(maxTextW)}" lengthAdjust="spacingAndGlyphs"`
      : '';

    const labelEl = drawIcon(f.icon, cx, 26, pcol);

    return `
  ${labelEl}
  <text x="${cx}" y="${VALUE_Y}" text-anchor="middle"
    font-family="${FONT}" font-size="${V_SZ}" font-weight="bold"
    fill="${pcol}" opacity="0.75" filter="url(#glow)" ${tl}>${val}</text>
  <text x="${cx}" y="${VALUE_Y}" text-anchor="middle"
    font-family="${FONT}" font-size="${V_SZ}" font-weight="bold"
    fill="#f4f0ea" ${tl}>${val}</text>`;
  }).join('');

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
  ${transparent ? '' : `<rect width="${W}" height="${H}" fill="#0a0a12"/>`}
  <!-- L/R 엣지 앰비언트 글로우 (고정) -->
  <rect x="-10" y="-10" width="220" height="${H + 20}" fill="${pcol}" opacity="0.13" filter="url(#edgeglow)"/>
  <rect x="${W - 210}" y="-10" width="220" height="${H + 20}" fill="${pcol}" opacity="0.13" filter="url(#edgeglow)"/>
  <!-- 배경 원 (stroke only, 필터 없음 — 가장자리 걸친 원에 blur 적용시 resvg panic) -->
  <g>
    ${circleStrokes}
  </g>
  <!-- 상하 강조선 -->
  ${accent}
  <!-- 구분선 -->
  ${dividers}
  <!-- 컬럼 텍스트 -->
  ${cells}
</svg>`;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { turn, hour, min, loc, date, day, bg } = req.query;

  try {
    ensureFont();

    if (bg) {
      // ── GIF 합성 모드 ──────────────────────────────────────────
      // HUD를 투명 배경 PNG로 렌더
      const svg    = buildSVG({ turn, hour, min, loc, date, day, transparent: true });
      const resvg  = new Resvg(svg, {
        font: { fontFiles: [FONT_PATH], loadSystemFonts: false },
        fitTo: { mode: 'width', value: W },
      });
      const hudPng = Buffer.from(resvg.render().asPng());

      // 배경 GIF 가져오기
      const bgRes = await fetch(bg);
      if (!bgRes.ok) throw new Error(`bg fetch failed: ${bgRes.status}`);
      const gifBuf = Buffer.from(await bgRes.arrayBuffer());

      // 모든 프레임에 HUD 오버레이 합성 → animated GIF 출력
      const outGif = await sharp(gifBuf, { animated: true })
        .resize(W, H, { fit: 'cover', position: 'centre' })
        .composite([{ input: hudPng, tile: true, blend: 'over' }])
        .gif({ loop: 0 })
        .toBuffer();

      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Content-Disposition', 'inline; filename="hud.gif"');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(outGif);
    }

    // ── 기본 PNG 모드 ──────────────────────────────────────────
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
