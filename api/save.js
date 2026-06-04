// Save — 800×900 (8:9)
const supabase = require('../lib/supabase');
const { validateCode, setCors } = require('../lib/validate');
const { ALL_CHARS, CHAR_INFO, FACTION_INFO, FACTION_ORDER, VALID_CG, clamp } = require('../lib/constants');

const W = 800;
const H = 900;

function e(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function deltaLabel(n) {
  if (!n || n === 0) return '';
  return n > 0 ? `+${n}` : `${n}`;
}

function buildSVG({ code, savedAt, chars, cgNew, cgAll }) {
  const dateStr = savedAt.toISOString().slice(0, 16).replace('T', ' ');

  // ── 헤더 (y: 0~80) ──
  const header = `
    <rect x="0" y="0" width="${W}" height="80" fill="#ffffff08"/>
    <rect x="0" y="0" width="${W}" height="3" fill="#c8c8ff"/>
    <text x="32" y="36" font-family="'Courier New',monospace"
      font-size="18" font-weight="bold" fill="#f0ece4" letter-spacing="3">JOURNEY SAVED</text>
    <text x="32" y="56" font-family="'Courier New',monospace"
      font-size="10" fill="#ffffff44" letter-spacing="2">${e(dateStr)} UTC</text>
    <text x="${W - 32}" y="36" text-anchor="end" font-family="'Courier New',monospace"
      font-size="13" fill="#ffffff55" letter-spacing="2">${e(code)}</text>
    <line x1="32" y1="72" x2="${W - 32}" y2="72" stroke="#ffffff14" stroke-width="1"/>
  `;

  // ── 진영별 호감도 블록 ──
  // 6진영, 총 20명. 각 진영 헤더(24px) + 멤버별 행(34px) + 진영 간격(12px)
  const SECT_HEADER_H = 24;
  const ROW_H         = 34;
  const SECT_GAP      = 12;
  const BAR_X         = 180;
  const BAR_W         = W - BAR_X - 90;

  let curY = 88;
  let factionBlocks = '';

  for (const fkey of FACTION_ORDER) {
    const fac = FACTION_INFO[fkey];
    const fcol = fac.color;

    // 진영 레이블
    factionBlocks += `
      <text x="32" y="${curY + 16}" font-family="'Courier New',monospace"
        font-size="10" fill="${fcol}99" letter-spacing="3">${e(fac.name)}</text>
      <line x1="32" y1="${curY + 20}" x2="${W - 32}" y2="${curY + 20}"
        stroke="${fcol}22" stroke-width="1"/>
    `;
    curY += SECT_HEADER_H;

    // 멤버 행
    for (const ckey of fac.members) {
      const info   = CHAR_INFO[ckey];
      const col    = info.color;
      const ch     = chars[ckey];
      const pct    = Math.min(100, Math.max(0, ch.afCurr));
      const fillW  = Math.round(BAR_W * pct / 100);
      const dLabel = deltaLabel(ch.afDelta);
      const dColor = ch.afDelta > 0 ? '#74d4a5' : ch.afDelta < 0 ? '#d47474' : '#ffffff33';

      factionBlocks += `
        <text x="32" y="${curY + 20}" font-family="'Courier New',monospace"
          font-size="13" font-weight="bold" fill="${col}">${e(info.name)}</text>
        <rect x="${BAR_X}" y="${curY + 10}" width="${BAR_W}" height="8"
          rx="4" fill="${col}18" stroke="${col}22" stroke-width="1"/>
        ${fillW > 0 ? `<rect x="${BAR_X}" y="${curY + 10}" width="${fillW}" height="8"
          rx="4" fill="${col}cc"/>` : ''}
        <text x="${BAR_X + BAR_W + 10}" y="${curY + 20}" text-anchor="start"
          font-family="'Courier New',monospace" font-size="13" font-weight="bold"
          fill="${col}">${pct}</text>
        ${dLabel ? `<text x="${BAR_X + BAR_W + 44}" y="${curY + 20}" text-anchor="start"
          font-family="'Courier New',monospace" font-size="11"
          fill="${dColor}">${e(dLabel)}</text>` : ''}
      `;
      curY += ROW_H;
    }
    curY += SECT_GAP;
  }

  // ── CG 섹션 ──
  const CG_Y    = curY + 8;
  const CG_COLS = 10;
  const CELL_W  = Math.floor((W - 64) / CG_COLS);
  const CELL_H  = 16;
  const ROW_GAP = 24;

  let cgSection = `
    <line x1="32" y1="${CG_Y - 4}" x2="${W - 32}" y2="${CG_Y - 4}"
      stroke="#ffffff12" stroke-width="1"/>
    <text x="32" y="${CG_Y + 12}" font-family="'Courier New',monospace"
      font-size="9" fill="#ffffff44" letter-spacing="3">CG GALLERY</text>
    <text x="${W - 32}" y="${CG_Y + 12}" text-anchor="end"
      font-family="'Courier New',monospace" font-size="9"
      fill="#ffffff44">${cgAll.length} / 200</text>
  `;

  ALL_CHARS.forEach((ckey, ci) => {
    const col = CHAR_INFO[ckey].color;
    VALID_CG.forEach((id, gi) => {
      const key    = `${ckey}_${id}`;
      const isNew  = cgNew.includes(key);
      const isHave = cgAll.includes(key);
      const cellX  = 32 + gi * CELL_W;
      const cellY  = CG_Y + 18 + ci * ROW_GAP;
      const fill   = isNew ? col : isHave ? `${col}55` : '#ffffff08';
      const stroke = isNew ? '#ffffffcc' : isHave ? `${col}44` : '#ffffff10';
      cgSection += `<rect x="${cellX}" y="${cellY}" width="${CELL_W - 3}" height="${CELL_H}"
        rx="2" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
    });
  });

  // ── 푸터 ──
  const footerY = H - 36;
  const footer = `
    <line x1="32" y1="${footerY - 8}" x2="${W - 32}" y2="${footerY - 8}"
      stroke="#ffffff14" stroke-width="1"/>
    <text x="${W / 2}" y="${footerY + 8}" text-anchor="middle"
      font-family="'Courier New',monospace" font-size="10"
      fill="#ffffff33" letter-spacing="3">LUMINOUS JOURNEY</text>
    <text x="${W / 2}" y="${footerY + 22}" text-anchor="middle"
      font-family="'Courier New',monospace" font-size="9"
      fill="#ffffff22">journey.html?code=${e(code)}</text>
    <rect x="0" y="${H - 3}" width="${W}" height="3" fill="#c8c8ff44"/>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0d0d14"/>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}"
    fill="none" stroke="#ffffff18" stroke-width="1" rx="4"/>
  ${header}
  ${factionBlocks}
  ${cgSection}
  ${footer}
</svg>`;
}

function sendErrorSVG(res, msg) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="100" viewBox="0 0 ${W} 100">
  <rect width="${W}" height="100" fill="#1a0a0a"/>
  <rect x="0" y="0" width="${W}" height="3" fill="#d47474"/>
  <text x="${W / 2}" y="54" text-anchor="middle"
    font-family="'Courier New',monospace" font-size="14"
    fill="#d47474">${msg}</text>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(400).send(svg);
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q    = req.query;
  const code = (q.code || '').toUpperCase();

  const valid = await validateCode(code);
  if (!valid) return sendErrorSVG(res, 'Invalid or missing code');

  // 현재 호감도 파싱
  const currAf = {};
  ALL_CHARS.forEach(c => { currAf[c] = clamp(q[`${c}_af`], 0, 100); });

  // 직전 저장 가져오기
  const { data: prev } = await supabase
    .from('saves')
    .select('*')
    .eq('code', code)
    .order('saved_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 캐릭터별 delta 계산
  const chars = {};
  ALL_CHARS.forEach(c => {
    const afPrev = prev?.[`${c}_af_curr`] ?? 0;
    const afCurr = currAf[c];
    chars[c] = { afPrev, afCurr, afDelta: afCurr - afPrev };
  });

  // CG 처리
  const cgNewRaw = q.cg_new ? q.cg_new.split(',').map(s => s.trim()) : [];
  const cgNew    = cgNewRaw.filter(k => {
    const [chr, id] = k.split('_');
    return ALL_CHARS.includes(chr) && VALID_CG.includes(id);
  });

  const { data: cgAllData } = await supabase
    .from('cg_unlocks')
    .select('cg_id, chr')
    .eq('code', code);

  const cgAll = (cgAllData || []).map(r => `${r.chr}_${r.cg_id}`);

  if (cgNew.length > 0) {
    const cgRows = cgNew.map(k => {
      const [chr, cg_id] = k.split('_');
      return { code, cg_id, chr };
    });
    await supabase
      .from('cg_unlocks')
      .upsert(cgRows, { onConflict: 'code,cg_id,chr', ignoreDuplicates: true });
  }

  // DB 저장
  const savedAt = new Date();
  const row = {
    code,
    saved_at: savedAt.toISOString(),
    cg_new:   cgNew.join(','),
  };
  ALL_CHARS.forEach(c => {
    row[`${c}_af_prev`]  = chars[c].afPrev;
    row[`${c}_af_curr`]  = chars[c].afCurr;
    row[`${c}_af_delta`] = chars[c].afDelta;
  });
  await supabase.from('saves').insert(row);

  const svg = buildSVG({
    code, savedAt, chars, cgNew,
    cgAll: [...new Set([...cgAll, ...cgNew])],
  });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(svg);
};
