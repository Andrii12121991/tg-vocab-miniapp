// app/route.js
import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;


const router = express.Router();


const pool = new Pool({
connectionString: process.env.POSTGRES_URL,
ssl: {
rejectUnauthorized: false
}
});


// ✅ Сохранить слово
router.post('/save-word', async (req, res) => {
const { user_id, word, translation } = req.body;


if (!user_id || !word || !translation) {
return res.status(400).json({ error: 'Missing fields' });
}


try {
await pool.query(
'CREATE TABLE IF NOT EXISTS words (id SERIAL PRIMARY KEY, user_id TEXT, word TEXT, translation TEXT)'
);


await pool.query(
'INSERT INTO words (user_id, word, translation) VALUES ($1, $2, $3)',
[user_id, word, translation]
);


res.status(200).json({ message: 'Word saved' });
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Database error' });
}
});


// ✅ Получить все слова пользователя
router.get('/get-words/:user_id', async (req, res) => {
const { user_id } = req.params;


try {
const result = await pool.query(
'SELECT word, translation FROM words WHERE user_id = $1',
[user_id]
);


res.status(200).json(result.rows);
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Database error' });
}
});


export default router;
