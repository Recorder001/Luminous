// HUD — 1080×120 (9:1)
const { setCors } = require('../lib/validate');
const { dayToPlanet, PLANET_INFO } = require('../lib/constants');

const W = 1080;
const H = 120;

function buildHUD({ turn, time, loc, date, day }) {
  const pl     = dayToPlanet(day);
  const planet = PLANET_INFO[pl];
  const pcol   = planet.color;

  // 세로 중앙선
  const cy = H / 2;

  // 구분선 위치 (5등분이 아닌 비중 조절)
  // Turn | Time | Location | Date | Day + Planet
  const cols = [
    { label: 'TURN',     value: turn  || '—', x: 90  },
    { label: 'TIME',     value: time  || '—', x: 270 },
    { label: 'LOCATION', value: loc   || '—', x: 540 },
    { label: 'DATE',     value: date  || '—', x: 780 },
    { label: 'DAY',      value: `Day ${day || '—'}`, x: 960 },
  ];

  const dividers = [180, 360, 720, 864].map(x =>
    `<line x1="${x}" y1="20" x2="${x}" y2="${H - 20}" stroke="#ffffff20" stroke-width="1"/>`
  ).join('');

  const cells = cols.map(c => `
    <text x="${c.x}" y="${cy - 14}" text-anchor="middle"
      font-family="'Courier New',monospace" font-size="11"
      fill="${pcol}99" letter-spacing="2">${c.label}</text>
    <text x="${c.x}" y="${cy + 10}" text-anchor="middle"
      font-family="'Courier New',monospace" font-size="17" font-weight="bold"
      fill="#f0ece4">${e(c.value)}</text>
  `).join('');

  // 행성 배지 (우측 끝)
  const badge = `
    <rect x="${W - 185}" y="30" width="160" height="60" rx="6"
      fill="${pcol}22" stroke="${pcol}66" stroke-width="1"/>
    <text x="${W - 105}" y="${cy - 10}" text-anchor="middle"
      font-family="'Courier New',monospace" font-size="10"
      fill="${pcol}99" letter-spacing="2">PLANET</text>
    <text x="${W - 105}" y="${cy + 14}" text-anchor="middle"
      font-family="'Courier New',monospace" font-size="16" font-weight="bold"
      fill="${pcol}">${planet.name}</text>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0d0d14"/>
  <rect x="0" y="0" width="${W}" height="2" fill="${pcol}"/>
  <rect x="0" y="${H - 2}" width="${W}" height="2" fill="${pcol}22"/>
  ${dividers}
  ${cells}
  ${badge}
</svg>`;
}

function e(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
