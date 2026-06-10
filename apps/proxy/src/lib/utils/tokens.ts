import { sign, verify } from "hono/jwt";
import { env } from "@/config/env";
import { UnauthorizedError } from "@/lib/utils/errors";

export type AccessTokenPayload = {
  sub: string; // user.id (uuid)
  email: string;
  role: "admin" | "user";
  /** Random ID per session — also stored in the refresh row so logout/rotation can revoke. */
  sid: string;
  iat: number;
  exp: number;
};

export type RefreshTokenPayload = {
  sub: string;
  sid: string;
  iat: number;
  exp: number;
};

const ACCESS_ALG = "HS256" as const;
const REFRESH_ALG = "HS256" as const;

export async function signAccessToken(input: {
  sub: string;
  email: string;
  role: AccessTokenPayload["role"];
  sid: string;
}): Promise<{ token: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + env.JWT_ACCESS_TTL_SECONDS;
  const payload: AccessTokenPayload = { ...input, iat: now, exp: expiresAt };
  const token = await sign(payload, env.JWT_ACCESS_SECRET, ACCESS_ALG);
  return { token, expiresAt };
}

export async function signRefreshToken(input: {
  sub: string;
  sid: string;
}): Promise<{ token: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + env.JWT_REFRESH_TTL_SECONDS;
  const payload: RefreshTokenPayload = { ...input, iat: now, exp: expiresAt };
  const token = await sign(payload, env.JWT_REFRESH_SECRET, REFRESH_ALG);
  return { token, expiresAt };
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  try {
    return (await verify(token, env.JWT_ACCESS_SECRET, ACCESS_ALG)) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  try {
    return (await verify(token, env.JWT_REFRESH_SECRET, REFRESH_ALG)) as RefreshTokenPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }
}

export async function hashRefreshToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
