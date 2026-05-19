const supabase = require('./supabase');

async function validateCode(code) {
  if (!code || code.length !== 16) return false;
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
