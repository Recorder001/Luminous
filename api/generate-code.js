const supabase = require('../lib/supabase');
const { setCors } = require('../lib/validate');

const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function makeCode() {
  let code = '';
  for (let i = 0; i < 16; i++)
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  return code;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  let code, attempts = 0;
  while (attempts < 10) {
    code = makeCode();
    const { error } = await supabase.from('user_codes').insert({ code });
    if (!error) break;
    attempts++;
  }

  if (attempts >= 10)
    return res.status(500).json({ error: '코드 생성 실패' });

  return res.status(200).json({ code });
};
