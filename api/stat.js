// Stat — 900×600 (3:2)
const { setCors } = require('../lib/validate');
const { MAIN_CHARS, CHAR_INFO, clamp } = require('../lib/constants');

const W    = 900;
const H    = 600;
const BARX = 220;
const BARW = 580;
const BARH = 12;

function e(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStat(stats) {
  const rowH   = 86;
  const startY = 110;

  const rows = stats.map((s, i) => {
    const info  = CHAR_INFO[s.char];
    const col   = info.color;
    const y     = startY + i * rowH;
    const pct   = Math.min(100, Math.max(0, s.af));
    const fillW = Math.round(BARW * pct / 100);
    const mind  = s.m ? String(s.m).slice(0, 32) : '···';

    return `
      <text x="30" y="${y + 8}" font-family="'Courier New','Nanum Myeongjo','Batang',monospace"
        font-size="13" fill="${col}99" letter-spacing="2">${s.char.toUpperCase()}</text>
      <text x="30" y="${y + 28}" font-family="'Courier New','Nanum Myeongjo','Batang',monospace"
        font-size="18" font-weight="bold" fill="${col}">${e(info.name)}</text>
      <rect x="${BARX}" y="${y}" width="${BARW}" height="${BARH}"
        rx="6" fill="${col}18" stroke="${col}33" stroke-width="1"/>
      ${fillW > 0 ? `<rect x="${BARX}" y="${y}" width="${fillW}" height="${BARH}"
        rx="6" fill="${col}cc"/>` : ''}
      <text x="${BARX + BARW + 14}" y="${y + 10}" text-anchor="start"
        font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="15" font-weight="bold"
        fill="${col}">${pct}</text>
      <text x="${BARX}" y="${y + 34}" font-family="'Courier New','Nanum Myeongjo','Batang',monospace"
        font-size="12" fill="${col}88">${e(mind)}</text>
      ${i < stats.length - 1 ? `<line x1="30" y1="${y + rowH - 8}"
        x2="${W - 30}" y2="${y + rowH - 8}"
        stroke="#ffffff0d" stroke-width="1"/>` : ''}
    `;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0d0d14"/>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}"
    fill="none" stroke="#ffffff1a" stroke-width="1" rx="4"/>
  <rect x="0" y="0" width="${W}" height="3" fill="#a574d4"/>
  <text x="30" y="44" font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="11"
    fill="#ffffff55" letter-spacing="3">AFFECTION STATUS</text>
  <line x1="30" y1="58" x2="${W - 30}" y2="58"
    stroke="#ffffff18" stroke-width="1"/>
  <text x="${BARX}" y="80" font-family="'Courier New','Nanum Myeongjo','Batang',monospace"
    font-size="10" fill="#ffffff33" letter-spacing="2">0</text>
  <text x="${BARX + BARW / 2}" y="80" text-anchor="middle"
    font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="10"
    fill="#ffffff33" letter-spacing="2">50</text>
  <text x="${BARX + BARW}" y="80" text-anchor="end"
    font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="10"
    fill="#ffffff33" letter-spacing="2">100</text>
  ${rows}
</svg>`;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q     = req.query;
  const stats = MAIN_CHARS.map(c => ({
    char: c,
    af:   clamp(q[`${c}_af`], 0, 100),
    m:    q[`${c}_m`] || '···',
  }));

  const svg = buildStat(stats);

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(svg);
};
