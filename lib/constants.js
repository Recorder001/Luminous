const MAIN_CHARS    = ['k', 'n', 'e', 'r', 'a'];
const VALID_OUTFITS = ['default', 'swim', 'casual', 'pajama', 'gala'];
const VALID_CG      = ['01','02','03','04','05','06','07','08','09','10'];

const CHAR_INFO = {
  k: { name: 'Kalia',    color: '#d4a574' },
  n: { name: 'Nova',     color: '#a574d4' },
  e: { name: 'Elina',    color: '#74a5d4' },
  r: { name: 'Rita',     color: '#d47474' },
  a: { name: 'Aira',     color: '#74d4a5' },
};

const PLANET_INFO = {
  1: { name: 'Solaris',  color: '#e8b86d' },
  2: { name: 'Glaceon',  color: '#8dc4e8' },
  3: { name: 'Verdania', color: '#7ed4a0' },
  4: { name: 'Umbra',    color: '#9b8ec4' },
  5: { name: 'Aethon',   color: '#e8d06d' },
};

function dayToPlanet(day) {
  return Math.min(5, Math.ceil(parseInt(day) / 5));
}

function clamp(val, min, max) {
  const n = parseInt(val);
  if (isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

module.exports = {
  MAIN_CHARS, VALID_OUTFITS, VALID_CG,
  CHAR_INFO, PLANET_INFO,
  dayToPlanet, clamp,
};
