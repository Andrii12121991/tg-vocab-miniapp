
import { getUserId } from "@/lib/telegram";
import { sql } from "@vercel/postgres";

export async function GET(req) {
  const userId = getUserId(req);
  const { rows } = await sql`SELECT * FROM words WHERE user_id = ${userId}`;
  return Response.json(rows);
}

export async function POST(req) {
  const userId = getUserId(req);
  const { word, translation } = await req.json();

  if (!word || !translation) {
    return new Response("Missing fields", { status: 400 });
  }

  await sql`
    INSERT INTO words (user_id, word, translation)
    VALUES (${userId}, ${word}, ${translation})
  `;

  return new Response("Word added", { status: 201 });
}
