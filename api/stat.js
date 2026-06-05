// Stat — 900px wide, 동적 높이
const { setCors } = require('../lib/validate');
const { ALL_CHARS, CHAR_INFO, FACTION_INFO, FACTION_ORDER, clamp } = require('../lib/constants');

const W    = 900;
const BARX = 220;
const BARW = 560;
const BARH = 10;

function e(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildStat(stats) {
  const SECT_H = 26;
  const ROW_H  = 52;
  const GAP    = 10;
  let curY = 80;
  let rows = '';

  for (const fkey of FACTION_ORDER) {
    const fac  = FACTION_INFO[fkey];
    const fcol = fac.color;

    rows += `
      <text x="30" y="${curY + 15}" font-family="'Courier New',monospace"
        font-size="10" fill="${fcol}88" letter-spacing="3">${e(fac.name)}</text>
      <line x1="30" y1="${curY + 20}" x2="${W - 30}" y2="${curY + 20}"
        stroke="${fcol}33" stroke-width="1"/>
    `;
    curY += SECT_H;

    for (const ckey of fac.members) {
      const s     = stats[ckey];
      const info  = CHAR_INFO[ckey];
      const col   = info.color;
      const pct   = Math.min(100, Math.max(0, s.af));
      const fillW = Math.round(BARW * pct / 100);

      rows += `
        <text x="30" y="${curY + 14}" font-family="'Courier New',monospace"
          font-size="13" font-weight="bold" fill="${col}">${e(info.name)}</text>
        <rect x="${BARX}" y="${curY + 4}" width="${BARW}" height="${BARH}"
          rx="5" fill="${col}18" stroke="${col}22" stroke-width="1"/>
        ${fillW > 0 ? `<rect x="${BARX}" y="${curY + 4}" width="${fillW}" height="${BARH}"
          rx="5" fill="${col}cc"/>` : ''}
        <text x="${BARX + BARW + 14}" y="${curY + 14}" text-anchor="start"
          font-family="'Courier New',monospace" font-size="14" font-weight="bold"
          fill="${col}">${pct}</text>
      `;
      curY += ROW_H;
    }
    curY += GAP;
  }

  const H = curY + 40;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0d0d14"/>
  <rect x="1" y="1" width="${W-2}" height="${H-2}"
    fill="none" stroke="#ffffff1a" stroke-width="1" rx="4"/>
  <rect x="0" y="0" width="${W}" height="3" fill="#c8c8ff"/>
  <text x="30" y="44" font-family="'Courier New',monospace" font-size="11"
    fill="#ffffff55" letter-spacing="3">AFFECTION STATUS</text>
  <line x1="30" y1="56" x2="${W-30}" y2="56" stroke="#ffffff18" stroke-width="1"/>
  ${rows}
</svg>`;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = req.query;
  const stats = {};
  ALL_CHARS.forEach(c => {
    stats[c] = { af: clamp(q[`${c}_af`], 0, 100) };
  });

  const svg = buildStat(stats);
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(svg);
};
