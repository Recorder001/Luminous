// Save — 720×720 (1:1)
const supabase = require('../lib/supabase');
const { validateCode, setCors } = require('../lib/validate');
const { MAIN_CHARS, CHAR_INFO, PLANET_INFO, VALID_CG, dayToPlanet, clamp } = require('../lib/constants');

const W = 720;
const H = 720;

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

function buildSVG({ code, savedAt, dayCurr, dayPrev, dayDelta, plCurr, plPrev, chars, cgNew, cgAll, loc, time }) {
  const planet   = PLANET_INFO[plCurr];
  const pcol     = planet.color;
  const dateStr  = savedAt.toISOString().slice(0, 16).replace('T', ' ');

  // ── 상단 헤더 영역 (y: 0~110) ──
  const header = `
    <rect x="0" y="0" width="${W}" height="110" fill="${pcol}18"/>
    <rect x="0" y="0" width="${W}" height="4" fill="${pcol}"/>
    <text x="36" y="46" font-family="'Courier New','Nanum Myeongjo','Batang',monospace"
      font-size="22" font-weight="bold" fill="#f0ece4">JOURNEY SAVED</text>
    <text x="36" y="68" font-family="'Courier New','Nanum Myeongjo','Batang',monospace"
      font-size="11" fill="${pcol}88" letter-spacing="2">
      ${e(dateStr)} UTC
    </text>
    <text x="${W - 36}" y="46" text-anchor="end"
      font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="12"
      fill="${pcol}88">${e(code)}</text>
    <text x="${W - 36}" y="68" text-anchor="end"
      font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="22"
      font-weight="bold" fill="${pcol}">${e(planet.name)}</text>
    <line x1="36" y1="94" x2="${W - 36}" y2="94"
      stroke="${pcol}44" stroke-width="1"/>
  `;

  // ── 일차 / 행성 정보 (y: 110~190) ──
  const plPrevInfo = PLANET_INFO[plPrev] || planet;
  const plChanged  = plCurr !== plPrev;
  const plLabel    = plChanged
    ? `${plPrevInfo.name} → ${planet.name}`
    : planet.name;

  const dayRow = `
    <text x="36" y="138" font-family="'Courier New','Nanum Myeongjo','Batang',monospace"
      font-size="11" fill="#ffffff44" letter-spacing="2">PROGRESS</text>
    <text x="36" y="162" font-family="'Courier New','Nanum Myeongjo','Batang',monospace"
      font-size="28" font-weight="bold" fill="#f0ece4">Day ${dayCurr}</text>
    ${dayDelta !== 0 ? `<text x="180" y="162" font-family="'Courier New','Nanum Myeongjo','Batang',monospace"
      font-size="18" fill="${pcol}">${deltaLabel(dayDelta)}</text>` : ''}
    <text x="${W - 36}" y="138" text-anchor="end"
      font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="11"
      fill="#ffffff44" letter-spacing="2">PLANET</text>
    <text x="${W - 36}" y="162" text-anchor="end"
      font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="18"
      font-weight="bold" fill="${plChanged ? '#ffffff' : pcol}">${e(plLabel)}</text>
    <text x="36" y="182" font-family="'Courier New','Nanum Myeongjo','Batang',monospace"
      font-size="12" fill="#ffffff44">${e(loc || '—')}  ·  ${e(time || '—')}</text>
    <line x1="36" y1="196" x2="${W - 36}" y2="196"
      stroke="#ffffff12" stroke-width="1"/>
  `;

  // ── 호감도 (y: 200~490) — 5캐릭터 각 52px ──
  const afStartY = 208;
  const afRowH   = 52;
  const barX     = 130;
  const barW     = W - barX - 80;

  const afRows = MAIN_CHARS.map((c, i) => {
    const info    = CHAR_INFO[c];
    const col     = info.color;
    const ch      = chars[c];
    const y       = afStartY + i * afRowH;
    const pct     = Math.min(100, Math.max(0, ch.afCurr));
    const fillW   = Math.round(barW * pct / 100);
    const delta   = ch.afDelta;
    const dLabel  = deltaLabel(delta);
    const dColor  = delta > 0 ? '#74d4a5' : delta < 0 ? '#d47474' : '#ffffff44';
    const mind    = String(ch.m || '···').slice(0, 28);

    return `
      <text x="36" y="${y + 14}" font-family="'Courier New','Nanum Myeongjo','Batang',monospace"
        font-size="14" font-weight="bold" fill="${col}">${e(info.name)}</text>
      <rect x="${barX}" y="${y + 2}" width="${barW}" height="10"
        rx="5" fill="${col}18" stroke="${col}33" stroke-width="1"/>
      ${fillW > 0 ? `<rect x="${barX}" y="${y + 2}" width="${fillW}" height="10"
        rx="5" fill="${col}cc"/>` : ''}
      <text x="${barX + barW + 10}" y="${y + 12}" text-anchor="start"
        font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="13"
        font-weight="bold" fill="${col}">${pct}</text>
      ${dLabel ? `<text x="${barX + barW + 48}" y="${y + 12}" text-anchor="start"
        font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="11"
        fill="${dColor}">${e(dLabel)}</text>` : ''}
      <text x="${barX}" y="${y + 34}" font-family="'Courier New','Nanum Myeongjo','Batang',monospace"
        font-size="11" fill="${col}77">${e(mind)}</text>
    `;
  }).join('');

  // ── CG 섹션 (y: 476~632) ──
  // 호감도 끝 y≈468, 푸터 시작 y=640 → 가용 172px
  const cgSectionY = 476;
  const cgCols     = 10;
  const cgCellW    = Math.floor((W - 72) / cgCols); // 64px
  const cgCellH    = 20;  // 셀 높이
  const cgRowGap   = 28;  // 행 간격

  const cgSection = `
    <line x1="36" y1="${cgSectionY - 4}" x2="${W - 36}" y2="${cgSectionY - 4}"
      stroke="#ffffff12" stroke-width="1"/>
    <text x="36" y="${cgSectionY + 13}" font-family="'Courier New','Nanum Myeongjo','Batang',monospace"
      font-size="10" fill="#ffffff44" letter-spacing="2">CG GALLERY</text>
    <text x="${W - 36}" y="${cgSectionY + 13}" text-anchor="end"
      font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="10"
      fill="#ffffff44">${cgAll.length} / 50</text>
    ${MAIN_CHARS.map((c, ci) => {
      const col = CHAR_INFO[c].color;
      return VALID_CG.map((id, gi) => {
        const key    = `${c}_${id}`;
        const isNew  = cgNew.includes(key);
        const isHave = cgAll.includes(key);
        const cellX  = 36 + gi * cgCellW;
        const cellY  = cgSectionY + 20 + ci * cgRowGap;
        const fill   = isNew ? col : isHave ? `${col}66` : '#ffffff0a';
        const stroke = isNew ? '#ffffff' : isHave ? `${col}55` : '#ffffff14';
        return `<rect x="${cellX}" y="${cellY}" width="${cgCellW - 4}" height="${cgCellH}"
          rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
      }).join('');
    }).join('')}
  `;

  // ── 푸터 (y: 640~720) ──
  const footer = `
    <line x1="36" y1="643" x2="${W - 36}" y2="643"
      stroke="${pcol}33" stroke-width="1"/>
    <text x="${W / 2}" y="668" text-anchor="middle"
      font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="11"
      fill="${pcol}66" letter-spacing="3">LUMINOUS JOURNEY</text>
    <text x="${W / 2}" y="692" text-anchor="middle"
      font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="10"
      fill="${pcol}44">journey.html?code=${e(code)}</text>
    <rect x="0" y="${H - 3}" width="${W}" height="3" fill="${pcol}44"/>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0d0d14"/>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}"
    fill="none" stroke="${pcol}33" stroke-width="1" rx="4"/>
  ${header}
  ${dayRow}
  ${afRows}
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
    font-family="'Courier New','Nanum Myeongjo','Batang',monospace" font-size="14"
    fill="#d47474">${e(msg)}</text>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(400).send(svg);
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

  const q    = req.query;
  const code = q.code;

  const valid = await validateCode(code);
  if (!valid) return sendErrorSVG(res, 'Invalid or missing code');

  const dayCurr = clamp(q.day, 1, 25);
  const plCurr  = dayToPlanet(dayCurr);

  const currAf = {};
  MAIN_CHARS.forEach(c => { currAf[c] = clamp(q[`${c}_af`], 0, 100); });

  const { data: prev } = await supabase
    .from('saves')
    .select('*')
    .eq('code', code)
    .order('saved_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const dayPrev = prev?.day_curr ?? 0;
  const plPrev  = prev ? dayToPlanet(dayPrev) : plCurr;

  const chars = {};
  MAIN_CHARS.forEach(c => {
    const afPrev = prev?.[`${c}_af_curr`] ?? 0;
    const afCurr = currAf[c];
    chars[c] = { afPrev, afCurr, afDelta: afCurr - afPrev, m: q[`${c}_m`] || '···' };
  });

  const cgNewRaw = q.cg_new ? q.cg_new.split(',').map(s => s.trim()) : [];
  const cgNew    = cgNewRaw.filter(k => {
    const [chr, id] = k.split('_');
    return MAIN_CHARS.includes(chr) && VALID_CG.includes(id);
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

  const savedAt = new Date();
  const row = {
    code,
    saved_at:    savedAt.toISOString(),
    day_prev:    dayPrev,
    day_curr:    dayCurr,
    day_delta:   dayCurr - dayPrev,
    pl_prev:     plPrev,
    pl_curr:     plCurr,
    turn:        parseInt(q.turn) || null,
    time_of_day: q.time   || null,
    loc:         q.loc    || null,
    date_str:    q.date   || null,
    chr:         q.chr    || null,
    face:        q.face   || null,
    outfit:      q.outfit || null,
    bg:          q.bg     || null,
    cg:          q.cg     || null,
    cg_new:      cgNew.join(','),
  };
  MAIN_CHARS.forEach(c => {
    row[`${c}_af_prev`]  = chars[c].afPrev;
    row[`${c}_af_curr`]  = chars[c].afCurr;
    row[`${c}_af_delta`] = chars[c].afDelta;
    row[`${c}_m`]        = chars[c].m;
  });
  await supabase.from('saves').insert(row);

  const svg = buildSVG({
    code, savedAt,
    dayCurr, dayPrev, dayDelta: dayCurr - dayPrev,
    plCurr, plPrev,
    chars, cgNew,
    cgAll: [...new Set([...cgAll, ...cgNew])],
    loc:  q.loc  || '—',
    time: q.time || '—',
  });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(svg);
};
