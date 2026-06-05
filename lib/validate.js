const { sql } = require('./db');

async function validateCode(code) {
  if (!code || !/^[0-9A-F]{5}$/.test(code)) return false;
  const { rows } = await sql`
    SELECT code FROM user_codes WHERE code = ${code} LIMIT 1
  `;
  return rows.length > 0;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

module.exports = { validateCode, setCors };
