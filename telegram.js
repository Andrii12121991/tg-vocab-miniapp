// lib/telegram.js (CommonJS для Vercel serverless)
const crypto = require('crypto');

function parseInitData(initData) {
  const params = new URLSearchParams(initData || '');
  const data = {};
  for (const [k, v] of params) data[k] = v;
  return data;
}

function checkTelegramAuth(initData, botToken) {
  if (!initData || !botToken) return null;
  const params = parseInitData(initData);
  const hash = params.hash;
  if (!hash) return null;

  const keys = Object.keys(params).filter(k => k !== 'hash').sort();
  const dataCheckString = keys.map(k => `${k}=${params[k]}`).join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (hmac !== hash) return null;

  const user = params.user ? JSON.parse(params.user) : null;
  if (!user || typeof user.id !== 'number') return null;

  return { userId: user.id };
}

module.exports = { checkTelegramAuth };
