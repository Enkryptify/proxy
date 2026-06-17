import type { Context } from "hono";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { jsonBody, jsonContent } from "@/lib/utils/openapi";
import { env } from "@/config/env";
import { requireAdmin } from "@/lib/middleware/requireAdmin";
import {
  authErrorSchema,
  bootstrapRequestSchema,
  loginRequestSchema,
  logoutResponseSchema,
  meSchema,
  sessionResponseSchema,
  setupStatusSchema,
} from "./auth.schemas";
import type AuthService from "./auth.service";
import type { IssuedSession } from "./auth.schemas";

export const REFRESH_COOKIE_NAME = "proxy_refresh";

function setRefreshCookie(c: Context, session: IssuedSession) {
  const maxAge = session.refreshTokenExpiresAt - Math.floor(Date.now() / 1000);
  setCookie(c, REFRESH_COOKIE_NAME, session.refreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "Strict",
    path: "/api/auth",
    maxAge: maxAge > 0 ? maxAge : undefined,
  });
}

function readMeta(context: Context) {
  return {
    userAgent: context.req.header("user-agent") ?? null,
    ipAddress:
      context.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      context.req.header("x-real-ip") ??
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

const setupStatusRoute = createRoute({
  method: "get",
  path: "/api/auth/setup-status",
  tags: ["auth"],
  responses: {
    200: jsonContent(setupStatusSchema, "Whether the first admin must be created"),
    502: jsonContent(authErrorSchema, "Auth backend unavailable"),
  },
});

const bootstrapRoute = createRoute({
  method: "post",
  path: "/api/auth/bootstrap",
  tags: ["auth"],
  request: {
    body: jsonBody(bootstrapRequestSchema),
  },
  responses: {
    200: jsonContent(sessionResponseSchema, "First admin created and session issued"),
    403: jsonContent(authErrorSchema, "Setup already completed"),
    502: jsonContent(authErrorSchema, "Auth backend unavailable"),
  },
});

export function registerAuthRoutes(app: OpenAPIHono, service: AuthService) {
  app.openapi(setupStatusRoute, async (context) => {
    const status = await service.setupStatus();
    return context.json(status, 200);
  });

  app.openapi(bootstrapRoute, async (context) => {
    const body = context.req.valid("json");
    const session = await service.bootstrap(body, readMeta(context));
    setRefreshCookie(context, session);
    return context.json(
      {
        accessToken: session.accessToken,
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        user: session.user,
      },
      200,
    );
  });

  app.openapi(loginRoute, async (context) => {
    const body = context.req.valid("json");
    const session = await service.login(body, readMeta(context));
    setRefreshCookie(context, session);
    return context.json(
      {
        accessToken: session.accessToken,
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        user: session.user,
      },
      200,
    );
  });

  app.openapi(refreshRoute, async (context) => {
    const raw = getCookie(context, REFRESH_COOKIE_NAME);
    const session = await service.refresh(raw, readMeta(context));
    setRefreshCookie(context, session);
    return context.json(
      {
        accessToken: session.accessToken,
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        user: session.user,
      },
      200,
    );
  });

  app.openapi(logoutRoute, async (context) => {
    const raw = getCookie(context, REFRESH_COOKIE_NAME);
    try {
      await service.logout(raw);
      return context.json({ ok: true as const }, 200);
    } finally {
      deleteCookie(context, REFRESH_COOKIE_NAME, { path: "/api/auth" });
    }
  });

  app.use("/api/auth/me", requireAdmin);
  app.openapi(meRoute, async (context) => {
    const payload = context.get("user");
    const me = await service.me(payload.sub);
    return context.json(me, 200);
  });
}
