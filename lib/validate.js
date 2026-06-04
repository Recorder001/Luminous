const supabase = require('./supabase');

// 5자리 16진수 (대문자): 예) A3F9C
async function validateCode(code) {
  if (!code || !/^[0-9A-F]{5}$/.test(code)) return false;
  const { data } = await supabase
    .from('user_codes')
    .select('code')
    .eq('code', code)
    .single();
  return !!data;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

module.exports = { validateCode, setCors };
