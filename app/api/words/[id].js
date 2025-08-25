
import { getUserId } from "@/lib/telegram";
import { sql } from "@vercel/postgres";

export async function DELETE(req, { params }) {
  const userId = getUserId(req);
  const id = params.id;

  await sql`
    DELETE FROM words
    WHERE id = ${id} AND user_id = ${userId}
  `;

  return new Response("Deleted", { status: 200 });
}
