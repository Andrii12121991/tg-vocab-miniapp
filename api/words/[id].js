// DELETE /api/words/:id — удалить слово
const { sql } = require('@vercel/postgres');
const { checkTelegramAuth } = require('../../lib/telegram');

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const initData = req.headers['x-telegram-init-data'] || (req.body && req.body.initData) || '';
  const auth = checkTelegramAuth(initData, process.env.BOT_TOKEN);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) return res.status(400).json({ error: 'bad id' });

  try {
    await sql`delete from words where id=${id} and user_id=${auth.userId}`;
    return res.status(204).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
};
