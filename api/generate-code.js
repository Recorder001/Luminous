const { sql } = require('../lib/db');
const { setCors } = require('../lib/validate');

function makeCode() {
  const n = Math.floor(Math.random() * 0x100000);
  return n.toString(16).toUpperCase().padStart(5, '0');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  let code, attempts = 0;
  while (attempts < 10) {
    code = makeCode();
    try {
      await sql`INSERT INTO user_codes (code) VALUES (${code})`;
      break;
    } catch {
      attempts++;
    }
  }

  if (attempts >= 10)
    return res.status(500).json({ error: '코드 생성 실패' });

  return res.status(200).json({ code });
};
