import { z } from "@hono/zod-openapi";

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const meSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  username: z.string(),
  role: z.enum(["admin", "user"]),
});

export const sessionResponseSchema = z.object({
  accessToken: z.string(),
  /** Unix seconds the access token expires. Used by the web client to schedule silent refresh. */
  accessTokenExpiresAt: z.number().int().positive(),
  user: meSchema,
});

export const authErrorSchema = z.object({
  error: z.string(),
});

export const logoutResponseSchema = z.object({
  ok: z.literal(true),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type MeResponse = z.infer<typeof meSchema>;
