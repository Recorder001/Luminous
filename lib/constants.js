// ── 캐릭터 키 목록 ──────────────────────────────────────────
const ALL_CHARS = [
  // 은하열차
  'nova', 'kalia', 'elia', 'rita', 'aira',
  // 온메르타
  'seiran', 'orma', 'darha', 'beret',
  // 타르미오스
  'kaine', 'isol', 'rhat', 'aves',
  // 마프히트
  'edna', 'valka', 'sorai',
  // 미아크
  'fern', 'armo', 'luina',
  // 프레이라
  'ikar',
];

// ── 진영 정보 ────────────────────────────────────────────────
const FACTION_INFO = {
  galaxy:   { name: '은하열차', color: '#c8c8ff', members: ['nova', 'kalia', 'elia', 'rita', 'aira'] },
  onmerta:  { name: '온메르타', color: '#c8a030', members: ['seiran', 'orma', 'darha', 'beret'] },
  tarmios:  { name: '타르미오스', color: '#4ec4e0', members: ['kaine', 'isol', 'rhat', 'aves'] },
  maphit:   { name: '마프히트', color: '#9090c0', members: ['edna', 'valka', 'sorai'] },
  miark:    { name: '미아크',   color: '#58c878', members: ['fern', 'armo', 'luina'] },
  freira:   { name: '프레이라', color: '#d44020', members: ['ikar'] },
};

// ── 캐릭터 상세 정보 ─────────────────────────────────────────
const CHAR_INFO = {
  // 은하열차
  nova:   { name: 'Nova',   color: '#e8e8ff', faction: 'galaxy' },
  kalia:  { name: 'Kalia',  color: '#d47474', faction: 'galaxy' },
  elia:   { name: 'Elia',   color: '#d4c874', faction: 'galaxy' },
  rita:   { name: 'Rita',   color: '#a574d4', faction: 'galaxy' },
  aira:   { name: 'Aira',   color: '#74d4a5', faction: 'galaxy' },
  // 온메르타
  seiran: { name: 'Seiran', color: '#c8a030', faction: 'onmerta' },
  orma:   { name: 'Orma',   color: '#e8c878', faction: 'onmerta' },
  darha:  { name: 'Darha',  color: '#b87820', faction: 'onmerta' },
  beret:  { name: 'Beret',  color: '#d4943c', faction: 'onmerta' },
  // 타르미오스
  kaine:  { name: 'Kaine',  color: '#4ec4e0', faction: 'tarmios' },
  isol:   { name: 'Isol',   color: '#88d8f0', faction: 'tarmios' },
  rhat:   { name: 'Rhat',   color: '#2890b8', faction: 'tarmios' },
  aves:   { name: 'Aves',   color: '#60a8d4', faction: 'tarmios' },
  // 마프히트
  edna:   { name: 'Edna',   color: '#9090c0', faction: 'maphit' },
  valka:  { name: 'Valka',  color: '#6868a8', faction: 'maphit' },
  sorai:  { name: 'Sorai',  color: '#b8a8d8', faction: 'maphit' },
  // 미아크
  fern:   { name: 'Fern',   color: '#58c878', faction: 'miark' },
  armo:   { name: 'Armo',   color: '#38a858', faction: 'miark' },
  luina:  { name: 'Luina',  color: '#90e898', faction: 'miark' },
  // 프레이라
  ikar:   { name: 'Ikar',   color: '#d44020', faction: 'freira' },
};

// 진영 순서 (렌더링용)
const FACTION_ORDER = ['galaxy', 'onmerta', 'tarmios', 'maphit', 'miark', 'freira'];

// ── 기타 상수 ────────────────────────────────────────────────
const VALID_OUTFITS = ['default', 'swim', 'casual', 'pajama', 'gala'];
const VALID_CG      = ['01','02','03','04','05','06','07','08','09','10'];

// CG 총합: 20명 × 10 = 200
const TOTAL_CG = ALL_CHARS.length * VALID_CG.length;

// ── 유틸 ────────────────────────────────────────────────────
function clamp(val, min, max) {
  const n = parseInt(val);
  if (isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

module.exports = {
  ALL_CHARS,
  FACTION_INFO,
  FACTION_ORDER,
  CHAR_INFO,
  VALID_OUTFITS,
  VALID_CG,
  TOTAL_CG,
  clamp,
};
