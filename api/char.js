// Char — 900×600 (3:2)
const { setCors } = require('../lib/validate');
const { MAIN_CHARS, CHAR_INFO, VALID_CG } = require('../lib/constants');

const W = 900;
const H = 600;

function e(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCGScene(chr, cgId) {
  const info = CHAR_INFO[chr] || { name: chr, color: '#ffffff' };
  const col  = info.color;
  const src  = `/images/cg/${chr}_${cgId}.png`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#000000"/>
  <image href="${src}" x="0" y="0" width="${W}" height="${H}"
    preserveAspectRatio="xMidYMid slice"/>
  <!-- CG 뱃지 -->
  <rect x="${W - 110}" y="${H - 46}" width="96" height="30" rx="4"
    fill="#00000088"/>
  <text x="${W - 62}" y="${H - 25}" text-anchor="middle"
    font-family="'Courier New',monospace" font-size="11"
    fill="${col}" letter-spacing="2">CG ${e(cgId)}</text>
</svg>`;
}

function buildNormalScene(chr, face, outfit, bg) {
  const info = CHAR_INFO[chr] || { name: chr, color: '#ffffff' };
  const col  = info.color;

  const bgSrc   = bg   ? `/images/bg/${bg}.png`                   : null;
  const faceSrc = face ? `/images/face/${chr}_${outfit || 'default'}_${face}.png` : null;

  const bgLayer   = bgSrc
    ? `<image href="${bgSrc}" x="0" y="0" width="${W}" height="${H}"
        preserveAspectRatio="xMidYMid slice"/>`
    : `<rect width="${W}" height="${H}" fill="#1a1a2e"/>`;

  // 캐릭터 이미지: 하단 정렬, 높이 H*0.9
  const charH = Math.round(H * 0.9);
  const charY = H - charH;
  const charX = Math.round((W - charH * 0.6) / 2); // 3:5 종횡비 가정
  const charW = Math.round(charH * 0.6);

  const charLayer = faceSrc
    ? `<image href="${faceSrc}" x="${charX}" y="${charY}"
        width="${charW}" height="${charH}"
        preserveAspectRatio="xMidYMax meet"/>`
    : `<!-- no face image -->`;

  // 하단 캐릭터 정보 바
  const infoBar = `
    <rect x="0" y="${H - 44}" width="${W}" height="44" fill="#00000066"/>
    <text x="24" y="${H - 18}" font-family="'Courier New',monospace"
      font-size="16" font-weight="bold" fill="${col}">${e(info.name)}</text>
    ${outfit && outfit !== 'NONE'
      ? `<text x="24" y="${H - 4}" font-family="'Courier New',monospace"
          font-size="10" fill="${col}88" letter-spacing="2">${e(outfit.toUpperCase())}</text>`
      : ''}
    ${bg ? `<text x="${W - 24}" y="${H - 18}" text-anchor="end"
      font-family="'Courier New',monospace" font-size="11"
      fill="#ffffff88">${e(bg)}</text>` : ''}
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${bgLayer}
  ${charLayer}
  ${infoBar}
</svg>`;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { chr, face, outfit, bg, cg } = req.query;

  const isCG = cg && cg !== 'NONE' && VALID_CG.includes(cg);
  const svg  = isCG
    ? buildCGScene(chr, cg)
    : buildNormalScene(chr, face, outfit, bg);

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(svg);
};
