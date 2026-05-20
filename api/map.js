// Map — 900×600 (3:2)
const { setCors } = require('../lib/validate');
const { dayToPlanet, PLANET_INFO } = require('../lib/constants');

const W = 900;
const H = 600;

// 행성별 5개 장소 이름
const PLANET_LOCS = {
  1: ['Sunrise Gate',  'Solar Spire',    'Ember Fields',  'Corona Bay',    'Radiance Peak'],
  2: ['Frost Hollow',  'Ice Cathedral',  'Crystal Lake',  'Blizzard Pass', 'Glacial Vault'],
  3: ['Mossy Archway', 'Verdant Canopy', 'Root Nexus',    'Bloom Basin',   'Ancient Grove'],
  4: ['Shadow Market', 'Veil Crossing',  'Obsidian Court','Dark Sanctum',  'Umbra Rift'],
  5: ['Storm Cradle',  'Aether Bridge',  'Tempest Spire', 'Wind Altar',    'Cloud Citadel'],
};

// 5개 장소 원형 배치 좌표 (중앙 기준)
const LOC_POSITIONS = [
  { x: 450, y: 160 },  // 상
  { x: 700, y: 290 },  // 우상
  { x: 620, y: 490 },  // 우하
  { x: 280, y: 490 },  // 좌하
  { x: 200, y: 290 },  // 좌상
];

function e(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildMap({ day, loc }) {
  const pl     = dayToPlanet(day);
  const planet = PLANET_INFO[pl];
  const pcol   = planet.color;
  const locs   = PLANET_LOCS[pl];

  // day in planet: 1~5
  const dayInPlanet = ((parseInt(day) - 1) % 5) + 1;
  const activeLoc   = locs[dayInPlanet - 1];

  // 경로선 (오각형 꼭지점 연결)
  const pathD = LOC_POSITIONS.map((p, i) =>
    i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
  ).join(' ') + ' Z';

  const locNodes = locs.map((name, i) => {
    const pos     = LOC_POSITIONS[i];
    const isVisited = i < dayInPlanet - 1;
    const isCurrent = name === activeLoc;
    const dimmed  = !isVisited && !isCurrent;

    const circleFill   = isCurrent ? pcol : isVisited ? `${pcol}88` : '#1a1a2e';
    const circleStroke = isCurrent ? '#ffffff' : isVisited ? `${pcol}88` : `${pcol}44`;
    const circleR      = isCurrent ? 18 : 12;
    const textFill     = dimmed ? '#ffffff44' : isCurrent ? '#ffffff' : `${pcol}cc`;
    const textSize     = isCurrent ? 13 : 11;
    const textWeight   = isCurrent ? 'bold' : 'normal';

    // 라벨 위치 조정
    const labelOffset = pos.y < 300 ? -28 : 28;
    const labelAnchor = pos.x < 300 ? 'start' : pos.x > 600 ? 'end' : 'middle';

    return `
      <circle cx="${pos.x}" cy="${pos.y}" r="${circleR}"
        fill="${circleFill}" stroke="${circleStroke}" stroke-width="2"/>
      ${isCurrent ? `<circle cx="${pos.x}" cy="${pos.y}" r="${circleR + 6}"
        fill="none" stroke="${pcol}" stroke-width="1" opacity="0.5"/>` : ''}
      <text x="${pos.x}" y="${pos.y + labelOffset}"
        text-anchor="${labelAnchor}"
        font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="${textSize}"
        font-weight="${textWeight}" fill="${textFill}">${e(name)}</text>
    `;
  }).join('');

  // 행성 허브 중앙 장식
  const hub = `
    <circle cx="${W / 2}" cy="${H / 2}" r="40"
      fill="${pcol}11" stroke="${pcol}33" stroke-width="1"/>
    <circle cx="${W / 2}" cy="${H / 2}" r="25"
      fill="${pcol}18" stroke="${pcol}55" stroke-width="1"/>
    <text x="${W / 2}" y="${H / 2 - 6}" text-anchor="middle"
      font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="10"
      fill="${pcol}aa" letter-spacing="2">PLANET</text>
    <text x="${W / 2}" y="${H / 2 + 10}" text-anchor="middle"
      font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="14" font-weight="bold"
      fill="${pcol}">${e(planet.name)}</text>
  `;

  // 헤더
  const header = `
    <text x="30" y="42" font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="11"
      fill="${pcol}88" letter-spacing="3">NAVIGATION MAP</text>
    <text x="30" y="64" font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="20"
      font-weight="bold" fill="#f0ece4">${e(loc || activeLoc)}</text>
    <text x="${W - 30}" y="42" text-anchor="end"
      font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="11"
      fill="${pcol}88" letter-spacing="2">DAY ${parseInt(day) || '—'}</text>
    <text x="${W - 30}" y="64" text-anchor="end"
      font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="14"
      fill="${pcol}">${dayInPlanet} / 5</text>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0d0d14"/>
  <!-- 배경 그리드 -->
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${pcol}0a" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>

  <!-- 테두리 -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}"
    fill="none" stroke="${pcol}44" stroke-width="1" rx="4"/>
  <rect x="0" y="0" width="${W}" height="3" fill="${pcol}"/>

  <!-- 헤더 구분선 -->
  <line x1="30" y1="78" x2="${W - 30}" y2="78"
    stroke="${pcol}33" stroke-width="1"/>

  ${header}

  <!-- 경로 -->
  <path d="${pathD}" fill="none" stroke="${pcol}22" stroke-width="1.5"
    stroke-dasharray="6 4"/>

  ${hub}
  ${locNodes}
</svg>`;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { day, loc } = req.query;
  const svg = buildMap({ day, loc });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(svg);
};
