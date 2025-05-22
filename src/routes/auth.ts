import { Context, Hono } from "hono";
import { setCookie } from "hono/cookie";
import { BadRequestError } from "../errors";
import { ApiContext } from "../types";

export async function authenticateUser(ctx: Context) {
  const { username } = await ctx.req.json();

  if (!username) {
    throw new BadRequestError("Username is required");
  }

  setCookie(ctx, "username", username, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    sameSite: "strict",
  });

  return ctx.json({ success: true });
}

export function configureAuthRoutes() {
  const router = new Hono<ApiContext>();

  router.post("/login", authenticateUser);

  return router;
}
