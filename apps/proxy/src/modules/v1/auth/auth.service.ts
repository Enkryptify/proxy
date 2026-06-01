import { and, eq, gt } from "drizzle-orm";
import { db } from "@/plugins/db";
import { refreshToken, user } from "@/lib/schemas";
import {
  BadGatewayError,
  ForbiddenError,
  UnauthorizedError,
} from "@/lib/utils/errors";
import {
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/lib/utils/tokens";
import type { LoginRequest, MeResponse } from "./auth.schemas";

function assertDb() {
  if (!db) {
    throw new BadGatewayError(
      "Admin panel requires DATABASE_URL to be configured on the proxy",
    );
  }
  return db;
}

export type AuthIssuedSession = {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  refreshTokenExpiresAt: number;
  user: MeResponse;
};

export default class AuthService {
  async login(
    input: LoginRequest,
    meta: { userAgent: string | null; ipAddress: string | null },
  ): Promise<AuthIssuedSession> {
    const database = assertDb();
    const row = await database.query.user.findFirst({
      where: eq(user.email, input.email.toLowerCase()),
    });
    if (!row) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const ok = await Bun.password.verify(input.password, row.password);
    if (!ok) {
      throw new UnauthorizedError("Invalid email or password");
    }
    if (row.role !== "admin") {
      throw new ForbiddenError("Account does not have admin access");
    }

    return this.#issueSession(
      {
        sub: row.id,
        email: row.email,
        username: row.username,
        role: row.role as "admin" | "user",
      },
      meta,
    );
  }

  async refresh(
    rawToken: string | undefined,
    meta: { userAgent: string | null; ipAddress: string | null },
  ): Promise<AuthIssuedSession> {
    if (!rawToken) throw new UnauthorizedError("Missing refresh cookie");
    const database = assertDb();
    const payload = await verifyRefreshToken(rawToken);
    const tokenHash = await hashRefreshToken(rawToken);

    // Atomically claim the refresh row so concurrent requests cannot both rotate.
    const [claimed] = await database
      .update(refreshToken)
      .set({ isRevoked: true })
      .where(
        and(
          eq(refreshToken.tokenHash, tokenHash),
          eq(refreshToken.isRevoked, false),
          gt(refreshToken.expiresAt, new Date()),
        ),
      )
      .returning({ userId: refreshToken.userId });

    if (!claimed) {
      throw new UnauthorizedError("Refresh token revoked or expired");
    }
    if (claimed.userId !== payload.sub) {
      throw new UnauthorizedError("Refresh token mismatch");
    }

    const userRow = await database.query.user.findFirst({
      where: eq(user.id, payload.sub),
    });
    if (!userRow || userRow.role !== "admin") {
      throw new UnauthorizedError("User no longer authorized");
    }

    return this.#issueSession(
      {
        sub: userRow.id,
        email: userRow.email,
        username: userRow.username,
        role: userRow.role as "admin" | "user",
      },
      meta,
    );
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const database = assertDb();
    const tokenHash = await hashRefreshToken(rawToken);
    await database
      .update(refreshToken)
      .set({ isRevoked: true })
      .where(eq(refreshToken.tokenHash, tokenHash));
  }

  async me(userId: string): Promise<MeResponse> {
    const database = assertDb();
    const row = await database.query.user.findFirst({ where: eq(user.id, userId) });
    if (!row) throw new UnauthorizedError("User not found");
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      role: row.role as "admin" | "user",
    };
  }

  async #issueSession(
    user: { sub: string; email: string; username: string; role: "admin" | "user" },
    meta: { userAgent: string | null; ipAddress: string | null },
  ): Promise<AuthIssuedSession> {
    const database = assertDb();
    const sid = crypto.randomUUID();

    const access = await signAccessToken({
      sub: user.sub,
      email: user.email,
      role: user.role,
      sid,
    });
    const refresh = await signRefreshToken({ sub: user.sub, sid });

    await database.insert(refreshToken).values({
      userId: user.sub,
      tokenHash: await hashRefreshToken(refresh.token),
      expiresAt: new Date(refresh.expiresAt * 1000),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt,
      user: {
        id: user.sub,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }
}
