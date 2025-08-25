
export function getUserId(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) throw new Error("No auth header");

  const [_, token] = authHeader.split(" ");
  const user = JSON.parse(atob(token.split(".")[1]));
  return user.id;
}
