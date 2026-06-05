const { sql } = require('../lib/db');
const { validateCode, setCors } = require('../lib/validate');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const code = (req.query.code || '').toUpperCase();
  if (!code) return res.status(400).json({ error: 'code required' });

  const valid = await validateCode(code);
  if (!valid) return res.status(404).json({ error: 'invalid code' });

  const [savesRes, cgRes] = await Promise.all([
    sql`SELECT * FROM saves WHERE code = ${code} ORDER BY saved_at ASC LIMIT 200`,
    sql`SELECT * FROM cg_unlocks WHERE code = ${code} ORDER BY unlocked_at ASC`,
  ]);

  return res.status(200).json({
    saves: savesRes.rows || [],
    cg:    cgRes.rows   || [],
  });
};
