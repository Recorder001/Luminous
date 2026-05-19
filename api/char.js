// Char — 900×600 (3:2) — PNG output via Sharp compositing
const sharp = require('sharp');
const { setCors } = require('../lib/validate');
const { CHAR_INFO, VALID_OUTFITS, VALID_CG } = require('../lib/constants');

const W = 900;
const H = 600;

// ── 파라미터 검증 ──────────────────────────────────────────

function safeChr(s) {
  return s && /^[a-zA-Z0-9]{1,10}$/.test(s) ? s : 'k';
}

function safeFace(s) {
  const n = parseInt(s);
  if (isNaN(n) || n < 1 || n > 25) return null;
  return String(n).padStart(2, '0');
}

function safeBg(s) {
  return s && /^[1-5]_0[1-5]$/.test(s) ? s : null;
}

function safeOutfit(s) {
  return VALID_OUTFITS.includes(s) ? s : 'default';
}

// ── HTTP로 정적 이미지 취득 (public/images/ → CDN) ────────

async function fetchBuf(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch {
    return null;
  }
}

// ── SVG 플레이스홀더 (이미지 없을 때) ─────────────────────

function e(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function placeholder(res, info, label) {
  const col = info.color;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0d0d14"/>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}"
    fill="none" stroke="${col}44" stroke-width="1" rx="4"/>
  <ellipse cx="${W / 2}" cy="${H * 0.38}" rx="56" ry="66"
    fill="${col}18" stroke="${col}55" stroke-width="2"/>
  <rect x="${W / 2 - 46}" y="${H * 0.38 + 58}" width="92" height="148" rx="18"
    fill="${col}18" stroke="${col}55" stroke-width="2"/>
  <text x="${W / 2}" y="${H * 0.82}" text-anchor="middle"
    font-family="'Courier New',monospace" font-size="20" font-weight="bold"
    fill="${col}">${e(info.name)}</text>
  <text x="${W / 2}" y="${H * 0.88}" text-anchor="middle"
    font-family="'Courier New',monospace" font-size="12"
    fill="${col}66">${e(label)}</text>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(svg);
}

// ── CG 풀스크린 렌더 ───────────────────────────────────────

async function renderCG(res, baseUrl, chr, cgId) {
  const info = CHAR_INFO[chr] || { name: chr, color: '#ffffff' };
  const buf  = await fetchBuf(`${baseUrl}/images/cg/${chr}_${cgId}.png`);

  if (!buf) return placeholder(res, info, `CG ${cgId}`);

  const out = await sharp(buf)
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(out);
}

// ── 일반 씬 (bg + 캐릭터 합성) ────────────────────────────

async function renderNormal(res, baseUrl, chr, face, outfit, bg) {
  const info = CHAR_INFO[chr] || { name: chr, color: '#ffffff' };

  const [bgBuf, faceBuf] = await Promise.all([
    bg   ? fetchBuf(`${baseUrl}/images/bg/${bg}.png`)                        : null,
    face ? fetchBuf(`${baseUrl}/images/face/${chr}_${outfit}_${face}.png`) : null,
  ]);

  if (!bgBuf && !faceBuf) {
    return placeholder(res, info, face ? `${chr}_${outfit}_${face}` : chr);
  }

  // 베이스: bg 있으면 리사이즈, 없으면 단색
  const base = bgBuf
    ? sharp(bgBuf).resize(W, H, { fit: 'cover', position: 'centre' })
    : sharp({
        create: { width: W, height: H, channels: 3, background: { r: 22, g: 22, b: 46 } },
      }).png();

  const layers = [];

  if (faceBuf) {
    // 캐릭터: 폭 54% · 높이 92% · 하단 중앙 정렬
    const charW = Math.round(W * 0.54);
    const charH = Math.round(H * 0.92);
    const left  = Math.round((W - charW) / 2);
    const top   = H - charH;

    const faceResized = await sharp(faceBuf)
      .resize(charW, charH, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    layers.push({ input: faceResized, left, top, blend: 'over' });
  }

  // 하단 반투명 바 (캐릭터 이름 표시 영역)
  const barH  = 46;
  const barBuf = await sharp({
    create: { width: W, height: barH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 150 } },
  }).png().toBuffer();
  layers.push({ input: barBuf, left: 0, top: H - barH, blend: 'over' });

  const out = await base.composite(layers).png().toBuffer();

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(out);
}

// ── 진입점 ────────────────────────────────────────────────

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q      = req.query;
  const chr    = safeChr(q.chr);
  const cg     = VALID_CG.includes(q.cg) ? q.cg : null;

  const proto   = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${proto}://${req.headers.host}`;

  if (cg) return renderCG(res, baseUrl, chr, cg);

  const face   = safeFace(q.face);
  const outfit = safeOutfit(q.outfit);
  const bg     = safeBg(q.bg);

  return renderNormal(res, baseUrl, chr, face, outfit, bg);
};
