const supabase = require('../lib/supabase');
const { setCors } = require('../lib/validate');

// 5자리 16진수 대문자: 00000 ~ FFFFF (1,048,576 경우의 수)
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
    const { error } = await supabase.from('user_codes').insert({ code });
    if (!error) break;
    attempts++;
  }

  if (attempts >= 10)
    return res.status(500).json({ error: '코드 생성 실패' });

  return res.status(200).json({ code });
};
