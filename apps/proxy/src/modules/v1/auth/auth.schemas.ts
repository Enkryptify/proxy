import { z } from "@hono/zod-openapi";


export const userRoleSchema = z.enum(["admin", "user"]);

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const meSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  username: z.string(),
  role: userRoleSchema,
});

export const sessionResponseSchema = z.object({
  accessToken: z.string(),
  /** Unix seconds the access token expires. Used by the web client to schedule silent refresh. */
  accessTokenExpiresAt: z.number().int().positive(),
  user: meSchema,
});

/** Internal: full session payload AuthService returns to the route layer
 *  (extends the wire response with the refresh-token half kept out of the
 *  HTTP response body and set as an httpOnly cookie instead). */
export const issuedSessionSchema = sessionResponseSchema.extend({
  refreshToken: z.string(),
  refreshTokenExpiresAt: z.number().int().positive(),
});

export const authErrorSchema = z.object({
  error: z.string(),
});

export const logoutResponseSchema = z.object({
  ok: z.literal(true),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type MeResponse = z.infer<typeof meSchema>;
export type IssuedSession = z.infer<typeof issuedSessionSchema>;
