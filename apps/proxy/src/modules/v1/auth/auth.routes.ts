import type { Context } from "hono";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { jsonBody, jsonContent } from "@/lib/utils/openapi";
import { env } from "@/config/env";
import { requireAdmin } from "@/lib/middleware/requireAdmin";
import {
  authErrorSchema,
  loginRequestSchema,
  logoutResponseSchema,
  meSchema,
  sessionResponseSchema,
} from "./auth.schemas";
import type AuthService from "./auth.service";
import type { AuthIssuedSession } from "./auth.service";

export const REFRESH_COOKIE_NAME = "proxy_refresh";

function setRefreshCookie(c: Context, session: AuthIssuedSession) {
  const maxAge = session.refreshTokenExpiresAt - Math.floor(Date.now() / 1000);
  setCookie(c, REFRESH_COOKIE_NAME, session.refreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "Strict",
    path: "/api/auth",
    maxAge: maxAge > 0 ? maxAge : undefined,
  });
}

function readMeta(c: Context) {
  return {
    userAgent: c.req.header("user-agent") ?? null,
    ipAddress:
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      null,
  };
}

const loginRoute = createRoute({
  method: "post",
  path: "/api/auth/login",
  tags: ["auth"],
  request: {
    body: jsonBody(loginRequestSchema),
  },
  responses: {
    200: jsonContent(sessionResponseSchema, "Session issued"),
    401: jsonContent(authErrorSchema, "Invalid credentials"),
    403: jsonContent(authErrorSchema, "Account not authorized for admin panel"),
    502: jsonContent(authErrorSchema, "Auth backend unavailable"),
  },
});

const refreshRoute = createRoute({
  method: "post",
  path: "/api/auth/refresh",
  tags: ["auth"],
  responses: {
    200: jsonContent(sessionResponseSchema, "Refreshed session"),
    401: jsonContent(authErrorSchema, "Refresh cookie missing or invalid"),
    502: jsonContent(authErrorSchema, "Auth backend unavailable"),
  },
});

const logoutRoute = createRoute({
  method: "post",
  path: "/api/auth/logout",
  tags: ["auth"],
  responses: {
    200: jsonContent(logoutResponseSchema, "Logged out"),
  },
});

const meRoute = createRoute({
  method: "get",
  path: "/api/auth/me",
  tags: ["auth"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: jsonContent(meSchema, "Current user"),
    401: jsonContent(authErrorSchema, "Not authenticated"),
    403: jsonContent(authErrorSchema, "Admin role required"),
  },
});

export function registerAuthRoutes(app: OpenAPIHono, service: AuthService) {
  app.openapi(loginRoute, async (c) => {
    const body = c.req.valid("json");
    const session = await service.login(body, readMeta(c));
    setRefreshCookie(c, session);
    return c.json(
      {
        accessToken: session.accessToken,
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        user: session.user,
      },
      200,
    );
  });

  app.openapi(refreshRoute, async (c) => {
    const raw = getCookie(c, REFRESH_COOKIE_NAME);
    const session = await service.refresh(raw, readMeta(c));
    setRefreshCookie(c, session);
    return c.json(
      {
        accessToken: session.accessToken,
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        user: session.user,
      },
      200,
    );
  });

  app.openapi(logoutRoute, async (c) => {
    const raw = getCookie(c, REFRESH_COOKIE_NAME);
    try {
      await service.logout(raw);
      return c.json({ ok: true as const }, 200);
    } finally {
      deleteCookie(c, REFRESH_COOKIE_NAME, { path: "/api/auth" });
    }
  });

  app.use("/api/auth/me", requireAdmin);
  app.openapi(meRoute, async (c) => {
    const payload = c.get("user");
    const me = await service.me(payload.sub);
    return c.json(me, 200);
  });
}
