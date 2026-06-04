// GET /api/journey?code=XXXXX
const supabase = require('../lib/supabase');
const { validateCode, setCors } = require('../lib/validate');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'code required' });

  const valid = await validateCode(code.toUpperCase());
  if (!valid) return res.status(404).json({ error: 'invalid code' });

  const [{ data: saves }, { data: cg }] = await Promise.all([
    supabase
      .from('saves')
      .select('*')
      .eq('code', code.toUpperCase())
      .order('saved_at', { ascending: true })
      .limit(200),
    supabase
      .from('cg_unlocks')
      .select('*')
      .eq('code', code.toUpperCase())
      .order('unlocked_at', { ascending: true }),
  ]);

  return res.status(200).json({
    saves: saves || [],
    cg:    cg    || [],
  });
};
