import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const minutes = (m: number) => m * 60;
const days = (d: number) => d * 24 * 60 * 60;

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z
      .string()
      .default("3000")
      .transform((value) => parseInt(value, 10))
      .pipe(z.number()),
    DATABASE_URL: z.string().optional(),
    DATABASE_LOGGING: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    DATABASE_MIGRATE_ON_START: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),
    ADMIN_WEB_ORIGINS: z
      .string()
      .default("http://localhost:5173")
      .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),
    /** HMAC secret for short-lived access tokens. Required when the admin panel is used. */
    JWT_ACCESS_SECRET: z.string().min(16).default("dev-only-access-secret-change-me"),
    /** HMAC secret for long-lived refresh tokens. Different from JWT_ACCESS_SECRET. */
    JWT_REFRESH_SECRET: z.string().min(16).default("dev-only-refresh-secret-change-me"),
    JWT_ACCESS_TTL_SECONDS: z
      .string()
      .default(String(minutes(15)))
      .transform((v) => parseInt(v, 10))
      .pipe(z.number().int().positive()),
    JWT_REFRESH_TTL_SECONDS: z
      .string()
      .default(String(days(30)))
      .transform((v) => parseInt(v, 10))
      .pipe(z.number().int().positive()),
    /** Set to `true` in production so the refresh cookie is only sent over HTTPS. */
    COOKIE_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    /**
     * Enkryptify proxy identity key. One PROXY_KEY belongs to exactly one workspace
     * on the vault. When set the proxy:
     *  - sends `proxy_authentication: <PROXY_KEY>` on every vault call (secret resolution)
     *  - resolves its own workspaceId from the vault and uses that for whitelist
     *    enforcement, request logging and the admin panel (regardless of the
     *    workspace path segment a caller put in the URL)
     * Required when the admin panel or workspace whitelist enforcement are used.
     */
    PROXY_KEY: z.string().min(1).optional(),
    /**
     * Enkryptify vault base URL. Defaults to the public production API.
     * Only used for the workspace identity lookup and to scope which fetches
     * receive the `proxy_authentication` header.
     */
    ENKRYPTIFY_API_URL: z.url().default("https://api.enkryptify.com"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
