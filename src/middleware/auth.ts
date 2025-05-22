import { Context } from "hono";
import { getCookie } from "hono/cookie";
import { UnauthorizedError } from "../errors";

export async function requireAuth(ctx: Context, next: () => Promise<void>) {
  const username = getCookie(ctx, "username");

  if (!username) {
    throw new UnauthorizedError("User is not logged in");
  }

  ctx.set("username", username);
  await next();
}
