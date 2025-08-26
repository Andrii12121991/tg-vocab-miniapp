// GET /api/words  — список слов пользователя
// POST /api/words — добавить слово {f,n}
const { sql } = require('@vercel/postgres');
const { checkTelegramAuth } = require('../lib/telegram');

async function ensureSchema() {
  await sql`create extension if not exists pgcrypto`;
  await sql`
    create table if not exists words (
      id uuid primary key default gen_random_uuid(),
      user_id bigint not null,
      foreign_txt text not null,
      native_txt  text not null,
      created_at  timestamptz not null default now()
    );
  `;
  await sql`create index if not exists words_user_idx on words (user_id, created_at desc)`;
}

module.exports = async (req, res) => {
  const initData = req.headers['x-telegram-init-data'] || (req.body && req.body.initData) || '';
  const auth = checkTelegramAuth(initData, process.env.BOT_TOKEN);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });

  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const { rows } = await sql`
        select id, foreign_txt as f, native_txt as n, created_at
        from words
        where user_id = ${auth.userId}
        order by created_at desc
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const f = (body?.f || '').trim();
      const n = (body?.n || '').trim();
      if (!f || !n) return res.status(400).json({ error: 'missing fields' });

      const { rows } = await sql`
        insert into words (user_id, foreign_txt, native_txt)
        values (${auth.userId}, ${f}, ${n})
        returning id, foreign_txt as f, native_txt as n, created_at
      `;
      return res.status(201).json(rows[0]);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
};
